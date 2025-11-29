
import React, { useState, useEffect, useMemo } from 'react';
import { db, firestore } from '../services';
import type { Profile, Friendship } from '../types';
import { Spinner } from './Spinner';
import { UserPlusIcon, UserMinusIcon, UsersIcon, CheckIcon, SendIcon, SearchIcon, UserIcon, DotsHorizontalIcon } from './Icons';
import ConfirmationModal from './ConfirmationModal';

type Tab = 'friends' | 'explore' | 'requests';

interface FriendsPageProps {
    user: { id: string; email?: string };
    currentUserProfile: Profile;
    initialTab?: Tab;
    onChatStart: (profile: Profile) => void;
    onViewProfile: (profile: Profile) => void;
}

const FriendsPage: React.FC<FriendsPageProps> = ({ user, currentUserProfile, initialTab = 'friends', onChatStart, onViewProfile }) => {
    const [activeTab, setActiveTab] = useState<Tab>(initialTab);
    const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
    const [friendships, setFriendships] = useState<Friendship[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Unfriend Confirmation State
    const [isUnfriendModalOpen, setIsUnfriendModalOpen] = useState(false);
    const [friendshipToUnfriend, setFriendshipToUnfriend] = useState<string | null>(null);
    const [isUnfriending, setIsUnfriending] = useState(false);

    // Sync active tab if initialTab changes (e.g. from notification click)
    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    // Clear search when tab changes
    useEffect(() => {
        setSearchTerm('');
    }, [activeTab]);

    useEffect(() => {
        if (!user?.id) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch all profiles for directory
                const profilesSnapshot = await db.collection('profiles').get();
                const profiles = profilesSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Profile[];
                setAllProfiles(profiles.filter(p => p.id !== user.id));

                // Fetch Friendships (requester OR recipient)
                const sentRequests = await db.collection('friendships').where('requesterId', '==', user.id).get();
                const receivedRequests = await db.collection('friendships').where('recipientId', '==', user.id).get();

                const sent = sentRequests.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Friendship[];
                const received = receivedRequests.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Friendship[];
                
                // Merge and dedup
                const combined = [...sent, ...received];
                const uniqueMap = new Map(combined.map(f => [f.id, f]));
                setFriendships(Array.from(uniqueMap.values()));

            } catch (err: any) {
                console.error("Error fetching friend data:", err);
                setError("Failed to load community data. Please check your connection or permissions.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?.id]);

    // --- Actions ---

    const sendFriendRequest = async (targetId: string) => {
        if (!user?.id) return;
        try {
            const newFriendship = {
                requesterId: user.id,
                recipientId: targetId,
                status: 'pending',
                createdAt: firestore.FieldValue.serverTimestamp(),
            };
            const docRef = await db.collection('friendships').add(newFriendship);
            
            // Create Notification for Recipient
            await db.collection('notifications').add({
                user_id: targetId,
                title: 'New Friend Request',
                message: `${currentUserProfile.full_name} sent you a friend request.`,
                is_read: false,
                notification_type: 'friend_request',
                created_at: firestore.FieldValue.serverTimestamp(),
            });

            // Optimistic update
            setFriendships(prev => [...prev, { ...newFriendship, id: docRef.id } as unknown as Friendship]);
        } catch (err) {
            console.error("Error sending request:", err);
            setError("Could not send friend request.");
        }
    };

    const acceptFriendRequest = async (friendshipId: string) => {
        try {
            await db.collection('friendships').doc(friendshipId).update({ status: 'accepted' });
            
            // Notify Requester
            const friendship = friendships.find(f => f.id === friendshipId);
            if (friendship) {
                await db.collection('notifications').add({
                    user_id: friendship.requesterId,
                    title: 'Friend Request Accepted',
                    message: `${currentUserProfile.full_name} accepted your friend request.`,
                    is_read: false,
                    notification_type: 'friend_request_accepted',
                    created_at: firestore.FieldValue.serverTimestamp(),
                });
            }

            setFriendships(prev => prev.map(f => f.id === friendshipId ? { ...f, status: 'accepted' as const } : f));
        } catch (err) {
            console.error("Error accepting request:", err);
            setError("Could not accept request.");
        }
    };

    const removeFriendship = async (friendshipId: string) => {
        try {
            await db.collection('friendships').doc(friendshipId).delete();
            setFriendships(prev => prev.filter(f => f.id !== friendshipId));
        } catch (err) {
            console.error("Error removing friend:", err);
            setError("Could not remove friend.");
        }
    };

    const initiateUnfriend = (friendshipId: string) => {
        setFriendshipToUnfriend(friendshipId);
        setIsUnfriendModalOpen(true);
    };

    const handleConfirmUnfriend = async () => {
        if (!friendshipToUnfriend) return;
        setIsUnfriending(true);
        try {
            await removeFriendship(friendshipToUnfriend);
        } finally {
            setIsUnfriending(false);
            setIsUnfriendModalOpen(false);
            setFriendshipToUnfriend(null);
        }
    };

    const handleMessageClick = (e: React.MouseEvent, profile: Profile) => {
        e.stopPropagation(); 
        onChatStart(profile);
    };
    
    const handleUnfriendClick = (e: React.MouseEvent, friendshipId: string) => {
        e.stopPropagation();
        initiateUnfriend(friendshipId);
    }

    // --- Computed Data ---

    const getRelationship = (targetId: string) => {
        return friendships.find(f => f.requesterId === targetId || f.recipientId === targetId);
    };

    const friendsList = useMemo(() => {
        if (!user?.id) return [];
        const accepted = friendships.filter(f => f.status === 'accepted');
        const friendIds = new Set(accepted.map(f => f.requesterId === user.id ? f.recipientId : f.requesterId));
        return allProfiles.filter(p => friendIds.has(p.id));
    }, [friendships, allProfiles, user?.id]);

    const pendingRequests = useMemo(() => {
        if (!user?.id) return [];
        return friendships
            .filter(f => f.status === 'pending' && f.recipientId === user.id)
            .map(f => {
                const profile = allProfiles.find(p => p.id === f.requesterId);
                return { friendship: f, profile };
            })
            .filter(item => item.profile);
    }, [friendships, allProfiles, user?.id]);

    // Directory & Suggestion Logic
    const filteredProfiles = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        
        // If searching, show everyone matching (Global Directory Search)
        if (term) {
            return allProfiles.filter(p => 
                (p.full_name || '').toLowerCase().includes(term) ||
                (p.student_id || '').toLowerCase().includes(term)
            );
        }

        // If NOT searching (Suggestions Mode), only show people who are NOT connected
        const connectedIds = new Set(friendships.map(f => f.requesterId === user.id ? f.recipientId : f.requesterId));
        return allProfiles.filter(p => !connectedIds.has(p.id));

    }, [allProfiles, searchTerm, friendships, user.id]);

    const filteredFriendsList = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return friendsList;
        return friendsList.filter(f => (f.full_name || '').toLowerCase().includes(term));
    }, [friendsList, searchTerm]);

    if (!user || !currentUserProfile) {
        return <div className="flex justify-center p-10"><Spinner /></div>;
    }

    if (loading) return <div className="flex justify-center p-10"><Spinner /></div>;

    const searchPlaceholder = activeTab === 'friends' ? "Search your friends..." : "Search people...";

    return (
        <div className="max-w-6xl mx-auto mt-4">
            <ConfirmationModal
                isOpen={isUnfriendModalOpen}
                onClose={() => setIsUnfriendModalOpen(false)}
                onConfirm={handleConfirmUnfriend}
                title="Unfriend User"
                message="Are you sure you want to remove this user from your friends list?"
                confirmButtonText="Unfriend"
                isConfirming={isUnfriending}
            />

            <div className="p-4 md:p-0">
                {/* Header & Navigation */}
                <div className="flex flex-col mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {activeTab === 'friends' ? 'Friends' : activeTab === 'requests' ? 'Requests' : 'Community'}
                        </h2>
                         {(activeTab === 'friends' || activeTab === 'explore') && (
                            <div className="relative hidden sm:block w-64">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <SearchIcon className="h-4 w-4 text-gray-400" />
                                </div>
                                <input 
                                    type="text" 
                                    placeholder={searchPlaceholder}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                                />
                            </div>
                        )}
                    </div>
                    
                    <div className="flex space-x-6 border-b border-gray-200 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setActiveTab('friends')}
                            className={`pb-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 px-1 ${
                                activeTab === 'friends' 
                                ? 'border-blue-600 text-blue-600' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-md'
                            }`}
                        >
                            All Friends
                        </button>
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`pb-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 px-1 flex items-center ${
                                activeTab === 'requests' 
                                ? 'border-blue-600 text-blue-600' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-md'
                            }`}
                        >
                            Friend Requests
                            {pendingRequests.length > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {pendingRequests.length}
                                </span>
                            )}
                        </button>
                         <button
                            onClick={() => setActiveTab('explore')}
                            className={`pb-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 px-1 ${
                                activeTab === 'explore' 
                                ? 'border-blue-600 text-blue-600' 
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-md'
                            }`}
                        >
                            {searchTerm && activeTab === 'explore' ? 'Search Results' : 'Suggestions'}
                        </button>
                    </div>
                     {/* Mobile Search */}
                    {(activeTab === 'friends' || activeTab === 'explore') && (
                        <div className="relative block sm:hidden mt-4">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="h-4 w-4 text-gray-400" />
                            </div>
                            <input 
                                type="text" 
                                placeholder={searchPlaceholder}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                            />
                        </div>
                    )}
                </div>

                {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100 text-sm">{error}</div>}

                {/* --- Content Area --- */}
                
                {/* Tab: Friend Requests */}
                {activeTab === 'requests' && (
                    <div>
                        {pendingRequests.length === 0 ? (
                             <div className="py-12 text-center">
                                <div className="bg-gray-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <UsersIcon className="h-10 w-10 text-gray-400" />
                                </div>
                                <p className="text-gray-500">No new requests.</p>
                             </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {pendingRequests.map(({ friendship, profile }) => {
                                    // Privacy Logic for Friend Requests: Strictly enforce 'only_me' by default
                                    const isIdHidden = !profile?.privacy_student_id || profile?.privacy_student_id !== 'public';
                                    
                                    return (
                                        <div key={friendship.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                                            <div 
                                                className="aspect-square w-full bg-gray-100 cursor-pointer overflow-hidden"
                                                onClick={() => profile && onViewProfile(profile)}
                                            >
                                                <img 
                                                    src={profile?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile?.full_name}`} 
                                                    className="w-full h-full object-cover"
                                                    alt="" 
                                                />
                                            </div>
                                            <div className="p-3 flex flex-col flex-1">
                                                <div 
                                                    className="font-semibold text-gray-900 truncate cursor-pointer hover:underline"
                                                    onClick={() => profile && onViewProfile(profile)}
                                                >
                                                    {profile?.full_name}
                                                </div>
                                                <div className="text-xs text-gray-500 mb-3 truncate">
                                                    {profile?.role} • {isIdHidden ? 'Hidden' : profile?.student_id}
                                                </div>
                                                <div className="mt-auto space-y-2">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); acceptFriendRequest(friendship.id); }} 
                                                        className="w-full py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors"
                                                    >
                                                        Confirm
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); removeFriendship(friendship.id); }} 
                                                        className="w-full py-1.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-md hover:bg-gray-200 transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: All Friends */}
                {activeTab === 'friends' && (
                    <div>
                        {friendsList.length === 0 ? (
                            <div className="py-12 text-center">
                                <p className="text-gray-500">You haven't added any friends yet.</p>
                                <button onClick={() => setActiveTab('explore')} className="mt-4 text-blue-600 font-semibold hover:underline">Find people</button>
                            </div>
                        ) : filteredFriendsList.length === 0 ? (
                            <div className="py-12 text-center">
                                <p className="text-gray-500">No friends match "{searchTerm}".</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {filteredFriendsList.map(friend => {
                                        const rel = getRelationship(friend.id);
                                        // Privacy Logic for Friend List: Visible if 'public' OR 'friends' (since we are friends)
                                        // Hidden ONLY if 'only_me' (or undefined)
                                        const isIdHidden = !friend.privacy_student_id || friend.privacy_student_id === 'only_me';
                                        
                                        return (
                                            <div key={friend.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center space-x-4 hover:shadow-md transition-shadow">
                                                <div 
                                                    className="relative cursor-pointer flex-shrink-0"
                                                    onClick={() => onViewProfile(friend)}
                                                >
                                                    <img 
                                                        src={friend.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${friend.full_name}`} 
                                                        className="h-14 w-14 rounded-full object-cover bg-gray-100 border border-gray-100" 
                                                        alt="" 
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 
                                                        className="font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                                                        onClick={() => onViewProfile(friend)}
                                                    >
                                                        {friend.full_name}
                                                    </h4>
                                                    <div className="text-xs text-gray-500 truncate mb-3">
                                                        <span className="capitalize">{friend.role}</span> • {isIdHidden ? 'Hidden' : friend.student_id}
                                                    </div>
                                                    <div className="flex space-x-2">
                                                        <button 
                                                            onClick={(e) => handleMessageClick(e, friend)}
                                                            className="flex-1 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                                                        >
                                                            <SendIcon className="h-3 w-3 mr-1" />
                                                            Message
                                                        </button>
                                                        <button 
                                                            onClick={(e) => rel && handleUnfriendClick(e, rel.id)}
                                                            className="px-2.5 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-md hover:bg-gray-200 transition-colors"
                                                            title="Unfriend"
                                                        >
                                                            <UserMinusIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Suggestions (Explore) */}
                {activeTab === 'explore' && (
                    <div>
                        {filteredProfiles.length === 0 ? (
                            <div className="py-12 text-center text-gray-500">
                                {searchTerm ? `No results found for "${searchTerm}"` : "No suggestions available right now."}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {filteredProfiles.map(profile => {
                                    const rel = getRelationship(profile.id);
                                    let actionButton;
                                    
                                    // Privacy Logic for Explore/Search: Strictly enforce 'only_me' by default
                                    // Treat 'friends' setting as hidden here because we are not friends yet
                                    const isIdHidden = profile.privacy_student_id !== 'public';

                                    if (!rel) {
                                        actionButton = (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); sendFriendRequest(profile.id); }} 
                                                className="w-full py-1.5 bg-blue-50 text-blue-700 text-sm font-semibold rounded-md hover:bg-blue-100 transition-colors flex items-center justify-center border border-blue-200"
                                            >
                                                <UserPlusIcon className="h-4 w-4 mr-1.5" /> Add Friend
                                            </button>
                                        );
                                    } else if (rel.status === 'accepted') {
                                        actionButton = (
                                            <div className="w-full py-1.5 bg-green-50 text-green-700 text-sm font-medium rounded-md flex items-center justify-center cursor-default border border-green-100">
                                                 <CheckIcon className="h-4 w-4 mr-1" /> Friend
                                            </div>
                                        );
                                    } else if (rel.requesterId === user.id) {
                                        actionButton = (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); removeFriendship(rel.id); }} 
                                                className="w-full py-1.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-md hover:bg-gray-200 transition-colors"
                                            >
                                                Request Sent
                                            </button>
                                        );
                                    } else {
                                        // Pending incoming request
                                        actionButton = (
                                            <button 
                                                onClick={() => setActiveTab('requests')} 
                                                className="w-full py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors"
                                            >
                                                Respond
                                            </button>
                                        );
                                    }

                                    return (
                                        <div key={profile.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                                             <div 
                                                className="aspect-square w-full bg-gray-100 cursor-pointer overflow-hidden relative group"
                                                onClick={() => onViewProfile(profile)}
                                            >
                                                <img 
                                                    src={profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${profile.full_name}`} 
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    alt="" 
                                                />
                                            </div>
                                            <div className="p-3 flex flex-col flex-1">
                                                <div 
                                                    className="font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors mb-0.5"
                                                    onClick={() => onViewProfile(profile)}
                                                >
                                                    {profile.full_name}
                                                </div>
                                                 <div className="text-xs text-gray-500 mb-3 truncate">
                                                    <span className="capitalize">{profile.role}</span> • {isIdHidden ? 'Hidden' : profile.student_id}
                                                 </div>
                                                <div className="mt-auto">
                                                    {actionButton}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FriendsPage;
