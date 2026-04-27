-- =====================================================================
-- Cowork Up CRM — 0006: Salas de reuniones, reservas y portal cliente
-- =====================================================================

-- Extensión necesaria para EXCLUDE GiST con btree column + range
create extension if not exists btree_gist;

-- =========================
-- user_role: añadir 'client'
-- =========================
do $$ begin
  if not exists (
    select 1 from pg_enum where enumtypid = 'user_role'::regtype and enumlabel = 'client'
  ) then
    alter type user_role add value 'client';
  end if;
end $$;

-- =========================
-- clients.auth_user_id (link 1:1 a auth.users)
-- =========================
alter table clients
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists clients_auth_user_unique
  on clients(auth_user_id) where auth_user_id is not null;

-- =========================
-- plans.included_meeting_hours_weekly
-- =========================
alter table plans
  add column if not exists included_meeting_hours_weekly numeric(4,2) not null default 0;

-- Cargar las horas según las reglas del negocio: fixed=3, flexible=2, resto=1
update plans set included_meeting_hours_weekly = case
  when plan_type = 'fixed' then 3
  when plan_type = 'flexible' then 2
  else 1
end;

-- =========================
-- subscriptions.meeting_hours_override (per-cliente)
-- =========================
alter table subscriptions
  add column if not exists meeting_hours_override numeric(4,2);

-- =========================
-- Meeting rooms
-- =========================
create table if not exists meeting_rooms (
  id uuid primary key default gen_random_uuid(),
  coworking_id uuid not null references coworkings(id) on delete cascade,
  name text not null,
  capacity int default 0,
  color text,
  sort_order int default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (coworking_id, name)
);
create index if not exists meeting_rooms_cw_idx on meeting_rooms(coworking_id);

-- =========================
-- Bookings
-- =========================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'room_booking_source') then
    create type room_booking_source as enum ('client','staff','walk_in');
  end if;
  if not exists (select 1 from pg_type where typname = 'room_booking_status') then
    create type room_booking_status as enum ('confirmed','cancelled');
  end if;
end $$;

create table if not exists room_bookings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references meeting_rooms(id) on delete cascade,
  coworking_id uuid not null references coworkings(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  walk_in_name text,
  walk_in_email text,
  walk_in_phone text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status room_booking_status not null default 'confirmed',
  source room_booking_source not null default 'staff',
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  constraint rb_end_after_start check (end_at > start_at),
  constraint rb_min_15min check (extract(epoch from (end_at - start_at)) >= 15*60),
  -- Sin solapes en la misma sala (solo bookings confirmados)
  constraint rb_no_overlap exclude using gist (
    room_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status = 'confirmed')
);

create index if not exists room_bookings_room_idx on room_bookings(room_id, start_at);
create index if not exists room_bookings_client_idx on room_bookings(client_id, start_at);
create index if not exists room_bookings_cw_idx on room_bookings(coworking_id, start_at);

-- =========================
-- Helpers de auth
-- =========================
create or replace function current_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from clients where auth_user_id = auth.uid() limit 1
$$;

-- =========================
-- Balance de horas semanal (lunes 00:00 a domingo 23:59) para un cliente
-- Suma horas incluidas de TODAS las suscripciones activas (override > plan)
-- =========================
create or replace function client_meeting_hours_balance(
  p_client_id uuid,
  p_week_anchor date default current_date
) returns table (
  week_start date,
  week_end date,
  included_minutes int,
  used_minutes int,
  remaining_minutes int
) language plpgsql stable security invoker set search_path = public as $$
declare
  ws date;
  we date;
  inc_min int;
  used_min int;
begin
  ws := date_trunc('week', p_week_anchor)::date; -- ISO: lunes
  we := ws + 6;

  select coalesce(sum(coalesce(s.meeting_hours_override, p.included_meeting_hours_weekly, 0)) * 60, 0)::int
    into inc_min
  from subscriptions s
  left join plans p on p.id = s.plan_id
  where s.client_id = p_client_id
    and s.status = 'active'
    and s.start_date <= we
    and (s.end_date is null or s.end_date >= ws);

  select coalesce(sum(extract(epoch from (end_at - start_at))/60), 0)::int
    into used_min
  from room_bookings
  where client_id = p_client_id
    and status = 'confirmed'
    and start_at >= ws::timestamptz
    and start_at < (we + 1)::timestamptz;

  return query select ws, we, inc_min, used_min, greatest(inc_min - used_min, 0);
end;
$$;

-- =========================
-- Trigger handle_new_user: link cliente si email coincide
-- =========================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_client_id uuid;
  v_role user_role;
begin
  select id into v_client_id from clients where lower(email) = lower(new.email) limit 1;
  if v_client_id is not null then
    v_role := 'client';
    update clients set auth_user_id = new.id where id = v_client_id and auth_user_id is null;
  elsif new.email = 'crovettopro@gmail.com' then
    v_role := 'super_admin';
  else
    v_role := 'staff';
  end if;
  insert into public.profiles (id, email, name, role)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), v_role)
    on conflict (id) do nothing;
  return new;
end;
$$;

-- =========================
-- RLS
-- =========================
alter table meeting_rooms enable row level security;
alter table room_bookings enable row level security;

drop policy if exists meeting_rooms_select on meeting_rooms;
create policy meeting_rooms_select on meeting_rooms for select using (
  is_super_admin()
  or coworking_id = current_coworking_id()
  or coworking_id = (select coworking_id from clients where id = current_client_id())
);
drop policy if exists meeting_rooms_write on meeting_rooms;
create policy meeting_rooms_write on meeting_rooms for all using (
  is_super_admin() or coworking_id = current_coworking_id()
) with check (
  is_super_admin() or coworking_id = current_coworking_id()
);

drop policy if exists room_bookings_select on room_bookings;
create policy room_bookings_select on room_bookings for select using (
  is_super_admin()
  or coworking_id = current_coworking_id()
  or client_id = current_client_id()
);
drop policy if exists room_bookings_insert on room_bookings;
create policy room_bookings_insert on room_bookings for insert with check (
  is_super_admin()
  or coworking_id = current_coworking_id()
  or client_id = current_client_id()
);
drop policy if exists room_bookings_update on room_bookings;
create policy room_bookings_update on room_bookings for update using (
  is_super_admin()
  or coworking_id = current_coworking_id()
  or client_id = current_client_id()
) with check (
  is_super_admin()
  or coworking_id = current_coworking_id()
  or client_id = current_client_id()
);
drop policy if exists room_bookings_delete on room_bookings;
create policy room_bookings_delete on room_bookings for delete using (
  is_super_admin()
  or coworking_id = current_coworking_id()
  or client_id = current_client_id()
);

-- =========================
-- Seed: 4 salas iniciales
-- =========================
insert into meeting_rooms (coworking_id, name, capacity, color, sort_order)
select c.id, 'Denia', 10, '#7c5cff', 1 from coworkings c where c.name = 'Puerta del Mar'
on conflict (coworking_id, name) do nothing;

insert into meeting_rooms (coworking_id, name, capacity, color, sort_order)
select c.id, 'Calpe', 2, '#ff8a3d', 2 from coworkings c where c.name = 'Puerta del Mar'
on conflict (coworking_id, name) do nothing;

insert into meeting_rooms (coworking_id, name, capacity, color, sort_order)
select c.id, 'Thinking', 6, '#22c55e', 1 from coworkings c where c.name = 'Ruzafa'
on conflict (coworking_id, name) do nothing;

insert into meeting_rooms (coworking_id, name, capacity, color, sort_order)
select c.id, 'Discovery', 4, '#06b6d4', 2 from coworkings c where c.name = 'Ruzafa'
on conflict (coworking_id, name) do nothing;
