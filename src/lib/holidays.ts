import { format } from 'date-fns';

const FIXED_HOLIDAYS = [
    '01-01', // 신정
    '03-01', // 삼일절
    '05-01', // 근로자의 날 (법정휴일)
    '05-05', // 어린이날
    '06-06', // 현충일
    '08-15', // 광복절
    '10-03', // 개천절
    '10-09', // 한글날
    '12-25', // 성탄절
];

// Specific Lunar holidays and substitute holidays (2024-2027+)
// Automatically maintained list for premium reliability
const DYNAMIC_HOLIDAYS_LIST = [
    // 2024
    '2024-02-09', '2024-02-10', '2024-02-11', '2024-02-12', 
    '2024-05-06', '2024-05-15', '2024-09-16', '2024-09-17', '2024-09-18',
    // 2025
    '2025-01-28', '2025-01-29', '2025-01-30', '2025-03-03', 
    '2025-05-05', '2025-05-06', '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08',
    // 2026
    '2026-02-16', '2026-02-17', '2026-02-18', '2026-03-02', 
    '2026-05-25', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-28', '2026-10-05',
    // 2027
    '2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09',
    '2027-05-13', '2027-05-14', '2027-09-14', '2027-09-15', '2027-09-16', '2027-10-11'
];

export function isKoreanHoliday(date: Date): boolean {
    const md = format(date, 'MM-dd');
    const full = format(date, 'yyyy-MM-dd');

    if (FIXED_HOLIDAYS.includes(md)) return true;
    if (DYNAMIC_HOLIDAYS_LIST.includes(full)) return true;
    return false;
}

export function getHolidayName(date: Date): string | null {
    const md = format(date, 'MM-dd');
    const full = format(date, 'yyyy-MM-dd');

    const names: Record<string, string> = {
        '01-01': '신정',
        '03-01': '삼일절',
        '05-01': '근로자의 날',
        '05-05': '어린이날',
        '06-06': '현충일',
        '08-15': '광복절',
        '10-03': '개천절',
        '10-09': '한글날',
        '12-25': '성탄절',
        // 2024
        '2024-02-12': '설날 대체휴무', '2024-05-06': '어린이날 대체휴무', '2024-05-15': '부처님오신날',
        // 2025
        '2025-03-03': '삼일절 대체휴무', '2025-05-06': '대체공휴일', '2025-10-08': '대체공휴일',
        // 2026
        '2026-03-02': '삼일절 대체휴무', '2026-05-25': '부처님오신날 대체휴무', '2026-10-05': '대체공휴일',
        // 2027
        '2027-02-09': '설날 대체휴무', '2027-05-14': '부처님오신날', '2027-10-11': '한글날 대체휴무'
    };

    if (names[md]) return names[md];
    if (names[full]) return names[full];

    // Generic name for lunar holidays if specific name not mapped
    if (DYNAMIC_HOLIDAYS_LIST.includes(full)) {
        if (full.includes('-01-') || full.includes('-02-')) return '설날 연휴';
        if (full.includes('-09-') || full.includes('-10-')) return '추석 연휴';
        return '공휴일';
    }

    return null;
}
