
import React from 'react';
import { 
    HomeIcon, 
    SettingsIcon, 
    FundsIcon, 
    CalendarIcon, 
    UsersIcon, 
    ChatIcon, 
    UserCircleIcon,
    ShieldCheckIcon,
    MonitorIcon,
    SparklesIcon,
    AttendanceIcon
} from './Icons';
import type { Profile } from '../types';

type View = 'homepage' | 'calendar' | 'settings' | 'profile' | 'funds' | 'attendance' | 'mayor' | 'monitor' | 'notifications' | 'friends' | 'chats' | 'ai-assistant';

interface SidebarProps {
    activeView: View;
    setActiveView: (view: View) => void;
    profile: Profile | null;
    hideMobileNav?: boolean;
    unreadChatCount: number;
}

const DesktopNavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    badge?: number;
    colorClass?: string;
}> = ({ icon, label, isActive, onClick, badge, colorClass = "text-gray-400 group-hover:text-white" }) => {
    const activeClasses = 'bg-gray-800 text-white shadow-sm border-l-4 border-blue-500';
    const inactiveClasses = 'text-gray-300 hover:bg-gray-800/50 hover:text-white border-l-4 border-transparent';

    return (
        <li>
            <button
                onClick={onClick}
                className={`group flex items-center w-full px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive ? activeClasses : inactiveClasses} relative`}
            >
                <span className={`transition-colors duration-200 ${isActive ? 'text-blue-400' : colorClass}`}>
                    {icon}
                </span>
                <span className="ml-3 tracking-wide">{label}</span>
                {badge && badge > 0 ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                        {badge > 9 ? '9+' : badge}
                    </span>
                ) : null}
            </button>
        </li>
    );
};

const MobileNavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    badge?: number;
}> = ({ icon, label, isActive, onClick, badge }) => {
    return (
        <li className="flex-1 h-full flex items-center justify-center">
            <button
                onClick={onClick}
                className={`
                    relative flex flex-col items-center justify-center w-full h-full
                    transition-all duration-300 group
                `}
                style={{ WebkitTapHighlightColor: 'transparent' }}
            >
                {/* Active Background Glow Pill */}
                <div className={`
                    absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                    w-12 h-12 rounded-2xl transition-all duration-500 ease-out
                    ${isActive 
                        ? 'bg-blue-500/10 dark:bg-blue-400/20 scale-100 opacity-100' 
                        : 'scale-50 opacity-0'}
                `}></div>

                {/* Icon Container */}
                <div className={`
                    relative z-10 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                    ${isActive 
                        ? 'text-blue-600 dark:text-blue-400 -translate-y-2 scale-110' 
                        : 'text-gray-500 dark:text-gray-400 scale-100'}
                `}>
                    {/* Render icon and ensure it has consistent sizing */}
                    <div className="h-6 w-6 flex items-center justify-center">
                        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { className: 'h-6 w-6' }) : icon}
                    </div>
                    
                    {/* Notification Badge */}
                    {badge && badge > 0 ? (
                        <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full border-[1.5px] border-white dark:border-gray-900 shadow-sm animate-pulse px-0.5">
                            {badge > 9 ? '9+' : badge}
                        </span>
                    ) : null}
                </div>
                
                {/* Label - fades in and moves up when active */}
                <span className={`
                    text-[10px] font-bold tracking-wide transition-all duration-300 absolute bottom-2.5
                    ${isActive 
                        ? 'text-blue-600 dark:text-blue-400 opacity-100 translate-y-0 scale-100' 
                        : 'text-gray-400 opacity-0 translate-y-2 scale-75'}
                `}>
                    {label}
                </span>

                {/* Active Indicator Dot (Dock Style) */}
                <div className={`
                    absolute bottom-1 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400
                    transition-all duration-300 delay-100
                    ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
                `}></div>
            </button>
        </li>
    );
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, profile, hideMobileNav = false, unreadChatCount }) => {
    const iconClass = "h-5 w-5";

    // Navigation Configurations
    const mainNavItems = [
        { view: 'homepage', label: 'Dashboard', icon: <HomeIcon className={iconClass} /> },
        { view: 'chats', label: 'Messages', icon: <ChatIcon className={iconClass} />, badge: unreadChatCount },
        { view: 'friends', label: 'Community', icon: <UsersIcon className={iconClass} /> },
        { view: 'calendar', label: 'Calendar', icon: <CalendarIcon className={iconClass} /> },
        { view: 'funds', label: 'My Funds', icon: <FundsIcon className={iconClass} /> },
        { view: 'attendance', label: 'Attendance', icon: <AttendanceIcon className={iconClass} /> },
        { view: 'ai-assistant', label: 'AI Assistant', icon: <SparklesIcon className={iconClass} />, colorClass: 'text-purple-400 group-hover:text-purple-300' },
    ];

    const systemNavItems = [
        { view: 'settings', label: 'Settings', icon: <SettingsIcon className={iconClass} /> },
    ];

    // Mobile specific (limited space)
    // Using slightly larger icons for the mobile dock effect via MobileNavItem cloneElement
    const mobileNavItems: { view: string; label: string; icon: React.ReactNode; badge?: number }[] = [
        { view: 'homepage', label: 'Home', icon: <HomeIcon /> },
        { view: 'calendar', label: 'Calendar', icon: <CalendarIcon /> },
        { view: 'funds', label: 'Funds', icon: <FundsIcon /> },
        { view: 'attendance', label: 'Attend', icon: <AttendanceIcon /> },
    ];

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="w-64 bg-gray-900 text-gray-300 flex-col hidden md:flex h-full border-r border-gray-800 shadow-xl z-20">
                {/* Brand Header */}
                <div className="h-16 flex items-center px-6 border-b border-gray-800 bg-gray-900 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <span className="font-bold text-white text-lg">B</span>
                        </div>
                        <h1 className="text-lg font-bold text-white tracking-wide">BseePortal</h1>
                    </div>
                </div>

                {/* Scrollable Nav Area */}
                <div className="flex-1 overflow-y-auto py-6 custom-scrollbar flex flex-col gap-6">
                    {/* Main Navigation */}
                    <nav className="space-y-1">
                        <div className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Menu
                        </div>
                        <ul className="space-y-1">
                            {mainNavItems.map(item => (
                                <DesktopNavItem
                                    key={item.view}
                                    icon={item.icon}
                                    label={item.label}
                                    isActive={activeView === item.view}
                                    onClick={() => setActiveView(item.view as View)}
                                    badge={item.badge}
                                    colorClass={item.colorClass}
                                />
                            ))}
                        </ul>
                    </nav>

                    {/* Admin Section (Conditional) */}
                    {(profile?.role === 'mayor' || profile?.role === 'monitor') && (
                        <nav className="space-y-1">
                            <div className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Administration
                            </div>
                            <ul className="space-y-1">
                                {profile.role === 'mayor' && (
                                    <DesktopNavItem
                                        icon={<ShieldCheckIcon className={iconClass} />}
                                        label="Mayor Portal"
                                        isActive={activeView === 'mayor'}
                                        onClick={() => setActiveView('mayor')}
                                        colorClass="text-amber-400 group-hover:text-amber-300"
                                    />
                                )}
                                {(profile.role === 'mayor' || profile.role === 'monitor') && (
                                    <DesktopNavItem
                                        icon={<MonitorIcon className={iconClass} />}
                                        label="Attendance Monitor"
                                        isActive={activeView === 'monitor'}
                                        onClick={() => setActiveView('monitor')}
                                        colorClass="text-cyan-400 group-hover:text-cyan-300"
                                    />
                                )}
                            </ul>
                        </nav>
                    )}

                    {/* Account Section */}
                    <nav className="space-y-1">
                        <div className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Account
                        </div>
                        <ul className="space-y-1">
                            {systemNavItems.map(item => (
                                <DesktopNavItem
                                    key={item.view}
                                    icon={item.icon}
                                    label={item.label}
                                    isActive={activeView === item.view}
                                    onClick={() => setActiveView(item.view as View)}
                                />
                            ))}
                        </ul>
                    </nav>
                </div>

                {/* Footer Section: User Profile Card */}
                <div className="p-4 border-t border-gray-800 bg-gray-900/80 backdrop-blur-sm flex-shrink-0">
                    <button 
                        onClick={() => setActiveView('profile')}
                        className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 group border border-gray-800 hover:border-gray-700 ${
                            activeView === 'profile' 
                            ? 'bg-gray-800 ring-1 ring-gray-700' 
                            : 'hover:bg-gray-800'
                        }`}
                    >
                        <div className="flex-shrink-0 relative">
                            {profile?.avatar_url ? (
                                <img 
                                    src={profile.avatar_url} 
                                    alt="Profile" 
                                    className="h-10 w-10 rounded-full object-cover border-2 border-gray-700 group-hover:border-gray-500 transition-colors"
                                />
                            ) : (
                                <UserCircleIcon className="h-10 w-10 text-gray-400 group-hover:text-gray-300" />
                            )}
                            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-gray-900 rounded-full"></div>
                        </div>
                        <div className="ml-3 text-left overflow-hidden flex-1">
                            <p className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                                {profile?.full_name || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 truncate capitalize">
                                {profile?.role || 'Student'}
                            </p>
                        </div>
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Bar - Floating macOS Dock Style */}
            {!hideMobileNav && (
                <div className="md:hidden fixed bottom-5 left-4 right-4 z-[60] safe-area-bottom">
                    <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border border-white/20 dark:border-gray-800/50 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                        <ul className="flex justify-around items-center h-16 px-1">
                           {mobileNavItems.map(item => (
                                <MobileNavItem
                                    key={item.view}
                                    icon={item.icon}
                                    label={item.label}
                                    isActive={activeView === item.view}
                                    onClick={() => setActiveView(item.view as View)}
                                    badge={item.badge}
                                />
                            ))}
                        </ul>
                    </nav>
                </div>
            )}
        </>
    );
};

export default Sidebar;
