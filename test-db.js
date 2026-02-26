import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.server' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY
);

async function checkDb() {
    const { data, error } = await supabase.from('abandoned_checkouts').select('*').order('created_at', { ascending: false }).limit(5);
    console.log('Abandoned checkouts row count:', data ? data.length : 0);
    console.log(JSON.stringify(data, null, 2));
    if (error) console.error(error);
}

checkDb();
