import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.server' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY
);

async function log() {
    const { data, error } = await supabase.from('webhook_logs').select('*').order('created_at', { ascending: false }).limit(2);
    console.log('Webhook Logs:', JSON.stringify(data, null, 2));
    if (error) console.error(error);
}

log();
