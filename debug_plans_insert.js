import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

// Create an authenticated client by mocking a JWT using the anon key (if the app uses a custom auth or standard auth)
// But let's first test if standard auth is used. We will just test if an unauthenticated user gets 42501
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInsert() {
    console.log("Checking insert as anon (this should fail if RLS requires authenticated)...");
    const payload = {
        name: "Test Auth Plan " + Date.now(),
        monthly_price_quarterly: 0
    };

    const { data, error } = await supabase.from('plans').upsert(payload).select().single();

    if (error) {
        console.error("Insert failed:", error);
    } else {
        console.log("Insert success!", data);
    }
}

checkInsert();
