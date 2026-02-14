-- Enable RLS on tables (if not already enabled)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE abandoned_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE asaas_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- 1. ORDERS POLICIES
DROP POLICY IF EXISTS "Enable all access for anon/public on orders" ON orders;
CREATE POLICY "Enable all access for anon/public on orders"
ON orders FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 2. ABANDONED_CHECKOUTS POLICIES
DROP POLICY IF EXISTS "Enable all access for anon/public on abandoned_checkouts" ON abandoned_checkouts;
CREATE POLICY "Enable all access for anon/public on abandoned_checkouts"
ON abandoned_checkouts FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 3. TENANTS POLICIES
-- Allow server to read all tenants (for sync) and update them (active status, revenue)
DROP POLICY IF EXISTS "Enable read for all on tenants" ON tenants;
CREATE POLICY "Enable read for all on tenants"
ON tenants FOR SELECT
TO anon, authenticated, service_role
USING (true);

DROP POLICY IF EXISTS "Enable update for all on tenants" ON tenants;
CREATE POLICY "Enable update for all on tenants"
ON tenants FOR UPDATE
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 4. PAYMENT_REQUESTS POLICIES
DROP POLICY IF EXISTS "Enable all access for anon/public on payment_requests" ON payment_requests;
CREATE POLICY "Enable all access for anon/public on payment_requests"
ON payment_requests FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 5. SUBSCRIPTIONS POLICIES
DROP POLICY IF EXISTS "Enable all access for anon/public on subscriptions" ON subscriptions;
CREATE POLICY "Enable all access for anon/public on subscriptions"
ON subscriptions FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 6. PAYMENTS POLICIES
DROP POLICY IF EXISTS "Enable all access for anon/public on payments" ON payments;
CREATE POLICY "Enable all access for anon/public on payments"
ON payments FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 7. WEEKLY_FEES POLICIES
DROP POLICY IF EXISTS "Enable all access for anon/public on weekly_fees" ON weekly_fees;
CREATE POLICY "Enable all access for anon/public on weekly_fees"
ON weekly_fees FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 8. ASAAS_CUSTOMERS POLICIES
DROP POLICY IF EXISTS "Enable all access for anon/public on asaas_customers" ON asaas_customers;
CREATE POLICY "Enable all access for anon/public on asaas_customers"
ON asaas_customers FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- 9. PLATFORM_SETTINGS (Ensure Asaas Config can be read)
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

DROP POLICY IF EXISTS "Enable read permission for all on platform_settings" ON platform_settings;
CREATE POLICY "Enable read permission for all on platform_settings"
ON platform_settings FOR SELECT
TO anon, authenticated, service_role
USING (true);

-- OPTIONAL: Insert default Asaas config if missing (Modify API KEY as needed)
-- INSERT INTO platform_settings (key, value)
-- VALUES ('asaas_config', '{"api_key": "YOUR_API_KEY", "environment": "sandbox"}')
-- ON CONFLICT (key) DO NOTHING;
