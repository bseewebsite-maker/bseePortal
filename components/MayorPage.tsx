
import React, { useState, useEffect, useMemo } from 'react';
import { db, firestore } from '../services';
import { Spinner } from './Spinner';
import type { Event, Profile } from '../types';
import { 
    CalendarIcon, 
    TrashIcon, 
    UsersIcon, 
    ShieldCheckIcon, 
    ChartPieIcon, 
    PlusIcon, 
    XIcon, 
    MegaphoneIcon, 
    FundsIcon, 
    SearchIcon, 
    KeyIcon, 
    CheckIcon,
    ClipboardIcon,
    LockClosedIcon,
    SettingsIcon,
    ExternalLinkIcon
} from './Icons';
import ConfirmationModal from './ConfirmationModal';
import UserManagement from './UserManagement';

// --- Types ---
interface EventWithId extends Event {
    docId: string;
}

interface MayorPageProps {
    onViewProfile?: (profile: Profile) => void;
}

// --- Helper Functions ---
function chunkArray<T>(array: T[], size: number): T[][] {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

// --- Helper Components ---

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4 hover:shadow-md transition-shadow">
        <div className={`p-4 rounded-xl ${color} bg-opacity-10`}>
            <div className={`${color.replace('bg-', 'text-').replace('-500', '-600')}`}>
                {icon}
            </div>
        </div>
        <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
        </div>
    </div>
);

const OverviewTab: React.FC = () => {
    const [stats, setStats] = useState({ users: 0, events: 0, collections: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const usersSnap = await db.collection('profiles').get();
                const eventsSnap = await db.collection('events').get();
                const collectionsSnap = await db.collection('collections').get();
                
                setStats({
                    users: usersSnap.size,
                    events: eventsSnap.size,
                    collections: collectionsSnap.size
                });
            } catch (e) {
                console.error("Error fetching stats", e);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="p-10 flex justify-center"><Spinner /></div>;

    return (
        <div className="space-y-6 mt-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title="Total Registered Users" 
                    value={stats.users} 
                    icon={<UsersIcon className="h-8 w-8" />} 
                    color="bg-blue-500" 
                />
                <StatCard 
                    title="Total Events Created" 
                    value={stats.events} 
                    icon={<CalendarIcon className="h-8 w-8" />} 
                    color="bg-purple-500" 
                />
                <StatCard 
                    title="Active Fund Collections" 
                    value={stats.collections} 
                    icon={<FundsIcon className="h-8 w-8" />} 
                    color="bg-green-500" 
                />
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl shadow-sm">
                <h3 className="text-lg font-bold text-blue-900 mb-2">System Status</h3>
                <p className="text-blue-800 text-sm">
                    The portal is currently active. All services including notifications, database connections, and authentication are operational.
                </p>
            </div>
        </div>
    );
};

const EventManagement: React.FC = () => {
    const [events, setEvents] = useState<EventWithId[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Create Event State
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventTime, setNewEventTime] = useState('');
    const [newEventType, setNewEventType] = useState('general');
    const [isCreating, setIsCreating] = useState(false);

    const fetchEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            const eventsSnapshot = await db.collection('events').orderBy('eventDate', 'desc').get();
            const eventsData = eventsSnapshot.docs.map((doc: any) => ({
                docId: doc.id,
                id: doc.id,
                ...doc.data(),
            })) as EventWithId[];
            setEvents(eventsData);
        } catch (err: any) {
            console.error("Error fetching events:", err);
            setError("Failed to fetch events.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleDeleteClick = (docId: string) => {
        setEventToDelete(docId);
        setIsConfirmModalOpen(true);
    };

    const confirmDeleteEvent = async () => {
        if (!eventToDelete) return;
        setIsDeleting(true);
        try {
            await db.collection('events').doc(eventToDelete).delete();
            setEvents(prev => prev.filter(e => e.docId !== eventToDelete));
        } catch (err) {
            console.error("Error deleting event:", err);
        } finally {
            setIsDeleting(false);
            setIsConfirmModalOpen(false);
            setEventToDelete(null);
        }
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            await db.collection('events').add({
                title: newEventTitle,
                eventDate: newEventDate,
                eventTime: newEventTime || null,
                eventType: newEventType,
                isPublic: true, // Mayor events are public by default
                userId: null, // Official event
                createdAt: firestore.FieldValue.serverTimestamp()
            });
            setIsCreateModalOpen(false);
            setNewEventTitle('');
            setNewEventDate('');
            setNewEventTime('');
            fetchEvents(); // Refresh list
        } catch (err) {
            console.error("Error creating event:", err);
            alert("Failed to create event.");
        } finally {
            setIsCreating(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString + 'T00:00:00Z').toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC', 
        });
    };

    return (
        <div className="mt-6">
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmDeleteEvent}
                title="Delete Event"
                message="Permanently delete this event?"
                confirmButtonText="Delete"
                isConfirming={isDeleting}
            />

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900">Create Official Event</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600"><XIcon className="h-6 w-6" /></button>
                        </div>
                        <form onSubmit={handleCreateEvent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input type="text" required value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Event Name" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                    <input type="date" required value={newEventDate} onChange={e => setNewEventDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                    <input type="time" value={newEventTime} onChange={e => setNewEventTime(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select value={newEventType} onChange={e => setNewEventType(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="general">General</option>
                                    <option value="academic">Academic</option>
                                    <option value="deadline">Deadline</option>
                                </select>
                            </div>
                            <div className="pt-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                                <button type="submit" disabled={isCreating} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center">
                                    {isCreating && <Spinner className="mr-2" />} Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <p className="text-gray-600 text-sm">Manage official events visible to all students.</p>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full hover:bg-blue-700 shadow-sm transition-colors"
                >
                    <PlusIcon className="h-4 w-4 mr-2" /> New Event
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-10"><Spinner /></div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visibility</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {events.length > 0 ? events.map((event) => (
                                <tr key={event.docId} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-gray-900">{event.title}</div>
                                        <div className="text-xs text-gray-500 capitalize">{event.eventType}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {formatDate(event.eventDate)}
                                        {event.eventTime && <span className="text-gray-400 ml-2 text-xs">{new Date(`1970-01-01T${event.eventTime}`).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${event.isPublic ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {event.isPublic ? 'Public' : 'Private'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <button onClick={() => handleDeleteClick(event.docId)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"><TrashIcon className="h-5 w-5" /></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-500">No events found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const TokenRow: React.FC<{ 
    user: Profile; 
    onRevoke: (id: string) => void;
}> = ({ user, onRevoke }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (user.special_password_token) {
            navigator.clipboard.writeText(user.special_password_token);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <tr key={user.id} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs uppercase">
                        {user.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                        <div className="text-xs text-gray-500">{user.student_id}</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center bg-gray-100 border border-gray-300 rounded-md overflow-hidden max-w-[220px]">
                    <div className="bg-gray-200 px-2 py-1.5 border-r border-gray-300 text-gray-500">
                        <KeyIcon className="h-3.5 w-3.5" />
                    </div>
                    <code className="px-3 py-1.5 text-xs font-mono text-gray-800 truncate select-all flex-1">
                        {user.special_password_token}
                    </code>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right flex items-center justify-end gap-2">
                <button 
                    onClick={handleCopy}
                    className={`p-1.5 rounded-md border transition-all shadow-sm ${
                        copied 
                        ? 'bg-green-50 border-green-200 text-green-600' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                    title="Copy Token"
                >
                    {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                </button>
                <button 
                    onClick={() => onRevoke(user.id)}
                    className="p-1.5 rounded-md border border-red-200 bg-white text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                    title="Revoke Token"
                >
                    <TrashIcon className="h-4 w-4" />
                </button>
            </td>
        </tr>
    );
};

// Mobile Card for Security Tokens
const TokenMobileCard: React.FC<{ 
    user: Profile; 
    onRevoke: (id: string) => void;
}> = ({ user, onRevoke }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (user.special_password_token) {
            navigator.clipboard.writeText(user.special_password_token);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="p-4 border-b border-gray-100 last:border-0 flex flex-col gap-3 bg-white">
            <div className="flex justify-between items-start">
                <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm uppercase shrink-0">
                        {user.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="ml-3 overflow-hidden">
                        <div className="text-sm font-medium text-gray-900 truncate">{user.full_name}</div>
                        <div className="text-xs text-gray-500 truncate">{user.student_id}</div>
                    </div>
                </div>
                <button 
                    onClick={() => onRevoke(user.id)}
                    className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    title="Revoke Token"
                >
                    <TrashIcon className="h-4 w-4" />
                </button>
            </div>
            
            <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-200 px-3 py-2 border-r border-gray-200 text-gray-500 self-stretch flex items-center">
                    <KeyIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 overflow-x-auto">
                    <code className="block px-3 py-2 text-sm font-mono text-gray-800 whitespace-nowrap">
                        {user.special_password_token}
                    </code>
                </div>
                <button 
                    onClick={handleCopy}
                    className={`px-3 py-2 border-l border-gray-200 transition-colors self-stretch flex items-center justify-center ${copied ? 'bg-green-50 text-green-600' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
                >
                    {copied ? <CheckIcon className="h-4 w-4" /> : <ClipboardIcon className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
};

const SecurityExceptionsTab: React.FC = () => {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Modal State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [generatedToken, setGeneratedToken] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    // Delete Confirmation State
    const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
    const [tokenToRevokeId, setTokenToRevokeId] = useState<string | null>(null);
    const [isRevoking, setIsRevoking] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const snapshot = await db.collection('profiles').get();
                const data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Profile));
                // Sort by name
                data.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
                setUsers(data);
            } catch (e) {
                console.error("Error fetching users", e);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const activeExceptions = useMemo(() => users.filter(u => u.special_password_token), [users]);
    
    const filteredUsersForSelection = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return users.filter(u => 
            !u.special_password_token && // Only show users without tokens
            (
                (u.full_name || '').toLowerCase().includes(term) || 
                (u.student_id || '').toLowerCase().includes(term)
            )
        );
    }, [users, searchTerm]);

    const handleGenerate = async () => {
        if (!selectedUser) return;
        setIsGenerating(true);
        
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let randomPart = '';
        for (let i = 0; i < 32; i++) randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        const token = `sk_live_${randomPart}`;

        try {
            await db.collection('profiles').doc(selectedUser.id).update({
                special_password_token: token
            });
            
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? {...u, special_password_token: token} : u));
            setGeneratedToken(token);
        } catch (e) {
            console.error("Error generating", e);
            alert("Failed to generate token");
        } finally {
            setIsGenerating(false);
        }
    };

    const initiateRevoke = (userId: string) => {
        setTokenToRevokeId(userId);
        setIsRevokeModalOpen(true);
    };

    const confirmRevoke = async () => {
        if (!tokenToRevokeId) return;
        setIsRevoking(true);
        try {
            await db.collection('profiles').doc(tokenToRevokeId).update({
                special_password_token: firestore.FieldValue.delete()
            });
            setUsers(prev => prev.map(u => u.id === tokenToRevokeId ? {...u, special_password_token: null} : u));
        } catch (e) {
            console.error("Error revoking", e);
            alert("Failed to revoke token.");
        } finally {
            setIsRevoking(false);
            setIsRevokeModalOpen(false);
            setTokenToRevokeId(null);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
        setGeneratedToken(null);
        setSearchTerm('');
        setCopied(false);
    };

    const handleCopyGenerated = () => {
        if (generatedToken) {
            navigator.clipboard.writeText(generatedToken);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="mt-6 max-w-5xl mx-auto animate-fade-in">
            <ConfirmationModal
                isOpen={isRevokeModalOpen}
                onClose={() => setIsRevokeModalOpen(false)}
                onConfirm={confirmRevoke}
                title="Revoke Token?"
                message="This will delete the security token immediately. The user will no longer be able to use it to reset their password."
                confirmButtonText="Revoke"
                isConfirming={isRevoking}
            />

            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
                <h3 className="text-red-800 font-bold text-lg">Emergency Password Bypass</h3>
                <p className="text-red-700 text-sm mt-1">
                    Generate one-time secure tokens for users locked out by the 30-day password restriction.
                    These tokens act as administrative keys. Treat them securely.
                </p>
            </div>
            
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800">Active Exceptions ({activeExceptions.length})</h3>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
                >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Generate Token
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-10 flex justify-center"><Spinner /></div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Secure Token</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {activeExceptions.length > 0 ? (
                                        activeExceptions.map(user => (
                                            <TokenRow key={user.id} user={user} onRevoke={initiateRevoke} />
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} className="p-8 text-center text-gray-500">
                                                <div className="flex flex-col items-center">
                                                    <ShieldCheckIcon className="h-10 w-10 text-gray-300 mb-2" />
                                                    <p>No active security tokens.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile List */}
                        <div className="md:hidden">
                             {activeExceptions.length > 0 ? (
                                activeExceptions.map(user => (
                                    <TokenMobileCard key={user.id} user={user} onRevoke={initiateRevoke} />
                                ))
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    <div className="flex flex-col items-center">
                                        <ShieldCheckIcon className="h-10 w-10 text-gray-300 mb-2" />
                                        <p>No active security tokens.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Generation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4" onClick={closeModal}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800">Generate Security Token</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
                                <XIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            {!generatedToken ? (
                                <>
                                    {!selectedUser ? (
                                        <div className="space-y-4">
                                            <p className="text-sm text-gray-600">Select a student to generate a bypass token for.</p>
                                            <div className="relative">
                                                <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                                <input 
                                                    type="text" 
                                                    placeholder="Search student..." 
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                                                {filteredUsersForSelection.length > 0 ? (
                                                    filteredUsersForSelection.slice(0, 20).map(u => (
                                                        <button 
                                                            key={u.id}
                                                            onClick={() => setSelectedUser(u)}
                                                            className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center transition-colors"
                                                        >
                                                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs mr-3">
                                                                {u.full_name?.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-800">{u.full_name}</div>
                                                                <div className="text-xs text-gray-500">{u.student_id}</div>
                                                            </div>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="p-4 text-center text-sm text-gray-500">No matching students found.</div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center space-y-6">
                                            <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                                                <KeyIcon className="h-8 w-8" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-gray-900">Generate Token for {selectedUser.full_name}?</h4>
                                                <p className="text-sm text-gray-500 mt-1">This will allow them to reset their password immediately.</p>
                                            </div>
                                            <div className="flex gap-3">
                                                <button 
                                                    onClick={() => setSelectedUser(null)}
                                                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={handleGenerate}
                                                    disabled={isGenerating}
                                                    className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center justify-center shadow-md"
                                                >
                                                    {isGenerating ? <Spinner className="h-5 w-5" /> : 'Confirm & Generate'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-6 text-center">
                                    <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto animate-fade-in">
                                        <CheckIcon className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-gray-900">Token Generated!</h4>
                                        <p className="text-sm text-gray-500 mt-1">Copy this key and send it to {selectedUser?.full_name}.</p>
                                    </div>
                                    
                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-1 flex items-center">
                                        <code className="flex-1 font-mono text-sm font-bold text-gray-800 px-3 py-2 tracking-wide truncate">
                                            {generatedToken}
                                        </code>
                                        <button 
                                            onClick={handleCopyGenerated}
                                            className={`p-2 rounded-lg transition-all ${copied ? 'bg-green-500 text-white' : 'bg-white text-gray-600 shadow-sm hover:bg-gray-100'}`}
                                        >
                                            {copied ? <CheckIcon className="h-5 w-5" /> : <ClipboardIcon className="h-5 w-5" />}
                                        </button>
                                    </div>

                                    <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 text-xs text-yellow-800 text-left flex gap-2">
                                        <LockClosedIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                        <p>This token is valid for one-time use. Once the student uses it to change their password, it will be automatically deleted.</p>
                                    </div>

                                    <button 
                                        onClick={closeModal}
                                        className="w-full py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800"
                                    >
                                        Done
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const BroadcastTab: React.FC = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const handleBroadcastClick = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) return;
        setIsConfirmOpen(true);
    };

    const executeBroadcast = async () => {
        setIsConfirmOpen(false);
        setIsSending(true);
        setStatus(null);

        try {
            // 1. Fetch all users first
            const usersSnap = await db.collection('profiles').get();
            
            if (usersSnap.empty) {
                throw new Error("No users found to broadcast to.");
            }

            const timestamp = firestore.FieldValue.serverTimestamp();
            
            // 2. Prepare notification object structure
            const notificationData = {
                title: `📢 ${title}`,
                message: message,
                is_read: false,
                notification_type: 'announcement',
                created_at: timestamp
            };

            // 3. Get all IDs
            const userIds = usersSnap.docs.map(doc => doc.id);
            
            // 4. Process in chunks of 450 (Firestore limit is 500 ops per batch)
            const chunks = chunkArray(userIds, 450); 

            let count = 0;
            
            // Execute batches sequentially to ensure reliability
            for (const chunk of chunks) {
                const batch = db.batch();
                
                chunk.forEach(uid => {
                    const ref = db.collection('notifications').doc(); // Auto-ID
                    batch.set(ref, { ...notificationData, user_id: uid });
                    count++;
                });
                
                await batch.commit();
            }

            setStatus({ type: 'success', msg: `Broadcast successfully sent to ${count} users.` });
            setTitle('');
            setMessage('');
        } catch (err: any) {
            console.error("Broadcast failed", err);
            setStatus({ type: 'error', msg: "Broadcast failed. " + (err.message || "Unknown error") });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="mt-6 max-w-2xl mx-auto animate-fade-in">
            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={executeBroadcast}
                title="Send Broadcast?"
                message="This will send a notification to EVERY registered user in the system. This action cannot be undone."
                confirmButtonText="Send Broadcast"
                isConfirming={isSending}
            />

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <MegaphoneIcon className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                <div>
                    <h4 className="font-bold text-yellow-800">Global Broadcast</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                        Sending a broadcast will create a notification for <strong>every registered user</strong>. 
                        Use this for urgent announcements or important updates only.
                    </p>
                </div>
            </div>

            {status && (
                <div className={`p-4 rounded-lg mb-6 text-sm font-medium flex items-center ${status.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {status.type === 'error' && <XIcon className="h-5 w-5 mr-2" />}
                    {status.msg}
                </div>
            )}

            <form onSubmit={handleBroadcastClick} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Notification Title</label>
                    <input 
                        type="text" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                        placeholder="e.g., Urgent Meeting, No Classes Tomorrow"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Message Body</label>
                    <textarea 
                        value={message} 
                        onChange={e => setMessage(e.target.value)} 
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                        placeholder="Enter the details of your announcement..."
                        required
                    ></textarea>
                </div>
                <div className="flex justify-end">
                    <button 
                        type="submit" 
                        disabled={isSending} 
                        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isSending ? <Spinner className="mr-2 h-5 w-5" /> : <MegaphoneIcon className="mr-2 h-5 w-5" />}
                        {isSending ? 'Sending...' : 'Broadcast Now'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const SystemSettingsTab: React.FC = () => {
    const [treasurerUrl, setTreasurerUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const doc = await db.collection('system_settings').doc('global_config').get();
                if (doc.exists && doc.data().treasurer_portal_url) {
                    setTreasurerUrl(doc.data().treasurer_portal_url);
                } else {
                    setTreasurerUrl('https://treasurer-s-portal-nchx.vercel.app/');
                }
            } catch (err) {
                console.error("Error fetching system settings:", err);
                setTreasurerUrl('https://treasurer-s-portal-nchx.vercel.app/');
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        
        try {
            await db.collection('system_settings').doc('global_config').set({
                treasurer_portal_url: treasurerUrl
            }, { merge: true });
            
            setMessage({ type: 'success', text: "Configuration saved successfully." });
        } catch (err) {
            console.error("Error saving settings:", err);
            setMessage({ type: 'error', text: "Failed to save settings." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-10 flex justify-center"><Spinner /></div>;

    return (
        <div className="mt-6 max-w-2xl mx-auto animate-fade-in">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
                <h3 className="text-blue-800 font-bold text-lg">External Service Configuration</h3>
                <p className="text-blue-700 text-sm mt-1">
                    Manage links to external portals and services integrated with BseePortal. Changes made here reflect immediately for all authorized users.
                </p>
            </div>

            {message && (
                <div className={`p-4 rounded-lg mb-6 text-sm font-medium flex items-center ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message.type === 'success' ? <CheckIcon className="h-5 w-5 mr-2" /> : <XIcon className="h-5 w-5 mr-2" />}
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                        <FundsIcon className="h-4 w-4 mr-2 text-green-600" />
                        Treasurer Portal URL
                    </label>
                    <div className="relative">
                        <ExternalLinkIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input 
                            type="url" 
                            value={treasurerUrl} 
                            onChange={e => setTreasurerUrl(e.target.value)} 
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                            placeholder="https://..."
                            required
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        This link is used in the "Admin Tools" section for Mayor and Treasurer roles.
                    </p>
                </div>

                <div className="flex justify-end border-t border-gray-100 pt-4">
                    <button 
                        type="submit" 
                        disabled={saving} 
                        className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {saving ? <Spinner className="mr-2 h-4 w-4" /> : <CheckIcon className="mr-2 h-4 w-4" />}
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </form>
        </div>
    );
};

// --- Main Page ---

interface TabButtonProps {
    isActive: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ isActive, onClick, icon, label }) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
                isActive 
                ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
        >
            <span className={`${isActive ? 'text-blue-600' : 'text-gray-400'} mr-2`}>{icon}</span>
            {label}
        </button>
    );
};

const MayorPage: React.FC<MayorPageProps> = ({ onViewProfile }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'users' | 'broadcast' | 'security' | 'system'>('overview');
    
    return (
        <div className="max-w-7xl mx-auto pb-10">
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 min-h-[80vh]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                    <div className="flex items-center">
                        <div className="p-3 bg-blue-600 rounded-xl mr-4 shadow-lg">
                            <ShieldCheckIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900">Mayor's Portal</h2>
                            <p className="text-gray-500 text-sm mt-1">Administration & Management Dashboard</p>
                        </div>
                    </div>
                </div>
                
                <div className="border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
                    <nav className="flex space-x-2 min-w-max" aria-label="Tabs">
                        <TabButton
                            isActive={activeTab === 'overview'}
                            onClick={() => setActiveTab('overview')}
                            icon={<ChartPieIcon className="h-5 w-5" />}
                            label="Overview"
                        />
                        <TabButton
                            isActive={activeTab === 'events'}
                            onClick={() => setActiveTab('events')}
                            icon={<CalendarIcon className="h-5 w-5" />}
                            label="Event Management"
                        />
                         <TabButton
                            isActive={activeTab === 'users'}
                            onClick={() => setActiveTab('users')}
                            icon={<UsersIcon className="h-5 w-5" />}
                            label="User Management"
                        />
                        <TabButton
                            isActive={activeTab === 'broadcast'}
                            onClick={() => setActiveTab('broadcast')}
                            icon={<MegaphoneIcon className="h-5 w-5" />}
                            label="Broadcast"
                        />
                        <TabButton
                            isActive={activeTab === 'security'}
                            onClick={() => setActiveTab('security')}
                            icon={<KeyIcon className="h-5 w-5" />}
                            label="Security Exceptions"
                        />
                        <TabButton
                            isActive={activeTab === 'system'}
                            onClick={() => setActiveTab('system')}
                            icon={<SettingsIcon className="h-5 w-5" />}
                            label="System Settings"
                        />
                    </nav>
                </div>
                
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'events' && <EventManagement />}
                {activeTab === 'users' && <UserManagement onViewProfile={onViewProfile} />}
                {activeTab === 'broadcast' && <BroadcastTab />}
                {activeTab === 'security' && <SecurityExceptionsTab />}
                {activeTab === 'system' && <SystemSettingsTab />}
            </div>
        </div>
    );
};

export default MayorPage;
