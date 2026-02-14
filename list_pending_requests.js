
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.server' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAll() {
    const { data: requests, error } = await supabase
        .from('payment_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching requests:', error);
        return;
    }

    console.log('Payment Requests:');
    requests.forEach(r => {
        console.log(`ID: ${r.id} | UserID: ${r.user_id} | PlanID: ${r.plan_id} | Value: ${r.billing_value} | Status: ${r.status} | Created: ${r.created_at}`);
    });
}

listAll();
