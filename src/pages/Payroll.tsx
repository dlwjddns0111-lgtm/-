import { useState, useEffect } from 'react';
import { getStaff, getAttendance, getSettings } from '../lib/storage';
import { computePayrollItem } from '../lib/payroll';
import { Staff, Attendance, PayrollItem, Deduction } from '../types';
import { DollarSign, Download, Printer, X, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';

export default function PayrollPage() {
    const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);
    const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [selectedItem, setSelectedItem] = useState<PayrollItem | null>(null);

    const calculate = () => {
        const staff = getStaff();
        const attendance = getAttendance();
        const settings = getSettings();
        const [year, m] = month.split('-').map(Number);

        const filteredAttendance = attendance.filter(r => {
            const d = new Date(r.date);
            return d.getFullYear() === year && d.getMonth() + 1 === m;
        });

        const items = staff.filter(s => s.isActive).map(s => {
            const staffRecords = filteredAttendance.filter(r => r.staffId === s.id);
            const item = computePayrollItem(s, staffRecords, settings, []);

            const gross = item.basePay + item.overtimePay + item.nightPay + item.weeklyAllowancePay;
            const tax = Math.floor(gross * 0.033);
            item.deductions = [{ name: '소득세(3.3%)', amount: tax }];
            item.totalDeduction = tax;
            item.netPay = gross - tax;

            return item;
        });

        setPayrollItems(items);
    };

    useEffect(() => {
        setStaffList(getStaff());
        calculate();
    }, [month]);

    return (
        <div className="min-h-full bg-[#F9FAFB] p-6 space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex-nowrap gap-3">
                <h1 className="text-lg font-bold text-gray-900 whitespace-nowrap">급여 관리</h1>
                <div className="flex items-center gap-2 shrink-0">
                    <input
                        type="month"
                        value={month}
                        onChange={e => setMonth(e.target.value)}
                        className="neo-input py-1.5 px-2 text-sm"
                    />
                </div>
            </div>

            <div className="space-y-4">
                {payrollItems.length === 0 ? (
                    <div className="p-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 text-center">
                        <DollarSign className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 font-medium">이번 달 급여 데이터가 없습니다</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {payrollItems.map(item => (
                                <div key={item.staffId} className="neo-card bg-white p-6 border-none ring-1 ring-gray-100">
                                    <div className="flex justify-between items-center mb-4 gap-2 flex-nowrap">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 font-bold border border-gray-100 shrink-0 text-xs">
                                                {item.staffName[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-gray-900 text-sm truncate">{item.staffName}</h3>
                                                <p className="text-[10px] text-gray-400 whitespace-nowrap">총 {Math.round((item.baseMinutes + item.overtimeMinutes + item.nightMinutes) / 60)}시간</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-bold text-gray-900 whitespace-nowrap">{item.netPay.toLocaleString()}원</p>
                                            <p className="text-[9px] text-gray-400">실지급액</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 bg-gray-50 p-4 rounded-xl">
                                        <div className="flex justify-between text-[11px] font-medium text-gray-500">
                                            <span>기본급</span>
                                            <span className="text-gray-900 font-bold">{item.basePay.toLocaleString()}</span>
                                        </div>
                                        {(item.overtimePay > 0 || item.nightPay > 0 || item.weeklyAllowancePay > 0) && (
                                            <div className="pt-2 border-t border-gray-200 space-y-1">
                                                {item.overtimePay > 0 && (
                                                    <div className="flex justify-between text-[10px] font-bold text-blue-500">
                                                        <span>연장수당 ({Math.round(item.overtimeMinutes / 60)}시간)</span>
                                                        <span>+{item.overtimePay.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {item.nightPay > 0 && (
                                                    <div className="flex justify-between text-[10px] font-bold text-purple-500">
                                                        <span>야간수당 ({Math.round(item.nightMinutes / 60)}시간)</span>
                                                        <span>+{item.nightPay.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                {item.weeklyAllowancePay > 0 && (
                                                    <div className="flex justify-between text-[10px] font-bold text-green-600">
                                                        <span>주휴수당</span>
                                                        <span>+{item.weeklyAllowancePay.toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="flex justify-between text-[10px] font-bold text-red-400 pt-2 border-t border-gray-200 mt-1">
                                            <span>공제 (3.3%)</span>
                                            <span>-{item.totalDeduction.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setSelectedItem(item)}
                                        className="w-full mt-4 py-2.5 bg-white border border-gray-100 rounded-xl text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center gap-2"
                                    >
                                        <FileText className="w-3.5 h-3.5" /> 명세서 상세
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Summary Stats at Bottom */}
                        <div className="grid grid-cols-4 gap-2 mt-8 pt-8 border-t border-gray-100">
                            <div className="neo-card p-3 text-center">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mb-1">총 근무</p>
                                <p className="text-sm md:text-xl font-bold text-gray-900 whitespace-nowrap">
                                    {Math.round(payrollItems.reduce((acc, curr) => acc + curr.baseMinutes + curr.overtimeMinutes + curr.nightMinutes, 0) / 60)}시간
                                </p>
                            </div>
                            <div className="neo-card p-3 text-center">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight mb-1">총 급여</p>
                                <p className="text-sm md:text-xl font-bold text-gray-900 whitespace-nowrap">
                                    {payrollItems.reduce((acc, curr) => acc + curr.netPay + curr.totalDeduction, 0).toLocaleString()}원
                                </p>
                            </div>
                            <div className="neo-card p-3 text-center ring-2 ring-blue-100 bg-blue-50/30">
                                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-tight mb-1 text-xs">실지급</p>
                                <p className="text-sm md:text-xl font-bold text-blue-600 whitespace-nowrap">
                                    {payrollItems.reduce((acc, curr) => acc + curr.netPay, 0).toLocaleString()}원
                                </p>
                            </div>
                            <div className="neo-card p-3 text-center">
                                <p className="text-[9px] font-bold text-red-300 uppercase tracking-tight mb-1 text-xs">공제</p>
                                <p className="text-sm md:text-xl font-bold text-red-500 whitespace-nowrap">
                                    {payrollItems.reduce((acc, curr) => acc + curr.totalDeduction, 0).toLocaleString()}원
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Payslip Modal */}
            {selectedItem && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="bg-[#F5F3FF] p-8 relative border-b border-purple-50">
                            <button
                                onClick={() => setSelectedItem(null)}
                                className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center bg-white text-gray-400 hover:text-gray-600 shadow-sm border border-purple-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6] mb-1">{month} 급여 명세서</p>
                            <h2 className="text-3xl font-bold text-gray-900">{selectedItem.staffName}</h2>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Key Summary */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">총 근무 시간</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        {Math.round((selectedItem.baseMinutes + selectedItem.overtimeMinutes + selectedItem.nightMinutes) / 60)}시간
                                    </p>
                                </div>
                                <div className="bg-[#EFF6FF] p-4 rounded-2xl border border-blue-50">
                                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">실지급액</p>
                                    <p className="text-xl font-bold text-blue-600">
                                        {selectedItem.netPay.toLocaleString()}<span className="text-xs font-medium ml-1">원</span>
                                    </p>
                                </div>
                            </div>

                            {/* Details Table */}
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> 지급 항목
                                    </h4>
                                    <div className="space-y-3 px-1">
                                        <div className="flex justify-between text-sm font-medium">
                                            <span className="text-gray-500">기본급</span>
                                            <span className="text-gray-900 font-bold">{selectedItem.basePay.toLocaleString()}원</span>
                                        </div>
                                        {selectedItem.overtimePay > 0 && (
                                            <div className="flex justify-between text-sm font-medium">
                                                <span className="text-gray-500">연장수당</span>
                                                <span className="text-blue-500 font-bold">+{selectedItem.overtimePay.toLocaleString()}원</span>
                                            </div>
                                        )}
                                        {selectedItem.nightPay > 0 && (
                                            <div className="flex justify-between text-sm font-medium">
                                                <span className="text-gray-500">야간수당</span>
                                                <span className="text-purple-500 font-bold">+{selectedItem.nightPay.toLocaleString()}원</span>
                                            </div>
                                        )}
                                        {selectedItem.weeklyAllowancePay > 0 && (
                                            <div className="flex justify-between text-sm font-medium">
                                                <span className="text-gray-500">주휴수당</span>
                                                <span className="text-green-600 font-bold">+{selectedItem.weeklyAllowancePay.toLocaleString()}원</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> 공제 항목
                                    </h4>
                                    <div className="space-y-3 px-1">
                                        {selectedItem.deductions.map((d, i) => (
                                            <div key={i} className="flex justify-between text-sm font-medium">
                                                <span className="text-gray-500">{d.name}</span>
                                                <span className="text-red-500 font-bold">-{d.amount.toLocaleString()}원</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedItem(null)}
                                className="neo-btn neo-btn-primary w-full py-4 text-base font-bold shadow-lg shadow-blue-500/10"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
