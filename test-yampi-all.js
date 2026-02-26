import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.server' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY
);

async function testYampi() {
    const { data: tenants } = await supabase.from('tenants').select('*').not('yampi_token', 'is', null);
    console.log(`Found ${tenants.length} tenants with Yampi tokens`);

    for (const tenant of tenants) {
        if (!tenant.yampi_alias) continue;
        const headers = {
            'Alias': tenant.yampi_alias,
            'User-Token': tenant.yampi_token,
            'User-Secret-Key': tenant.yampi_secret,
            'Content-Type': 'application/json'
        };

        try {
            console.log(`Testing /abandoned-checkouts for ${tenant.yampi_alias}...`);
            const res = await axios.get(`https://api.dooki.com.br/v2/${tenant.yampi_alias}/abandoned-checkouts`, { headers, timeout: 5000 });
            console.log(`SUCCESS [${tenant.yampi_alias}]:`, res.data?.data?.length, 'items');
        } catch (e) {
            console.log(`FAILED [${tenant.yampi_alias}]:`, e.response?.status, e.response?.data?.message || e.message);
        }
    }
}

testYampi();
