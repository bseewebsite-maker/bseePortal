import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './services';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { Spinner } from './components/Spinner';

const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setPasswordResetSuccess(true);
            }
            setSession(session);
            setLoading(false);
        });
        
        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
          setLoading(false);
        });


        // Clean up the subscription when the component unmounts
        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-500 to-purple-600">
                <Spinner className="text-white h-8 w-8" />
            </div>
        );
    }
    
    return (
        <div>
            {!session ? <Auth /> : (
                <Dashboard 
                    key={session.user.id} 
                    session={session} 
                    initialMessage={passwordResetSuccess ? "Your password has been successfully reset. Welcome back!" : null}
                />
            )}
        </div>
    );
};

export default App;