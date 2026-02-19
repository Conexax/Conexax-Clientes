-- Add missing Yampi credential columns to tenants table
-- These are required for per-tenant Yampi integration and metrics syncing
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS yampi_alias TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS yampi_token TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS yampi_secret TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS yampi_proxy_url TEXT;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND column_name IN ('yampi_alias', 'yampi_token', 'yampi_secret', 'yampi_proxy_url');
