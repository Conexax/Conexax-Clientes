-- Desabilitar temporariamente o RLS da tabela plans
ALTER TABLE plans DISABLE ROW LEVEL SECURITY;

-- Ou se preferir manter o RLS ativado, criar uma política permissiva para todos
-- CREATE POLICY "Enable all actions for anon on plans" ON "public"."plans" AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
