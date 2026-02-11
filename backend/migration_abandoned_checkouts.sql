-- Create Abandoned Checkouts Table
create table if not exists abandoned_checkouts (
  id text primary key,
  tenant_id uuid references tenants(id) on delete cascade,
  client_name text,
  email text,
  phone text,
  value numeric,
  date timestamp with time zone,
  items text,
  recovered boolean default false,
  created_at timestamp with time zone default now()
);

-- RLS Policy
alter table abandoned_checkouts enable row level security;
create policy "Public Access" on abandoned_checkouts for all using (true);
