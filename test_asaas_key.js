
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.server' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testKey() {
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

        console.log(`Testing API Key: "${apiKey.substring(0, 15)}..." on ${environment}`);

        try {
            const res = await axios.get(`${baseURL}/customers?limit=1`, {
                headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
            });
            console.log('SUCCESS: API key is valid. Found', res.data.totalCount, 'customers.');
        } catch (err) {
            console.error('FAILED: API key invalid or unauthorized.');
            console.error('Error Status:', err.response?.status);
            console.error('Error Data:', JSON.stringify(err.response?.data, null, 2));
        }

        // Test WITHOUT the $ prefix if it has it
        if (apiKey.startsWith('$')) {
            const cleanKey = apiKey.substring(1);
            console.log(`Testing cleaned API Key: "${cleanKey.substring(0, 15)}..."`);
            try {
                const res = await axios.get(`${baseURL}/customers?limit=1`, {
                    headers: { 'access_token': cleanKey, 'Content-Type': 'application/json' }
                });
                console.log('SUCCESS with Cleaned Key!');
            } catch (err) {
                console.error('FAILED even with cleaned key.');
            }
        }

    } catch (e) {
        console.error('Script Error:', e.message);
    }
}

testKey();
