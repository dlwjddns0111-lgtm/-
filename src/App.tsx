import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Users, Calendar, DollarSign, Settings, Home as HomeIcon, LogOut, Cloud } from 'lucide-react';
import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Staff from './pages/Staff';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';
import SettingsPage from './pages/Settings';
import LoginPage from './pages/Login';
import { getUser, logout, User } from './lib/auth';
import { syncFromCloud, subscribeToCloud } from './lib/sync';
import { useTheme } from './lib/theme';
import { useLanguage, getTranslations } from './lib/language';
import { clsx } from 'clsx';

function NavItem({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
    const location = useLocation();
    const isActive = location.pathname === to;
    return (
        <Link
            to={to}
            className={clsx(
                "flex flex-col items-center justify-center w-full py-2 text-[11px] font-medium transition-all gap-1",
                isActive
                    ? "text-[#3B82F6]"
                    : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            )}
        >
            <Icon className={clsx("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
            {label}
        </Link>
    );
}

function App() {
    useTheme(); // Initialize theme
    const { language } = useLanguage();
    const t = getTranslations(language);
    
    const [user, setUser] = useState<User | null>(getUser());
    const [refreshKey, setRefreshKey] = useState(0); // Used to force reload components after sync

    useEffect(() => {
        if (user) {
            // 1. Initial sync
            syncFromCloud().then((updated) => {
                if (updated) setRefreshKey(k => k + 1);
            });

            // 2. Continuous real-time sync
            const unsubscribe = subscribeToCloud((wasUpdated) => {
                if (wasUpdated) {
                    setRefreshKey(prev => prev + 1);
                }
            });

            return () => unsubscribe();
        }
    }, [user]);

    // 서비스 워커 강제 해제 (캐시 문제 해결을 위해 보이지 않게 작동)
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (let registration of registrations) {
                    registration.unregister().then(() => {
                        if ('caches' in window) {
                            caches.keys().then(names => {
                                for (let name of names) caches.delete(name);
                            });
                        }
                    });
                }
            });
        }
    }, []);

    if (!user) {
        return <LoginPage onLogin={() => setUser(getUser())} />;
    }

    return (
        <BrowserRouter key={refreshKey}>
            <div className="flex flex-col h-[100dvh] max-w-lg mx-auto bg-white dark:bg-gray-900 overflow-hidden shadow-2xl relative text-gray-900 dark:text-gray-100 transition-colors">

                <main className="flex-1 overflow-y-auto bg-[#F9FAFB] dark:bg-gray-950 pb-20">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/staff" element={<Staff />} />
                        <Route path="/attendance" element={<Attendance />} />
                        <Route path="/payroll" element={<Payroll />} />
                        <Route path="/settings" element={<SettingsPage onLogout={() => { logout(); setUser(null); }} />} />
                    </Routes>
                </main>

                <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg flex items-center justify-around bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 px-2 py-1 pb-safe transition-colors z-50">
                    <NavItem to="/" icon={HomeIcon} label={t.navHome} />
                    <NavItem to="/staff" icon={Users} label={t.navStaff} />
                    <NavItem to="/attendance" icon={Calendar} label={t.navAttendance} />
                    <NavItem to="/payroll" icon={DollarSign} label={t.navPayroll} />
                    <NavItem to="/settings" icon={Settings} label={t.navSettings} />

                </nav>
            </div>
        </BrowserRouter>
    );
}

export default App;
