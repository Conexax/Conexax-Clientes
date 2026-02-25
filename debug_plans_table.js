import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);

async function checkColumns() {
    console.log("Checking columns of plans table...");
    // Let's just try to select one of the new columns to see if it exists
    const { data, error } = await supabase.from('plans').select('monthly_price_quarterly').limit(1);
    
    if (error) {
        console.error("Error reading new column:", error);
    } else {
        console.log("Column exists!", data);
    }
}

checkColumns();
