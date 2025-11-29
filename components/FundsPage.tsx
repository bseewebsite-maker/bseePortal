
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services';
import type { Profile, UserPayment, Collection } from '../types';
import { Spinner } from './Spinner';
import { 
    FundsIcon, 
    DownloadIcon, 
    SearchIcon,
    WalletIcon,
    ReceiptIcon,
    ChartPieIcon,
    DotsHorizontalIcon,
    CheckCircleIcon,
    XIcon,
    ChevronDownIcon,
    ChevronRightIcon
} from './Icons';
import UserProfileModal from './UserProfileModal';

interface FundsPageProps {
    profile: Profile;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(amount);
};

const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    // Add timezone 'Z' to treat the date as UTC and prevent off-by-one day errors
    return new Date(`${dateString}T00:00:00Z`).toLocaleDateString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const formatTimestamp = (timestamp: { toDate: () => Date } | null): string => {
    if (!timestamp?.toDate) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

const StatusBadge: React.FC<{ status: UserPayment['status'] }> = ({ status }) => {
    const statusStyles = {
        Paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30',
        Unpaid: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30',
        Partial: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30',
    };
    
    const icons = {
        Paid: <CheckCircleIcon className="h-3.5 w-3.5 mr-1.5" />,
        Unpaid: <XIcon className="h-3.5 w-3.5 mr-1.5" />,
        Partial: <div className="h-2 w-2 rounded-full bg-amber-500 mr-2 animate-pulse" />
    };

    return (
        <span className={`px-3 py-1 text-xs font-bold rounded-full inline-flex items-center shadow-sm ${statusStyles[status]}`}>
            {icons[status]}
            {status.toUpperCase()}
        </span>
    );
};

const FundsPage: React.FC<FundsPageProps> = ({ profile }) => {
    const [userPayments, setUserPayments] = useState<UserPayment[]>([]);
    const [allCollections, setAllCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isProfileVisible, setIsProfileVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'All' | 'Paid' | 'Unpaid' | 'Partial'>('All');
    const [expandedCollectionId, setExpandedCollectionId] = useState<string | null>(null);
    const [treasurerName, setTreasurerName] = useState('N/A');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        if (!profile) return;

        setLoading(true);
        setError(null);

        // Fetch Treasurer Name
        const fetchOfficer = async () => {
            try {
                const treasurerSnap = await db.collection('profiles').where('role', '==', 'treasurer').limit(1).get();
                if (!treasurerSnap.empty) {
                    setTreasurerName(treasurerSnap.docs[0].data().full_name);
                } else {
                    setTreasurerName('N/A');
                }
            } catch (e) {
                console.error("Error fetching officer", e);
                setTreasurerName('N/A');
            }
        };
        fetchOfficer();

        // Fetch the specific user's payment records
        const unsubscribeUserPayments = db
            .collection('student_funds')
            .doc(profile.student_id)
            .collection('collections')
            .onSnapshot((snapshot: any) => {
                const payments = snapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as UserPayment[];
                setUserPayments(payments);
                if(loading) setLoading(false);
            }, (err: any) => {
                console.error("Error fetching student funds from Firestore:", err);
                setError(err.message || 'Failed to fetch your fund collections from Firestore.');
                setLoading(false);
            });

        // Fetch the master list of all collections
        const unsubscribeAllCollections = db.collection('collections')
            .orderBy('deadline', 'desc')
            .onSnapshot((snapshot: any) => {
                const fetchedCollections: Collection[] = snapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    name: doc.data().collectionName, // Map collectionName to name
                    amountPerUser: doc.data().amountDue, // Map amountDue to amountPerUser
                    ...doc.data(),
                }));
                setAllCollections(fetchedCollections);
            }, (err: any) => {
                console.error("Error fetching all collections from Firestore:", err);
                // This error is less critical, so we can just log it
            });

        // Clean up listeners when the component unmounts
        return () => {
            unsubscribeUserPayments();
            unsubscribeAllCollections();
        };
    }, [profile]);

    const handleDownloadReceipt = (collection: Collection, payment: UserPayment) => {
        const receiptContent = `
BseePortal Official E-Receipt
================================

Student Name: ${profile.full_name}
Student ID:   ${profile.student_id}

--------------------------------
Payment Details
--------------------------------
Collection:      ${collection.name}
Date of Payment: ${formatTimestamp(payment.lastUpdated)}
Amount Paid:     ${formatCurrency(payment.paidAmount)}
Total Amount Due:${formatCurrency(collection.amountPerUser)}
Status:          ${payment.status}

Received By:     ${treasurerName}
================================
Thank you for your payment.
`;
        const blob = new Blob([receiptContent.trim()], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BseePortal-Receipt-${collection.name.replace(/ /g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadSummary = () => {
        const paidItems = allCollections.filter(c => {
            const p = userPayments.find(up => up.id === c.id);
            return p && p.paidAmount > 0;
        });

        let content = `
BseePortal Payment Summary Report
===================================
Date Generated: ${new Date().toLocaleString()}

Student Name: ${profile.full_name}
Student ID:   ${profile.student_id}

Treasurer/Officer: ${treasurerName}

-----------------------------------
PAYMENT HISTORY
-----------------------------------
`;

        let total = 0;
        
        if (paidItems.length === 0) {
            content += `\nNo payments recorded.\n`;
        } else {
            paidItems.forEach(c => {
                const p = userPayments.find(up => up.id === c.id)!;
                total += p.paidAmount;
                content += `
Collection:   ${c.name}
Amount Paid:  ${formatCurrency(p.paidAmount)}
Date:         ${formatTimestamp(p.lastUpdated)}
Status:       ${p.status}
-----------------------------------`;
            });
        }

        content += `
===================================
TOTAL CONTRIBUTIONS: ${formatCurrency(total)}
===================================
`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BseePortal-Summary-${profile.student_id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsMenuOpen(false);
    };

    // Summary Calculations
    const summary = useMemo(() => {
        let calculatedTotalDue = 0;
        let calculatedTotalPaid = 0;

        allCollections.forEach(collection => {
            const payment = userPayments.find(p => p.id === collection.id);
            calculatedTotalDue += collection.amountPerUser;
            if (payment) {
                calculatedTotalPaid += payment.paidAmount;
            }
        });

        const pending = calculatedTotalDue - calculatedTotalPaid;
        const progress = calculatedTotalDue > 0 ? (calculatedTotalPaid / calculatedTotalDue) * 100 : 0;

        return {
            totalPaid: calculatedTotalPaid,
            pending: pending > 0 ? pending : 0,
            progress: Math.min(progress, 100)
        };
    }, [allCollections, userPayments]);


    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Spinner className="h-8 w-8 text-gray-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4 rounded-r-lg" role="alert">
                <p className="font-bold">Error</p>
                <p>{error}</p>
            </div>
        );
    }
    
    const collectionsToShow = allCollections
        .filter(c => userPayments.some(p => p.id === c.id))
        .sort((a, b) => {
            const paymentA = userPayments.find(p => p.id === a.id);
            const paymentB = userPayments.find(p => p.id === b.id);
            const timeA = paymentA?.lastUpdated?.toDate()?.getTime() ?? 0;
            const timeB = paymentB?.lastUpdated?.toDate()?.getTime() ?? 0;
            return timeB - timeA;
        });

    const filteredCollections = collectionsToShow.filter(collection => {
        const payment = userPayments.find(p => p.id === collection.id);
        const status = payment?.status || 'Unpaid';
        const matchesSearch = collection.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'All' || status === filterStatus;
        
        return matchesSearch && matchesFilter;
    });

    const userForModal = {
      id: profile.student_id,
      name: profile.full_name,
      avatarUrl: profile.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(profile.full_name)}`,
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in">
             {isProfileVisible && (
              <UserProfileModal
                user={userForModal}
                allCollections={allCollections}
                userPayments={userPayments}
                onClose={() => setIsProfileVisible(false)}
              />
            )}

            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 px-4 sm:px-0">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">My Funds</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Overview of your financial contributions.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsProfileVisible(true)} 
                        className="group flex items-center px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
                    >
                        <ReceiptIcon className="h-4 w-4 mr-2 text-gray-400 group-hover:text-blue-500 transition-colors"/>
                        Full History
                    </button>
                    <div className="relative">
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)} 
                            className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 focus:outline-none transition-colors shadow-sm"
                        >
                            <DotsHorizontalIcon className="h-5 w-5" />
                        </button>
                        {isMenuOpen && (
                            <>
                                <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setIsMenuOpen(false)}
                                ></div>
                                <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 py-2 animate-fade-in-up overflow-hidden">
                                    <button 
                                        onClick={handleDownloadSummary} 
                                        className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center transition-colors"
                                    >
                                        <DownloadIcon className="h-4 w-4 mr-3 text-gray-400" /> 
                                        Download Summary Report
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2 sm:px-0">
                {/* Total Paid Card */}
                <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/20 transition-transform hover:-translate-y-1 duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <WalletIcon className="h-24 w-24 transform rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-emerald-100 font-medium text-xs uppercase tracking-widest">Total Paid</p>
                        <h3 className="text-4xl font-extrabold mt-3 tracking-tight">{formatCurrency(summary.totalPaid)}</h3>
                        <div className="mt-4 flex items-center text-sm text-emerald-50 font-medium">
                            <span className="bg-white/20 px-3 py-1 rounded-lg backdrop-blur-sm">
                                {userPayments.filter(p => p.paidAmount > 0).length} Collections Contributed
                            </span>
                        </div>
                    </div>
                </div>

                {/* Pending Dues Card */}
                <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl shadow-rose-500/20 transition-transform hover:-translate-y-1 duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <FundsIcon className="h-24 w-24 transform -rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-rose-100 font-medium text-xs uppercase tracking-widest">Pending Dues</p>
                        <h3 className="text-4xl font-extrabold mt-3 tracking-tight">{formatCurrency(summary.pending)}</h3>
                        <div className="mt-4 flex items-center text-sm text-rose-50 font-medium">
                            <span className="bg-white/20 px-3 py-1 rounded-lg backdrop-blur-sm flex items-center">
                                {summary.pending > 0 ? <><XIcon className="h-3 w-3 mr-1.5"/> Action Required</> : <><CheckCircleIcon className="h-3 w-3 mr-1.5"/> All Caught Up</>}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Completion Rate Card */}
                <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700 transition-transform hover:-translate-y-1 duration-300">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest">Completion</p>
                            <h3 className="text-4xl font-extrabold mt-2 text-blue-600 dark:text-blue-400 tracking-tight">{summary.progress.toFixed(0)}%</h3>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <ChartPieIcon className="h-6 w-6" />
                        </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${summary.progress}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-3 text-right font-medium">Overall Progress</p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Toolbar */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col lg:flex-row gap-6 items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-xl">
                    <div className="w-full lg:w-auto overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                        <div className="flex gap-1 p-1 bg-gray-200/50 dark:bg-gray-700/50 rounded-xl">
                            {['All', 'Paid', 'Unpaid', 'Partial'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status as any)}
                                    className={`px-5 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                                        filterStatus === status
                                            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative w-full lg:w-80 group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search collections..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-gray-900 dark:text-white placeholder-gray-400 shadow-sm"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredCollections.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            <div className="bg-gray-50 dark:bg-gray-800 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FundsIcon className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">No Collections Found</h3>
                            <p className="text-sm mt-2 max-w-xs mx-auto">Try adjusting your filters or search terms.</p>
                        </div>
                    ) : (
                        filteredCollections.map((collection) => {
                            const payment = userPayments.find(p => p.id === collection.id) || { status: 'Unpaid', paidAmount: 0, lastUpdated: null };
                            const balance = collection.amountPerUser - payment.paidAmount;
                            const isExpanded = expandedCollectionId === collection.id;
                            
                            const percentPaid = collection.amountPerUser > 0 ? (payment.paidAmount / collection.amountPerUser) * 100 : 0;
                            const progressBarColor = percentPaid >= 100 ? 'bg-emerald-500' : percentPaid > 0 ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-600';

                            const collectionNameLower = collection.name.toLowerCase();
                            let collectionDisplayName;

                            if (collectionNameLower.includes('ulikdanay')) {
                                const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                                const monthInName = months.find(m => collectionNameLower.includes(m.toLowerCase()));

                                if (monthInName) {
                                    collectionDisplayName = (
                                        <div className="flex items-center text-lg">
                                            <span className="font-extrabold text-blue-600 dark:text-blue-400">{monthInName}</span>
                                            <span className="mx-2 font-light text-gray-300 dark:text-gray-600">/</span>
                                            <span className="font-bold text-gray-800 dark:text-white">{collection.name.replace(new RegExp(monthInName, 'i'), '').replace(/[-\s]+$/, '')}</span>
                                        </div>
                                    );
                                } else {
                                    collectionDisplayName = collection.name;
                                }
                            } else {
                                collectionDisplayName = collection.name;
                            }

                            return (
                                <div key={collection.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                                    <div 
                                        className="p-6 cursor-pointer" 
                                        onClick={() => setExpandedCollectionId(isExpanded ? null : collection.id)}
                                    >
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                                            <div className="flex-1">
                                                <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                                    {collectionDisplayName}
                                                </div>
                                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center">
                                                    <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300 mr-2">Deadline</span>
                                                    {formatDate(collection.deadline || null)}
                                                </div>
                                            </div>
                                            <StatusBadge status={payment.status} />
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-end text-sm font-medium">
                                                <div>
                                                    <span className="text-gray-900 dark:text-white font-bold text-base">{formatCurrency(payment.paidAmount)}</span>
                                                    <span className="text-gray-400 mx-1.5">/</span>
                                                    <span className="text-gray-500 dark:text-gray-400">{formatCurrency(collection.amountPerUser)}</span>
                                                </div>
                                                <div className="text-xs font-bold text-gray-400">
                                                    {percentPaid.toFixed(0)}%
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`} 
                                                    style={{ width: `${Math.min(percentPaid, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="bg-gray-50/80 dark:bg-gray-800/50 px-6 py-5 border-t border-gray-100 dark:border-gray-700/50 animate-fade-in">
                                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm w-full sm:w-auto">
                                                    <span className="text-gray-500 dark:text-gray-400">Last updated:</span>
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200 text-right sm:text-left">{formatTimestamp(payment.lastUpdated)}</span>
                                                    
                                                    <span className="text-gray-500 dark:text-gray-400">Remaining Balance:</span>
                                                    <span className={`font-bold text-right sm:text-left ${balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                        {formatCurrency(Math.max(0, balance))}
                                                    </span>
                                                </div>
                                                
                                                <div className="w-full sm:w-auto flex justify-end">
                                                    {(payment.status === 'Paid' || payment.status === 'Partial') ? (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDownloadReceipt(collection, payment);
                                                            }}
                                                            className="w-full sm:w-auto flex items-center justify-center px-5 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-700 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-500 shadow-sm transition-all active:scale-95"
                                                        >
                                                            <DownloadIcon className="h-4 w-4 mr-2" /> Download Receipt
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic bg-white dark:bg-gray-700 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-600">
                                                            Receipt available after payment
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default FundsPage;
