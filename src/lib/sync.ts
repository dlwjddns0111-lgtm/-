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

// 1. Stable cross-device key based on user.id
//    - Kakao:  user.id = "kakao:4734598135"  → "kakao_4734598135"
//    - Google: user.id = Firebase UID          → same UID (no special chars)
//    This guarantees the same account always maps to the same Firebase path
//    regardless of which device or whether email is provided.
const getFirebaseKey = () => {
    const user = getUser();
    if (!user || !user.id) return null;
    // Replace Firebase-illegal chars: . # $ [ ] / :
    return user.id.replace(/[.#$[\]/:]/g, '_').toLowerCase();
};

// 2. Upload local data → cloud
export const syncToCloud = async () => {
    const key = getFirebaseKey();
    if (!key) {
        console.warn('[SYNC_TO_CLOUD] No firebase key - skipping sync');
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

        console.log('[SYNC_TO_CLOUD] 📤 key:', key, '| staff:', data.staff.length, '| attendance:', data.attendance.length);
        await set(ref(db, `users/${key}`), data);
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now);
        console.log('[SYNC_TO_CLOUD] ✅ Upload successful');
    } catch (e) {
        console.error('[SYNC_TO_CLOUD] ❌ Failed:', e);
    }
};

// 3. Apply cloud data → local storage
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
    const key = getFirebaseKey();
    if (!key) {
        console.error('[FORCE_SYNC] ❌ No firebase key - user not logged in?');
        return false;
    }

    try {
        console.log(`[FORCE_SYNC] 🔄 Starting sync | key: ${key}`);
        const userRef = ref(db, `users/${key}`);
        const snap = await get(userRef);

        const localStaff = localStorage.getItem(STORAGE_KEYS.STAFF);
        const localAttendance = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
        const hasLocalData =
            (localStaff && JSON.parse(localStaff).length > 0) ||
            (localAttendance && JSON.parse(localAttendance).length > 0);

        if (snap.exists()) {
            const cloud = snap.val();
            const cloudTime = cloud.lastUpdated ? new Date(cloud.lastUpdated).getTime() : 0;
            const localTimeStr = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
            const localTime = localTimeStr ? new Date(localTimeStr).getTime() : 0;

            console.log('[FORCE_SYNC] ⏱ cloudTime:', cloud.lastUpdated, '| localTime:', localTimeStr);
            console.log('[FORCE_SYNC] cloud staff:', cloud.staff?.length || 0, '| cloud attendance:', cloud.attendance?.length || 0);

            if (cloudTime > localTime) {
                // Cloud is newer → download to local
                applyCloudToLocal(cloud);
                console.log('[FORCE_SYNC] ✅ Downloaded newer cloud data to local');
                return true;
            } else if (hasLocalData && localTime >= cloudTime) {
                // Local is newer (or same) → upload to cloud
                await syncToCloud();
                console.log('[FORCE_SYNC] 📤 Uploaded newer local data to cloud');
                return false;
            } else {
                // Cloud exists, local is empty → download
                applyCloudToLocal(cloud);
                console.log('[FORCE_SYNC] ✅ Downloaded cloud data (local was empty)');
                return true;
            }
        } else {
            console.log('[FORCE_SYNC] ⚠️ No cloud data for this account');
            if (hasLocalData) {
                await syncToCloud();
                console.log('[FORCE_SYNC] 📤 Pushed local data to new cloud account');
            } else {
                console.log('[FORCE_SYNC] ℹ️ Fresh start - no data anywhere');
            }
            return false;
        }
    } catch (e) {
        console.error('[FORCE_SYNC] ❌ Error:', e);
    }
    return false;
};

// 5. Real-time Cloud Listener: pushes changes from other devices to this device
export const subscribeToCloud = (onChanged: (wasUpdated: boolean) => void) => {
    let unsubscribe: any = null;
    let lastKey: string | null = null;
    let isFirstCall = true; // Skip the first onValue (initial state, already handled by forceSyncAll)

    const run = () => {
        const key = getFirebaseKey();
        if (key && key !== lastKey) {
            if (unsubscribe) unsubscribe();
            lastKey = key;
            isFirstCall = true;

            unsubscribe = onValue(ref(db, `users/${key}`), (snap) => {
                // Skip the first immediate fire
                if (isFirstCall) {
                    isFirstCall = false;
                    return;
                }

                if (snap.exists()) {
                    const cloud = snap.val();
                    let changed = false;

                    const syncField = (storageKey: string, cloudValue: any) => {
                        if (cloudValue === undefined || cloudValue === null) return;
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
                        console.log('[AUTO_SYNC] ✅ Change from another device received → refreshing UI');
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
