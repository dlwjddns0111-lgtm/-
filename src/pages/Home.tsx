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
import { getStaff, getSettings, saveSettings } from '../lib/storage';
import { syncToCloud } from '../lib/sync';
import { computePayrollSummary, computeMonthlyHistory } from '../lib/payroll';
import { PayrollSummary, MonthlyHistory } from '../types';
import clsx from 'clsx';
import { useLanguage, getTranslations } from '../lib/language';

export default function Home() {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const t = getTranslations(language);

    const [summary, setSummary] = useState<PayrollSummary | null>(null);
    const [history, setHistory] = useState<MonthlyHistory[]>([]);
    const [storeName, setStoreName] = useState('우리 매장');

    useEffect(() => {
        const staff = getStaff();
        const now = new Date();
        const currentMonth = format(now, 'yyyy-MM');

        setSummary(computePayrollSummary(currentMonth));
        setHistory(computeMonthlyHistory(4));

        const settings = getSettings();
        if (settings.shopName) setStoreName(settings.shopName);
    }, []);

    if (!summary) return null;

    // Calculate difference from last month for visual flair
    const prevMonth = history[history.length - 2];
    const diff = prevMonth ? summary.totalLaborCost - prevMonth.cost : 0;

    return (
        <div className="flex flex-col h-full bg-[#F9FAFB] dark:bg-gray-950 overflow-y-auto pb-10 transition-colors">
            {/* 1. Header with Store Name */}
            <div className="px-6 py-8 flex flex-col items-center text-center gap-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-colors">
                <div
                    className="w-12 h-12 bg-[#F5F3FF] dark:bg-blue-900/30 ring-1 ring-purple-100 dark:ring-blue-800/50 rounded-2xl flex items-center justify-center shadow-sm"
                >
                    <Store className="text-[#8B5CF6] dark:text-blue-400 w-6 h-6" />
                </div>
                <div>
                    <h1
                        className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight cursor-pointer hover:text-[#3B82F6] dark:hover:text-blue-400 transition-colors"
                        onClick={() => {
                            const name = prompt(t.homeStorePrompt, storeName);
                            if (name) {
                                setStoreName(name);
                                const settings = getSettings();
                                saveSettings({ ...settings, shopName: name });
                                syncToCloud();
                            }
                        }}
                    >
                        {storeName}
                    </h1>
                </div>
            </div>

            <div className="p-6 space-y-6 max-w-2xl mx-auto w-full">
                {/* 2. Main Analytics Card */}
                <div className="neo-card p-8 relative overflow-hidden text-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 transition-colors">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#3B82F6]" />
                    <p className="text-gray-400 dark:text-gray-500 text-[10px] font-semibold uppercase tracking-widest mb-2">{t.homeEstCost}</p>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center justify-center">
                        {summary.totalLaborCost.toLocaleString()}
                        <span className="text-lg font-medium text-gray-400 dark:text-gray-500 ml-1.5">{t.homeCurrency}</span>
                    </h2>
                </div>

                {/* 3. Monthly History Chart */}
                <div className="neo-card p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 transition-colors">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-gray-200">
                            <TrendingUp className="w-5 h-5 text-[#3B82F6]" />
                            {t.homeMonthlyTrend}
                        </h3>
                        <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold px-3 py-1 rounded-full">{t.homeLast4Months}</span>
                    </div>

                    <div className="flex items-baseline justify-between px-2 h-72 gap-4 relative">
                        {history.map((h, i) => {
                            const isCurrent = h.month === format(new Date(), 'M월');
                            const maxCost = Math.max(...history.map(x => x.cost), 100000); // Dynamic max scale

                            // Simple linear scale relative to maxCost
                            // 5% minimum for 0 won to show something exists, up to 100%
                            const heightPercentage = Math.min(Math.max((h.cost / maxCost) * 100, 5), 100);

                            return (
                                <div key={i} className="flex-1 flex flex-col items-center group h-full">
                                    {/* Chart Column Area */}
                                    <div className="flex-1 w-full flex flex-col items-center justify-end pb-2">
                                        {/* Label */}
                                        <div className={clsx(
                                            "text-[10px] font-bold mb-2 transition-colors",
                                            isCurrent ? "text-[#3B82F6]" : "text-gray-400 dark:text-gray-500"
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
                                                        : "bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700"
                                                )}
                                                style={{ height: `${heightPercentage}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Month Label */}
                                    <span className={clsx(
                                        "text-[11px] font-bold pt-3 border-t-2 w-full text-center transition-colors",
                                        isCurrent ? "text-[#3B82F6] border-[#3B82F6]" : "text-gray-400 dark:text-gray-600 border-transparent"
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
