import { useState, useEffect } from 'react';
import { getStaff, saveStaff, deleteStaff } from '../lib/storage';
import { syncToCloud } from '../lib/sync';
import { Staff } from '../types';
import { Plus, Edit2, Trash2, User, X, CheckCircle2, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export default function StaffPage() {
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentStaff, setCurrentStaff] = useState<Partial<Staff>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        setStaffList(getStaff().filter(s => s.isActive !== false));
    }, []);

    const handleSave = async () => {
        if (!currentStaff.name) return alert('이름을 입력하세요.');
        if ((currentStaff.salaryType || 'hourly') === 'hourly' && !currentStaff.hourlyWage) return alert('시급을 입력하세요.');
        if (currentStaff.salaryType === 'monthly' && !currentStaff.monthlySalary) return alert('월급을 입력하세요.');

        setIsSaving(true);
        try {
            const newStaff: Staff = {
                id: currentStaff.id || crypto.randomUUID(),
                shopId: 'default',
                name: currentStaff.name as string,
                phone: currentStaff.phone || '',
                role: 'staff',
                rank: currentStaff.rank || '알바',
                salaryType: currentStaff.salaryType || 'hourly',
                hourlyWage: Number(currentStaff.hourlyWage || 0),
                monthlySalary: Number(currentStaff.monthlySalary || 0),
                payDay: 10,
                bankName: '',
                accountNumberMasked: '',
                startDate: currentStaff.startDate || new Date().toISOString().split('T')[0],
                isActive: true,
                applyWeeklyAllowance: currentStaff.applyWeeklyAllowance ?? false,
                applyInsurances: currentStaff.applyInsurances ?? false,
                applyNightAllowance: currentStaff.applyNightAllowance ?? false,
                applyHolidayAllowance: currentStaff.applyHolidayAllowance ?? false,
                color: currentStaff.color || '#3B82F6',
                notes: currentStaff.notes || ''
            };

            saveStaff(newStaff);
            setStaffList(getStaff().filter(s => s.isActive !== false));
            await syncToCloud(); // 클라우드 업로드 완료까지 대기
            setSaveSuccess(true);
            setTimeout(() => {
                setSaveSuccess(false);
                setIsEditing(false);
                setCurrentStaff({});
            }, 800);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('정말 삭제하시겠습니까?')) {
            deleteStaff(id);
            setStaffList(getStaff().filter(s => s.isActive !== false));
            syncToCloud();
        }
    };

    return (
        <div className="min-h-full bg-[#F9FAFB] dark:bg-gray-950 p-6 space-y-6 transition-colors">
            <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 transition-colors">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">직원 목록</h1>
                <button
                    onClick={() => { setCurrentStaff({}); setIsEditing(true); }}
                    className="neo-btn neo-btn-primary py-2 px-4 text-sm"
                >
                    <Plus className="w-4 h-4" /> 직원 추가
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {staffList.map(staff => (
                    <div key={staff.id} className="neo-card bg-white dark:bg-gray-900 p-6 flex flex-col justify-between border-none ring-1 ring-gray-100 dark:ring-gray-800 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white ring-4 ring-offset-2 ring-transparent"
                                    style={{ backgroundColor: staff.color || '#3B82F6' }}
                                >
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{staff.name}</h3>
                                        <span className="neo-badge dark:bg-gray-800 dark:text-gray-300">
                                            {staff.rank}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 font-medium tracking-tight">
                                        {staff.salaryType === 'monthly' 
                                            ? `₩${(staff.monthlySalary || 0).toLocaleString()} / 월급`
                                            : `₩${staff.hourlyWage.toLocaleString()} / 시급`
                                        }
                                    </p>
                                    {staff.phone && (
                                        <p className="text-[10px] text-gray-300 font-medium mt-0.5">{staff.phone}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setCurrentStaff(staff); setIsEditing(true); }}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 text-gray-500 hover:bg-[#3B82F6] hover:text-white transition-colors border border-gray-100"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(staff.id)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 text-gray-500 hover:bg-red-500 hover:text-white transition-colors border border-gray-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isEditing && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="neo-card w-full max-w-sm bg-white p-8 border-none shadow-2xl my-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">직원 정보</h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">이름 *</label>
                                <input
                                    className="neo-input w-full py-2.5"
                                    placeholder="이름 입력"
                                    value={currentStaff.name || ''}
                                    onChange={e => setCurrentStaff({ ...currentStaff, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">연락처</label>
                                <input
                                    className="neo-input w-full py-2.5"
                                    placeholder="010-0000-0000"
                                    value={currentStaff.phone || ''}
                                    onChange={e => setCurrentStaff({ ...currentStaff, phone: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">급여 체계</label>
                                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStaff({ ...currentStaff, salaryType: 'hourly' })}
                                        className={clsx(
                                            "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                                            (currentStaff.salaryType || 'hourly') === 'hourly' ? "bg-white text-[#3B82F6] shadow-sm" : "text-gray-400"
                                        )}
                                    >
                                        시급제
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStaff({ ...currentStaff, salaryType: 'monthly' })}
                                        className={clsx(
                                            "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                                            currentStaff.salaryType === 'monthly' ? "bg-white text-[#3B82F6] shadow-sm" : "text-gray-400"
                                        )}
                                    >
                                        월급제
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    {(currentStaff.salaryType || 'hourly') === 'hourly' ? '시급' : '월급'}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">₩</span>
                                    {(currentStaff.salaryType || 'hourly') === 'hourly' ? (
                                        <input
                                            className="neo-input w-full pl-10 py-2.5"
                                            placeholder="0"
                                            type="number"
                                            value={currentStaff.hourlyWage || ''}
                                            onChange={e => setCurrentStaff({ ...currentStaff, hourlyWage: Number(e.target.value) })}
                                        />
                                    ) : (
                                        <input
                                            className="neo-input w-full pl-10 py-2.5"
                                            placeholder="0"
                                            type="number"
                                            value={currentStaff.monthlySalary || ''}
                                            onChange={e => setCurrentStaff({ ...currentStaff, monthlySalary: Number(e.target.value) })}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">직급</label>
                                <select
                                    className="neo-input w-full py-2.5"
                                    value={currentStaff.rank || '알바'}
                                    onChange={e => setCurrentStaff({ ...currentStaff, rank: e.target.value })}
                                >
                                    <option value="점장">점장</option>
                                    <option value="매니저">매니저</option>
                                    <option value="직원">직원</option>
                                    <option value="알바">알바</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">색상</label>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {[
                                        '#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6', 
                                        '#6366F1', '#8B5CF6', '#EC4899'
                                    ].map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setCurrentStaff({ ...currentStaff, color: c })}
                                            className={clsx(
                                                "w-8 h-8 rounded-full border-2 transition-all shadow-sm",
                                                currentStaff.color === c ? "ring-2 ring-offset-2 ring-gray-900 border-white scale-110" : "border-transparent opacity-70 hover:opacity-100"
                                            )}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-gray-50">
                                <div className="flex justify-center mb-1">
                                    <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 text-[9px] font-black px-2.5 py-1 rounded-full border border-blue-100">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                        </span>
                                        {new Date().getFullYear()} 법정 기준 자동 업데이트 중
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">주휴수당</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={currentStaff.applyWeeklyAllowance ?? false}
                                            onChange={e => setCurrentStaff({ ...currentStaff, applyWeeklyAllowance: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3B82F6]"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">4대보험</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={currentStaff.applyInsurances ?? false}
                                            onChange={e => setCurrentStaff({ ...currentStaff, applyInsurances: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">야간수당</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={currentStaff.applyNightAllowance ?? false}
                                            onChange={e => setCurrentStaff({ ...currentStaff, applyNightAllowance: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#8B5CF6]"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">휴일수당 (1.5배)</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={currentStaff.applyHolidayAllowance ?? false}
                                            onChange={e => setCurrentStaff({ ...currentStaff, applyHolidayAllowance: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-600"></div>
                                    </label>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className={clsx(
                                    "neo-btn neo-btn-primary w-full py-3.5 text-base font-bold mt-2 shadow-lg shadow-blue-500/20 transition-all",
                                    isSaving && "opacity-70 cursor-not-allowed"
                                )}
                            >
                                {isSaving ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" /> 저장 중...
                                    </span>
                                ) : saveSuccess ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" /> 저장 완료!
                                    </span>
                                ) : '저장하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
