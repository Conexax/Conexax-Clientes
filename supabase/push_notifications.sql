-- Daily Push Report Settings
CREATE TABLE IF NOT EXISTS public.push_settings (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    send_time TIME DEFAULT '08:00',
    timezone TEXT DEFAULT 'America/Sao_Paulo',
    scope TEXT DEFAULT 'today', -- 'today', 'yesterday'
    meta_roas NUMERIC(10,2) DEFAULT 0,
    meta_margem NUMERIC(10,2) DEFAULT 0,
    max_cpa NUMERIC(10,2) DEFAULT 0,
    fixed_costs NUMERIC(15,2) DEFAULT 0,
    variable_costs_pct NUMERIC(5,2) DEFAULT 0,
    template_id TEXT DEFAULT 'default',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Push Delivery Logs
CREATE TABLE IF NOT EXISTS public.push_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    date_ref DATE NOT NULL,
    payload JSONB,
    status TEXT NOT NULL, -- 'success', 'error'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure push_subscriptions exists (matching notificationService.js usage)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for push_settings (Owners can manage)
ALTER TABLE public.push_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_settings_tenant" ON public.push_settings
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

ALTER TABLE public.push_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_logs_tenant" ON public.push_logs
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));
