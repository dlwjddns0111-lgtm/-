import { db } from './firebase';
import { ref, get, set, onValue, update } from 'firebase/database';
import { getUser } from './auth';

const STORAGE_KEYS = {
    STAFF: 'payroll_app_staff',
    ATTENDANCE: 'payroll_app_attendance',
    SETTINGS: 'payroll_app_settings',
    MEMO: 'payroll_app_memo',
};

// 1. Stable cross-device ID based on Email
const getEmailKey = () => {
    const user = getUser();
    if (!user || !user.email) return null;
    return user.email.replace(/[.#$[\]/]/g, '_').toLowerCase();
};

// 2. FORCE SYNC EVERYTHING
export const forceSyncAll = async () => {
    const key = getEmailKey();
    if (!key) {
        console.error('[FORCE_SYNC] ❌ No email key found - user not logged in?');
        return false;
    }

    try {
        console.log(`[FORCE_SYNC] 🔄 Starting sync for email: ${key}`);
        const userRef = ref(db, `users/${key}`);
        const snap = await get(userRef);

        const localDataExists = localStorage.getItem(STORAGE_KEYS.STAFF) ||
            localStorage.getItem(STORAGE_KEYS.ATTENDANCE) ||
            localStorage.getItem('storeName');

        if (snap.exists()) {
            const cloud = snap.val();
            console.log('[FORCE_SYNC] ✅ Found cloud data:', {
                hasStaff: !!cloud.staff,
                hasAttendance: !!cloud.attendance,
                hasSettings: !!cloud.settings,
                hasMemos: !!cloud.memos,
                storeName: cloud.storeName,
                staffCount: cloud.staff?.length || 0,
                attendanceCount: cloud.attendance?.length || 0
            });

            // Server always wins if it exists (Ensures cross-device consistency)
            if (cloud.staff) localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(cloud.staff));
            if (cloud.attendance) localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(cloud.attendance));
            if (cloud.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(cloud.settings));
            if (cloud.memos) localStorage.setItem(STORAGE_KEYS.MEMO, JSON.stringify(cloud.memos));
            if (cloud.storeName) localStorage.setItem('storeName', cloud.storeName);
            console.log('[FORCE_SYNC] ✅ Downloaded server data to local storage');
            return true;
        } else {
            console.log('[FORCE_SYNC] ⚠️ No cloud data found for this account');
            if (localDataExists) {
                // First time ever? Push local to server
                await syncToCloud();
                console.log('[FORCE_SYNC] 📤 Pushed local data to new cloud account');
                return false;
            } else {
                console.log('[FORCE_SYNC] ℹ️ No local data and no cloud data - fresh start');
            }
        }
    } catch (e) {
        console.error('[FORCE_SYNC] ❌ Error:', e);
        console.error('[FORCE_SYNC] Error details:', {
            message: (e as Error).message,
            name: (e as Error).name,
            stack: (e as Error).stack
        });
    }
    return false;
};

// 4. Background Sync (Always runs when data changes)
export const syncToCloud = async () => {
    const key = getEmailKey();
    if (!key) {
        console.warn('[SYNC_TO_CLOUD] No email key - skipping sync');
        return;
    }

    try {
        const data = {
            staff: JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF) || '[]'),
            attendance: JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]'),
            settings: JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}'),
            memos: JSON.parse(localStorage.getItem(STORAGE_KEYS.MEMO) || '[]'),
            storeName: localStorage.getItem('storeName') || '',
            lastUpdated: new Date().toISOString()
        };

        console.log('[SYNC_TO_CLOUD] 📤 Uploading data for:', key);
        await set(ref(db, `users/${key}`), data);
        console.log('[SYNC_TO_CLOUD] ✅ Upload successful');
    } catch (e) {
        console.error('[SYNC_TO_CLOUD] ❌ Failed:', e);
        console.error('[SYNC_TO_CLOUD] Error details:', {
            message: (e as Error).message,
            code: (e as any).code,
            name: (e as Error).name
        });
    }
};

// 5. Cloud Listener (The "Magic" part)
export const subscribeToCloud = (onChanged: (wasUpdated: boolean) => void) => {
    let unsubscribe: any = null;
    let lastKey: string | null = null;

    const run = () => {
        const key = getEmailKey();
        if (key && key !== lastKey) {
            if (unsubscribe) unsubscribe();
            lastKey = key;

            unsubscribe = onValue(ref(db, `users/${key}`), (snap) => {
                if (snap.exists()) {
                    const cloud = snap.val();
                    let changed = false;

                    const syncField = (storageKey: string, cloudValue: any) => {
                        const localValue = localStorage.getItem(storageKey);
                        const cloudStr = typeof cloudValue === 'string' 
                            ? cloudValue 
                            : JSON.stringify(cloudValue || []);
                        
                        if (localValue !== cloudStr) {
                            localStorage.setItem(storageKey, cloudStr);
                            changed = true;
                        }
                    };

                    syncField(STORAGE_KEYS.STAFF, cloud.staff);
                    syncField(STORAGE_KEYS.ATTENDANCE, cloud.attendance);
                    syncField(STORAGE_KEYS.SETTINGS, cloud.settings);
                    syncField(STORAGE_KEYS.MEMO, cloud.memos);
                    syncField('storeName', cloud.storeName);

                    if (changed) {
                        console.log('[AUTO_SYNC] Cloud data arrived, refreshing UI...');
                        onChanged(true);
                    }
                }
            });
        }
    };

    const interval = setInterval(run, 1000);
    run();

    return () => {
        clearInterval(interval);
        if (unsubscribe) unsubscribe();
    };
};

// Compatibility export
export const syncFromCloud = forceSyncAll;
