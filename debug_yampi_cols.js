import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.server' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    const { data, error } = await supabase
        .from('tenants')
        .select('yampi_alias, yampi_token, yampi_secret, yampi_oauth_access_token')
        .limit(1);

    if (error) {
        console.error("Error checking columns:", error);
    } else {
        console.log("Columns exist (or query succeeded without error). Data:", data);
    }
}

checkColumns();
