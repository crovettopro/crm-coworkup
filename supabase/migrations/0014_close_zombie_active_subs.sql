-- Cerrar subs zombi: clientes con 2+ subs status='active' (excepto excepción OV+otra).
-- Regla del modelo: 1 sub activa por cliente como máximo (Of. Virtual + otra es la única excepción).
-- (En BBDD prod ya aplicado vía mcp el 2026-05-01.)
UPDATE subscriptions
SET status = 'cancelled'
WHERE status = 'active'
  AND client_id IN (
    SELECT client_id FROM subscriptions WHERE status = 'active'
    GROUP BY client_id HAVING COUNT(*) >= 2
  )
  AND client_id != (SELECT id FROM clients WHERE name = 'Jordi Aguilar')
  AND id NOT IN (
    SELECT DISTINCT ON (client_id) id
    FROM subscriptions WHERE status = 'active'
    ORDER BY client_id, end_date DESC NULLS LAST
  );
