-- =====================================================================
-- Cowork Up CRM — Initial schema
-- Run this in the Supabase SQL editor (or via supabase db push)
-- =====================================================================

create extension if not exists "pgcrypto";

-- =========================
-- Enums
-- =========================
create type coworking_status as enum ('active','unmanaged','closed');
create type user_role        as enum ('super_admin','manager','staff');
create type client_type      as enum ('individual','company');
create type client_status    as enum ('active','inactive','pending','overdue','paused');
create type plan_type        as enum ('fixed','flexible','hours_20','hours_10','evening','office','company_custom','day_pass','half_day_pass','week_pass');
create type billing_cycle    as enum ('monthly','one_off');
create type subscription_status as enum ('active','cancelled','paused','finished');
create type discount_type    as enum ('percent','fixed');
create type payment_status   as enum ('pending','paid','partial','overdue','cancelled');
create type payment_method   as enum ('transfer','card','cash','direct_debit','other');
create type invoice_status   as enum ('to_issue','issued','sent','paid','overdue','cancelled');
create type extra_type       as enum ('locker','screen','equipment','other');
create type extra_status     as enum ('available','rented','returned','pending');
create type incident_type    as enum ('maintenance','cleaning','internet','climate','furniture','access','client','other');
create type incident_priority as enum ('low','medium','high','urgent');
create type incident_status  as enum ('open','in_progress','waiting_provider','resolved','cancelled');
create type calendar_event_type as enum ('contract_start','contract_end','renewal','payment_due','invoice_due','deposit_return','incident_review','maintenance','client_signup','client_churn','custom');

-- =========================
-- Coworkings
-- =========================
create table coworkings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  status coworking_status not null default 'active',
  total_capacity int,
  fixed_desks_capacity int,
  flexible_capacity int,
  offices_capacity int,
  lockers_capacity int,
  screens_capacity int,
  manager_name text,
  notes text,
  created_at timestamptz not null default now()
);

-- =========================
-- Profiles (mirror of auth.users)
-- =========================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text not null,
  role user_role not null default 'staff',
  coworking_id uuid references coworkings(id) on delete set null,
  created_at timestamptz not null default now()
);

create index profiles_role_idx on profiles(role);
create index profiles_coworking_idx on profiles(coworking_id);

-- =========================
-- Clients
-- =========================
create table clients (
  id uuid primary key default gen_random_uuid(),
  coworking_id uuid not null references coworkings(id) on delete restrict,
  client_type client_type not null default 'individual',
  name text not null,
  company_name text,
  tax_id text,
  email text,
  phone text,
  fiscal_address text,
  contact_person text,
  status client_status not null default 'active',
  start_date date,
  end_date date,
  cancellation_reason text,
  notes text,
  tags text[],
  source text,
  created_at timestamptz not null default now()
);

create index clients_coworking_idx on clients(coworking_id);
create index clients_status_idx on clients(status);
create index clients_email_idx on clients(lower(email));

-- Users that belong to a company-type client
create table company_users (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  status text default 'active',
  created_at timestamptz not null default now()
);

create index company_users_client_idx on company_users(client_id);

-- =========================
-- Plans (catalog)
-- =========================
create table plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_type plan_type not null,
  default_price numeric(10,2) not null default 0,
  billing_cycle billing_cycle not null default 'monthly',
  included_hours_weekly int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =========================
-- Subscriptions
-- =========================
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  coworking_id uuid not null references coworkings(id) on delete restrict,
  plan_id uuid references plans(id) on delete set null,
  plan_name text not null,
  base_price numeric(10,2) not null default 0,
  discount_type discount_type,
  discount_value numeric(10,2) default 0,
  final_price numeric(10,2) not null default 0,
  start_date date not null,
  end_date date,
  status subscription_status not null default 'active',
  auto_renew boolean default true,
  billing_day int,
  payment_method payment_method,
  notes text,
  created_at timestamptz not null default now()
);

create index subscriptions_client_idx on subscriptions(client_id);
create index subscriptions_status_idx on subscriptions(status);

create table subscription_history (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  previous_plan text,
  new_plan text,
  change_date date not null default current_date,
  reason text,
  changed_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- =========================
-- Invoices
-- =========================
create table invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  coworking_id uuid not null references coworkings(id) on delete restrict,
  month date,
  invoice_number text,
  concept text,
  taxable_base numeric(10,2) not null default 0,
  vat_amount numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  status invoice_status not null default 'to_issue',
  issue_date date,
  due_date date,
  paid_date date,
  file_url text,
  notes text,
  created_at timestamptz not null default now()
);

create index invoices_client_idx on invoices(client_id);
create index invoices_status_idx on invoices(status);
create index invoices_month_idx on invoices(month);

-- =========================
-- Payments
-- =========================
create table payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  coworking_id uuid not null references coworkings(id) on delete restrict,
  subscription_id uuid references subscriptions(id) on delete set null,
  month date,
  concept text,
  expected_amount numeric(10,2) not null default 0,
  paid_amount numeric(10,2) default 0,
  discount_amount numeric(10,2) default 0,
  status payment_status not null default 'pending',
  expected_payment_date date,
  paid_at date,
  payment_method payment_method,
  bank_reference text,
  invoice_id uuid references invoices(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index payments_client_idx on payments(client_id);
create index payments_status_idx on payments(status);
create index payments_month_idx on payments(month);

-- =========================
-- Deposits (fianzas)
-- =========================
create table deposits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  coworking_id uuid not null references coworkings(id) on delete restrict,
  amount numeric(10,2) not null default 0,
  received boolean default false,
  received_date date,
  returned boolean default false,
  returned_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- =========================
-- Extras (catalog) and assignments
-- =========================
create table extras (
  id uuid primary key default gen_random_uuid(),
  coworking_id uuid not null references coworkings(id) on delete cascade,
  type extra_type not null,
  identifier text not null,
  monthly_price numeric(10,2) not null default 0,
  status extra_status not null default 'available',
  notes text,
  created_at timestamptz not null default now()
);

create index extras_coworking_idx on extras(coworking_id);
create index extras_type_idx on extras(type);

create table client_extras (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  coworking_id uuid not null references coworkings(id) on delete restrict,
  extra_id uuid not null references extras(id) on delete restrict,
  price numeric(10,2) not null default 0,
  start_date date not null default current_date,
  end_date date,
  status extra_status not null default 'rented',
  deposit_amount numeric(10,2) default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index client_extras_client_idx on client_extras(client_id);
create index client_extras_extra_idx on client_extras(extra_id);

-- =========================
-- Incidents
-- =========================
create table incidents (
  id uuid primary key default gen_random_uuid(),
  coworking_id uuid not null references coworkings(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  title text not null,
  description text,
  type incident_type not null default 'other',
  priority incident_priority not null default 'medium',
  status incident_status not null default 'open',
  created_date date not null default current_date,
  due_date date,
  responsible text,
  estimated_cost numeric(10,2),
  final_cost numeric(10,2),
  provider text,
  notes text,
  created_at timestamptz not null default now()
);

-- =========================
-- Calendar events
-- =========================
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  coworking_id uuid references coworkings(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  related_type text,
  related_id uuid,
  title text not null,
  description text,
  event_type calendar_event_type not null default 'custom',
  start_date timestamptz not null,
  end_date timestamptz,
  status text default 'scheduled',
  created_at timestamptz not null default now()
);

create index calendar_events_start_idx on calendar_events(start_date);

-- =========================
-- CSV imports log
-- =========================
create table csv_imports (
  id uuid primary key default gen_random_uuid(),
  imported_by uuid references profiles(id) on delete set null,
  import_type text not null,
  file_name text,
  status text not null default 'completed',
  total_rows int default 0,
  successful_rows int default 0,
  failed_rows int default 0,
  error_log jsonb,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Helper functions for RLS
-- =====================================================================
create or replace function current_role_value() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function current_coworking_id() returns uuid
language sql stable security definer set search_path = public as $$
  select coworking_id from profiles where id = auth.uid()
$$;

create or replace function is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_role_value() = 'super_admin', false)
$$;

-- =====================================================================
-- Auto-create profile on auth.users insert
-- =====================================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case when new.email = 'crovettopro@gmail.com' then 'super_admin'::user_role
         else 'staff'::user_role end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- =====================================================================
-- RLS
-- =====================================================================
alter table coworkings           enable row level security;
alter table profiles             enable row level security;
alter table clients              enable row level security;
alter table company_users        enable row level security;
alter table plans                enable row level security;
alter table subscriptions        enable row level security;
alter table subscription_history enable row level security;
alter table invoices             enable row level security;
alter table payments             enable row level security;
alter table deposits             enable row level security;
alter table extras               enable row level security;
alter table client_extras        enable row level security;
alter table incidents            enable row level security;
alter table calendar_events      enable row level security;
alter table csv_imports          enable row level security;

-- Profiles: user reads own profile, super_admin reads all
create policy profiles_select on profiles for select using (
  id = auth.uid() or is_super_admin()
);
create policy profiles_admin_write on profiles for all using (is_super_admin()) with check (is_super_admin());

-- Coworkings
create policy coworkings_read on coworkings for select using (
  is_super_admin() or id = current_coworking_id()
);
create policy coworkings_write on coworkings for all using (is_super_admin()) with check (is_super_admin());

-- Plans (catalog) — readable by all logged-in, writable by super admin
create policy plans_read on plans for select using (auth.uid() is not null);
create policy plans_write on plans for all using (is_super_admin()) with check (is_super_admin());

-- Generic helper macro: row visible if super_admin OR row.coworking_id = my coworking
-- Clients
create policy clients_select on clients for select using (
  is_super_admin() or coworking_id = current_coworking_id()
);
create policy clients_write on clients for all using (
  is_super_admin() or coworking_id = current_coworking_id()
) with check (
  is_super_admin() or coworking_id = current_coworking_id()
);

-- Company users
create policy company_users_select on company_users for select using (
  is_super_admin() or exists (
    select 1 from clients c where c.id = company_users.client_id
      and (is_super_admin() or c.coworking_id = current_coworking_id())
  )
);
create policy company_users_write on company_users for all using (
  is_super_admin() or exists (
    select 1 from clients c where c.id = company_users.client_id
      and (is_super_admin() or c.coworking_id = current_coworking_id())
  )
) with check (
  is_super_admin() or exists (
    select 1 from clients c where c.id = company_users.client_id
      and (is_super_admin() or c.coworking_id = current_coworking_id())
  )
);

-- Subscriptions
create policy subs_select on subscriptions for select using (
  is_super_admin() or coworking_id = current_coworking_id()
);
create policy subs_write on subscriptions for all using (
  is_super_admin() or coworking_id = current_coworking_id()
) with check (
  is_super_admin() or coworking_id = current_coworking_id()
);

create policy sub_history_select on subscription_history for select using (
  is_super_admin() or exists (
    select 1 from subscriptions s where s.id = subscription_history.subscription_id
      and (is_super_admin() or s.coworking_id = current_coworking_id())
  )
);
create policy sub_history_write on subscription_history for all using (
  is_super_admin() or exists (
    select 1 from subscriptions s where s.id = subscription_history.subscription_id
      and (is_super_admin() or s.coworking_id = current_coworking_id())
  )
) with check (
  is_super_admin() or exists (
    select 1 from subscriptions s where s.id = subscription_history.subscription_id
      and (is_super_admin() or s.coworking_id = current_coworking_id())
  )
);

-- Invoices
create policy invoices_select on invoices for select using (
  is_super_admin() or coworking_id = current_coworking_id()
);
create policy invoices_write on invoices for all using (
  is_super_admin() or coworking_id = current_coworking_id()
) with check (
  is_super_admin() or coworking_id = current_coworking_id()
);

-- Payments
create policy payments_select on payments for select using (
  is_super_admin() or coworking_id = current_coworking_id()
);
create policy payments_write on payments for all using (
  is_super_admin() or coworking_id = current_coworking_id()
) with check (
  is_super_admin() or coworking_id = current_coworking_id()
);

-- Deposits
create policy deposits_select on deposits for select using (
  is_super_admin() or coworking_id = current_coworking_id()
);
create policy deposits_write on deposits for all using (
  is_super_admin() or coworking_id = current_coworking_id()
) with check (
  is_super_admin() or coworking_id = current_coworking_id()
);

-- Extras
create policy extras_select on extras for select using (
  is_super_admin() or coworking_id = current_coworking_id()
);
create policy extras_write on extras for all using (
  is_super_admin() or coworking_id = current_coworking_id()
) with check (
  is_super_admin() or coworking_id = current_coworking_id()
);

create policy client_extras_select on client_extras for select using (
  is_super_admin() or coworking_id = current_coworking_id()
);
create policy client_extras_write on client_extras for all using (
  is_super_admin() or coworking_id = current_coworking_id()
) with check (
  is_super_admin() or coworking_id = current_coworking_id()
);

-- Incidents
create policy incidents_select on incidents for select using (
  is_super_admin() or coworking_id = current_coworking_id()
);
create policy incidents_write on incidents for all using (
  is_super_admin() or coworking_id = current_coworking_id()
) with check (
  is_super_admin() or coworking_id = current_coworking_id()
);

-- Calendar
create policy calendar_select on calendar_events for select using (
  is_super_admin() or coworking_id = current_coworking_id() or coworking_id is null
);
create policy calendar_write on calendar_events for all using (
  is_super_admin() or coworking_id = current_coworking_id()
) with check (
  is_super_admin() or coworking_id = current_coworking_id()
);

-- CSV imports
create policy csv_imports_select on csv_imports for select using (
  is_super_admin() or imported_by = auth.uid()
);
create policy csv_imports_write on csv_imports for all using (
  auth.uid() is not null
) with check (
  imported_by = auth.uid() or is_super_admin()
);

-- =====================================================================
-- Initial seed data
-- =====================================================================
insert into coworkings (name, status, total_capacity, fixed_desks_capacity, flexible_capacity, offices_capacity, lockers_capacity, screens_capacity, manager_name)
values
  ('Cowork Up — Coworking 1', 'active',   60, 25, 20, 4, 30, 6, 'Manager 1'),
  ('Cowork Up — Coworking 2', 'active',   45, 18, 15, 3, 24, 4, 'Manager 2'),
  ('Cowork Up — Coworking 3', 'unmanaged', 0, 0, 0, 1, 0, 0, 'Alquilado completo a un único cliente')
on conflict do nothing;

insert into plans (name, plan_type, default_price, billing_cycle, included_hours_weekly) values
  ('Fijo',                'fixed',          280, 'monthly', null),
  ('Flexible',            'flexible',       180, 'monthly', null),
  ('20h semanales',       'hours_20',       150, 'monthly', 20),
  ('10h semanales',       'hours_10',        90, 'monthly', 10),
  ('Tardes',              'evening',        120, 'monthly', null),
  ('Oficina',             'office',         650, 'monthly', null),
  ('Plan Empresa',        'company_custom',   0, 'monthly', null),
  ('Pase de día',         'day_pass',        20, 'one_off', null),
  ('Pase medio día',      'half_day_pass',   12, 'one_off', null),
  ('Pase semanal',        'week_pass',       80, 'one_off', null)
on conflict do nothing;
