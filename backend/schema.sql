
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Tenants Table
create table tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_name text,
  owner_email text,
  password text, -- In a real app, hash this!
  yampi_token text,
  yampi_secret text,
  yampi_alias text,
  yampi_proxy_url text,
  last_sync timestamp with time zone,
  plan_id text,
  active boolean default true,
  subscription_status text check (subscription_status in ('active', 'past_due', 'canceled')),
  next_billing timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Users Table
create table users (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade,
  email text unique not null,
  role text check (role in ('CONEXX_ADMIN', 'CLIENT_ADMIN', 'CLIENT_USER')),
  name text,
  password text, -- Hash this!
  created_at timestamp with time zone default now()
);

-- Plans Table
create table plans (
  id text primary key,
  name text not null,
  price numeric,
  interval text check (interval in ('monthly', 'yearly')),
  features text[],
  recommended boolean default false,
  active boolean default true
);

-- Domains Table
create table domains (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade,
  url text not null,
  is_main boolean default false,
  status text check (status in ('active', 'pending', 'error')),
  ssl boolean default false,
  created_at timestamp with time zone default now()
);

-- Coupons Table
create table coupons (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  type text check (type in ('percentage', 'fixed')),
  value numeric,
  active boolean default true,
  usage_count int default 0,
  usage_limit int,
  created_at timestamp with time zone default now()
);

-- Influencers Table
create table influencers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  coupon_id uuid references coupons(id),
  commission_rate numeric,
  total_sales numeric default 0,
  total_commission numeric default 0,
  created_at timestamp with time zone default now()
);

-- Communication Settings Table
create table comm_settings (
  id uuid primary key default uuid_generate_v4(),
  email_provider text,
  sms_provider text,
  active_triggers text[],
  created_at timestamp with time zone default now()
);

-- Orders Table (Simplified for MVP)
create table orders (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade,
  external_id text,
  client_name text,
  client_email text,
  product_name text,
  order_date timestamp with time zone,
  status text,
  payment_method text,
  total_value numeric,
  coupon_code text,
  created_at timestamp with time zone default now()
);

-- RLS Policies (Optional but Recommended)
alter table tenants enable row level security;
alter table users enable row level security;
alter table plans enable row level security;
alter table domains enable row level security;
alter table coupons enable row level security;
alter table influencers enable row level security;
alter table comm_settings enable row level security;
alter table orders enable row level security;

-- Create policy to allow public read access for now (simulating local dev mode)
-- In production, replace with proper auth policies
create policy "Public Access" on tenants for all using (true);
create policy "Public Access" on users for all using (true);
create policy "Public Access" on plans for all using (true);
create policy "Public Access" on domains for all using (true);
create policy "Public Access" on coupons for all using (true);
create policy "Public Access" on influencers for all using (true);
create policy "Public Access" on comm_settings for all using (true);
create policy "Public Access" on orders for all using (true);
