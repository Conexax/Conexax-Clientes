
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.server' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMapping() {
    const userId = 'a8c474bf-d1e7-400e-bfdc-bee97afbb501';
    const { data: mapping, error } = await supabase
        .from('asaas_customers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching mapping:', error);
        return;
    }

    if (mapping) {
        console.log('Mapping Found:', mapping);
    } else {
        console.log('No mapping found for user:', userId);
    }
}

checkMapping();
