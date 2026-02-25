-- Primeiro, vamos garantir que o RLS não tenha regras antigas quebradas
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.plans;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.plans;
DROP POLICY IF EXISTS "Enable read for all" ON public.plans;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.plans;
DROP POLICY IF EXISTS "Enable ALL for authenticated users" ON public.plans;
DROP POLICY IF EXISTS "Enable SELECT for everyone" ON public.plans;
DROP POLICY IF EXISTS "Enable ALL for everyone" ON public.plans;

-- Ativar RLS na tabela
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Como o sistema não usa a autenticação nativa do Supabase no front-end (GoTrue), 
-- os requests chegam como "anon". Vamos liberar o acesso total para public/anon.
CREATE POLICY "Enable ALL for everyone" 
ON public.plans 
FOR ALL 
USING (true) 
WITH CHECK (true);
