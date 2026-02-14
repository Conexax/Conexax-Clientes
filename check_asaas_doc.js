
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.server' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkDoc() {
    try {
        const { data: setting, error } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'asaas_config')
            .single();

        const apiKey = setting.value.api_key;
        const environment = setting.value.environment;
        const baseURL = (environment === 'production') ? 'https://www.asaas.com/api/v3' : 'https://sandbox.asaas.com/api/v3';

        const doc = '09204026154';
        console.log(`Checking Asaas for CPF/CNPJ: ${doc}...`);

        const res = await axios.get(`${baseURL}/customers`, {
            params: { cpfCnpj: doc },
            headers: { 'access_token': apiKey, 'Content-Type': 'application/json' }
        });

        if (res.data && res.data.data && res.data.data.length > 0) {
            console.log('Customer(s) found with this document:');
            res.data.data.forEach(c => console.log(`- ID: ${c.id} | Email: ${c.email} | Name: ${c.name}`));
        } else {
            console.log('No customer found with this document.');
        }
    } catch (e) {
        console.error('Asaas API Error:', e.response?.data || e.message);
    }
}

checkDoc();
