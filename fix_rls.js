require('dotenv').config({ path: '.env.server' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY
);

async function run() {
  console.log("Checking plans table RLS...");
  // Let's create an RPC to insert plans if we can, or just tell the user what to run.
  console.log(`
INSTRUÇÃO PARA O USUÁRIO:
Vá ao painel do Supabase -> SQL Editor -> New Query, e rode este script:

CREATE POLICY "Enable all for anon on plans"
ON "public"."plans"
AS PERMISSIVE FOR ALL
TO public
USING (true)
WITH CHECK (true);
`);
}
run();
