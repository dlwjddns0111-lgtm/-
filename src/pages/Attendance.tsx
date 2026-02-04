import { useState, useEffect } from 'react';
import { Staff, Attendance, OwnerMemo } from '../types';
import { getStaff, getAttendance, saveAttendance, deleteAttendance, getMemos, saveMemo, deleteMemo } from '../lib/storage';
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
        setIsEditing(false);
        setCurrentRecord({});
    };

    const getStaffName = (id: string) => staffList.find(s => s.id === id)?.name || 'Unknown';

    const calculateHours = (clockIn: string, clockOut: string) => {
        const [inH, inM] = clockIn.split(':').map(Number);
        const [outH, outM] = clockOut.split(':').map(Number);
        const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
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
        setIsMemoEditing(false);
        setCurrentMemo({});
    };

    const handleCopyFromPreviousDay = (targetDate: Date) => {
        const prevDateStr = format(subDays(targetDate, 1), 'yyyy-MM-dd');
        const targetDateStr = format(targetDate, 'yyyy-MM-dd');

        const prevRecords = attendance.filter(r => r.date === prevDateStr);
        if (prevRecords.length === 0) {
            alert('이전 날짜에 복사할 기록이 없습니다.');
            return;
        }

        const newRecords = prevRecords.map(r => ({
            ...r,
            id: crypto.randomUUID(),
            date: targetDateStr
        }));

        const existingStaffOnDay = attendance.filter(r => r.date === targetDateStr).map(r => r.staffId);
        const filteredNewRecords = newRecords.filter(r => !existingStaffOnDay.includes(r.staffId));

        filteredNewRecords.forEach(r => saveAttendance(r));
        setAttendance(getAttendance());
        setSelectedDate(targetDate);
    };

    return (
        <div className="flex flex-col h-full bg-[#F9FAFB] overflow-hidden">
            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b border-gray-100 bg-white shadow-sm z-20">
                <h1 className="text-xl font-bold text-gray-900">근태 관리</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="w-9 h-9 rounded-lg border border-gray-100 flex items-center justify-center bg-white text-gray-500 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="px-4 py-1.5 font-bold text-gray-900 bg-white border border-gray-100 rounded-lg shadow-sm">
                        {format(currentMonth, 'yyyy.MM')}
                    </div>
                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="w-9 h-9 rounded-lg border border-gray-100 flex items-center justify-center bg-white text-gray-500 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-6 space-y-8">
                {/* 2. Calendar Grid */}
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
                                <button
                                    key={day.toISOString()}
                                    onClick={() => setSelectedDate(day)}
                                    className={clsx(
                                        "min-h-[120px] p-2 flex flex-col items-start justify-start relative transition-all text-left group",
                                        isSelected ? "bg-[#3B82F6]/5 ring-2 ring-inset ring-[#3B82F6] z-10" : "bg-white hover:bg-gray-50",
                                        !isCurrentMonth && "opacity-30"
                                    )}
                                >
                                    <div className="flex items-center justify-between w-full mb-2">
                                        <span className={clsx(
                                            "text-[11px] font-bold px-1.5 py-0.5 rounded-md transition-colors",
                                            isToday(day) ? "bg-[#3B82F6] text-white" :
                                                (isKoreanHoliday(day) || getDay(day) === 0) ? "text-red-500" :
                                                    isSelected ? "text-[#3B82F6]" : "text-gray-900"
                                        )}>
                                            {format(day, 'd')}
                                        </span>
                                        {isKoreanHoliday(day) && (
                                            <span className="text-[8px] font-bold text-red-400 truncate max-w-[40px]">
                                                {getHolidayName(day)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="w-full space-y-1 overflow-hidden">
                                        {dayRecords.slice(0, 3).map((r, i) => {
                                            const staff = staffList.find(s => s.id === r.staffId);

                                            // Simple duration calculation
                                            let durationText = '';
                                            if (r.clockIn && r.clockOut) {
                                                const [startH, startM] = r.clockIn.split(':').map(Number);
                                                const [endH, endM] = r.clockOut.split(':').map(Number);
                                                let diffMin = (endH * 60 + endM) - (startH * 60 + startM);
                                                if (diffMin < 0) diffMin += 24 * 60; // Overnight
                                                const hours = diffMin / 60;
                                                durationText = `${Number(hours.toFixed(1))}시간`;
                                            }

                                            return (
                                                <div
                                                    key={i}
                                                    className="flex flex-col bg-white border border-gray-100 rounded py-0.5 px-1 shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-1 h-2.5 rounded-full shrink-0" style={{ backgroundColor: staff?.color || '#3B82F6' }} />
                                                        <span className="text-[9px] font-bold text-gray-800 whitespace-nowrap overflow-hidden">
                                                            {staff?.name}
                                                        </span>
                                                    </div>
                                                    <div className="pl-2 -mt-0.5">
                                                        <span className="text-[7.5px] font-medium text-blue-500 tabular-nums leading-none">
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
                                                <div
                                                    key={mi}
                                                    className="w-1.5 h-1.5 rounded-full shrink-0 bg-red-400 group-hover/schedule:bg-red-500 group-hover/schedule:scale-125 transition-all"
                                                />
                                            ))}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Daily Detail (Selected Date) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Records Column */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between flex-nowrap gap-2">
                            <h2 className="text-base font-bold text-gray-900 whitespace-nowrap">
                                {format(selectedDate, 'M월 d일')} 기록
                            </h2>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => handleCopyFromPreviousDay(selectedDate)}
                                    className="neo-btn bg-white text-[10px] h-8 px-2.5 border-gray-100 whitespace-nowrap"
                                >
                                    <Copy className="w-3 h-3" /> 전날 복사
                                </button>
                                <button
                                    onClick={() => {
                                        setCurrentRecord({
                                            date: format(selectedDate, 'yyyy-MM-dd'),
                                            clockIn: '09:00',
                                            clockOut: '18:00',
                                            breakMinutes: 0
                                        } as Attendance);
                                        setIsEditing(true);
                                    }}
                                    className="neo-btn neo-btn-primary h-8 w-8 p-0 rounded-lg shadow-blue-500/10"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {selectedDateRecords.length === 0 ? (
                                <div className="p-10 bg-white border-2 border-dashed border-gray-100 rounded-2xl text-center text-gray-300 font-medium text-sm">
                                    기록 정보가 없습니다
                                </div>
                            ) : (
                                selectedDateRecords.map(record => (
                                    <div key={record.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between group transition-all hover:ring-1 hover:ring-blue-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: staffList.find(s => s.id === record.staffId)?.color || '#3B82F6' }} />
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{getStaffName(record.staffId)}</p>
                                                <div className="flex items-center gap-2 mt-1 flex-nowrap">
                                                    <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">{record.clockIn} - {record.clockOut}</span>
                                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                                                        {calculateHours(record.clockIn, record.clockOut)}시간
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => { setCurrentRecord(record); setIsEditing(true); }}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 text-gray-400 hover:text-blue-500 hover:bg-white border border-transparent hover:border-blue-100"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => { if (confirm('삭제할까요?')) { deleteAttendance(record.id); setAttendance(getAttendance()); } }}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-white border border-transparent hover:border-red-100"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Owner's Schedule Column */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900">
                                사장님 스케줄
                            </h2>
                            <button
                                onClick={() => {
                                    setCurrentMemo({ date: format(selectedDate, 'yyyy-MM-dd'), type: 'memo' });
                                    setIsMemoEditing(true);
                                }}
                                className="neo-btn bg-white text-[11px] h-9 px-3 border-gray-100"
                            >
                                <Plus className="w-3.5 h-3.5" /> 스케줄 추가
                            </button>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            {selectedDateMemos.length === 0 ? (
                                <div className="py-10 border-2 border-dashed border-gray-100 rounded-xl font-medium text-gray-300 text-center text-sm">
                                    등록된 스케줄이 없습니다
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedDateMemos.map(memo => (
                                        <div key={memo.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between group transition-all hover:ring-1 hover:ring-blue-100">
                                            <div className="flex items-center gap-4">
                                                <div className={clsx(
                                                    "w-2 h-2 rounded-full shrink-0",
                                                    memo.type === 'schedule' ? "bg-red-400" : "bg-green-400"
                                                )} />
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{memo.type === 'schedule' ? '일정' : '메모'}</p>
                                                    <p className="text-[11px] font-medium text-gray-400 mt-1 whitespace-pre-wrap leading-relaxed">{memo.content}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button
                                                    onClick={() => { setCurrentMemo(memo); setIsMemoEditing(true); }}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 text-gray-400 hover:text-blue-500 hover:bg-white border border-transparent hover:border-blue-100"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => { if (confirm('삭제할까요?')) { deleteMemo(memo.id); setMemos(getMemos()); } }}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-white border border-transparent hover:border-red-100"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
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
                                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">출근</label>
                                    <input type="time" value={currentRecord.clockIn || ''} onChange={e => setCurrentRecord({ ...currentRecord, clockIn: e.target.value })} className="neo-input w-full" required />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">퇴근</label>
                                    <input type="time" value={currentRecord.clockOut || ''} onChange={e => setCurrentRecord({ ...currentRecord, clockOut: e.target.value })} className="neo-input w-full" required />
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
                                            className={clsx(
                                                "flex-1 py-2 rounded-lg font-bold text-xs uppercase transition-all",
                                                currentMemo.type === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                            )}
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

            {/* Schedule Detail Modal */}
            {showScheduleModal && selectedScheduleDate && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">스케줄 상세</h3>
                                <p className="text-sm text-gray-400 mt-1">{format(selectedScheduleDate, 'yyyy년 M월 d일')}</p>
                            </div>
                            <button
                                onClick={() => setShowScheduleModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {memos
                                .filter(m => isSameDay(new Date(m.date), selectedScheduleDate))
                                .map(memo => (
                                    <div
                                        key={memo.id}
                                        className="bg-gradient-to-br from-white to-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={clsx(
                                                "w-2 h-2 rounded-full shrink-0 mt-1.5",
                                                memo.type === 'schedule' ? "bg-red-400" : "bg-green-400"
                                            )} />
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                                    {memo.type === 'schedule' ? '일정' : '메모'}
                                                </p>
                                                <p className="text-sm font-medium text-gray-900 whitespace-pre-wrap leading-relaxed">
                                                    {memo.content}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>

                        <button
                            onClick={() => setShowScheduleModal(false)}
                            className="neo-btn bg-gray-100 text-gray-700 hover:bg-gray-200 w-full py-3 text-sm font-bold mt-6"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
