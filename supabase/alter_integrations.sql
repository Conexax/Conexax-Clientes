-- Executar este script SQL no painel "SQL Editor" do Supabase
-- para adicionar os campos do Meta Ads e Google Analytics à tabela de Lojistas.

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS meta_access_token TEXT,
ADD COLUMN IF NOT EXISTS meta_ad_account_id TEXT,
ADD COLUMN IF NOT EXISTS ga4_measurement_id TEXT,
ADD COLUMN IF NOT EXISTS ga_credentials JSONB;
