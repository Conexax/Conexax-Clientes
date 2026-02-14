
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.server' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking orders table schema...');
    const { data, error } = await supabase.from('orders').select('*').limit(1);

    if (error) {
        console.error('Error fetching orders:', error);
    } else {
        if (data && data.length > 0) {
            console.log('Order columns:', Object.keys(data[0]));
        } else {
            console.log('Orders table empty, cannot infer columns from data.');
        }
    }
}

checkSchema();
