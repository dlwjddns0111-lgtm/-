// src/lib/storage.ts
// LocalStorage adapter to simulate Firestore for the MVP
import { Staff, Attendance, Settings, PayrollItem, OwnerMemo } from '../types';

const STORAGE_KEYS = {
    STAFF: 'payroll_app_staff',
    ATTENDANCE: 'payroll_app_attendance',
    SETTINGS: 'payroll_app_settings',
    MEMO: 'payroll_app_memo',
};

export const getStaff = (): Staff[] => {
    const data = localStorage.getItem(STORAGE_KEYS.STAFF);
    return data ? JSON.parse(data) : [];
};

export const saveStaff = (staff: Staff) => {
    const list = getStaff();
    const index = list.findIndex(s => s.id === staff.id);
    if (index >= 0) list[index] = staff;
    else list.push(staff);
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(list));
};

export const deleteStaff = (id: string) => {
    const list = getStaff().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(list));
};

export const getAttendance = (): Attendance[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    return data ? JSON.parse(data) : [];
};

export const saveAttendance = (record: Attendance) => {
    const list = getAttendance();
    const index = list.findIndex(r => r.id === record.id);
    if (index >= 0) list[index] = record;
    else list.push(record);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(list));
};

export const deleteAttendance = (id: string) => {
    const list = getAttendance().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(list));
};

export const getSettings = (): Settings => {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : {
        shopId: 'default',
        shopName: '우리매장',
        overtimeThresholdDaily: 8,
        overtimeThresholdWeekly: 40,
        nightShiftStart: '22:00',
        nightShiftEnd: '06:00',
        weeklyAllowanceEnabled: true,
    };
};

export const saveSettings = (settings: Settings) => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

export const getMemos = (): OwnerMemo[] => {
    const data = localStorage.getItem(STORAGE_KEYS.MEMO);
    return data ? JSON.parse(data) : [];
};

export const saveMemo = (memo: OwnerMemo) => {
    const list = getMemos();
    const index = list.findIndex(m => m.id === memo.id);
    if (index >= 0) list[index] = memo;
    else list.push(memo);
    localStorage.setItem(STORAGE_KEYS.MEMO, JSON.stringify(list));
};

export const deleteMemo = (id: string) => {
    const list = getMemos().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MEMO, JSON.stringify(list));
};

// Seed initial data
export const seedData = () => {
    if (getStaff().length === 0) {
        const dummyStaff: Staff[] = [
            {
                id: 's1', shopId: 'default', name: '김알바', phone: '010-1234-5678', role: 'staff', rank: '알바',
                hourlyWage: 9860, payDay: 10, bankName: '국민', accountNumberMasked: '123***',
                startDate: '2024-01-01', isActive: true, applyWeeklyAllowance: true,
            },
            {
                id: 's2', shopId: 'default', name: '이매니저', phone: '010-9876-5432', role: 'manager', rank: '매니저',
                hourlyWage: 13000, payDay: 10, bankName: '신한', accountNumberMasked: '456***',
                startDate: '2024-01-01', isActive: true, applyWeeklyAllowance: true,
            }
        ];
        localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(dummyStaff));

        // Create some attendance for this month
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');

        const dummyAttendance: Attendance[] = [
            // Normal
            { id: 'a1', shopId: 'default', staffId: 's1', date: `${yyyy}-${mm}-01`, clockIn: '09:00', clockOut: '18:00', breakMinutes: 60, tags: [] },
            // Night shift
            { id: 'a2', shopId: 'default', staffId: 's1', date: `${yyyy}-${mm}-02`, clockIn: '18:00', clockOut: '23:00', breakMinutes: 0, tags: ['night'] },
            // Overtime
            { id: 'a3', shopId: 'default', staffId: 's2', date: `${yyyy}-${mm}-01`, clockIn: '09:00', clockOut: '20:00', breakMinutes: 60, tags: ['overtime'] },
        ];
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(dummyAttendance));
    }
};
