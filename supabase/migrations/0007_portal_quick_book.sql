-- =====================================================================
-- Cowork Up CRM — 0007: Portal sin login (quick book por email)
-- Funciones SECURITY DEFINER para que clientes reserven/cancelen/
-- consulten introduciendo sólo su email, sin pasar por Supabase Auth.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper: normalizar email
-- ---------------------------------------------------------------------
create or replace function _norm_email(p text)
returns text language sql immutable set search_path = public as $$
  select lower(trim(coalesce(p, '')))
$$;

-- ---------------------------------------------------------------------
-- Devuelve la ficha del cliente que coincide con el email (case-insensitive)
-- Sólo expone campos no sensibles: id, name, coworking_id, plan_label.
-- ---------------------------------------------------------------------
create or replace function quick_get_client(p_email text)
returns table (
  id uuid,
  name text,
  coworking_id uuid,
  coworking_name text
) language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.coworking_id, cw.name
  from clients c
  left join coworkings cw on cw.id = c.coworking_id
  where lower(c.email) = _norm_email(p_email)
    and c.status in ('active','pending','overdue')
  limit 1
$$;

-- ---------------------------------------------------------------------
-- Crea una reserva. Valida:
-- - email existe y cliente activo
-- - sala pertenece al mismo coworking que el cliente
-- - inicio en el futuro (hasta -5 min para tolerancia de reloj)
-- - duración mínima 15 min, máxima 6h
-- - constraint EXCLUDE de la tabla bloquea overlaps automáticamente
--
-- Devuelve el booking creado o lanza excepción con mensaje legible.
-- ---------------------------------------------------------------------
create or replace function quick_book_room(
  p_email text,
  p_room_id uuid,
  p_start_at timestamptz,
  p_end_at timestamptz
) returns table (
  booking_id uuid,
  client_id uuid,
  start_at timestamptz,
  end_at timestamptz
) language plpgsql security definer set search_path = public as $$
declare
  v_client clients%rowtype;
  v_room meeting_rooms%rowtype;
  v_booking_id uuid;
  v_dur_min numeric;
begin
  -- 1) Cliente
  select * into v_client from clients
   where lower(email) = _norm_email(p_email)
     and status in ('active','pending','overdue')
   limit 1;
  if not found then
    raise exception 'EMAIL_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- 2) Sala
  select * into v_room from meeting_rooms where id = p_room_id and is_active;
  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- 3) Coworking match
  if v_room.coworking_id <> v_client.coworking_id then
    raise exception 'ROOM_DIFFERENT_COWORKING' using errcode = 'P0003';
  end if;

  -- 4) Tiempo válido
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

  -- 5) Insertar (la EXCLUDE constraint de la tabla bloquea overlaps con 23P01)
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
$$;

-- ---------------------------------------------------------------------
-- Cancela una reserva. Sólo si pertenece al cliente cuyo email se pasa.
-- ---------------------------------------------------------------------
create or replace function quick_cancel_booking(
  p_email text,
  p_booking_id uuid
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_client_id uuid;
  v_owner_id uuid;
begin
  select id into v_client_id from clients
   where lower(email) = _norm_email(p_email)
   limit 1;
  if v_client_id is null then
    raise exception 'EMAIL_NOT_FOUND' using errcode = 'P0001';
  end if;

  select client_id into v_owner_id from room_bookings where id = p_booking_id;
  if v_owner_id is null then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0008';
  end if;
  if v_owner_id <> v_client_id then
    raise exception 'NOT_OWNER' using errcode = 'P0009';
  end if;

  update room_bookings
     set status = 'cancelled', cancelled_at = now()
   where id = p_booking_id and status = 'confirmed';

  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- Lista las reservas del cliente (próximas y pasadas, máx 50).
-- Devuelve también el nombre y color de la sala.
-- ---------------------------------------------------------------------
create or replace function quick_list_bookings(p_email text)
returns table (
  id uuid,
  start_at timestamptz,
  end_at timestamptz,
  status room_booking_status,
  source room_booking_source,
  notes text,
  room_id uuid,
  room_name text,
  room_color text,
  room_capacity int
) language sql stable security definer set search_path = public as $$
  select b.id, b.start_at, b.end_at, b.status, b.source, b.notes,
         mr.id, mr.name, mr.color, mr.capacity
  from room_bookings b
  join meeting_rooms mr on mr.id = b.room_id
  where b.client_id = (
    select id from clients
     where lower(email) = _norm_email(p_email) limit 1
  )
  order by b.start_at desc
  limit 50
$$;

-- ---------------------------------------------------------------------
-- Reservas confirmadas del día para una sala (vista pública anónima
-- para pintar la timeline ANTES de identificarse). Sólo devuelve
-- horarios; no expone client_id, email ni nombre.
-- ---------------------------------------------------------------------
create or replace function room_bookings_for_day(
  p_room_id uuid,
  p_day date
) returns table (
  start_at timestamptz,
  end_at timestamptz
) language sql stable security definer set search_path = public as $$
  select start_at, end_at
  from room_bookings
  where room_id = p_room_id
    and status = 'confirmed'
    and start_at >= p_day::timestamptz
    and start_at <  (p_day + 1)::timestamptz
$$;

-- ---------------------------------------------------------------------
-- Reservas de TODAS las salas de un coworking en un día concreto.
-- Devuelve sólo horarios + room_id (sin client_id ni nombres).
-- ---------------------------------------------------------------------
create or replace function coworking_bookings_for_day(
  p_coworking_id uuid,
  p_day date
) returns table (
  room_id uuid,
  start_at timestamptz,
  end_at timestamptz
) language sql stable security definer set search_path = public as $$
  select room_id, start_at, end_at
  from room_bookings
  where coworking_id = p_coworking_id
    and status = 'confirmed'
    and start_at >= p_day::timestamptz
    and start_at <  (p_day + 1)::timestamptz
$$;

-- ---------------------------------------------------------------------
-- Lista las salas activas de un coworking (para pintar selector
-- antes de identificarse). Devuelve sólo info pública.
-- ---------------------------------------------------------------------
create or replace function rooms_for_coworking(p_coworking_id uuid)
returns table (
  id uuid,
  name text,
  capacity int,
  color text,
  sort_order int
) language sql stable security definer set search_path = public as $$
  select id, name, capacity, color, sort_order
  from meeting_rooms
  where coworking_id = p_coworking_id and is_active
  order by sort_order, name
$$;

-- ---------------------------------------------------------------------
-- Helper público: dado un room_id, devuelve datos básicos de la sala
-- (sin requerir saber el coworking de antemano; lo necesita el QR
-- deep-link).
-- ---------------------------------------------------------------------
create or replace function room_info(p_room_id uuid)
returns table (
  id uuid,
  name text,
  capacity int,
  color text,
  coworking_id uuid,
  coworking_name text
) language sql stable security definer set search_path = public as $$
  select mr.id, mr.name, mr.capacity, mr.color, mr.coworking_id, cw.name
  from meeting_rooms mr
  left join coworkings cw on cw.id = mr.coworking_id
  where mr.id = p_room_id and mr.is_active
$$;

-- ---------------------------------------------------------------------
-- Permisos: las funciones son SECURITY DEFINER y pueden ser llamadas
-- por anon. Las funciones validan ellas mismas las reglas de negocio.
-- ---------------------------------------------------------------------
grant execute on function quick_get_client(text) to anon, authenticated;
grant execute on function quick_book_room(text, uuid, timestamptz, timestamptz) to anon, authenticated;
grant execute on function quick_cancel_booking(text, uuid) to anon, authenticated;
grant execute on function quick_list_bookings(text) to anon, authenticated;
grant execute on function room_bookings_for_day(uuid, date) to anon, authenticated;
grant execute on function coworking_bookings_for_day(uuid, date) to anon, authenticated;
grant execute on function rooms_for_coworking(uuid) to anon, authenticated;
grant execute on function room_info(uuid) to anon, authenticated;
