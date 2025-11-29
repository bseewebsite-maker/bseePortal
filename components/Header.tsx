
import React, { useState, useEffect, useRef } from 'react';
import type { Profile, Notification, SearchHistoryItem, Post } from '../types';
import { UserCircleIcon, ChevronDownIcon, LogoutIcon, UserIcon, BellIcon, QuestionMarkCircleIcon, SettingsIcon, XIcon, ChevronRightIcon, AttendanceIcon, SunIcon, MoonIcon, SparklesIcon, SearchIcon, ClockIcon, TrashIcon, ChevronLeftIcon, MessageCircleIcon, ChatIcon, ShieldCheckIcon, MonitorIcon, FundsIcon, ExternalLinkIcon } from './Icons';
import { Spinner } from './Spinner';
import HelpGuide from './HelpGuide';
import { db, firestore } from '../services';

type View = 'homepage' | 'calendar' | 'settings' | 'profile' | 'funds' | 'attendance' | 'mayor' | 'notifications' | 'monitor' | 'friends' | 'chats' | 'ai-assistant';

interface HeaderProps {
    profile: Profile | null;
    setActiveView: (view: View) => void;
    onSignOut: () => void;
    isSigningOut: boolean;
    notifications: Notification[];
    unreadChatCount: number;
    onMarkAsRead: () => void;
    onDeleteRead: () => void;
    onViewProfile?: (profile: Profile) => void;
    onViewPost?: (post: Post, author: Profile) => void;
}

const Header: React.FC<HeaderProps> = ({ profile, setActiveView, onSignOut, isSigningOut, notifications, unreadChatCount, onViewProfile, onViewPost }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [helpGuideOpen, setHelpGuideOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                return localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
            }
        } catch (e) {
            // Ignore localStorage errors
        }
        return false;
    });
    
    const unreadCount = notifications.filter(n => !n.is_read).length;

    // Search State
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{
        users: Profile[];
        posts: { post: Post, author: Profile }[];
    }>({ users: [], posts: [] });
    
    const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchDropdownRef = useRef<HTMLDivElement>(null);

    // Admin Tools State
    const [treasurerUrl, setTreasurerUrl] = useState('https://treasurer-s-portal-nchx.vercel.app/');

    useEffect(() => {
        try {
            if (darkMode) {
                document.documentElement.classList.add('dark');
                if(typeof window !== 'undefined' && window.localStorage) localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                if(typeof window !== 'undefined' && window.localStorage) localStorage.setItem('theme', 'light');
            }
        } catch (e) {
            // Ignore storage errors
        }
    }, [darkMode]);

    // Fetch Search History on Mount
    useEffect(() => {
        if (!profile?.id) return;
        const unsubscribe = db.collection('profiles').doc(profile.id)
            .collection('search_history')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .onSnapshot(snapshot => {
                const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SearchHistoryItem[];
                setSearchHistory(history);
            });
        return () => unsubscribe();
    }, [profile?.id]);

    // Fetch Global Config for Treasurer URL
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const doc = await db.collection('system_settings').doc('global_config').get();
                if (doc.exists && doc.data().treasurer_portal_url) {
                    setTreasurerUrl(doc.data().treasurer_portal_url);
                }
            } catch (err) {
                console.error("Error fetching system config:", err);
            }
        };
        if (profile?.role === 'mayor' || profile?.role === 'treasurer') {
            fetchConfig();
        }
    }, [profile?.role]);

    // Handle Search Input Debounce
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults({ users: [], posts: [] });
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setLoadingSearch(true);
            try {
                const queryLower = searchQuery.toLowerCase();

                // 1. Fetch Users
                const snapshot = await db.collection('profiles').get();
                const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Profile[];
                
                const userResults = allUsers.filter(u => 
                    u.id !== profile?.id &&
                    (
                        (u.full_name && u.full_name.toLowerCase().includes(queryLower)) ||
                        (u.student_id && u.student_id.toLowerCase().includes(queryLower))
                    )
                ).slice(0, 3);

                // 2. Fetch Posts (Optimized: limit to recent 100 for search context)
                const postsSnapshot = await db.collection('posts').orderBy('createdAt', 'desc').limit(100).get();
                const allPosts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[];
                
                const postResultsRaw = allPosts.filter(p => 
                    p.content && p.content.toLowerCase().includes(queryLower)
                ).slice(0, 3);

                const postResults = postResultsRaw.map(post => {
                    const author = allUsers.find(u => u.id === post.userId) || { id: post.userId, full_name: 'Unknown', role: 'user', student_id: '?' } as Profile;
                    return { post, author };
                });
                
                setSearchResults({ users: userResults, posts: postResults });
            } catch(e) {
                console.error("Search error", e);
            } finally {
                setLoadingSearch(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, profile?.id]);

    // Close Search Dropdown on Click Outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                searchDropdownRef.current && 
                !searchDropdownRef.current.contains(event.target as Node) &&
                !searchInputRef.current?.contains(event.target as Node)
            ) {
                setIsSearchActive(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectUser = async (targetUser: Profile) => {
        if (profile?.id) {
            // Check for existing entry to avoid duplicates in history
            const existing = searchHistory.find(h => h.targetId === targetUser.id);
            if (existing) {
                await db.collection('profiles').doc(profile.id).collection('search_history').doc(existing.id).update({
                    timestamp: firestore.FieldValue.serverTimestamp()
                });
            } else {
                await db.collection('profiles').doc(profile.id).collection('search_history').add({
                    targetId: targetUser.id,
                    full_name: targetUser.full_name,
                    avatar_url: targetUser.avatar_url || null,
                    student_id: targetUser.student_id,
                    timestamp: firestore.FieldValue.serverTimestamp()
                });
            }
        }
        
        setSearchQuery('');
        setIsSearchActive(false);
        setMobileSearchOpen(false);
        if (onViewProfile) onViewProfile(targetUser);
    };

    const handleSelectPost = (post: Post, author: Profile) => {
        setSearchQuery('');
        setIsSearchActive(false);
        setMobileSearchOpen(false);
        if (onViewPost) onViewPost(post, author);
    };

    const handleSelectHistory = (item: SearchHistoryItem) => {
        const dummyProfile: Profile = {
            id: item.targetId,
            full_name: item.full_name,
            student_id: item.student_id,
            avatar_url: item.avatar_url,
            role: 'user', // Default
        };
        handleSelectUser(dummyProfile);
    };

    const handleDeleteHistory = async (e: React.MouseEvent, itemId: string) => {
        e.stopPropagation();
        if (profile?.id) {
            await db.collection('profiles').doc(profile.id).collection('search_history').doc(itemId).delete();
        }
    };

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

    // Safe Profile Display
    const avatarUrl = profile?.avatar_url || null;
    const fullName = typeof profile?.full_name === 'string' ? profile.full_name : 'User';

    // Helper for Admin Tools Visibility
    const isMayor = profile?.role === 'mayor';
    const isMonitor = profile?.role === 'monitor' || isMayor;
    const isTreasurer = profile?.role === 'treasurer' || isMayor;
    const hasAdminTools = isMayor || isMonitor || isTreasurer;

    // Mobile Search Overlay Content
    const renderSearchDropdown = () => (
        <div ref={searchDropdownRef} className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 shadow-lg rounded-b-xl border-t border-gray-100 dark:border-gray-700 overflow-hidden z-50 animate-fade-in-up max-h-[80vh] overflow-y-auto">
            {searchQuery ? (
                <div>
                    {loadingSearch ? (
                        <div className="p-4 flex justify-center">
                            <Spinner className="h-5 w-5 text-gray-400" />
                        </div>
                    ) : (searchResults.users.length > 0 || searchResults.posts.length > 0) ? (
                        <>
                            {searchResults.users.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50">
                                        Users
                                    </div>
                                    <ul>
                                        {searchResults.users.map(user => {
                                            const isIdHidden = user.privacy_student_id !== 'public';
                                            return (
                                                <li key={user.id}>
                                                    <button 
                                                        onClick={() => handleSelectUser(user)}
                                                        className="w-full flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                                                    >
                                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                                                            {user.avatar_url ? (
                                                                <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                                                            ) : (
                                                                <UserCircleIcon className="h-full w-full text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div className="ml-3">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{user.full_name}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{isIdHidden ? 'Hidden' : user.student_id}</p>
                                                        </div>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}

                            {searchResults.posts.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
                                        Posts
                                    </div>
                                    <ul>
                                        {searchResults.posts.map(({ post, author }) => (
                                            <li key={post.id}>
                                                <button 
                                                    onClick={() => handleSelectPost(post, author)}
                                                    className="w-full flex items-start px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                                                >
                                                    <div className="flex-shrink-0 pt-0.5">
                                                        <MessageCircleIcon className="h-5 w-5 text-gray-400" />
                                                    </div>
                                                    <div className="ml-3 min-w-0">
                                                        <p className="text-sm text-gray-900 dark:text-white truncate font-medium">{post.content}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            Posted by {author.full_name}
                                                        </p>
                                                    </div>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="p-4 text-center text-gray-500 text-sm">No results found.</div>
                    )}
                </div>
            ) : (
                <div>
                    <div className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50">
                        Recent Searches
                    </div>
                    {searchHistory.length > 0 ? (
                        <ul>
                            {searchHistory.map(item => (
                                <li key={item.id} className="relative group">
                                    <button 
                                        onClick={() => handleSelectHistory(item)}
                                        className="w-full flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                                    >
                                        <div className="flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-full p-1.5 text-gray-500">
                                            <ClockIcon className="h-4 w-4" />
                                        </div>
                                        <div className="ml-3 flex items-center">
                                            {item.avatar_url && <img src={item.avatar_url} alt="" className="h-5 w-5 rounded-full mr-2 object-cover" />}
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.full_name}</p>
                                        </div>
                                    </button>
                                    <button 
                                        onClick={(e) => handleDeleteHistory(e, item.id)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="Remove from history"
                                    >
                                        <XIcon className="h-4 w-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center">
                            <SearchIcon className="h-8 w-8 mb-2 opacity-20" />
                            <p>No recent searches.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <>
            <HelpGuide 
                isOpen={helpGuideOpen} 
                onClose={() => setHelpGuideOpen(false)} 
                role={profile?.role}
            />

            {/* Mobile Search Overlay */}
            {mobileSearchOpen && (
                <div className="fixed inset-0 z-[60] bg-white dark:bg-gray-900 flex flex-col animate-fade-in">
                    <div className="flex items-center p-2 border-b border-gray-200 dark:border-gray-700">
                        <button onClick={() => { setMobileSearchOpen(false); setSearchQuery(''); }} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">
                            <ChevronLeftIcon className="h-6 w-6" />
                        </button>
                        <div className="flex-1 relative mx-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search users and posts..."
                                className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-full py-2 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <XIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto relative">
                        {/* Mobile search results rendered inline */}
                        <div className="py-2">
                             {searchQuery ? (
                                <div>
                                    {loadingSearch ? (
                                        <div className="p-4 flex justify-center">
                                            <Spinner className="h-5 w-5 text-gray-400" />
                                        </div>
                                    ) : (searchResults.users.length > 0 || searchResults.posts.length > 0) ? (
                                        <>
                                            {searchResults.users.length > 0 && (
                                                <div>
                                                    <div className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50">
                                                        Users
                                                    </div>
                                                    <ul>
                                                        {searchResults.users.map(user => {
                                                            const isIdHidden = user.privacy_student_id !== 'public';
                                                            return (
                                                                <li key={user.id}>
                                                                    <button 
                                                                        onClick={() => handleSelectUser(user)}
                                                                        className="w-full flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                                                                    >
                                                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                                                                            {user.avatar_url ? (
                                                                                <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                                                                            ) : (
                                                                                <UserCircleIcon className="h-full w-full text-gray-400" />
                                                                            )}
                                                                        </div>
                                                                        <div className="ml-3">
                                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{user.full_name}</p>
                                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{isIdHidden ? 'Hidden' : user.student_id}</p>
                                                                        </div>
                                                                    </button>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </div>
                                            )}

                                            {searchResults.posts.length > 0 && (
                                                <div>
                                                    <div className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
                                                        Posts
                                                    </div>
                                                    <ul>
                                                        {searchResults.posts.map(({ post, author }) => (
                                                            <li key={post.id}>
                                                                <button 
                                                                    onClick={() => handleSelectPost(post, author)}
                                                                    className="w-full flex items-start px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                                                                >
                                                                    <div className="flex-shrink-0 pt-0.5">
                                                                        <MessageCircleIcon className="h-5 w-5 text-gray-400" />
                                                                    </div>
                                                                    <div className="ml-3 min-w-0">
                                                                        <p className="text-sm text-gray-900 dark:text-white truncate font-medium">{post.content}</p>
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                            Posted by {author.full_name}
                                                                        </p>
                                                                    </div>
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="p-4 text-center text-gray-500 text-sm">No results found.</div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <div className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50">
                                        Recent Searches
                                    </div>
                                    {searchHistory.length > 0 ? (
                                        <ul>
                                            {searchHistory.map(item => (
                                                <li key={item.id} className="relative group">
                                                    <button 
                                                        onClick={() => handleSelectHistory(item)}
                                                        className="w-full flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                                                    >
                                                        <div className="flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-full p-1.5 text-gray-500">
                                                            <ClockIcon className="h-4 w-4" />
                                                        </div>
                                                        <div className="ml-3 flex items-center">
                                                            {item.avatar_url && <img src={item.avatar_url} alt="" className="h-5 w-5 rounded-full mr-2 object-cover" />}
                                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.full_name}</p>
                                                        </div>
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleDeleteHistory(e, item.id)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-50"
                                                    >
                                                        <XIcon className="h-5 w-5" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center">
                                            <SearchIcon className="h-8 w-8 mb-2 opacity-20" />
                                            <p>No recent searches.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* SIDEBAR MENU (Replaces Dropdown) */}
            {menuOpen && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-500 animate-fade-in"
                        onClick={() => setMenuOpen(false)}
                    ></div>
                    
                    {/* iOS/macOS Style Drawer */}
                    <div className="relative w-[20rem] h-full bg-white/85 dark:bg-gray-900/85 backdrop-blur-2xl shadow-2xl flex flex-col border-l border-white/20 dark:border-gray-700/30 animate-slide-in-from-right transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-6 pb-4">
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Menu</h2>
                            <button 
                                onClick={() => setMenuOpen(false)}
                                className="p-2 bg-gray-200/50 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
                            
                            {/* User Card (Apple ID Style) */}
                            <div 
                                onClick={() => { setMenuOpen(false); setActiveView('profile'); }}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 dark:bg-gray-800/40 border border-white/40 dark:border-white/5 shadow-sm cursor-pointer hover:bg-white/80 dark:hover:bg-gray-800/60 transition-all duration-200 group"
                            >
                                <div className="relative">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover shadow-md group-hover:scale-105 transition-transform duration-300" />
                                    ) : (
                                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-gray-500">
                                            <UserIcon className="h-8 w-8" inWrapper={false}/>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{fullName}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{profile?.email || 'Student'}</p>
                                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                                        {profile?.role || 'Member'}
                                    </span>
                                </div>
                                <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                            </div>

                            {/* General Settings Group */}
                            <div className="rounded-2xl overflow-hidden bg-white/50 dark:bg-gray-800/40 border border-white/40 dark:border-white/5 shadow-sm backdrop-blur-md">
                                {/* Settings Link */}
                                <button
                                    onClick={() => { setMenuOpen(false); setActiveView('settings'); }}
                                    className="w-full flex items-center p-4 hover:bg-white/60 dark:hover:bg-gray-700/40 transition-colors active:bg-gray-100/50 dark:active:bg-gray-700/60 border-b border-gray-200/50 dark:border-gray-700/50 last:border-0 group"
                                >
                                    <div className="h-8 w-8 rounded-lg bg-gray-500 flex items-center justify-center text-white shadow-sm mr-4 group-active:scale-95 transition-transform">
                                        <SettingsIcon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <span className="block text-base font-medium text-gray-900 dark:text-white">Settings</span>
                                    </div>
                                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                </button>

                                {/* Help Guide */}
                                <button
                                    onClick={() => { setMenuOpen(false); setHelpGuideOpen(true); }}
                                    className="w-full flex items-center p-4 hover:bg-white/60 dark:hover:bg-gray-700/40 transition-colors active:bg-gray-100/50 dark:active:bg-gray-700/60 border-b border-gray-200/50 dark:border-gray-700/50 last:border-0 group"
                                >
                                    <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center text-white shadow-sm mr-4 group-active:scale-95 transition-transform">
                                        <QuestionMarkCircleIcon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <span className="block text-base font-medium text-gray-900 dark:text-white">Help & Guide</span>
                                    </div>
                                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                </button>

                                {/* AI Assistant (All Users) */}
                                <button
                                    onClick={() => { setMenuOpen(false); setActiveView('ai-assistant'); }}
                                    className="w-full flex items-center p-4 hover:bg-white/60 dark:hover:bg-gray-700/40 transition-colors active:bg-gray-100/50 dark:active:bg-gray-700/60 group"
                                >
                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm mr-4 group-active:scale-95 transition-transform">
                                        <SparklesIcon className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <span className="block text-base font-medium text-gray-900 dark:text-white">AI Assistant</span>
                                    </div>
                                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                </button>
                            </div>

                            {/* Admin Tools Group (Conditional) */}
                            {hasAdminTools && (
                                <>
                                    <div className="px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Admin Tools</div>
                                    <div className="rounded-2xl overflow-hidden bg-white/50 dark:bg-gray-800/40 border border-white/40 dark:border-white/5 shadow-sm backdrop-blur-md">
                                        {isMayor && (
                                            <button
                                                onClick={() => { setMenuOpen(false); setActiveView('mayor'); }}
                                                className="w-full flex items-center p-4 hover:bg-white/60 dark:hover:bg-gray-700/40 transition-colors active:bg-gray-100/50 dark:active:bg-gray-700/60 border-b border-gray-200/50 dark:border-gray-700/50 last:border-0 group"
                                            >
                                                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm mr-4 group-active:scale-95 transition-transform">
                                                    <ShieldCheckIcon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <span className="block text-base font-medium text-gray-900 dark:text-white">Mayor Portal</span>
                                                </div>
                                                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                            </button>
                                        )}
                                        
                                        {isMonitor && (
                                            <button
                                                onClick={() => { setMenuOpen(false); setActiveView('monitor'); }}
                                                className="w-full flex items-center p-4 hover:bg-white/60 dark:hover:bg-gray-700/40 transition-colors active:bg-gray-100/50 dark:active:bg-gray-700/60 border-b border-gray-200/50 dark:border-gray-700/50 last:border-0 group"
                                            >
                                                <div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-sm mr-4 group-active:scale-95 transition-transform">
                                                    <MonitorIcon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <span className="block text-base font-medium text-gray-900 dark:text-white">Attendance Monitor</span>
                                                </div>
                                                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                            </button>
                                        )}

                                        {isTreasurer && (
                                            <a
                                                href={treasurerUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full flex items-center p-4 hover:bg-white/60 dark:hover:bg-gray-700/40 transition-colors active:bg-gray-100/50 dark:active:bg-gray-700/60 last:border-0 group"
                                                onClick={() => setMenuOpen(false)}
                                            >
                                                <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center text-white shadow-sm mr-4 group-active:scale-95 transition-transform">
                                                    <FundsIcon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <span className="block text-base font-medium text-gray-900 dark:text-white">Treasurer Portal</span>
                                                </div>
                                                <ExternalLinkIcon className="h-4 w-4 text-gray-400" />
                                            </a>
                                        )}
                                    </div>
                                </>
                            )}

                        </div>

                        {/* Footer */}
                        <div className="p-6">
                            <button
                                onClick={() => { setMenuOpen(false); onSignOut(); }}
                                disabled={isSigningOut}
                                className="w-full py-3.5 px-4 bg-red-500/10 dark:bg-red-500/20 hover:bg-red-500/20 dark:hover:bg-red-500/30 text-red-600 dark:text-red-400 rounded-2xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 border border-red-500/10"
                            >
                                {isSigningOut ? <Spinner className="h-5 w-5" /> : <LogoutIcon className="h-5 w-5" />}
                                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                            </button>
                            <div className="mt-4 text-center">
                                <p className="text-[10px] font-medium text-gray-400 dark:text-gray-600">
                                    BseePortal v1.2.0 (macOS Style)
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <header className="bg-white dark:bg-gray-800 shadow-sm z-40 relative transition-colors duration-300 h-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
                    <div className="flex justify-between items-center h-full">
                        
                        {/* Left: Logo */}
                        <div className="flex items-center">
                            <h1 
                                className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent cursor-pointer" 
                                onClick={() => setActiveView('homepage')}
                            >
                                BseePortal
                            </h1>
                        </div>

                        {/* Center: Search Bar (Desktop) */}
                        <div className="hidden md:flex flex-1 max-w-md mx-4 relative">
                            <div className="relative w-full group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-full leading-5 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-all shadow-inner"
                                    placeholder="Search users and posts..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setIsSearchActive(true)}
                                />
                            </div>
                            {isSearchActive && renderSearchDropdown()}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center space-x-1 md:space-x-3">
                            {/* Mobile Search Trigger */}
                            <button 
                                onClick={() => setMobileSearchOpen(true)}
                                className="md:hidden p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
                            >
                                <SearchIcon className="h-6 w-6" />
                            </button>

                            {/* Theme Toggle */}
                            <button 
                                onClick={toggleDarkMode} 
                                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors focus:outline-none"
                                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            >
                                {darkMode ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
                            </button>

                            {/* Chats (Mobile - Moved from bottom nav) */}
                            <button 
                                onClick={() => setActiveView('chats')}
                                className="md:hidden p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors relative focus:outline-none"
                            >
                                <ChatIcon className="h-6 w-6" />
                                {unreadChatCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 bg-red-500 text-[9px] text-white flex items-center justify-center font-bold"></span>
                                )}
                            </button>

                            {/* Notifications */}
                            <button 
                                onClick={() => setActiveView('notifications')}
                                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors relative focus:outline-none"
                            >
                                <BellIcon className="h-6 w-6" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-800 bg-red-500"></span>
                                )}
                            </button>

                            {/* User Menu */}
                            <button 
                                onClick={() => setMenuOpen(true)}
                                className="p-1 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors focus:outline-none ml-1"
                            >
                                {avatarUrl ? (
                                    <img className="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-gray-600" src={avatarUrl} alt="" />
                                ) : (
                                    <UserCircleIcon className="h-8 w-8 text-gray-400" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
};

export default Header;
