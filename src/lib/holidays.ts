import { format } from 'date-fns';

const FIXED_HOLIDAYS = [
    '01-01', // New Year
    '03-01', // Independence Movement Day
    '05-05', // Children's Day
    '06-06', // Memorial Day
    '08-15', // Liberation Day
    '10-03', // National Foundation Day
    '10-09', // Hangeul Day
    '12-25', // Christmas
];

// Specific Lunar holidays for 2024-2026 (requires manual maintenance or external API)
const DYNAMIC_HOLIDAYS_LIST = [
    // 2024
    '2024-02-09', '2024-02-10', '2024-02-11', '2024-02-12', // Seollal
    '2024-05-06', // Children's Day (Substitute)
    '2024-05-15', // Buddha's Birthday
    '2024-09-16', '2024-09-17', '2024-09-18', // Chuseok
    // 2025
    '2025-01-28', '2025-01-29', '2025-01-30', // Seollal
    '2025-03-03', // Independence Day (Substitute)
    '2025-05-05', // Children's Day / Buddha's Birthday
    '2025-05-06', // Substitute holiday
    '2025-10-05', '2025-10-06', '2025-10-07', '2025-10-08', // Chuseok / National Foundation Day / Hangeul Day complex
    // 2026
    '2026-02-16', '2026-02-17', '2026-02-18', // Seollal
    '2026-03-02', // Independence Day (Substitute)
    '2026-05-25', // Buddha's Birthday (Substitute)
    '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-28', // Chuseok
    '2026-10-05', // National Foundation Day (Substitute)
];

export function isKoreanHoliday(date: Date): boolean {
    const md = format(date, 'MM-dd');
    const full = format(date, 'yyyy-MM-dd');

    // Check fixed holidays
    if (FIXED_HOLIDAYS.includes(md)) return true;

    // Check dynamic holidays
    if (DYNAMIC_HOLIDAYS_LIST.includes(full)) return true;

    return false;
}

export function getHolidayName(date: Date): string | null {
    const md = format(date, 'MM-dd');
    const full = format(date, 'yyyy-MM-dd');

    const names: Record<string, string> = {
        '01-01': '신정',
        '03-01': '삼일절',
        '05-05': '어린이날',
        '06-06': '현충일',
        '08-15': '광복절',
        '10-03': '개천절',
        '10-09': '한글날',
        '12-25': '성탄절',
        '2024-02-09': '설날', '2024-02-10': '설날', '2024-02-11': '설날', '2024-02-12': '대체공휴일',
        '2024-05-06': '대체공휴일',
        '2024-05-15': '부처님오신날',
        '2024-09-16': '추석', '2024-09-17': '추석', '2024-09-18': '추석',
        '2025-01-28': '설날', '2025-01-29': '설날', '2025-01-30': '설날',
        '2025-03-03': '대체공휴일',
        '2025-05-05': '어린이날/석가탄신일',
        '2025-05-06': '대체공휴일',
        '2025-10-05': '추석', '2025-10-06': '추석', '2025-10-07': '추석', '2025-10-08': '대체공휴일',
        '2026-02-16': '설날', '2026-02-17': '설날', '2026-02-18': '설날',
        '2026-03-02': '대체공휴일',
        '2026-05-25': '대체공휴일',
        '2026-09-24': '추석', '2026-09-25': '추석', '2026-09-26': '추석', '2026-09-28': '대체공휴일',
        '2026-10-05': '대체공휴일',
    };

    return names[md] || names[full] || null;
}
