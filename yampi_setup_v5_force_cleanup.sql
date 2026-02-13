-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. CLEANUP (Safe drops to resolve type conflicts)
-- We drop these tables to recreate them with GUARANTEED compatible types
drop table if exists public.orders cascade;
drop table if exists public.abandoned_checkouts cascade;

-- 2. UPDATE TENANTS TABLE (Idempotent column additions)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'tenants' and column_name = 'yampi_alias') then
        alter table public.tenants add column yampi_alias text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'tenants' and column_name = 'yampi_token') then
        alter table public.tenants add column yampi_token text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'tenants' and column_name = 'yampi_secret') then
        alter table public.tenants add column yampi_secret text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'tenants' and column_name = 'yampi_proxy_url') then
        alter table public.tenants add column yampi_proxy_url text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'tenants' and column_name = 'last_sync') then
        alter table public.tenants add column last_sync timestamptz;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'tenants' and column_name = 'cached_gross_revenue') then
        alter table public.tenants add column cached_gross_revenue numeric default 0;
    end if;
end $$;

-- 3. CREATE ORDERS TABLE (Safe Mode: Text IDs, No Strict FK)
create table public.orders (
    id uuid primary key default uuid_generate_v4(),
    tenant_id text not null, -- Stores UUID or 'T-xxx' safely
    external_id text not null,
    client_name text,
    client_email text,
    product_name text,
    order_date timestamptz,
    status text,
    payment_method text,
    total_value numeric default 0,
    coupon_code text,
    created_at timestamptz default now(),
    
    unique(tenant_id, external_id)
);

-- 4. CREATE ABANDONED CHECKOUTS TABLE (Safe Mode)
create table public.abandoned_checkouts (
    id uuid primary key default uuid_generate_v4(),
    tenant_id text not null, -- Stores UUID or 'T-xxx' safely
    external_id text not null,
    client_name text,
    client_email text,
    client_phone text,
    product_name text,
    value numeric default 0,
    abandoned_at timestamptz,
    items text,
    recovered boolean default false,
    created_at timestamptz default now(),

    unique(tenant_id, external_id)
);

-- 5. ENABLE RLS
alter table public.orders enable row level security;
alter table public.abandoned_checkouts enable row level security;

-- 6. RLS POLICIES (Aggressive Casting for Typeless Compatibility)

-- Policy 1: Users can view orders
create policy "Users can view own orders" 
on public.orders for select 
using (
    -- Cast everything to text to guarantee comparison works
    tenant_id::text in (
        select tenant_id::text from public.users where id::text = auth.uid()::text
    )
    OR
    -- Admin override
    exists (
        select 1 from public.users 
        where id::text = auth.uid()::text 
        and role = 'CONEXX_ADMIN'
    )
);

-- Policy 2: Users can insert/update orders
create policy "Users can insert/update own orders" 
on public.orders for all
using (
    tenant_id::text in (
        select tenant_id::text from public.users where id::text = auth.uid()::text
    )
    -- Admin override (Allow admins to insert for ANY tenant)
    OR
    exists (
        select 1 from public.users 
        where id::text = auth.uid()::text 
        and role = 'CONEXX_ADMIN'
    )
);

-- Policy 3: Users can view checkouts
create policy "Users can view own abandoned checkouts"
on public.abandoned_checkouts for select
using (
    tenant_id::text in (
        select tenant_id::text from public.users where id::text = auth.uid()::text
    )
    OR
    exists (
        select 1 from public.users 
        where id::text = auth.uid()::text 
        and role = 'CONEXX_ADMIN'
    )
);

-- Policy 4: Users can insert/update checkouts
create policy "Users can insert/update own abandoned checkouts"
on public.abandoned_checkouts for all
using (
    tenant_id::text in (
        select tenant_id::text from public.users where id::text = auth.uid()::text
    )
    OR
    exists (
        select 1 from public.users 
        where id::text = auth.uid()::text 
        and role = 'CONEXX_ADMIN'
    )
);
