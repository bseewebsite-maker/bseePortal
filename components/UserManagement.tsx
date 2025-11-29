
import React, { useState, useEffect, useMemo } from 'react';
import { db, supabase } from '../services';
import { Spinner } from './Spinner';
import type { Profile } from '../types';
import SendMessageModal from './SendMessageModal';
import ConfirmationModal from './ConfirmationModal';
import { SendIcon, SearchIconSolid, ChevronDownIcon, ShieldCheckIcon, CheckIcon, XIcon } from './Icons';

interface UserManagementProps {
    onViewProfile?: (profile: Profile) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onViewProfile }) => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
    
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [pendingMessage, setPendingMessage] = useState<{subject: string, body: string} | null>(null);
    
    const [isSending, setIsSending] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            setError(null);
            try {
                const usersSnapshot = await db.collection('profiles').orderBy('full_name', 'asc').get();
                const usersData = usersSnapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Profile[];
                setUsers(usersData);
            } catch (err: any) {
                console.error("Error fetching users:", err);
                setError("Failed to fetch user profiles. Please check the console for details.");
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);
    
    const formatTimestamp = (timestamp: any): string => {
        if (!timestamp) return 'Never';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if(isNaN(date.getTime())) return 'Unknown';
        return date.toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
        });
    };

    const updateUserRole = async (userId: string, newRole: string) => {
        // Optimistic UI update
        const previousUsers = [...users];
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));

        try {
            await db.collection('profiles').doc(userId).update({ role: newRole });
            setStatusMessage({ type: 'success', message: `Role updated to ${newRole} successfully.` });
        } catch (err: any) {
            console.error("Failed to update role", err);
            setUsers(previousUsers); // Revert
            setStatusMessage({ type: 'error', message: "Failed to update user role. Check your permissions." });
        }
    };

    const filteredUsers = useMemo(() => users.filter(user =>
        (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.student_id || '').toLowerCase().includes(searchTerm.toLowerCase())
    ), [users, searchTerm]);

    const handleSelectUser = (userId: string) => {
        const newSelection = new Set(selectedUserIds);
        if (newSelection.has(userId)) {
            newSelection.delete(userId);
        } else {
            newSelection.add(userId);
        }
        setSelectedUserIds(newSelection);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
        } else {
            setSelectedUserIds(new Set());
        }
    };
    
    const selectedUsers = useMemo(() => {
        return users.filter(user => selectedUserIds.has(user.id));
    }, [users, selectedUserIds]);

    const handleComposeSubmit = async (subject: string, message: string) => {
        setPendingMessage({ subject, body: message });
        setIsComposeOpen(false);
        setIsConfirmOpen(true);
    };

    const handleConfirmSend = async () => {
        if (!pendingMessage) return;
        setIsSending(true);
        setStatusMessage(null);
        
        const { subject, body } = pendingMessage;

        try {
            const validRecipients = selectedUsers.filter(u => u.email);
            if(validRecipients.length === 0) {
                throw new Error("No selected users have a valid email address.");
            }

            // Attempt: Supabase Edge Function with Resend
            const { error } = await supabase.functions.invoke('send-email', {
                body: {
                    to: validRecipients.map(u => u.email),
                    subject: subject,
                    html: body.replace(/\n/g, '<br>'),
                },
            });

            if (error) throw error;

            setStatusMessage({ type: 'success', message: `Message sent to ${validRecipients.length} user(s) via system email.` });
            setSelectedUserIds(new Set());

        } catch (err: any) {
            console.warn("System email failed:", err);
            
            // Fallback: Mailto
            try {
                const validRecipients = selectedUsers.filter(u => u.email);
                const bcc = validRecipients.map(u => u.email).join(',');
                const mailtoLink = `mailto:?bcc=${bcc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                
                if (mailtoLink.length < 2000) {
                    window.location.href = mailtoLink;
                    setStatusMessage({ 
                        type: 'warning', 
                        message: "System email unavailable. Opening your default email client instead." 
                    });
                    setSelectedUserIds(new Set());
                } else {
                    throw new Error("Too many recipients for the default mail client.");
                }
            } catch (fallbackError: any) {
                setStatusMessage({ type: 'error', message: fallbackError.message || "Failed to send message." });
            }
        } finally {
            setIsSending(false);
            setIsConfirmOpen(false);
            setPendingMessage(null);
        }
    };
    
    useEffect(() => {
        if (statusMessage) {
            const timer = setTimeout(() => setStatusMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [statusMessage]);

    
    if (loading) return <div className="flex justify-center items-center py-10"><Spinner className="h-8 w-8 text-gray-500" /></div>;
    
    const mainError = error || (statusMessage?.type === 'error' ? statusMessage.message : null);

    return (
        <div className="mt-4 animate-fade-in">
            <SendMessageModal
                isOpen={isComposeOpen}
                onClose={() => setIsComposeOpen(false)}
                onSend={handleComposeSubmit}
                recipients={selectedUsers}
                isSending={false} 
            />

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmSend}
                title="Confirm Send"
                message={`Are you sure you want to send this message to ${selectedUsers.length} recipient(s)? This action cannot be undone.`}
                confirmButtonText="Send Messages"
                isConfirming={isSending}
            />
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">User Directory</h3>
                        <p className="text-sm text-gray-500">Manage roles and contact users.</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <ShieldCheckIcon className="h-6 w-6" />
                    </div>
                </div>
                
                {/* Status Notifications */}
                {mainError && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm border border-red-100 flex items-center"><XIcon className="h-4 w-4 mr-2"/>{mainError}</div>}
                {statusMessage?.type === 'success' && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-sm border border-green-100 flex items-center"><CheckIcon className="h-4 w-4 mr-2"/>{statusMessage.message}</div>}
                {statusMessage?.type === 'warning' && <div className="bg-yellow-50 text-yellow-700 p-3 rounded-lg mb-4 text-sm border border-yellow-100 flex items-center"><ShieldCheckIcon className="h-4 w-4 mr-2"/>{statusMessage.message}</div>}

                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                     <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIconSolid className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name, email, or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                        />
                    </div>
                    <button
                        onClick={() => setIsComposeOpen(true)}
                        disabled={selectedUserIds.size === 0}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                        <SendIcon className="h-4 w-4 mr-2" />
                        Email Selected ({selectedUserIds.size})
                    </button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200 min-h-[300px]">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="p-4 w-10">
                                   <input 
                                        type="checkbox" 
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        checked={filteredUsers.length > 0 && selectedUserIds.size === filteredUsers.length}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Last Seen</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${selectedUserIds.has(user.id) ? 'bg-blue-50/30' : ''}`}>
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                checked={selectedUserIds.has(user.id)}
                                                onChange={() => handleSelectUser(user.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap" onClick={() => onViewProfile && onViewProfile(user)}>
                                            <div className={`flex items-center ${onViewProfile ? 'cursor-pointer group' : ''}`}>
                                                <div className="flex-shrink-0 h-9 w-9">
                                                    <img className="h-9 w-9 rounded-full object-cover bg-gray-100 group-hover:ring-2 group-hover:ring-blue-300 transition-all" src={user.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user.full_name || 'User')}`} alt="" />
                                                </div>
                                                <div className="ml-3">
                                                    <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{user.full_name || 'Unknown'}</div>
                                                    <div className="text-xs text-gray-500">{user.student_id || 'No ID'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="relative">
                                                <select
                                                    value={user.role || 'student'}
                                                    onChange={(e) => updateUserRole(user.id, e.target.value)}
                                                    className={`block w-full pl-3 pr-8 py-1.5 text-xs font-bold border rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 cursor-pointer uppercase tracking-wide transition-colors shadow-sm
                                                        ${user.role === 'mayor' ? 'bg-purple-50 text-purple-700 border-purple-200 focus:ring-purple-500' : 
                                                          user.role === 'monitor' ? 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500' :
                                                          user.role === 'treasurer' ? 'bg-green-50 text-green-700 border-green-200 focus:ring-green-500' :
                                                          'bg-gray-50 text-gray-700 border-gray-200 focus:ring-gray-500'}
                                                    `}
                                                >
                                                    <option value="student">Student</option>
                                                    <option value="monitor">Monitor</option>
                                                    <option value="treasurer">Treasurer</option>
                                                    <option value="mayor">Mayor</option>
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                                    <ChevronDownIcon className="h-3 w-3" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-600 max-w-[180px] truncate" title={user.email}>{user.email || 'No email'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatTimestamp(user.last_seen || user.updated_at)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                 <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm">No users match your search.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
