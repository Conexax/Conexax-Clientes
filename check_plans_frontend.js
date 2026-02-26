require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log('Fetching plans with anon key...');
  const { data, error } = await supabase.from('plans').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching plans:', error);
  } else {
    console.log(`Found ${data.length} plans.`);
    if (data.length > 0) {
        console.log("Most recent plan:", data[0]);
    }
  }
}
check();
