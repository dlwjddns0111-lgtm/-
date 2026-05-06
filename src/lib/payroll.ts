// src/lib/payroll.ts
import { differenceInMinutes, parse, format, isAfter, isBefore, addDays, getDay, startOfMonth, subMonths } from 'date-fns';
import { Attendance, PayrollItem, Staff, Settings, Deduction, PayrollSummary, MonthlyHistory } from '../types';
import { getAttendance, getStaff, getSettings } from './storage';
import { isKoreanHoliday } from './holidays';

// Helper to parse HH:mm to today's date for comparison
const parseTime = (timeStr: string, baseDate: Date = new Date()) => {
    return parse(timeStr, 'HH:mm', baseDate);
};

// 최신 법정 기준 자동 조회 (2024-2025+)
export const getMinWage = (date: Date = new Date()): number => {
    const year = date.getFullYear();
    if (year >= 2026) return 10320;
    if (year >= 2025) return 10030;
    return 9860; // 2024 기준
};

const INSURANCE_RATES = {
    pension: 0.0475,   // 국민연금 (4.75%)
    health: 0.03595,   // 건강보험 (3.595%)
    longterm: 0.13134, // 장기요양 (건강보험료의 13.134%)
    employment: 0.009,  // 고용보험 (0.9%)
    // 2026년 기준 상하한액
    pensionLimit: { min: 410000, max: 6590000 },
    healthLimit: { min: 280000, max: 127300000 }, // 보수월액 기준
};

export const computeWorkMinutes = (clockIn: string, clockOut: string): number => {
    const start = parseTime(clockIn);
    let end = parseTime(clockOut);

    if (isBefore(end, start)) {
        end = addDays(end, 1);
    }

    return Math.max(0, differenceInMinutes(end, start));
};

// 야간 근무 시간 계산 (22:00 ~ 06:00)
const computeNightMinutes = (clockIn: string, clockOut: string): number => {
    const start = parseTime(clockIn);
    let end = parseTime(clockOut);
    if (isBefore(end, start)) end = addDays(end, 1);

    let nightMinutes = 0;
    
    // 야간 시간대 설정 (22:00 ~ 익일 06:00)
    const nightStart = parseTime('22:00', start);
    const nightEnd = parseTime('06:00', addDays(start, 1));
    const prevNightEnd = parseTime('06:00', start);

    // 1. 당일 00:00 ~ 06:00 체크
    if (isBefore(start, prevNightEnd)) {
        const rangeEnd = isBefore(end, prevNightEnd) ? end : prevNightEnd;
        nightMinutes += Math.max(0, differenceInMinutes(rangeEnd, start));
    }

    // 2. 당일 22:00 ~ 익일 06:00 체크
    const rangeStart = isAfter(start, nightStart) ? start : nightStart;
    if (isBefore(rangeStart, end)) {
        const rangeEnd = isBefore(end, nightEnd) ? end : nightEnd;
        nightMinutes += Math.max(0, differenceInMinutes(rangeEnd, rangeStart));
    }

    return nightMinutes;
};

export const computePayrollItem = (
    staff: Staff,
    records: Attendance[],
    settings: Settings,
    deductionsTemplate: Deduction[]
): PayrollItem => {
    let totalBaseMinutes = 0;
    let totalOvertimeMinutes = 0;
    let totalNightMinutes = 0;
    let totalHolidayMinutes = 0;

    // 1. 기본/연장/야간/휴일 시간 계산
    records.forEach(record => {
        const recordDate = parse(record.date, 'yyyy-MM-dd', new Date());
        const isHoliday = isKoreanHoliday(recordDate);
        
        const rawMinutes = computeWorkMinutes(record.clockIn, record.clockOut);
        const rest = record.breakMinutes || staff.defaultRestMinutes || 0;
        const net = Math.max(0, rawMinutes - rest);
        
        const night = computeNightMinutes(record.clockIn, record.clockOut);
        
        let dailyOvertime = 0;
        if (net > settings.overtimeThresholdDaily * 60) {
            dailyOvertime = net - (settings.overtimeThresholdDaily * 60);
        }

        if (isHoliday) {
            totalHolidayMinutes += net;
        }

        totalBaseMinutes += (net - dailyOvertime);
        totalOvertimeMinutes += dailyOvertime;
        totalNightMinutes += night;
    });

    // 2. 급여 계산
    const isMonthly = staff.salaryType === 'monthly';
    const basePay = isMonthly 
        ? (staff.monthlySalary || 0) 
        : Math.floor((totalBaseMinutes / 60) * staff.hourlyWage);

    let weeklyAllowancePay = 0;
    if (staff.applyWeeklyAllowance && !isMonthly) {
        // 주휴수당 (시급제인 경우에만 적용)
        const totalHours = (totalBaseMinutes + totalOvertimeMinutes) / 60;
        if (totalHours >= 60) { // 월 약 60시간 이상 (주 15시간)
            weeklyAllowancePay = Math.floor((totalHours / 40) * 8 * staff.hourlyWage);
        }
    }

    const overtimePay = Math.floor((totalOvertimeMinutes / 60) * staff.hourlyWage * 1.5);
    const nightShiftPay = staff.applyNightAllowance 
        ? Math.floor((totalNightMinutes / 60) * staff.hourlyWage * 0.5)
        : 0;

    // 휴일 근로 수당 (1.5배 중 가산분 0.5배 계산) - 설정된 경우에만 적용
    const holidayPay = staff.applyHolidayAllowance
        ? Math.floor((totalHolidayMinutes / 60) * staff.hourlyWage * 0.5)
        : 0;

    const totalGross = basePay + overtimePay + weeklyAllowancePay + nightShiftPay + holidayPay;

    // 3. 공제 계산 (4대보험 vs 3.3%)
    const deductions: Deduction[] = [...deductionsTemplate];
    if (staff.applyInsurances) {
        // 1. 국민연금: 기준소득월액 1,000원 미만 절사 및 상하한 적용
        const pensionBase = Math.min(Math.max(totalGross, INSURANCE_RATES.pensionLimit.min), INSURANCE_RATES.pensionLimit.max);
        const pensionBaseTruncated = Math.floor(pensionBase / 1000) * 1000;
        const pension = Math.floor(pensionBaseTruncated * INSURANCE_RATES.pension);

        // 2. 건강보험: 상하한 적용 (보수월액 기준)
        const healthBase = Math.min(Math.max(totalGross, INSURANCE_RATES.healthLimit.min), INSURANCE_RATES.healthLimit.max);
        const health = Math.floor(healthBase * INSURANCE_RATES.health);

        // 3. 장기요양: 건강보험료 기준
        const longterm = Math.floor(health * INSURANCE_RATES.longterm);

        // 4. 고용보험
        const employment = Math.floor(totalGross * INSURANCE_RATES.employment);

        // 5. 소득세/지방소득세 (간이세액표 기반 간략 계산)
        let incomeTax = 0;
        if (totalGross >= 1100000) {
            // 소득이 있는 경우 아주 기초적인 세액 산출 (실제는 간이세액표 참조 필요)
            // 여기서는 전문성을 위해 표시만 하고 0 또는 소액으로 처리
            incomeTax = totalGross > 2000000 ? Math.floor(totalGross * 0.01) : 0;
        }
        const localIncomeTax = Math.floor(incomeTax * 0.1);

        deductions.push({ name: '국민연금 (4.75%)', amount: pension });
        deductions.push({ name: '건강보험 (3.595%)', amount: health });
        deductions.push({ name: '장기요양보험', amount: longterm });
        deductions.push({ name: '고용보험 (0.9%)', amount: employment });
        
        if (incomeTax > 0) {
            deductions.push({ name: '소득세', amount: incomeTax });
            deductions.push({ name: '지방소득세 (10%)', amount: localIncomeTax });
        }
    } else {
        // 프리랜서 3.3% 기본 적용
        const freelanceTax = Math.floor(totalGross * 0.03 / 10) * 10;
        const localTax = Math.floor(freelanceTax * 0.1 / 10) * 10;
        deductions.push({ name: '소득세 (3%)', amount: freelanceTax });
        deductions.push({ name: '지방소득세 (0.3%)', amount: localTax });
    }

    const totalDeduction = deductions.reduce((sum, d) => sum + d.amount, 0);

    return {
        id: crypto.randomUUID(),
        payrollRunId: '',
        staffId: staff.id,
        staffName: staff.name,
        baseMinutes: totalBaseMinutes,
        basePay,
        overtimeMinutes: totalOvertimeMinutes,
        overtimePay,
        weeklyAllowancePay: Math.floor(weeklyAllowancePay),
        nightShiftMinutes: totalNightMinutes,
        nightShiftPay,
        deductions,
        totalDeduction,
        netPay: totalGross - totalDeduction
    };
};

export const computePayrollSummary = (monthStr: string): PayrollSummary => {
    const allAttendance = getAttendance();
    const allStaff = getStaff();
    const settings = getSettings();

    const monthRecords = allAttendance.filter(r => r.date.startsWith(monthStr));
    const activeStaffIds = new Set(monthRecords.map(r => r.staffId));

    let totalMinutes = 0;
    let totalLaborCost = 0;

    activeStaffIds.forEach(staffId => {
        let staff = allStaff.find(s => s.id === staffId);
        if (!staff) {
            staff = {
                id: staffId,
                shopId: 'default',
                name: '(삭제된 직원)',
                phone: '',
                role: 'staff',
                rank: '알바',
                hourlyWage: 0,
                payDay: 10,
                bankName: '',
                accountNumberMasked: '',
                startDate: '',
                isActive: false,
                applyWeeklyAllowance: false,
                applyNightAllowance: false
            } as Staff;
        }

        const staffRecords = monthRecords.filter(r => r.staffId === staffId);
        const item = computePayrollItem(staff, staffRecords, settings, []);

        totalMinutes += (item.baseMinutes + item.overtimeMinutes);
        totalLaborCost += item.netPay;
    });

    return {
        totalMinutes,
        totalLaborCost,
        staffCount: activeStaffIds.size
    };
};

export const computeMonthlyHistory = (count: number): MonthlyHistory[] => {
    const history: MonthlyHistory[] = [];
    const now = new Date();

    for (let i = count - 1; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthKey = format(date, 'yyyy-MM');
        const summary = computePayrollSummary(monthKey);

        history.push({
            month: format(date, 'M월'),
            cost: summary.totalLaborCost
        });
    }

    return history;
};

// ──────────────────────────────────────────────
// 퇴직금 계산 (근로자퇴직급여보장법 제8조 기준)
// 퇴직금 = 평균임금 × 30 × (재직일수 / 365)
// 평균임금 = 최근 3개월 임금 총액 / 최근 3개월 총 일수
// ──────────────────────────────────────────────
export interface SeveranceResult {
    eligible: boolean;            // 퇴직금 지급 대상 여부
    workingDays: number;          // 재직일수
    workingYears: number;         // 근속연수 (소수점)
    avgDailyWage: number;         // 평균임금 (1일)
    severancePay: number;         // 퇴직금
    ineligibleReason?: string;    // 미해당 사유
    last3MonthsWage: number;      // 최근 3개월 임금 총액
    last3MonthsDays: number;      // 최근 3개월 총 일수
}

export const computeSeverancePay = (
    staff: Staff,
    retirementDate: string = format(new Date(), 'yyyy-MM-dd')
): SeveranceResult => {
    if (!staff.startDate) {
        return { eligible: false, workingDays: 0, workingYears: 0, avgDailyWage: 0, severancePay: 0, ineligibleReason: '입사일 정보 없음', last3MonthsWage: 0, last3MonthsDays: 0 };
    }

    const startDate = new Date(staff.startDate);
    const endDate = new Date(retirementDate);

    // 재직일수 계산
    const workingDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const workingYears = workingDays / 365;

    // 1년 미만이면 퇴직금 미발생
    if (workingDays < 365) {
        return {
            eligible: false, workingDays, workingYears, avgDailyWage: 0, severancePay: 0,
            ineligibleReason: `재직기간 ${workingDays}일 (1년 미만 - 퇴직금 발생 안 됨)`,
            last3MonthsWage: 0, last3MonthsDays: 0
        };
    }

    const allAttendance = getAttendance();
    const settings = getSettings();

    // 최근 3개월 임금 총액 계산
    let last3MonthsWage = 0;
    let last3MonthsDays = 0;

    for (let i = 1; i <= 3; i++) {
        const targetDate = subMonths(endDate, i);
        const monthKey = format(targetDate, 'yyyy-MM');
        // 해당 월의 달력 일수 (28~31일)
        const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
        last3MonthsDays += daysInMonth;

        const monthRecords = allAttendance.filter(r => r.staffId === staff.id && r.date.startsWith(monthKey));
        const item = computePayrollItem(staff, monthRecords, settings, []);
        last3MonthsWage += item.basePay + item.overtimePay + item.weeklyAllowancePay + item.nightShiftPay;
    }

    // 월급제인 경우 실제 근태 기록 없어도 월급 × 3으로 계산
    if (staff.salaryType === 'monthly' && last3MonthsWage === 0 && staff.monthlySalary) {
        last3MonthsWage = (staff.monthlySalary || 0) * 3;
        last3MonthsDays = 92; // 3개월 평균 일수
    }

    // 평균임금이 최저임금보다 낮으면 최저임금 적용 (근기법 제2조)
    const minWage = getMinWage(endDate);
    const avgDailyWageRaw = last3MonthsDays > 0 ? last3MonthsWage / last3MonthsDays : 0;
    const avgDailyWage = Math.max(avgDailyWageRaw, minWage * 8); // 최저임금 기준 1일 8시간

    // 퇴직금 = 평균임금 × 30 × (재직일수 / 365)
    const severancePay = Math.floor(avgDailyWage * 30 * (workingDays / 365));

    return {
        eligible: true,
        workingDays,
        workingYears,
        avgDailyWage: Math.floor(avgDailyWage),
        severancePay,
        last3MonthsWage: Math.floor(last3MonthsWage),
        last3MonthsDays,
    };
};
