-- Dashboard "Suscripciones activas por tipo" debe contar FILAS de subs (coherente con /subscriptions)
-- Antes: SUM(quantity) — un cliente con quantity=12 (Ayuda en Acción) inflaba el conteo.
-- Ahora: COUNT(*) — cada sub cuenta como 1, igual que en la lista.
DROP MATERIALIZED VIEW IF EXISTS dashboard_subs_by_plan_mv;
CREATE MATERIALIZED VIEW dashboard_subs_by_plan_mv AS
SELECT
  coworking_id,
  plan_name,
  COUNT(*)::integer AS count
FROM subscriptions
WHERE status = 'active'::subscription_status
  AND (end_date IS NULL OR end_date >= (CURRENT_DATE - '7 days'::interval))
GROUP BY coworking_id, plan_name;
CREATE UNIQUE INDEX dashboard_subs_by_plan_mv_pk ON dashboard_subs_by_plan_mv (coworking_id, plan_name);
