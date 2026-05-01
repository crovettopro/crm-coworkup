-- Solo contar como "venta del mes" lo ejecutado (paid o partial).
-- Pendientes/overdue NO son ventas hasta que se cobran — viven en su panel propio.
-- (Coherente con el filtro nuevo en el código de /dashboard.)
DROP MATERIALIZED VIEW IF EXISTS monthly_sales_mv CASCADE;
CREATE MATERIALIZED VIEW monthly_sales_mv AS
SELECT
  coworking_id,
  to_char(COALESCE(expected_payment_date, paid_at)::timestamp, 'YYYY-MM') AS month_key,
  date_trunc('month', COALESCE(expected_payment_date, paid_at)::timestamp)::date AS month_start,
  SUM(expected_amount)::numeric(12,2) AS total
FROM payments
WHERE COALESCE(expected_payment_date, paid_at) IS NOT NULL
  AND status IN ('paid'::payment_status, 'partial'::payment_status)
GROUP BY coworking_id, month_key, month_start;

CREATE UNIQUE INDEX monthly_sales_mv_pk ON monthly_sales_mv (coworking_id, month_key);

CREATE OR REPLACE VIEW monthly_sales_view AS
SELECT coworking_id, month_key, month_start, total FROM monthly_sales_mv;
