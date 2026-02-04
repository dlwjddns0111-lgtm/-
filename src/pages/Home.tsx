import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Clock,
    Wallet,
    TrendingUp,
    ChevronRight,
    Plus,
    Calendar,
    Store,
    ChevronDown,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { format, startOfMonth, subMonths } from 'date-fns';
import { getStaff } from '../lib/storage';
import { computePayrollSummary, computeMonthlyHistory } from '../lib/payroll';
import { PayrollSummary, MonthlyHistory } from '../types';
import clsx from 'clsx';

export default function Home() {
    const navigate = useNavigate();
    const [summary, setSummary] = useState<PayrollSummary | null>(null);
    const [history, setHistory] = useState<MonthlyHistory[]>([]);
    const [storeName, setStoreName] = useState('우리 매장');

    useEffect(() => {
        const staff = getStaff();
        const now = new Date();
        const currentMonth = format(now, 'yyyy-MM');

        setSummary(computePayrollSummary(currentMonth));
        setHistory(computeMonthlyHistory(4));

        const storedName = localStorage.getItem('storeName');
        if (storedName) setStoreName(storedName);
    }, []);

    if (!summary) return null;

    // Calculate difference from last month for visual flair
    const prevMonth = history[history.length - 2];
    const diff = prevMonth ? summary.totalLaborCost - prevMonth.cost : 0;

    return (
        <div className="flex flex-col h-full bg-[#F9FAFB] overflow-y-auto pb-10">
            {/* 1. Header with Store Name */}
            <div className="px-6 py-12 flex flex-col items-center text-center gap-4 bg-white border-b border-gray-100">
                <div
                    className="w-16 h-16 bg-[#F5F3FF] ring-1 ring-purple-100 rounded-2xl flex items-center justify-center shadow-sm"
                >
                    <Store className="text-[#8B5CF6] w-8 h-8" />
                </div>
                <div>
                    <h1
                        className="text-3xl font-bold text-gray-900 tracking-tight cursor-pointer hover:text-[#3B82F6] transition-colors"
                        onClick={() => {
                            const name = prompt('가게 이름을 입력하세요', storeName);
                            if (name) {
                                setStoreName(name);
                                localStorage.setItem('storeName', name);
                            }
                        }}
                    >
                        {storeName}
                    </h1>
                </div>
            </div>

            <div className="p-6 space-y-6 max-w-2xl mx-auto w-full">
                {/* 2. Main Analytics Card */}
                <div className="neo-card p-10 relative overflow-hidden text-center">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#3B82F6]" />
                    <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">이번 달 예상 인건비</p>
                    <h2 className="text-5xl font-bold tracking-tight text-gray-900">
                        {summary.totalLaborCost.toLocaleString()}
                        <span className="text-xl font-medium text-gray-400 ml-2">원</span>
                    </h2>
                </div>

                {/* 3. Monthly History Chart */}
                <div className="neo-card p-6 border-none ring-1 ring-gray-100">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                            <TrendingUp className="w-5 h-5 text-[#3B82F6]" />
                            월별 추이
                        </h3>
                        <span className="neo-badge">최근 4개월</span>
                    </div>

                    <div className="flex items-baseline justify-between px-2 h-72 gap-4 relative">
                        {history.map((h, i) => {
                            const isCurrent = h.month === format(new Date(), 'M월');
                            const maxCost = Math.max(...history.map(x => x.cost)) || 10000;

                            // Simple linear scale relative to maxCost
                            // 5% minimum for 0 won to show something exists, up to 100%
                            const heightPercentage = h.cost === 0 ? 0 : Math.max((h.cost / maxCost) * 100, 5);

                            return (
                                <div key={i} className="flex-1 flex flex-col items-center group h-full">
                                    {/* Chart Column Area */}
                                    <div className="flex-1 w-full flex flex-col items-center justify-end pb-2">
                                        {/* Label */}
                                        <div className={clsx(
                                            "text-[10px] font-bold mb-2 transition-colors",
                                            isCurrent ? "text-[#3B82F6]" : "text-gray-400"
                                        )}>
                                            {(h.cost / 10000).toFixed(0)}만
                                        </div>

                                        {/* Bar with defined height context */}
                                        <div className="w-full max-w-[48px] h-48 flex items-end">
                                            <div
                                                className={clsx(
                                                    "w-full rounded-t-2xl transition-all duration-700 ease-out shadow-sm",
                                                    isCurrent
                                                        ? "bg-gradient-to-t from-[#3B82F6] to-[#60A5FA]"
                                                        : "bg-gray-100 group-hover:bg-gray-200"
                                                )}
                                                style={{ height: `${heightPercentage}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Month Label */}
                                    <span className={clsx(
                                        "text-[11px] font-bold pt-3 border-t-2 w-full text-center transition-colors",
                                        isCurrent ? "text-[#3B82F6] border-[#3B82F6]" : "text-gray-400 border-transparent"
                                    )}>
                                        {h.month}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
