import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);

async function testInsert() {
  console.log("Testing plan insert with explicit id to bypass RLS potentially, or just logging the exact RLS error...");
  const payload = {
    name: "RLS Test Plan " + Date.now(),
  };

  const { data, error } = await supabase.from('plans').insert([payload]).select();
  
  if (error) {
    console.error("Insert failed:", error);
  } else {
    console.log("Insert success:", data);
  }
}

testInsert();
