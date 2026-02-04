import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Users, Calendar, DollarSign, Settings, Home as HomeIcon, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Staff from './pages/Staff';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';
import SettingsPage from './pages/Settings';
import LoginPage from './pages/Login';
import { getUser, logout, User } from './lib/auth';
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
                    : "text-gray-400 hover:text-gray-600"
            )}
        >
            <Icon className={clsx("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
            {label}
        </Link>
    );
}

function App() {
    const [user, setUser] = useState<User | null>(getUser());

    if (!user) {
        return <LoginPage onLogin={() => setUser(getUser())} />;
    }

    return (
        <BrowserRouter>
            <div className="flex flex-col h-screen max-w-lg mx-auto bg-white overflow-hidden shadow-2xl">
                <main className="flex-1 overflow-y-auto bg-[#F9FAFB]">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/staff" element={<Staff />} />
                        <Route path="/attendance" element={<Attendance />} />
                        <Route path="/payroll" element={<Payroll />} />
                        <Route path="/settings" element={<SettingsPage onLogout={() => { logout(); setUser(null); }} />} />
                    </Routes>
                </main>

                <nav className="flex items-center justify-around bg-white border-t border-gray-100 px-2 py-1 pb-safe">
                    <NavItem to="/" icon={HomeIcon} label="홈" />
                    <NavItem to="/staff" icon={Users} label="직원" />
                    <NavItem to="/attendance" icon={Calendar} label="근태" />
                    <NavItem to="/payroll" icon={DollarSign} label="정산" />
                    <NavItem to="/settings" icon={Settings} label="설정" />
                </nav>
            </div>
        </BrowserRouter>
    );
}

export default App;
