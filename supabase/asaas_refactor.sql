-- NEW ASAAS SUBSCRIPTION INTEGRATION SCHEMA
-- This script creates or adjusts the tables required for a robust Asaas integration.

-- 1. Webhook Logs Table (for idempotency and debugging)
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id TEXT UNIQUE, -- Asaas event ID for idempotency
    event_type TEXT,
    payload JSONB,
    processed BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Subscriptions Table
-- Adjusting existing table or creating new one
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    asaas_customer_id TEXT,
    asaas_subscription_id TEXT UNIQUE, -- Asaas Subscription ID
    plan_id TEXT, -- Local plan identifier
    status TEXT NOT NULL DEFAULT 'pending', -- pending, active, overdue, canceled, expired
    billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'quarterly', 'semiannual', 'yearly')),
    billing_type TEXT DEFAULT 'upfront', -- monthly, upfront
    value DECIMAL(10,2),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    checkout_url TEXT, -- Link for first payment
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY, -- Asaas Payment ID
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    asaas_subscription_id TEXT REFERENCES public.subscriptions(asaas_subscription_id) ON DELETE SET NULL,
    value DECIMAL(10,2) NOT NULL,
    net_value DECIMAL(10,2),
    status TEXT NOT NULL, -- RECEIVED, CONFIRMED, OVERDUE, DELETED, etc.
    billing_type TEXT, -- BOLETO, CREDIT_CARD, PIX
    due_date DATE,
    payment_date TIMESTAMP WITH TIME ZONE,
    invoice_url TEXT,
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- 5. RLS POLICIES

-- Subscriptions: Users can only see their own
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Payments: Users can only see their own
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);

-- Webhook Logs: Only service_role can access
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
-- No public/authenticated access needed by default.

-- TRIGGER for updated_at on subscriptions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER tr_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
