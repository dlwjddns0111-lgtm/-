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
    if (year >= 2025) return 10030;
    return 9860; // 2024 기준
};

const INSURANCE_RATES = {
    pension: 0.045,    // 국민연금
    health: 0.03545,   // 건강보험
    longterm: 0.1295,  // 장기요양 (건강보험료의 12.95%)
    employment: 0.009  // 고용보험
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
        
        const net = computeWorkMinutes(record.clockIn, record.clockOut);
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
        const pension = Math.floor(totalGross * INSURANCE_RATES.pension);
        const health = Math.floor(totalGross * INSURANCE_RATES.health);
        const longterm = Math.floor(health * INSURANCE_RATES.longterm);
        const employment = Math.floor(totalGross * INSURANCE_RATES.employment);

        deductions.push({ name: '국민연금 (4.5%)', amount: pension });
        deductions.push({ name: '건강보험 (3.545%)', amount: health });
        deductions.push({ name: '장기요양보험', amount: longterm });
        deductions.push({ name: '고용보험 (0.9%)', amount: employment });
    } else {
        // 프리랜서 3.3% 기본 적용
        const freelanceTax = Math.floor(totalGross * 0.033);
        deductions.push({ name: '소득세 (3.3%)', amount: freelanceTax });
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
