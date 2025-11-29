
// ... (imports)
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db, firestore } from '../services';
import type { Post, PostComment, Profile } from '../types';
import { Spinner } from './Spinner';
import { XIcon, SendIcon, UserCircleIcon, ReplyIcon, EmojiIcon, HeartIconSolid, TrashIcon, DownloadIcon, ClipboardIcon, PencilIcon, EyeOffIcon, ThumbUpIcon } from './Icons';
import ConfirmationModal from './ConfirmationModal';
import ReactionsModal from './ReactionsModal';

interface PostDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    post: Post | null;
    author: Profile | null;
    currentUser: { id: string };
    currentUserProfile?: Profile;
    onViewProfile?: (profile: Profile) => void;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const PostDetailModal: React.FC<PostDetailModalProps> = ({ isOpen, onClose, post, author, currentUser, currentUserProfile, onViewProfile }) => {
    // ... (state definitions)
    const [livePost, setLivePost] = useState<Post | null>(post);
    
    const [comments, setComments] = useState<PostComment[]>([]);
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(true);
    const [commenters, setCommenters] = useState<{ [key: string]: Profile }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [replyingTo, setReplyingTo] = useState<PostComment | null>(null);
    const [activeReactionCommentId, setActiveReactionCommentId] = useState<string | null>(null);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    
    // Deletion State
    const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);
    const [isDeletingComment, setIsDeletingComment] = useState(false);

    // Local Hide State (View Only Removal)
    const [hiddenCommentIds, setHiddenCommentIds] = useState<Set<string>>(new Set());

    // Edit State
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editCommentText, setEditCommentText] = useState('');
    
    // Image Lightbox State
    const [viewingImage, setViewingImage] = useState<{ url: string, canDownload: boolean } | null>(null);

    // Reaction Viewer State
    const [viewingReactionsCommentId, setViewingReactionsCommentId] = useState<string | null>(null);
    const [showPostReactions, setShowPostReactions] = useState(false);

    // Long Press / Menu State
    const [activeCommentMenuId, setActiveCommentMenuId] = useState<string | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isScrollingRef = useRef(false);

    // Friend Fetching for Mentions
    const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionIndex, setMentionIndex] = useState<number>(-1);

    // Post Reaction state inside modal
    const [activePostReactionId, setActivePostReactionId] = useState<string | null>(null);

    const commentsEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
        }
    }, [commentText]);

    // Real-time Friends List Sync (Matches Feed.tsx logic)
    useEffect(() => {
        let sentFriends: string[] = [];
        let receivedFriends: string[] = [];

        const updateCombinedFriends = () => {
            const combined = new Set([...sentFriends, ...receivedFriends]);
            setFriendIds(combined);
            // We need to ensure we have profiles for these friends to suggest them
            if (combined.size > 0) fetchMissingProfiles(Array.from(combined));
        };

        const unsub1 = db.collection('friendships')
            .where('requesterId', '==', currentUser.id)
            .where('status', '==', 'accepted')
            .onSnapshot(snapshot => {
                sentFriends = snapshot.docs.map(doc => doc.data().recipientId);
                updateCombinedFriends();
            });

        const unsub2 = db.collection('friendships')
            .where('recipientId', '==', currentUser.id)
            .where('status', '==', 'accepted')
            .onSnapshot(snapshot => {
                receivedFriends = snapshot.docs.map(doc => doc.data().requesterId);
                updateCombinedFriends();
            });

        return () => {
            unsub1();
            unsub2();
        };
    }, [currentUser.id]);

    // Subscribe to Post Updates
    useEffect(() => {
        if (!post?.id) return;
        const unsubscribe = db.collection('posts').doc(post.id).onSnapshot(doc => {
            if (doc.exists) {
                setLivePost({ id: doc.id, ...doc.data() } as Post);
            }
        });
        return () => unsubscribe();
    }, [post?.id]);

    // Subscribe to Comments
    useEffect(() => {
        if (!isOpen || !post) return;
        setLoading(true);

        const unsubscribe = db.collection('comments')
            .where('postId', '==', post.id)
            .onSnapshot(async (snapshot) => {
                const fetchedComments = snapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }))
                    .filter((c: any) => !c.isDeleted) as PostComment[];

                const userIds = new Set(fetchedComments.map(c => c.userId));
                if (currentUserProfile) userIds.add(currentUser.id);

                await fetchMissingProfiles(Array.from(userIds));
                setComments(fetchedComments);
                setLoading(false);
            });

        return () => unsubscribe();
    }, [isOpen, post?.id]);

    // Focus input when replying
    useEffect(() => {
        if (replyingTo && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [replyingTo]);

    // Close pickers on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Element;
            if (activeReactionCommentId && !target.closest('.reaction-picker-container')) {
                setActiveReactionCommentId(null);
            }
            if (isEmojiPickerOpen && !target.closest('.emoji-picker-container')) {
                setIsEmojiPickerOpen(false);
            }
            if (mentionQuery !== null && !target.closest('.mention-suggestions') && !target.closest('textarea')) {
                setMentionQuery(null);
            }
            // Close post reaction picker
            if (activePostReactionId && !target.closest('.post-reaction-btn')) {
                setActivePostReactionId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeReactionCommentId, isEmojiPickerOpen, mentionQuery, activePostReactionId]);

    // Input Change & Mention Detection
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setCommentText(val);
        
        // Auto resize
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;

        // Mention Logic
        const selectionEnd = e.target.selectionEnd;
        const textBeforeCursor = val.slice(0, selectionEnd);
        const words = textBeforeCursor.split(/\s/);
        const currentWord = words[words.length - 1];

        if (currentWord.startsWith('@')) {
            setMentionQuery(currentWord.slice(1));
            setMentionIndex(textBeforeCursor.lastIndexOf('@'));
        } else {
            setMentionQuery(null);
        }
    };

    const handleMentionSelect = (profile: Profile) => {
        if (mentionIndex === -1) return;
        
        const beforeMention = commentText.slice(0, mentionIndex);
        const afterCursor = commentText.slice(mentionIndex);
        const nextSpaceIndex = afterCursor.search(/\s/);
        const afterMention = nextSpaceIndex === -1 ? '' : afterCursor.slice(nextSpaceIndex);
        
        const newText = `${beforeMention}@${profile.full_name} ${afterMention}`;
        setCommentText(newText);
        setMentionQuery(null);
        
        if (textareaRef.current) textareaRef.current.focus();
    };

    const mentionSuggestions = useMemo(() => {
        if (mentionQuery === null) return [];
        const lowerQuery = mentionQuery.toLowerCase();
        
        return (Object.values(commenters) as Profile[]).filter(p => 
            friendIds.has(p.id) && // Strictly ensure only friends
            p.full_name.toLowerCase().includes(lowerQuery)
        ).slice(0, 5);
    }, [mentionQuery, commenters, friendIds]);

    const handleSendComment = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!commentText.trim() || !post) return;

        setIsSubmitting(true);
        try {
            const newComment: any = {
                postId: post.id,
                userId: currentUser.id,
                content: commentText.trim(),
                createdAt: firestore.FieldValue.serverTimestamp(),
                reactions: {}
            };

            if (replyingTo) {
                newComment.parentId = replyingTo.id;
            }

            await db.collection('comments').add(newComment);

            await db.collection('posts').doc(post.id).update({
                replyCount: firestore.FieldValue.increment(1)
            });

            const senderName = currentUserProfile?.full_name || 'Someone';

            // --- Notifications for Comment/Reply ---
            if (replyingTo) {
                // Reply Notification
                if (replyingTo.userId !== currentUser.id) {
                    db.collection('notifications').add({
                        user_id: replyingTo.userId,
                        title: 'New Reply',
                        message: `${senderName} replied to your comment.`,
                        is_read: false,
                        notification_type: 'comment',
                        event_id: post.id,
                        created_at: firestore.FieldValue.serverTimestamp(),
                    });
                }
            } else {
                // Root Comment Notification
                if (post.userId !== currentUser.id) {
                    db.collection('notifications').add({
                        user_id: post.userId,
                        title: 'New Comment',
                        message: `${senderName} commented on your post.`,
                        is_read: false,
                        notification_type: 'comment',
                        event_id: post.id,
                        created_at: firestore.FieldValue.serverTimestamp(),
                    });
                }
            }

            // --- Handle Mentions Notifications ---
            const mentionRegex = /@([a-zA-Z0-9_.-]+(?:\s[a-zA-Z0-9_.-]+){0,3})/g;
            const matches = commentText.trim().match(mentionRegex);
            if (matches) {
                const uniqueNames = new Set(matches.map(m => m.slice(1).toLowerCase()));
                uniqueNames.forEach(lowerName => {
                    const targetUser = (Object.values(commenters) as Profile[]).find(p => p.full_name.toLowerCase() === lowerName);
                    if (targetUser && targetUser.id !== currentUser.id) {
                        db.collection('notifications').add({
                            user_id: targetUser.id,
                            title: 'You were mentioned',
                            message: `${senderName} mentioned you in a comment.`,
                            is_read: false,
                            notification_type: 'mention',
                            event_id: post.id,
                            created_at: firestore.FieldValue.serverTimestamp(),
                        });
                    }
                });
            }

            setCommentText('');
            setReplyingTo(null);
            setIsEmojiPickerOpen(false);
            setMentionQuery(null);
            
            if (textareaRef.current) textareaRef.current.style.height = 'auto';

            setTimeout(() => {
                commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (error) {
            console.error("Error sending comment:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ... (rest of component code like deletion, editing, reactions remains mostly same)
    const initiateDeleteComment = (commentId: string) => {
        setCommentToDeleteId(commentId);
        setActiveCommentMenuId(null);
    };

    const handleHideComment = (commentId: string) => {
        setHiddenCommentIds(prev => new Set(prev).add(commentId));
        setActiveCommentMenuId(null);
    };

    const confirmDeleteComment = async () => {
        if (!commentToDeleteId || !post) return;
        setIsDeletingComment(true);
        try {
            await db.collection('comments').doc(commentToDeleteId).delete();
            await db.collection('posts').doc(post.id).update({
                replyCount: firestore.FieldValue.increment(-1)
            });
        } catch (e) {
            console.error("Error deleting comment:", e);
        } finally {
            setIsDeletingComment(false);
            setCommentToDeleteId(null);
        }
    };

    const startEditingComment = (commentId: string) => {
        const comment = comments.find(c => c.id === commentId);
        if (comment) {
            setEditingCommentId(comment.id);
            setEditCommentText(comment.content);
            setActiveCommentMenuId(null);
        }
    };

    const cancelEditingComment = () => {
        setEditingCommentId(null);
        setEditCommentText('');
    };

    const saveEditingComment = async () => {
        if (!editingCommentId || !editCommentText.trim()) return;
        try {
            await db.collection('comments').doc(editingCommentId).update({
                content: editCommentText.trim(),
                isEdited: true
            });
            setEditingCommentId(null);
            setEditCommentText('');
        } catch (e) {
            console.error("Failed to edit comment", e);
        }
    };

    const handleCommentReaction = async (commentId: string, emoji: string, currentReactions: any) => {
        const commentRef = db.collection('comments').doc(commentId);
        const userId = currentUser.id;
        
        // Find comment for author info
        const comment = comments.find(c => c.id === commentId);

        let existingEmoji: string | null = null;
        if (currentReactions) {
            for (const [key, users] of Object.entries(currentReactions)) {
                if (Array.isArray(users) && (users as string[]).includes(userId)) {
                    existingEmoji = key;
                    break;
                }
            }
        }

        const batch = db.batch();
        if (existingEmoji === emoji) {
            batch.update(commentRef, { [`reactions.${emoji}`]: firestore.FieldValue.arrayRemove(userId) });
        } else {
            if (existingEmoji) {
                batch.update(commentRef, { [`reactions.${existingEmoji}`]: firestore.FieldValue.arrayRemove(userId) });
            }
            batch.update(commentRef, { [`reactions.${emoji}`]: firestore.FieldValue.arrayUnion(userId) });

            // ADDED: Notification Logic
            if (comment && comment.userId !== userId && !existingEmoji) {
                const notificationRef = db.collection('notifications').doc();
                const senderName = currentUserProfile?.full_name || 'Someone';
                batch.set(notificationRef, {
                    user_id: comment.userId,
                    title: 'New Reaction',
                    message: `${senderName} reacted ${emoji} to your comment.`,
                    is_read: false,
                    notification_type: 'reaction', // Using generic 'reaction' type
                    event_id: post?.id,
                    created_at: firestore.FieldValue.serverTimestamp(),
                });
            }
        }
        setActiveReactionCommentId(null);
        await batch.commit();
    };

    // --- Post Reaction Handler inside Modal ---
    const handleReaction = async (targetPost: Post, emoji: string) => {
        const postRef = db.collection('posts').doc(targetPost.id);
        const currentReactions = targetPost.reactions || {};
        
        if (targetPost.likes && targetPost.likes.length > 0 && !currentReactions['❤️']) {
            currentReactions['❤️'] = targetPost.likes;
        }

        let existingReactionKey: string | null = null;
        for (const [key, userIds] of Object.entries(currentReactions)) {
            if (userIds.includes(currentUser.id)) {
                existingReactionKey = key;
                break;
            }
        }

        const batch = db.batch();

        if (existingReactionKey === emoji) {
            batch.update(postRef, {
                [`reactions.${emoji}`]: firestore.FieldValue.arrayRemove(currentUser.id),
                ...(emoji === '❤️' ? { likes: firestore.FieldValue.arrayRemove(currentUser.id) } : {})
            });
        } else {
            if (existingReactionKey) {
                batch.update(postRef, {
                    [`reactions.${existingReactionKey}`]: firestore.FieldValue.arrayRemove(currentUser.id),
                    ...(existingReactionKey === '❤️' ? { likes: firestore.FieldValue.arrayRemove(currentUser.id) } : {})
                });
            }
            batch.update(postRef, {
                [`reactions.${emoji}`]: firestore.FieldValue.arrayUnion(currentUser.id),
                ...(emoji === '❤️' ? { likes: firestore.FieldValue.arrayUnion(currentUser.id) } : {})
            });

            // ADDED: Notification Logic
            if (targetPost.userId !== currentUser.id && !existingReactionKey) {
                const notificationRef = db.collection('notifications').doc();
                const senderName = currentUserProfile?.full_name || 'Someone';
                batch.set(notificationRef, {
                    user_id: targetPost.userId,
                    title: 'New Reaction',
                    message: `${senderName} reacted ${emoji} to your post.`,
                    is_read: false,
                    notification_type: 'reaction',
                    event_id: targetPost.id,
                    created_at: firestore.FieldValue.serverTimestamp(),
                });
            }
        }

        setActivePostReactionId(null);
        await batch.commit();
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

    const handleCopyComment = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setActiveCommentMenuId(null);
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const handleTouchStart = (commentId: string) => {
        isScrollingRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            if (!isScrollingRef.current) {
                setActiveCommentMenuId(commentId);
                try {
                    if (navigator.vibrate) navigator.vibrate(50);
                } catch (e) { /* ignore */ }
            }
        }, 500);
    };

    const handleTouchMove = () => {
        isScrollingRef.current = true;
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleTouchEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return 'Just now';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            const now = new Date();
            const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
            if (diff < 60) return 'Just now';
            if (diff < 3600) return `${Math.floor(diff / 60)}m`;
            if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch (e) { return ''; }
    };

    const fetchMissingProfiles = async (userIds: string[]) => {
        const missingIds = userIds.filter(id => !commenters[id]);
        if (missingIds.length === 0) return;

        const newProfiles: { [key: string]: Profile } = {};
        await Promise.all(missingIds.map(async (uid) => {
            try {
                const doc = await db.collection('profiles').doc(uid).get();
                if (doc.exists) {
                    newProfiles[uid] = { id: doc.id, ...doc.data() } as Profile;
                }
            } catch (e) {
                console.error("Error fetching profile", uid);
            }
        }));
        setCommenters(prev => ({ ...prev, ...newProfiles }));
    };

    // Render text with clickable mentions (Case Insensitive)
    const renderTextWithMentions = (text: string) => {
        // Robust regex for names (dots, hyphens, spaces) up to 3 parts
        const parts = text.split(/(@[a-zA-Z0-9_.-]+(?:\s[a-zA-Z0-9_.-]+){0,3})/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                const name = part.slice(1);
                // Look up profile by name from commenters map (case insensitive)
                const profile = (Object.values(commenters) as Profile[]).find(p => p.full_name.toLowerCase() === name.toLowerCase());
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

    // ... (rest of the component JSX like getPostStats, handleViewPostReactions, etc.)
    const getPostStats = () => {
        if (!livePost) return { total: 0, topEmojis: [], reactions: {} };
        const reactions: { [key: string]: string[] } = { ...(livePost.reactions || {}) };
        if (livePost.likes && livePost.likes.length > 0) {
            const existingHearts = reactions['❤️'] || [];
            const mergedHearts = Array.from(new Set([...existingHearts, ...livePost.likes]));
            if (mergedHearts.length > 0) reactions['❤️'] = mergedHearts;
        }
        
        let total = 0;
        let topEmojis: { emoji: string, count: number }[] = [];
        let myReaction: string | null = null;

        for (const [emoji, users] of Object.entries(reactions)) {
            if (Array.isArray(users)) {
                total += users.length;
                if (users.length > 0) topEmojis.push({ emoji, count: users.length });
                if (users.includes(currentUser.id)) myReaction = emoji;
            }
        }
        
        topEmojis.sort((a, b) => b.count - a.count);
        return { total, topEmojis: topEmojis.slice(0, 3), reactions, myReaction };
    };

    const { total: totalReactions, topEmojis, reactions: effectivePostReactions, myReaction } = getPostStats();

    const handleViewPostReactions = () => {
        const allReactorIds = new Set<string>();
        Object.values(effectivePostReactions).forEach(ids => {
            if (Array.isArray(ids)) ids.forEach(id => allReactorIds.add(id));
        });
        fetchMissingProfiles(Array.from(allReactorIds));
        setShowPostReactions(true);
    };

    const handleViewCommentReactions = (comment: PostComment) => {
        const allReactorIds = new Set<string>();
        Object.values(comment.reactions || {}).forEach(ids => {
            if (Array.isArray(ids)) ids.forEach(id => allReactorIds.add(id));
        });
        fetchMissingProfiles(Array.from(allReactorIds));
        setViewingReactionsCommentId(comment.id);
    };

    const renderAttachment = (url: string) => {
        const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || url.includes('/image/upload/');
        const canDownload = livePost?.allowShare !== false;

        if (isImage) {
            return (
                <div 
                    className="mt-3 rounded-lg overflow-hidden border border-gray-100 cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={(e) => {
                        e.stopPropagation();
                        setViewingImage({ url, canDownload });
                    }}
                >
                    <img src={url} alt="Post attachment" className="w-full h-auto max-h-[500px] object-contain bg-gray-50" loading="lazy" />
                </div>
            );
        } else {
            const fileName = url.split('/').pop()?.split('?')[0] || 'Document';
            return (
                <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="mt-3 flex items-center p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group">
                    <div className="p-2 bg-white rounded-md shadow-sm text-blue-600 mr-3 group-hover:text-blue-700"><DownloadIcon className="h-5 w-5" /></div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-800">{fileName}</p>
                        <p className="text-xs text-gray-500">Click to view file</p>
                    </div>
                </a>
            );
        }
    };

    const renderCommentList = () => {
        const visibleComments = comments.filter(c => !hiddenCommentIds.has(c.id));
        const sortedComments = [...visibleComments].sort((a, b) => {
            const tA = a.createdAt ? ((a.createdAt as any).toDate ? (a.createdAt as any).toDate().getTime() : new Date(a.createdAt as any).getTime()) : Date.now();
            const tB = b.createdAt ? ((b.createdAt as any).toDate ? (b.createdAt as any).toDate().getTime() : new Date(b.createdAt as any).getTime()) : Date.now();
            return tA - tB;
        });
        const rootComments = sortedComments.filter(c => !c.parentId);
        
        return rootComments.map(rootComment => {
            const replies = sortedComments.filter(c => c.parentId === rootComment.id);
            return (
                <div key={rootComment.id} className="mb-6 last:mb-0 animate-fade-in">
                    {renderCommentItem(rootComment)}
                    {replies.length > 0 && (
                        <div className="ml-10 mt-2 pl-3 border-l-2 border-gray-100 space-y-3">
                            {replies.map(reply => renderCommentItem(reply, true))}
                        </div>
                    )}
                </div>
            );
        });
    };

    const renderCommentItem = (comment: PostComment, isReply = false) => {
        const commenter = commenters[comment.userId];
        const reactions = comment.reactions || {};
        let reactionCount = 0;
        let myReaction = null;
        const isEditing = editingCommentId === comment.id;
        Object.entries(reactions).forEach(([emoji, users]) => {
            if(Array.isArray(users)) {
                reactionCount += users.length;
                if (users.includes(currentUser.id)) myReaction = emoji;
            }
        });

        return (
            <div key={comment.id} className={`flex gap-3 group/comment`}>
                <div className="flex-shrink-0 z-10">
                    {commenter?.avatar_url ? (
                        <img src={commenter.avatar_url} alt={commenter.full_name} className={`${isReply ? 'h-8 w-8' : 'h-10 w-10'} rounded-full object-cover border border-gray-100 bg-white cursor-pointer`} onClick={(e) => { e.stopPropagation(); onViewProfile && commenter && onViewProfile(commenter); }} />
                    ) : (
                        <div onClick={(e) => { e.stopPropagation(); onViewProfile && commenter && onViewProfile(commenter); }}><UserCircleIcon className={`${isReply ? 'h-8 w-8' : 'h-10 w-10'} text-gray-300 cursor-pointer`} /></div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className={`bg-gray-100 dark:bg-gray-50 p-3 rounded-2xl rounded-tl-none relative inline-block min-w-[150px] max-w-full group/bubble transition-colors ${activeCommentMenuId === comment.id ? 'bg-blue-50 ring-2 ring-blue-200' : ''}`} onTouchStart={() => !isEditing && handleTouchStart(comment.id)} onTouchEnd={handleTouchEnd} onTouchMove={handleTouchMove} onContextMenu={(e) => { if(!isEditing) { e.preventDefault(); setActiveCommentMenuId(comment.id); } }}>
                        <div className="flex justify-between items-baseline gap-2 mb-0.5">
                            <span className="font-bold text-sm text-gray-900 cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); onViewProfile && commenter && onViewProfile(commenter); }}>{commenter?.full_name || 'Unknown User'}</span>
                            <span className="text-[10px] text-gray-500">{formatTime(comment.createdAt)}</span>
                        </div>
                        {isEditing ? (
                            <div className="flex flex-col gap-2 mt-1">
                                <textarea value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)} className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white" rows={2} autoFocus />
                                <div className="flex justify-end gap-2">
                                    <button onClick={cancelEditingComment} className="text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-200">Cancel</button>
                                    <button onClick={saveEditingComment} className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded">Save</button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed select-none">
                                {renderTextWithMentions(comment.content)}
                                {comment.isEdited && <span className="text-[10px] text-gray-400 italic ml-1">(edited)</span>}
                            </p>
                        )}
                        {!isEditing && reactionCount > 0 && (
                            <button onClick={(e) => { e.stopPropagation(); handleViewCommentReactions(comment); }} className="absolute -bottom-2.5 right-0 bg-white border border-gray-200 shadow-sm rounded-full px-1.5 py-0.5 flex items-center gap-0.5 z-10 cursor-pointer hover:bg-gray-50 transition-colors">
                                {Object.entries(reactions).map(([emoji, users]) => ((Array.isArray(users) && users.length > 0) ? <span key={emoji} className="text-[10px] leading-none">{emoji}</span> : null))}
                                <span className="text-[10px] font-bold text-gray-600 ml-0.5">{reactionCount}</span>
                            </button>
                        )}
                    </div>
                    {!isEditing && (
                        <div className="flex items-center gap-4 mt-1 ml-2">
                            <div className="relative reaction-picker-container">
                                <button onClick={(e) => { e.stopPropagation(); setActiveReactionCommentId(activeReactionCommentId === comment.id ? null : comment.id); }} className={`text-xs font-semibold transition-colors flex items-center gap-1 ${myReaction ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>
                                    {myReaction ? <><HeartIconSolid className="h-3 w-3" /> {myReaction}</> : 'Like'}
                                </button>
                                {activeReactionCommentId === comment.id && (
                                    <div className="absolute bottom-full left-0 mb-1 bg-white shadow-xl rounded-full border border-gray-100 p-1 flex gap-1 z-50 animate-fade-in-up select-none">
                                        {REACTION_EMOJIS.map(emoji => (
                                            <button key={emoji} onClick={() => handleCommentReaction(comment.id, emoji, comment.reactions)} className={`hover:scale-125 transition-transform p-1.5 text-lg rounded-full ${myReaction === emoji ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>{emoji}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => { setReplyingTo(comment); textareaRef.current?.focus(); }} className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors">Reply</button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (!isOpen || !livePost) return null;
    const currentUserAvatar = currentUserProfile?.avatar_url || commenters[currentUser.id]?.avatar_url;

    return (
        <>
            {/* ... Lightbox, Reaction Viewer, Confirmation, and Context Menu components ... */}
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
                    <img src={viewingImage.url} alt="Full size" className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-fade-in-up ${!viewingImage.canDownload ? 'protected-content' : ''}`} onClick={(e) => e.stopPropagation()} onContextMenu={(e) => !viewingImage.canDownload && e.preventDefault()} />
                    {!viewingImage.canDownload && <div className="absolute inset-0 z-20" onContextMenu={(e) => e.preventDefault()}></div>}
                </div>
            )}
            
            <ReactionsModal isOpen={!!viewingReactionsCommentId} onClose={() => setViewingReactionsCommentId(null)} reactions={comments.find(c => c.id === viewingReactionsCommentId)?.reactions || {}} profilesMap={commenters} currentUser={currentUser} onViewProfile={onViewProfile} />
            <ReactionsModal isOpen={showPostReactions} onClose={() => setShowPostReactions(false)} reactions={effectivePostReactions} profilesMap={commenters} currentUser={currentUser} onViewProfile={onViewProfile} />
            <ConfirmationModal isOpen={!!commentToDeleteId} onClose={() => setCommentToDeleteId(null)} onConfirm={confirmDeleteComment} title="Delete Comment" message="Are you sure you want to delete this comment?" confirmButtonText="Delete" isConfirming={isDeletingComment} />
            
            {/* Same auxiliary components */}
            {activeCommentMenuId && (
                <div className="fixed inset-0 z-[150] flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setActiveCommentMenuId(null)}></div>
                    <div className="bg-white w-full rounded-t-2xl z-10 pb-8 animate-fade-in-up overflow-hidden shadow-2xl">
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-3"></div>
                        <div className="p-4 space-y-2">
                            <button onClick={() => { const comment = comments.find(c => c.id === activeCommentMenuId); if(comment) handleCopyComment(comment.content); }} className="w-full flex items-center p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-gray-800 font-medium"><ClipboardIcon className="h-5 w-5 mr-3 text-gray-500" /> Copy Text</button>
                            {(() => {
                                const comment = comments.find(c => c.id === activeCommentMenuId);
                                if (!comment) return null;
                                return comment.userId === currentUser.id ? (
                                    <>
                                        <button onClick={() => startEditingComment(activeCommentMenuId)} className="w-full flex items-center p-4 bg-white hover:bg-gray-50 rounded-xl transition-colors text-gray-800 font-medium border border-gray-100"><PencilIcon inWrapper={false} className="h-5 w-5 mr-3 text-gray-500" /> Edit Comment</button>
                                        <button onClick={() => initiateDeleteComment(activeCommentMenuId)} className="w-full flex items-center p-4 bg-red-50 hover:bg-red-100 rounded-xl transition-colors text-red-600 font-medium"><TrashIcon className="h-5 w-5 mr-3" /> Delete Comment</button>
                                    </>
                                ) : (
                                    <button onClick={() => handleHideComment(activeCommentMenuId)} className="w-full flex items-center p-4 bg-white hover:bg-gray-50 rounded-xl transition-colors text-gray-600 font-medium border border-gray-100"><EyeOffIcon className="h-5 w-5 mr-3 text-gray-500" /> Hide Comment</button>
                                );
                            })()}
                            <button onClick={() => setActiveCommentMenuId(null)} className="w-full p-4 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors text-gray-600 font-medium mt-2">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex justify-center items-center p-0 sm:p-4 transition-opacity" onClick={onClose}>
                <div className="bg-white w-full sm:max-w-xl sm:rounded-2xl h-full sm:h-auto sm:max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white z-30">
                        <h3 className="font-bold text-gray-900 text-lg">Post Details</h3>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"><XIcon className="h-5 w-5" /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-white" onClick={() => { setActiveReactionCommentId(null); setActivePostReactionId(null); }}>
                        {/* Original Post */}
                        <div className="p-5 border-b border-gray-100 bg-white">
                            <div className="flex gap-3">
                                <div className="flex-shrink-0">
                                    {author?.avatar_url ? (
                                        <img src={author.avatar_url} alt={author.full_name} className="h-12 w-12 rounded-full object-cover border border-gray-100 shadow-sm cursor-pointer" onClick={(e) => { e.stopPropagation(); onViewProfile && author && onViewProfile(author); }} />
                                    ) : (
                                        <div onClick={(e) => { e.stopPropagation(); onViewProfile && author && onViewProfile(author); }}><UserCircleIcon className="h-12 w-12 text-gray-300 cursor-pointer" /></div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900 text-base hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); onViewProfile && author && onViewProfile(author); }}>{author?.full_name || 'Unknown User'}</span>
                                        <span className="text-xs text-gray-500">{formatTime(livePost.createdAt)}</span>
                                    </div>
                                    <p className="text-gray-800 mt-3 text-base whitespace-pre-wrap leading-relaxed">{renderTextWithMentions(livePost.content)}</p>
                                    {livePost.imageUrl && renderAttachment(livePost.imageUrl)}
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between text-gray-500 text-sm font-medium">
                                <div className="flex items-center gap-4">
                                    {/* Like Button */}
                                    <div className="relative group/reaction-btn post-reaction-btn">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActivePostReactionId(activePostReactionId ? null : livePost.id);
                                            }}
                                            className={`flex items-center gap-1 hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors cursor-pointer ${myReaction ? 'text-blue-600' : 'text-gray-500'}`}
                                        >
                                            {myReaction ? <><HeartIconSolid className="h-4 w-4" /> {myReaction}</> : <ThumbUpIcon className="h-4 w-4" />}
                                            <span>Like</span>
                                        </button>
                                        
                                        {activePostReactionId === livePost.id && (
                                            <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 shadow-xl rounded-full p-1.5 flex gap-1 animate-fade-in-up z-20 border border-gray-100 dark:border-gray-700 select-none">
                                                {REACTION_EMOJIS.map(emoji => (
                                                    <button 
                                                        key={emoji} 
                                                        onClick={(e) => { e.stopPropagation(); handleReaction(livePost, emoji); }} 
                                                        className={`text-2xl hover:scale-125 transition-transform p-1 rounded-full origin-bottom ${myReaction === emoji ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {totalReactions > 0 && (
                                        <button onClick={handleViewPostReactions} className="flex items-center gap-1 hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors cursor-pointer">
                                            <div className="flex -space-x-1 mr-1">
                                                {topEmojis.map((item, idx) => (
                                                    <span key={item.emoji} className="bg-gray-100 rounded-full w-4 h-4 flex items-center justify-center border border-white text-[10px] z-[1] shadow-sm">{item.emoji}</span>
                                                ))}
                                            </div>
                                            <span className="text-gray-700 dark:text-gray-600 hover:underline">{totalReactions}</span>
                                        </button>
                                    )}
                                </div>
                                <span className="flex items-center gap-1">{comments.length} comments</span>
                            </div>
                        </div>

                        <div className="bg-gray-50/50 min-h-full p-5 pb-20">
                            {loading ? <div className="flex justify-center py-8"><Spinner className="text-gray-400" /></div> : comments.length === 0 ? <div className="text-center py-10"><div className="bg-gray-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"><ReplyIcon className="h-6 w-6 text-gray-400" /></div><p className="text-gray-500 text-sm">No comments yet.<br/>Start the conversation!</p></div> : renderCommentList()}
                            <div ref={commentsEndRef} />
                        </div>
                    </div>

                    {/* Input Area with Mention Support */}
                    <div className="p-3 sm:p-4 bg-white border-t border-gray-200 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative">
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

                        {replyingTo && (
                            <div className="flex justify-between items-center bg-blue-50 px-3 py-2 rounded-lg text-xs text-blue-700 mb-2 border border-blue-100 animate-fade-in">
                                <div className="flex items-center gap-2 overflow-hidden"><ReplyIcon className="h-3 w-3 flex-shrink-0" /><span className="truncate">Replying to <span className="font-bold">{commenters[replyingTo.userId]?.full_name || 'User'}</span></span></div>
                                <button onClick={() => setReplyingTo(null)} className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"><XIcon className="h-3 w-3" /></button>
                            </div>
                        )}
                        <div className="flex items-end gap-3">
                            <div className="flex-shrink-0 mb-1 hidden sm:block">
                                {currentUserAvatar ? <img src={currentUserAvatar} className="h-9 w-9 rounded-full object-cover border border-gray-200" alt="" /> : <UserCircleIcon className="h-9 w-9 text-gray-300" />}
                            </div>
                            <div className="flex-1 bg-gray-100 rounded-2xl flex items-end px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white transition-all border border-transparent focus-within:border-blue-300 relative emoji-picker-container">
                                <textarea ref={textareaRef} value={commentText} onChange={handleInputChange} placeholder={replyingTo ? "Write a reply..." : "Write a comment..."} className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-sm max-h-32 resize-none py-1.5 leading-relaxed" rows={1} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }} />
                                <button type="button" className={`p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors ml-1 mb-0.5 ${isEmojiPickerOpen ? 'text-blue-600 bg-blue-50' : ''}`} onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}><EmojiIcon className="h-5 w-5" /></button>
                                {isEmojiPickerOpen && (
                                    <div className="absolute bottom-full right-0 mb-2 bg-white shadow-xl rounded-xl border border-gray-200 p-3 w-64 grid grid-cols-6 gap-1 z-50 animate-fade-in-up">
                                        {['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥', '👏', '✨', '💯', '🤔'].map(emoji => <button key={emoji} type="button" onClick={() => setCommentText(prev => prev + emoji)} className="text-xl p-1.5 hover:bg-gray-100 rounded-lg transition-transform hover:scale-110">{emoji}</button>)}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => handleSendComment()} disabled={!commentText.trim() || isSubmitting} className={`p-2.5 rounded-full transition-all shadow-sm mb-0.5 ${!commentText.trim() ? 'bg-gray-200 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95'}`}>
                                {isSubmitting ? <Spinner className="h-5 w-5" /> : <SendIcon className="h-5 w-5 ml-0.5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PostDetailModal;
