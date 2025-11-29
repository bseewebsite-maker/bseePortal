
import React, { useState, useEffect } from 'react';
import { supabase, db, firestore } from '../services';
import { Spinner } from './Spinner';
import { 
    KeyIcon, 
    ShieldCheckIcon, 
    MonitorIcon, 
    UserCircleIcon, 
    CheckCircleIcon, 
    WarningIcon,
    ChevronLeftIcon,
    FundsIcon,
    InformationCircleIcon,
    ChevronRightIcon,
    GlobeIcon,
    UsersIcon,
    LockClosedIcon,
    MailIcon,
    BriefcaseIcon,
    ClipboardIcon,
    CheckIcon,
    EyeIcon,
    EyeOffIcon
} from './Icons';
import type { Profile } from '../types';

type View = 'homepage' | 'calendar' | 'settings' | 'profile' | 'funds' | 'attendance' | 'mayor' | 'monitor' | 'notifications' | 'friends' | 'chats' | 'ai-assistant';
type SettingsTab = 'overview' | 'security' | 'privacy' | 'about';
type PasswordStep = 'request' | 'verify_token' | 'set_password';

interface SettingsPageProps {
    profile: Profile;
    setActiveView: (view: View) => void;
    onProfileUpdate?: (updates: Partial<Profile>) => void;
    onBack?: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ profile, setActiveView, onProfileUpdate, onBack }) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
    
    // Password & Security State
    const [step, setStep] = useState<PasswordStep>('request');
    const [verificationToken, setVerificationToken] = useState(''); // The entered token
    const [generatedToken, setGeneratedToken] = useState(''); // The actual token (for email flow)
    const [devTokenDisplay, setDevTokenDisplay] = useState<string | null>(null); // Token to show in UI (Dev mode)
    const [isCopied, setIsCopied] = useState(false); // For copy button feedback

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [isUsingSpecialToken, setIsUsingSpecialToken] = useState(false);
    const [daysRemaining, setDaysRemaining] = useState(0);
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);

    // Privacy State
    // Default to 'only_me' if undefined to enforce strict privacy by default.
    const [privacySettings, setPrivacySettings] = useState({
        email: profile.privacy_email || 'only_me', 
        studentId: profile.privacy_student_id || 'only_me',
        lastSeen: profile.privacy_last_seen || 'only_me'
    });
    const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

    // External Links State
    const [treasurerUrl, setTreasurerUrl] = useState('https://treasurer-s-portal-nchx.vercel.app/');

    // Sync state with profile props when they change (e.g. after a save or re-fetch)
    useEffect(() => {
        if (profile) {
            setPrivacySettings({
                email: profile.privacy_email || 'only_me',
                studentId: profile.privacy_student_id || 'only_me',
                lastSeen: profile.privacy_last_seen || 'only_me'
            });
        }
    }, [profile]);

    // Fetch Global Config for Dynamic Links
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const doc = await db.collection('system_settings').doc('global_config').get();
                if (doc.exists && doc.data().treasurer_portal_url) {
                    setTreasurerUrl(doc.data().treasurer_portal_url);
                }
            } catch (err) {
                console.error("Error fetching system config:", err);
            }
        };
        // Fetch if role is relevant
        if (profile.role === 'mayor' || profile.role === 'treasurer') {
            fetchConfig();
        }
    }, [profile.role]);

    // Calculate restriction logic on mount or profile change
    useEffect(() => {
        if (profile.last_password_change) {
            let lastDate: Date;
            try {
                if (typeof (profile.last_password_change as any).toDate === 'function') {
                    lastDate = (profile.last_password_change as any).toDate();
                } else if (profile.last_password_change instanceof Date) {
                    lastDate = profile.last_password_change;
                } else {
                    lastDate = new Date(profile.last_password_change as any);
                }

                if (!isNaN(lastDate.getTime())) {
                    const nextDate = new Date(lastDate);
                    nextDate.setDate(lastDate.getDate() + 30); // 30 Days Restriction
                    
                    const now = new Date();
                    if (now < nextDate) {
                        const diffTime = Math.abs(nextDate.getTime() - now.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        setDaysRemaining(diffDays);
                    } else {
                        setDaysRemaining(0);
                    }
                }
            } catch (e) {
                console.warn("Error parsing password change date", e);
            }
        }
    }, [profile.last_password_change]);

    const handleCopyToken = () => {
        if (devTokenDisplay) {
            navigator.clipboard.writeText(devTokenDisplay);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    const handleRequestToken = async () => {
        setMessage(null);
        setDevTokenDisplay(null);

        // 1. Check Rate Limit
        if (daysRemaining > 0 && !isUsingSpecialToken) {
            setMessage({ 
                type: 'error', 
                text: `Security Limit: You can only change your password once every 30 days. Please wait ${daysRemaining} more day(s).` 
            });
            return;
        }

        setIsProcessing(true);
        
        // 2. Generate Token locally for email flow
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedToken(token);

        try {
            // Fallback: Fetch email from Auth if missing in profile state
            let emailToSend = profile.email;
            if (!emailToSend) {
                const { data: { user } } = await supabase.auth.getUser();
                emailToSend = user?.email;
            }

            if (!emailToSend) {
                throw new Error("No email address found on your profile.");
            }

            // 3. Send Email via Edge Function
            const { error } = await supabase.functions.invoke('send-email', {
                body: {
                    to: [emailToSend],
                    subject: 'BseePortal Password Change Verification',
                    html: `
                        <div style="font-family: sans-serif; color: #333;">
                            <h2>Password Change Request</h2>
                            <p>Use the following code to verify your identity and change your password:</p>
                            <div style="background: #f4f4f4; padding: 15px; font-size: 24px; letter-spacing: 5px; font-weight: bold; text-align: center; border-radius: 8px; margin: 20px 0;">
                                ${token}
                            </div>
                            <p>If you did not request this, please ignore this email and secure your account.</p>
                        </div>
                    `,
                },
            });

            if (error) throw error;

            setMessage({ type: 'success', text: `Verification code sent to ${emailToSend}` });
            setStep('verify_token');

        } catch (err: any) {
            // FALLBACK FOR DEV MODE (or email failure)
            console.warn("Email service unavailable (Developer Mode active). Using local display.");
            setDevTokenDisplay(token); // Show token in UI
            setStep('verify_token');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleVerifyToken = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsProcessing(true);

        try {
            if (isUsingSpecialToken) {
                // Verify against DB for Admin Token
                const doc = await db.collection('profiles').doc(profile.id).get();
                const currentData = doc.data();
                
                if (!currentData?.special_password_token || currentData.special_password_token !== verificationToken.trim()) {
                    throw new Error("Invalid Administrative Token.");
                }
                // Valid admin token
            } else {
                // Verify against local generated token (Email flow)
                if (verificationToken.trim() !== generatedToken) {
                    throw new Error("Invalid verification code.");
                }
            }

            // If we reach here, token is valid
            setStep('set_password');
            setMessage(null);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        // Validate Password
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: "Passwords do not match." });
            return;
        }
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: "Password must be at least 6 characters." });
            return;
        }

        setIsProcessing(true);

        try {
            // 1. Update Password in Auth
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            // 2. Update Rate Limit Timestamp & Clear Special Token
            const dbUpdates: any = {
                last_password_change: firestore.FieldValue.serverTimestamp(),
            };
            
            // Prepare local updates with a real Date object so UI updates immediately without "Script Error"
            const localUpdates: any = {
                last_password_change: new Date(),
            };
            
            // If we used a special token, consume it (delete it)
            if (isUsingSpecialToken) {
                dbUpdates.special_password_token = firestore.FieldValue.delete();
                localUpdates.special_password_token = null;
            }

            await db.collection('profiles').doc(profile.id).update(dbUpdates);
            
            // Update parent state
            if (onProfileUpdate) onProfileUpdate(localUpdates);

            setMessage({ type: 'success', text: "Password updated successfully. You are now restricted from changing it for 30 days." });
            
            // Reset form completely
            setStep('request');
            setNewPassword('');
            setConfirmPassword('');
            setVerificationToken('');
            setGeneratedToken('');
            setDevTokenDisplay(null);
            setIsUsingSpecialToken(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || "Failed to update password." });
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrivacySave = async () => {
        setIsSavingPrivacy(true);
        setMessage(null);
        try {
            // Construct safe settings object with strings to avoid [object Object] errors
            const newSettings = {
                privacy_email: privacySettings.email || 'only_me',
                privacy_student_id: privacySettings.studentId || 'only_me',
                privacy_last_seen: privacySettings.lastSeen || 'only_me'
            };

            // 1. Update Firestore (Primary Source of Truth for App Logic)
            await db.collection('profiles').doc(profile.id).set(newSettings, { merge: true });

            // 2. Update Supabase (Background Sync - Non-blocking)
            // We use a separate try-catch here so Supabase specific errors don't block the UI feedback
            try {
                await supabase.from('profiles').update(newSettings).eq('id', profile.id);
            } catch (supaErr) {
                console.warn("Supabase sync warning (non-critical):", supaErr);
            }

            // 3. Update Local State to reflect changes immediately
            if(onProfileUpdate) onProfileUpdate(newSettings);

            setMessage({ type: 'success', text: "Privacy settings saved." });
        } catch (err: any) {
            // Simplified error handling to prevent "Script error" or [object Object]
            console.error("Privacy Save Error:", err);
            let errMsg = "Failed to save settings.";
            
            if (typeof err === 'string') {
                errMsg = err;
            } else if (err instanceof Error) {
                errMsg = err.message;
            } else if (err && typeof err === 'object' && 'message' in err) {
                errMsg = String(err.message);
            }
            
            setMessage({ type: 'error', text: errMsg });
        } finally {
            setIsSavingPrivacy(false);
        }
    };

    // Helper to safely render names
    const safeName = typeof profile.full_name === 'string' ? profile.full_name : 'User';
    const safeId = typeof profile.student_id === 'string' ? profile.student_id : '';
    const safeRole = typeof profile.role === 'string' ? profile.role : 'member';

    const handleBack = () => {
        if (activeTab !== 'overview') {
            setActiveTab('overview');
            setMessage(null);
            setNewPassword('');
            setConfirmPassword('');
            setVerificationToken('');
            setStep('request');
            setDevTokenDisplay(null);
            setIsUsingSpecialToken(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
        } else {
            onBack && onBack();
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Persistent Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center shadow-sm flex-shrink-0 z-10">
                <button 
                    onClick={handleBack}
                    className="p-2 mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                >
                    <ChevronLeftIcon className="h-6 w-6" />
                </button>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                    {activeTab === 'overview' ? 'Settings' : activeTab}
                </h2>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-3xl mx-auto animate-fade-in">
                    
                    {message && activeTab !== 'overview' && (
                        <div className={`mb-6 p-4 rounded-lg text-sm flex items-start ${
                            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 
                            message.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                            'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                            {message.type === 'success' ? (
                                <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600 flex-shrink-0" />
                            ) : (
                                <WarningIcon />
                            )}
                            <div className="ml-2">
                                <span className="font-medium break-all block">{message.text}</span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Profile Card */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center text-center">
                                <div className="relative mb-4">
                                    {profile.avatar_url ? (
                                        <img 
                                            src={profile.avatar_url} 
                                            alt={safeName} 
                                            className="h-24 w-24 rounded-full object-cover border-4 border-gray-50 dark:border-gray-700 shadow-md"
                                        />
                                    ) : (
                                        <UserCircleIcon className="h-24 w-24 text-gray-300" />
                                    )}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{safeName}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-4">{safeId}</p>
                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wide">
                                    {safeRole}
                                </div>
                            </div>

                            {/* Menu Groups */}
                            <div className="space-y-4">
                                {/* Account */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Account
                                    </div>
                                    <button onClick={() => setActiveView('profile')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0">
                                        <div className="flex items-center">
                                            <UserCircleIcon className="h-5 w-5 text-gray-400 mr-3" />
                                            <span className="font-medium text-gray-700 dark:text-gray-200">Edit Profile Details</span>
                                        </div>
                                        <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                    </button>
                                    <button onClick={() => setActiveTab('security')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <div className="flex items-center">
                                            <KeyIcon className="h-5 w-5 text-gray-400 mr-3" />
                                            <span className="font-medium text-gray-700 dark:text-gray-200">Security & Password</span>
                                        </div>
                                        <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                    </button>
                                </div>

                                {/* Privacy */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Privacy
                                    </div>
                                    <button onClick={() => setActiveTab('privacy')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <div className="flex items-center">
                                            <ShieldCheckIcon className="h-5 w-5 text-gray-400 mr-3" />
                                            <span className="font-medium text-gray-700 dark:text-gray-200">Privacy Settings</span>
                                        </div>
                                        <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                    </button>
                                </div>

                                {/* Admin Tools (Conditional) */}
                                {(profile.role === 'mayor' || profile.role === 'monitor' || profile.role === 'treasurer') && (
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Admin Tools
                                        </div>
                                        {profile.role === 'mayor' && (
                                            <button onClick={() => setActiveView('mayor')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0">
                                                <div className="flex items-center">
                                                    <ShieldCheckIcon className="h-5 w-5 text-blue-500 mr-3" />
                                                    <span className="font-medium text-gray-700 dark:text-gray-200">Mayor Dashboard</span>
                                                </div>
                                                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                            </button>
                                        )}
                                        {(profile.role === 'mayor' || profile.role === 'treasurer') && (
                                            <a href={treasurerUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0">
                                                <div className="flex items-center">
                                                    <FundsIcon className="h-5 w-5 text-green-500 mr-3" />
                                                    <span className="font-medium text-gray-700 dark:text-gray-200">Treasurer Portal</span>
                                                </div>
                                                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                            </a>
                                        )}
                                        {(profile.role === 'mayor' || profile.role === 'monitor') && (
                                            <button onClick={() => setActiveView('monitor')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <div className="flex items-center">
                                                    <MonitorIcon className="h-5 w-5 text-purple-500 mr-3" />
                                                    <span className="font-medium text-gray-700 dark:text-gray-200">Attendance Monitor</span>
                                                </div>
                                                <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* App Info */}
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        App
                                    </div>
                                    <button onClick={() => setActiveTab('about')} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <div className="flex items-center">
                                            <InformationCircleIcon className="h-5 w-5 text-gray-400 mr-3" />
                                            <span className="font-medium text-gray-700 dark:text-gray-200">About BseePortal</span>
                                        </div>
                                        <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
                            <div className="mb-6 flex items-center">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl mr-4">
                                    <KeyIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Change Password</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account credentials.</p>
                                </div>
                            </div>
                            
                            {/* Step 1: Request Token */}
                            {step === 'request' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                                        <p className="font-semibold mb-1">Policy: Once per month</p>
                                        You can only change your password once every 30 days. This restriction helps ensure account stability and security.
                                    </div>

                                    {daysRemaining > 0 && (
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl p-4 flex items-start">
                                            <WarningIcon />
                                            <div className="ml-3">
                                                <h4 className="text-red-800 dark:text-red-300 font-bold text-sm">Change Blocked</h4>
                                                <p className="text-red-700 dark:text-red-200 text-xs mt-1">
                                                    You changed your password recently. You can change it again in <strong>{daysRemaining} days</strong>.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <button 
                                            onClick={handleRequestToken}
                                            disabled={isProcessing || daysRemaining > 0}
                                            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md disabled:bg-gray-400"
                                        >
                                            {isProcessing ? <Spinner className="mr-2 h-5 w-5 text-white" /> : <MailIcon className="mr-2 h-5 w-5" />}
                                            {isProcessing ? 'Sending Code...' : 'Send Verification Code'}
                                        </button>

                                        <div className="relative flex py-2 items-center">
                                            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                                            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OR</span>
                                            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                                        </div>

                                        <button 
                                            onClick={() => {
                                                setIsUsingSpecialToken(true);
                                                setStep('verify_token');
                                                setMessage(null);
                                                setDevTokenDisplay(null);
                                            }}
                                            className="w-full flex items-center justify-center px-4 py-3 bg-white dark:bg-gray-700 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
                                        >
                                            <BriefcaseIcon className="mr-2 h-5 w-5 text-gray-500" />
                                            I have an Administrative Token
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Verify Token */}
                            {step === 'verify_token' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">
                                            Step 1: Verify Identity
                                        </h3>
                                        <button onClick={() => { setStep('request'); setDevTokenDisplay(null); setMessage(null); }} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                                    </div>

                                    {devTokenDisplay && !isUsingSpecialToken && (
                                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
                                            <p className="text-xs font-bold text-yellow-800 uppercase mb-1">Developer Mode (Email Sim)</p>
                                            <div className="flex items-center justify-between bg-white border border-yellow-300 rounded-lg p-2">
                                                <code className="text-lg font-mono font-bold text-gray-800 tracking-widest">{devTokenDisplay}</code>
                                                <button 
                                                    onClick={handleCopyToken}
                                                    className="p-2 hover:bg-gray-100 rounded-md transition-colors flex items-center text-gray-600"
                                                    title="Copy Token"
                                                >
                                                    {isCopied ? <CheckIcon className="h-5 w-5 text-green-600" /> : <ClipboardIcon className="h-5 w-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <form onSubmit={handleVerifyToken} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                {isUsingSpecialToken ? "Administrative Token" : "Verification Code"}
                                            </label>
                                            <input 
                                                type="text" 
                                                value={verificationToken}
                                                onChange={(e) => setVerificationToken(e.target.value)}
                                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all tracking-widest text-center font-mono font-bold text-lg"
                                                placeholder={isUsingSpecialToken ? "ABC123" : "123456"}
                                                required
                                            />
                                            <p className="text-xs text-gray-500 mt-2 text-center">
                                                {isUsingSpecialToken ? "Provided by the Administrator." : "Enter the 6-digit code sent to you."}
                                            </p>
                                        </div>
                                        <button 
                                            type="submit" 
                                            disabled={isProcessing || !verificationToken}
                                            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 focus:outline-none transition-all shadow-md disabled:opacity-50"
                                        >
                                            {isProcessing ? <Spinner className="mr-2 h-5 w-5 text-white" /> : <CheckCircleIcon className="mr-2 h-5 w-5" />}
                                            Verify Token
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* Step 3: Set Password */}
                            {step === 'set_password' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">
                                            Step 2: Set New Password
                                        </h3>
                                        <button onClick={() => { setStep('request'); setDevTokenDisplay(null); }} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                                    </div>

                                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg flex items-center text-green-800 text-sm mb-4">
                                        <CheckIcon className="h-4 w-4 mr-2" /> Token verified successfully.
                                    </div>

                                    <form onSubmit={handlePasswordUpdate} className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showNewPassword ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    placeholder="Enter new password"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                                                >
                                                    {showNewPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    placeholder="Confirm new password"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                                                >
                                                    {showConfirmPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            type="submit" 
                                            disabled={isProcessing || !newPassword || !confirmPassword}
                                            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                                        >
                                            {isProcessing ? <Spinner className="mr-2 h-5 w-5 text-white" /> : <KeyIcon className="mr-2 h-5 w-5" />}
                                            {isProcessing ? 'Updating...' : 'Update Password'}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
                            <div className="mb-6 flex items-center">
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl mr-4">
                                    <ShieldCheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Privacy Settings</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Control who can see your info. Default is "Only Me".</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Visibility</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['public', 'friends', 'only_me'] as const).map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => setPrivacySettings({...privacySettings, email: option})}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                                                    privacySettings.email === option 
                                                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-400' 
                                                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                {option === 'only_me' ? 'Only Me' : option.charAt(0).toUpperCase() + option.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Student ID Visibility</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['public', 'friends', 'only_me'] as const).map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => setPrivacySettings({...privacySettings, studentId: option})}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                                                    privacySettings.studentId === option 
                                                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-400' 
                                                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                {option === 'only_me' ? 'Only Me' : option.charAt(0).toUpperCase() + option.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Online Status / Last Seen</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['public', 'friends', 'only_me'] as const).map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => setPrivacySettings({...privacySettings, lastSeen: option})}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                                                    privacySettings.lastSeen === option 
                                                    ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-500 dark:text-blue-400' 
                                                    : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                {option === 'only_me' ? 'Only Me' : option.charAt(0).toUpperCase() + option.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button 
                                        onClick={handlePrivacySave}
                                        disabled={isSavingPrivacy}
                                        className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                                    >
                                        {isSavingPrivacy ? <Spinner className="mr-2 h-5 w-5 text-white" /> : null}
                                        {isSavingPrivacy ? 'Saving...' : 'Save Settings'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'about' && (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                            <div className="mb-6">
                                <div className="px-6 py-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mx-auto inline-flex items-center justify-center shadow-lg transform rotate-3">
                                    <span className="text-2xl font-bold text-white tracking-wide">BseePortal</span>
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">BseePortal</h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">Student Portal v1.2.0</p>
                            
                            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-4 mb-8">
                                <p>
                                    BseePortal is a comprehensive student management system designed to streamline academic life. 
                                    It features secure attendance tracking, fund management, real-time communication, and AI assistance.
                                </p>
                                <p>
                                    Built with <span className="font-semibold text-green-600">Supabase</span> and powered by <span className="font-semibold text-blue-600">Google Gemini AI</span>.
                                </p>
                            </div>

                            <div className="border-t border-gray-100 dark:border-gray-700 pt-6 text-xs text-gray-400">
                                &copy; {new Date().getFullYear()} BseePortal Team. All rights reserved.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
