-- Unifica variantes "Oficina mensual" → "Oficina Mensual" y plan "Oficina" → "Oficina Mensual"
-- (en BBDD prod ya aplicado vía mcp el 2026-05-01; este archivo persiste el cambio en migrations)
UPDATE subscriptions SET plan_name = 'Oficina Mensual' WHERE plan_name = 'Oficina mensual';
UPDATE payments SET concept = 'Oficina Mensual' WHERE concept = 'Oficina mensual';
UPDATE invoices SET concept = 'Oficina Mensual' WHERE concept = 'Oficina mensual';
UPDATE plans SET name = 'Oficina Mensual' WHERE LOWER(name) = 'oficina';
