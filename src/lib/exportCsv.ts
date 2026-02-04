// src/lib/exportCsv.ts
import { PayrollItem } from "../types";

export const downloadPayrollCsv = (items: PayrollItem[], filename: string) => {
    // BOM for Excel Korean support
    const BOM = '\uFEFF';

    const headers = ['직원명', '기본급', '연장수당', '야간수당', '주휴수당', '공제총액', '가처분지급액'];
    const rows = items.map(item => [
        item.staffName,
        item.basePay,
        item.overtimePay,
        item.nightPay,
        item.weeklyAllowancePay,
        item.totalDeduction,
        item.netPay
    ]); // Simplified

    const csvContent =
        BOM +
        headers.join(',') + '\n' +
        rows.map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
