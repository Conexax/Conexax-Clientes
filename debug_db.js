
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.server' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAccess() {
    console.log('Testing access with key:', supabaseKey?.substring(0, 10) + '...');

    try {
        console.log('Fetching orders...');
        const { data: orders, error: ordersError } = await supabase.from('orders').select('*').limit(1);
        if (ordersError) console.error('Orders Error:', ordersError);
        else console.log('Orders Data:', orders);
    } catch (e) { console.error('Orders Exception:', e); }

    try {
        console.log('Fetching subscriptions...');
        const { data: subs, error: subsError } = await supabase.from('subscriptions').select('*').limit(1);
        if (subsError) console.error('Subs Error:', subsError);
        else console.log('Subs Data:', subs);
    } catch (e) { console.error('Subs Exception:', e); }

    try {
        console.log('Fetching plans...');
        const { data: plans, error: plansError } = await supabase.from('plans').select('*').limit(1);
        if (plansError) console.error('Plans Error:', plansError);
        else console.log('Plans Data:', plans);
    } catch (e) { console.error('Plans Exception:', e); }
}

testAccess();
