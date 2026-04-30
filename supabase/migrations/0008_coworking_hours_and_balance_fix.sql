-- =====================================================================
-- Cowork Up CRM — 0008: Horario por coworking + saldo robusto
-- =====================================================================

-- ---------------------------------------------------------------------
-- Horario de apertura por coworking (en minutos del día)
-- 480 = 08:00, 1200 = 20:00, 1230 = 20:30
-- ---------------------------------------------------------------------
alter table coworkings
  add column if not exists open_min int not null default 480,
  add column if not exists close_min int not null default 1320;

update coworkings set open_min = 480, close_min = 1230 where name = 'Ruzafa';
update coworkings set open_min = 480, close_min = 1200 where name = 'Puerta del Mar';

-- ---------------------------------------------------------------------
-- coworking_info(p_id): RPC pública con metadata + horario.
-- Permite que el portal anónimo pinte el grid con las horas correctas.
-- ---------------------------------------------------------------------
create or replace function coworking_info(p_id uuid)
returns table (
  id uuid,
  name text,
  open_min int,
  close_min int
) language sql stable security definer set search_path = public as $$
  select id, name, open_min, close_min
  from coworkings
  where id = p_id
$$;
grant execute on function coworking_info(uuid) to anon, authenticated;

-- room_info: añadir open_min/close_min para que con un ?room=<id> ya
-- tengamos también el horario sin tener que hacer otra llamada.
-- Postgres requiere DROP cuando cambias el return type.
drop function if exists room_info(uuid);
create or replace function room_info(p_room_id uuid)
returns table (
  id uuid,
  name text,
  capacity int,
  color text,
  coworking_id uuid,
  coworking_name text,
  open_min int,
  close_min int
) language sql stable security definer set search_path = public as $$
  select mr.id, mr.name, mr.capacity, mr.color, mr.coworking_id,
         cw.name, cw.open_min, cw.close_min
  from meeting_rooms mr
  left join coworkings cw on cw.id = mr.coworking_id
  where mr.id = p_room_id and mr.is_active
$$;
grant execute on function room_info(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- client_meeting_hours_balance: SECURITY DEFINER + fallback de 1h
-- cuando ni `meeting_hours_override` ni `included_meeting_hours_weekly`
-- estén disponibles (ej. suscripciones legacy con plan_id NULL).
-- Esto evita el bug "0 horas" para clientes con datos importados
-- antes de la migration 0006.
-- ---------------------------------------------------------------------
create or replace function client_meeting_hours_balance(
  p_client_id uuid,
  p_week_anchor date default current_date
) returns table (
  week_start date,
  week_end date,
  included_minutes int,
  used_minutes int,
  remaining_minutes int
) language plpgsql stable security definer set search_path = public as $$
declare
  ws date;
  we date;
  inc_min int;
  used_min int;
begin
  ws := date_trunc('week', p_week_anchor)::date; -- ISO: lunes
  we := ws + 6;

  select coalesce(
    sum(
      coalesce(s.meeting_hours_override, p.included_meeting_hours_weekly, 1)
    ) * 60, 0
  )::int into inc_min
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
grant execute on function client_meeting_hours_balance(uuid, date) to anon, authenticated;
