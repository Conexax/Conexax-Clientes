
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseKey ? supabaseKey.length : 0);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  try {
    console.log('Attempting to fetch users count...');
    // We try to fetch something public or just check connection. 
    // Depending on RLS, 'users' might be blocked, but we'll see the error.
    // 'plans' is usually public in this app context.
    const { data, error } = await supabase.from('plans').select('*').limit(1);

    if (error) {
        console.error('Supabase Error:', error.message, error.details || '');
    } else {
        console.log('Supabase Connection Successful! Data received:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

verify();
