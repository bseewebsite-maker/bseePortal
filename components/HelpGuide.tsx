
import React, { useState, useMemo, useEffect } from 'react';
import { 
    UserIcon, 
    LockClosedIcon, 
    CalendarIcon, 
    FundsIcon, 
    BellIcon, 
    AttendanceIcon, 
    MonitorIcon, 
    SupportIcon,
    LightBulbIcon,
    ChevronRightIcon,
    ChevronLeftIcon,
    XIcon,
    CheckIcon,
    ChevronDownIcon,
    ThumbUpIcon,
    ThumbDownIcon,
    SearchIcon
} from './Icons';

interface HelpGuideProps {
    isOpen: boolean;
    onClose: () => void;
    role?: string;
}

type GuideSection = {
    id: string;
    title: string;
    icon: React.ReactNode;
    description: string;
    content: React.ReactNode;
    keywords: string[];
    color: string;
};

// --- Theme Helper ---
// Pre-define classes to ensure Tailwind includes them in the build
const getTheme = (color: string) => {
    switch (color) {
        case 'blue': return { 
            bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', 
            icon: 'text-blue-600', hoverBorder: 'hover:border-blue-300', 
            headerTitle: 'text-blue-900', headerDesc: 'text-blue-800', 
            activeBg: 'bg-blue-50', activeBorder: 'border-blue-100', activeText: 'text-blue-700',
            iconBg: 'bg-blue-50'
        };
        case 'purple': return { 
            bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', 
            icon: 'text-purple-600', hoverBorder: 'hover:border-purple-300', 
            headerTitle: 'text-purple-900', headerDesc: 'text-purple-800', 
            activeBg: 'bg-purple-50', activeBorder: 'border-purple-100', activeText: 'text-purple-700',
            iconBg: 'bg-purple-50'
        };
        case 'green': return { 
            bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', 
            icon: 'text-green-600', hoverBorder: 'hover:border-green-300', 
            headerTitle: 'text-green-900', headerDesc: 'text-green-800', 
            activeBg: 'bg-green-50', activeBorder: 'border-green-100', activeText: 'text-green-700',
            iconBg: 'bg-green-50'
        };
        case 'gray': return { 
            bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-100', 
            icon: 'text-gray-600', hoverBorder: 'hover:border-gray-300', 
            headerTitle: 'text-gray-900', headerDesc: 'text-gray-800', 
            activeBg: 'bg-gray-50', activeBorder: 'border-gray-100', activeText: 'text-gray-700',
            iconBg: 'bg-gray-50'
        };
        case 'orange': return { 
            bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', 
            icon: 'text-orange-600', hoverBorder: 'hover:border-orange-300', 
            headerTitle: 'text-orange-900', headerDesc: 'text-orange-800', 
            activeBg: 'bg-orange-50', activeBorder: 'border-orange-100', activeText: 'text-orange-700',
            iconBg: 'bg-orange-50'
        };
        case 'indigo': return { 
            bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', 
            icon: 'text-indigo-600', hoverBorder: 'hover:border-indigo-300', 
            headerTitle: 'text-indigo-900', headerDesc: 'text-indigo-800', 
            activeBg: 'bg-indigo-50', activeBorder: 'border-indigo-100', activeText: 'text-indigo-700',
            iconBg: 'bg-indigo-50'
        };
        case 'teal': return { 
            bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100', 
            icon: 'text-teal-600', hoverBorder: 'hover:border-teal-300', 
            headerTitle: 'text-teal-900', headerDesc: 'text-teal-800', 
            activeBg: 'bg-teal-50', activeBorder: 'border-teal-100', activeText: 'text-teal-700',
            iconBg: 'bg-teal-50'
        };
        default: return { 
            bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-100', 
            icon: 'text-gray-600', hoverBorder: 'hover:border-gray-300', 
            headerTitle: 'text-gray-900', headerDesc: 'text-gray-800', 
            activeBg: 'bg-gray-50', activeBorder: 'border-gray-100', activeText: 'text-gray-700',
            iconBg: 'bg-gray-50'
        };
    }
};

// --- UI Components for Guide Content ---

const SectionHeader: React.FC<{ title: string, description: string, icon: React.ReactNode, color: string }> = ({ title, description, icon, color }) => {
    const theme = getTheme(color);
    return (
        <div className={`${theme.bg} p-6 rounded-2xl mb-6 border ${theme.border} flex items-start gap-4`}>
            <div className={`p-3 bg-white rounded-xl shadow-sm ${theme.icon} shrink-0`}>
                {icon}
            </div>
            <div>
                <h2 className={`text-2xl font-bold ${theme.headerTitle} mb-1`}>{title}</h2>
                <p className={`${theme.headerDesc} text-sm leading-relaxed opacity-90`}>{description}</p>
            </div>
        </div>
    );
};

const FeatureCard: React.FC<{ title: string, children: React.ReactNode, icon?: React.ReactNode }> = ({ title, children, icon }) => (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 duration-300">
        <div className="flex items-center gap-3 mb-3">
            {icon && <div className="p-2 bg-gray-50 rounded-lg text-gray-600">{icon}</div>}
            <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
        </div>
        <div className="text-gray-600 text-sm leading-relaxed">
            {children}
        </div>
    </div>
);

const StepList: React.FC<{ steps: string[] }> = ({ steps }) => (
    <div className="space-y-3 my-4">
        {steps.map((step, idx) => (
            <div key={idx} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center mt-0.5">
                    {idx + 1}
                </div>
                <p className="text-sm text-gray-700">{step}</p>
            </div>
        ))}
    </div>
);

const FaqAccordion: React.FC<{ items: { question: string, answer: React.ReactNode }[] }> = ({ items }) => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="space-y-2">
            {items.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden transition-all duration-200 hover:border-gray-300">
                    <button 
                        type="button"
                        onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                        className={`w-full flex justify-between items-center p-4 text-left transition-colors ${openIndex === idx ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'}`}
                    >
                        <span className="font-semibold text-gray-800 text-sm pr-4">{item.question}</span>
                        <ChevronDownIcon className={`h-4 w-4 text-gray-400 transform transition-transform duration-300 ${openIndex === idx ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openIndex === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="p-4 pt-0 bg-gray-50 border-t border-gray-100 text-sm text-gray-600 leading-relaxed">
                            <div className="pt-3">{item.answer}</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const QuickLinkCard: React.FC<{ title: string, icon: React.ReactNode, color: string, onClick: () => void }> = ({ title, icon, color, onClick }) => {
    const theme = getTheme(color);
    return (
        <button 
            type="button"
            onClick={onClick}
            className={`group p-4 rounded-xl border border-gray-200 bg-white ${theme.hoverBorder} hover:shadow-md transition-all text-left w-full flex items-center gap-4`}
        >
            <div className={`p-3 rounded-lg ${theme.iconBg} ${theme.icon} group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <div>
                <h4 className="font-bold text-gray-800 group-hover:text-gray-900">{title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">View Guide <ChevronRightIcon className="inline h-3 w-3 ml-0.5" /></p>
            </div>
        </button>
    );
};

// --- Main Component ---

const HelpGuide: React.FC<HelpGuideProps> = ({ isOpen, onClose, role }) => {
    const [activeSectionId, setActiveSectionId] = useState<string>('intro');
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileView, setMobileView] = useState<'menu' | 'content'>('menu');
    const [feedbackState, setFeedbackState] = useState<Record<string, 'up' | 'down' | null>>({});

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setMobileView('menu');
            setSearchQuery('');
        }
    }, [isOpen]);

    const handleSectionSelect = (id: string) => {
        setActiveSectionId(id);
        setMobileView('content');
    };

    const handleFeedback = (type: 'up' | 'down') => {
        setFeedbackState(prev => ({ ...prev, [activeSectionId]: type }));
    };

    const guides: GuideSection[] = useMemo(() => {
        const list: GuideSection[] = [
            {
                id: 'profile',
                title: 'Profile & Account',
                description: 'Manage your personal information, profile picture, and account settings.',
                icon: <UserIcon className="h-6 w-6" inWrapper={false} />,
                color: 'blue',
                keywords: ['avatar', 'photo', 'bio', 'name', 'edit', 'student id'],
                content: (
                    <div className="space-y-8 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FeatureCard title="Personal Details" icon={<UserIcon className="h-5 w-5" inWrapper={false} />}>
                                Your profile acts as your digital ID card. It displays your full name, student ID, and role status. 
                                Keep your bio updated to let others know more about you.
                            </FeatureCard>
                            <FeatureCard title="Customization" icon={<LightBulbIcon className="h-5 w-5" />}>
                                Personalize your experience by uploading a profile picture and a cover photo. 
                                This helps friends and monitors identify you easily.
                            </FeatureCard>
                        </div>
    
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Common Questions</h3>
                            <FaqAccordion items={[
                                {
                                    question: "How do I change my profile picture?",
                                    answer: <StepList steps={[
                                        "Go to your Profile page.",
                                        "Hover over your current avatar (or tap on mobile).",
                                        "Click the camera icon that appears.",
                                        "Select a new image file from your device."
                                    ]} />
                                },
                                {
                                    question: "Can I change my Student ID?",
                                    answer: "No, your Student ID is permanently linked to your account registration for security and record-keeping purposes. If there is an error, please contact an administrator."
                                },
                                {
                                    question: "How do I edit my bio?",
                                    answer: "Navigate to your profile and click the 'Edit Profile' button located near your name. A form will appear allowing you to update your bio text."
                                }
                            ]} />
                        </div>
                    </div>
                )
            },
            {
                id: 'calendar',
                title: 'Calendar System',
                description: 'Keep track of academic deadlines, class schedules, and personal events.',
                icon: <CalendarIcon className="h-6 w-6" />,
                color: 'purple',
                keywords: ['schedule', 'event', 'date', 'time', 'meeting', 'deadline'],
                content: (
                    <div className="space-y-8 animate-fade-in">
                        <div className="prose prose-sm text-gray-600 max-w-none">
                            <p>The calendar is designed to be your central hub for time management. You can view public events set by the school and add your own private reminders.</p>
                        </div>
    
                        <div className="grid grid-cols-1 gap-4">
                            <FeatureCard title="Adding Events" icon={<CheckIcon className="h-5 w-5" />}>
                                <p className="mb-2">You can add personal events that are only visible to you.</p>
                                <StepList steps={[
                                    "Navigate to the Calendar page.",
                                    "Double-click on any day cell in the Month or Week view.",
                                    "Fill in the event title, time, and details in the popup modal.",
                                    "Click 'Save'."
                                ]} />
                            </FeatureCard>
                        </div>
    
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Tips & Tricks</h3>
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                                <p className="text-sm text-yellow-800">
                                    <strong>Did you know?</strong> You can drag and drop events to reschedule them instantly! Just click and hold an event in the Month view and drop it onto a new date.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                id: 'funds',
                title: 'Funds & Payments',
                description: 'Monitor your contributions, view payment history, and download receipts.',
                icon: <FundsIcon className="h-6 w-6" />,
                color: 'green',
                keywords: ['money', 'pay', 'fee', 'collection', 'receipt', 'status'],
                content: (
                    <div className="space-y-8 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                                <div className="text-green-600 font-bold text-lg mb-1">Paid</div>
                                <p className="text-xs text-green-800">Full amount settled</p>
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-center">
                                <div className="text-yellow-600 font-bold text-lg mb-1">Partial</div>
                                <p className="text-xs text-yellow-800">Remaining balance due</p>
                            </div>
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                                <div className="text-red-600 font-bold text-lg mb-1">Unpaid</div>
                                <p className="text-xs text-red-800">Action required</p>
                            </div>
                        </div>
    
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-4">How to use</h3>
                             <FaqAccordion items={[
                                {
                                    question: "How do I view my balance?",
                                    answer: "Go to the Funds page. You will see a list of all active collections. Click on any item to expand it and see detailed breakdown of amounts due and paid."
                                },
                                {
                                    question: "Can I get a receipt?",
                                    answer: "Yes! For any collection marked as 'Paid' or 'Partial', simply expand the item and click the 'Download E-Receipt' button to generate a text-based proof of payment."
                                }
                            ]} />
                        </div>
                    </div>
                )
            },
            {
                id: 'security',
                title: 'Security Settings',
                description: 'Ensure your account stays safe with password management tools.',
                icon: <LockClosedIcon className="h-6 w-6" />,
                color: 'gray',
                keywords: ['password', 'reset', 'login', 'account', 'secure'],
                content: (
                    <div className="space-y-8 animate-fade-in">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4">Password Management</h3>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-semibold text-gray-800 text-sm mb-2">Resetting a Forgotten Password</h4>
                                    <p className="text-sm text-gray-600">
                                        If you cannot log in, use the "Forgot Password?" link on the sign-in screen. 
                                        We will email you a secure link to reset your credentials.
                                    </p>
                                </div>
                                <div className="h-px bg-gray-100"></div>
                                <div>
                                    <h4 className="font-semibold text-gray-800 text-sm mb-2">Updating Password</h4>
                                    <p className="text-sm text-gray-600">
                                        To change your password while logged in, go to <strong>Settings {'>'} Security</strong>. 
                                        You will need to enter and confirm your new password.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            },
            {
                id: 'notifications',
                title: 'Notifications',
                description: 'Stay updated with real-time alerts for events, payments, and friends.',
                icon: <BellIcon className="h-6 w-6" />,
                color: 'orange',
                keywords: ['alert', 'message', 'remind', 'push'],
                content: (
                    <div className="space-y-8 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 flex items-start gap-3">
                                 <div className="p-2 bg-white rounded-lg text-orange-500 shadow-sm"><CalendarIcon className="h-5 w-5" /></div>
                                 <div>
                                     <h4 className="font-bold text-gray-800 text-sm">Event Reminders</h4>
                                     <p className="text-xs text-gray-600 mt-1">Get notified 24 hours before an event starts.</p>
                                 </div>
                             </div>
                             <div className="p-4 rounded-xl bg-green-50 border border-green-100 flex items-start gap-3">
                                 <div className="p-2 bg-white rounded-lg text-green-500 shadow-sm"><FundsIcon className="h-5 w-5" /></div>
                                 <div>
                                     <h4 className="font-bold text-gray-800 text-sm">Payment Updates</h4>
                                     <p className="text-xs text-gray-600 mt-1">Receive alerts when your payment is recorded.</p>
                                 </div>
                             </div>
                             <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3">
                                 <div className="p-2 bg-white rounded-lg text-blue-500 shadow-sm"><UserIcon className="h-5 w-5" inWrapper={false} /></div>
                                 <div>
                                     <h4 className="font-bold text-gray-800 text-sm">Social</h4>
                                     <p className="text-xs text-gray-600 mt-1">See friend requests and acceptances instantly.</p>
                                 </div>
                             </div>
                        </div>
                    </div>
                )
            },
             {
                id: 'attendance',
                title: 'Attendance Record',
                description: 'View your personal attendance history and statistics.',
                icon: <AttendanceIcon className="h-6 w-6" />,
                color: 'indigo',
                keywords: ['present', 'absent', 'record', 'late'],
                content: (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                                Your attendance is tracked daily by monitors. The Attendance page provides a summary of your standing.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-200">Present</span>
                                <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full border border-red-200">Absent</span>
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full border border-yellow-200">Late</span>
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full border border-blue-200">Excused</span>
                            </div>
                         </div>
                    </div>
                )
            }
        ];

        if (role === 'mayor' || role === 'monitor') {
            list.push({
                id: 'monitor',
                title: 'Monitor Tools',
                description: 'Administrative tools for managing daily attendance.',
                icon: <MonitorIcon className="h-6 w-6" />,
                color: 'teal',
                keywords: ['admin', 'mark', 'bulk', 'manager'],
                content: (
                     <div className="space-y-8 animate-fade-in">
                        <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex items-center gap-3">
                            <MonitorIcon className="h-6 w-6 text-teal-600" />
                            <p className="text-sm text-teal-800 font-medium">You have special access to mark student attendance.</p>
                        </div>
                        
                        <h3 className="text-lg font-bold text-gray-800">Key Features</h3>
                        <FaqAccordion items={[
                            {
                                question: "How do I mark attendance?",
                                answer: "Go to the Monitor page. Select today's date (default). Find a student in the list and click the status button (Present, Late, Absent) to update their record instantly."
                            },
                            {
                                question: "Can I mark everyone at once?",
                                answer: "Yes! Use the 'Mark Visible' buttons at the top of the list to apply a status to all currently filtered students. This is perfect for marking everyone present at the start of class."
                            }
                        ]} />
                    </div>
                )
            });
        }
        return list;
    }, [role]);

    const filteredGuides = useMemo(() => {
        if (!searchQuery) return guides;
        const lowerQuery = searchQuery.toLowerCase();
        return guides.filter(g => 
            g.title.toLowerCase().includes(lowerQuery) || 
            g.keywords.some(k => k.toLowerCase().includes(lowerQuery))
        );
    }, [searchQuery, guides]);

    const activeGuide = guides.find(g => g.id === activeSectionId);
    const currentFeedback = feedbackState[activeSectionId];

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex justify-center items-center p-0 sm:p-6 transition-opacity animate-fade-in" 
            aria-modal="true" 
            role="dialog"
            onClick={onClose}
        >
            <div 
                className="bg-white w-full h-full sm:h-[85vh] sm:max-w-5xl sm:rounded-2xl shadow-2xl flex overflow-hidden animate-fade-in-up relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Sidebar (Menu) */}
                <div className={`
                    absolute inset-0 z-10 bg-gray-50 sm:static sm:w-1/3 sm:border-r border-gray-200 flex flex-col transition-transform duration-300
                    ${mobileView === 'content' ? '-translate-x-full sm:translate-x-0' : 'translate-x-0'}
                `}>
                    {/* Sidebar Header */}
                    <div className="p-6 bg-white border-b border-gray-100">
                        <div className="flex justify-between items-center mb-5">
                            <div className="flex items-center gap-2.5">
                                <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm">
                                    <SupportIcon className="h-5 w-5 text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800 tracking-tight">Help Center</h2>
                            </div>
                            <button 
                                type="button"
                                onClick={onClose} 
                                className="sm:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <XIcon className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search topics..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner"
                            />
                        </div>
                    </div>
                    
                    {/* Sidebar Nav */}
                    <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                        <button
                            type="button"
                            onClick={() => handleSectionSelect('intro')}
                            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 mb-4 ${
                                activeSectionId === 'intro' 
                                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                                    : 'text-gray-600 hover:bg-white hover:shadow-sm hover:text-gray-900'
                            }`}
                        >
                            <div className={`mr-3 transition-colors ${activeSectionId === 'intro' ? 'text-blue-600' : 'text-gray-400'}`}>
                                <LightBulbIcon className="h-5 w-5" />
                            </div>
                            Getting Started
                        </button>

                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2 mt-4">Topics</div>
                        
                        {filteredGuides.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 text-sm">
                                No results found.
                            </div>
                        ) : (
                            filteredGuides.map(section => {
                                const theme = getTheme(section.color);
                                return (
                                    <button
                                        key={section.id}
                                        type="button"
                                        onClick={() => handleSectionSelect(section.id)}
                                        className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                                            activeSectionId === section.id 
                                                ? `${theme.activeBg} ${theme.activeText} shadow-sm border ${theme.activeBorder}`
                                                : 'text-gray-600 hover:bg-white hover:shadow-sm hover:text-gray-900'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`transition-colors ${
                                                activeSectionId === section.id ? theme.icon : 'text-gray-400 group-hover:text-gray-600'
                                            }`}>
                                                {section.icon}
                                            </span>
                                            <span>{section.title}</span>
                                        </div>
                                        {activeSectionId === section.id && (
                                            <ChevronRightIcon className={`h-4 w-4 ${theme.icon.replace('text-', 'text-').replace('600', '500')}`} />
                                        )}
                                    </button>
                                )
                            })
                        )}
                    </nav>
                </div>

                {/* Content Area */}
                <div className={`
                    absolute inset-0 z-10 bg-white sm:static sm:w-2/3 flex flex-col transition-transform duration-300
                    ${mobileView === 'menu' ? 'translate-x-full sm:translate-x-0' : 'translate-x-0'}
                `}>
                    {/* Mobile Header / Desktop Close */}
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between sm:justify-end bg-white/80 backdrop-blur-md sticky top-0 z-20 h-16">
                        <button 
                            type="button"
                            onClick={() => setMobileView('menu')}
                            className="sm:hidden flex items-center text-gray-600 font-medium text-sm hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            <ChevronLeftIcon className="h-5 w-5 mr-1" />
                            All Topics
                        </button>
                        
                        <button 
                            type="button"
                            onClick={onClose}
                            className="hidden sm:flex items-center justify-center h-8 w-8 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            title="Close Guide"
                        >
                            <XIcon className="h-5 w-5" />
                        </button>
                         <button 
                            type="button"
                            onClick={onClose}
                            className="sm:hidden p-2 rounded-full text-gray-400 hover:bg-gray-100"
                        >
                            <XIcon className="h-6 w-6"/>
                        </button>
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-12 sm:py-10">
                        {activeSectionId === 'intro' ? (
                            <div className="animate-fade-in space-y-8">
                                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-lg">
                                    <h1 className="text-3xl font-bold mb-4">Welcome to BseePortal!</h1>
                                    <p className="text-blue-100 leading-relaxed max-w-xl">
                                        This interactive guide is here to help you navigate your student portal with ease. 
                                        Explore topics from the menu or select a quick link below to get started.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-gray-900 font-bold text-lg mb-4 flex items-center gap-2">
                                        <LightBulbIcon className="h-5 w-5 text-yellow-500" /> 
                                        Quick Start
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <QuickLinkCard 
                                            title="Update Profile" 
                                            icon={<UserIcon className="h-6 w-6" inWrapper={false} />} 
                                            color="blue"
                                            onClick={() => handleSectionSelect('profile')} 
                                        />
                                        <QuickLinkCard 
                                            title="Check Calendar" 
                                            icon={<CalendarIcon className="h-6 w-6" />} 
                                            color="purple"
                                            onClick={() => handleSectionSelect('calendar')} 
                                        />
                                        <QuickLinkCard 
                                            title="View Funds" 
                                            icon={<FundsIcon className="h-6 w-6" />} 
                                            color="green"
                                            onClick={() => handleSectionSelect('funds')} 
                                        />
                                        <QuickLinkCard 
                                            title="Notifications" 
                                            icon={<BellIcon className="h-6 w-6" />} 
                                            color="orange"
                                            onClick={() => handleSectionSelect('notifications')} 
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : activeGuide ? (
                            <div className="animate-fade-in pb-10">
                                <SectionHeader 
                                    title={activeGuide.title} 
                                    description={activeGuide.description} 
                                    icon={activeGuide.icon} 
                                    color={activeGuide.color}
                                />
                                
                                {activeGuide.content}

                                {/* Feedback Section */}
                                <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col items-center">
                                    <p className="text-gray-500 text-sm mb-4 font-medium">Was this guide helpful?</p>
                                    <div className="flex gap-3">
                                        <button 
                                            type="button"
                                            onClick={() => handleFeedback('up')}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 ${
                                                currentFeedback === 'up' 
                                                ? 'bg-green-50 border-green-200 text-green-700 ring-2 ring-green-100' 
                                                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <ThumbUpIcon className="h-4 w-4" /> Yes
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => handleFeedback('down')}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 ${
                                                currentFeedback === 'down' 
                                                ? 'bg-red-50 border-red-200 text-red-700 ring-2 ring-red-100' 
                                                : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <ThumbDownIcon className="h-4 w-4" /> No
                                        </button>
                                    </div>
                                    {currentFeedback && (
                                        <p className="text-xs text-gray-400 mt-3 animate-fade-in">Thank you for your feedback!</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <div className="bg-gray-100 p-4 rounded-full mb-4">
                                    <LightBulbIcon className="h-8 w-8 text-gray-300" />
                                </div>
                                <p>Select a topic to view details</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpGuide;
