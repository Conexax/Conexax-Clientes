import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.server' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRPC2() {
    const { data, error } = await supabase.rpc('admin_update_tenant_v2', {
        _id: '00000000-0000-0000-0000-000000000000',
        _name: 'Test',
        _owner_email: 'test@test.com',
        _yampi_alias: null,
        _yampi_token: null,
        _yampi_secret: null,
        _yampi_proxy_url: null,
        _company_percentage: 0,
        _logo_url: null,
        _document: null
    });

    if (error) {
        console.error("RPC admin_update_tenant_v2 check result:", error.code, error.message);
    } else {
        console.log("RPC admin_update_tenant_v2 EXISTS and ran (ignoring dummy id error).");
    }
}

checkRPC2();
