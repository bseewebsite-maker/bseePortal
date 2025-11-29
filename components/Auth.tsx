
import React, { useState } from 'react';
import { supabase, db } from '../services';
import { Spinner } from './Spinner';
import { AtIcon, LockIcon, UserIcon, IdIcon, PinIcon, EyeIcon, EyeOffIcon, WarningIcon, MailIcon, ChevronDownIcon, QuestionMarkCircleIcon, ShieldCheckIcon, CheckIcon, XIcon, LockClosedIcon, GlobeIcon } from './Icons';
import type { StudentPin } from '../types';

type AuthMode = 'signIn' | 'signUp_step1' | 'signUp_step2' | 'awaitingConfirmation' | 'forgotPassword' | 'resetPasswordConfirmation';

// --- Terms Modal Component ---
const TermsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in-up border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                        <ShieldCheckIcon className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Terms of Service</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">BseePortal User Agreement</p>
                    </div>
                    <button onClick={onClose} className="ml-auto p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto text-sm text-gray-600 dark:text-gray-300 space-y-4 leading-relaxed">
                    <p>Welcome to BseePortal. By creating an account, you agree to the following terms:</p>
                    
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            <UserIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" inWrapper={false} />
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase mb-1">Account Responsibility</h4>
                                <p>You are responsible for maintaining the confidentiality of your login credentials. Your Student ID is uniquely linked to your account.</p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <GlobeIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase mb-1">Data Usage</h4>
                                <p>We collect basic student information (Name, ID, Email) to facilitate portal services like attendance tracking and fund management. Your data is stored securely using Supabase and Firebase services.</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <LockClosedIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase mb-1">Privacy</h4>
                                <p>Your personal contact details (email) are private by default. You can control visibility in Settings. Official records (Funds, Attendance) are managed by authorized officers.</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        We reserve the right to suspend accounts that violate community guidelines or attempt unauthorized access to system resources.
                    </p>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95"
                    >
                        Understood
                    </button>
                </div>
            </div>
        </div>
    );
};

const Auth: React.FC = () => {
    const [mode, setMode] = useState<AuthMode>('signIn');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [studentId, setStudentId] = useState('');
    const [pin, setPin] = useState('');

    const [passwordVisible, setPasswordVisible] = useState(false);
    const [pinVisible, setPinVisible] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);
    
    // Terms State
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: 'bg-gray-200' });
    const [suggestedPassword, setSuggestedPassword] = useState('');

    const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password,
            });
            if (error) throw error;
        } catch (error: any) {
            if (error.message === 'Email not confirmed') {
                setError("Please verify your email address before signing in.");
            } else {
                setError(error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePinValidation = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            // Use `ilike` for a case-insensitive search on the student ID.
            // The studentId state is already cleaned by the onChange handler.
            const { data, error: fetchError } = await supabase
                .from('student_pins')
                .select('*')
                .ilike('student_id', studentId)
                .single();

            if (fetchError || !data) {
                 setError("Student ID not found. Please check for typos and ensure it matches your official ID exactly, including hyphens.");
            } else {
                const pinData = data as StudentPin;

                // Also clean the pin from the database to be safe against stored whitespace
                const dbPin = pinData.pin.replace(/\s/g, '').toUpperCase();
                
                if (pinData.is_registered) {
                    setError("This Student ID has already been registered.");
                } else if (dbPin !== pin) { // `pin` state is already cleaned
                    setError("Invalid PIN.");
                } else {
                    setMode('signUp_step2');
                    setMessage(null);
                    setError(null);
                }
            }
        } catch (err: any) {
            setError("Error validating PIN. Please try again.");
            console.error(err);
        }
        
        setLoading(false);
    };

    const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (!agreedToTerms) {
            setError("You must agree to the Terms and Conditions to register.");
            return;
        }

        setLoading(true);
        setError(null);
        
        if (passwordStrength.score < 3) {
            setError("Password is too weak. Please choose a stronger password.");
            setLoading(false);
            return;
        }

        try {
            // STRICT CHECK: Race condition prevention.
            // Verify that the Student ID is still unregistered right before we create the account.
            const { data: checkPin, error: checkError } = await supabase
                .from('student_pins')
                .select('is_registered')
                .ilike('student_id', studentId)
                .single();
            
            if (checkError) throw new Error("Connection failed during verification. Please try again.");
            if (checkPin?.is_registered) {
                throw new Error("This Student ID has already been registered by another user.");
            }

            // DOUBLE CHECK: Verify against 'profiles' table.
            // This explicitly enforces "One Student ID <-> One Email" logic by checking if either is already in use.
            const { data: existingProfiles } = await supabase
                .from('profiles')
                .select('student_id, email')
                .or(`student_id.eq.${studentId},email.eq.${email.trim()}`);

            if (existingProfiles && existingProfiles.length > 0) {
                const match = existingProfiles[0];
                
                // Check if Student ID is taken
                if (match.student_id === studentId) {
                    throw new Error("This Student ID is already linked to an existing profile.");
                }
                
                // Check if Email is taken
                if (match.email && match.email.toLowerCase() === email.trim().toLowerCase()) {
                    throw new Error("This email address is already associated with an account. Please sign in.");
                }

                throw new Error("This Student ID or Email is already registered.");
            }

            // Step 1: Get role from the student_pins table to pass as metadata
            const { data: pinData, error: pinError } = await supabase
                .from('student_pins')
                .select('role')
                .ilike('student_id', studentId)
                .single();

            if (pinError || !pinData) throw new Error("Could not find student details.");
            const studentRole = pinData.role || 'student';

            // Step 2: Create the user in Supabase Auth.
            // Pass profile data in metadata; a database trigger will create the profile row.
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        full_name: fullName.trim(),
                        student_id: studentId,
                        role: studentRole,
                    }
                }
            });

            if (error) throw error;
            if (!data.user) throw new Error("Sign up failed, please try again.");

            // Step 3: Record Terms Acceptance in Firestore
            // We do this immediately so they don't see the terms modal on first login.
            try {
                await db.collection('profiles').doc(data.user.id).set({
                    terms_accepted_app: true,
                    // We don't set terms_accepted_ai here, user must accept that separately
                }, { merge: true });
            } catch (firestoreErr) {
                console.warn("Failed to record terms acceptance in Firestore:", firestoreErr);
                // Non-blocking error, user will just be prompted again on dashboard
            }

            // Step 4: Mark the PIN as registered
            // This locks the Student ID so it cannot be used again.
            const { error: updatePinError } = await supabase
                .from('student_pins')
                .update({ is_registered: true })
                .eq('student_id', studentId);
            
            if(updatePinError) {
                console.error("Failed to update registration status:", updatePinError);
                // We log this critical error but don't block the user flow since the account was created.
            }

            // Step 5: Switch to confirmation view. Supabase handles sending the email.
            setMode('awaitingConfirmation');

        } catch (error: any) {
            // Custom error handling for uniqueness constraints
            if (error.message?.toLowerCase().includes("already registered") || error.message?.toLowerCase().includes("unique constraint")) {
                setError("This email address is already associated with an account. Please sign in or use a different email.");
            } else {
                setError(error.message);
            }
        } finally {
            setLoading(false);
        }
    };
    
    const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: window.location.origin,
            });
            if (error) throw error;
            setMode('resetPasswordConfirmation');
        } catch (error: any) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setError(null);
        setMessage(null);
        setEmail('');
        setPassword('');
        setFullName('');
        setStudentId('');
        setPin('');
        setPasswordVisible(false);
        setPinVisible(false);
        setAgreedToTerms(false);
        setPasswordStrength({ score: 0, text: '', color: 'bg-gray-200' });
        setSuggestedPassword('');
    }
    
    const switchMode = (newMode: AuthMode) => {
        resetForm();
        setMode(newMode);
    }

    const checkPasswordStrength = (pw: string) => {
        let score = 0;
        if (!pw) return { score: 0, text: '', color: 'bg-gray-200' };

        if (pw.length >= 8) score++;
        if (pw.length >= 12) score++;
        if (/[a-z]/.test(pw)) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;

        switch (score) {
            case 0:
            case 1:
            case 2:
                return { score, text: 'Weak', color: 'bg-red-500' };
            case 3:
            case 4:
                return { score, text: 'Medium', color: 'bg-yellow-500' };
            case 5:
            case 6:
                return { score, text: 'Strong', color: 'bg-green-500' };
            default:
                return { score: 0, text: '', color: 'bg-gray-200' };
        }
    };

    const generateStrongPassword = () => {
        const lower = 'abcdefghijklmnopqrstuvwxyz';
        const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+~`|}{[]:;?><,./-=';
        const all = lower + upper + numbers + symbols;
        let newPassword = '';
        
        newPassword += lower[Math.floor(Math.random() * lower.length)];
        newPassword += upper[Math.floor(Math.random() * upper.length)];
        newPassword += numbers[Math.floor(Math.random() * numbers.length)];
        newPassword += symbols[Math.floor(Math.random() * symbols.length)];

        for (let i = 4; i < 16; i++) {
            newPassword += all[Math.floor(Math.random() * all.length)];
        }
        
        const shuffledPassword = newPassword.split('').sort(() => 0.5 - Math.random()).join('');
        setSuggestedPassword(shuffledPassword);
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPassword = e.target.value;
        setPassword(newPassword);
        setPasswordStrength(checkPasswordStrength(newPassword));
        if (suggestedPassword) setSuggestedPassword('');
    };
    
    const inputClasses = "pl-10 w-full p-3 bg-white border border-gray-300 rounded-full text-gray-800 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

    const renderSignIn = () => (
        <div className="w-full">
            <h2 className="text-3xl font-bold text-center text-white mb-2">Welcome Back!</h2>
            <p className="text-center text-gray-200 mb-8">Sign in to access the BseePortal.</p>
            <form onSubmit={handleSignIn} className="space-y-6">
                <div className="relative">
                    <AtIcon />
                    <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required className={inputClasses} />
                </div>
                <div>
                    <div className="relative">
                        <LockIcon />
                        <input 
                            type={passwordVisible ? 'text' : 'password'} 
                            placeholder="Password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            required 
                            className={`${inputClasses} pr-10`}
                        />
                         <button 
                            type="button" 
                            onClick={() => setPasswordVisible(!passwordVisible)} 
                            className="absolute inset-y-0 right-0 px-3 flex items-center"
                            aria-label={passwordVisible ? "Hide password" : "Show password"}
                        >
                            {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                    </div>
                    <div className="text-right mt-2">
                        <button 
                            type="button" 
                            onClick={() => switchMode('forgotPassword')} 
                            className="text-sm text-blue-300 hover:text-white font-semibold"
                        >
                            Forgot Password?
                        </button>
                    </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded-full font-semibold hover:bg-blue-700 transition disabled:bg-blue-400 flex items-center justify-center">
                    {loading ? <Spinner /> : 'Sign In'}
                </button>
            </form>
            <p className="text-center mt-6 text-gray-200">
                Don't have an account? <button onClick={() => switchMode('signUp_step1')} className="text-blue-300 hover:text-white font-semibold">Register Now</button>
            </p>
        </div>
    );
    
    const renderSignUpStep1 = () => (
        <div className="w-full">
            <h2 className="text-3xl font-bold text-center text-white mb-2">Student Verification</h2>
            <p className="text-center text-gray-200 mb-8">Enter your official Student ID and PIN.</p>
            <form onSubmit={handlePinValidation} className="space-y-6">
                <div className="relative">
                    <IdIcon />
                    <input type="text" placeholder="Student ID (e.g., 2024-001)" value={studentId} onChange={e => setStudentId(e.target.value.replace(/\s/g, '').toUpperCase())} required className={inputClasses} />
                </div>
                <div className="relative">
                    <PinIcon />
                    <input 
                        type={pinVisible ? 'text' : 'password'} 
                        placeholder="Student PIN" 
                        value={pin} 
                        onChange={e => setPin(e.target.value.replace(/\s/g, '').toUpperCase())} 
                        required 
                        className={`${inputClasses} pr-10`}
                    />
                    <button 
                        type="button" 
                        onClick={() => setPinVisible(!pinVisible)} 
                        className="absolute inset-y-0 right-0 px-3 flex items-center"
                        aria-label={pinVisible ? "Hide PIN" : "Show PIN"}
                    >
                        {pinVisible ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded-full font-semibold hover:bg-blue-700 transition disabled:bg-blue-400 flex items-center justify-center">
                    {loading ? <Spinner /> : 'Verify'}
                </button>
            </form>
            
            <div className="border-t border-white/20 mt-6 pt-4">
                <button
                    className="flex justify-between items-center w-full py-2 text-left text-white"
                    onClick={() => setGuideOpen(!guideOpen)}
                    aria-expanded={guideOpen}
                >
                    <span className="flex items-center text-md font-semibold">
                        <span className="mr-3 text-blue-300">
                           <QuestionMarkCircleIcon className="h-6 w-6" />
                        </span>
                        How to Register
                    </span>
                    <ChevronDownIcon className={`h-6 w-6 text-blue-300 transform transition-transform ${guideOpen ? 'rotate-180' : ''}`} />
                </button>
                <div
                    className={`grid transition-all duration-300 ease-in-out ${guideOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                >
                    <div className="overflow-hidden">
                        <div className="text-gray-200 pt-3 pb-2 pl-12 text-sm">
                            <ul className="list-disc space-y-2 pl-4">
                                <li>
                                    To create an account, you must have a valid <strong>Student ID</strong> and a unique <strong>PIN</strong> provided by the administration.
                                </li>
                                <li>
                                    After successful verification, you'll complete a form with your full name, email, and a secure password.
                                </li>
                                <li>
                                    Finally, click the confirmation link sent to your email to activate your account before you can sign in.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <p className="text-center mt-4 text-gray-200">
                Already have an account? <button onClick={() => switchMode('signIn')} className="text-blue-300 hover:text-white font-semibold">Sign In</button>
            </p>
        </div>
    );
    
    const renderSignUpStep2 = () => (
        <div className="w-full">
            <h2 className="text-3xl font-bold text-center text-white mb-2">Create Your Account</h2>
            <p className="text-center text-gray-200 mb-8">Verification successful! Please complete your registration.</p>
            <form onSubmit={handleSignUp} className="space-y-6">
                <div className="relative">
                    <UserIcon />
                    <input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} required className={inputClasses} />
                </div>
                <div className="relative">
                    <AtIcon />
                    <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required className={inputClasses} />
                </div>
                <div>
                    <div className="relative">
                        <LockIcon />
                        <input 
                            type={passwordVisible ? 'text' : 'password'} 
                            placeholder="Create Password" 
                            value={password} 
                            onChange={handlePasswordChange}
                            required 
                            className={`${inputClasses} pr-10`}
                        />
                        <button 
                            type="button" 
                            onClick={() => setPasswordVisible(!passwordVisible)} 
                            className="absolute inset-y-0 right-0 px-3 flex items-center"
                            aria-label={passwordVisible ? "Hide password" : "Show password"}
                        >
                            {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                    </div>

                    {password && (
                        <div className="mt-2">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium text-gray-100">Password Strength:</span>
                                <span className={`text-sm font-bold ${
                                    passwordStrength.score <= 2 ? 'text-red-300' :
                                    passwordStrength.score <= 4 ? 'text-yellow-300' : 'text-green-300'
                                }`}>{passwordStrength.text}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`${passwordStrength.color} h-2 rounded-full transition-all duration-300`}
                                    style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>

                {password && passwordStrength.score <= 2 && (
                    <div className="text-center">
                        {!suggestedPassword ? (
                            <button
                                type="button"
                                onClick={generateStrongPassword}
                                className="text-sm text-blue-300 hover:text-white font-semibold"
                            >
                                Suggest a strong password?
                            </button>
                        ) : (
                            <div className="bg-black/20 p-3 rounded-xl border border-white/20">
                                <p className="text-sm text-gray-200">Suggested password:</p>
                                <div className="font-mono bg-black/30 my-2 p-2 rounded text-center break-all text-white">{suggestedPassword}</div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPassword(suggestedPassword);
                                        setPasswordStrength(checkPasswordStrength(suggestedPassword));
                                        setSuggestedPassword('');
                                    }}
                                    className="w-full bg-blue-500/50 text-white p-2 rounded-full text-sm font-semibold hover:bg-blue-500/80 transition"
                                >
                                    Use this password
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
                <div className="bg-amber-500/20 border border-amber-400/50 text-amber-100 px-4 py-3 rounded-xl flex items-start" role="alert">
                    <WarningIcon />
                    <span className="block sm:inline text-sm">
                        Please remember your password. For your security, it cannot be recovered.
                    </span>
                </div>

                {/* Terms and Conditions Checkbox */}
                <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl border border-white/20">
                    <input 
                        type="checkbox" 
                        id="terms" 
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-200 cursor-pointer select-none">
                        I agree to the <button type="button" onClick={() => setShowTermsModal(true)} className="text-blue-300 hover:text-white underline font-medium">Terms and Conditions</button>
                    </label>
                </div>

                 <button 
                    type="submit" 
                    disabled={loading || !agreedToTerms} 
                    className="w-full bg-blue-600 text-white p-3 rounded-full font-semibold hover:bg-blue-700 transition disabled:bg-blue-400/50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {loading ? <Spinner /> : 'Register Account'}
                </button>
            </form>
             <p className="text-center mt-6 text-gray-200">
                Wrong step? <button onClick={() => switchMode('signIn')} className="text-blue-300 hover:text-white font-semibold">Back to Sign In</button>
            </p>
        </div>
    );

    const renderAwaitingConfirmation = () => (
        <div className="w-full text-center">
            <MailIcon />
            <h2 className="text-3xl font-bold text-center text-white my-4">Confirm Your Email</h2>
            <p className="text-center text-gray-200 mb-8 px-4">
                We've sent a confirmation link to <strong className="text-gray-100">{email}</strong>.
                <br />
                Please check your inbox and click the link to activate your account.
            </p>
            <p className="text-sm text-gray-300">This page can be closed.</p>
            <p className="text-center mt-8 text-gray-200">
                <button onClick={() => switchMode('signIn')} className="text-blue-300 hover:text-white font-semibold">Back to Sign In</button>
            </p>
        </div>
    );
    
    const renderForgotPassword = () => (
        <div className="w-full">
            <h2 className="text-3xl font-bold text-center text-white mb-2">Reset Password</h2>
            <p className="text-center text-gray-200 mb-8">Enter your email to receive a password reset link.</p>
            <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="relative">
                    <AtIcon />
                    <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required className={inputClasses} />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white p-3 rounded-full font-semibold hover:bg-blue-700 transition disabled:bg-blue-400 flex items-center justify-center">
                    {loading ? <Spinner /> : 'Send Reset Link'}
                </button>
            </form>
            <p className="text-center mt-6 text-gray-200">
                Remembered your password? <button onClick={() => switchMode('signIn')} className="text-blue-300 hover:text-white font-semibold">Sign In</button>
            </p>
        </div>
    );
    
    const renderResetPasswordConfirmation = () => (
        <div className="w-full text-center">
            <MailIcon />
            <h2 className="text-3xl font-bold text-center text-white my-4">Check Your Email</h2>
            <p className="text-center text-gray-200 mb-8 px-4">
                We've sent a password reset link to <strong className="text-gray-100">{email}</strong>.
                <br />
                Please follow the instructions in the email to reset your password.
            </p>
            <p className="text-center mt-8 text-gray-200">
                <button onClick={() => switchMode('signIn')} className="text-blue-300 hover:text-white font-semibold">Back to Sign In</button>
            </p>
        </div>
    );


    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            {showTermsModal && <TermsModal onClose={() => setShowTermsModal(false)} />}
            
            <div className="w-full max-w-md bg-white/20 backdrop-blur-md rounded-2xl shadow-xl p-8 space-y-4 border border-white/30">
                {error && <div className="bg-red-500/40 border border-red-500 text-white px-4 py-3 rounded-xl" role="alert">{error}</div>}
                {message && <div className="bg-green-500/40 border border-green-500 text-white px-4 py-3 rounded-xl" role="alert">{message}</div>}

                {mode === 'signIn' && renderSignIn()}
                {mode === 'signUp_step1' && renderSignUpStep1()}
                {mode === 'signUp_step2' && renderSignUpStep2()}
                {mode === 'awaitingConfirmation' && renderAwaitingConfirmation()}
                {mode === 'forgotPassword' && renderForgotPassword()}
                {mode === 'resetPasswordConfirmation' && renderResetPasswordConfirmation()}
            </div>
        </div>
    );
};

export default Auth;
