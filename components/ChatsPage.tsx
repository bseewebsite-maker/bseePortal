
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db, firestore } from '../services';
import type { Profile, ChatMessage } from '../types';
import { Spinner } from './Spinner';
import { 
    PaperAirplaneIcon, 
    ChatIcon, 
    ChevronLeftIcon, 
    ReplyIcon, 
    ForwardIcon, 
    DotsHorizontalIcon, 
    PencilIcon, 
    TrashIcon, 
    XIcon, 
    ClipboardIcon, 
    PaletteIcon, 
    BookmarkIcon, 
    CheckIcon, 
    SearchIcon,
    EmojiIcon,
    PinIcon,
    UnpinIcon,
    EyeOffIcon,
    ShieldCheckIcon,
    LockClosedIcon,
    DoubleCheckIcon,
    EyeIcon,
    BanIcon,
    PlusIcon,
    UsersIcon,
    ThumbUpIcon
} from './Icons';
import ConfirmationModal from './ConfirmationModal';
import ReactionsModal from './ReactionsModal';

interface ChatsPageProps {
    user: { id: string };
    initialChatUser?: Profile | null;
    onMobileChatOpen?: (isOpen: boolean) => void;
    onViewProfile: (profile: Profile) => void;
    onSwitchToFriends?: () => void;
}

interface BookmarkedMessage {
    id: string;
    text: string;
    senderId: string;
    createdAt?: any;
}

interface Conversation {
    id: string;
    participants: string[];
    lastMessage: string;
    lastMessageTimestamp: any;
    theme?: string;
    bookmarkedMessages?: BookmarkedMessage[];
    clearedHistoryAt?: { [userId: string]: any };
    blockedBy?: string[]; // Array of userIds who blocked this chat
    deletedBy?: string[]; // Array of userIds who soft-deleted this chat
    pinnedMessage?: {
        id: string;
        text: string;
        senderId: string;
    } | null;
    pinnedBy?: string[];
    [key: string]: any; // For dynamic keys like pinned_USERID, unread_USERID
}

interface SwipeState {
    id: string | null;
    startX: number;
    startY: number;
    offset: number;
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const EXTENDED_EMOJIS = [
    '👍', '👎', '❤️', '🔥', '😂', '😮', '😢', '😡', '🎉', '👏', '👀', '🧠', 
    '👋', '🙌', '🤝', '✨', '🌟', '💯', '✅', '❌', '🤔', '🙄', '😬'
];

const CHAT_THEMES: { [key: string]: { name: string, bg: string, sendBtn: string, text: string, indicator: string, gradient: string, backgroundUrl?: string } } = {
    default: { 
        name: 'Classic Blue', 
        bg: 'bg-blue-600', 
        sendBtn: 'bg-blue-600', 
        text: 'text-white', 
        indicator: 'text-blue-600',
        gradient: 'from-blue-500 to-blue-700',
        backgroundUrl: ''
    },
    ocean: { 
        name: 'Ocean', 
        bg: 'bg-cyan-600', 
        sendBtn: 'bg-cyan-600', 
        text: 'text-white', 
        indicator: 'text-cyan-600',
        gradient: 'from-cyan-400 to-cyan-600',
        backgroundUrl: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=2070&auto=format&fit=crop'
    },
    sunset: { 
        name: 'Sunset', 
        bg: 'bg-orange-500', 
        sendBtn: 'bg-orange-500', 
        text: 'text-white', 
        indicator: 'text-orange-500',
        gradient: 'from-orange-400 to-orange-600',
        backgroundUrl: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9d856?q=80&w=3134&auto=format&fit=crop'
    },
    berry: { 
        name: 'Berry', 
        bg: 'bg-purple-600', 
        sendBtn: 'bg-purple-600', 
        text: 'text-white', 
        indicator: 'text-purple-600',
        gradient: 'from-purple-500 to-purple-700',
        backgroundUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop'
    },
    jungle: { 
        name: 'Jungle', 
        bg: 'bg-emerald-600', 
        sendBtn: 'bg-emerald-600', 
        text: 'text-white', 
        indicator: 'text-emerald-600',
        gradient: 'from-emerald-500 to-emerald-700',
        backgroundUrl: 'https://images.unsplash.com/photo-1448375240586-dfd8f3793300?q=80&w=2070&auto=format&fit=crop'
    },
    midnight: { 
        name: 'Midnight', 
        bg: 'bg-gray-800', 
        sendBtn: 'bg-gray-900', 
        text: 'text-white', 
        indicator: 'text-gray-800',
        gradient: 'from-gray-700 to-gray-900',
        backgroundUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=2013&auto=format&fit=crop'
    },
    rose: {
        name: 'Rose',
        bg: 'bg-rose-500',
        sendBtn: 'bg-rose-500',
        text: 'text-white', 
        indicator: 'text-rose-500',
        gradient: 'from-rose-400 to-rose-600',
        backgroundUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=2073&auto=format&fit=crop'
    },
    slate: {
        name: 'Slate',
        bg: 'bg-slate-600',
        sendBtn: 'bg-slate-600',
        text: 'text-white', 
        indicator: 'text-slate-600',
        gradient: 'from-slate-500 to-slate-700',
        backgroundUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1964&auto=format&fit=crop'
    },
    amber: {
        name: 'Amber',
        bg: 'bg-amber-500',
        sendBtn: 'bg-amber-500',
        text: 'text-white', 
        indicator: 'text-amber-500',
        gradient: 'from-amber-400 to-amber-600',
        backgroundUrl: 'https://images.unsplash.com/photo-1500964757637-c85e8a162699?q=80&w=2103&auto=format&fit=crop'
    },
    teal: {
        name: 'Teal',
        bg: 'bg-teal-500',
        sendBtn: 'bg-teal-500',
        text: 'text-white', 
        indicator: 'text-teal-500',
        gradient: 'from-teal-400 to-teal-600',
        backgroundUrl: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?q=80&w=1974&auto=format&fit=crop'
    },
    indigo: {
        name: 'Indigo',
        bg: 'bg-indigo-600',
        sendBtn: 'bg-indigo-600',
        text: 'text-white', 
        indicator: 'text-indigo-600',
        gradient: 'from-indigo-500 to-indigo-700',
        backgroundUrl: 'https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?q=80&w=2029&auto=format&fit=crop'
    },
    neon: {
        name: 'Neon',
        bg: 'bg-fuchsia-600',
        sendBtn: 'bg-fuchsia-600',
        text: 'text-white', 
        indicator: 'text-fuchsia-600',
        gradient: 'from-fuchsia-500 to-fuchsia-700',
        backgroundUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=2070&auto=format&fit=crop'
    },
    sky: {
        name: 'Sky',
        bg: 'bg-sky-500',
        sendBtn: 'bg-sky-500',
        text: 'text-white', 
        indicator: 'text-sky-500',
        gradient: 'from-sky-300 to-sky-500',
        backgroundUrl: 'https://images.unsplash.com/photo-1595878715977-2e8f8df18ea8?q=80&w=2134&auto=format&fit=crop'
    },
    cherry: {
        name: 'Cherry',
        bg: 'bg-red-600',
        sendBtn: 'bg-red-600',
        text: 'text-white', 
        indicator: 'text-red-600',
        gradient: 'from-red-500 to-red-700',
        backgroundUrl: 'https://images.unsplash.com/photo-1528372962874-37072493478a?q=80&w=1939&auto=format&fit=crop'
    },
    lavender: {
        name: 'Lavender',
        bg: 'bg-violet-400',
        sendBtn: 'bg-violet-400',
        text: 'text-white', 
        indicator: 'text-violet-400',
        gradient: 'from-violet-300 to-violet-500',
        backgroundUrl: 'https://images.unsplash.com/photo-1499695867787-121ff9795b3e?q=80&w=2070&auto=format&fit=crop'
    },
    royal: {
        name: 'Royal',
        bg: 'bg-yellow-600',
        sendBtn: 'bg-yellow-600',
        text: 'text-white', 
        indicator: 'text-yellow-600',
        gradient: 'from-yellow-500 to-yellow-700',
        backgroundUrl: 'https://images.unsplash.com/photo-1507646227500-4d389b0012be?q=80&w=2000&auto=format&fit=crop'
    }
};

// --- Helper Components ---

const DateSeparator: React.FC<{ date: Date }> = ({ date }) => {
    const formatDate = (d: Date) => {
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = d.toDateString() === yesterday.toDateString();

        if (isToday) return 'Today';
        if (isYesterday) return 'Yesterday';
        return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: now.getFullYear() !== d.getFullYear() ? 'numeric' : undefined });
    };

    return (
        <div className="flex justify-center my-4 relative z-10">
            <span className="text-xs font-medium text-gray-500 bg-gray-100/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-gray-200/50">
                {formatDate(date)}
            </span>
        </div>
    );
};

const ReactionDetailsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    emoji: string;
    userIds: string[];
    profilesMap: { [key: string]: Profile };
    currentUserId: string;
}> = ({ isOpen, onClose, emoji, userIds, profilesMap, currentUserId }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-xs rounded-xl shadow-xl overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <span className="text-xl mr-2">{emoji}</span> Reactions
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200"><XIcon className="h-5 w-5 text-gray-400" /></button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                    {userIds.map(id => {
                        const profile = profilesMap[id];
                        const name = id === currentUserId ? 'You' : (profile?.full_name || 'Unknown User');
                        return (
                            <div key={id} className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                                <img 
                                    src={profile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${name}`} 
                                    className="h-8 w-8 rounded-full bg-gray-200 object-cover"
                                    alt=""
                                />
                                <span className="ml-3 text-sm font-medium text-gray-700">{name}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

const ForwardModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    conversations: Conversation[];
    profilesMap: { [key: string]: Profile };
    currentUserId: string;
    onForward: (targetConvId: string) => void;
}> = ({ isOpen, onClose, conversations, profilesMap, currentUserId, onForward }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[80] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Forward Message</h3>
                    <button onClick={onClose}><XIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {conversations.map(conv => {
                        // Extract partner ID from conversation ID for better resilience
                        let partnerId = null;
                        if (conv.id && conv.id.includes('_')) {
                            const parts = conv.id.split('_');
                            partnerId = parts.find(p => p !== currentUserId);
                        } else {
                            partnerId = conv.participants.find(p => p !== currentUserId);
                        }
                        
                        const partner = partnerId ? profilesMap[partnerId] : null;
                        const partnerName = partner ? partner.full_name : 'Unknown User';

                        return (
                            <button 
                                key={conv.id}
                                onClick={() => onForward(conv.id)}
                                className="w-full flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                            >
                                <img 
                                    src={partner?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${partnerName}`} 
                                    className="h-10 w-10 rounded-full bg-gray-200 object-cover"
                                    alt=""
                                />
                                <span className="ml-3 font-medium text-gray-800 truncate flex-1">{partnerName}</span>
                                <ForwardIcon className="h-4 w-4 text-gray-400" />
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}

const BookmarkedMessagesModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    bookmarks: BookmarkedMessage[];
    onNavigate: (messageId: string) => void;
    onRemove: (bookmark: BookmarkedMessage) => void;
}> = ({ isOpen, onClose, bookmarks, onNavigate, onRemove }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[90] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-fade-in-up" onClick={e => e.stopPropagation()}>
                 <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <BookmarkIcon className="h-5 w-5 text-blue-600 mr-2" />
                        Saved Messages
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 transition-colors"><XIcon className="h-5 w-5 text-gray-500" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                    {bookmarks.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>No saved messages.</p>
                        </div>
                    ) : (
                        bookmarks.map(bm => (
                            <div 
                                key={bm.id} 
                                onClick={() => onNavigate(bm.id)}
                                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:border-blue-200 transition-all active:scale-[0.98] relative group select-none"
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove(bm);
                                    }}
                                    className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                    title="Remove bookmark"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                                <p className="text-sm text-gray-800 line-clamp-3 pr-6">{bm.text}</p>
                                <div className="mt-2 flex justify-end">
                                    <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">Go to message</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const ThemeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    currentTheme: string;
    onSelectTheme: (themeKey: string) => void;
}> = ({ isOpen, onClose, currentTheme, onSelectTheme }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[90] flex justify-center items-end sm:items-center p-0 sm:p-4 transition-opacity" onClick={onClose}>
            <div 
                className="bg-white w-full sm:max-w-4xl rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up max-h-[85vh] sm:max-h-[80vh] flex flex-col" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Customize Chat</h3>
                        <p className="text-xs text-gray-500 hidden sm:block">Select a theme to personalize this conversation</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><XIcon className="h-5 w-5 text-gray-600" /></button>
                </div>
                
                <div className="p-4 sm:p-6 overflow-y-auto bg-gray-50/50">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                        {Object.entries(CHAT_THEMES).map(([key, theme]) => (
                            <button
                                key={key}
                                onClick={() => onSelectTheme(key)}
                                className={`relative aspect-[4/5] rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-3 hover:shadow-lg overflow-hidden group bg-white ${
                                    currentTheme === key ? 'border-blue-50 ring-2 ring-blue-200 ring-offset-1' : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                {theme.backgroundUrl ? (
                                    <div 
                                        className="absolute inset-0 opacity-60 group-hover:opacity-70 transition-opacity"
                                        style={{ backgroundImage: `url(${theme.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                                    ></div>
                                ) : (
                                    <div className="absolute inset-0 bg-gray-50"></div>
                                )}
                                
                                {/* Preview Bubble with Gradient */}
                                <div className={`h-14 w-14 rounded-full bg-gradient-to-br ${theme.gradient} shadow-lg z-10 relative ring-4 ring-white/80 transform group-hover:scale-110 transition-transform duration-300 flex items-center justify-center`}>
                                    {currentTheme === key && <CheckIcon className="h-6 w-6 text-white" />}
                                </div>
                                
                                <span className="text-sm font-bold text-gray-800 z-10 relative px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full shadow-sm">{theme.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ChatsPage: React.FC<ChatsPageProps> = ({ user, initialChatUser, onMobileChatOpen, onViewProfile, onSwitchToFriends }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    
    // Active conversation metadata
    const [activeConversationMeta, setActiveConversationMeta] = useState<Conversation | null>(null);
    
    const [profilesMap, setProfilesMap] = useState<{ [key: string]: Profile }>({});
    const [activePartnerProfile, setActivePartnerProfile] = useState<Profile | null>(null);
    
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [newMessageText, setNewMessageText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sidebar Search State
    const [sidebarSearchTerm, setSidebarSearchTerm] = useState('');

    // Feature States
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
    const [forwardingMessage, setForwardingMessage] = useState<ChatMessage | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    
    // Theme State
    const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

    // Search State (In Conversation)
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Bookmarks State
    const [isBookmarksModalOpen, setIsBookmarksModalOpen] = useState(false);

    // Emoji Picker State
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

    // Message Delete Modal States
    const [messageToDeleteId, setMessageToDeleteId] = useState<string | null>(null);
    const [isDeletingMessage, setIsDeletingMessage] = useState(false);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Swipe State
    const [swipeState, setSwipeState] = useState<SwipeState>({ id: null, startX: 0, startY: 0, offset: 0 });

    // Conversation Options States
    const [isConversationMenuOpen, setIsConversationMenuOpen] = useState(false);
    const [isDeleteConversationModalOpen, setIsDeleteConversationModalOpen] = useState(false);
    const [isDeletingConversation, setIsDeletingConversation] = useState(false);
    const [conversationToDeleteId, setConversationToDeleteId] = useState<string | null>(null);
    
    // Context Menu (Long Press) State
    const [contextMenuConversationId, setContextMenuConversationId] = useState<string | null>(null);
    const conversationLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Highlight state
    const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

    // Reaction Viewer State
    const [viewingReaction, setViewingReaction] = useState<{ emoji: string, userIds: string[] } | null>(null);

    const activeMessage = useMemo(() => messages.find(m => m.id === activeMenuId), [messages, activeMenuId]);
    
    const currentConversation = useMemo(() => 
        conversations.find(c => c.id === selectedConversationId), 
    [conversations, selectedConversationId]);

    const activeTheme = CHAT_THEMES[activeConversationMeta?.theme || currentConversation?.theme || 'default'] || CHAT_THEMES.default;

    // Helper function to get partner profile
    const getConversationPartner = (conv: Conversation) => {
        // 1. Try to get partner from the immutable conversation ID (format: uid1_uid2)
        // This ensures we still see the name even if the other user deleted the chat (left participants)
        let partnerId: string | undefined;
        
        if (conv.id && conv.id.includes('_')) {
            const parts = conv.id.split('_');
            partnerId = parts.find(p => p !== user.id);
        }

        if (!partnerId && conv.participants && Array.isArray(conv.participants)) {
             partnerId = conv.participants.find(p => p !== user.id);
        }

        if (partnerId) {
            // If profile exists in map, return it.
            if (profilesMap[partnerId]) {
                return profilesMap[partnerId];
            }
            // If not in map (but we have ID), return a partial profile to avoid "Unknown"
            // The listener will eventually update it if found, but this prevents 'Unknown' if user deleted chat but not profile.
            // If the user deleted their account, it will truly be unknown unless cached.
            return {
                id: partnerId,
                full_name: 'Loading User...',
                avatar_url: undefined,
                role: 'user',
                student_id: '...'
            } as Profile;
        }
        
        return null;
    };

    useEffect(() => {
        if (initialChatUser) {
            const convId = [user.id, initialChatUser.id].sort().join('_');
            setSelectedConversationId(convId);
            setProfilesMap(prev => ({ ...prev, [initialChatUser.id]: initialChatUser }));
        }
    }, [initialChatUser, user.id]);

    useEffect(() => {
        if (onMobileChatOpen) {
            const timeout = setTimeout(() => {
                onMobileChatOpen(!!selectedConversationId);
            }, 0);
            return () => clearTimeout(timeout);
        }
    }, [selectedConversationId, onMobileChatOpen]);

    // Auto-resize effect for textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [newMessageText]);

    useEffect(() => {
        const unsubscribe = db.collection('profiles').onSnapshot(snapshot => {
            const profilesData: {[key: string]: Profile} = {};
            snapshot.docs.forEach(doc => {
                profilesData[doc.id] = { id: doc.id, ...doc.data() } as Profile;
            });
            setProfilesMap(prev => ({ ...prev, ...profilesData }));
        });
        return () => unsubscribe();
    }, []);

    // Listener for Conversation List
    useEffect(() => {
        const unsubscribe = db.collection('conversations')
            .where('participants', 'array-contains', user.id)
            .onSnapshot(async (snapshot) => {
                const convs = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() })) as Conversation[];
                
                // Filter out conversations that the user has "soft deleted"
                const visibleConvs = convs.filter(c => !c.deletedBy?.includes(user.id));

                // Sorting Logic: Pinned first, then Timestamp
                visibleConvs.sort((a, b) => {
                    const aPinned = a.pinnedBy?.includes(user.id);
                    const bPinned = b.pinnedBy?.includes(user.id);
                    if (aPinned && !bPinned) return -1;
                    if (!aPinned && bPinned) return 1;

                    const getMillis = (t: any) => {
                        if (!t) return Date.now();
                        if (typeof t.toDate === 'function') return t.toDate().getTime();
                        if (t instanceof Date) return t.getTime();
                        return 0; 
                    };
                    return getMillis(b.lastMessageTimestamp) - getMillis(a.lastMessageTimestamp);
                });
                setConversations(visibleConvs);
                setLoadingConversations(false);
            });
        return () => unsubscribe();
    }, [user.id]);

    // Listener for Active Conversation Metadata
    useEffect(() => {
        if (!selectedConversationId) {
            setActivePartnerProfile(null);
            setIsConversationMenuOpen(false);
            setIsSearchOpen(false);
            setSearchQuery('');
            setActiveConversationMeta(null);
            return;
        }

        const partnerId = selectedConversationId.split('_').find(id => id !== user.id);
        if (partnerId) {
            // Try to get from map first
            if (profilesMap[partnerId]) {
                setActivePartnerProfile(profilesMap[partnerId]);
            }
            
            // Also fetch fresh
            db.collection('profiles').doc(partnerId).get().then((doc) => {
                if (doc.exists) {
                    setActivePartnerProfile({ id: doc.id, ...doc.data() } as Profile);
                }
            });
        }

        const unsubscribe = db.collection('conversations').doc(selectedConversationId).onSnapshot(doc => {
            if (doc.exists) {
                setActiveConversationMeta({ id: doc.id, ...doc.data() } as Conversation);
            }
        });
        return () => unsubscribe();
    }, [selectedConversationId, user.id, profilesMap]);

    // Listener for Messages
    useEffect(() => {
        if (!selectedConversationId) return;
        
        setLoadingMessages(true);
        setReplyingTo(null);
        setEditingMessage(null);
        setNewMessageText('');
        setActiveMenuId(null);
        setIsEmojiPickerOpen(false);
        
        const unsubscribe = db.collection('conversations')
            .doc(selectedConversationId)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .onSnapshot(snapshot => {
                const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatMessage[];
                setMessages(msgs);
                setLoadingMessages(false);
                
                // Reset conversation unread count for current user
                const conv = conversations.find(c => c.id === selectedConversationId);
                const myUnread = conv ? conv[`unread_${user.id}`] : 0;
                if (myUnread > 0) {
                    db.collection('conversations').doc(selectedConversationId).update({
                        [`unread_${user.id}`]: 0
                    });
                }

                // --- READ RECEIPT LOGIC ---
                // Mark individual messages from partner as read
                const batch = db.batch();
                let updatesCount = 0;
                
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    // If I am NOT the sender, and it is NOT read, then I read it.
                    if (data.senderId !== user.id && !data.read) {
                        batch.update(doc.ref, { read: true });
                        updatesCount++;
                    }
                });
                
                if (updatesCount > 0) {
                    batch.commit().catch(err => console.error("Error marking read:", err));
                }
            });

        return () => unsubscribe();
    }, [selectedConversationId, user.id]); 

    // Filter Messages
    const displayedMessages = useMemo(() => {
        const clearTime = activeConversationMeta?.clearedHistoryAt?.[user.id];
        if (!clearTime) return messages;
        
        let clearDate: Date;
        // Handle Firestore Timestamp or Date object or ISO string
        if ((clearTime as any).toDate) {
             clearDate = (clearTime as any).toDate();
        } else if (clearTime instanceof Date) {
             clearDate = clearTime;
        } else {
             clearDate = new Date(clearTime);
        }
        
        return messages.filter(m => {
            if (!m.createdAt) return true; // Keep optimistic messages (sending...)
            let msgDate: Date;
            if ((m.createdAt as any).toDate) {
                msgDate = (m.createdAt as any).toDate();
            } else if (m.createdAt instanceof Date) {
                msgDate = m.createdAt;
            } else {
                msgDate = new Date(m.createdAt as any);
            }
            return msgDate > clearDate;
        });
    }, [messages, activeConversationMeta, user.id]);

    useEffect(() => {
        scrollToBottom();
    }, [displayedMessages, selectedConversationId]);

    // Close emoji picker
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (isEmojiPickerOpen && !target.closest('.emoji-picker-container') && !target.closest('.emoji-trigger')) {
                setIsEmojiPickerOpen(false);
            }
            if (isConversationMenuOpen && !target.closest('.conversation-menu-container')) {
                setIsConversationMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isEmojiPickerOpen, isConversationMenuOpen]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const scrollToMessage = (messageId: string) => {
        const el = document.getElementById(`message-${messageId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedMessageId(messageId);
            setTimeout(() => setHighlightedMessageId(null), 2000);
        }
    };

    // --- Chat Actions ---

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessageText.trim() || !selectedConversationId) return;

        if (activeConversationMeta?.blockedBy?.includes(user.id)) {
            alert("You have blocked this user. Unblock to send messages.");
            return;
        }

        const text = newMessageText.trim();
        const participantId = selectedConversationId.split('_').find(id => id !== user.id);
        if (!participantId) return;

        try {
            if (editingMessage) {
                await db.collection('conversations')
                    .doc(selectedConversationId)
                    .collection('messages')
                    .doc(editingMessage.id)
                    .update({
                        text: text,
                        isEdited: true,
                        originalText: editingMessage.originalText || editingMessage.text
                    });
                setEditingMessage(null);
            } else {
                const messageData: any = {
                    text,
                    senderId: user.id,
                    createdAt: firestore.FieldValue.serverTimestamp(),
                    isForwarded: false
                };
                
                if (replyingTo) {
                    const replySender = profilesMap[replyingTo.senderId]?.full_name || 'User';
                    messageData.replyTo = {
                        id: replyingTo.id,
                        text: replyingTo.text,
                        senderName: replySender
                    };
                }

                await db.collection('conversations')
                    .doc(selectedConversationId)
                    .collection('messages')
                    .add(messageData);

                // Update main document, resetting deletedBy so chat resurfaces
                await db.collection('conversations').doc(selectedConversationId).set({
                    participants: [user.id, participantId],
                    lastMessage: text,
                    lastMessageTimestamp: firestore.FieldValue.serverTimestamp(),
                    [`unread_${participantId}`]: firestore.FieldValue.increment(1),
                    deletedBy: [] // Resurrect chat for everyone
                }, { merge: true });
                
                setReplyingTo(null);
            }
            
            setNewMessageText('');
            setIsEmojiPickerOpen(false);
            scrollToBottom();
        } catch (error) {
            console.error("Error handling message:", error);
        }
    };
    
    const handleAddEmoji = (emoji: string) => {
        setNewMessageText(prev => prev + emoji);
    };

    const handleReaction = async (messageId: string, emoji: string, currentReactions: any) => {
        if (!selectedConversationId) return;
        const ref = db.collection('conversations').doc(selectedConversationId).collection('messages').doc(messageId);
        
        let existingReactionEmoji: string | null = null;
        if (currentReactions) {
            for (const [key, users] of Object.entries(currentReactions)) {
                if (Array.isArray(users) && (users as string[]).includes(user.id)) {
                    existingReactionEmoji = key;
                    break;
                }
            }
        }

        if (existingReactionEmoji === emoji) {
            await ref.update({
                [`reactions.${emoji}`]: firestore.FieldValue.arrayRemove(user.id)
            });
        } else if (existingReactionEmoji) {
            await ref.update({
                [`reactions.${existingReactionEmoji}`]: firestore.FieldValue.arrayRemove(user.id),
                [`reactions.${emoji}`]: firestore.FieldValue.arrayUnion(user.id)
            });
        } else {
             await ref.update({
                [`reactions.${emoji}`]: firestore.FieldValue.arrayUnion(user.id)
            });
        }
        setActiveMenuId(null);
    };

    const initiateDelete = (messageId: string) => {
        setMessageToDeleteId(messageId);
        setActiveMenuId(null);
    };

    const confirmDeleteMessage = async () => {
        if (!selectedConversationId || !messageToDeleteId) return;
        setIsDeletingMessage(true);
        try {
             await db.collection('conversations')
                .doc(selectedConversationId)
                .collection('messages')
                .doc(messageToDeleteId)
                .update({
                    isDeleted: true,
                    text: '',
                    reactions: {}
                });
        } catch (error) {
            console.error("Error deleting message:", error);
        } finally {
            setIsDeletingMessage(false);
            setMessageToDeleteId(null);
        }
    };
    
    const handleStartEdit = (msg: ChatMessage) => {
        setEditingMessage(msg);
        setNewMessageText(msg.text);
        setReplyingTo(null);
        setActiveMenuId(null);
        document.querySelector('textarea')?.focus();
    };
    
    const handleStartReply = (msg: ChatMessage) => {
        setReplyingTo(msg);
        setEditingMessage(null);
        setActiveMenuId(null);
        document.querySelector('textarea')?.focus();
    };
    
    const handleStartForward = (msg: ChatMessage) => {
        setForwardingMessage(msg);
        setActiveMenuId(null);
    };

    const handlePinMessage = async (msg: ChatMessage) => {
        if (!selectedConversationId) return;
        try {
            await db.collection('conversations').doc(selectedConversationId).update({
                pinnedMessage: {
                    id: msg.id,
                    text: msg.text,
                    senderId: msg.senderId
                }
            });
            setActiveMenuId(null);
        } catch (err) {
            console.error("Error pinning message:", err);
        }
    };

    const handleUnpinMessage = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!selectedConversationId) return;
        try {
            await db.collection('conversations').doc(selectedConversationId).update({
                pinnedMessage: firestore.FieldValue.delete()
            });
        } catch (err) {
            console.error("Error unpinning message:", err);
        }
    };

    const handleBookmarkMessage = async (msg: ChatMessage) => {
        if (!selectedConversationId) return;
        try {
            const bookmarkData: BookmarkedMessage = {
                id: msg.id,
                text: msg.text,
                senderId: msg.senderId,
                createdAt: new Date().toISOString()
            };
            await db.collection('conversations').doc(selectedConversationId).update({
                bookmarkedMessages: firestore.FieldValue.arrayUnion(bookmarkData)
            });
            setActiveMenuId(null);
        } catch (err) {
            console.error("Error bookmarking message:", err);
        }
    };

    const handleRemoveBookmark = async (bookmarkData: BookmarkedMessage) => {
        if (!selectedConversationId) return;
        try {
            await db.collection('conversations').doc(selectedConversationId).update({
                bookmarkedMessages: firestore.FieldValue.arrayRemove(bookmarkData)
            });
        } catch (err) {
            console.error("Error removing bookmark:", err);
        }
    };

    const handleUpdateTheme = async (themeKey: string) => {
        if (!selectedConversationId) return;
        try {
            // Use set with merge: true to handle cases where conversation doc doesn't exist yet
            // (e.g. new chat created but no message sent yet)
            await db.collection('conversations').doc(selectedConversationId).set({
                theme: themeKey
            }, { merge: true });
            setIsThemeModalOpen(false);
        } catch (err) {
            console.error("Error updating theme:", err);
        }
    };

    const handleForward = async (targetConvId: string) => {
        if (!forwardingMessage) return;
        const targetPartnerId = targetConvId.split('_').find(id => id !== user.id);
        if(!targetPartnerId) return;

        try {
             const text = forwardingMessage.text;
             await db.collection('conversations')
                .doc(targetConvId)
                .collection('messages')
                .add({
                    text,
                    senderId: user.id,
                    createdAt: firestore.FieldValue.serverTimestamp(),
                    isForwarded: true
                });
                
             // Update main document, resetting deletedBy so chat resurfaces
             await db.collection('conversations').doc(targetConvId).set({
                participants: [user.id, targetPartnerId],
                lastMessage: text,
                lastMessageTimestamp: firestore.FieldValue.serverTimestamp(),
                [`unread_${targetPartnerId}`]: firestore.FieldValue.increment(1),
                deletedBy: []
            }, { merge: true });
            
            setForwardingMessage(null);
        } catch (error) {
            console.error("Forward error", error);
        }
    };

    const confirmDeleteConversation = async () => {
        const targetId = conversationToDeleteId || contextMenuConversationId || selectedConversationId;
        
        if (!targetId) return;
        
        setIsDeletingConversation(true);
        try {
            const convRef = db.collection('conversations').doc(targetId);
            const doc = await convRef.get();
            const data = doc.data();
            const participants = data?.participants || [];
            const deletedBy = data?.deletedBy || [];

            // Identify other participants
            const otherParticipants = participants.filter((p: string) => p !== user.id);
            
            // Check if all other participants have already deleted it
            // (If otherParticipants is empty, treat as true to allow delete)
            const allOthersDeleted = otherParticipants.length === 0 || otherParticipants.every((p: string) => deletedBy.includes(p));

            if (allOthersDeleted) {
                // HARD DELETE: Everyone has deleted it, so remove from DB permanently
                const messagesRef = convRef.collection('messages');
                const snapshot = await messagesRef.get();
                
                // Delete in batches (Firestore limit is 500 ops per batch)
                const BATCH_SIZE = 400;
                let batch = db.batch();
                let count = 0;

                for (const doc of snapshot.docs) {
                    batch.delete(doc.ref);
                    count++;
                    if (count >= BATCH_SIZE) {
                        await batch.commit();
                        batch = db.batch();
                        count = 0;
                    }
                }
                
                // Delete conversation document
                batch.delete(convRef);
                await batch.commit();
            } else {
                // SOFT DELETE: Just mark as deleted for this user AND clear history timestamp
                // This ensures that if the chat is resurrected, history prior to this moment is hidden.
                await convRef.update({
                    deletedBy: firestore.FieldValue.arrayUnion(user.id),
                    [`clearedHistoryAt.${user.id}`]: firestore.FieldValue.serverTimestamp()
                });
            }
            
            if(selectedConversationId === targetId) {
                setSelectedConversationId(null);
                setActivePartnerProfile(null);
            }
            // Locally filter out the deleted conversation
            setConversations(prev => prev.filter(c => c.id !== targetId));

        } catch (error) {
            console.error("Error deleting conversation:", error);
        } finally {
            setIsDeletingConversation(false);
            setIsDeleteConversationModalOpen(false);
            setConversationToDeleteId(null);
        }
    };

    // --- Context Menu Handlers ---

    const handleConversationTouchStart = (id: string) => {
        conversationLongPressTimerRef.current = setTimeout(() => {
            setContextMenuConversationId(id);
            try {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
            } catch (e) { /* ignore */ }
        }, 500);
    };

    const handleConversationTouchEnd = () => {
        if (conversationLongPressTimerRef.current) {
            clearTimeout(conversationLongPressTimerRef.current);
            conversationLongPressTimerRef.current = null;
        }
    };

    const handleConversationContextMenu = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        setContextMenuConversationId(id);
    };

    const handleToggleReadStatus = async () => {
        if (!contextMenuConversationId) return;
        const conv = conversations.find(c => c.id === contextMenuConversationId);
        if (!conv) return;

        const currentUnread = conv[`unread_${user.id}`] || 0;
        const newStatus = currentUnread > 0 ? 0 : 1;

        try {
            await db.collection('conversations').doc(contextMenuConversationId).update({
                [`unread_${user.id}`]: newStatus
            });
            setContextMenuConversationId(null);
        } catch (error) {
            console.error("Error updating read status", error);
        }
    };

    const handleTogglePin = async () => {
        if (!contextMenuConversationId) return;
        const conv = conversations.find(c => c.id === contextMenuConversationId);
        const isPinned = conv?.pinnedBy?.includes(user.id);

        try {
            if (isPinned) {
                await db.collection('conversations').doc(contextMenuConversationId).update({
                    pinnedBy: firestore.FieldValue.arrayRemove(user.id)
                });
            } else {
                await db.collection('conversations').doc(contextMenuConversationId).update({
                    pinnedBy: firestore.FieldValue.arrayUnion(user.id)
                });
            }
            setContextMenuConversationId(null);
        } catch (error) {
            console.error("Error updating pin status", error);
        }
    };

    const handleToggleBlock = async () => {
        if (!contextMenuConversationId) return;
        const conv = conversations.find(c => c.id === contextMenuConversationId);
        const isBlocked = conv?.blockedBy?.includes(user.id);

        try {
            if (isBlocked) {
                await db.collection('conversations').doc(contextMenuConversationId).update({
                    blockedBy: firestore.FieldValue.arrayRemove(user.id)
                });
            } else {
                await db.collection('conversations').doc(contextMenuConversationId).update({
                    blockedBy: firestore.FieldValue.arrayUnion(user.id)
                });
            }
            setContextMenuConversationId(null);
        } catch (error) {
            console.error("Error updating block status", error);
        }
    };

    // --- Swipe and Long Press Handlers (Messages) ---

    const handleSwipeStart = (e: React.TouchEvent, msgId: string) => {
        setSwipeState({
            id: msgId,
            startX: e.targetTouches[0].clientX,
            startY: e.targetTouches[0].clientY,
            offset: 0
        });

        longPressTimerRef.current = setTimeout(() => {
            setActiveMenuId(msgId);
            try {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
            } catch (e) { /* ignore */ }
            setSwipeState({ id: null, startX: 0, startY: 0, offset: 0 });
        }, 500);
    };

    const handleSwipeMove = (e: React.TouchEvent) => {
        const { id, startX, startY } = swipeState;
        
        if (!id) {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
            return;
        }

        const currentX = e.targetTouches[0].clientX;
        const currentY = e.targetTouches[0].clientY;
        const diffX = currentX - startX;
        const diffY = currentY - startY;

        if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
        }

        const msg = messages.find(m => m.id === id);
        const isMe = msg?.senderId === user.id;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (isMe) {
                if (diffX < 0) {
                    const newOffset = Math.max(diffX, -100);
                    setSwipeState(prev => ({ ...prev, offset: newOffset }));
                }
            } else {
                if (diffX > 0) {
                    const newOffset = Math.min(diffX, 100);
                    setSwipeState(prev => ({ ...prev, offset: newOffset }));
                }
            }
        }
    };

    const handleSwipeEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }

        const { id, offset } = swipeState;
        
        if (id) {
            const msg = messages.find(m => m.id === id);
            const isMe = msg?.senderId === user.id;
            const trigger = isMe ? offset < -50 : offset > 50;

            if (trigger && msg) {
                handleStartReply(msg);
                try {
                    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
                } catch (e) { /* ignore */ }
            }
        }

        setSwipeState({ id: null, startX: 0, startY: 0, offset: 0 });
    };
    
    const handleContextMenu = (e: React.MouseEvent, msgId: string) => {
        e.preventDefault();
        setActiveMenuId(msgId);
    };

    // --- Helpers ---

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        try {
            const d = (timestamp as any).toDate ? (timestamp as any).toDate() : new Date(timestamp as any);
            return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        } catch (e) { return ''; }
    };
    
    const formatListTime = (timestamp: any) => {
        if (!timestamp) return '';
        try {
            const d = (timestamp as any).toDate ? (timestamp as any).toDate() : new Date(timestamp as any);
            const now = new Date();
            const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 3600 * 24));
            if (diffDays === 0) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch (e) { return ''; }
    };

    const formatStatus = (profile: Profile | null) => {
        if (!profile) return '';
        if (profile.is_online) return 'Active now';
        if (!profile.last_seen) return 'Offline';
        let lastSeenDate: Date;
        try {
            const lastSeen = profile.last_seen as any;
            lastSeenDate = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
            
            if (isNaN(lastSeenDate.getTime())) return 'Offline';
            
            const diffSeconds = Math.floor((new Date().getTime() - lastSeenDate.getTime()) / 1000);
            if (diffSeconds < 60) return 'Active now';
            if (diffSeconds < 3600) return `Active ${Math.floor(diffSeconds / 60)}m ago`;
            if (diffSeconds < 86400) return `Active ${Math.floor(diffSeconds / 3600)}h ago`;
            return `Active ${lastSeenDate.toLocaleDateString()}`;
        } catch (e) { return 'Offline'; }
    };

    // --- Sidebar Search & Filter Logic ---

    const filteredConversations = useMemo(() => {
        if (!sidebarSearchTerm.trim()) return conversations;
        const lowerTerm = sidebarSearchTerm.toLowerCase();
        return conversations.filter(conv => {
            const partner = getConversationPartner(conv);
            return partner?.full_name?.toLowerCase().includes(lowerTerm);
        });
    }, [conversations, sidebarSearchTerm, profilesMap, user.id]);

    const potentialNewChats = useMemo(() => {
        if (!sidebarSearchTerm.trim()) return [];
        const existingPartnerIds = new Set(conversations.map(c => c.participants.find(p => p !== user.id)).filter(Boolean));
        
        return Object.values(profilesMap).filter((p: Profile) => 
            p.id !== user.id && 
            !existingPartnerIds.has(p.id) && 
            (
                p.full_name.toLowerCase().includes(sidebarSearchTerm.toLowerCase()) || 
                p.student_id.toLowerCase().includes(sidebarSearchTerm.toLowerCase())
            )
        ).slice(0, 5);
    }, [profilesMap, conversations, sidebarSearchTerm, user.id]);

    const handleStartNewChat = (partner: Profile) => {
        const convId = [user.id, partner.id].sort().join('_');
        setSelectedConversationId(convId);
        setSidebarSearchTerm('');
    };

    // --- Render ---

    const isMobileChatActive = !!selectedConversationId;
    
    const bookmarkedMessages = currentConversation?.bookmarkedMessages || [];

    // Handle search filtering
    const isSearching = isSearchOpen && searchQuery.trim().length > 0;

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return displayedMessages.filter(m => !m.isDeleted && m.text.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [displayedMessages, searchQuery]);

    const handleNavigateToMessage = (messageId: string) => {
        setIsBookmarksModalOpen(false);
        setIsSearchOpen(false);
        setSearchQuery('');
        scrollToMessage(messageId);
    }

    const handleCopyMessage = async (text: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                throw new Error("Clipboard API unavailable");
            }
        } catch (err) {
            console.warn("Clipboard API failed, falling back to execCommand", err);
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.position = "fixed";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
            } catch (e) {
                console.error("Copy failed", e);
            }
            document.body.removeChild(textArea);
        }
        setActiveMenuId(null);
    };

    return (
        <div className="flex h-full bg-white rounded-none md:rounded-2xl md:shadow-xl overflow-hidden border-none md:border border-gray-200 relative">
            {/* --- Modals --- */}
            <ForwardModal 
                isOpen={!!forwardingMessage}
                onClose={() => setForwardingMessage(null)}
                conversations={conversations}
                profilesMap={profilesMap}
                currentUserId={user.id}
                onForward={handleForward}
            />
            
            <ThemeModal 
                isOpen={isThemeModalOpen}
                onClose={() => setIsThemeModalOpen(false)}
                currentTheme={currentConversation?.theme || 'default'}
                onSelectTheme={handleUpdateTheme}
            />

            <BookmarkedMessagesModal 
                isOpen={isBookmarksModalOpen}
                onClose={() => setIsBookmarksModalOpen(false)}
                bookmarks={bookmarkedMessages}
                onNavigate={handleNavigateToMessage}
                onRemove={handleRemoveBookmark}
            />

            <ReactionDetailsModal 
                isOpen={!!viewingReaction}
                onClose={() => setViewingReaction(null)}
                emoji={viewingReaction?.emoji || ''}
                userIds={viewingReaction?.userIds || []}
                profilesMap={profilesMap}
                currentUserId={user.id}
            />

            <ConfirmationModal
                isOpen={!!messageToDeleteId}
                onClose={() => setMessageToDeleteId(null)}
                onConfirm={confirmDeleteMessage}
                title="Delete Message"
                message="Are you sure you want to delete this message? This will hide the content for everyone in the chat."
                confirmButtonText="Delete"
                isConfirming={isDeletingMessage}
            />

            <ConfirmationModal
                isOpen={isDeleteConversationModalOpen}
                onClose={() => { 
                    setIsDeleteConversationModalOpen(false); 
                    setConversationToDeleteId(null);
                }}
                onConfirm={confirmDeleteConversation}
                title="Delete Conversation"
                message="Are you sure you want to delete this conversation? It will be removed from your list."
                confirmButtonText="Delete"
                isConfirming={isDeletingConversation}
            />

            {/* --- Context Menu Bottom Sheet (Long Press on Chat List) --- */}
            {contextMenuConversationId && (
                <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                    <div 
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setContextMenuConversationId(null)}
                    ></div>
                    
                    <div className="bg-white w-full rounded-t-2xl z-10 pb-8 max-h-[70vh] overflow-y-auto animate-fade-in-up shadow-2xl">
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-3"></div>
                        
                        <div className="px-4 py-2">
                            {(() => {
                                const conv = conversations.find(c => c.id === contextMenuConversationId);
                                const isPinned = conv?.pinnedBy?.includes(user.id);
                                const isBlocked = conv?.blockedBy?.includes(user.id);
                                const unreadCount = conv?.[`unread_${user.id}`] || 0;
                                const partner = conv ? getConversationPartner(conv) : null;
                                
                                return (
                                    <>
                                        <div className="flex items-center justify-center mb-6 mt-2">
                                            <span className="font-bold text-lg text-gray-800">{partner?.full_name || 'Conversation Options'}</span>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="bg-gray-50 rounded-xl overflow-hidden">
                                                <button onClick={handleToggleReadStatus} className="w-full flex items-center p-4 hover:bg-gray-100 transition-colors border-b border-gray-200">
                                                    {unreadCount > 0 ? <EyeIcon className="h-5 w-5 text-gray-600 mr-3" /> : <EyeOffIcon className="h-5 w-5 text-gray-600 mr-3" />}
                                                    <span className="font-medium text-gray-800">
                                                        {unreadCount > 0 ? 'Mark as read' : 'Mark as unread'}
                                                    </span>
                                                </button>
                                                
                                                <button onClick={handleTogglePin} className="w-full flex items-center p-4 hover:bg-gray-100 transition-colors border-b border-gray-200">
                                                    {isPinned ? <UnpinIcon className="h-5 w-5 text-gray-600 mr-3" /> : <PinIcon className="h-5 w-5 text-gray-600 mr-3" />}
                                                    <span className="font-medium text-gray-800">
                                                        {isPinned ? 'Unpin' : 'Pin'}
                                                    </span>
                                                </button>

                                                <button onClick={handleToggleBlock} className="w-full flex items-center p-4 hover:bg-gray-100 transition-colors">
                                                    <BanIcon className="h-5 w-5 text-gray-600 mr-3" />
                                                    <span className="font-medium text-gray-800">
                                                        {isBlocked ? 'Unblock' : 'Block'}
                                                    </span>
                                                </button>
                                            </div>

                                            <div className="bg-gray-50 rounded-xl overflow-hidden">
                                                <button 
                                                    onClick={() => {
                                                        setConversationToDeleteId(contextMenuConversationId);
                                                        setContextMenuConversationId(null);
                                                        setIsDeleteConversationModalOpen(true);
                                                    }} 
                                                    className="w-full flex items-center p-4 hover:bg-red-50 transition-colors"
                                                >
                                                    <TrashIcon className="h-5 w-5 text-red-600 mr-3" />
                                                    <span className="font-medium text-red-600">Delete Conversation</span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* --- Bottom Sheet for Message Actions --- */}
            {activeMessage && (
                <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                    <div 
                        className="absolute inset-0 bg-black/30 backdrop-blur-[1px] transition-opacity"
                        onClick={() => setActiveMenuId(null)}
                    ></div>
                    
                    <div className="bg-gray-100 w-full rounded-t-2xl z-10 pb-8 max-h-[70vh] overflow-y-auto animate-fade-in-up">
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-3"></div>
                        
                        <div className="px-4 space-y-4">
                            <div className="bg-white rounded-xl p-3 shadow-sm flex justify-between items-center mb-2">
                                {EMOJIS.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleReaction(activeMessage.id, emoji, activeMessage.reactions);
                                        }}
                                        className={`text-2xl transition-transform hover:scale-110 p-2 rounded-full ${
                                            activeMessage.reactions?.[emoji]?.includes(user.id)
                                            ? 'bg-blue-100 border border-blue-200'
                                            : 'hover:bg-gray-100'
                                        }`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                                <button onClick={() => handleStartReply(activeMessage)} className="w-full flex items-center p-3.5 hover:bg-gray-50 border-b border-gray-100 text-gray-800 font-medium text-sm">
                                    <ReplyIcon className="h-5 w-5 text-gray-500 mr-3" /> Reply
                                </button>
                                <button onClick={() => handleStartForward(activeMessage)} className="w-full flex items-center p-3.5 hover:bg-gray-50 border-b border-gray-100 text-gray-800 font-medium text-sm">
                                    <ForwardIcon className="h-5 w-5 text-gray-500 mr-3" /> Forward
                                </button>
                                <button onClick={() => handlePinMessage(activeMessage)} className="w-full flex items-center p-3.5 hover:bg-gray-50 border-b border-gray-100 text-gray-800 font-medium text-sm">
                                    <PinIcon className="h-5 w-5 text-gray-500 mr-3" /> Pin Message
                                </button>
                                <button onClick={() => handleCopyMessage(activeMessage.text)} className="w-full flex items-center p-3.5 hover:bg-gray-50 border-b border-gray-100 text-gray-800 font-medium text-sm">
                                    <ClipboardIcon className="h-5 w-5 text-gray-500 mr-3" /> Copy Text
                                </button>
                                <button onClick={() => handleBookmarkMessage(activeMessage)} className="w-full flex items-center p-3.5 hover:bg-gray-50 text-gray-800 font-medium text-sm border-b border-gray-100">
                                    <BookmarkIcon className="h-5 w-5 text-gray-500 mr-3" /> Save Message
                                </button>
                                
                                {activeMessage.senderId === user.id && (
                                    <button onClick={() => handleStartEdit(activeMessage)} className="w-full flex items-center p-3.5 hover:bg-gray-50 text-gray-800 font-medium text-sm">
                                        <PencilIcon inWrapper={false} className="h-5 w-5 text-gray-500 mr-3" /> Edit
                                    </button>
                                )}
                            </div>

                            {activeMessage.senderId === user.id && (
                                <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                                    <button onClick={() => initiateDelete(activeMessage.id)} className="w-full flex items-center p-3.5 hover:bg-red-50 text-red-600 font-medium text-sm">
                                        <TrashIcon className="h-5 w-5 mr-3" /> Delete Message
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- Sidebar (Conversation List) --- */}
            <div className={`w-full md:w-80 flex flex-col bg-white md:border-r border-gray-200 transition-all duration-300 z-10 ${isMobileChatActive ? 'hidden md:flex' : 'flex'}`}>
                
                {/* Header Section for Switching */}
                <div className="px-4 pt-5 pb-2 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Messages</h2>
                    {onSwitchToFriends && (
                        <button 
                            onClick={onSwitchToFriends}
                            className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors shadow-sm"
                            title="Find Friends"
                        >
                            <UsersIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>

                <div className="px-4 pb-4 border-b border-gray-100">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search messages..." 
                            value={sidebarSearchTerm}
                            onChange={(e) => setSidebarSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Search Results for New Chats */}
                    {potentialNewChats.length > 0 && (
                        <div className="mb-2">
                            <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50">
                                People
                            </div>
                            {potentialNewChats.map(partner => (
                                <div 
                                    key={partner.id}
                                    onClick={() => handleStartNewChat(partner)}
                                    className="px-4 py-3 flex items-center hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <div className="relative">
                                        <img 
                                            src={partner.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${partner.full_name}`} 
                                            className="h-10 w-10 rounded-full object-cover"
                                            alt=""
                                        />
                                    </div>
                                    <div className="ml-3 overflow-hidden">
                                        <h4 className="text-sm font-semibold text-gray-900 truncate">{partner.full_name}</h4>
                                        <p className="text-xs text-gray-500 truncate">Start a conversation</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {loadingConversations ? (
                        <div className="flex justify-center py-10"><Spinner /></div>
                    ) : filteredConversations.length === 0 && potentialNewChats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 pb-20">
                            <ChatIcon className="h-16 w-16 mb-2 opacity-20" />
                            <p>No conversations yet</p>
                        </div>
                    ) : (
                        filteredConversations.map(conv => {
                            const partner = getConversationPartner(conv);
                            const isSelected = selectedConversationId === conv.id;
                            const isActive = formatStatus(partner) === 'Active now';
                            const unread = conv[`unread_${user.id}`] || 0;
                            const isPinned = conv.pinnedBy?.includes(user.id);
                            
                            return (
                                <div 
                                    key={conv.id}
                                    onClick={() => setSelectedConversationId(conv.id)}
                                    onContextMenu={(e) => handleConversationContextMenu(e, conv.id)}
                                    onTouchStart={() => handleConversationTouchStart(conv.id)}
                                    onTouchEnd={handleConversationTouchEnd}
                                    className={`px-4 py-3 flex items-center cursor-pointer transition-colors border-l-4 select-none
                                        ${isSelected ? 'bg-blue-50 border-blue-600' : 'border-transparent hover:bg-gray-50'}
                                        ${unread > 0 ? 'bg-gray-50' : ''}
                                    `}
                                >
                                    <div className="relative flex-shrink-0">
                                        <img 
                                            src={partner?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${partner?.full_name}`} 
                                            className="h-12 w-12 rounded-full object-cover bg-gray-200"
                                            alt=""
                                        />
                                        {isActive && (
                                            <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white bg-green-500"></span>
                                        )}
                                    </div>
                                    <div className="ml-3 flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <h4 className={`text-sm truncate ${unread > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                                                {partner?.full_name || 'Unknown'}
                                            </h4>
                                            <span className={`text-xs flex-shrink-0 ${unread > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                                                {formatListTime(conv.lastMessageTimestamp)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className={`text-xs truncate pr-2 ${unread > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                                                {conv.lastMessage}
                                            </p>
                                            <div className="flex items-center gap-1">
                                                {isPinned && <PinIcon className="h-3 w-3 text-gray-400 transform rotate-45" />}
                                                {unread > 0 && (
                                                    <span className="flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                                                        {unread}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* --- Main Chat Window --- */}
            <div className={`flex-1 flex flex-col h-full bg-gray-50 transition-transform duration-300 absolute md:relative w-full md:w-auto z-20 md:z-0 ${isMobileChatActive ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                {selectedConversationId ? (
                    <>
                        {/* Header */}
                        <div className="px-4 py-3 bg-white border-b border-gray-200 flex justify-between items-center shadow-sm z-30 sticky top-0">
                            <div className="flex items-center overflow-hidden">
                                <button 
                                    onClick={() => {
                                        setSelectedConversationId(null);
                                        setActivePartnerProfile(null);
                                    }}
                                    className="md:hidden mr-2 p-1 rounded-full hover:bg-gray-100 text-gray-600"
                                >
                                    <ChevronLeftIcon className="h-6 w-6" />
                                </button>
                                
                                <div 
                                    className="flex items-center cursor-pointer"
                                    onClick={() => activePartnerProfile && onViewProfile(activePartnerProfile)}
                                >
                                    <div className="relative">
                                        <img 
                                            src={activePartnerProfile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${activePartnerProfile?.full_name}`} 
                                            className="h-10 w-10 rounded-full object-cover bg-gray-200 border border-gray-100"
                                            alt=""
                                        />
                                        {activePartnerProfile?.is_online && (
                                            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-green-500"></span>
                                        )}
                                    </div>
                                    <div className="ml-3 overflow-hidden">
                                        <h3 className="font-bold text-gray-900 truncate text-sm md:text-base leading-tight">
                                            {activePartnerProfile?.full_name || 'Loading...'}
                                        </h3>
                                        <span className={`text-xs font-medium block ${activePartnerProfile?.is_online ? 'text-green-600' : 'text-gray-400'}`}>
                                            {formatStatus(activePartnerProfile)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                                    className={`p-2 rounded-full transition-colors ${isSearchOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
                                >
                                    <SearchIcon className="h-5 w-5" />
                                </button>
                                <button 
                                    onClick={() => setIsThemeModalOpen(true)}
                                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                                >
                                    <PaletteIcon className="h-5 w-5" />
                                </button>
                                <button 
                                    onClick={() => setIsBookmarksModalOpen(true)}
                                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                                >
                                    <BookmarkIcon className="h-5 w-5" />
                                </button>
                                <div className="relative conversation-menu-container">
                                    <button 
                                        onClick={() => setIsConversationMenuOpen(!isConversationMenuOpen)}
                                        className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                                    >
                                        <DotsHorizontalIcon className="h-5 w-5" />
                                    </button>
                                    
                                    {/* Dropdown Menu */}
                                    {isConversationMenuOpen && (
                                        <div className="absolute top-10 right-0 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 animate-fade-in-up overflow-hidden">
                                            <button 
                                                onClick={() => { 
                                                    setConversationToDeleteId(selectedConversationId);
                                                    setIsDeleteConversationModalOpen(true); 
                                                    setIsConversationMenuOpen(false); 
                                                }} 
                                                className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <TrashIcon className="h-4 w-4 mr-2" /> Delete Conversation
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Pinned Message Banner */}
                        {activeConversationMeta?.pinnedMessage && (
                            <div 
                                className="bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-2 flex justify-between items-center z-20 cursor-pointer shadow-sm animate-fade-in"
                                onClick={() => scrollToMessage(activeConversationMeta.pinnedMessage!.id)}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="flex-shrink-0">
                                        <PinIcon className="h-4 w-4 text-blue-600" />
                                    </div>
                                    <div className="border-l-2 border-blue-500 pl-2 flex-1 min-w-0">
                                        <p className="text-xs font-bold text-blue-600">Pinned Message</p>
                                        <p className="text-sm text-gray-700 truncate">
                                            {activeConversationMeta.pinnedMessage.text}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleUnpinMessage}
                                    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors ml-2"
                                >
                                    <XIcon className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        {/* In-Chat Search Bar */}
                        {isSearchOpen && (
                            <div className="bg-white px-4 py-2 border-b border-gray-100 animate-fade-in">
                                <div className="relative">
                                    <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Find in conversation..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        autoFocus
                                    />
                                    {searchQuery && (
                                        <button 
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                        >
                                            <XIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                {searchQuery && (
                                    <div className="mt-2 text-xs text-gray-500 flex justify-between">
                                        <span>{searchResults.length} matches found</span>
                                        <div className="flex gap-2">
                                            <button 
                                                disabled={searchResults.length === 0}
                                                onClick={() => {
                                                    if(searchResults.length > 0) scrollToMessage(searchResults[searchResults.length-1].id);
                                                }}
                                                className="hover:text-blue-600 disabled:opacity-50"
                                            >
                                                Oldest
                                            </button>
                                            <button 
                                                disabled={searchResults.length === 0}
                                                onClick={() => {
                                                    if(searchResults.length > 0) scrollToMessage(searchResults[0].id);
                                                }}
                                                className="hover:text-blue-600 disabled:opacity-50"
                                            >
                                                Newest
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Messages Area */}
                        <div 
                            className={`flex-1 overflow-y-auto p-4 space-y-3 relative bg-gradient-to-b ${activeTheme.gradient} bg-opacity-5`}
                            style={{ 
                                backgroundImage: activeTheme.backgroundUrl ? `linear-gradient(rgba(255,255,255,0.85), rgba(255,255,255,0.85)), url(${activeTheme.backgroundUrl})` : undefined,
                                backgroundSize: 'cover',
                                backgroundAttachment: 'fixed'
                            }}
                            ref={chatContainerRef}
                        >
                            {loadingMessages && displayedMessages.length === 0 ? (
                                <div className="flex justify-center py-10"><Spinner /></div>
                            ) : displayedMessages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                    <div className={`w-20 h-20 rounded-full ${activeTheme.bg} bg-opacity-10 flex items-center justify-center mb-4`}>
                                        <ChatIcon className={`h-10 w-10 ${activeTheme.indicator}`} />
                                    </div>
                                    <p>No messages yet. Start chatting!</p>
                                </div>
                            ) : (
                                (() => {
                                    let lastDate: Date | null = null;
                                    return displayedMessages.map((msg, index) => {
                                        const isMe = msg.senderId === user.id;
                                        const msgDate = msg.createdAt && ((msg.createdAt as any).toDate ? (msg.createdAt as any).toDate() : new Date(msg.createdAt as any));
                                        const showDate = msgDate && (!lastDate || msgDate.toDateString() !== lastDate.toDateString());
                                        if (msgDate) lastDate = msgDate;

                                        const isHighlighted = highlightedMessageId === msg.id;
                                        const isSearchResult = isSearching && msg.text.toLowerCase().includes(searchQuery.toLowerCase());

                                        return (
                                            <React.Fragment key={msg.id}>
                                                {showDate && msgDate && <DateSeparator date={msgDate} />}
                                                
                                                <div 
                                                    id={`message-${msg.id}`}
                                                    className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} ${isHighlighted ? 'animate-pulse' : ''}`}
                                                    onTouchStart={(e) => handleSwipeStart(e, msg.id)}
                                                    onTouchMove={handleSwipeMove}
                                                    onTouchEnd={handleSwipeEnd}
                                                    onContextMenu={(e) => handleContextMenu(e, msg.id)}
                                                >
                                                    <div 
                                                        className={`max-w-[75%] sm:max-w-[65%] relative group transition-transform duration-200 ease-out select-none
                                                            ${swipeState.id === msg.id ? (isMe ? '-translate-x-12' : 'translate-x-12') : 'translate-x-0'}
                                                        `}
                                                        style={{ transform: swipeState.id === msg.id ? `translateX(${swipeState.offset}px)` : 'none' }}
                                                    >
                                                        {/* Reply Indicator */}
                                                        {swipeState.id === msg.id && Math.abs(swipeState.offset) > 50 && (
                                                            <div className={`absolute top-1/2 -translate-y-1/2 ${isMe ? '-right-12' : '-left-12'} text-gray-400`}>
                                                                <ReplyIcon className="h-5 w-5" />
                                                            </div>
                                                        )}

                                                        {/* Reply Preview Block */}
                                                        {msg.replyTo && (
                                                            <div 
                                                                onClick={() => scrollToMessage(msg.replyTo!.id)}
                                                                className={`text-xs mb-1 p-2 rounded-lg border-l-4 cursor-pointer opacity-80 hover:opacity-100 transition-opacity select-none ${
                                                                    isMe ? 'bg-blue-700/20 border-blue-300 text-blue-50' : 'bg-gray-200 border-gray-400 text-gray-600'
                                                                }`}
                                                            >
                                                                <div className="font-bold mb-0.5">{msg.replyTo.senderName}</div>
                                                                <div className="truncate">{msg.replyTo.text}</div>
                                                            </div>
                                                        )}

                                                        {/* Message Bubble */}
                                                        <div 
                                                            className={`px-4 py-2 rounded-2xl text-sm shadow-sm relative break-words whitespace-pre-wrap select-none
                                                                ${isMe 
                                                                    ? `${activeTheme.bg} ${activeTheme.text} rounded-br-none` 
                                                                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                                                }
                                                                ${msg.isDeleted ? 'italic opacity-60 border border-dashed' : ''}
                                                                ${isSearchResult ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}
                                                            `}
                                                        >
                                                            {msg.isForwarded && (
                                                                <div className="text-[10px] italic mb-1 opacity-70 flex items-center">
                                                                    <ForwardIcon className="h-3 w-3 mr-1" /> Forwarded
                                                                </div>
                                                            )}
                                                            
                                                            {msg.isDeleted ? (
                                                                <span className="flex items-center gap-1"><BanIcon className="h-3 w-3"/> Message deleted</span>
                                                            ) : (
                                                                <span>{msg.text}</span>
                                                            )}

                                                            {/* Metadata */}
                                                            <div className={`flex items-center justify-end space-x-1 mt-1 text-[10px] ${isMe ? 'opacity-70' : 'text-gray-400'}`}>
                                                                {msg.isEdited && <span>(edited)</span>}
                                                                <span>{formatTime(msg.createdAt)}</span>
                                                                {isMe && (
                                                                    <span title={msg.read ? "Read" : "Sent"}>
                                                                        {msg.read ? <DoubleCheckIcon className="h-3 w-3" /> : <CheckIcon className="h-3 w-3" />}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Reactions Pill */}
                                                            {msg.reactions && Object.keys(msg.reactions).length > 0 && !msg.isDeleted && (
                                                                <div 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setViewingReaction({ emoji: '', userIds: Object.values(msg.reactions).flat() as string[] });
                                                                    }}
                                                                    className={`absolute -bottom-3 ${isMe ? 'left-0' : 'right-0'} bg-white border border-gray-200 shadow-sm rounded-full px-1.5 py-0.5 flex gap-0.5 cursor-pointer hover:bg-gray-50 z-10`}
                                                                >
                                                                    {Object.entries(msg.reactions).map(([emoji, users]: [string, any]) => (
                                                                        users.length > 0 && (
                                                                            <span key={emoji} className="text-[10px]">{emoji} <span className="font-bold text-gray-600">{users.length > 1 ? users.length : ''}</span></span>
                                                                        )
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })
                                })()
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white border-t border-gray-200 z-20">
                            {/* Reply Context */}
                            {replyingTo && (
                                <div className="flex justify-between items-center bg-gray-100 p-2 rounded-lg mb-2 text-xs border-l-4 border-blue-500 animate-fade-in">
                                    <div>
                                        <div className="font-bold text-blue-600 mb-0.5">Replying to message</div>
                                        <div className="text-gray-600 truncate max-w-[200px]">{replyingTo.text}</div>
                                    </div>
                                    <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-200 rounded-full"><XIcon className="h-4 w-4 text-gray-500" /></button>
                                </div>
                            )}
                            
                            {/* Edit Context */}
                            {editingMessage && (
                                <div className="flex justify-between items-center bg-gray-100 p-2 rounded-lg mb-2 text-xs border-l-4 border-green-500 animate-fade-in">
                                    <div className="flex items-center">
                                        <PencilIcon inWrapper={false} className="h-3 w-3 mr-2 text-green-600" />
                                        <span className="font-bold text-green-600">Editing Message</span>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setEditingMessage(null);
                                            setNewMessageText('');
                                        }} 
                                        className="p-1 hover:bg-gray-200 rounded-full"
                                    >
                                        <XIcon className="h-4 w-4 text-gray-500" />
                                    </button>
                                </div>
                            )}

                            <form onSubmit={handleSendMessage} className="flex items-end gap-2 relative emoji-picker-container">
                                <button 
                                    type="button"
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors mb-1 emoji-trigger"
                                    onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                                >
                                    <EmojiIcon className="h-6 w-6 text-yellow-500" />
                                </button>

                                {isEmojiPickerOpen && (
                                    <div className="absolute bottom-14 left-0 bg-white shadow-xl rounded-xl border border-gray-200 p-2 w-64 grid grid-cols-6 gap-1 z-50 animate-fade-in-up">
                                        {EXTENDED_EMOJIS.map(emoji => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => handleAddEmoji(emoji)}
                                                className="text-xl p-1.5 hover:bg-gray-100 rounded-lg transition-transform hover:scale-110"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:bg-white transition-all">
                                    <textarea
                                        ref={textareaRef}
                                        value={newMessageText}
                                        onChange={(e) => setNewMessageText(e.target.value)}
                                        placeholder="Type a message..."
                                        className="w-full bg-transparent border-none outline-none text-sm max-h-32 resize-none py-1"
                                        rows={1}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage(e);
                                            }
                                        }}
                                    />
                                </div>
                                
                                <button 
                                    type="submit" 
                                    disabled={!newMessageText.trim()}
                                    className={`p-3 rounded-full shadow-md transition-all mb-0.5 transform active:scale-95 ${
                                        !newMessageText.trim() 
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                        : `${activeTheme.sendBtn} text-white hover:opacity-90`
                                    }`}
                                >
                                    <PaperAirplaneIcon className="h-5 w-5 transform rotate-90 translate-x-0.5" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400 px-6 text-center">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                            <ChatIcon className="h-10 w-10 text-gray-300" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-700 mb-2">Your Messages</h2>
                        <p className="max-w-xs text-sm">Send private messages, share files, and connect with your friends.</p>
                        <button 
                            onClick={() => document.querySelector('input[placeholder="Search messages..."]')?.parentElement?.querySelector('input')?.focus()}
                            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-bold hover:bg-blue-700 transition-colors md:hidden"
                        >
                            Start New Chat
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatsPage;
