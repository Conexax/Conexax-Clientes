import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.server' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
    // Find any tenant to update
    const { data: tenants } = await supabase.from('tenants').select('id').limit(1);
    if (!tenants || tenants.length === 0) {
        console.log("No tenants found to test.");
        return;
    }

    const tenantId = tenants[0].id;

    const testPayload = {
        yampi_alias: 'test-alias-script',
        yampi_token: 'test-token-script',
        yampi_secret: 'test-secret-script'
    };

    const { data, error } = await supabase
        .from('tenants')
        .update(testPayload)
        .eq('id', tenantId)
        .select()
        .single();

    if (error) {
        console.error("Test update failed:", error);
    } else {
        console.log("Test update succeeded! Data:", data);
    }
}

testUpdate();
