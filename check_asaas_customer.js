
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.server' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAsaas() {
    try {
        const { data: setting, error } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'asaas_config')
            .single();

        if (error || !setting) {
            console.error('Asaas config not found in DB');
            return;
        }

        const config = setting.value;
        const apiKey = config.api_key;
        const environment = config.environment;
        const baseURL = (environment === 'production') ? 'https://www.asaas.com/api/v3' : 'https://sandbox.asaas.com/api/v3';

        const client = axios.create({
            baseURL,
            headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
        });

        const email = 'yuri@conexax.com.br';
        console.log(`Checking Asaas for email: ${email} in ${environment}...`);

        const res = await client.get('/customers', { params: { email } });
        if (res.data && res.data.data && res.data.data.length > 0) {
            console.log('Customer found in Asaas:', res.data.data[0].id);
        } else {
            console.log('Customer not found in Asaas.');
        }
    } catch (e) {
        console.error('Asaas API Error:', e.response?.data || e.message);
    }
}

checkAsaas();
