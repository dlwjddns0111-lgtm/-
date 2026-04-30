import { useState, useEffect, useRef } from 'react';
import { Staff, Attendance, OwnerMemo } from '../types';
import { getStaff, getAttendance, saveAttendance, deleteAttendance, getMemos, saveMemo, deleteMemo } from '../lib/storage';
import { syncToCloud } from '../lib/sync';
import { Clock, Plus, Copy, ChevronLeft, ChevronRight, Trash2, Edit2, Calendar, StickyNote, ArrowLeft, ArrowRight, X, Wallet } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, addDays, subDays, parseISO, isToday } from 'date-fns';
import { clsx } from 'clsx';
import { computePayrollItem } from '../lib/payroll';
import { isKoreanHoliday, getHolidayName } from '../lib/holidays';

export default function AttendancePage() {
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [memos, setMemos] = useState<OwnerMemo[]>([]);

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [currentRecord, setCurrentRecord] = useState<Partial<Attendance>>({});

    const [isMemoEditing, setIsMemoEditing] = useState(false);
    const [currentMemo, setCurrentMemo] = useState<Partial<OwnerMemo>>({});

    // Schedule Detail Modal State
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [selectedScheduleDate, setSelectedScheduleDate] = useState<Date | null>(null);

    // Add Selection Modal State
    const [showAddSelectionModal, setShowAddSelectionModal] = useState(false);
    const [selectedAddDate, setSelectedAddDate] = useState<Date | null>(null);

    useEffect(() => {
        setAttendance(getAttendance());
        setStaffList(getStaff());
        setMemos(getMemos());
    }, []);

    const handleSave = () => {
        if (!currentRecord.staffId || !currentRecord.date) return;

        const record: Attendance = {
            id: currentRecord.id || crypto.randomUUID(),
            shopId: 'default',
            staffId: currentRecord.staffId,
            date: currentRecord.date,
            clockIn: currentRecord.clockIn || '09:00',
            clockOut: currentRecord.clockOut || '18:00',
            breakMinutes: 0,
            tags: [],
            ...currentRecord
        } as Attendance;

        saveAttendance(record);
        setAttendance(getAttendance());
        syncToCloud(); // Sync to cloud
        setIsEditing(false);
        setCurrentRecord({});
    };

    const getStaffName = (id: string) => staffList.find(s => s.id === id)?.name || '(삭제된 직원)';

    const calculateHours = (clockIn: string, clockOut: string) => {
        const [inH, inM] = clockIn.split(':').map(Number);
        const [outH, outM] = clockOut.split(':').map(Number);
        let totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
        if (totalMinutes < 0) totalMinutes += 24 * 60;
        const hours = totalMinutes / 60;
        return Number(hours.toFixed(1)).toString();
    };

    // Calendar Logic
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart); // Default starts on Sunday
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

    // Filter records for selected date
    const selectedDateRecords = attendance.filter(r => isSameDay(new Date(r.date), selectedDate));
    const selectedDateMemos = memos.filter(m => isSameDay(new Date(m.date), selectedDate));

    const handleSaveMemo = () => {
        if (!currentMemo.content || !currentMemo.date) return;

        const record: OwnerMemo = {
            id: currentMemo.id || crypto.randomUUID(),
            date: currentMemo.date,
            content: currentMemo.content,
            type: currentMemo.type || 'memo',
            createdAt: currentMemo.createdAt || new Date().toISOString()
        } as OwnerMemo;

        saveMemo(record);
        setMemos(getMemos());
        syncToCloud(); // Sync to cloud
        setIsMemoEditing(false);
        setCurrentMemo({});
    };

    const handleCopyFromPreviousDay = (targetDate: Date) => {
        const prevDateStr = format(subDays(targetDate, 1), 'yyyy-MM-dd');
        handleDragCopy(prevDateStr, format(targetDate, 'yyyy-MM-dd'));
    };

    const handleDragCopy = (sourceDateStr: string, targetDateStr: string) => {
        if (sourceDateStr === targetDateStr) return;

        // 1. Attendance 복사
        const sourceRecords = attendance.filter(r => r.date === sourceDateStr);
        const targetExistingStaff = attendance.filter(r => r.date === targetDateStr).map(r => r.staffId);
        
        let copiedCount = 0;
        sourceRecords.forEach(r => {
            if (!targetExistingStaff.includes(r.staffId)) {
                saveAttendance({
                    ...r,
                    id: crypto.randomUUID(),
                    date: targetDateStr
                });
                copiedCount++;
            }
        });

        // 2. Memo 복사는 제외 (사용자 요청: 메모는 같이 복사가 안되게)
        /*
        const sourceMemos = memos.filter(m => m.date === sourceDateStr);
        sourceMemos.forEach(m => {
            saveMemo({
                ...m,
                id: crypto.randomUUID(),
                date: targetDateStr
            });
            copiedCount++;
        });
        */

        if (copiedCount > 0) {
            setAttendance(getAttendance());
            setMemos(getMemos());
            syncToCloud();
        }
    };

    // Drag and Drop States
    const [draggedDate, setDraggedDate] = useState<string | null>(null);

    const onDragStart = (e: React.DragEvent, dateStr: string) => {
        setDraggedDate(dateStr);
        e.dataTransfer.setData('sourceDate', dateStr);
        e.dataTransfer.effectAllowed = 'copy';
        
        // Visual feedback
        const target = e.currentTarget as HTMLElement;
        target.classList.add('opacity-50');
    };

    const onDragEnd = (e: React.DragEvent) => {
        const target = e.currentTarget as HTMLElement;
        target.classList.remove('opacity-50');
        setDraggedDate(null);
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const onDrop = (e: React.DragEvent, targetDateStr: string) => {
        e.preventDefault();
        const sourceDate = e.dataTransfer.getData('sourceDate');
        if (sourceDate && sourceDate !== targetDateStr) {
            handleDragCopy(sourceDate, targetDateStr);
        }
    };

    // Double Click to Copy Implementation
    const [copySourceDate, setCopySourceDate] = useState<string | null>(null);
    const [lastClickTime, setLastClickTime] = useState<number>(0);

    const handleDateClick = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const now = Date.now();
        
        // 1. Paste Logic (If source is already selected)
        if (copySourceDate) {
            if (copySourceDate !== dateStr) {
                handleDragCopy(copySourceDate, dateStr);
                if (window.navigator.vibrate) window.navigator.vibrate(50);
            }
            setCopySourceDate(null);
            return;
        }

        // 2. Double Click Detection
        if (now - lastClickTime < 300) {
            setCopySourceDate(dateStr);
            if (window.navigator.vibrate) window.navigator.vibrate([50, 30, 50]);
            setLastClickTime(0); // Reset
            return;
        }

        // 3. Normal Click
        setLastClickTime(now);
        setSelectedDate(date);
    };

    return (
        <div className="flex flex-col h-full bg-[#F9FAFB] dark:bg-gray-950 overflow-hidden transition-colors">
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm z-20 transition-colors">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100" translate="no">근태기록</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="w-9 h-9 rounded-lg border border-gray-100 dark:border-gray-700 flex items-center justify-center bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="px-4 py-1.5 font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-sm">
                        {format(currentMonth, 'yyyy.MM')}
                    </div>
                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="w-9 h-9 rounded-lg border border-gray-100 dark:border-gray-700 flex items-center justify-center bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-6 space-y-8 relative">
                {copySourceDate && (
                    <div className="fixed bottom-20 left-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-300 ring-4 ring-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                                <Copy className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">{format(new Date(copySourceDate), 'M월 d일')} 복사 중</p>
                                <p className="text-[11px] opacity-90">대상 날짜를 한 번 더 눌러주세요</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setCopySourceDate(null)}
                            className="bg-white text-blue-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-blue-50 transition-colors"
                        >
                            취소
                        </button>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-700">
                            <Calendar className="w-5 h-5 text-blue-500" /> 월간 근무 현황
                        </h3>
                    </div>
                    <div className="bg-gray-100 grid grid-cols-7 gap-px rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                        {weekDays.map((day, i) => (
                            <div key={day} className={clsx(
                                "py-3 text-center text-[11px] font-bold uppercase",
                                i === 0 ? "bg-[#FDF2F8] text-[#EC4899]" : i === 6 ? "bg-[#EFF6FF] text-[#3B82F6]" : "bg-white text-gray-400"
                            )}>
                                {day}
                            </div>
                        ))}
                        {calendarDays.map((day, idx) => {
                            const isSelected = isSameDay(day, selectedDate);
                            const isCurrentMonth = isSameMonth(day, monthStart);
                            const dayRecords = attendance.filter(r => isSameDay(new Date(r.date), day));
                            const dayMemos = memos.filter(m => isSameDay(new Date(m.date), day));

                            return (
                                <div
                                    key={day.toISOString()}
                                    role="button"
                                    draggable
                                    data-date={format(day, 'yyyy-MM-dd')}
                                    onDragStart={(e) => onDragStart(e, format(day, 'yyyy-MM-dd'))}
                                    onDragEnd={onDragEnd}
                                    onDragOver={onDragOver}
                                    onDrop={(e) => onDrop(e, format(day, 'yyyy-MM-dd'))}
                                    onClick={() => handleDateClick(day)}
                                    className={clsx(
                                        "min-h-[80px] p-2 flex flex-col items-start justify-start relative transition-all text-left group cursor-pointer select-none",
                                        isSelected ? "bg-[#3B82F6]/5 ring-2 ring-inset ring-[#3B82F6] z-10" : "bg-white hover:bg-gray-50",
                                        !isCurrentMonth && "opacity-30",
                                        copySourceDate === format(day, 'yyyy-MM-dd') && "ring-4 ring-inset ring-blue-400 bg-blue-50/50 animate-pulse z-20"
                                    )}
                                >
                                    <div className="flex flex-col w-full mb-1">
                                        <div className="flex items-center gap-1">
                                            <span className={clsx(
                                                "text-[11px] font-bold px-1.5 py-0.5 rounded-md transition-colors",
                                                isToday(day) ? "bg-[#3B82F6] text-white" :
                                                    (isKoreanHoliday(day) || getDay(day) === 0) ? "text-red-500" :
                                                        isSelected ? "text-[#3B82F6]" : "text-gray-900"
                                            )}>
                                                {format(day, 'd')}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedAddDate(day);
                                                    setShowAddSelectionModal(true);
                                                }}
                                                className="w-4 h-4 flex items-center justify-center text-gray-300 hover:text-blue-500 transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                        {isKoreanHoliday(day) && (
                                            <span className="text-[10px] font-bold text-red-500 text-left mt-0.5 w-full truncate pl-1">
                                                {getHolidayName(day)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="w-full space-y-1 overflow-hidden">
                                        {dayRecords.slice(0, 3).map((r) => {
                                            const staff = staffList.find(s => s.id === r.staffId);
                                            let durationText = '';
                                            if (r.clockIn && r.clockOut) {
                                                const [startH, startM] = r.clockIn.split(':').map(Number);
                                                const [endH, endM] = r.clockOut.split(':').map(Number);
                                                let diffMin = (endH * 60 + endM) - (startH * 60 + startM);
                                                if (diffMin < 0) diffMin += 24 * 60;
                                                const hours = diffMin / 60;
                                                durationText = `${Number(hours.toFixed(1))}시간`;
                                            }
                                            return (
                                                <div key={r.id} className="w-full flex flex-col bg-white border border-gray-200 rounded p-[2px] hover:border-blue-400 hover:shadow-lg transition-all select-none">
                                                    <div className="flex items-center gap-[2px] w-full pointer-events-none overflow-hidden">
                                                        <div className="w-[3px] h-2.5 rounded-full shrink-0" style={{ backgroundColor: staff?.color || '#3B82F6' }} />
                                                        <span className="text-[8px] font-bold text-gray-900 tracking-tighter whitespace-nowrap leading-none">
                                                            {staff?.name || '(삭제된 직원)'}
                                                        </span>
                                                    </div>
                                                    <div className="pl-[5px] w-full mt-[1px]">
                                                        <span className="text-[7px] font-medium text-blue-600 whitespace-nowrap tracking-tighter leading-none block">
                                                            {durationText}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {dayRecords.length > 3 && (
                                            <div className="text-[9px] font-bold text-gray-300 text-center pt-1">
                                                +{dayRecords.length - 3} more
                                            </div>
                                        )}
                                    </div>

                                    {dayMemos.length > 0 && (
                                        <div
                                            className="mt-auto pt-2 w-full flex flex-wrap gap-1 cursor-pointer group/schedule"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedScheduleDate(day);
                                                setShowScheduleModal(true);
                                            }}
                                        >
                                            {dayMemos.map((memo, mi) => (
                                                <div key={mi} className="w-1.5 h-1.5 rounded-full shrink-0 bg-lime-500 group-hover/schedule:bg-lime-600 group-hover/schedule:scale-125 transition-all" />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 px-1">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-gray-900" translate="no">사장님 메모</h2>
                            <button
                                onClick={() => {
                                    setCurrentMemo({ date: format(selectedDate, 'yyyy-MM-dd'), type: 'memo' });
                                    setIsMemoEditing(true);
                                }}
                                className="neo-btn bg-white text-[9px] h-7 px-2 border-gray-100"
                            >
                                <Plus className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 overflow-y-auto">
                            {selectedDateMemos.length === 0 ? (
                                <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl font-medium text-gray-300 text-center text-sm">
                                    등록된 스케줄이 없습니다
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedDateMemos.map(memo => (
                                        <div key={memo.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-all hover:ring-1 hover:ring-blue-100">
                                            <div className="flex items-start sm:items-center gap-4">
                                                <div className={clsx("w-2.5 h-2.5 rounded-full shrink-0 mt-1 sm:mt-0", memo.type === 'schedule' ? "bg-red-500" : "bg-lime-500")} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-gray-900">{memo.type === 'schedule' ? '일정' : '메모'}</p>
                                                    <p className="text-[12px] font-medium text-gray-600 mt-1 whitespace-pre-wrap leading-relaxed break-words">{memo.content}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 justify-end shrink-0">
                                                <button onClick={() => { setCurrentMemo(memo); setIsMemoEditing(true); }} className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-50 text-gray-400 hover:text-blue-500 hover:bg-white border border-transparent hover:border-blue-100 transition-all">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => { if (confirm('삭제할까요?')) { deleteMemo(memo.id); setMemos(getMemos()); syncToCloud(); } }} className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-white border border-transparent hover:border-red-100 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between flex-nowrap gap-1">
                            <h2 className="text-[11px] font-bold text-gray-900 whitespace-nowrap">{format(selectedDate, 'M월 d일')}</h2>
                            <div className="flex gap-1 shrink-0">
                                <button
                                    onClick={() => {
                                        setCurrentRecord({ date: format(selectedDate, 'yyyy-MM-dd'), clockIn: '09:00', clockOut: '18:00', breakMinutes: 0 } as Attendance);
                                        setIsEditing(true);
                                    }}
                                    className="neo-btn neo-btn-primary h-7 w-7 p-0 rounded-lg shadow-blue-500/10"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 overflow-y-auto">
                            {selectedDateRecords.length === 0 ? (
                                <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl font-medium text-gray-300 text-center text-sm">기록 정보가 없습니다</div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedDateRecords.map(record => (
                                        <div key={record.id} className="bg-white p-2.5 sm:p-3 rounded-2xl border border-gray-100 shadow-sm transition-all hover:ring-1 hover:ring-blue-100 relative">
                                            <div className="flex gap-2">
                                                {/* Color Dot */}
                                                <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: staffList.find(s => s.id === record.staffId)?.color || '#3B82F6' }} />
                                                
                                                <div className="flex-1 min-w-0 pr-11 sm:pr-16">
                                                    {/* Name: Responsive font size */}
                                                    <h4 className="text-[12px] sm:text-[14px] font-bold text-gray-900 leading-tight mb-1 sm:mb-1.5 truncate">
                                                        {getStaffName(record.staffId)}
                                                    </h4>

                                                    {/* Time and Duration Row */}
                                                    <div className="flex flex-col gap-1 sm:gap-1.5">
                                                        <span className="text-[9px] sm:text-[10px] font-medium text-gray-400 whitespace-nowrap">{record.clockIn} - {record.clockOut}</span>
                                                        <div className="flex">
                                                            <span className="text-[9px] sm:text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold whitespace-nowrap">
                                                                {calculateHours(record.clockIn, record.clockOut)}시간
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Buttons: Tiny on mobile, normal on web, absolute corner */}
                                                <div className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 flex gap-1">
                                                    <button onClick={() => { setCurrentRecord(record); setIsEditing(true); }} className="w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-blue-500 bg-blue-50 hover:bg-blue-100 transition-all border border-blue-100">
                                                        <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                    </button>
                                                    <button onClick={() => { if (confirm('삭제할까요?')) { deleteAttendance(record.id); setAttendance(getAttendance()); syncToCloud(); } }} className="w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-md flex items-center justify-center text-red-500 bg-red-50 hover:bg-red-100 transition-all border border-red-100">
                                                        <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Attendance Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm p-8 rounded-2xl shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold text-gray-900">근무 기록</h3>
                            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">날짜</label>
                                <input type="date" value={currentRecord.date || ''} onChange={e => setCurrentRecord({ ...currentRecord, date: e.target.value })} className="neo-input w-full" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">직원</label>
                                <select value={currentRecord.staffId || ''} onChange={e => setCurrentRecord({ ...currentRecord, staffId: e.target.value })} className="neo-input w-full" required>
                                    <option value="">직원 선택</option>
                                    {staffList.filter(s => s.isActive !== false).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">출근</label>
                                    <div className="flex items-center gap-1">
                                        <select 
                                            value={(currentRecord.clockIn || '09:00').split(':')[0]} 
                                            onChange={e => {
                                                const m = (currentRecord.clockIn || '09:00').split(':')[1];
                                                setCurrentRecord({ ...currentRecord, clockIn: `${e.target.value}:${m}` });
                                            }}
                                            className="neo-input flex-1 px-2 text-center text-sm appearance-none"
                                        >
                                            {Array.from({ length: 24 }).map((_, i) => {
                                                const val = i.toString().padStart(2, '0');
                                                return <option key={val} value={val}>{val}시</option>;
                                            })}
                                        </select>
                                        <span className="text-gray-300 font-bold">:</span>
                                        <select 
                                            value={(currentRecord.clockIn || '09:00').split(':')[1]} 
                                            onChange={e => {
                                                const h = (currentRecord.clockIn || '09:00').split(':')[0];
                                                setCurrentRecord({ ...currentRecord, clockIn: `${h}:${e.target.value}` });
                                            }}
                                            className="neo-input flex-1 px-2 text-center text-sm appearance-none"
                                        >
                                            {['00', '10', '20', '30', '40', '50'].map(val => (
                                                <option key={val} value={val}>{val}분</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">퇴근</label>
                                    <div className="flex items-center gap-1">
                                        <select 
                                            value={(currentRecord.clockOut || '18:00').split(':')[0]} 
                                            onChange={e => {
                                                const m = (currentRecord.clockOut || '18:00').split(':')[1];
                                                setCurrentRecord({ ...currentRecord, clockOut: `${e.target.value}:${m}` });
                                            }}
                                            className="neo-input flex-1 px-2 text-center text-sm appearance-none"
                                        >
                                            {Array.from({ length: 24 }).map((_, i) => {
                                                const val = i.toString().padStart(2, '0');
                                                return <option key={val} value={val}>{val}시</option>;
                                            })}
                                        </select>
                                        <span className="text-gray-300 font-bold">:</span>
                                        <select 
                                            value={(currentRecord.clockOut || '18:00').split(':')[1]} 
                                            onChange={e => {
                                                const h = (currentRecord.clockOut || '18:00').split(':')[0];
                                                setCurrentRecord({ ...currentRecord, clockOut: `${h}:${e.target.value}` });
                                            }}
                                            className="neo-input flex-1 px-2 text-center text-sm appearance-none"
                                        >
                                            {['00', '10', '20', '30', '40', '50'].map(val => (
                                                <option key={val} value={val}>{val}분</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <button type="submit" className="neo-btn neo-btn-primary w-full py-4 text-lg font-bold mt-6 shadow-lg shadow-blue-500/20">기록 저장</button>
                        </form>
                    </div>
                </div>
            )}

            {isMemoEditing && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm p-8 rounded-2xl shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold text-gray-900">메모 작성</h3>
                            <button onClick={() => setIsMemoEditing(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); handleSaveMemo(); }} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">날짜</label>
                                <input type="date" value={currentMemo.date || ''} onChange={e => setCurrentMemo({ ...currentMemo, date: e.target.value })} className="neo-input w-full" required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">구분</label>
                                <div className="flex gap-2 p-1 bg-gray-50 rounded-xl">
                                    {['schedule', 'memo'].map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setCurrentMemo({ ...currentMemo, type: t as any })}
                                            className={clsx("flex-1 py-2 rounded-lg font-bold text-xs uppercase transition-all", currentMemo.type === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600")}
                                        >
                                            {t === 'schedule' ? '일정' : '메모'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">내용</label>
                                <textarea
                                    value={currentMemo.content || ''}
                                    onChange={e => setCurrentMemo({ ...currentMemo, content: e.target.value })}
                                    className="neo-input w-full h-32 resize-none leading-relaxed"
                                    placeholder="내용을 입력하세요..."
                                    required
                                />
                            </div>
                            <button type="submit" className="neo-btn neo-btn-primary w-full py-4 text-lg font-bold mt-6 shadow-lg shadow-blue-500/20">메모 저장</button>
                        </form>
                    </div>
                </div>
            )}

            {showScheduleModal && selectedScheduleDate && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">스케줄 상세</h3>
                                <p className="text-sm text-gray-400 mt-1">{format(selectedScheduleDate, 'yyyy년 M월 d일')}</p>
                            </div>
                            <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {memos.filter(m => isSameDay(new Date(m.date), selectedScheduleDate)).map(memo => (
                                <div key={memo.id} className="bg-gradient-to-br from-white to-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className={clsx("w-2 h-2 rounded-full shrink-0 mt-1.5", memo.type === 'schedule' ? "bg-red-400" : "bg-green-400")} />
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{memo.type === 'schedule' ? '일정' : '메모'}</p>
                                            <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap leading-relaxed">{memo.content}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setShowScheduleModal(false)} className="neo-btn bg-gray-100 text-gray-700 hover:bg-gray-200 w-full py-3 text-sm font-bold mt-6">닫기</button>
                    </div>
                </div>
            )}

            {showAddSelectionModal && selectedAddDate && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm p-6 rounded-2xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900">{format(selectedAddDate, 'M월 d일')} 추가</h3>
                            <p className="text-sm text-gray-400 mt-1">어떤 항목을 추가하시겠습니까?</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => {
                                    setCurrentRecord({ date: format(selectedAddDate, 'yyyy-MM-dd'), clockIn: '09:00', clockOut: '18:00', breakMinutes: 0 } as Attendance);
                                    setIsEditing(true);
                                    setShowAddSelectionModal(false);
                                }}
                                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-blue-100 bg-blue-50/50 hover:bg-blue-100 hover:border-blue-300 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-white group-hover:text-blue-600 transition-colors text-blue-500">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-gray-700 group-hover:text-blue-700">근태기록</span>
                            </button>
                            <button
                                onClick={() => {
                                    setCurrentMemo({ date: format(selectedAddDate, 'yyyy-MM-dd'), type: 'memo' });
                                    setIsMemoEditing(true);
                                    setShowAddSelectionModal(false);
                                }}
                                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-green-100 bg-green-50/50 hover:bg-green-100 hover:border-green-300 transition-all group"
                            >
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-white group-hover:text-green-600 transition-colors text-green-500">
                                    <StickyNote className="w-5 h-5" />
                                </div>
                                <span className="font-bold text-gray-700 group-hover:text-green-700">사장님 메모</span>
                            </button>
                        </div>
                        <button onClick={() => setShowAddSelectionModal(false)} className="w-full mt-4 py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">취소</button>
                    </div>
                </div>
            )}
        </div>
    );
}
