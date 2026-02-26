import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.server' });
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    const { data, error } = await supabaseAdmin.from('orders').select('date, created_at, value, status').limit(5);
    console.log(data);
}
run();
