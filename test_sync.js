import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { YampiSyncService } from './server/services/yampiSync.js';

dotenv.config({ path: '.env.server' });
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data: tenants } = await supabaseAdmin.from('tenants').select('*').eq('active', true);
  const t = tenants.find(t => t.yampi_alias);
  if (!t) { console.log("no tenant"); return; }
  console.log("Found tenant", t.name);
  try {
    await YampiSyncService.syncProducts(t);
  } catch (e) {
    console.error("error syncing products", e);
  }
}
run().then(() => console.log('done')).catch(console.error);
