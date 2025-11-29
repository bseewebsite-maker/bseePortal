
import React, { useState, useEffect, useRef } from 'react';
import { db, firestore } from '../services';
import type { Profile, ChatMessage } from '../types';
import { SendIcon, UserCircleIcon, CheckIcon, DoubleCheckIcon } from './Icons';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: { id: string; avatar_url?: string };
    recipient: Profile;
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, currentUser, recipient }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Live profile for status updates
    const [liveRecipient, setLiveRecipient] = useState<Profile>(recipient);

    // Generate a unique conversation ID based on sorted user IDs.
    const conversationId = [currentUser.id, recipient.id].sort().join('_');

    // Listener for Recipient Profile Status
    useEffect(() => {
        if (!isOpen) return;
        const unsubscribe = db.collection('profiles').doc(recipient.id).onSnapshot((doc) => {
            if (doc.exists) {
                setLiveRecipient({ id: doc.id, ...doc.data() } as Profile);
            }
        });
        return () => unsubscribe();
    }, [isOpen, recipient.id]);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);

        const messagesRef = db.collection('conversations')
            .doc(conversationId)
            .collection('messages')
            .orderBy('createdAt', 'asc');

        const unsubscribe = messagesRef.onSnapshot((snapshot: any) => {
            const fetchedMessages = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            })) as ChatMessage[];
            setMessages(fetchedMessages);
            setLoading(false);
            scrollToBottom();

            // --- READ RECEIPT LOGIC ---
            // Mark individual messages from partner as read
            const batch = db.batch();
            let updatesCount = 0;
            
            snapshot.docs.forEach((doc: any) => {
                const data = doc.data();
                // If I am NOT the sender, and it is NOT read, then I read it.
                if (data.senderId !== currentUser.id && !data.read) {
                    batch.update(doc.ref, { read: true });
                    updatesCount++;
                }
            });
            
            if (updatesCount > 0) {
                batch.commit().catch((err: any) => console.error("Error marking read:", err));
            }

        }, (err: any) => {
            console.error("Error listening to messages:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen, conversationId, currentUser.id]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const text = newMessage.trim();
        setNewMessage(''); // Clear input immediately

        try {
            // 1. Add message to subcollection
            await db.collection('conversations')
                .doc(conversationId)
                .collection('messages')
                .add({
                    text,
                    senderId: currentUser.id,
                    createdAt: firestore.FieldValue.serverTimestamp(),
                    read: false
                });

            // 2. Update parent document metadata (optional, good for lists later)
            await db.collection('conversations').doc(conversationId).set({
                participants: [currentUser.id, recipient.id],
                lastMessage: text,
                lastMessageTimestamp: firestore.FieldValue.serverTimestamp(),
                [`unread_${recipient.id}`]: firestore.FieldValue.increment(1)
            }, { merge: true });

        } catch (error) {
            console.error("Error sending message:", error);
        }
    };
    
    // Format time helper
    const formatTime = (timestamp: any) => {
        if (!timestamp?.toDate) return 'Sending...';
        return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatStatus = (profile: Profile) => {
        if (profile.is_online) return 'Active now';
        if (!profile.last_seen) return 'Offline';

        let lastSeenDate: Date;
        if (profile.last_seen && typeof (profile.last_seen as any).toDate === 'function') {
             lastSeenDate = (profile.last_seen as any).toDate();
        } else {
             lastSeenDate = new Date(profile.last_seen as any);
        }
        
        const diffSeconds = Math.floor((new Date().getTime() - lastSeenDate.getTime()) / 1000);
        if (diffSeconds < 60) return 'Active now';
        if (diffSeconds < 3600) return `Active ${Math.floor(diffSeconds / 60)}m ago`;
        if (diffSeconds < 86400) return `Active ${Math.floor(diffSeconds / 3600)}h ago`;
        
        return `Active ${lastSeenDate.toLocaleDateString()}`;
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/40 z-[70] flex justify-center items-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white w-full max-w-md h-[600px] max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center">
                        <div className="relative">
                            <img 
                                src={liveRecipient.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(liveRecipient.full_name)}`} 
                                alt={liveRecipient.full_name} 
                                className="h-10 w-10 rounded-full object-cover bg-gray-200 border border-gray-200"
                            />
                            {liveRecipient.is_online && (
                                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-green-400"></span>
                            )}
                        </div>
                        <div className="ml-3">
                            <h3 className="font-bold text-gray-900 leading-tight">{liveRecipient.full_name}</h3>
                            <span className={`text-xs font-medium ${liveRecipient.is_online ? 'text-green-600' : 'text-gray-400'}`}>
                                {formatStatus(liveRecipient)}
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
                    {loading && messages.length === 0 ? (
                        <div className="flex justify-center items-center h-full text-gray-400 text-sm">
                            Loading conversation...
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
                            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                                <UserCircleIcon className="h-8 w-8 text-gray-300" />
                            </div>
                            <p className="text-sm">No messages yet.</p>
                            <p className="text-xs">Say hello to {liveRecipient.full_name.split(' ')[0]}!</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.senderId === currentUser.id;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div 
                                        className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm shadow-sm relative group ${
                                            isMe 
                                                ? 'bg-blue-600 text-white rounded-br-none' 
                                                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                                        }`}
                                    >
                                        <p>{msg.text}</p>
                                        <div className={`flex items-center justify-end mt-1 space-x-1 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                            <span className="text-[10px] opacity-80">{formatTime(msg.createdAt)}</span>
                                            {isMe && (
                                                <span title={msg.read ? "Read" : "Sent"}>
                                                    {msg.read ? (
                                                        <DoubleCheckIcon className="h-3 w-3 opacity-90" />
                                                    ) : (
                                                        <CheckIcon className="h-3 w-3 opacity-70" />
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white border-t border-gray-200">
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-900 placeholder-gray-500 border-none rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                        <button 
                            type="submit" 
                            disabled={!newMessage.trim()}
                            className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95 shadow-md"
                        >
                            <SendIcon className="h-5 w-5 ml-0.5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ChatModal;
