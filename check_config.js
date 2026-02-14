
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.server' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConfig() {
    console.log('Checking platform_settings for asaas_config...');
    const { data, error } = await supabase.from('platform_settings').select('*').eq('key', 'asaas_config').single();

    if (error) {
        console.error('Error fetching config:', error);
    } else {
        console.log('Found config:', data);
        if (data && data.value) {
            console.log('API Key in DB:', data.value.api_key ? data.value.api_key.substring(0, 15) + '...' : 'None');
            console.log('Environment in DB:', data.value.environment);
        }
    }
}

checkConfig();
