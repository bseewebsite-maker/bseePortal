import React, { useState } from 'react';
import type { Profile } from '../types';
import { Spinner } from './Spinner';
import { SendIcon, UsersIcon } from './Icons';

interface SendMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (subject: string, message: string) => Promise<void>;
    recipients: Profile[];
    isSending: boolean;
}

const SendMessageModal: React.FC<SendMessageModalProps> = ({ isOpen, onClose, onSend, recipients, isSending }) => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSend(subject, message);
    };

    const recipientEmails = recipients.map(r => r.email).filter(Boolean).join(', ');

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 transition-opacity" 
            aria-modal="true" 
            role="dialog"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl relative animate-fade-in-up"
                onClick={e => e.stopPropagation()}
            >
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">Compose Message</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-start bg-gray-50 p-3 rounded-lg border">
                             <UsersIcon className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                            <div className="ml-3">
                                <span className="text-sm font-medium text-gray-800">To: {recipients.length} user(s)</span>
                                <p className="text-xs text-gray-500 max-h-16 overflow-y-auto">{recipientEmails}</p>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                                Subject
                            </label>
                            <input
                                type="text"
                                id="subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                                Message
                            </label>
                            <textarea
                                id="message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={8}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="Write your message here..."
                                required
                            ></textarea>
                            <p className="text-xs text-gray-500 mt-1">Basic line breaks will be preserved.</p>
                        </div>
                    </div>
                    <div className="flex justify-end items-center p-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl space-x-3">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            disabled={isSending}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSending} 
                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                        >
                            {isSending ? <Spinner className="mr-2" /> : <SendIcon className="h-5 w-5 mr-2" />}
                            {isSending ? 'Sending...' : 'Send Message'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SendMessageModal;