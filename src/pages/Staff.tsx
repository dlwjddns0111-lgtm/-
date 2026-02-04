import { useState, useEffect } from 'react';
import { getStaff, saveStaff, deleteStaff } from '../lib/storage';
import { Staff } from '../types';
import { Plus, Edit2, Trash2, User, X } from 'lucide-react';
import { clsx } from 'clsx';

export default function StaffPage() {
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentStaff, setCurrentStaff] = useState<Partial<Staff>>({});

    useEffect(() => {
        setStaffList(getStaff());
    }, []);

    const handleSave = () => {
        if (!currentStaff.name || !currentStaff.hourlyWage) return alert('필수 정보를 입력하세요.');

        const newStaff: Staff = {
            id: currentStaff.id || crypto.randomUUID(),
            shopId: 'default',
            name: currentStaff.name as string,
            phone: currentStaff.phone || '',
            role: 'staff',
            rank: currentStaff.rank || '알바',
            hourlyWage: Number(currentStaff.hourlyWage),
            payDay: 10,
            bankName: '',
            accountNumberMasked: '',
            startDate: new Date().toISOString().split('T')[0],
            isActive: true,
            applyWeeklyAllowance: true,
            ...currentStaff
        } as Staff;

        saveStaff(newStaff);
        setStaffList(getStaff());
        setIsEditing(false);
        setCurrentStaff({});
    };

    const handleDelete = (id: string) => {
        if (confirm('정말 삭제하시겠습니까?')) {
            deleteStaff(id);
            setStaffList(getStaff());
        }
    };

    return (
        <div className="min-h-full bg-[#F9FAFB] p-6 space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h1 className="text-xl font-bold text-gray-900">직원 목록</h1>
                <button
                    onClick={() => { setCurrentStaff({}); setIsEditing(true); }}
                    className="neo-btn neo-btn-primary py-2 px-4 text-sm"
                >
                    <Plus className="w-4 h-4" /> 직원 추가
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {staffList.map(staff => (
                    <div key={staff.id} className="neo-card bg-white p-6 flex flex-col justify-between border-none ring-1 ring-gray-100 shadow-sm hover:shadow-md transition-all">
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
                                        <h3 className="text-lg font-bold text-gray-900">{staff.name}</h3>
                                        <span className="neo-badge">
                                            {staff.rank}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 font-medium tracking-tight">
                                        ₩{staff.hourlyWage.toLocaleString()} / 시급
                                    </p>
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

                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                            <div className="flex items-center gap-2">
                                <div className={clsx(
                                    "w-1.5 h-1.5 rounded-full",
                                    staff.isActive ? "bg-green-500" : "bg-gray-300"
                                )} />
                                <span className="text-[11px] font-semibold text-gray-500">
                                    {staff.isActive ? '근무 중' : '퇴사'}
                                </span>
                            </div>
                            <span className="text-[11px] font-medium text-gray-400">
                                {staff.applyWeeklyAllowance ? '주휴수당 포함' : '주휴수당 미포함'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {isEditing && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="neo-card w-full max-w-sm bg-white p-8 border-none shadow-2xl">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-2xl font-bold text-gray-900">직원 정보</h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">이름</label>
                                <input
                                    className="neo-input w-full"
                                    placeholder="이름 입력"
                                    value={currentStaff.name || ''}
                                    onChange={e => setCurrentStaff({ ...currentStaff, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">시급</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">₩</span>
                                    <input
                                        className="neo-input w-full pl-10"
                                        placeholder="0"
                                        type="number"
                                        value={currentStaff.hourlyWage || ''}
                                        onChange={e => setCurrentStaff({ ...currentStaff, hourlyWage: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">직급</label>
                                <select
                                    className="neo-input w-full"
                                    value={currentStaff.rank || '알바'}
                                    onChange={e => setCurrentStaff({ ...currentStaff, rank: e.target.value })}
                                >
                                    <option value="점장">점장</option>
                                    <option value="매니저">매니저</option>
                                    <option value="직원">직원</option>
                                    <option value="알바">알바</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">직원 고유 색상</label>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#6B7280'].map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setCurrentStaff({ ...currentStaff, color: c })}
                                            className={clsx(
                                                "w-8 h-8 rounded-full border-2 transition-all",
                                                currentStaff.color === c ? "ring-2 ring-offset-2 ring-gray-900 border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"
                                            )}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-2 border-t border-gray-50 pt-6">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">주휴수당 적용</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={currentStaff.applyWeeklyAllowance ?? true}
                                        onChange={e => setCurrentStaff({ ...currentStaff, applyWeeklyAllowance: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3B82F6]"></div>
                                </label>
                            </div>

                            <button
                                onClick={handleSave}
                                className="neo-btn neo-btn-primary w-full py-4 text-lg font-bold mt-4 shadow-lg shadow-blue-500/20"
                            >
                                직원 정보 저장
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
