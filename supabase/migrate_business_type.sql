-- Add business_type column to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'e-commerce';

COMMENT ON COLUMN public.tenants.business_type IS 'Tipo de negócio do cliente: e-commerce, traffic-management ou both';
