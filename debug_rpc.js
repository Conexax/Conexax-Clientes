import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.server' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRPC() {
    const { data, error } = await supabase.rpc('admin_update_tenant', {
        _id: '00000000-0000-0000-0000-000000000000',
        _name: 'Test',
        _owner_email: 'test@test.com'
    });

    if (error) {
        console.error("RPC admin_update_tenant check result:", error.code, error.message);
    } else {
        console.log("RPC admin_update_tenant EXISTS and ran (ignoring dummy id error).");
    }
}

checkRPC();
