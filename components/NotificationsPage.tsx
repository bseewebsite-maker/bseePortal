
import React, { useState } from 'react';
import type { Notification } from '../types';
import { BellIcon, CalendarIcon, CheckCircleIcon, CheckIcon, TrashIcon, UserPlusIcon, UsersIcon } from './Icons';

interface NotificationsPageProps {
    notifications: Notification[];
    onMarkAsRead: () => void;
    onDeleteRead: () => void;
    onNotificationClick: (notification: Notification) => void;
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ notifications, onMarkAsRead, onDeleteRead, onNotificationClick }) => {
    const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

    const unreadCount = notifications.filter(n => !n.is_read).length;
    const readCount = notifications.length - unreadCount;

    const displayedNotifications = activeTab === 'unread'
        ? notifications.filter(n => !n.is_read)
        : notifications;

    const formatTime = (timestamp: any) => {
        // Handle potential nulls/undefined or non-timestamp objects safely
        if (!timestamp) return '';
        try {
            let date: Date;
            if (typeof timestamp.toDate === 'function') {
                date = timestamp.toDate();
            } else if (timestamp instanceof Date) {
                date = timestamp;
            } else {
                // Fallback for potential serializable format
                date = new Date(timestamp);
            }
            
            if (isNaN(date.getTime())) return '';

            const now = new Date();
            const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
            if (diff < 60) return 'Just now';
            if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
            if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
            if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
            return date.toLocaleDateString();
        } catch (e) {
            return '';
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden min-h-[calc(100vh-8rem)]">
                <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">Notifications</h2>
                        <div className="flex space-x-6 mt-4">
                            <button 
                                onClick={() => setActiveTab('all')}
                                className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'all' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                All
                                {activeTab === 'all' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full"></span>}
                            </button>
                            <button 
                                onClick={() => setActiveTab('unread')}
                                className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'unread' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Unread
                                {unreadCount > 0 && <span className="ml-2 bg-blue-100 text-blue-600 text-xs py-0.5 px-2 rounded-full">{unreadCount}</span>}
                                {activeTab === 'unread' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full"></span>}
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex space-x-2">
                         <button
                            onClick={onMarkAsRead}
                            disabled={unreadCount === 0}
                            className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <CheckIcon className="h-4 w-4 mr-2" />
                            Mark all read
                        </button>
                         <button
                            onClick={onDeleteRead}
                            disabled={readCount === 0}
                            className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Clear read
                        </button>
                    </div>
                </div>

                <div className="divide-y divide-gray-100">
                    {displayedNotifications.length > 0 ? (
                        displayedNotifications.map(notification => (
                            <div 
                                key={notification.id} 
                                onClick={() => onNotificationClick(notification)}
                                role="button"
                                tabIndex={0}
                                className={`p-4 sm:p-6 flex gap-4 transition-colors hover:bg-gray-50 cursor-pointer ${notification.is_read ? 'bg-white' : 'bg-blue-50/40'}`}
                            >
                                <div className="flex-shrink-0 mt-1">
                                    {notification.notification_type === 'event_reminder' ? (
                                        <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">
                                            <CalendarIcon className="h-6 w-6" />
                                        </div>
                                    ) : notification.notification_type === 'new_event' ? (
                                        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-500">
                                            <CheckCircleIcon className="h-6 w-6" />
                                        </div>
                                    ) : notification.notification_type === 'friend_request' ? (
                                        <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-500">
                                            <UserPlusIcon className="h-6 w-6" />
                                        </div>
                                    ) : notification.notification_type === 'friend_request_accepted' ? (
                                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
                                            <UsersIcon className="h-6 w-6" />
                                        </div>
                                    ) : (
                                         <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
                                            <BellIcon className="h-6 w-6" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className={`text-base ${notification.is_read ? 'text-gray-800' : 'text-gray-900 font-bold'}`}>
                                            {notification.title}
                                        </p>
                                        <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                                            {formatTime(notification.created_at)}
                                        </span>
                                    </div>
                                    {notification.message && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{notification.message}</p>}
                                </div>
                                {!notification.is_read && (
                                    <div className="flex-shrink-0 self-center">
                                        <span className="block h-3 w-3 rounded-full bg-blue-600"></span>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="py-20 px-6 text-center flex flex-col items-center justify-center">
                            <div className="h-20 w-20 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-6">
                                <BellIcon className="h-10 w-10" />
                            </div>
                            <h4 className="text-xl font-semibold text-gray-900 mb-2">No notifications</h4>
                            <p className="text-gray-500">You don't have any notifications in this tab.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;
