-- RPCs públicas que el portal de clientes (sin auth Supabase) necesita.
-- Las tablas coworkings/clients/subscriptions tienen RLS que filtra por
-- super_admin o current_coworking_id — anónimo no puede leer nada. Estos
-- wrappers SECURITY DEFINER exponen solo lo mínimo para los flujos del portal.

CREATE OR REPLACE FUNCTION public.portal_list_coworkings()
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT cw.id, cw.name FROM coworkings cw ORDER BY cw.name;
$$;

CREATE OR REPLACE FUNCTION public.portal_clients_with_active_sub(
  p_coworking_id uuid
)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT c.id, c.name
  FROM clients c
  JOIN subscriptions s ON s.client_id = c.id
  WHERE c.coworking_id = p_coworking_id
    AND s.status = 'active'::subscription_status
    AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE - INTERVAL '7 days')
  ORDER BY c.name;
$$;

CREATE OR REPLACE FUNCTION public.portal_validate_client(
  p_client_id uuid,
  p_coworking_id uuid
)
RETURNS TABLE(client_id uuid, client_name text, client_email text, coworking_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_client clients%rowtype;
  v_cw_name text;
  v_has_valid boolean;
begin
  select * into v_client from clients
   where id = p_client_id and coworking_id = p_coworking_id
   limit 1;
  if not found then
    raise exception 'CLIENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  select exists (
    select 1 from subscriptions s
    where s.client_id = p_client_id
      and s.status = 'active'
      and (s.end_date is null or s.end_date >= CURRENT_DATE - INTERVAL '7 days')
  ) into v_has_valid;
  if not v_has_valid then
    raise exception 'NO_ACTIVE_SUB' using errcode = 'P0002';
  end if;

  select cw.name into v_cw_name from coworkings cw where cw.id = p_coworking_id;

  return query select v_client.id, v_client.name, COALESCE(v_client.email, ''), COALESCE(v_cw_name, '');
end;
$$;
