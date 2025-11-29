
import React from 'react';
import { Spinner } from './Spinner';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    isConfirming?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmButtonText = 'Confirm',
    cancelButtonText = 'Cancel',
    isConfirming = false,
}) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-[200] flex justify-center items-center p-4 transition-opacity" 
            aria-modal="true" 
            role="dialog"
            onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling to parent elements
        >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative animate-fade-in-up">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                    <p className="mt-2 text-gray-600">{message}</p>
                </div>
                <div className="flex justify-end items-center p-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl space-x-3">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        disabled={isConfirming}
                    >
                        {cancelButtonText}
                    </button>
                    <button 
                        type="button" 
                        onClick={onConfirm} 
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:bg-red-400 flex items-center"
                        disabled={isConfirming}
                    >
                        {isConfirming && <Spinner className="mr-2" />}
                        {isConfirming ? 'Deleting...' : confirmButtonText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
