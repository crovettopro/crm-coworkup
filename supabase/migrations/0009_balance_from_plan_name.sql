-- =====================================================================
-- Cowork Up CRM — 0009: Balance correcto con plan_name + quantity
-- =====================================================================
-- En la BD real, las 171 suscripciones activas tienen plan_id = NULL.
-- El plan vive como texto en `subscriptions.plan_name` y la cantidad
-- de unidades que tiene el cliente en `subscriptions.quantity`.
--
-- La función anterior (0006/0008) intentaba leer
-- plans.included_meeting_hours_weekly vía JOIN por plan_id, que siempre
-- daba NULL → fallback de 1h aplicado a TODO el mundo. Resultado:
-- Agencia Magnet (Fijo × 2 = debería 6h) marcaba 1h.
--
-- Reescribimos la función para:
--   1) Mapear plan_name → horas/semana directamente (case insensitive).
--      Coincide con la regla de negocio: Fijo=3, Flexible=2, resto=1.
--   2) Multiplicar por subscriptions.quantity.
--   3) Respetar meeting_hours_override por sub si está definido (caso
--      cliente con regla especial). El override es absoluto, no se
--      multiplica por quantity.
-- =====================================================================

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
      coalesce(
        s.meeting_hours_override,
        (
          case
            when lower(s.plan_name) = 'fijo' then 3
            when lower(s.plan_name) = 'flexible' then 2
            else 1
          end
        ) * coalesce(s.quantity, 1)
      ) * 60
    ),
    0
  )::int into inc_min
  from subscriptions s
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
