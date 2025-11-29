
import React, { useState } from 'react';
import { CheckIcon, ClipboardIcon, ExternalLinkIcon } from './Icons';

const GuideLink: React.FC<{ href: string, children: React.ReactNode }> = ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center font-semibold text-blue-600 hover:text-blue-800 hover:underline">
        {children}
        <ExternalLinkIcon className="h-4 w-4 ml-1" />
    </a>
);

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={handleCopy} className="ml-2 px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 flex items-center">
            {copied ? <CheckIcon className="h-4 w-4 text-green-600" /> : <ClipboardIcon className="h-4 w-4" />}
            <span className="ml-1">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
    );
};


const EmailSetupGuide: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const setupCmd = `npx supabase secrets set RESEND_API_KEY=re_6j9pd6J4_CWvisYDKDQzuhLCNvxu9JzNf`;
    const functionCode = `import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const handler = async (request: Request): Promise<Response> => {
  // CORS headers
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: { 
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }})
  }

  const { to, subject, html } = await request.json()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${RESEND_API_KEY}\`,
    },
    body: JSON.stringify({
      from: 'BseePortal <onboarding@resend.dev>', // Or your verified domain
      to: to,
      subject: subject,
      html: html,
    }),
  })

  const data = await res.json()

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

serve(handler)`;

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 transition-opacity" 
            aria-modal="true" 
            role="dialog"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-xl w-full max-w-4xl relative animate-fade-in-up max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-5 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
                    <h2 className="text-xl font-bold text-gray-900">Setup Email Function (Required)</h2>
                     <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">&times;</button>
                </div>
                <div className="p-6 prose prose-blue max-w-none overflow-y-auto text-gray-700">
                    <p className="lead">
                        Since you have provided a <strong>Resend API Key</strong>, you must set up a secure server-side function to handle email sending. This prevents your API key from being exposed to the public.
                    </p>
                    
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 my-4">
                        <p className="text-sm text-amber-800 font-medium">
                            You must run these commands in your local terminal where your Supabase project is initialized.
                        </p>
                    </div>

                    <h3>Step 1: Set your Secret Key</h3>
                    <p>Run this command to securely store your Resend API key in your Supabase project.</p>
                    <div className="bg-gray-800 text-gray-200 p-3 rounded-md font-mono text-sm overflow-x-auto flex justify-between items-center">
                        <code>{setupCmd}</code>
                        <CopyButton text={setupCmd} />
                    </div>

                    <h3>Step 2: Create the Function File</h3>
                    <p>Create a new file at <code>supabase/functions/send-email/index.ts</code> and paste the following code:</p>
                    <div className="relative">
                        <div className="absolute top-2 right-2">
                            <CopyButton text={functionCode} />
                        </div>
                        <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-xs">
                            <code>{functionCode}</code>
                        </pre>
                    </div>

                    <h3>Step 3: Deploy the Function</h3>
                    <p>Finally, deploy the function to the cloud so the app can use it.</p>
                     <div className="bg-gray-800 text-gray-200 p-3 rounded-md font-mono text-sm overflow-x-auto flex justify-between items-center">
                        <code>npx supabase functions deploy send-email --no-verify-jwt</code>
                        <CopyButton text="npx supabase functions deploy send-email --no-verify-jwt" />
                    </div>
                    
                    <p className="text-sm text-gray-500 mt-4">
                        Note: The <code>--no-verify-jwt</code> flag is optional but useful for testing if you encounter permission issues. Ideally, remove it for production and send the user's session token.
                    </p>

                </div>
                 <div className="flex justify-end items-center p-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl sticky bottom-0 z-10">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
                        I've Deployed the Function
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailSetupGuide;
