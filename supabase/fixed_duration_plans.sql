-- Enable extension for UUID if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('success', 'error', 'warning', 'info')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    action_label TEXT,
    action_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries on user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 2. Modify Subscriptions Table
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS billing_type TEXT CHECK (billing_type IN ('monthly', 'upfront'));
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS duration_months INTEGER;

-- Index for searching expiring subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON public.subscriptions(end_date) WHERE status = 'active';

-- RLS Policies for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark as read)" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Only system/service_role can insert notifications usually, but if we allow client creation:
-- CREATE POLICY "Users can insert their own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 3. Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);
