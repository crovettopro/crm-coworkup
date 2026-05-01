-- Variante de quick_book_room que acepta client_id directamente.
-- Necesario para el flujo /portal/select donde el cliente NO se identifica
-- por email (puede no tener email registrado en BBDD). Usa la cookie con
-- clientId que el endpoint /api/portal/select setea tras validar la sub.
-- (Ya aplicada en BBDD prod via mcp.)
CREATE OR REPLACE FUNCTION public.quick_book_room_by_client_id(
  p_client_id uuid,
  p_room_id uuid,
  p_start_at timestamp with time zone,
  p_end_at timestamp with time zone
)
RETURNS TABLE(booking_id uuid, client_id uuid, start_at timestamp with time zone, end_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_client clients%rowtype;
  v_room meeting_rooms%rowtype;
  v_booking_id uuid;
  v_dur_min numeric;
begin
  select * into v_client from clients
   where id = p_client_id
     and status in ('active','pending','overdue')
   limit 1;
  if not found then
    raise exception 'CLIENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  select * into v_room from meeting_rooms where id = p_room_id and is_active;
  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_room.coworking_id <> v_client.coworking_id then
    raise exception 'ROOM_DIFFERENT_COWORKING' using errcode = 'P0003';
  end if;

  if p_end_at <= p_start_at then
    raise exception 'INVALID_TIME_RANGE' using errcode = 'P0004';
  end if;
  v_dur_min := extract(epoch from (p_end_at - p_start_at)) / 60;
  if v_dur_min < 15 then
    raise exception 'DURATION_TOO_SHORT' using errcode = 'P0005';
  end if;
  if v_dur_min > 360 then
    raise exception 'DURATION_TOO_LONG' using errcode = 'P0006';
  end if;
  if p_start_at < (now() - interval '5 minutes') then
    raise exception 'START_IN_PAST' using errcode = 'P0007';
  end if;

  insert into room_bookings (
    room_id, coworking_id, client_id,
    start_at, end_at, status, source
  ) values (
    v_room.id, v_room.coworking_id, v_client.id,
    p_start_at, p_end_at, 'confirmed', 'client'
  ) returning id into v_booking_id;

  return query
    select v_booking_id, v_client.id, p_start_at, p_end_at;
end;
$function$;
