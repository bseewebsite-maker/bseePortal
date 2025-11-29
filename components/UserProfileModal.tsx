
// components/UserProfileModal.tsx
import React from 'react';
import type { User, Collection, UserPayment } from '../types';

interface UserProfileModalProps {
  user: User;
  allCollections: Collection[];
  userPayments: UserPayment[];
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, allCollections, userPayments, onClose }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  const formatTimestamp = (timestamp: { toDate: () => Date } | null): string => {
    if (!timestamp?.toDate) return 'Not yet paid';
    const date = timestamp.toDate();
    return date.toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getStatusInfo = (status: string) => {
    switch(status) {
        case 'Paid': return { text: 'Paid', classes: 'bg-green-100/80 text-green-800' };
        case 'Partial': return { text: 'Partial', classes: 'bg-yellow-100/80 text-yellow-800' };
        default: return { text: 'Unpaid', classes: 'bg-red-100/80 text-red-800' };
    }
  };

  // Create a map for quick lookup of a user's payments
  const paymentsMap: Map<string, UserPayment> = new Map(userPayments.map(p => [p.id, p]));

  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center pb-4 border-b border-gray-200">
          <img className="h-16 w-16 rounded-full object-cover shadow-lg" src={user.avatarUrl} alt={user.name} />
          <div className="ml-4">
            <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
            <p className="text-sm text-gray-600">{user.id}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 flex-grow overflow-y-auto pr-2">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Full Payment History</h3>
          <ul className="space-y-3">
            {allCollections.map(collection => {
              const payment = paymentsMap.get(collection.id);
              const paidAmount = payment?.paidAmount ?? 0;
              const status = getStatusInfo(payment?.status || 'Unpaid');
              
              return (
                <li key={collection.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">{collection.name}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Last Updated: {formatTimestamp(payment?.lastUpdated ?? null)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className={`px-2.5 py-0.5 text-xs font-medium rounded-full inline-block ${status.classes}`}>
                        {status.text}
                      </p>
                      <p className="text-sm text-gray-700 font-medium mt-1">
                        {`${formatCurrency(paidAmount)} / ${formatCurrency(collection.amountPerUser)}`}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
            {allCollections.length === 0 && (
                <li className="text-center text-gray-500 py-4 list-none">No collections have been created yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
