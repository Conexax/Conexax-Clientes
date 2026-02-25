import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);

async function checkSchema() {
    console.log("Fetching a plan to see available columns...");
    const { data, error } = await supabase.from('plans').select('*').limit(1);

    if (error) {
        console.error("Error reading:" + error.message);
    } else if (data && data.length > 0) {
        console.log("Columns present in Supabase for 'plans':", Object.keys(data[0]));
    } else {
        console.log("Data is empty. Returning first element keys anyway if possible...", data);
    }
}

checkSchema().catch(console.error);
