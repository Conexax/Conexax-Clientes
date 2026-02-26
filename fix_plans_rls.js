require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);

async function disableRls() {
    // This uses the anon key, but we might have a postgres connection string or need to use it.
    console.log("We need to disable RLS on the plans table. Run the SQL script below in the Supabase Dashboard:");
    console.log(`
-- Desabilitar temporariamente o RLS da tabela plans para testes
ALTER TABLE plans DISABLE ROW LEVEL SECURITY;
-- Ou permitir INSERTS anonimos (nao recomendado, mas util agora)
CREATE POLICY "Enable all actions for anon" ON plans FOR ALL TO anon USING (true) WITH CHECK (true);
`);
}

disableRls();
