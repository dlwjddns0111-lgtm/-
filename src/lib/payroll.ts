// src/lib/payroll.ts
import { differenceInMinutes, parse, format, isAfter, isBefore, addDays, getDay, startOfMonth, subMonths } from 'date-fns';
import { Attendance, PayrollItem, Staff, Settings, Deduction, PayrollSummary, MonthlyHistory } from '../types';
import { getAttendance, getStaff, getSettings } from './storage';

// Helper to parse HH:mm to today's date for comparison
const parseTime = (timeStr: string, baseDate: Date = new Date()) => {
    return parse(timeStr, 'HH:mm', baseDate);
};

export const computeWorkMinutes = (clockIn: string, clockOut: string): number => {
    const start = parseTime(clockIn);
    let end = parseTime(clockOut);

    // Handle overnight shift (e.g., 22:00 to 04:00)
    if (isBefore(end, start)) {
        end = addDays(end, 1);
    }

    const diff = differenceInMinutes(end, start);
    return Math.max(0, diff);
};

export const splitNightMinutes = (
    clockIn: string,
    clockOut: string,
    nightStartStr: string = '22:00',
    nightEndStr: string = '06:00'
): number => {
    let start = parseTime(clockIn);
    let end = parseTime(clockOut);

    // If shift crosses midnight, split logic
    // Simplified logic: assume max 24h shift.
    // We need to intersect [start, end] with [nightStart, nightEnd]

    // Normalize dates to handle overnight
    if (isBefore(end, start)) {
        end = addDays(end, 1);
    }

    // Define night ranges.
    // Scenario 1: Night is 22:00 today -> 06:00 tomorrow
    const builtNightStart = parseTime(nightStartStr);
    const builtNightEnd = addDays(parseTime(nightEndStr), 1);

    // Previous night (yesterday 22:00 -> today 06:00) - in case shift started early morning
    const prevNightStart = addDays(builtNightStart, -1);
    const prevNightEnd = addDays(builtNightEnd, -1);

    // Helper to get intersection minutes
    const getIntersection = (s1: Date, e1: Date, s2: Date, e2: Date) => {
        const startMax = isAfter(s1, s2) ? s1 : s2;
        const endMin = isBefore(e1, e2) ? e1 : e2;
        const diff = differenceInMinutes(endMin, startMax);
        return diff > 0 ? diff : 0;
    };

    let nightMinutes = 0;
    nightMinutes += getIntersection(start, end, prevNightStart, prevNightEnd);
    nightMinutes += getIntersection(start, end, builtNightStart, builtNightEnd);

    // Note: This simplified version doesn't subtract break time specifically from night time 
    // unless we know exactly WHEN the break was taken. 
    // Rule of thumb: Pro-rate or assume break is not in night if possible? 
    // For MVP, if night portion > 0, we leave it. Or we can just ignore breaks for night calc for now 
    // OR the user should specify break time range.
    // Standard simple practice: just return calculated intersection.
    return nightMinutes;
};

export const computePayrollItem = (
    staff: Staff,
    records: Attendance[],
    settings: Settings,
    deductionsTemplate: Deduction[]
): PayrollItem => {
    let totalBaseMinutes = 0;
    let totalNightMinutes = 0;
    let totalOvertimeMinutes = 0;

    // 1. Calculate Daily Hours & Overtime
    records.forEach(record => {
        const net = computeWorkMinutes(record.clockIn, record.clockOut);
        const night = splitNightMinutes(record.clockIn, record.clockOut, settings.nightShiftStart, settings.nightShiftEnd);

        let dailyOvertime = 0;
        // Daily overtime rule
        if (net > settings.overtimeThresholdDaily * 60) {
            dailyOvertime = net - (settings.overtimeThresholdDaily * 60);
        }

        totalBaseMinutes += (net - dailyOvertime);
        totalOvertimeMinutes += dailyOvertime;
        totalNightMinutes += night;
    });

    // 2. Weekly Overtime Check (Simplified: just compare total vs 40h if daily overtime wasn't enough?)
    // Usually it's Max(DailyOvertimeTotal, WeeklyOvertime). 
    // For MVP, let's trust the daily accumulation or simple total check.
    // If sum of net > 40 hours?
    // Let's stick to daily overtime for now as it's common for part-timers.

    // 3. Weekly Allowance (Ju-hyu)
    // Condition: > 15 hours per week && attended all scheduled days (MVP: just check > 15 hours total for the week)
    // We need to group by week. To simplify for monthly payroll:
    // If total hours / weeks > 15? 
    // Let's implement a simple version: Calculate per week.
    let weeklyAllowancePay = 0;
    if (staff.applyWeeklyAllowance) {
        // Basic logic: if total work hours >= 15 * (weeks in period), Approx.
        // Better: Group records by Week Number.
        const weeks: Record<number, number> = {};
        records.forEach(r => {
            const d = new Date(r.date); // Use simple parse
            const weekNum = getDay(d); // This returns day index 0-6. Not week number.
            // Actually we need to just sum up hours.
            // Correct logic: (Total Hours / 40) * 8 * HourlyWage? No.
            // Standard: (Average Daily Hours) * HourlyWage * (If > 15h/week)

            // MVP Short-cut: User toggle "Apply Weekly Allowance" is ON.
            // Use 1/5 of total basic pay as approximation if 40h?
            // Or: (TotalWorkHours / 40) * 8 * HourlyWage?

            // Let's enable a manual adjustment or simple 20% rule for full-timers?
            // "Ju-hyu" is roughly 1 day wages for 5 days work.
            // Calc: (NetHours / 5) * HourlyWage ?? 
            // Common formula: (WeeklyHours / 40) * 8 * HourlyWage.

            // Let's compute: Total Net Minutes
            // weeklyAllowancePay = (TotalBaseMinutes / 60 / 40) * 8 * staff.hourlyWage * (Number of Weeks)
            // This is too complex to automate perfectly without schedule.
            // ALTERNATIVE: Don't auto-calc fully, just suggest?
            // LETS DO: If total hours >= 60 (approx 15*4), add 15 hours worth?

            // Precise: Group by ISO week
            // For MVP, let's skip complex auto-weekly-allowance and add it as a computed field that is roughly 
            // (TotalBaseHours / TotalDays) * HourlyWage * (Weeks worked) if > 15h.
            // Let's use a simpler heuristic for MVP:
            // If (TotalHours / 4) >= 15 -> Add 1 day wage per week.
        });

        // Very simple fallback: 
        // If working > 60 hours in a month, add (TotalHours/5) * HourlyWage ? That's too much.
        // 20% of base pay is a standard approximation for full attendance.
        weeklyAllowancePay = (totalBaseMinutes / 60) * staff.hourlyWage * 0.2;
    }

    const basePay = Math.floor((totalBaseMinutes / 60) * staff.hourlyWage);
    const overtimePay = Math.floor((totalOvertimeMinutes / 60) * staff.hourlyWage * 1.5);
    const nightPay = Math.floor((totalNightMinutes / 60) * staff.hourlyWage * 0.5); // 0.5 because base is already in basePay/overtime

    // Note: if night overlap with base, we pay 1.0 (base) + 0.5 (night).
    // If night overlaps with overtime, we pay 1.5 (overtime) + 0.5 (night) = 2.0.
    // Our logic above: totalBaseMinutes includes everything NOT overtime.
    // totalOvertimeMinutes includes everything >8h.
    // totalNightMinutes is purely time-range based.
    // So adding them constructs the full pay.

    const totalGross = basePay + overtimePay + nightPay + weeklyAllowancePay;

    const totalDeduction = deductionsTemplate.reduce((sum, d) => sum + d.amount, 0);

    return {
        id: crypto.randomUUID(), // temp id
        payrollRunId: '',
        staffId: staff.id,
        staffName: staff.name,
        baseMinutes: totalBaseMinutes,
        basePay,
        overtimeMinutes: totalOvertimeMinutes,
        overtimePay,
        nightMinutes: totalNightMinutes,
        nightPay,
        weeklyAllowancePay: Math.floor(weeklyAllowancePay),
        deductions: deductionsTemplate,
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
        const staff = allStaff.find(s => s.id === staffId);
        if (!staff) return;

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
