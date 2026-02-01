
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Credentials from Desktop App (SUPABASE_SETUP.md)
// Ideally these should be in .env, but for now we hardcode to match the user's setup flow
const SUPABASE_URL = 'https://vmlouzwnwpdjygvwvben.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbG91endud3Bkanlndnd2YmVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MzYxMDQsImV4cCI6MjA4NDAxMjEwNH0.RYTugFC0wu-elQGOvY7435Tls8FgbgZ4j-q-UOs4kJY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
