import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { YampiSyncService } from './services/yampiSync.js';

dotenv.config({ path: '.env.server' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase Config");
    console.error("Available ENV Keys:", Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log("Fetching tenants with Yampi credentials...");
    const { data: tenants, error } = await supabase.from('tenants').select('*');

    if (error) {
        console.error("Error fetching tenants:", error);
        return;
    }

    const yampiTenants = tenants.filter(t => t.yampi_alias && (t.yampi_token || t.yampi_oauth_access_token));

    if (yampiTenants.length === 0) {
        console.log("No tenants found with Yampi credentials.");
        return;
    }

    console.log(`Found ${yampiTenants.length} tenants with Yampi credentials. Syncing...`);

    for (const tenant of yampiTenants) {
        console.log(`--------------------------------------------------`);
        console.log(`Syncing tenant: ${tenant.name} (Alias: ${tenant.yampi_alias})`);
        try {
            const result = await YampiSyncService.syncOrders(tenant);
            console.log("Success:", result);
        } catch (e) {
            console.error("Failed:", e.message);
            if (e.response) {
                console.error("API Response Data:", JSON.stringify(e.response.data, null, 2));
                console.error("API Response Status:", e.response.status);
            }
        }
    }
}

run();
