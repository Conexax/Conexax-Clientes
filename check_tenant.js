const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.server' });

const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY
);

async function run() {
    const { data, error } = await supabase.from('tenants').select('id, name, meta_access_token, meta_ad_account_id');
    console.log(JSON.stringify(data, null, 2));
}
run();
