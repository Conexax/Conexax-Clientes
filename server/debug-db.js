
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// Try loading from .env and .env.server
dotenv.config();
dotenv.config({ path: '.env.server' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Try ALL potential keys
const SUPABASE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_KEY.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
    console.log(`=== DEBUGGING DB STATE (${SUPABASE_URL}) ===`);
    console.log(`Using Key Length: ${SUPABASE_KEY.length}`);

    // 1. Get all Tenants
    const { data: tenants, error: tErr } = await supabase.from('tenants').select('*');
    if (tErr) console.error("Tenants Error:", tErr.message);
    else {
        console.log(`\nFound ${tenants.length} Tenants:`);
        tenants.forEach(t => {
            console.log(`- [${t.id}] ${t.name} (Owner: ${t.owner_email}) - Alias: ${t.yampi_alias} | Token: ${t.yampi_token ? 'YES' : 'NO'}`);
        });
    }

    // 2. Get all Users
    const { data: users, error: uErr } = await supabase.from('users').select('*');
    if (uErr) console.error("Users Error:", uErr.message);
    else {
        console.log(`\nFound ${users.length} Users:`);
        users.forEach(u => {
            console.log(`- [${u.id}] ${u.email} (Tenant: ${u.tenant_id}) Role: ${u.role}`);
        });
    }

    // 3. Count Orders per Tenant
    // We fetch all orders (limit 1000) and count in JS because count() might be restricted or grouping hard
    const { data: orders, error: oErr } = await supabase.from('orders').select('tenant_id').limit(5000);
    if (oErr) console.error("Orders Error:", oErr.message);
    else {
        const counts = {};
        orders.forEach(o => {
            counts[o.tenant_id] = (counts[o.tenant_id] || 0) + 1;
        });
        console.log(`\nOrder Counts per Tenant (Sample 5000):`);
        Object.keys(counts).forEach(tid => {
            const tName = tenants?.find(t => t.id === tid)?.name || 'Unknown';
            console.log(`- Tenant [${tid}] (${tName}): ${counts[tid]} orders`);
        });
    }
}

run();
