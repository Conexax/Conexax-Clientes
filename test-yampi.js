import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.server' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY
);

async function testYampi() {
    const { data: tenant } = await supabase.from('tenants').select('*').eq('yampi_alias', 'kairus-camping').single();
    if (!tenant) return console.log('Tenant not found');

    const headers = {
        'Alias': tenant.yampi_alias,
        'User-Token': tenant.yampi_token,
        'User-Secret-Key': tenant.yampi_secret,
        'Content-Type': 'application/json'
    };

    const endpoints = [
        `v1/kairus-camping/checkouts`,
        `v2/kairus-camping/checkouts`,
        `v2/checkouts`
    ];

    for (const ep of endpoints) {
        try {
            console.log(`Testing /${ep}...`);
            const res = await axios.get(`https://api.dooki.com.br/${ep}`, { headers, timeout: 5000 });
            console.log(`SUCCESS /${ep}:`, res.data?.data?.length, 'items');
        } catch (e) {
            console.log(`FAILED /${ep}:`, e.response?.status, e.response?.data?.message || e.message);
        }
    }
}

testYampi();
