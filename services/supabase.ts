

import { createClient } from '@supabase/supabase-js';

// Supabase project URL and anon key.
const supabaseUrl = 'https://hacgzsximhtznueyokns.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhY2d6c3hpbWh0em51ZXlva25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MjMxODEsImV4cCI6MjA3NjI5OTE4MX0.DCcZjBmL8YgPiGGF-XwiCfCu_YOOdW1DU3X-8dSViu4';

// Create a single Supabase client for interacting with the Supabase backend.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/*
================================================================================
REQUIRED SUPABASE SETUP:

1. Create a new project in your Supabase Dashboard.

2. Go to "Project Settings" -> "API" to find your Project URL and anon key.
   - Replace `supabaseUrl` and `supabaseAnonKey` above with your project's values.

3. Configure your site's URL for authentication redirects.
   - Go to "Authentication" -> "URL Configuration".
   - Set the "Site URL" to your application's deployment URL. For this
     AI Studio project, it is: `https://bseeportal.aistudio.google.com`

4. Run the setup script in the Supabase SQL Editor.
   - Go to the "SQL Editor" in your Supabase project.
   - Click "+ New query".
   - Copy the entire content of the `supabase/setup.sql` file from this project
     and paste it into the editor.
   - Click "RUN" to create the necessary tables and functions.

5. For detailed setup instructions for Firestore, see `services/firebase.ts`.

================================================================================
*/