-- =====================================================================
-- 0004 — Caja efectivo, oficina virtual, inventario real, trigger gross
-- =====================================================================

-- 1. Tabla cash_register: float manual de efectivo por coworking
create table if not exists cash_register (
  id uuid primary key default gen_random_uuid(),
  coworking_id uuid not null references coworkings(id) on delete cascade,
  cash_float numeric(10,2) not null default 0,
  notes text,
  updated_at timestamptz not null default now(),
  unique(coworking_id)
);

alter table cash_register enable row level security;

drop policy if exists cash_register_select on cash_register;
create policy cash_register_select on cash_register for select using (
  is_super_admin() or coworking_id = current_coworking_id()
);
drop policy if exists cash_register_write on cash_register;
create policy cash_register_write on cash_register for all using (
  is_super_admin() or coworking_id = current_coworking_id()
) with check (
  is_super_admin() or coworking_id = current_coworking_id()
);

-- Inicializar floats: Ruzafa 755, PDM 797
insert into cash_register (coworking_id, cash_float)
select id, case when name = 'Ruzafa' then 755 when name = 'Puerta del Mar' then 797 else 0 end
from coworkings where name in ('Ruzafa','Puerta del Mar')
on conflict (coworking_id) do update set cash_float = excluded.cash_float, updated_at = now();

-- 2. Plans: añadir Oficina Virtual y Oficina (custom) a cada coworking activo
insert into plans (coworking_id, name, plan_type, default_price, billing_cycle, duration_days, vat_rate, description, is_active)
select c.id, 'Oficina Virtual', 'virtual_office'::plan_type, 24.20, 'monthly'::billing_cycle, 30, 21, 'Domicilio fiscal y recepción de paquetería', true
from coworkings c where c.status = 'active' and not exists (
  select 1 from plans p where p.coworking_id = c.id and p.plan_type = 'virtual_office'
);

insert into plans (coworking_id, name, plan_type, default_price, billing_cycle, duration_days, vat_rate, description, is_active)
select c.id, 'Oficina', 'office'::plan_type, 0, 'monthly'::billing_cycle, 30, 21, 'Oficina mensual personalizada por cliente', true
from coworkings c where c.status = 'active' and not exists (
  select 1 from plans p where p.coworking_id = c.id and p.plan_type = 'office'
);

-- 3. Inventario real de extras
-- Ruzafa: 12 taquillas + 4 monitores
with cw as (select id from coworkings where name = 'Ruzafa' limit 1)
insert into extras (coworking_id, type, identifier, monthly_price, status)
select (select id from cw), 'locker'::extra_type, 'TQ-' || lpad(g::text, 2, '0'), 15, 'available'::extra_status
from generate_series(1, 12) g
where not exists (select 1 from extras e where e.coworking_id = (select id from cw) and e.type = 'locker' and e.identifier = 'TQ-' || lpad(g::text, 2, '0'));

with cw as (select id from coworkings where name = 'Ruzafa' limit 1)
insert into extras (coworking_id, type, identifier, monthly_price, status)
select (select id from cw), 'screen'::extra_type, 'MON-' || g, 35, 'available'::extra_status
from generate_series(1, 4) g
where not exists (select 1 from extras e where e.coworking_id = (select id from cw) and e.type = 'screen' and e.identifier = 'MON-' || g);

-- Puerta del Mar: 8 taquillas + 4 monitores
with cw as (select id from coworkings where name = 'Puerta del Mar' limit 1)
insert into extras (coworking_id, type, identifier, monthly_price, status)
select (select id from cw), 'locker'::extra_type, 'TQ-' || lpad(g::text, 2, '0'), 15, 'available'::extra_status
from generate_series(1, 8) g
where not exists (select 1 from extras e where e.coworking_id = (select id from cw) and e.type = 'locker' and e.identifier = 'TQ-' || lpad(g::text, 2, '0'));

with cw as (select id from coworkings where name = 'Puerta del Mar' limit 1)
insert into extras (coworking_id, type, identifier, monthly_price, status)
select (select id from cw), 'screen'::extra_type, 'MON-' || g, 35, 'available'::extra_status
from generate_series(1, 4) g
where not exists (select 1 from extras e where e.coworking_id = (select id from cw) and e.type = 'screen' and e.identifier = 'MON-' || g);

-- 4. Trigger: el pago auto-creado debe ser bruto (con IVA)
create or replace function autocreate_payment_for_subscription()
returns trigger language plpgsql security definer set search_path = public as $func$
declare
  v_month date := date_trunc('month', new.start_date)::date;
  v_concept text := coalesce(nullif(new.notes, ''), 'Cuota ' || new.plan_name);
  v_gross numeric := gross_price(new.final_price, coalesce(new.tax_treatment, 'standard'::tax_treatment), coalesce(new.vat_rate, 21));
begin
  insert into payments (
    client_id, coworking_id, subscription_id,
    month, concept,
    expected_amount, paid_amount, status,
    expected_payment_date, payment_method
  ) values (
    new.client_id, new.coworking_id, new.id,
    v_month, v_concept,
    v_gross, 0, 'pending'::payment_status,
    new.start_date, new.payment_method
  );
  return new;
end;
$func$;
