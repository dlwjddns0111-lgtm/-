import { db } from './firebase';
import { ref, get, set, onValue } from 'firebase/database';
import { getUser } from './auth';

const STORAGE_KEYS = {
    STAFF: 'payroll_app_staff',
    ATTENDANCE: 'payroll_app_attendance',
    SETTINGS: 'payroll_app_settings',
    MEMO: 'payroll_app_memo',
    LAST_SYNC: 'payroll_app_last_sync',
};

// 1. Stable cross-device ID based on Email
const getEmailKey = () => {
    const user = getUser();
    if (!user || !user.email) return null;
    return user.email.replace(/[.#$[\]/]/g, '_').toLowerCase();
};

// 2. Upload local data → cloud
export const syncToCloud = async () => {
    const key = getEmailKey();
    if (!key) {
        console.warn('[SYNC_TO_CLOUD] No email key - skipping sync');
        return;
    }

    try {
        const now = new Date().toISOString();
        const data = {
            staff: JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF) || '[]'),
            attendance: JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]'),
            settings: JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}'),
            memos: JSON.parse(localStorage.getItem(STORAGE_KEYS.MEMO) || '[]'),
            storeName: localStorage.getItem('storeName') || '',
            lastUpdated: now,
        };

        console.log('[SYNC_TO_CLOUD] 📤 Uploading data for:', key, '| staff:', data.staff.length, '| attendance:', data.attendance.length);
        await set(ref(db, `users/${key}`), data);
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now);
        console.log('[SYNC_TO_CLOUD] ✅ Upload successful');
    } catch (e) {
        console.error('[SYNC_TO_CLOUD] ❌ Failed:', e);
    }
};

// 3. Download cloud data → local
const applyCloudToLocal = (cloud: any) => {
    if (cloud.staff) localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(cloud.staff));
    if (cloud.attendance) localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(cloud.attendance));
    if (cloud.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(cloud.settings));
    if (cloud.memos) localStorage.setItem(STORAGE_KEYS.MEMO, JSON.stringify(cloud.memos));
    if (cloud.storeName) localStorage.setItem('storeName', cloud.storeName);
    if (cloud.lastUpdated) localStorage.setItem(STORAGE_KEYS.LAST_SYNC, cloud.lastUpdated);
};

// 4. FORCE SYNC: decides direction (upload or download) based on timestamps
export const forceSyncAll = async (): Promise<boolean> => {
    const key = getEmailKey();
    if (!key) {
        console.error('[FORCE_SYNC] ❌ No email key found - user not logged in?');
        return false;
    }

    try {
        console.log(`[FORCE_SYNC] 🔄 Starting sync for email: ${key}`);
        const userRef = ref(db, `users/${key}`);
        const snap = await get(userRef);

        const localStaff = localStorage.getItem(STORAGE_KEYS.STAFF);
        const localAttendance = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
        const hasLocalData = (localStaff && JSON.parse(localStaff).length > 0) ||
            (localAttendance && JSON.parse(localAttendance).length > 0);

        if (snap.exists()) {
            const cloud = snap.val();
            const cloudTime = cloud.lastUpdated ? new Date(cloud.lastUpdated).getTime() : 0;
            const localTimeStr = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
            const localTime = localTimeStr ? new Date(localTimeStr).getTime() : 0;

            console.log('[FORCE_SYNC] ⏱ cloudTime:', cloud.lastUpdated, '| localTime:', localTimeStr);
            console.log('[FORCE_SYNC] cloud staff:', cloud.staff?.length || 0, '| local staff:', localStaff ? JSON.parse(localStaff).length : 0);

            if (cloudTime > localTime) {
                // Cloud is newer → download
                applyCloudToLocal(cloud);
                console.log('[FORCE_SYNC] ✅ Downloaded newer cloud data to local');
                return true;
            } else if (hasLocalData && localTime >= cloudTime) {
                // Local is newer (or same) → upload
                await syncToCloud();
                console.log('[FORCE_SYNC] 📤 Uploaded newer local data to cloud');
                return false;
            } else {
                // Cloud data exists, local is empty → download
                applyCloudToLocal(cloud);
                console.log('[FORCE_SYNC] ✅ Downloaded cloud data (local was empty)');
                return true;
            }
        } else {
            // No cloud data at all
            console.log('[FORCE_SYNC] ⚠️ No cloud data found for this account');
            if (hasLocalData) {
                await syncToCloud();
                console.log('[FORCE_SYNC] 📤 Pushed local data to new cloud account');
            } else {
                console.log('[FORCE_SYNC] ℹ️ No local data and no cloud data - fresh start');
            }
            return false;
        }
    } catch (e) {
        console.error('[FORCE_SYNC] ❌ Error:', e);
    }
    return false;
};

// 5. Cloud Listener: real-time updates from other devices
export const subscribeToCloud = (onChanged: (wasUpdated: boolean) => void) => {
    let unsubscribe: any = null;
    let lastKey: string | null = null;
    let isFirstCall = true; // Skip the first onValue (it fires immediately on subscribe)

    const run = () => {
        const key = getEmailKey();
        if (key && key !== lastKey) {
            if (unsubscribe) unsubscribe();
            lastKey = key;
            isFirstCall = true;

            unsubscribe = onValue(ref(db, `users/${key}`), (snap) => {
                // Skip the very first call (it's just the initial state, handled by forceSyncAll)
                if (isFirstCall) {
                    isFirstCall = false;
                    return;
                }

                if (snap.exists()) {
                    const cloud = snap.val();
                    let changed = false;

                    const syncField = (storageKey: string, cloudValue: any) => {
                        if (!cloudValue) return;
                        const localValue = localStorage.getItem(storageKey);
                        const cloudStr = typeof cloudValue === 'string'
                            ? cloudValue
                            : JSON.stringify(cloudValue);

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
                        console.log('[AUTO_SYNC] ✅ Cloud data arrived from another device, refreshing UI...');
                        if (cloud.lastUpdated) localStorage.setItem(STORAGE_KEYS.LAST_SYNC, cloud.lastUpdated);
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
