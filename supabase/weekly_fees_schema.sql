-- Create weekly_fees table if it doesn't exist
CREATE TABLE IF NOT EXISTS weekly_fees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  revenue_week numeric DEFAULT 0,
  percent_applied numeric DEFAULT 0,
  amount_due numeric DEFAULT 0,
  status text DEFAULT 'pending', -- pending, created, paid, canceled, overdue
  asaas_payment_id text,
  asaas_invoice_url text,
  due_date date,
  payment_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, week_start)
);

-- Ensure tenants have the company_percentage column
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS company_percentage numeric DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS meta_range text DEFAULT '0-10k';

-- Enable RLS
ALTER TABLE weekly_fees ENABLE ROW LEVEL SECURITY;

-- Allow everything for anon (Server)
DROP POLICY IF EXISTS "Enable all access for anon/public on weekly_fees" ON weekly_fees;
CREATE POLICY "Enable all access for anon/public on weekly_fees"
ON weekly_fees FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_fees_tenant_id ON weekly_fees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_weekly_fees_status ON weekly_fees(status);
