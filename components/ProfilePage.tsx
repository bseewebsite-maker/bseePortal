
import React, { useState, useRef, useEffect } from 'react';
import type { Profile } from '../types';
import { User } from '@supabase/supabase-js';
import { supabase, db, firestore } from '../services';
import { Spinner } from './Spinner';
import { UserCircleIcon, PencilIcon, BriefcaseIcon, MailIcon, IdentificationIcon, ClockIcon, CameraIcon, ChevronLeftIcon, ChatIcon, LockClosedIcon } from './Icons';
import Feed from './Feed';

interface ProfilePageProps {
    profile: Profile;
    user: User;
    currentUserProfile?: Profile | null;
    onProfileUpdate: (updatedProfile: Partial<Profile>) => void;
    isOwnProfile?: boolean;
    onBack?: () => void;
    onMessage?: (profile: Profile) => void;
    onViewProfile?: (profile: Profile) => void;
}

const DetailItem: React.FC<{ icon: React.ReactNode, text: React.ReactNode }> = ({ icon, text }) => (
    <li className="flex items-center space-x-3 text-gray-700 dark:text-gray-300">
        <div className="flex-shrink-0 h-6 w-6 text-gray-500 dark:text-gray-400">{icon}</div>
        <span className="text-md">{text}</span>
    </li>
);

// Defined outside component to avoid re-creation, safer for rendering
const HiddenField = () => (
    <span className="text-gray-400 dark:text-gray-500 italic flex items-center text-sm">
        <LockClosedIcon className="h-3 w-3 mr-1" /> Hidden
    </span>
);

const EditProfileModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    profile: Profile;
    onSave: (fullName: string, bio: string) => Promise<void>;
}> = ({ isOpen, onClose, profile, onSave }) => {
    // Safely initialize state ensuring values are strings to prevent [object Object] error in inputs
    const [fullName, setFullName] = useState(typeof profile.full_name === 'string' ? profile.full_name : '');
    const [bio, setBio] = useState(typeof profile.bio === 'string' ? profile.bio : '');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave(fullName, bio);
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 transition-opacity" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg relative animate-fade-in-up">
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Profile</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">&times;</button>
                </div>
                <form onSubmit={handleSave}>
                    <div className="p-6 space-y-6">
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                            <input
                                type="text"
                                id="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                            <textarea
                                id="bio"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                rows={4}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="Tell us a little about yourself..."
                            ></textarea>
                        </div>
                    </div>
                    <div className="flex justify-end items-center p-6 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 rounded-b-2xl">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 mr-3">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center">
                            {isSaving && <Spinner className="mr-2" />}
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const ProfilePage: React.FC<ProfilePageProps> = ({ profile, user, currentUserProfile, onProfileUpdate, isOwnProfile = true, onBack, onMessage, onViewProfile }) => {
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending' | 'accepted'>('none');
    
    const avatarFileInputRef = useRef<HTMLInputElement>(null);
    const coverFileInputRef = useRef<HTMLInputElement>(null);

    // Check friendship status if viewing another user's profile
    useEffect(() => {
        if (isOwnProfile) return;

        const fetchFriendship = async () => {
             // Check requests sent by current user
             const q1 = await db.collection('friendships')
                .where('requesterId', '==', user.id)
                .where('recipientId', '==', profile.id)
                .get();
             
             // Check requests received by current user
             const q2 = await db.collection('friendships')
                .where('requesterId', '==', profile.id)
                .where('recipientId', '==', user.id)
                .get();
             
             if (!q1.empty) {
                 setFriendshipStatus(q1.docs[0].data().status);
             } else if (!q2.empty) {
                 setFriendshipStatus(q2.docs[0].data().status);
             } else {
                 setFriendshipStatus('none');
             }
        };
        
        fetchFriendship();
    }, [user.id, profile.id, isOwnProfile]);

    const handleAvatarClick = () => {
        if (!isOwnProfile) return;
        avatarFileInputRef.current?.click();
    };
    
    const handleCoverPhotoClick = () => {
        if (!isOwnProfile) return;
        coverFileInputRef.current?.click();
    };
    
    const handleProfileSave = async (fullName: string, bio: string) => {
        if (!isOwnProfile) return;
        setError(null);
        try {
            const updates = {
                full_name: fullName,
                bio: bio,
                updated_at: new Date().toISOString(),
            };
            // Update Supabase
            const { error: supabaseError } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (supabaseError) throw supabaseError;

            // Update Firestore
            await db.collection('profiles').doc(user.id).set({
                full_name: fullName,
                bio: bio,
                updated_at: firestore.FieldValue.serverTimestamp(),
            }, { merge: true });

            onProfileUpdate({ full_name: fullName, bio: bio });
            setIsEditModalOpen(false);
        } catch (error: any) {
            setError(error.message || "Failed to update profile.");
        }
    };

    const uploadFile = async (file: File, fileType: 'avatar' | 'cover') => {
        if (!isOwnProfile) return;
        setError(null);
        fileType === 'avatar' ? setUploadingAvatar(true) : setUploadingCover(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'bseeportal_uploads');

        try {
            const response = await fetch('https://api.cloudinary.com/v1_1/dichfnv5d/image/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Image upload failed: ${response.statusText}`);
            }

            const data = await response.json();
            const fileUrl = data.secure_url;
            
            const updateField = fileType === 'avatar' ? 'avatar_url' : 'cover_photo_url';
            
            // Update Supabase
            const { error: supabaseError } = await supabase
                .from('profiles')
                .update({ [updateField]: fileUrl })
                .eq('id', user.id);

            if (supabaseError) throw supabaseError;
            
            // Update Firestore
            await db.collection('profiles').doc(user.id).set({
                [updateField]: fileUrl,
                updated_at: firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            
            onProfileUpdate({ [updateField]: fileUrl });

        } catch (error: any) {
            console.error('Error uploading file:', error);
            setError(error.message || 'An unexpected error occurred during upload.');
        } finally {
            fileType === 'avatar' ? setUploadingAvatar(false) : setUploadingCover(false);
        }
    };

    const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            await uploadFile(file, 'avatar');
        }
        if(avatarFileInputRef.current) avatarFileInputRef.current.value = "";
    };

    const handleCoverFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            await uploadFile(file, 'cover');
        }
        if(coverFileInputRef.current) coverFileInputRef.current.value = "";
    };

    // --- Display Logic with Privacy Checks ---
    const checkPrivacy = (setting: string | undefined) => {
        if (isOwnProfile) return true;
        
        // Default is 'only_me' (undefined/null/empty treated as restricted)
        if (!setting || setting === 'only_me') return false;
        
        if (setting === 'public') return true;
        if (setting === 'friends' && friendshipStatus === 'accepted') return true;
        
        return false;
    };

    const canSeeEmail = checkPrivacy(profile.privacy_email);
    const displayEmail = canSeeEmail 
        ? (typeof profile.email === 'string' ? profile.email : (typeof user.email === 'string' && isOwnProfile ? user.email : null))
        : null;

    const canSeeStudentId = checkPrivacy(profile.privacy_student_id);
    const displayStudentId = canSeeStudentId
        ? (typeof profile.student_id === 'string' ? profile.student_id : null)
        : null;

    const canSeeLastSeen = checkPrivacy(profile.privacy_last_seen);
    let displayLastSeen: string = 'Unknown';
    
    if (canSeeLastSeen) {
        if (isOwnProfile) {
            displayLastSeen = new Date(user.last_sign_in_at || Date.now()).toLocaleDateString();
        } else if (profile.last_seen) {
            try {
                if (profile.last_seen && typeof (profile.last_seen as any).toDate === 'function') {
                    displayLastSeen = (profile.last_seen as any).toDate().toLocaleDateString();
                } else if (profile.last_seen instanceof Date) {
                    displayLastSeen = profile.last_seen.toLocaleDateString();
                } else if (typeof profile.last_seen === 'string' || typeof profile.last_seen === 'number') {
                        const d = new Date(profile.last_seen);
                        if (!isNaN(d.getTime())) {
                            displayLastSeen = d.toLocaleDateString();
                        }
                }
            } catch (e) {
                // Fallback
            }
        }
    } else {
        displayLastSeen = 'Hidden';
    }

    const isOnline = profile.is_online && canSeeLastSeen;
    const safeBio = typeof profile.bio === 'string' ? profile.bio : '';
    const safeRole = typeof profile.role === 'string' ? profile.role : 'Member';
    const safeFullName = typeof profile.full_name === 'string' ? profile.full_name : 'User';

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Persistent Header with Back Button */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center shadow-sm flex-shrink-0 z-10">
                {onBack && (
                    <button 
                        onClick={onBack}
                        className="p-2 mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                    >
                        <ChevronLeftIcon className="h-6 w-6" />
                    </button>
                )}
                <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                    {isOwnProfile ? 'My Profile' : safeFullName}
                </h2>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-5xl mx-auto animate-fade-in">
                    {isOwnProfile && (
                        <EditProfileModal 
                            isOpen={isEditModalOpen}
                            onClose={() => setIsEditModalOpen(false)}
                            profile={profile}
                            onSave={handleProfileSave}
                        />
                    )}

                    {/* --- Profile Header --- */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-300">
                        {/* Cover Photo */}
                        <div 
                            className="h-48 md:h-60 bg-gradient-to-r from-blue-500 to-purple-600 relative bg-cover bg-center"
                            style={{ backgroundImage: profile.cover_photo_url ? `url(${profile.cover_photo_url})` : ''}}
                        >
                            {uploadingCover && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <Spinner className="text-white h-8 w-8" />
                                </div>
                            )}
                            {isOwnProfile && (
                                <div className="absolute top-4 right-4">
                                    <input
                                        type="file"
                                        ref={coverFileInputRef}
                                        onChange={handleCoverFileChange}
                                        className="hidden"
                                        accept="image/png, image/jpeg, image/gif"
                                        disabled={uploadingCover}
                                    />
                                    <button 
                                        onClick={handleCoverPhotoClick}
                                        disabled={uploadingCover}
                                        className="bg-black/50 hover:bg-black/70 text-white font-semibold p-2 rounded-full shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Edit cover photo"
                                        title="Edit cover photo"
                                    >
                                        <CameraIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Profile Picture, Name, and Actions */}
                        <div className="p-4 sm:p-6">
                            <div className="sm:flex sm:items-end sm:space-x-5">
                                <div className="flex -mt-20 sm:-mt-24 justify-center sm:justify-start">
                                    <div className="relative group">
                                        {isOwnProfile && (
                                            <input
                                                type="file"
                                                ref={avatarFileInputRef}
                                                onChange={handleAvatarFileChange}
                                                className="hidden"
                                                accept="image/png, image/jpeg, image/gif"
                                                disabled={uploadingAvatar}
                                            />
                                        )}
                                        <button
                                            onClick={handleAvatarClick}
                                            disabled={uploadingAvatar || !isOwnProfile}
                                            className={`h-32 w-32 rounded-full border-4 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 overflow-hidden relative ${isOwnProfile ? 'cursor-pointer' : 'cursor-default'}`}
                                        >
                                            {profile.avatar_url ? (
                                                <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                                            ) : (
                                                <UserCircleIcon className="h-full w-full" />
                                            )}
                                            
                                            {uploadingAvatar && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <Spinner className="text-white h-8 w-8" />
                                                </div>
                                            )}

                                            {isOwnProfile && !uploadingAvatar && (
                                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <CameraIcon className="h-8 w-8" />
                                                    <span className="text-xs font-semibold mt-1">Change Photo</span>
                                                </div>
                                            )}
                                        </button>
                                        {!isOwnProfile && isOnline && (
                                            <span className="absolute bottom-2 right-2 h-6 w-6 bg-green-50 border-4 border-white dark:border-gray-800 rounded-full"></span>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-6 sm:mt-0 sm:flex-1 sm:min-w-0 sm:flex sm:items-center sm:justify-between sm:space-x-6 sm:pb-1">
                                    <div className="min-w-0 flex-1">
                                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate text-center sm:text-left">
                                            {safeFullName}
                                        </h1>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize text-center sm:text-left">
                                            {safeRole}
                                        </p>
                                    </div>
                                    <div className="mt-6 sm:mt-0 flex flex-col justify-stretch space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4">
                                        {isOwnProfile ? (
                                            <button onClick={() => setIsEditModalOpen(true)} type="button" className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                                <PencilIcon inWrapper={false} className="-ml-1 mr-2 h-5 w-5 text-gray-400" />
                                                <span>Edit profile</span>
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => onMessage && onMessage(profile)}
                                                type="button" 
                                                className="inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                <ChatIcon className="-ml-1 mr-2 h-5 w-5" />
                                                <span>Message</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {error && <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md" role="alert">{error}</div>}
                        </div>
                    </div>
                    
                    {/* --- Profile Body --- */}
                    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Left Column */}
                        <div className="space-y-6 lg:col-span-1">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Intro</h2>
                                <ul className="mt-4 space-y-4">
                                    <DetailItem 
                                        icon={<BriefcaseIcon />}
                                        text={<span className="font-medium capitalize">{safeRole}</span>} 
                                    />
                                    <DetailItem
                                        icon={<IdentificationIcon />}
                                        text={
                                            <span>Student ID: <span className="font-medium">
                                                {displayStudentId || <HiddenField />}
                                            </span></span>
                                        }
                                    />
                                    <DetailItem
                                        icon={<MailIcon />}
                                        text={<span>{displayEmail || <HiddenField />}</span>}
                                    />
                                    <DetailItem
                                        icon={<ClockIcon />}
                                        text={<span>Last seen: <span className="font-medium">{displayLastSeen === 'Hidden' ? <HiddenField /> : displayLastSeen}</span></span>}
                                    />
                                </ul>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">About</h2>
                                {safeBio ? (
                                    <p className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{safeBio}</p>
                                ) : (
                                    <p className="mt-2 text-gray-500 dark:text-gray-400 italic">No bio added yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6 lg:col-span-2">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Posts</h2>
                                <Feed user={user} targetUserId={profile.id} onViewProfile={onViewProfile} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
