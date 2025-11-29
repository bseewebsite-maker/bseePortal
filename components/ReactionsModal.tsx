
import React, { useState } from 'react';
import { XIcon, UserCircleIcon } from './Icons';
import type { Profile } from '../types';

interface ReactionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    reactions: { [emoji: string]: string[] };
    profilesMap: { [userId: string]: Profile };
    currentUser: { id: string };
    onViewProfile?: (profile: Profile) => void;
}

const ReactionsModal: React.FC<ReactionsModalProps> = ({ isOpen, onClose, reactions, profilesMap, currentUser, onViewProfile }) => {
    const [activeTab, setActiveTab] = useState<string>('All');

    if (!isOpen) return null;

    const allReactions: { userId: string; emoji: string }[] = [];
    const reactionCounts: { [key: string]: number } = { 'All': 0 };

    Object.entries(reactions).forEach(([emoji, userIds]) => {
        if (Array.isArray(userIds)) {
            userIds.forEach(uid => {
                allReactions.push({ userId: uid, emoji });
            });
            reactionCounts[emoji] = (reactionCounts[emoji] || 0) + userIds.length;
            reactionCounts['All'] += userIds.length;
        }
    });

    const displayedUsers = activeTab === 'All' 
        ? allReactions 
        : allReactions.filter(r => r.emoji === activeTab);

    const tabs = ['All', ...Object.keys(reactions).filter(k => reactions[k]?.length > 0)];

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div 
                className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="border-b border-gray-100 bg-gray-50">
                    <div className="flex justify-between items-center p-4 pb-2">
                        <h3 className="font-bold text-gray-900">Reactions</h3>
                        <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                            <XIcon className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="flex px-4 overflow-x-auto no-scrollbar space-x-2 pb-2">
                        {tabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all whitespace-nowrap ${
                                    activeTab === tab 
                                    ? 'bg-blue-100 text-blue-700 shadow-sm' 
                                    : 'text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                <span className="mr-1.5">{tab === 'All' ? 'All' : tab}</span>
                                <span className="text-xs opacity-80 font-bold">{reactionCounts[tab]}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 bg-white">
                    {displayedUsers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">No reactions yet.</div>
                    ) : (
                        displayedUsers.map((item) => {
                            const profile = profilesMap[item.userId];
                            const isMe = item.userId === currentUser.id;
                            if (!profile) return null;
                            
                            return (
                                <div 
                                    key={`${item.userId}-${item.emoji}`} 
                                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                                    onClick={() => onViewProfile && onViewProfile(profile)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            {profile.avatar_url ? (
                                                <img src={profile.avatar_url} className="h-10 w-10 rounded-full object-cover border border-gray-100" alt="" />
                                            ) : (
                                                <UserCircleIcon className="h-10 w-10 text-gray-300" />
                                            )}
                                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-50 text-[12px] flex items-center justify-center w-5 h-5">
                                                {item.emoji}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-sm text-gray-900 block hover:underline">{isMe ? 'You' : (profile.full_name || 'Unknown User')}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReactionsModal;
