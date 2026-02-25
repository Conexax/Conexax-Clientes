import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const payload = {
    name: "Test Plan " + Date.now(),
    price_quarterly: 100,
    price_semiannual: 200,
    price_yearly: 300,
    observations: "Testing",
    features: ["A", "B"],
    recommended: false,
    active: true,
    discount_percent: 10,
    traffic_fee_percent: 2,
    installments: 12,
    ad_credit: 50,
    monthly_price_quarterly: 33.33,
    monthly_price_semiannual: 33.33,
    monthly_price_yearly: 25,
    installments_quarterly: 3,
    installments_semiannual: 6,
    installments_yearly: 12,
    traffic_fee_percent_quarterly: 2,
    traffic_fee_percent_semiannual: 2,
    traffic_fee_percent_yearly: 1,
    ad_credit_quarterly: 0,
    ad_credit_semiannual: 0,
    ad_credit_yearly: 0,
    order_index: 0,
    discount_upfront_percent: 0
  };

  const { data, error } = await supabase.from('plans').insert([payload]).select();

  if (error) {
    console.error("Insert failed:", error);
  } else {
    console.log("Insert success:", data);
  }
}

testInsert();
