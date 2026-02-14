-- Migration: Accurate Yampi Metrics & Idempotency
-- This script adds columns required for gross/net revenue calculation and ensures sync idempotency.

-- 1. Add columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gross_value NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS net_value NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_value NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_refunded BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_canceled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS raw_data JSONB;

-- 2. Ensure unique constraint for idempotency
-- We use (tenant_id, external_id) as the unique key for orders from Yampi.
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'orders_tenant_id_external_id_key'
    ) THEN
        ALTER TABLE public.orders ADD CONSTRAINT orders_tenant_id_external_id_key UNIQUE (tenant_id, external_id);
    END IF;
END $$;

-- 3. Add indexes for faster metrics querying
CREATE INDEX IF NOT EXISTS idx_orders_tenant_date ON public.orders(tenant_id, order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_paid ON public.orders(status, paid_at) WHERE status = 'APROVADO';
