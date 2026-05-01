-- Monitor es un alquiler de extra (pantalla), no una suscripción.
-- Se gestiona vía client_extras / extras. Limpiamos las subs erróneas creadas
-- durante el reimport.
DELETE FROM subscriptions WHERE plan_name = 'Monitor';
