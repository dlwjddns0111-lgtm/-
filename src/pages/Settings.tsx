import { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../lib/storage';
import { Settings } from '../types';
import { LogOut, Save, Settings as SettingsIcon, Clock, Bell, Shield, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

export default function SettingsPage({ onLogout }: { onLogout: () => void }) {
    const [settings, setSettings] = useState<Settings | null>(null);

    useEffect(() => {
        setSettings(getSettings());
    }, []);

    const handleSave = () => {
        if (settings) {
            saveSettings(settings);
            alert('설정이 저장되었습니다.');
        }
    };

    if (!settings) return null;

    return (
        <div className="flex flex-col h-full bg-[#F9FAFB] overflow-hidden">
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-gray-100 bg-white shadow-sm z-20">
                <h1 className="text-xl font-bold text-gray-900">설정</h1>
                <div className="w-10 h-10 bg-[#F5F3FF] ring-1 ring-purple-100 rounded-xl flex items-center justify-center shadow-sm">
                    <SettingsIcon className="w-5 h-5 text-[#8B5CF6]" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="max-w-xl mx-auto space-y-6 pb-20">

                    {/* Section: Pay Calculation */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-gray-700">
                            <Clock className="w-5 h-5 text-[#3B82F6]" /> 급여/근무 설정
                        </h2>

                        <div className="neo-card bg-white p-8 space-y-8 border-none ring-1 ring-gray-100">
                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">야간수당 구간 (22:00 - 06:00 권장)</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="time"
                                        className="neo-input flex-1"
                                        value={settings.nightShiftStart}
                                        onChange={e => setSettings({ ...settings, nightShiftStart: e.target.value })}
                                    />
                                    <div className="w-3 h-px bg-gray-300"></div>
                                    <input
                                        type="time"
                                        className="neo-input flex-1"
                                        value={settings.nightShiftEnd}
                                        onChange={e => setSettings({ ...settings, nightShiftEnd: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 pt-6 border-t border-gray-100">
                                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">일일 연장수당 기준 (보통 8시간)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="neo-input w-full pl-4 pr-16 text-lg font-bold"
                                        value={settings.overtimeThresholdDaily}
                                        onChange={e => setSettings({ ...settings, overtimeThresholdDaily: Number(e.target.value) })}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">시간</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 border-t border-gray-100 pt-6">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-bold text-gray-800">주휴수당 자동 계산</p>
                                    <p className="text-[11px] font-medium text-gray-400">주 15시간 이상 근무 시 자동 적용</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.weeklyAllowanceEnabled}
                                        onChange={e => setSettings({ ...settings, weeklyAllowanceEnabled: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3B82F6]"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Section: App Actions */}
                    <div className="space-y-3 pt-4">
                        <button
                            onClick={handleSave}
                            className="neo-btn neo-btn-primary w-full py-4 text-base font-bold shadow-lg shadow-blue-500/10"
                        >
                            <Save className="w-5 h-5" /> 설정 저장
                        </button>

                        <button
                            onClick={onLogout}
                            className="w-full py-4 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-4 h-4" /> 로그아웃
                        </button>
                    </div>

                    <div className="pt-10 border-t border-gray-100 flex flex-col items-center">
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Version 2.0.0 — Modern Redesign</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
