// src/types.ts

export interface Shop {
    id: string;
    name: string;
    ownerId: string;
}

export interface Staff {
    id: string;
    shopId: string;
    name: string;
    phone: string;
    role: string; // "manager", "staff", "part-time"
    rank: string; // "점장", "매니저", "직원", "알바"
    hourlyWage: number;
    payDay: number; // 1-31
    bankName: string;
    accountNumberMasked: string;
    startDate: string; // YYYY-MM-DD
    endDate?: string;
    isActive: boolean;
    applyWeeklyAllowance: boolean;
    color?: string;
    notes?: string;
}

export interface Attendance {
    id: string;
    shopId: string;
    staffId: string;
    date: string; // YYYY-MM-DD
    clockIn: string; // HH:mm
    clockOut: string; // HH:mm
    breakMinutes: number;
    tags: string[]; // "night", "overtime"
    memo?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface PayrollRun {
    id: string;
    shopId: string;
    periodStart: string; // YYYY-MM-DD
    periodEnd: string;
    status: 'draft' | 'final';
    totalLaborCost: number;
    createdAt: string;
}

export interface Deduction {
    name: string;
    amount: number;
}

export interface PayrollItem {
    id: string;
    payrollRunId: string;
    staffId: string;
    staffName: string; // Denormalized for convenience
    baseMinutes: number;
    basePay: number;
    overtimeMinutes: number;
    overtimePay: number;
    nightMinutes: number;
    nightPay: number;
    weeklyAllowancePay: number;
    deductions: Deduction[];
    totalDeduction: number;
    netPay: number;
    payslipId?: string;
}

export interface Settings {
    shopId: string;
    shopName: string;
    overtimeThresholdDaily: number; // e.g. 8 hours
    overtimeThresholdWeekly: number; // e.g. 40 hours
    nightShiftStart: string; // 22:00
    nightShiftEnd: string; // 06:00
    weeklyAllowanceEnabled: boolean;
}

export interface OwnerMemo {
    id: string;
    date: string; // YYYY-MM-DD
    content: string;
    type: 'schedule' | 'memo';
    createdAt: string;
}

export interface PayrollSummary {
    totalMinutes: number;
    totalLaborCost: number;
    staffCount: number;
}

export interface MonthlyHistory {
    month: string;
    cost: number;
}
