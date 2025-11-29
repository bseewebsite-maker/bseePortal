
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, db, firestore } from '../services';
import { Spinner } from './Spinner';
import type { Profile, Notification, Post } from '../types';
import Sidebar from './Sidebar';
import Header from './Header';
import ProfilePage from './ProfilePage';
import CalendarPage from './CalendarPage';
import FundsPage from './FundsPage';
import MayorPage from './MayorPage';
import AttendancePage from './AttendancePage';
import MonitorPage from './MonitorPage';
import NotificationsPage from './NotificationsPage';
import SettingsPage from './SettingsPage';
import FriendsPage from './FriendsPage';
import ChatsPage from './ChatsPage';
import AiAssistantPage from './AiAssistantPage';
import { CheckCircleIcon, ShieldCheckIcon, CheckIcon, GlobeIcon, LockClosedIcon, LogoutIcon } from './Icons';
import Feed from './Feed';
import PostDetailModal from './PostDetailModal';

type View = 'homepage' | 'calendar' | 'settings' | 'profile' | 'funds' | 'attendance' | 'mayor' | 'monitor' | 'notifications' | 'friends' | 'chats' | 'ai-assistant';
type Theme = string;

interface DashboardProps {
    session: Session;
    initialMessage?: string | null;
}

interface NotificationToastProps {
    title: string;
    message: string | null;
    onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ title, message, onClose }) => {
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300);
    }, [onClose]);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleClose();
        }, 5000);
        return () => {
            clearTimeout(timer);
        };
    }, [handleClose]);

    return (
        <div 
            className={`fixed top-4 right-4 z-[100] w-full max-w-sm bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden ${isClosing ? 'animate-fade-out-up' : 'animate-fade-in-up'}`}
            role="alert"
            aria-live="assertive"
        >
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <CheckCircleIcon className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
                        {message && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>}
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                        <button
                            onClick={handleClose}
                            className="bg-white dark:bg-gray-800 rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            <span className="sr-only">Close</span>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- App Terms Modal ---
const AppTermsModal: React.FC<{ onAgree: () => void; onDecline: () => void }> = ({ onAgree, onDecline }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in-up border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                        <ShieldCheckIcon className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Terms of Use</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Please accept to continue to BseePortal.</p>
                    </div>
                </div>
                
                <div className="p-6 overflow-y-auto text-sm text-gray-600 dark:text-gray-300 space-y-4 leading-relaxed">
                    <p className="font-semibold text-gray-900 dark:text-white">
                        Welcome! Before accessing your dashboard, you must agree to the following terms regarding the use of this application:
                    </p>
                    
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-4">
                        <div className="flex gap-3">
                            <ShieldCheckIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase mb-1">Official Use Only</h4>
                                <p>This portal is for official academic and administrative purposes. Misuse of the chat, funds, or attendance systems may result in disciplinary action.</p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <GlobeIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase mb-1">Data Processing</h4>
                                <p>We process your data (Student ID, Name, Activity) to provide portal features. Data is stored securely and is accessible only by authorized student officers and administrators.</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <LockClosedIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase mb-1">Account Security</h4>
                                <p>You are responsible for all activity under your account. Do not share your password or PIN with anyone.</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 italic">
                        By clicking "I Agree", you confirm that you have read and understood these terms.
                    </p>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between gap-3">
                    <button 
                        onClick={onDecline}
                        className="px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors flex items-center"
                    >
                        <LogoutIcon className="h-4 w-4 mr-2" />
                        Decline & Sign Out
                    </button>
                    <button 
                        onClick={onAgree}
                        className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95 flex items-center"
                    >
                        I Agree <CheckIcon className="h-4 w-4 ml-2" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const ProfileContent: React.FC<{ profile: Profile; user: User; onViewProfile: (p: Profile) => void }> = ({ profile, user, onViewProfile }) => {
    // Sanitization: ensure values are strings to avoid [object Object] errors
    const fullName = typeof profile.full_name === 'string' ? profile.full_name : 'Unknown User';
    
    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 transition-colors duration-300 mb-8">
                <h2 className="text-2xl font-light text-gray-700 dark:text-gray-300 mb-1">Welcome back,</h2>
                <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{fullName}</h3>
            </div>
            <Feed user={user} onViewProfile={onViewProfile} />
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ session, initialMessage }) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<View>('homepage');
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [toast, setToast] = useState<{title: string, message: string | null} | null>(null);
    const [calendarTheme, setCalendarTheme] = useState<Theme>('blue');
    const [mobileChatOpen, setMobileChatOpen] = useState(false);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    
    // Terms Check State (loaded from Firestore)
    const [hasAgreedToAppTerms, setHasAgreedToAppTerms] = useState<boolean | null>(null);
    
    // State to handle chat redirection and profile viewing
    const [selectedChatUser, setSelectedChatUser] = useState<Profile | null>(null);
    const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);
    const [lastActiveView, setLastActiveView] = useState<View>('homepage');

    // State for viewing a specific post (e.g. from search)
    const [viewingPost, setViewingPost] = useState<{ post: Post, author: Profile } | null>(null);

    // Ref for tracking previous unread count to avoid stale closures in useEffect
    const prevUnreadCountRef = useRef(0);

    // --- Presence Logic ---
    useEffect(() => {
        if (!session.user.id) return;

        const userStatusRef = db.collection('profiles').doc(session.user.id);

        // Helper to set status
        const setStatus = (isOnline: boolean) => {
            userStatusRef.update({
                is_online: isOnline,
                last_seen: firestore.FieldValue.serverTimestamp(),
            }).catch(err => console.error("Error updating presence:", err));
        };

        // Set online immediately on mount
        setStatus(true);

        // Heartbeat: Update 'last_seen' every 2 minutes to keep the user "active"
        // and enforce is_online: true in case it was accidentally cleared
        const heartbeatInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                setStatus(true);
            }
        }, 120000);

        // Handle visibility change (tab switch/minimize)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                setStatus(false);
            } else {
                setStatus(true);
            }
        };
        
        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Handle window close
        const handleBeforeUnload = () => {
             // Note: This is best-effort. Some browsers restrict async calls here.
             // We rely on the lack of heartbeat updates for the "offline" state eventually,
             // but this sets it explicitly if possible.
             setStatus(false);
        };
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            clearInterval(heartbeatInterval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("beforeunload", handleBeforeUnload);
            // Set offline on unmount (e.g. logout)
            setStatus(false);
        };
    }, [session.user.id]);
    // --- End Presence Logic ---

    // --- Terms Check Listener (Firestore) ---
    useEffect(() => {
        if (!session.user.id) return;
        const unsubscribe = db.collection('profiles').doc(session.user.id).onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                setHasAgreedToAppTerms(data?.terms_accepted_app === true);
            } else {
                // If doc doesn't exist yet, we assume they haven't accepted
                setHasAgreedToAppTerms(false);
            }
        });
        return () => unsubscribe();
    }, [session.user.id]);

    useEffect(() => {
        if (initialMessage) {
            setToast({ title: "Success", message: initialMessage });
        }
    }, [initialMessage]);

    useEffect(() => {
        const getProfile = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    throw error;
                }

                if (data) {
                    // Ensure email is populated from session if missing in DB
                    const profileWithEmail = {
                        ...data,
                        email: data.email || session.user.email
                    };
                    setProfile(profileWithEmail);
                    
                    if (data.calendar_theme) {
                        setCalendarTheme(data.calendar_theme as Theme);
                    }
                }
            } catch (error: any) {
                console.error('Error loading user data:', error.message);
            } finally {
                setLoading(false);
            }
        };

        getProfile();
        
        // Real-time notifications listener
        const unsubscribeNotifs = db.collection('notifications')
            .where('user_id', '==', session.user.id)
            .orderBy('created_at', 'desc')
            .onSnapshot(snapshot => {
                const notifs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Notification[];
                
                const currentUnreadCount = notifs.filter(n => !n.is_read).length;
                
                // Check using Ref to avoid stale closure
                if (currentUnreadCount > prevUnreadCountRef.current && notifs.length > 0) {
                   const latest = notifs[0];
                   if (!latest.is_read) {
                       setToast({ title: latest.title, message: latest.message || null });
                   }
                }
                
                prevUnreadCountRef.current = currentUnreadCount;
                setNotifications(notifs);
            });

        // Real-time chat unread count listener
        const unsubscribeChats = db.collection('conversations')
            .where('participants', 'array-contains', session.user.id)
            .onSnapshot(snapshot => {
                let count = 0;
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const userUnread = data[`unread_${session.user.id}`];
                    if (typeof userUnread === 'number') {
                        count += userUnread;
                    }
                });
                setUnreadChatCount(count);
            });

        return () => {
            unsubscribeNotifs();
            unsubscribeChats();
        };
    }, [session.user.id]);

    const handleSignOut = async () => {
        setIsSigningOut(true);
        try {
            // Set offline status before signing out
             await db.collection('profiles').doc(session.user.id).update({
                is_online: false,
                last_seen: firestore.FieldValue.serverTimestamp(),
            });

            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error: any) {
            console.error('Error signing out:', error.message);
        } finally {
            setIsSigningOut(false);
        }
    };
    
    // Terms Handlers
    const handleAgreeTerms = async () => {
        try {
            // Save to Firestore
            await db.collection('profiles').doc(session.user.id).set({
                terms_accepted_app: true
            }, { merge: true });
            
            // Also sync to Supabase profile just in case
            await supabase.from('profiles').update({ terms_accepted_app: true }).eq('id', session.user.id);
            
            setHasAgreedToAppTerms(true);
        } catch (error) {
            console.error("Error accepting terms:", error);
            setToast({ title: "Error", message: "Failed to save consent. Please try again." });
        }
    };

    const handleDeclineTerms = () => {
        handleSignOut();
    };
    
    const updateProfile = (updates: Partial<Profile>) => {
        if (profile) {
            setProfile({ ...profile, ...updates });
        }
    };

    const handleThemeChange = async (theme: Theme) => {
        setCalendarTheme(theme);
        if (profile) {
            await supabase.from('profiles').update({ calendar_theme: theme }).eq('id', profile.id);
            updateProfile({ calendar_theme: theme });
        }
    };

    const handleMarkAsRead = async () => {
        const batch = db.batch();
        notifications.forEach(n => {
            if (!n.is_read) {
                const ref = db.collection('notifications').doc(n.id);
                batch.update(ref, { is_read: true });
            }
        });
        await batch.commit();
    };

    const handleDeleteRead = async () => {
        const batch = db.batch();
        notifications.forEach(n => {
            if (n.is_read) {
                const ref = db.collection('notifications').doc(n.id);
                batch.delete(ref);
            }
        });
        await batch.commit();
    };

    const handleChatStart = (targetUser: Profile) => {
        setSelectedChatUser(targetUser);
        setActiveView('chats');
    };

    const handleViewUserProfile = (targetProfile: Profile) => {
        if (targetProfile.id === session.user.id) {
            setViewingProfile(null);
            setActiveView('profile');
        } else {
            setLastActiveView(activeView);
            setViewingProfile(targetProfile);
            setActiveView('profile');
        }
    };

    const handleBackFromProfile = () => {
        setActiveView(lastActiveView);
        setViewingProfile(null);
    };

    const handleNotificationClick = async (notification: Notification) => {
        // Mark as read immediately
        if (!notification.is_read) {
            db.collection('notifications').doc(notification.id).update({ is_read: true });
        }

        // Navigation logic based on type
        // Added reaction and comment support
        if (['mention', 'reaction', 'comment'].includes(notification.notification_type || '') && notification.event_id) {
             setLoading(true);
             try {
                 const postDoc = await db.collection('posts').doc(notification.event_id).get();
                 if (postDoc.exists) {
                     const postData = { id: postDoc.id, ...postDoc.data() } as Post;
                     const authorDoc = await db.collection('profiles').doc(postData.userId).get();
                     const authorData = authorDoc.exists ? ({ id: authorDoc.id, ...authorDoc.data() } as Profile) : { id: postData.userId, full_name: 'Unknown' } as Profile;
                     
                     setViewingPost({ post: postData, author: authorData });
                 } else {
                     setToast({ title: "Unavailable", message: "This post no longer exists." });
                 }
             } catch (e) {
                 console.error("Error opening post", e);
                 setToast({ title: "Error", message: "Failed to open post." });
             } finally {
                 setLoading(false);
             }
        } else if (notification.notification_type === 'friend_request') {
            setActiveView('friends');
        } else if (notification.notification_type === 'friend_request_accepted') {
             // Redirect to profile of the user (if we had a way to fetch it easily) or friends list
             setActiveView('friends');
        } else if (notification.notification_type === 'new_event' || notification.notification_type === 'event_reminder') {
            setActiveView('calendar');
        }
    };

    const handleViewPost = (post: Post, author: Profile) => {
        setViewingPost({ post, author });
    };

    if (loading || hasAgreedToAppTerms === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Spinner className="text-blue-600 h-10 w-10" />
            </div>
        );
    }

    // Logic for full-screen and chrome visibility:
    // 1. paddingFreeViews: These views take up the entire main container (no padding).
    // 2. immersiveViews: These views hide the dashboard chrome (Header + Bottom Nav).
    //    - 'chats' is unique: It's padding-free always, but only immersive when inside a conversation (mobileChatOpen).
    
    const paddingFreeViews = ['chats', 'ai-assistant', 'settings', 'profile'];
    const immersiveViews = ['ai-assistant', 'settings', 'profile'];

    const isPaddingFree = paddingFreeViews.includes(activeView);
    // Hide Chrome (Nav/Header) if in immersive view OR if inside a chat conversation
    const shouldHideChrome = immersiveViews.includes(activeView) || (activeView === 'chats' && mobileChatOpen);

    // Apply padding for all views EXCEPT full-screen ones.
    const mainClasses = isPaddingFree
        ? "flex-1 overflow-hidden bg-gray-100 dark:bg-gray-900 p-0 relative" 
        : "flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 pb-32 md:p-8 scroll-smooth transition-colors duration-300";

    return (
        <div className="flex h-screen h-[100dvh] bg-gray-100 dark:bg-gray-900 font-sans overflow-hidden transition-colors duration-300">
            {/* Blocking Modal for Terms & Conditions */}
            {!hasAgreedToAppTerms && (
                <AppTermsModal onAgree={handleAgreeTerms} onDecline={handleDeclineTerms} />
            )}

            {toast && (
                <NotificationToast 
                    title={toast.title} 
                    message={toast.message} 
                    onClose={() => setToast(null)} 
                />
            )}

            {/* Global Post Viewer Modal for Unified Search */}
            <PostDetailModal
                isOpen={!!viewingPost}
                onClose={() => setViewingPost(null)}
                post={viewingPost?.post || null}
                author={viewingPost?.author || null}
                currentUser={session.user}
                currentUserProfile={profile || undefined}
                onViewProfile={(p) => {
                    setViewingPost(null);
                    handleViewUserProfile(p);
                }}
            />

            <Sidebar 
                activeView={activeView} 
                setActiveView={(view) => {
                    if (view === 'profile') {
                        setViewingProfile(null);
                    }
                    if (view === 'chats') {
                        setSelectedChatUser(null);
                    }
                    setActiveView(view);
                }} 
                profile={profile} 
                hideMobileNav={shouldHideChrome}
                unreadChatCount={unreadChatCount}
            />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className={shouldHideChrome ? 'hidden md:block' : 'block'}>
                    <Header 
                        profile={profile} 
                        setActiveView={setActiveView} 
                        onSignOut={handleSignOut} 
                        isSigningOut={isSigningOut}
                        notifications={notifications}
                        unreadChatCount={unreadChatCount}
                        onMarkAsRead={handleMarkAsRead}
                        onDeleteRead={handleDeleteRead}
                        onViewProfile={handleViewUserProfile}
                        onViewPost={handleViewPost}
                    />
                </div>

                <main className={mainClasses}>
                    {activeView === 'homepage' && profile && <ProfileContent profile={profile} user={session.user} onViewProfile={handleViewUserProfile} />}
                    
                    {activeView === 'profile' && profile && (
                        <ProfilePage 
                            profile={viewingProfile || profile} 
                            user={session.user} 
                            currentUserProfile={profile} // Pass this explicitly for role checking
                            onProfileUpdate={updateProfile} 
                            isOwnProfile={!viewingProfile}
                            onBack={() => {
                                if (viewingProfile) {
                                    handleBackFromProfile();
                                } else {
                                    setActiveView('homepage');
                                }
                            }}
                            onMessage={handleChatStart}
                            onViewProfile={handleViewUserProfile}
                        />
                    )}
                    
                    {activeView === 'calendar' && profile && (
                        <CalendarPage user={session.user} theme={calendarTheme} onThemeChange={handleThemeChange} />
                    )}
                    
                    {activeView === 'funds' && profile && (
                        <FundsPage profile={profile} />
                    )}
                    
                    {activeView === 'attendance' && (
                        <AttendancePage user={session.user} />
                    )}
                    
                    {activeView === 'mayor' && profile?.role === 'mayor' && (
                        <MayorPage onViewProfile={handleViewUserProfile} />
                    )}

                    {activeView === 'monitor' && (profile?.role === 'monitor' || profile?.role === 'mayor') && (
                        <MonitorPage user={session.user} onViewProfile={handleViewUserProfile} />
                    )}

                    {activeView === 'settings' && profile && (
                        <SettingsPage 
                            profile={profile} 
                            setActiveView={setActiveView} 
                            onProfileUpdate={updateProfile}
                            onBack={() => setActiveView('homepage')}
                        />
                    )}

                    {activeView === 'notifications' && (
                        <NotificationsPage 
                            notifications={notifications} 
                            onMarkAsRead={handleMarkAsRead}
                            onDeleteRead={handleDeleteRead}
                            onNotificationClick={handleNotificationClick}
                        />
                    )}

                    {activeView === 'friends' && profile && (
                        <FriendsPage 
                            user={session.user} 
                            currentUserProfile={profile}
                            initialTab={'friends'} 
                            onChatStart={handleChatStart}
                            onViewProfile={handleViewUserProfile}
                        />
                    )}

                    {activeView === 'chats' && (
                        <ChatsPage 
                            key={selectedChatUser ? selectedChatUser.id : 'chats-list'}
                            user={session.user} 
                            initialChatUser={selectedChatUser} 
                            onMobileChatOpen={setMobileChatOpen}
                            onViewProfile={handleViewUserProfile}
                            onSwitchToFriends={() => setActiveView('friends')}
                        />
                    )}

                    {activeView === 'ai-assistant' && profile && (
                        <AiAssistantPage 
                            user={session.user} 
                            profile={profile} 
                            onBack={() => setActiveView('homepage')}
                        />
                    )}
                </main>
            </div>
        </div>
    );
};

export default Dashboard;
