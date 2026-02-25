-- ==============================================================================
-- INITIALIZATION SCRIPT FOR CONEXAX HUB SUPABASE
-- Note: 'products' and 'categories' tables have been OMitted as requested.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. BASE TABLES
-- ==========================================

-- Plans Table
CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price_quarterly NUMERIC(10,2) DEFAULT 0,
    price_semiannual NUMERIC(10,2) DEFAULT 0,
    price_yearly NUMERIC(10,2) DEFAULT 0,
    description_quarterly TEXT,
    description_semiannual TEXT,
    description_yearly TEXT,
    observations TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    recommended BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    traffic_fee_percent NUMERIC(5,2) DEFAULT 0,
    installments INTEGER DEFAULT 1,
    ad_credit NUMERIC(10,2) DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    discount_upfront_percent NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenants Table (Lojistas)
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    owner_email TEXT NOT NULL UNIQUE,
    password TEXT,
    document TEXT,
    yampi_token TEXT,
    yampi_secret TEXT,
    yampi_alias TEXT,
    yampi_proxy_url TEXT,
    yampi_oauth_access_token TEXT,
    yampi_oauth_refresh_token TEXT,
    yampi_oauth_expires_at TIMESTAMP WITH TIME ZONE,
    last_sync TIMESTAMP WITH TIME ZONE,
    plan_id UUID REFERENCES public.plans(id),
    active BOOLEAN DEFAULT true,
    subscription_status TEXT DEFAULT 'active',
    billing_cycle TEXT DEFAULT 'monthly',
    next_billing TIMESTAMP WITH TIME ZONE,
    pending_plan_id UUID REFERENCES public.plans(id),
    pending_billing_cycle TEXT,
    pending_payment_url TEXT,
    meta_range TEXT DEFAULT '0-10k',
    company_percentage NUMERIC(5,2) DEFAULT 0,
    cached_gross_revenue NUMERIC(15,2) DEFAULT 0,
    logo_url TEXT,
    asaas_customer_id TEXT,
    meta_access_token TEXT,
    meta_ad_account_id TEXT,
    ga4_measurement_id TEXT,
    ga_credentials JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users Table
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'CLIENT_USER', -- CONEXX_ADMIN, CLIENT_ADMIN, CLIENT_USER
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform Settings (Asaas Config, etc.)
CREATE TABLE public.platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Domains
CREATE TABLE public.domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    is_main BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending',
    ssl BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coupons
CREATE TABLE public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    type TEXT NOT NULL, -- percentage, fixed
    value NUMERIC(10,2) NOT NULL,
    active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    usage_limit INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Influencers
CREATE TABLE public.influencers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    commission_rate NUMERIC(5,2) NOT NULL,
    total_sales NUMERIC(15,2) DEFAULT 0,
    total_commission NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comm Settings
CREATE TABLE public.comm_settings (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    email_provider TEXT,
    sms_provider TEXT,
    active_triggers JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. YAMPI METRICS TABLES
-- ==========================================

-- Abandoned Checkouts
CREATE TABLE public.abandoned_checkouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    product TEXT,
    value NUMERIC(15,2) NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    recovered BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, external_id)
);

-- Orders
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    client TEXT NOT NULL,
    email TEXT,
    product TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL, -- APROVADO, AGUARDANDO, CANCELADO
    payment_method TEXT,
    value NUMERIC(15,2) NOT NULL,
    initials TEXT,
    coupon_code TEXT,
    raw_status_alias TEXT,
    delivered BOOLEAN DEFAULT false,
    track_code TEXT,
    track_url TEXT,
    shipment_service TEXT,
    shipment_quote_id TEXT,
    days_delivery INTEGER,
    value_shipment NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, external_id)
);

-- ==========================================
-- 3. FINANCIAL TABLES
-- ==========================================

-- Payment Requests (Plan Upgrades)
CREATE TABLE public.payment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.plans(id),
    cycle TEXT NOT NULL,
    billing_type TEXT NOT NULL,
    payment_method TEXT,
    status TEXT DEFAULT 'pending',
    asaas_payment_id TEXT,
    asaas_invoice_url TEXT,
    billing_value NUMERIC(15,2) NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weekly Fees
CREATE TABLE public.weekly_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    week_start TIMESTAMP WITH TIME ZONE NOT NULL,
    week_end TIMESTAMP WITH TIME ZONE NOT NULL,
    revenue_week NUMERIC(15,2) NOT NULL,
    percent_applied NUMERIC(5,2) NOT NULL,
    amount_due NUMERIC(15,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    asaas_payment_id TEXT,
    asaas_invoice_url TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    payment_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goals / Admin Goals Tracking
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    target_value NUMERIC(15,2) NOT NULL,
    current_value NUMERIC(15,2) DEFAULT 0,
    achieved BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abandoned_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Disable RLS strictly for internal server usage (if using service_role key, it bypasses anyway)
-- We will write policies so CLIENT_ADMIN / CLIENT_USER can read their own tenant data.
-- Conexx Admins can read/write everything.

-- Create a helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- Create a helper function to get current user tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- ----------------------------------------------------
-- Policies Draft Example (Adjust as needed)
-- ----------------------------------------------------

-- Plans: everyone can read
CREATE POLICY "Plans are viewable by everyone" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Plans editable by ConexxAdmin" ON public.plans FOR ALL USING (public.get_user_role() = 'CONEXX_ADMIN');

-- Tenants: Viewable by self or ConexxAdmin
CREATE POLICY "Tenants viewable by tenant members" ON public.tenants FOR SELECT USING (id = public.get_user_tenant() OR public.get_user_role() = 'CONEXX_ADMIN');
CREATE POLICY "Tenants editable by ConexxAdmin or self" ON public.tenants FOR UPDATE USING (id = public.get_user_tenant() OR public.get_user_role() = 'CONEXX_ADMIN');
CREATE POLICY "Tenants insert by ConexxAdmin" ON public.tenants FOR INSERT WITH CHECK (public.get_user_role() = 'CONEXX_ADMIN');

-- Users: Viewable by same tenant or ConexxAdmin
CREATE POLICY "Users viewable by tenant" ON public.users FOR SELECT USING (tenant_id = public.get_user_tenant() OR public.get_user_role() = 'CONEXX_ADMIN');
CREATE POLICY "Users editable by tenant admins or ConexxAdmin" ON public.users FOR ALL USING (
    (tenant_id = public.get_user_tenant() AND public.get_user_role() = 'CLIENT_ADMIN') OR 
    public.get_user_role() = 'CONEXX_ADMIN'
);

-- Domains, Coupons, Influencers, Orders, Abandoned Checkouts, Payment Requests, Weekly Fees, Goals
-- Standard policy: Tenant members can SELECT/ALL their own, ConexxAdmin can ALL everything.

-- For automation, I will create a template policy applicator via DO block:
DO $$
DECLARE
    t TEXT;
    obj RECORD;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY[
            'domains', 'coupons', 'influencers', 'comm_settings', 
            'abandoned_checkouts', 'orders', 'payment_requests', 
            'weekly_fees', 'goals'
        ])
    LOOP
        EXECUTE format('
            CREATE POLICY "%I viewable by tenant" ON public.%I 
            FOR SELECT USING (tenant_id = public.get_user_tenant() OR public.get_user_role() = ''CONEXX_ADMIN'');
        ', t, t);
        
        EXECUTE format('
            CREATE POLICY "%I editable by tenant admins" ON public.%I 
            FOR ALL USING ((tenant_id = public.get_user_tenant() AND public.get_user_role() IN (''CLIENT_ADMIN'', ''CLIENT_USER'')) OR public.get_user_role() = ''CONEXX_ADMIN'');
        ', t, t);
    END LOOP;
END
$$;

-- Platform Settings: Only ConexxAdmin
CREATE POLICY "Settings viewable by ConexxAdmin" ON public.platform_settings FOR ALL USING (public.get_user_role() = 'CONEXX_ADMIN');

-- ==========================================
-- 5. TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_payment_requests_updated_at BEFORE UPDATE ON public.payment_requests FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
CREATE TRIGGER set_weekly_fees_updated_at BEFORE UPDATE ON public.weekly_fees FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
CREATE TRIGGER set_comm_settings_updated_at BEFORE UPDATE ON public.comm_settings FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
CREATE TRIGGER set_platform_settings_updated_at BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- Note: The triggers must only be applied to tables that have an `updated_at` column.

-- ==========================================
-- END OF SCRIPT
-- ==========================================
