import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);

async function alterTable() {
    console.log("Adding columns to plans table...");
    const { error } = await supabase.rpc('execute_sql', {
        sql_string: `
            ALTER TABLE public.plans
            ADD COLUMN IF NOT EXISTS monthly_price_quarterly NUMERIC DEFAULT 0,
            ADD COLUMN IF NOT EXISTS monthly_price_semiannual NUMERIC DEFAULT 0,
            ADD COLUMN IF NOT EXISTS monthly_price_yearly NUMERIC DEFAULT 0,
            ADD COLUMN IF NOT EXISTS installments_quarterly INTEGER DEFAULT 1,
            ADD COLUMN IF NOT EXISTS installments_semiannual INTEGER DEFAULT 1,
            ADD COLUMN IF NOT EXISTS installments_yearly INTEGER DEFAULT 1,
            ADD COLUMN IF NOT EXISTS traffic_fee_percent_quarterly NUMERIC DEFAULT 0,
            ADD COLUMN IF NOT EXISTS traffic_fee_percent_semiannual NUMERIC DEFAULT 0,
            ADD COLUMN IF NOT EXISTS traffic_fee_percent_yearly NUMERIC DEFAULT 0,
            ADD COLUMN IF NOT EXISTS ad_credit_quarterly NUMERIC DEFAULT 0,
            ADD COLUMN IF NOT EXISTS ad_credit_semiannual NUMERIC DEFAULT 0,
            ADD COLUMN IF NOT EXISTS ad_credit_yearly NUMERIC DEFAULT 0,
            ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS discount_upfront_percent NUMERIC DEFAULT 0;
        `
    });

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Success!");
    }
}

alterTable();
