
// ... (imports)
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db, firestore } from '../services';
import type { Post, Profile } from '../types';
import { Spinner } from './Spinner';
import { UserCircleIcon, MessageCircleIcon, TrashIcon, XIcon, ShareIcon, EmojiIcon, PhotoIcon, DownloadIcon, GlobeIcon, UsersIcon, LockClosedIcon, ChevronDownIcon, DotsHorizontalIcon, PencilIcon, CheckIcon, ShieldCheckIcon, ThumbUpIcon } from './Icons';
import PostDetailModal from './PostDetailModal';
import ConfirmationModal from './ConfirmationModal';
import ReactionsModal from './ReactionsModal';

// Declare html2canvas for TypeScript since it's loaded via CDN
declare const html2canvas: any;

interface FeedProps {
    user: { id: string };
    targetUserId?: string; // If provided, shows only posts by this user
    onViewProfile?: (profile: Profile) => void;
}

// --- CONFIGURATION FOR POST IMAGES ---
// These are distinct from the profile avatar/cover config.
const POST_CLOUD_NAME = 'djwfuf8it'; 
const POST_UPLOAD_PRESET = 'BseePortal'; 

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const EXTENDED_EMOJIS = [
    '👍', '👎', '❤️', '🔥', '😂', '😮', '😢', '😡', '🎉', '👏', '👀', '🧠', 
    '👋', '🙌', '🤝', '✨', '🌟', '💯', '✅', '❌', '🤔', '🙄', '😬'
];

const Feed: React.FC<FeedProps> = ({ user, targetUserId, onViewProfile }) => {
    // ... (state definitions)
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [newPostContent, setNewPostContent] = useState('');
    const [profilesMap, setProfilesMap] = useState<{ [key: string]: Profile }>({});
    const [isPosting, setIsPosting] = useState(false);
    
    // Image Upload State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    
    // Detail Modal State
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    
    // UI State for reaction picker
    const [activeReactionId, setActiveReactionId] = useState<string | null>(null);
    
    // State for viewing who reacted
    const [viewingReactionsPostId, setViewingReactionsPostId] = useState<string | null>(null);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [postToDeleteId, setPostToDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Emoji Picker State for New Post
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

    // Privacy Settings State
    const [postPrivacy, setPostPrivacy] = useState<'public' | 'friends' | 'only_me'>('public');
    const [allowShare, setAllowShare] = useState(true); // New allow share state
    
    const [isPrivacyMenuOpen, setIsPrivacyMenuOpen] = useState(false);
    const [friendIds, setFriendIds] = useState<Set<string>>(new Set());

    // Edit Post State
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editPrivacy, setEditPrivacy] = useState<'public' | 'friends' | 'only_me'>('public');
    const [editAllowShare, setEditAllowShare] = useState(true);
    const [activePostMenuId, setActivePostMenuId] = useState<string | null>(null);
    const [isEditPrivacyMenuOpen, setIsEditPrivacyMenuOpen] = useState(false);

    // Image Lightbox State
    const [viewingImage, setViewingImage] = useState<{ url: string, canDownload: boolean } | null>(null);
    
    // Share Generation State
    const [generatingShareId, setGeneratingShareId] = useState<string | null>(null);

    // Mention State
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionIndex, setMentionIndex] = useState<number>(-1);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // Long Press Refs
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressRef = useRef(false);
    
    // Ref to hold latest profilesMap to avoid closure staleness in fetchProfiles
    const profilesMapRef = useRef<{ [key: string]: Profile }>({});

    // Sync ref
    useEffect(() => {
        profilesMapRef.current = profilesMap;
    }, [profilesMap]);

    // Close menus on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (isEmojiPickerOpen && !target.closest('.emoji-container')) {
                setIsEmojiPickerOpen(false);
            }
            if (isPrivacyMenuOpen && !target.closest('.privacy-container')) {
                setIsPrivacyMenuOpen(false);
            }
            if (activePostMenuId && !target.closest('.post-menu-container')) {
                setActivePostMenuId(null);
            }
            if (isEditPrivacyMenuOpen && !target.closest('.edit-privacy-container')) {
                setIsEditPrivacyMenuOpen(false);
            }
            // Close mentions if clicking away
            if (mentionQuery !== null && !target.closest('.mention-suggestions') && !target.closest('textarea')) {
                setMentionQuery(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isEmojiPickerOpen, isPrivacyMenuOpen, activePostMenuId, isEditPrivacyMenuOpen, mentionQuery]);

    // Real-time Friends List Sync
    useEffect(() => {
        let sentFriends: string[] = [];
        let receivedFriends: string[] = [];

        const updateCombinedFriends = () => {
            const combined = new Set([...sentFriends, ...receivedFriends]);
            setFriendIds(combined);
            // Fetch profiles for friends to enable tagging
            if (combined.size > 0) {
                fetchProfiles(combined);
            }
        };

        const unsub1 = db.collection('friendships')
            .where('requesterId', '==', user.id)
            .where('status', '==', 'accepted')
            .onSnapshot(snapshot => {
                sentFriends = snapshot.docs.map(doc => doc.data().recipientId);
                updateCombinedFriends();
            });

        const unsub2 = db.collection('friendships')
            .where('recipientId', '==', user.id)
            .where('status', '==', 'accepted')
            .onSnapshot(snapshot => {
                receivedFriends = snapshot.docs.map(doc => doc.data().requesterId);
                updateCombinedFriends();
            });

        return () => {
            unsub1();
            unsub2();
        };
    }, [user.id]);

    // Fetch Profiles Helper
    const fetchProfiles = async (userIds: Set<string>) => {
        const missingIds = Array.from(userIds).filter(id => !profilesMapRef.current[id]);
        if (missingIds.length === 0) return;

        const newProfiles: { [key: string]: Profile } = {};
        await Promise.all(missingIds.map(async (uid) => {
            try {
                const doc = await db.collection('profiles').doc(uid).get();
                if (doc.exists) {
                    newProfiles[uid] = { id: doc.id, ...doc.data() } as Profile;
                } else {
                    newProfiles[uid] = { id: uid, full_name: 'Unknown User', role: 'user', student_id: 'N/A' } as Profile;
                }
            } catch (e) {
                console.error("Error fetching profile", uid);
            }
        }));
        setProfilesMap(prev => ({ ...prev, ...newProfiles }));
    };

    // Fetch Posts
    useEffect(() => {
        setLoading(true);
        
        let query: any = db.collection('posts');
        
        if (targetUserId) {
            query = query.where('userId', '==', targetUserId);
        }

        const unsubscribe = query.onSnapshot(async (snapshot: any) => {
            const fetchedPosts = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            })) as Post[];

            const getMillis = (t: any) => {
                if (!t) return Date.now();
                if (typeof t.toDate === 'function') return t.toDate().getTime();
                return new Date(t).getTime();
            };

            fetchedPosts.sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));

            setPosts(fetchedPosts);
            
            const userIds = new Set<string>();
            fetchedPosts.forEach(p => {
                userIds.add(p.userId);
            });
            
            userIds.add(user.id); 
            await fetchProfiles(userIds);
            
            setLoading(false);
        }, (error: any) => {
            console.error("Error fetching posts:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [targetUserId, user.id]);

    // Filter posts based on privacy settings
    const visiblePosts = useMemo(() => {
        return posts.filter(post => {
            if (post.userId === user.id) return true;
            switch (post.privacy) {
                case 'only_me': return false;
                case 'friends': return friendIds.has(post.userId);
                case 'public': default: return true;
            }
        });
    }, [posts, user.id, friendIds]);

    // Ensure profiles loaded for reactions viewer
    useEffect(() => {
        if (viewingReactionsPostId) {
            const post = posts.find(p => p.id === viewingReactionsPostId);
            if (post && post.reactions) {
                const reactorIds = new Set<string>();
                Object.values(post.reactions).forEach(ids => {
                    if (Array.isArray(ids)) ids.forEach(id => reactorIds.add(id));
                });
                fetchProfiles(reactorIds);
            }
        }
    }, [viewingReactionsPostId, posts]);

    // ... (Daily Limit Logic & File Handling) ...
    const checkDailyLimit = (fileSize: number) => {
        const DAILY_LIMIT = 50 * 1024 * 1024; // 50 MB
        const today = new Date().toDateString();
        const key = `upload_usage_${user.id}`;
        const stored = localStorage.getItem(key);
        let usage = { date: today, bytes: 0 };

        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.date === today) {
                    usage = parsed;
                }
            } catch (e) {
                console.error("Error parsing usage stats", e);
            }
        }

        if (usage.bytes + fileSize > DAILY_LIMIT) {
            return false;
        }
        return true;
    };

    const updateDailyLimit = (fileSize: number) => {
        const today = new Date().toDateString();
        const key = `upload_usage_${user.id}`;
        const stored = localStorage.getItem(key);
        let usage = { date: today, bytes: 0 };
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.date === today) usage = parsed;
            } catch (e) {}
        }
        usage.bytes += fileSize;
        localStorage.setItem(key, JSON.stringify(usage));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // 10MB individual file limit safe check
            if (file.size > 10 * 1024 * 1024) {
                alert("File size too large. Max 10MB per file.");
                return;
            }

            // Check Daily Limit
            if (!checkDailyLimit(file.size)) {
                alert("Daily upload limit of 50MB reached. Please try again tomorrow.");
                return;
            }

            setSelectedFile(file);
            
            if (file.type.startsWith('image/')) {
                setPreviewUrl(URL.createObjectURL(file));
            } else {
                setPreviewUrl(null); 
            }
        }
    };

    const clearImageSelection = () => {
        setSelectedFile(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        if (imageInputRef.current) imageInputRef.current.value = '';
    };

    const uploadImage = async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', POST_UPLOAD_PRESET);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${POST_CLOUD_NAME}/auto/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const data = await response.json();
        updateDailyLimit(file.size);
        return data.secure_url;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setNewPostContent(val);
        
        // Auto resize
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;

        // Mention Logic
        const selectionEnd = e.target.selectionEnd;
        const textBeforeCursor = val.slice(0, selectionEnd);
        const words = textBeforeCursor.split(/\s/); // Split by whitespace
        const currentWord = words[words.length - 1];

        if (currentWord.startsWith('@')) {
            setMentionQuery(currentWord.slice(1));
            // Calculate approximate index for replacement
            setMentionIndex(textBeforeCursor.lastIndexOf('@'));
        } else {
            setMentionQuery(null);
        }
    };

    const handleMentionSelect = (profile: Profile) => {
        if (mentionIndex === -1) return;
        
        const beforeMention = newPostContent.slice(0, mentionIndex);
        // Find where the mention word ends (next whitespace or end of string)
        const afterCursor = newPostContent.slice(mentionIndex);
        const nextSpaceIndex = afterCursor.search(/\s/);
        const afterMention = nextSpaceIndex === -1 ? '' : afterCursor.slice(nextSpaceIndex);
        
        const newText = `${beforeMention}@${profile.full_name} ${afterMention}`;
        setNewPostContent(newText);
        setMentionQuery(null);
        
        // Refocus and reset cursor
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    // Filter suggestions based on query and ONLY friends
    const mentionSuggestions = useMemo(() => {
        if (mentionQuery === null) return [];
        const lowerQuery = mentionQuery.toLowerCase();
        
        return (Object.values(profilesMap) as Profile[]).filter(p => 
            friendIds.has(p.id) && // Strictly ensure only friends
            p.full_name.toLowerCase().includes(lowerQuery)
        ).slice(0, 5);
    }, [mentionQuery, profilesMap, friendIds]);

    const handleCreatePost = async () => {
        if (!newPostContent.trim() && !selectedFile) return;
        setIsPosting(true);
        
        try {
            let imageUrl = '';
            if (selectedFile) {
                imageUrl = await uploadImage(selectedFile);
            }

            const content = newPostContent.trim();
            const postRef = await db.collection('posts').add({
                userId: user.id,
                content: content,
                imageUrl: imageUrl || null,
                createdAt: firestore.FieldValue.serverTimestamp(),
                likes: [],
                reactions: {},
                replyCount: 0,
                privacy: postPrivacy,
                allowShare: allowShare 
            });

            // --- Handle Mentions Notifications ---
            // Regex matches @Name, @Name Surname, @Name Middle Surname (up to 3 words)
            // Updated regex to robustly capture names including dots, hyphens
            const mentionRegex = /@([a-zA-Z0-9_.-]+(?:\s[a-zA-Z0-9_.-]+){0,3})/g;
            const matches = content.match(mentionRegex);
            
            if (matches) {
                const uniqueNames = new Set(matches.map(m => m.slice(1).toLowerCase())); // Remove @, lowercase for matching
                const currentUserProfile = profilesMap[user.id];
                const senderName = currentUserProfile?.full_name || 'Someone';

                uniqueNames.forEach(lowerName => {
                    // Find profile by name from loaded profiles (case insensitive)
                    const targetUser = (Object.values(profilesMap) as Profile[]).find(p => p.full_name.toLowerCase() === lowerName);
                    if (targetUser && targetUser.id !== user.id) {
                        db.collection('notifications').add({
                            user_id: targetUser.id,
                            title: 'You were mentioned',
                            message: `${senderName} mentioned you in a post.`,
                            is_read: false,
                            notification_type: 'mention',
                            event_id: postRef.id, // Using event_id to store post ID for navigation
                            created_at: firestore.FieldValue.serverTimestamp(),
                        });
                    }
                });
            }

            setNewPostContent('');
            clearImageSelection();
            setPostPrivacy('public');
            setAllowShare(true);
            setMentionQuery(null);
            
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
            setIsEmojiPickerOpen(false);
        } catch (error: any) {
            console.error("Error creating post:", error);
            alert(`Failed to create post: ${error.message || 'Please check your connection.'}`);
        } finally {
            setIsPosting(false);
        }
    };

    // ... (Rest of reaction and edit handlers remain same) ...
    const handleReaction = async (post: Post, emoji: string) => {
        const postRef = db.collection('posts').doc(post.id);
        const currentReactions = post.reactions || {};
        
        if (post.likes && post.likes.length > 0 && !currentReactions['❤️']) {
            currentReactions['❤️'] = post.likes;
        }

        let existingReactionKey: string | null = null;
        for (const [key, userIds] of Object.entries(currentReactions)) {
            if (userIds.includes(user.id)) {
                existingReactionKey = key;
                break;
            }
        }

        const batch = db.batch();

        if (existingReactionKey === emoji) {
            batch.update(postRef, {
                [`reactions.${emoji}`]: firestore.FieldValue.arrayRemove(user.id),
                ...(emoji === '❤️' ? { likes: firestore.FieldValue.arrayRemove(user.id) } : {})
            });
        } else {
            if (existingReactionKey) {
                batch.update(postRef, {
                    [`reactions.${existingReactionKey}`]: firestore.FieldValue.arrayRemove(user.id),
                    ...(existingReactionKey === '❤️' ? { likes: firestore.FieldValue.arrayRemove(user.id) } : {})
                });
            }
            batch.update(postRef, {
                [`reactions.${emoji}`]: firestore.FieldValue.arrayUnion(user.id),
                ...(emoji === '❤️' ? { likes: firestore.FieldValue.arrayUnion(user.id) } : {})
            });

            // ADDED: Notification Logic
            if (post.userId !== user.id && !existingReactionKey) {
                const notificationRef = db.collection('notifications').doc();
                const senderName = profilesMap[user.id]?.full_name || 'Someone';
                batch.set(notificationRef, {
                    user_id: post.userId,
                    title: 'New Reaction',
                    message: `${senderName} reacted ${emoji} to your post.`,
                    is_read: false,
                    notification_type: 'reaction',
                    event_id: post.id,
                    created_at: firestore.FieldValue.serverTimestamp(),
                });
            }
        }

        setActiveReactionId(null);
        await batch.commit();
    };

    // --- Edit Post Functions ---
    const startEditing = (post: Post) => {
        setEditingPostId(post.id);
        setEditContent(post.content);
        setEditPrivacy(post.privacy || 'public');
        setEditAllowShare(post.allowShare !== undefined ? post.allowShare : true);
        setActivePostMenuId(null);
    };

    const cancelEditing = () => {
        setEditingPostId(null);
        setEditContent('');
        setEditPrivacy('public');
    };

    const handleSaveEdit = async () => {
        if (!editingPostId) return;
        try {
            await db.collection('posts').doc(editingPostId).update({
                content: editContent.trim(),
                privacy: editPrivacy,
                allowShare: editAllowShare
            });
            setEditingPostId(null);
        } catch (error) {
            console.error("Error updating post:", error);
            alert("Failed to update post.");
        }
    };

    const initiateDeletePost = (postId: string) => {
        setPostToDeleteId(postId);
        setIsDeleteModalOpen(true);
        setActivePostMenuId(null);
    };

    const confirmDeletePost = async () => {
        if (!postToDeleteId) return;
        setIsDeleting(true);
        try {
            const commentsSnapshot = await db.collection('comments').where('postId', '==', postToDeleteId).get();
            const batch = db.batch();
            commentsSnapshot.docs.forEach(doc => { batch.delete(doc.ref); });
            const postRef = db.collection('posts').doc(postToDeleteId);
            batch.delete(postRef);
            await batch.commit();
        } catch (error) {
            console.error("Error deleting post batch:", error);
            try { await db.collection('posts').doc(postToDeleteId).delete(); } catch (e) { console.error("Error deleting post:", e); }
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
            setPostToDeleteId(null);
        }
    };

    // --- Share as Image Logic ---
    const handleGenerateShareImage = async (post: Post, e: React.MouseEvent) => {
        e.stopPropagation();
        if (post.allowShare === false) return; 

        setGeneratingShareId(post.id);
        const author = profilesMap[post.userId];
        
        try {
            const card = document.createElement('div');
            card.style.width = '600px';
            card.style.padding = '40px';
            card.style.backgroundColor = '#ffffff';
            card.style.fontFamily = 'sans-serif';
            card.style.position = 'absolute';
            card.style.left = '-9999px';
            card.style.top = '-9999px';
            card.style.zIndex = '-1';
            
            const avatarSrc = author?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${author?.full_name || 'U'}`;
            
            let imageHtml = '';
            if (post.imageUrl && (post.imageUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) || post.imageUrl.includes('/image/upload/'))) {
                imageHtml = `<div style="margin-top: 20px; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
                    <img src="${post.imageUrl}" style="width: 100%; height: auto; display: block;" crossOrigin="anonymous" />
                </div>`;
            }

            card.innerHTML = `
                <div style="display: flex; align-items: center; margin-bottom: 20px;">
                    <img src="${avatarSrc}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; margin-right: 15px; border: 2px solid #f3f4f6;" crossOrigin="anonymous" />
                    <div>
                        <h2 style="margin: 0; font-size: 22px; color: #111827; font-weight: 700;">${author?.full_name || 'Unknown User'}</h2>
                        <p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">BseePortal Student</p>
                    </div>
                </div>
                <div style="font-size: 18px; color: #374151; line-height: 1.6; white-space: pre-wrap;">${post.content}</div>
                ${imageHtml}
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 800; color: #3b82f6; font-size: 16px; letter-spacing: 0.5px;">BseePortal</span>
                    <span style="color: #9ca3af; font-size: 12px;">bseeportal.app</span>
                </div>
            `;

            document.body.appendChild(card);

            if (typeof html2canvas !== 'undefined') {
                const canvas = await html2canvas(card, {
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    scale: 2 
                });

                const link = document.createElement('a');
                link.download = `BseePortal_Post_${post.id}.jpg`;
                link.href = canvas.toDataURL('image/jpeg', 0.9);
                link.click();
            } else {
                console.error("html2canvas not loaded");
                alert("Share feature unavailable. Please reload the page.");
            }
            document.body.removeChild(card);
        } catch (error) {
            console.error("Error generating share image:", error);
            alert("Could not generate image. This may be due to cross-origin restrictions on some images.");
        } finally {
            setGeneratingShareId(null);
        }
    };

    const getReactionCounts = (post: Post) => {
        const reactions = post.reactions || {};
        if ((!reactions['❤️'] || reactions['❤️'].length === 0) && post.likes && post.likes.length > 0) {
            reactions['❤️'] = post.likes;
        }

        let total = 0;
        let topEmojis: { emoji: string, count: number }[] = [];
        let myReaction: string | null = null;

        for (const [emoji, users] of Object.entries(reactions)) {
            if (Array.isArray(users)) {
                total += users.length;
                if (users.length > 0) {
                    topEmojis.push({ emoji, count: users.length });
                }
                if (users.includes(user.id)) {
                    myReaction = emoji;
                }
            }
        }

        topEmojis.sort((a, b) => b.count - a.count);
        return { total, topEmojis: topEmojis.slice(0, 3), myReaction };
    };

    const handleReactionButtonTouchStart = (e: React.TouchEvent | React.MouseEvent, postId: string) => {
        isLongPressRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            setActiveReactionId(postId);
            try {
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
            } catch(e) {}
        }, 500);
    };

    const handleReactionButtonTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleReactionButtonClick = (e: React.MouseEvent, post: Post, myReaction: string | null) => {
        if (isLongPressRef.current) {
            e.preventDefault();
            e.stopPropagation();
            isLongPressRef.current = false;
            return;
        }
        if (activeReactionId === post.id) {
            setActiveReactionId(null);
            return;
        }
        handleReaction(post, myReaction || '👍');
    };

    const handleDownloadImage = async (url: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `bsee_image_${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (e) {
            window.open(url, '_blank');
        }
    };

    const renderAttachment = (url: string, canDownload: boolean = true) => {
        const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.includes('/image/upload/');
        
        if (isImage) {
            return (
                <div 
                    className="mt-3 rounded-lg overflow-hidden border border-gray-100 cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={(e) => {
                        e.stopPropagation();
                        setViewingImage({ url, canDownload });
                    }}
                >
                    <img 
                        src={url} 
                        alt="Post attachment" 
                        className="w-full h-auto max-h-[500px] object-contain bg-gray-50" 
                        loading="lazy"
                    />
                </div>
            );
        } else {
            const fileName = url.split('/').pop()?.split('?')[0] || 'Document';
            return (
                <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                    <div className="p-2 bg-white rounded-md shadow-sm text-blue-600 mr-3 group-hover:text-blue-700">
                        <DownloadIcon className="h-5 w-5" />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-800">{fileName}</p>
                        <p className="text-xs text-gray-500">Click to view file</p>
                    </div>
                </a>
            );
        }
    };

    // Render text with clickable mentions
    const renderTextWithMentions = (text: string) => {
        // Robust regex for names (dots, hyphens, spaces) up to 3 parts
        const parts = text.split(/(@[a-zA-Z0-9_.-]+(?:\s[a-zA-Z0-9_.-]+){0,3})/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                const name = part.slice(1);
                // Look up profile by name from profilesMap (case insensitive)
                const profile = (Object.values(profilesMap) as Profile[]).find(p => p.full_name.toLowerCase() === name.toLowerCase());
                if (profile) {
                    return (
                        <span 
                            key={index} 
                            className="text-blue-600 font-bold hover:underline cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onViewProfile) onViewProfile(profile);
                            }}
                        >
                            {part}
                        </span>
                    );
                }
            }
            return <span key={index}>{part}</span>;
        });
    };

    const userProfile = profilesMap[user.id];

    return (
        <div className="max-w-2xl mx-auto pb-20">
            {/* ... Lightbox, Confirmation, Reaction Modal, etc ... */}
            {viewingImage && (
                <div 
                    className="fixed inset-0 z-[200] bg-black/90 flex justify-center items-center p-4 animate-fade-in"
                    onClick={() => setViewingImage(null)}
                    onContextMenu={(e) => !viewingImage.canDownload && e.preventDefault()}
                >
                    <button onClick={() => setViewingImage(null)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"><XIcon className="h-6 w-6" /></button>
                    {viewingImage.canDownload && (
                        <button onClick={(e) => { e.stopPropagation(); handleDownloadImage(viewingImage.url); }} className="absolute top-4 right-16 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-30 flex items-center gap-2 px-4" title="Save Image">
                            <DownloadIcon className="h-5 w-5" /><span className="text-sm font-bold hidden sm:inline">Save</span>
                        </button>
                    )}
                    <img src={viewingImage.url} alt="Full size" className={`max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-fade-in-up ${!viewingImage.canDownload ? 'protected-content' : ''}`} onClick={(e) => e.stopPropagation()} onContextMenu={(e) => !viewingImage.canDownload && e.preventDefault()} />
                    {!viewingImage.canDownload && <div className="absolute inset-0 z-20" onContextMenu={(e) => e.preventDefault()}></div>}
                </div>
            )}
            
            <ReactionsModal isOpen={!!viewingReactionsPostId} onClose={() => setViewingReactionsPostId(null)} reactions={posts.find(p => p.id === viewingReactionsPostId)?.reactions || {}} profilesMap={profilesMap} currentUser={user} onViewProfile={onViewProfile} />
            <PostDetailModal isOpen={!!selectedPost} onClose={() => setSelectedPost(null)} post={selectedPost} author={selectedPost ? profilesMap[selectedPost.userId] : null} currentUser={user} currentUserProfile={profilesMap[user.id]} onViewProfile={onViewProfile} />
            <ConfirmationModal isOpen={!!isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDeletePost} title="Delete Post" message="Are you sure you want to delete this post? This action cannot be undone." confirmButtonText="Delete" isConfirming={isDeleting} />

            {/* --- Create Post Box --- */}
            {!targetUserId && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl mb-6 group hover:shadow-sm transition-all duration-300 relative">
                    {/* Mention Suggestions */}
                    {mentionQuery !== null && mentionSuggestions.length > 0 && (
                        <div className="absolute bottom-full left-4 mb-2 w-64 bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-blue-100 z-50 overflow-hidden mention-suggestions animate-fade-in-up">
                            <div className="px-3 py-2 text-xs font-bold text-gray-500 bg-blue-50/50 uppercase tracking-wider">Tag Friends</div>
                            {mentionSuggestions.map(profile => (
                                <button key={profile.id} onClick={() => handleMentionSelect(profile)} className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 transition-colors border-b border-gray-100 last:border-0">
                                    <img src={profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.full_name}`} className="h-8 w-8 rounded-full object-cover bg-gray-100" alt="" />
                                    <div><div className="font-semibold text-sm text-gray-800">{profile.full_name}</div><div className="text-xs text-gray-500">{profile.student_id}</div></div>
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="p-4">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0">
                                {userProfile?.avatar_url ? (
                                    <img src={userProfile.avatar_url} alt="Me" className="h-10 w-10 rounded-full object-cover cursor-pointer" onClick={() => onViewProfile && userProfile && onViewProfile(userProfile)} />
                                ) : (
                                    <UserCircleIcon className="h-10 w-10 text-gray-300 cursor-pointer" onClick={() => onViewProfile && userProfile && onViewProfile(userProfile)} />
                                )}
                            </div>
                            <div className="flex-1">
                                <textarea
                                    ref={textareaRef}
                                    value={newPostContent}
                                    onChange={handleInputChange}
                                    placeholder={`What's on your mind, ${userProfile?.full_name?.split(' ')[0] || 'User'}?`}
                                    className="w-full bg-transparent border-none !outline-none !ring-0 !shadow-none focus:ring-0 focus:outline-none text-lg placeholder-gray-500 text-gray-800 dark:text-white resize-none min-h-[80px]"
                                    rows={1}
                                />
                                {selectedFile && (
                                    <div className="mt-2 relative inline-block group">
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Preview" className="h-24 w-auto rounded-lg border border-gray-200 object-cover" />
                                        ) : (
                                            <div className="h-24 w-64 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center flex-col text-gray-500 p-2">
                                                <DownloadIcon className="h-6 w-6 mb-1" />
                                                <span className="text-xs truncate max-w-full px-2">{selectedFile.name}</span>
                                                <span className="text-[10px]">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                                            </div>
                                        )}
                                        <button onClick={clearImageSelection} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 shadow-md hover:bg-gray-700 transition-colors"><XIcon className="h-3 w-3" /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="px-4 py-3 flex justify-between items-center border-t border-gray-100 dark:border-gray-700">
                        <div className="flex gap-2">
                            {/* Privacy Selector */}
                            <div className="relative privacy-container">
                                <button onClick={() => setIsPrivacyMenuOpen(!isPrivacyMenuOpen)} className="flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                    {postPrivacy === 'public' && <GlobeIcon className="h-3 w-3" />}
                                    {postPrivacy === 'friends' && <UsersIcon className="h-3 w-3" />}
                                    {postPrivacy === 'only_me' && <LockClosedIcon className="h-3 w-3" />}
                                    <span>{postPrivacy === 'public' ? 'Public' : postPrivacy === 'friends' ? 'Friends' : 'Only Me'}</span>
                                    <ChevronDownIcon className="h-3 w-3" />
                                </button>
                                
                                {isPrivacyMenuOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-fade-in-up">
                                        <button onClick={() => { setPostPrivacy('public'); setIsPrivacyMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><GlobeIcon className="h-4 w-4" /> Public</button>
                                        <button onClick={() => { setPostPrivacy('friends'); setIsPrivacyMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><UsersIcon className="h-4 w-4" /> Friends</button>
                                        <button onClick={() => { setPostPrivacy('only_me'); setIsPrivacyMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><LockClosedIcon className="h-4 w-4" /> Only Me</button>
                                        <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                        <button onClick={() => { setAllowShare(!allowShare); }} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><span className="flex items-center gap-2"><ShareIcon className="h-4 w-4" /> Allow Share</span>{allowShare && <CheckIcon className="h-3 w-3 text-blue-600" />}</button>
                                    </div>
                                )}
                            </div>

                            <button onClick={() => imageInputRef.current?.click()} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors" title="Photo"><PhotoIcon className="h-5 w-5 text-green-600" /></button>
                            <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />

                            <div className="relative emoji-container">
                                <button onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)} className={`p-2 rounded-full transition-colors ${isEmojiPickerOpen ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`} title="Emoji"><EmojiIcon className="h-5 w-5 text-yellow-500" /></button>
                                {isEmojiPickerOpen && (
                                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 p-2 w-64 grid grid-cols-6 gap-1 z-50 animate-fade-in-up">
                                        {EXTENDED_EMOJIS.map(emoji => <button key={emoji} onClick={() => setNewPostContent(prev => prev + emoji)} className="text-xl p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-transform hover:scale-110">{emoji}</button>)}
                                    </div>
                                )}
                            </div>
                        </div>
                        <button onClick={handleCreatePost} disabled={isPosting || (!newPostContent.trim() && !selectedFile)} className="bg-blue-600 text-white px-6 py-1.5 rounded-full text-sm font-bold shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center">
                            {isPosting && <Spinner className="h-3 w-3 mr-2 text-white" />} Post
                        </button>
                    </div>
                </div>
            )}

            {/* --- Feed List --- */}
            <div className="space-y-6">
                {loading ? <div className="flex justify-center py-10"><Spinner className="text-gray-400" /></div> : visiblePosts.length === 0 ? <div className="text-center py-10 text-gray-500"><div className="bg-gray-100 dark:bg-gray-800 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4"><UserCircleIcon className="h-10 w-10 text-gray-400" /></div><p>No posts available.</p>{!targetUserId && <p className="text-sm mt-2">Add friends to see their updates!</p>}</div> : (
                    visiblePosts.map(post => {
                        const author = profilesMap[post.userId];
                        const { total, topEmojis, myReaction } = getReactionCounts(post);
                        const isEditMode = editingPostId === post.id;
                        const canDownload = post.allowShare !== false;

                        if (isEditMode) {
                            return (
                                <div key={post.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-blue-200 dark:border-blue-900 p-4 animate-fade-in">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2">Editing Post</h3>
                                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mb-3 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" rows={3} />
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="relative edit-privacy-container">
                                            <button onClick={() => setIsEditPrivacyMenuOpen(!isEditPrivacyMenuOpen)} className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300">
                                                {editPrivacy === 'public' ? <GlobeIcon className="h-3 w-3" /> : editPrivacy === 'friends' ? <UsersIcon className="h-3 w-3" /> : <LockClosedIcon className="h-3 w-3" />}
                                                {editPrivacy === 'public' ? 'Public' : editPrivacy === 'friends' ? 'Friends' : 'Only Me'}
                                            </button>
                                            {isEditPrivacyMenuOpen && (
                                                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 animate-fade-in-up">
                                                    <button onClick={() => { setEditPrivacy('public'); setIsEditPrivacyMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Public</button>
                                                    <button onClick={() => { setEditPrivacy('friends'); setIsEditPrivacyMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Friends</button>
                                                    <button onClick={() => { setEditPrivacy('only_me'); setIsEditPrivacyMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Only Me</button>
                                                    <div className="border-t my-1"></div>
                                                    <button onClick={() => setEditAllowShare(!editAllowShare)} className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50">Allow Share {editAllowShare && <CheckIcon className="h-3 w-3 text-blue-600" />}</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={cancelEditing} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors">Cancel</button>
                                        <button onClick={handleSaveEdit} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Save</button>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={post.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow ${post.allowShare === false ? 'protected-content' : ''}`}>
                                {/* Post Header */}
                                <div className="p-4 flex justify-between items-start">
                                    <div className="flex gap-3">
                                        {author?.avatar_url ? (
                                            <img src={author.avatar_url} alt={author.full_name} className="h-10 w-10 rounded-full object-cover border border-gray-100 cursor-pointer" onClick={(e) => { e.stopPropagation(); onViewProfile && author && onViewProfile(author); }} />
                                        ) : (
                                            <UserCircleIcon className="h-10 w-10 text-gray-300 cursor-pointer" onClick={(e) => { e.stopPropagation(); onViewProfile && author && onViewProfile(author); }} />
                                        )}
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); onViewProfile && author && onViewProfile(author); }}>{author?.full_name || 'Unknown User'}</h3>
                                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                <span>{author?.role}</span><span>•</span><span>{post.createdAt ? ((post.createdAt as any).toDate ? (post.createdAt as any).toDate().toLocaleDateString() : new Date(post.createdAt as any).toLocaleDateString()) : 'Just now'}</span>
                                                <span className="ml-1 text-gray-400">{post.privacy === 'public' ? <GlobeIcon className="h-3 w-3" /> : post.privacy === 'friends' ? <UsersIcon className="h-3 w-3" /> : <LockClosedIcon className="h-3 w-3" />}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {post.userId === user.id && (
                                        <div className="relative post-menu-container">
                                            <button onClick={() => setActivePostMenuId(activePostMenuId === post.id ? null : post.id)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"><DotsHorizontalIcon className="h-5 w-5" /></button>
                                            {activePostMenuId === post.id && (
                                                <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-10 animate-fade-in-up overflow-hidden">
                                                    <button onClick={() => startEditing(post)} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"><PencilIcon inWrapper={false} className="h-3 w-3 mr-2" /> Edit</button>
                                                    <button onClick={() => initiateDeletePost(post.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"><TrashIcon className="h-3 w-3 mr-2" /> Delete</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Post Content */}
                                <div className="px-4 pb-2">
                                    <p className="text-gray-800 dark:text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">{renderTextWithMentions(post.content)}</p>
                                    {post.imageUrl && renderAttachment(post.imageUrl, canDownload)}
                                </div>

                                {/* Reactions & Stats */}
                                <div className="px-4 py-2 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 border-b border-gray-50 dark:border-gray-700/50">
                                    <div className="flex items-center gap-1 h-6">
                                        {total > 0 && (
                                            <button onClick={() => setViewingReactionsPostId(post.id)} className="flex items-center hover:underline cursor-pointer gap-1">
                                                <div className="flex -space-x-1">{topEmojis.map((item, idx) => <span key={item.emoji} className="bg-gray-100 rounded-full w-4 h-4 flex items-center justify-center border border-white text-[10px] z-[3-idx]">{item.emoji}</span>)}</div>
                                                <span>{total}</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-3"><span>{post.replyCount || 0} comments</span></div>
                                </div>

                                {/* Action Buttons */}
                                <div className="px-2 py-1 flex justify-between items-center">
                                    <div className="flex gap-1 relative group/reaction-btn">
                                        <button onClick={(e) => handleReactionButtonClick(e, post, myReaction)} onTouchStart={(e) => handleReactionButtonTouchStart(e, post.id)} onTouchEnd={(e) => handleReactionButtonTouchEnd(e)} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${myReaction ? 'text-blue-600 font-semibold' : 'text-gray-500 dark:text-gray-400 font-medium'}`}>
                                            {myReaction ? <span>{myReaction}</span> : <ThumbUpIcon className="h-5 w-5" />}<span className="text-xs">Like</span>
                                        </button>
                                        {activeReactionId === post.id && (
                                            <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 shadow-xl rounded-full p-1.5 flex gap-1 animate-fade-in-up z-20 border border-gray-100 dark:border-gray-700 select-none">
                                                {REACTION_EMOJIS.map(emoji => <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReaction(post, emoji); }} className={`text-2xl hover:scale-125 transition-transform p-1 rounded-full origin-bottom ${myReaction === emoji ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>{emoji}</button>)}
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => setSelectedPost(post)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium text-xs transition-colors"><MessageCircleIcon className="h-4 w-4" /> Comment</button>
                                    <button onClick={(e) => handleGenerateShareImage(post, e)} disabled={post.allowShare === false || !!generatingShareId} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-xs font-medium ${post.allowShare === false ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-400'}`} title={post.allowShare === false ? "Sharing disabled by author" : "Share as Image"}>{generatingShareId === post.id ? <Spinner className="h-4 w-4" /> : <ShareIcon className="h-4 w-4" />} Share</button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Feed;
