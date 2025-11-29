
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import { User } from '@supabase/supabase-js';
import { db, firestore } from '../services';
import { Profile } from '../types';
import { Spinner } from './Spinner';
import ConfirmationModal from './ConfirmationModal';
import { 
    SparklesIcon, 
    CodeBracketIcon, 
    PhotoIcon, 
    XIcon, 
    ChevronDownIcon, 
    DownloadIcon, 
    ClipboardIcon, 
    PaperAirplaneIcon,
    TrashIcon,
    CheckIcon,
    ShieldCheckIcon,
    LockClosedIcon,
    GlobeIcon
} from './Icons';

interface AiAssistantPageProps {
    user: User;
    profile: Profile;
    onBack: () => void;
}

interface Message {
    id: string;
    role: 'user' | 'model';
    text?: string;
    image?: string;
    timestamp: Date;
}

// --- Terms & Conditions Modal ---
const TermsModal: React.FC<{ onAgree: () => void; onDecline: () => void }> = ({ onAgree, onDecline }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                        <ShieldCheckIcon className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI Terms of Service</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Please review before continuing.</p>
                    </div>
                </div>
                
                <div className="p-6 overflow-y-auto text-sm text-gray-600 dark:text-gray-300 space-y-4 leading-relaxed">
                    <p className="font-semibold text-gray-900 dark:text-white">
                        By using the Bsee Assistant, you agree to the collection and processing of your data as described below:
                    </p>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 space-y-3">
                        <div className="flex gap-3">
                            <GlobeIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase mb-1">Third-Party Processing</h4>
                                <p>Your messages and prompts are sent to <strong className="text-blue-700 dark:text-blue-400">Google Gemini AI</strong> for processing. Do not share sensitive personal information (passwords, financial data) in your chats.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <LockClosedIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase mb-1">Data Storage</h4>
                                <p>Your conversation history is securely stored in our database to provide context for future interactions. You can clear this history at any time using the "Clear History" button.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <SparklesIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-xs uppercase mb-1">Accuracy Disclaimer</h4>
                                <p>AI responses may occasionally be inaccurate. Please verify important information, especially regarding academic deadlines or financial records.</p>
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-gray-500">
                        By clicking "I Agree", you acknowledge that you have read and understood these terms.
                    </p>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
                    <button 
                        onClick={onDecline}
                        className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                    >
                        Decline & Exit
                    </button>
                    <button 
                        onClick={onAgree}
                        className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95 flex items-center"
                    >
                        I Agree <CheckIcon className="h-4 w-4 ml-2" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const AiAssistantPage: React.FC<AiAssistantPageProps> = ({ user, profile, onBack }) => {
    // Check Consent State using Firestore
    const [hasAgreedToTerms, setHasAgreedToTerms] = useState<boolean | null>(null);

    // Memoize welcome message to prevent recreation on every render
    const welcomeMessage = useMemo<Message>(() => ({ 
        id: 'welcome', 
        role: 'model', 
        text: `Hi ${profile.full_name}! I'm your Bsee Assistant. \n\nI can help you with:\n• Checking attendance & funds\n• Generating code sketches\n• Creating images\n• Generating downloadable reports (PDF, Excel, etc.)\n\nWhat's on your mind?`, 
        timestamp: new Date() 
    }), [profile.full_name]);

    const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [mode, setMode] = useState<'chat' | 'canvas'>('chat');
    const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview');
    
    const [generatedCode, setGeneratedCode] = useState('');
    const [isImageMode, setIsImageMode] = useState(false);

    const [aiAvatar, setAiAvatar] = useState<string | null>(() => {
        try { return localStorage.getItem('bsee_ai_avatar'); } catch { return null; }
    });
    const generatingAvatarRef = useRef(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);

    // Copy State
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

    // Context Data
    const [contextData, setContextData] = useState({ attendance: '', funds: '' });

    const suggestions = [
        "Check my attendance summary",
        "List my unpaid fees",
        "Generate a PDF report of my funds",
        "Help me write an excuse letter",
        "Sketch a modern student profile card",
        "What is the status of the Ulikdanay collection?"
    ];

    // --- Terms Check (Firestore) ---
    useEffect(() => {
        const unsubscribe = db.collection('profiles').doc(user.id).onSnapshot(doc => {
            if (doc.exists) {
                setHasAgreedToTerms(doc.data()?.terms_accepted_ai === true);
            } else {
                setHasAgreedToTerms(false);
            }
        });
        return () => unsubscribe();
    }, [user.id]);

    // --- Terms Handling ---
    const handleAgreeTerms = async () => {
        try {
            await db.collection('profiles').doc(user.id).set({
                terms_accepted_ai: true
            }, { merge: true });
            // Also update Supabase
            // Note: We use firestore primarily for app logic but sync to Supabase is good practice
            // await supabase.from('profiles').update({ terms_accepted_ai: true }).eq('id', user.id);
            setHasAgreedToTerms(true);
        } catch (error) {
            console.error("Error accepting AI terms:", error);
            alert("Failed to save consent. Please check your connection.");
        }
    };

    // --- History Persistence Logic ---

    // Helper to convert Firestore timestamp to Date
    const convertTimestamp = (ts: any): Date => {
        if (ts?.toDate) return ts.toDate();
        if (ts instanceof Date) return ts;
        return new Date(ts || Date.now());
    };

    // Load history on mount (only if agreed)
    useEffect(() => {
        if (!hasAgreedToTerms) return;

        const loadHistory = async () => {
            try {
                const doc = await db.collection('ai_conversations').doc(user.id).get();
                if (doc.exists) {
                    const data = doc.data();
                    if (data && Array.isArray(data.messages)) {
                        const loadedMessages = data.messages.map((m: any) => ({
                            ...m,
                            timestamp: convertTimestamp(m.timestamp)
                        }));
                        // If history is cleared (empty array), show welcome.
                        if (loadedMessages.length === 0) {
                             setMessages([welcomeMessage]);
                        } else {
                             setMessages(loadedMessages);
                        }
                        return; // History loaded
                    }
                }
                // No history found, set welcome message
                setMessages([welcomeMessage]);
            } catch (error) {
                console.error("Error loading AI history:", error);
                setMessages([welcomeMessage]);
            }
        };
        loadHistory();
    }, [user.id, welcomeMessage, hasAgreedToTerms]);

    // Save history to Firestore
    const saveHistory = async (newMessages: Message[]) => {
        // We return the promise here so errors can be caught by the caller (e.g. handleClearHistory)
        return db.collection('ai_conversations').doc(user.id).set({
            userId: user.id,
            updatedAt: firestore.FieldValue.serverTimestamp(),
            messages: newMessages
        });
    };

    const confirmClearHistory = async () => {
        setIsClearing(true);
        try {
            // Optimistic UI update: Clear messages immediately
            const freshWelcome = { ...welcomeMessage, timestamp: new Date() };
            setMessages([freshWelcome]);
            
            // Try to delete the document completely first
            await db.collection('ai_conversations').doc(user.id).delete();
        } catch (error) {
            console.warn("Delete failed, attempting to overwrite with empty history...", error);
            // Fallback: If delete fails (e.g., permissions), overwrite with empty array
            try {
                await saveHistory([]); 
            } catch (secondError) {
                console.error("Error clearing history:", secondError);
                alert("Failed to clear history. Please check your connection.");
            }
        } finally {
            setIsClearing(false);
            setIsDeleteModalOpen(false);
        }
    };

    // --- End History Persistence Logic ---

    useEffect(() => {
        if (!hasAgreedToTerms) return;
        
        if (!aiAvatar && !generatingAvatarRef.current) {
            const apiKey = process.env.API_KEY;
            if (!apiKey) return;

            generatingAvatarRef.current = true;
            const ai = new GoogleGenAI({ apiKey });
            ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: 'A friendly, cute, futuristic robot head avatar, 3D render, glossy finish. Primary colors: Electric Blue (#2563eb) and Purple (#9333ea). White background. Rounded square shape. Minimalist icon style.' }] }
            }).then(response => {
                const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (part?.inlineData) {
                    const url = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                    setAiAvatar(url);
                    localStorage.setItem('bsee_ai_avatar', url);
                }
            }).catch(console.error).finally(() => { generatingAvatarRef.current = false; });
        }
    }, [aiAvatar, hasAgreedToTerms]);

    useEffect(() => {
        if (!hasAgreedToTerms) return;

        const fetchData = async () => {
            try {
                const attSnap = await db.collection('attendance').where('userId', '==', user.id).get();
                const stats = { Present: 0, Absent: 0, Late: 0 };
                attSnap.docs.forEach(doc => {
                    const s = doc.data().status as keyof typeof stats;
                    if (stats[s] !== undefined) stats[s]++;
                });
                
                const fundsSnap = await db.collection('student_funds').doc(profile.student_id).collection('collections').get();
                let paid = 0, unpaid = 0;
                fundsSnap.docs.forEach(doc => doc.data().status === 'Paid' ? paid++ : unpaid++);
                
                setContextData({
                    attendance: `Attendance: ${stats.Present} Present, ${stats.Absent} Absent, ${stats.Late} Late.`,
                    funds: `Funds: ${paid} Paid, ${unpaid} Unpaid/Partial.`
                });
            } catch (e) { console.error(e); }
        };
        fetchData();
    }, [user.id, profile.student_id, hasAgreedToTerms]);

    useEffect(() => { scrollToBottom(); }, [messages, loading]);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            setShowScrollButton(scrollHeight - scrollTop - clientHeight > 150);
        }
    };

    const extractCode = (text: string) => {
        const match = text.match(/```(?:html|css|js|javascript|xml|typescript)?\s*([\s\S]*?)```/i);
        return match ? match[1].trim() : null;
    };

    const handleSuggestionClick = (suggestion: string) => {
        setInput(suggestion);
        // Optionally set focus to input
        const inputEl = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (inputEl) inputEl.focus();
    };

    const handleCopyText = async (text: string, id: string) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopiedMessageId(id);
            setTimeout(() => setCopiedMessageId(null), 2000);
        } catch (err) {
            console.warn("Navigator clipboard failed, using fallback", err);
            const textArea = document.createElement("textarea");
            textArea.value = text;
            // Place in top-left corner of screen regardless of scroll position.
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setCopiedMessageId(id);
                setTimeout(() => setCopiedMessageId(null), 2000);
            } catch (e) {
                console.error("Fallback copy failed", e);
            }
            document.body.removeChild(textArea);
        }
    };

    const handleSend = async (e?: React.FormEvent, overrideText?: string) => {
        if (e) e.preventDefault();
        
        const userText = overrideText || input.trim();
        if (!userText) return;

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            alert("AI functionality is currently unavailable (Missing API Key).");
            return;
        }

        const ai = new GoogleGenAI({ apiKey });

        const newUserMsg: Message = { id: Date.now().toString(), role: 'user', text: userText, timestamp: new Date() };
        
        const updatedHistory = [...messages, newUserMsg];
        setMessages(updatedHistory);
        
        // Fire and forget save for user message to avoid UI lag
        saveHistory(updatedHistory).catch(err => console.error("Failed to save user message:", err));

        if (!overrideText) setInput('');
        setLoading(true);

        try {
            const lowerInput = userText.toLowerCase();
            
            if (isImageMode || lowerInput.startsWith('generate image') || lowerInput.startsWith('draw')) {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [{ text: userText }] }
                });
                
                const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (part?.inlineData) {
                    const aiMsg: Message = { 
                        id: Date.now().toString(), 
                        role: 'model', 
                        image: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
                        timestamp: new Date()
                    };
                    const historyWithImage = [...updatedHistory, aiMsg];
                    setMessages(historyWithImage);
                    await saveHistory(historyWithImage);
                } else {
                    throw new Error("No image generated");
                }
            } else {
                const systemPrompt = `
                    You are BseeBot, an intelligent assistant for the BseePortal.
                    User: ${profile.full_name} (${profile.role}, ID: ${profile.student_id}).
                    Context: ${contextData.attendance} ${contextData.funds}
                    
                    Capabilities:
                    1. Answer questions about the app or user stats.
                    2. Write code sketches. IMPORTANT: When asked for a sketch, UI, or code, provide a SINGLE, COMPLETE, RUNNABLE HTML block containing embedded CSS (<style>) and JS (<script>). Do not split it. Ensure it looks modern and correct.
                    3. **FILE GENERATION & DOWNLOADS**: 
                       - If the user asks to download data (e.g., "Download my attendance as PDF", "Give me an Excel file of funds"), you MUST generate a runnable HTML/JS "Code Sketch" (Capability #2) that acts as a download tool.
                       - **DO NOT** simply textually list the data.
                       - The generated code MUST use client-side libraries via CDN to create the file.
                         - PDF: <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
                         - Excel (XLSX): <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
                         - Word (DOCX): Create a simplified HTML-based .doc Blob or use a specific library if known.
                       - The UI of the code sketch must show a preview of the data and a large, styled "Download [Format]" button that triggers the JS download logic.
                    4. Be concise, friendly, and helpful.
                `;

                const history = messages.filter(m => m.text && m.id !== 'welcome').map(m => ({
                    role: m.role,
                    parts: [{ text: m.text as string }]
                }));

                const chat = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: { systemInstruction: systemPrompt },
                    history: history
                });

                const result = await chat.sendMessage({ message: userText });
                const responseText = result.text || "I couldn't generate a response.";
                const code = extractCode(responseText);

                if (code) {
                    setGeneratedCode(code);
                    setMode('canvas');
                    setActiveTab('preview');
                }

                const aiMsg: Message = { id: Date.now().toString(), role: 'model', text: responseText, timestamp: new Date() };
                const finalHistory = [...updatedHistory, aiMsg];
                setMessages(finalHistory);
                await saveHistory(finalHistory);
            }
        } catch (err) {
            const errorMsg: Message = { id: Date.now().toString(), role: 'model', text: "Sorry, something went wrong. Please try again.", timestamp: new Date() };
            const errorHistory = [...updatedHistory, errorMsg];
            setMessages(errorHistory);
            saveHistory(errorHistory).catch(e => console.error("Failed to save error message:", e));
        } finally {
            setLoading(false);
            setIsImageMode(false);
        }
    };

    // --- File Download Logic (For saving the Sketch code itself) ---
    const handleDownloadCode = () => {
        const blob = new Blob([generatedCode], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BseeSketch_${new Date().toISOString().slice(0,10)}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleCopyCode = () => {
        handleCopyText(generatedCode, 'canvas-copy-btn');
    };

    if (loading && hasAgreedToTerms === null) {
        return (
            <div className="flex h-full items-center justify-center bg-gray-100 p-4">
                <Spinner className="text-blue-600 h-10 w-10" />
            </div>
        );
    }

    if (hasAgreedToTerms === false) {
        return (
            <div className="flex h-full items-center justify-center bg-gray-100 p-4">
                <TermsModal onAgree={handleAgreeTerms} onDecline={onBack} />
                {/* Fallback background if modal fails to render or for aesthetic */}
                <div className="text-center text-gray-400">
                    <SparklesIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p>Waiting for consent...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row h-full bg-gray-100 text-gray-900 overflow-hidden md:rounded-2xl md:shadow-xl border-t md:border border-gray-200">
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmClearHistory}
                title="Clear Conversation"
                message="Are you sure you want to clear your conversation history? This action cannot be undone."
                confirmButtonText="Clear History"
                isConfirming={isClearing}
            />

            {/* Chat Section */}
            <div className={`flex-1 flex flex-col bg-white relative min-h-0 transition-all duration-300 ${mode === 'canvas' ? 'hidden md:flex md:w-1/3 md:border-r border-gray-200' : 'w-full'}`}>
                
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 flex justify-between items-center z-20 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="md:hidden p-1 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full"><XIcon className="h-6 w-6" /></button>
                        <div className="relative">
                            {aiAvatar ? (
                                <img src={aiAvatar} alt="AI" className="h-9 w-9 rounded-full object-cover shadow-sm ring-2 ring-white" />
                            ) : (
                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                                    <SparklesIcon className="h-5 w-5 text-white" />
                                </div>
                            )}
                            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-800 text-sm leading-tight">Bsee Assistant</h2>
                            <p className="text-[10px] text-blue-600 font-medium">Online • GenAI</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                        {/* Clear History Button */}
                        <button
                            type="button"
                            onClick={() => setIsDeleteModalOpen(true)}
                            disabled={isClearing}
                            className={`p-2 rounded-full transition-colors ${isClearing ? 'opacity-50 cursor-not-allowed text-gray-300' : 'text-gray-500 hover:bg-red-50 hover:text-red-500'}`}
                            title="Clear History"
                        >
                            {isClearing ? <Spinner className="h-5 w-5" /> : <TrashIcon className="h-5 w-5" />}
                        </button>

                        <button 
                            onClick={() => setMode(mode === 'chat' ? 'canvas' : 'chat')}
                            className={`p-2 rounded-full transition-colors ${mode === 'canvas' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                            title="Toggle Canvas"
                        >
                            <CodeBracketIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Chat Messages */}
                <div 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-4 space-y-5 bg-gray-50 min-h-0 overscroll-y-contain"
                >
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.role === 'model' && (
                                <div className="mr-2 flex-shrink-0 self-end mb-1">
                                    {aiAvatar ? (
                                        <img src={aiAvatar} className="h-6 w-6 rounded-full object-cover opacity-80" alt="AI" />
                                    ) : (
                                        <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center"><SparklesIcon className="h-3 w-3 text-white" /></div>
                                    )}
                                </div>
                            )}
                            
                            <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-2.5 shadow-sm text-sm leading-relaxed relative group ${
                                    msg.role === 'user' 
                                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl rounded-br-sm' 
                                        : 'bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-bl-sm pr-12'
                                }`}>
                                    {msg.role === 'model' && !msg.image && (
                                        <button
                                            onClick={() => handleCopyText(msg.text || '', msg.id)}
                                            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all z-10"
                                            title="Copy message"
                                        >
                                            {copiedMessageId === msg.id ? <CheckIcon className="h-3.5 w-3.5 text-green-500" /> : <ClipboardIcon className="h-3.5 w-3.5" />}
                                        </button>
                                    )}

                                    {msg.image ? (
                                        <div className="rounded-lg overflow-hidden my-1">
                                            <img src={msg.image} alt="Generated" className="max-w-full h-auto" />
                                        </div>
                                    ) : (
                                        <div className="whitespace-pre-wrap markdown-body">
                                            {msg.text?.split('```').map((part, i) => {
                                                if (i % 2 === 1) {
                                                    const codeId = `code-${msg.id}-${i}`;
                                                    return (
                                                        <div key={i} className="my-2 rounded-md overflow-hidden border border-gray-200 bg-gray-900">
                                                            <div className="flex justify-between items-center px-3 py-1.5 bg-gray-800">
                                                                <span className="text-xs text-gray-400 font-mono">Code</span>
                                                                <div className="flex items-center gap-2">
                                                                    <button 
                                                                        onClick={() => handleCopyText(part, codeId)} 
                                                                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                                                                        title="Copy code"
                                                                    >
                                                                         {copiedMessageId === codeId ? <CheckIcon className="h-3 w-3 text-green-400" /> : <ClipboardIcon className="h-3 w-3" />}
                                                                         {copiedMessageId === codeId ? 'Copied' : 'Copy'}
                                                                    </button>
                                                                    <button onClick={() => { setGeneratedCode(part); setMode('canvas'); setActiveTab('code'); }} className="text-xs text-blue-400 hover:underline">Open in Canvas</button>
                                                                </div>
                                                            </div>
                                                            <pre className="p-3 overflow-x-auto text-xs text-gray-300 font-mono">
                                                                <code>{part}</code>
                                                            </pre>
                                                        </div>
                                                    );
                                                }
                                                return <span key={i}>{part}</span>;
                                            })}
                                        </div>
                                    )}
                                    <div className={`text-[10px] mt-1 text-right opacity-0 group-hover:opacity-70 transition-opacity ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                                        {msg.timestamp.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {loading && (
                        <div className="flex justify-start animate-pulse">
                            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center space-x-2 ml-8">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {showScrollButton && (
                    <button onClick={scrollToBottom} className="absolute bottom-24 right-6 p-2 bg-white rounded-full shadow-lg border border-gray-100 text-blue-600 z-20 hover:bg-gray-50"><ChevronDownIcon className="h-5 w-5" /></button>
                )}

                {/* Suggestions Bar */}
                <div className="px-4 py-2 bg-white border-t border-gray-50 overflow-x-auto flex gap-2 no-scrollbar">
                     {suggestions.map((s, i) => (
                         <button 
                            key={i}
                            onClick={() => handleSuggestionClick(s)}
                            className="flex-shrink-0 px-3 py-1.5 bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 text-xs rounded-full border border-gray-200 hover:border-blue-200 transition-all whitespace-nowrap"
                         >
                            {s}
                         </button>
                     ))}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <form onSubmit={handleSend} className="flex items-end gap-2 relative">
                        <button 
                            type="button" 
                            onClick={() => setIsImageMode(!isImageMode)}
                            className={`p-2.5 rounded-full transition-all ${isImageMode ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                            title="Generate Image"
                        >
                            <PhotoIcon className="h-5 w-5" />
                        </button>
                        
                        <div className="flex-1 bg-gray-100 rounded-2xl flex items-center px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:bg-white transition-all border border-transparent focus-within:border-blue-200">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={isImageMode ? "Describe the image you want..." : "Message Bsee Assistant..."}
                                className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-sm py-1"
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={!input.trim() || loading}
                            className={`p-2.5 rounded-full shadow-md transition-all transform hover:scale-105 active:scale-95 ${
                                !input.trim() ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            <PaperAirplaneIcon className="h-5 w-5 transform rotate-90 ml-0.5" />
                        </button>
                    </form>
                </div>
            </div>

            {/* Canvas / Code Section */}
            <div className={`flex-1 flex flex-col bg-[#1e1e1e] transition-all duration-300 ${mode === 'canvas' ? 'flex' : 'hidden'}`}>
                <div className="h-14 bg-[#252526] border-b border-[#333] flex items-center justify-between px-4">
                    <div className="flex space-x-1 bg-[#333] p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('code')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'code' ? 'bg-[#1e1e1e] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Code
                        </button>
                        <button 
                            onClick={() => setActiveTab('preview')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${activeTab === 'preview' ? 'bg-[#1e1e1e] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            Preview
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleCopyCode} className="text-gray-400 hover:text-white p-1.5 rounded-md hover:bg-[#333]" title="Copy Code"><ClipboardIcon className="h-4 w-4" /></button>
                        <button onClick={handleDownloadCode} className="text-gray-400 hover:text-white p-1.5 rounded-md hover:bg-[#333]" title="Download Code"><DownloadIcon className="h-4 w-4" /></button>
                        <button onClick={() => setMode('chat')} className="md:hidden text-gray-400 hover:text-white ml-2"><XIcon className="h-5 w-5" /></button>
                    </div>
                </div>

                <div className="flex-1 relative overflow-hidden">
                    {activeTab === 'code' ? (
                        <textarea
                            value={generatedCode}
                            onChange={(e) => setGeneratedCode(e.target.value)}
                            className="w-full h-full bg-[#1e1e1e] text-[#d4d4d4] p-4 font-mono text-sm outline-none resize-none leading-relaxed"
                            spellCheck={false}
                            placeholder="// Code will appear here..."
                        />
                    ) : (
                        <div className="w-full h-full bg-white">
                            {generatedCode ? (
                                <iframe 
                                    srcDoc={generatedCode}
                                    title="Preview"
                                    className="w-full h-full border-none"
                                    sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin allow-downloads"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50">
                                    <div className="w-16 h-16 mb-4 rounded-xl bg-gray-200 flex items-center justify-center">
                                        <CodeBracketIcon className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <p className="font-medium">No code generated yet</p>
                                    <p className="text-sm opacity-70 mt-1">Ask the assistant to "sketch a login page" or "code a calculator"</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {generatedCode && activeTab === 'preview' && (
                    <div className="absolute bottom-4 right-4">
                        <button 
                            onClick={() => handleSend(undefined, "Refine the current sketch. Improve visual styling, fix bugs, and ensure functionality is robust.")}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg text-xs font-bold flex items-center"
                            title="Request fixes"
                        >
                            <SparklesIcon className="h-3 w-3 mr-2" />
                            Refine Sketch
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AiAssistantPage;
