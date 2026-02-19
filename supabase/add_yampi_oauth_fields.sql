-- Migration: Add Yampi OAuth fields to tenants table

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS yampi_oauth_access_token TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS yampi_oauth_refresh_token TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS yampi_oauth_token_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS yampi_oauth_scope TEXT;
