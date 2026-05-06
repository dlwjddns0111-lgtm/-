import { useState, useEffect, useRef } from 'react';
import { getStaff, getAttendance, getSettings } from '../lib/storage';
import { computePayrollItem, computeSeverancePay, SeveranceResult } from '../lib/payroll';
import { Staff, Attendance, PayrollItem, Deduction } from '../types';
import { DollarSign, X, FileText, Trash2, Calculator, AlertCircle, ChevronRight, User } from 'lucide-react';
import { syncToCloud } from '../lib/sync';
import { format } from 'date-fns';
import { toBlob } from 'html-to-image';

export default function PayrollPage() {
    const [tab, setTab] = useState<'payroll' | 'severance'>('payroll');
    const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);
    const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [selectedItem, setSelectedItem] = useState<PayrollItem | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    // 퇴직금 상태
    const [severanceStaff, setSeveranceStaff] = useState<Staff | null>(null);
    const [retirementDate, setRetirementDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [severanceResult, setSeveranceResult] = useState<SeveranceResult | null>(null);
    const slipRef = useRef<HTMLDivElement>(null);

    const fallbackDownload = (blob: Blob, fileName: string) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = url;
        link.click();
        alert('이미지가 저장되었습니다. 카카오톡 PC버전 등에서 파일을 직접 전송해 주세요.');
    };

    const handleShareAsImage = async (item: PayrollItem) => {
        if (!slipRef.current) return;
        
        setIsCapturing(true);
        // 잠깐의 딜레이를 주어 버튼 등이 사라진 UI가 반영될 시간을 줌
        await new Promise(r => setTimeout(r, 150));

        try {
            const blob = await toBlob(slipRef.current, {
                cacheBust: true,
                backgroundColor: '#ffffff',
                pixelRatio: 3, // 고해상도 출력
            });

            if (!blob) throw new Error('이미지 생성 실패');

            const fileName = `급여명세서_${item.staffName}_${month}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });

            // 카카오 SDK 우선 실행 (PC/모바일 공통)
            if (window.Kakao && window.Kakao.isInitialized()) {
                try {
                    const response = await window.Kakao.Share.uploadImage({ file: [file] });
                    const imageUrl = response.infos.original.url;
                    
                    window.Kakao.Share.sendDefault({
                        objectType: 'feed',
                        content: {
                            title: `${item.staffName}님 급여명세서`,
                            description: `${month} 급여 정산 내역입니다.`,
                            imageUrl: imageUrl,
                            link: { mobileWebUrl: window.location.origin, webUrl: window.location.origin },
                        },
                        buttons: [{
                            title: '앱 열기',
                            link: { mobileWebUrl: window.location.origin, webUrl: window.location.origin },
                        }],
                    });
                } catch (kakaoErr) {
                    console.error('Kakao Share Error:', kakaoErr);
                    // 카카오 실패 시에만 네이티브 공유 시도
                    if (navigator.share) {
                        await navigator.share({ files: [file], title: item.staffName, text: month });
                    } else {
                        fallbackDownload(blob, fileName);
                    }
                }
            } else {
                // 카카오 SDK 로드 전인 경우 네이티브 공유 시도
                if (navigator.share) {
                    await navigator.share({ files: [file], title: item.staffName, text: month });
                } else {
                    fallbackDownload(blob, fileName);
                }
            }
        } catch (err) {
            console.error('Share Error:', err);
            alert('이미지 생성 또는 공유 중 오류가 발생했습니다.');
        } finally {
            setIsCapturing(false);
        }
    };

    const calculate = () => {
        const staff = getStaff();
        const attendance = getAttendance();
        const settings = getSettings();
        const [year, m] = month.split('-').map(Number);

        const filteredAttendance = attendance.filter(r => {
            const d = new Date(r.date);
            return d.getFullYear() === year && d.getMonth() + 1 === m;
        });

        const staffIdsWithRecords = Array.from(new Set(filteredAttendance.map(r => r.staffId)));

        const relevantStaffIds = Array.from(new Set([
            ...staffIdsWithRecords,
            ...staff.filter(s => s.isActive !== false).map(s => s.id)
        ]));

        const items = relevantStaffIds.map(id => {
            let s = staff.find(st => st.id === id);

            if (!s) {
                s = {
                    id: id,
                    name: '(삭제된 직원)',
                    hourlyWage: 0,
                    isActive: false,
                    shopId: 'default',
                    phone: '',
                    role: 'staff',
                    rank: '알바',
                    payDay: 10,
                    bankName: '',
                    accountNumberMasked: '',
                    startDate: '',
                    applyWeeklyAllowance: false,
                    applyNightAllowance: false
                } as Staff;
            }

            const staffRecords = filteredAttendance.filter(r => r.staffId === id);
            const item = computePayrollItem(s, staffRecords, settings, []);

            return item;
        });

        setPayrollItems(items);
    };

    useEffect(() => {
        setStaffList(getStaff().filter(s => s.isActive !== false));
        calculate();
    }, [month]);

    const handleDeletePayroll = (staffId: string, staffName: string) => {
        if (confirm(`${staffName}의 ${month} 급여/근태 내역을 모두 삭제하시겠습니까? (복구할 수 없습니다)`)) {
            const attendance = getAttendance();
            const [year, m] = month.split('-').map(Number);

            const recordsToDelete = attendance.filter(r => {
                if (r.staffId !== staffId) return false;
                const d = new Date(r.date);
                return d.getFullYear() === year && d.getMonth() + 1 === m;
            });

            const remainingList = attendance.filter(r => !recordsToDelete.includes(r));
            localStorage.setItem('payroll_app_attendance', JSON.stringify(remainingList));

            syncToCloud();
            calculate();
        }
    };

    return (
        <div className="min-h-full bg-[#F9FAFB] dark:bg-gray-950 p-6 space-y-6 transition-colors">
            {/* 헤더 + 탭 */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
                <div className="flex justify-between items-center p-4 pb-0 gap-3">
                    <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">정산 관리</h1>
                    {tab === 'payroll' && (
                        <input
                            type="month"
                            value={month}
                            onChange={e => setMonth(e.target.value)}
                            className="neo-input py-1.5 px-2 text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-700"
                        />
                    )}
                </div>
                {/* 탭 버튼 */}
                <div className="flex gap-1 p-3">
                    <button
                        onClick={() => setTab('payroll')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                            tab === 'payroll'
                                ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/20'
                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                        }`}
                    >
                        <DollarSign className="w-4 h-4" /> 월급 명세
                    </button>
                    <button
                        onClick={() => setTab('severance')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                            tab === 'severance'
                                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                        }`}
                    >
                        <Calculator className="w-4 h-4" /> 퇴직금
                    </button>
                </div>
            </div>

            {/* 급여 탭 */}
            {tab === 'payroll' && (
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
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-gray-900 text-sm truncate">{item.staffName}</h3>
                                                <p className="text-[10px] text-gray-400 whitespace-nowrap">총 {Math.round((item.baseMinutes + item.overtimeMinutes) / 60)}시간</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-right shrink-0">
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-900 whitespace-nowrap">{item.netPay.toLocaleString()}원</p>
                                                <p className="text-[9px] text-gray-400">실지급액</p>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeletePayroll(item.staffId, item.staffName); }}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 text-gray-400 hover:text-white hover:bg-red-500 transition-colors border border-gray-100"
                                                title="이번 달 내역 삭제"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2 bg-gray-50 p-4 rounded-xl">
                                        <div className="flex justify-between text-[11px] font-medium text-gray-500">
                                            <span>기본급</span>
                                            <span className="text-gray-900 font-bold">{item.basePay.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] font-bold text-red-400 pt-2 border-t border-gray-200 mt-1">
                                            <span>공제 항목</span>
                                            <span>-{item.totalDeduction.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={() => setSelectedItem(item)}
                                            className="w-full py-2.5 bg-white border border-gray-100 rounded-xl text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center gap-2"
                                        >
                                            <FileText className="w-3.5 h-3.5" /> 상세 명세
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 gap-3 mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
                            <div className="neo-card bg-white p-4 text-center">
                                <p className="text-[10px] font-bold text-gray-400 mb-1">총 급여</p>
                                <p className="text-lg font-bold text-gray-900">
                                    {payrollItems.reduce((acc, curr) => acc + curr.netPay + curr.totalDeduction, 0).toLocaleString()}원
                                </p>
                            </div>
                            <div className="neo-card p-4 text-center bg-blue-50/50">
                                <p className="text-[10px] font-bold text-blue-400 mb-1">실지급</p>
                                <p className="text-lg font-bold text-blue-600">
                                    {payrollItems.reduce((acc, curr) => acc + curr.netPay, 0).toLocaleString()}원
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>
            )}

            {/* 퇴직금 탭 */}
            {tab === 'severance' && (
            <div className="space-y-4">
                {staffList.length === 0 ? (
                    <div className="p-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 text-center">
                        <Calculator className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <p className="text-gray-400 font-medium">등록된 직원이 없습니다</p>
                    </div>
                ) : (
                    <>
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                            <p className="text-xs font-bold text-amber-700">퇴직금 계산 기준</p>
                            <p className="text-[11px] text-amber-600 mt-1">• 1년 이상 근무 + 주 15시간 이상 시 지급 의무</p>
                            <p className="text-[11px] text-amber-600">• 퇴직금 = 평균임금 × 30일 × (재직일수 ÷ 365)</p>
                            <p className="text-[11px] text-amber-600">• 평균임금 = 최근 3개월 임금 합계 ÷ 해당 일수</p>
                        </div>
                        {staffList.map(staff => {
                            const sv = computeSeverancePay(staff);
                            return (
                                <div key={staff.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: staff.color || '#3B82F6' }}>
                                                {staff.name[0]}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{staff.name}</p>
                                                <p className="text-[10px] text-gray-400">
                                                    {staff.startDate ? `입사: ${staff.startDate}` : <span className="text-red-400">입사일 미입력</span>}
                                                </p>
                                            </div>
                                        </div>
                                        {sv.eligible ? (
                                            <div className="text-right">
                                                <p className="text-xs text-orange-500 font-bold">지급 대상</p>
                                                <p className="text-lg font-black text-orange-600">{sv.severancePay.toLocaleString()}<span className="text-sm">원</span></p>
                                            </div>
                                        ) : sv.workingDays > 0 ? (
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400 font-bold">미발생</p>
                                                <p className="text-sm font-bold text-gray-400">{365 - sv.workingDays}일 남음</p>
                                            </div>
                                        ) : (
                                            <div className="text-right">
                                                <p className="text-xs text-red-400 font-bold">입사일 없음</p>
                                            </div>
                                        )}
                                    </div>
                                    {sv.eligible && (
                                        <div className="border-t border-gray-50 bg-gray-50 px-4 py-3 grid grid-cols-3 gap-2">
                                            <div className="text-center">
                                                <p className="text-[9px] text-gray-400 font-bold">재직일수</p>
                                                <p className="text-xs font-black text-gray-700">{sv.workingDays}일</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] text-gray-400 font-bold">평균임금(1일)</p>
                                                <p className="text-xs font-black text-gray-700">{sv.avgDailyWage.toLocaleString()}원</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] text-gray-400 font-bold">3개월 임금합계</p>
                                                <p className="text-xs font-black text-gray-700">{sv.last3MonthsWage.toLocaleString()}원</p>
                                            </div>
                                        </div>
                                    )}
                                    {!sv.eligible && sv.workingDays > 0 && (
                                        <div className="border-t border-gray-50 bg-gray-50 px-4 py-2">
                                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                <div className="bg-orange-400 h-1.5 rounded-full transition-all" style={{ width: `${Math.min((sv.workingDays / 365) * 100, 100)}%` }} />
                                            </div>
                                            <p className="text-[9px] text-gray-400 text-center mt-1">{sv.workingDays}일 / 365일 ({Math.floor((sv.workingDays / 365) * 100)}%)</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
            )}
            {/* Payslip Modal */}
            {selectedItem && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div ref={slipRef} className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="bg-[#F5F3FF] p-8 relative border-b border-purple-50">
                            {!isCapturing && (
                                <button
                                    onClick={() => setSelectedItem(null)}
                                    className="absolute top-6 right-6 w-8 h-8 rounded-full flex items-center justify-center bg-white text-gray-400 hover:text-gray-600 shadow-sm border border-purple-100"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6] mb-1">{month} 급여 명세서</p>
                            <h2 className="text-3xl font-bold text-gray-900">{selectedItem.staffName}</h2>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">총 근무 시간</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        {Math.round((selectedItem.baseMinutes + selectedItem.overtimeMinutes) / 60)}시간
                                    </p>
                                </div>
                                <div className="bg-[#EFF6FF] p-4 rounded-2xl border border-blue-50">
                                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">실지급액</p>
                                    <p className="text-xl font-bold text-blue-600">
                                        {selectedItem.netPay.toLocaleString()}<span className="text-xs font-medium ml-1">원</span>
                                    </p>
                                </div>
                            </div>

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
                                        {selectedItem.nightShiftPay > 0 && (
                                            <div className="flex justify-between text-sm font-medium">
                                                <span className="text-gray-500">야간수당</span>
                                                <span className="text-indigo-500 font-bold">+{selectedItem.nightShiftPay.toLocaleString()}원</span>
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

                            {!isCapturing && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleShareAsImage(selectedItem)}
                                        className="neo-btn bg-[#FEE500] flex-[1.2] py-4 text-sm font-black text-black border-[1.5px] border-black flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                                    >
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                            <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.558 1.707 4.8 4.33 6.091l-.828 3.082c-.049.18.156.328.303.226l3.59-2.433c.516.033 1.039.049 1.605.049 4.97 0 9-3.185 9-7.115S16.97 3 12 3z"/>
                                        </svg>
                                        <span className="whitespace-nowrap">카톡 전송</span>
                                    </button>
                                    <button
                                        onClick={() => setSelectedItem(null)}
                                        className="neo-btn neo-btn-primary flex-1 py-4 text-base font-bold shadow-lg shadow-blue-500/10"
                                    >
                                        확인
                                    </button>
                                </div>
                            )}
                        </div>
                        {isCapturing && (
                            <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
                                <p className="text-[8px] text-gray-400 font-medium tracking-widest">본 명세서는 [사장님(인건비계산기)]를 통해 생성되었습니다</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
