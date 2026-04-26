-- =====================================================================
-- 0002 — Duraciones de planes + auto-creación de pago + helpers
-- =====================================================================

-- 1. Plans: duración en días para autocalcular fecha fin
alter table plans add column if not exists duration_days int;

update plans set duration_days = case
  when plan_type in ('day_pass','half_day_pass') then 1
  when plan_type = 'week_pass' then 7
  when billing_cycle = 'monthly' then 30
  else null
end
where duration_days is null;

-- 2. Profiles: created_by para saber quién dio de alta a un usuario
alter table profiles add column if not exists invited_by uuid references profiles(id);

-- 3. Incidents: created_by para saber quién la abrió
alter table incidents add column if not exists created_by uuid references profiles(id) on delete set null;

-- 4. Trigger: cuando se crea una suscripción, auto-crear el pago previsto en estado 'pending'
create or replace function autocreate_payment_for_subscription()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_month date := date_trunc('month', new.start_date)::date;
begin
  insert into payments (
    client_id, coworking_id, subscription_id,
    month, concept,
    expected_amount, paid_amount, status,
    expected_payment_date, payment_method
  ) values (
    new.client_id, new.coworking_id, new.id,
    v_month, 'Cuota ' || new.plan_name,
    new.final_price, 0, 'pending'::payment_status,
    new.start_date, new.payment_method
  );
  return new;
end;
$$;

drop trigger if exists trg_autocreate_payment on subscriptions;
create trigger trg_autocreate_payment
after insert on subscriptions
for each row
when (new.status = 'active')
execute function autocreate_payment_for_subscription();

-- 5. Vista materializada de "estado real" del cliente:
--    activo  → tiene suscripción activa con pago al día
--    impago  → suscripción activa con pago pendiente vencido > 4 días
--    inactivo → sin suscripción activa (manual baja o nunca tuvo)
create or replace view client_derived_status as
select
  c.id as client_id,
  case
    when c.status = 'inactive' then 'inactive'
    when exists (
      select 1 from payments p
       where p.client_id = c.id
         and p.status = 'pending'
         and p.expected_payment_date is not null
         and p.expected_payment_date < (current_date - interval '4 days')
    ) then 'overdue'
    when exists (
      select 1 from subscriptions s
       where s.client_id = c.id and s.status = 'active'
         and (s.end_date is null or s.end_date >= current_date)
    ) then 'active'
    else 'pending'
  end as derived_status
from clients c;

-- View permission
grant select on client_derived_status to anon, authenticated;
