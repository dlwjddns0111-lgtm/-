import { useState, useEffect } from 'react';
import { getStaff, saveStaff, deleteStaff } from '../lib/storage';
import { syncToCloud } from '../lib/sync';
import { computeSeverancePay, SeveranceResult } from '../lib/payroll';
import { Staff } from '../types';
import { Plus, Edit2, Trash2, User, X, CheckCircle2, Loader2, Calculator, AlertCircle, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';

export default function StaffPage() {
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentStaff, setCurrentStaff] = useState<Partial<Staff>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // 퇴직금 계산기 상태
    const [severanceStaff, setSeveranceStaff] = useState<Staff | null>(null);
    const [retirementDate, setRetirementDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [severanceResult, setSeveranceResult] = useState<SeveranceResult | null>(null);

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
            await syncToCloud();
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

    const openSeverance = (staff: Staff) => {
        setSeveranceStaff(staff);
        const today = format(new Date(), 'yyyy-MM-dd');
        setRetirementDate(today);
        setSeveranceResult(computeSeverancePay(staff, today));
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
                {staffList.map(staff => {
                    const sv = computeSeverancePay(staff);
                    return (
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
                                            <span className="neo-badge dark:bg-gray-800 dark:text-gray-300">{staff.rank}</span>
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

                            {/* 퇴직금 현황 - 항상 보이는 섹션 */}
                            <div className="mt-3 border-t border-gray-50 pt-3">
                                {!staff.startDate ? (
                                    // 입사일 없음 → 경고
                                    <button
                                        onClick={() => { setCurrentStaff(staff); setIsEditing(true); }}
                                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100 hover:bg-red-100 transition-colors"
                                    >
                                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                        <span className="text-xs font-bold text-red-500">입사일 미입력 → 탭하여 입력</span>
                                        <span className="text-[10px] text-red-300 ml-auto">(퇴직금 계산 불가)</span>
                                    </button>
                                ) : sv.eligible ? (
                                    // 1년 이상 → 퇴직금 발생
                                    <button
                                        onClick={() => openSeverance(staff)}
                                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 hover:from-orange-100 hover:to-amber-100 transition-all"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                                            <span className="text-xs font-bold text-orange-700">퇴직금 지급 대상</span>
                                            <span className="text-[10px] text-orange-400">{sv.workingDays}일 근무</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm font-black text-orange-600">{sv.severancePay.toLocaleString()}원</span>
                                            <ChevronRight className="w-3.5 h-3.5 text-orange-300" />
                                        </div>
                                    </button>
                                ) : (
                                    // 1년 미만 → 아직 미발생
                                    <button
                                        onClick={() => openSeverance(staff)}
                                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-gray-300" />
                                            <span className="text-xs font-bold text-gray-400">퇴직금 미발생</span>
                                            <span className="text-[10px] text-gray-300">{sv.workingDays}일 / 365일</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-gray-300">{(365 - sv.workingDays)}일 후 발생</span>
                                            <ChevronRight className="w-3.5 h-3.5 text-gray-200" />
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 직원 편집 모달 */}
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

                            {/* 입사일 - 퇴직금 계산 핵심 필드 */}
                            <div className="space-y-1.5 bg-orange-50 border border-orange-100 rounded-xl p-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-orange-600 uppercase tracking-widest flex items-center gap-1">
                                        <Calculator className="w-3 h-3" />
                                        입사일 * <span className="text-red-400">(필수)</span>
                                    </label>
                                    <span className="text-[10px] text-orange-400 font-medium">퇴직금 계산 기준</span>
                                </div>
                                <input
                                    type="date"
                                    className="neo-input w-full py-2.5 border-orange-200 focus:ring-orange-300"
                                    value={currentStaff.startDate || ''}
                                    onChange={e => setCurrentStaff({ ...currentStaff, startDate: e.target.value })}
                                />
                                <p className="text-[10px] text-orange-400">1년 이상 근무 시 퇴직금 자동 계산됩니다</p>
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
                                {[
                                    { key: 'applyWeeklyAllowance', label: '주휴수당', color: 'peer-checked:bg-[#3B82F6]' },
                                    { key: 'applyInsurances', label: '4대보험', color: 'peer-checked:bg-blue-600' },
                                    { key: 'applyNightAllowance', label: '야간수당', color: 'peer-checked:bg-[#8B5CF6]' },
                                    { key: 'applyHolidayAllowance', label: '휴일수당 (1.5배)', color: 'peer-checked:bg-pink-600' },
                                ].map(({ key, label, color }) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={(currentStaff as any)[key] ?? false}
                                                onChange={e => setCurrentStaff({ ...currentStaff, [key]: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className={`w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${color}`}></div>
                                        </label>
                                    </div>
                                ))}
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

            {/* 퇴직금 계산기 모달 */}
            {severanceStaff && severanceResult && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden my-auto animate-in zoom-in duration-200">
                        {/* 헤더 */}
                        <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-6 relative">
                            <button
                                onClick={() => setSeveranceStaff(null)}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2 mb-1">
                                <Calculator className="w-5 h-5 text-white/80" />
                                <p className="text-white/80 text-xs font-bold uppercase tracking-widest">퇴직금 계산기</p>
                            </div>
                            <h2 className="text-2xl font-black text-white">{severanceStaff.name}</h2>
                            <p className="text-white/70 text-xs mt-1">근로자퇴직급여보장법 제8조 기준</p>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* 퇴직 예정일 선택 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">퇴직 예정일</label>
                                <input
                                    type="date"
                                    value={retirementDate}
                                    onChange={e => {
                                        setRetirementDate(e.target.value);
                                        setSeveranceResult(computeSeverancePay(severanceStaff, e.target.value));
                                    }}
                                    className="neo-input w-full py-2.5"
                                />
                            </div>

                            {/* 결과 */}
                            {severanceResult.eligible ? (
                                <>
                                    {/* 퇴직금 메인 */}
                                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5 text-center">
                                        <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">예상 퇴직금</p>
                                        <p className="text-3xl font-black text-orange-600">
                                            {severanceResult.severancePay.toLocaleString()}
                                            <span className="text-lg font-bold ml-1">원</span>
                                        </p>
                                    </div>

                                    {/* 계산 근거 */}
                                    <div className="space-y-2.5 bg-gray-50 rounded-2xl p-4">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">계산 근거</p>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">입사일</span>
                                            <span className="font-bold text-gray-900">{severanceStaff.startDate}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">재직일수</span>
                                            <span className="font-bold text-gray-900">{severanceResult.workingDays.toLocaleString()}일 ({severanceResult.workingYears.toFixed(2)}년)</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">최근 3개월 임금</span>
                                            <span className="font-bold text-gray-900">{severanceResult.last3MonthsWage.toLocaleString()}원</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">최근 3개월 일수</span>
                                            <span className="font-bold text-gray-900">{severanceResult.last3MonthsDays}일</span>
                                        </div>
                                        <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-1">
                                            <span className="text-gray-500">1일 평균임금</span>
                                            <span className="font-bold text-blue-600">{severanceResult.avgDailyWage.toLocaleString()}원</span>
                                        </div>
                                    </div>

                                    {/* 공식 */}
                                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                                        <p className="text-[10px] font-bold text-blue-400 tracking-wide">
                                            {severanceResult.avgDailyWage.toLocaleString()}원 × 30일 × ({severanceResult.workingDays}일 ÷ 365)
                                        </p>
                                        <p className="text-[10px] text-blue-300 mt-0.5">= {severanceResult.severancePay.toLocaleString()}원</p>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-3 py-6 text-center">
                                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                                        <AlertCircle className="w-7 h-7 text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-700">퇴직금 미발생</p>
                                        <p className="text-sm text-gray-400 mt-1">{severanceResult.ineligibleReason}</p>
                                        <p className="text-xs text-gray-300 mt-2">계속 근무 시 1년 달성 후 퇴직금 발생</p>
                                    </div>
                                </div>
                            )}

                            <p className="text-[9px] text-gray-300 text-center leading-relaxed">
                                ※ 본 계산은 참고용입니다. 실제 퇴직금은 근무 형태, 수당 구성 등에 따라 달라질 수 있으며 공인 노무사 확인을 권장합니다.
                            </p>

                            <button
                                onClick={() => setSeveranceStaff(null)}
                                className="neo-btn neo-btn-primary w-full py-3 font-bold"
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
