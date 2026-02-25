import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.server' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function alterTable() {
    console.log("Adding columns to tenants table...");
    const { error } = await supabase.rpc('execute_sql', {
        sql_string: `
            ALTER TABLE public.tenants
            ADD COLUMN IF NOT EXISTS meta_access_token TEXT,
            ADD COLUMN IF NOT EXISTS meta_ad_account_id TEXT,
            ADD COLUMN IF NOT EXISTS ga4_measurement_id TEXT,
            ADD COLUMN IF NOT EXISTS ga_credentials JSONB;
        `
    });

    if (error) {
        if (error.message.includes('function execute_sql does not exist')) {
            console.log("No RPC execute_sql found. Let's try raw pg connection or the user might run init.sql via UI.");
        } else {
            console.error("Error:", error);
        }
    } else {
        console.log("Success!");
    }
}

alterTable();
