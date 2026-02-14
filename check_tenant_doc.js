
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.server' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTenant() {
    const userId = 'a8c474bf-d1e7-400e-bfdc-bee97afbb501';
    const { data: user, error: userError } = await supabase.from('users').select('*, tenants(*)').eq('id', userId).single();

    if (userError) {
        console.error('Error fetching user:', userError);
        return;
    }

    console.log('User:', user.email);
    console.log('Tenant:', user.tenants?.name);
    console.log('Document:', user.tenants?.document);
}

checkTenant();
