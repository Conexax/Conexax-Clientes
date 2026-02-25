ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS monthly_price_quarterly NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_price_semiannual NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_price_yearly NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS installments_quarterly INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS installments_semiannual INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS installments_yearly INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS traffic_fee_percent_quarterly NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS traffic_fee_percent_semiannual NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS traffic_fee_percent_yearly NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS ad_credit_quarterly NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS ad_credit_semiannual NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS ad_credit_yearly NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_upfront_percent NUMERIC DEFAULT 0;

-- Allow authenticated users to insert new plans
CREATE POLICY "Enable insert for authenticated users only"
ON public.plans
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to update existing plans
CREATE POLICY "Enable update for authenticated users only"
ON public.plans
FOR UPDATE
TO authenticated 
USING (true)
WITH CHECK (true);

