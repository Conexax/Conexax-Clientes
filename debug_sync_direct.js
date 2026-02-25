import { createClient } from '@supabase/supabase-js';
import { YampiSyncService } from './server/services/yampiSync.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.server' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectSync() {
    const { data: tenants } = await supabase.from('tenants').select('*').limit(1);
    if (!tenants || tenants.length === 0) return console.log('No tenants');

    try {
        const result = await YampiSyncService.syncOrders(tenants[0]);
        console.log("Success:", result);
    } catch (e) {
        console.error("Direct Sync Error:", e.message);
        if (e.response) {
            console.error("Response Data:", e.response.data);
        }
    }
}
testDirectSync();
