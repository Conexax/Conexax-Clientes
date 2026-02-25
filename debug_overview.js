import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.server' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const db = createClient(supabaseUrl, supabaseKey);

async function testOverview() {
    try {
        let baseQuery = db.from('orders').select('status, raw_status_alias, value, date');
        const { data: orders, error } = await baseQuery.limit(5); // limit to 5 just for test

        if (error) {
            console.error("Supabase Error:", error);
        } else {
            console.log("Success fetched orders data:", orders);
        }
    } catch (err) {
        console.error("Exception:", err);
    }
}

testOverview();
