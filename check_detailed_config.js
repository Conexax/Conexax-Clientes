
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.server' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConfig() {
    const { data: setting, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('key', 'asaas_config')
        .single();

    if (error) {
        console.error('Error fetching config:', error);
        return;
    }

    console.log('Asaas Config:', JSON.stringify(setting.value, null, 2));
}

checkConfig();
