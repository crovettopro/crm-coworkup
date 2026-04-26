-- =====================================================================
-- Cowork Up CRM — Demo data
-- Run AFTER 0001_init.sql. Safe to run on an empty database.
-- =====================================================================

-- Demo clients
with cw1 as (select id from coworkings where name = 'Cowork Up — Coworking 1' limit 1),
     cw2 as (select id from coworkings where name = 'Cowork Up — Coworking 2' limit 1)
insert into clients (coworking_id, client_type, name, company_name, email, phone, status, start_date, source)
select (select id from cw1), 'individual'::client_type, 'Ana García',     null,                'ana@example.com',     '+34 600 000 001', 'active'::client_status,  current_date - interval '120 days', 'Web' union all
select (select id from cw1), 'individual'::client_type, 'Mateo Pérez',    null,                'mateo@example.com',   '+34 600 000 002', 'active'::client_status,  current_date - interval '90 days',  'Referido' union all
select (select id from cw1), 'company'::client_type,    'Acme Studio',    'Acme Studio S.L.',  'hola@acme.com',       '+34 910 000 001', 'active'::client_status,  current_date - interval '60 days',  'Instagram' union all
select (select id from cw1), 'individual'::client_type, 'Lucía Romero',   null,                'lucia@example.com',   '+34 600 000 003', 'overdue'::client_status, current_date - interval '180 days', 'Web' union all
select (select id from cw2), 'individual'::client_type, 'Diego Fernández', null,               'diego@example.com',   '+34 600 000 004', 'active'::client_status,  current_date - interval '40 days',  'Web' union all
select (select id from cw2), 'company'::client_type,    'Northwind Labs', 'Northwind Labs SL', 'team@northwind.com',  '+34 910 000 002', 'active'::client_status,  current_date - interval '20 days',  'LinkedIn' union all
select (select id from cw2), 'individual'::client_type, 'Paula Marín',    null,                'paula@example.com',   '+34 600 000 005', 'inactive'::client_status, current_date - interval '300 days', 'Web';

-- Mark Paula's churn date so it counts as a recent baja
update clients set end_date = current_date - interval '5 days', cancellation_reason = 'Mudanza' where email = 'paula@example.com';

-- Subscriptions
insert into subscriptions (client_id, coworking_id, plan_id, plan_name, base_price, final_price, start_date, status)
select c.id,
       c.coworking_id,
       case
         when c.client_type = 'company' then (select id from plans where name='Oficina' limit 1)
         when c.email = 'mateo@example.com' then (select id from plans where name='Flexible' limit 1)
         else (select id from plans where name='Fijo' limit 1)
       end,
       case
         when c.client_type = 'company' then 'Oficina'
         when c.email = 'mateo@example.com' then 'Flexible'
         else 'Fijo'
       end,
       case
         when c.client_type = 'company' then 650
         when c.email = 'mateo@example.com' then 180
         else 280
       end::numeric,
       case
         when c.client_type = 'company' then 650
         when c.email = 'mateo@example.com' then 180
         else 280
       end::numeric,
       coalesce(c.start_date, current_date),
       (case when c.status = 'inactive' then 'cancelled' else 'active' end)::subscription_status
from clients c
where c.email in ('ana@example.com','mateo@example.com','hola@acme.com','lucia@example.com','diego@example.com','team@northwind.com','paula@example.com');

-- Current month payments
insert into payments (client_id, coworking_id, subscription_id, month, concept, expected_amount, paid_amount, status, expected_payment_date, paid_at, payment_method)
select s.client_id,
       s.coworking_id,
       s.id,
       date_trunc('month', current_date)::date,
       'Cuota mensual ' || s.plan_name,
       s.final_price,
       case
         when s.status = 'cancelled' then 0
         when s.client_id in (select id from clients where email = 'lucia@example.com') then 0
         else s.final_price
       end,
       (case
         when s.status = 'cancelled' then 'cancelled'
         when s.client_id in (select id from clients where email = 'lucia@example.com') then 'overdue'
         else 'paid'
       end)::payment_status,
       date_trunc('month', current_date)::date + 4,
       case
         when s.status = 'cancelled' or s.client_id in (select id from clients where email = 'lucia@example.com') then null
         else date_trunc('month', current_date)::date + 2
       end,
       'transfer'::payment_method
from subscriptions s;

-- Extras catalog
with cw1 as (select id from coworkings where name = 'Cowork Up — Coworking 1' limit 1),
     cw2 as (select id from coworkings where name = 'Cowork Up — Coworking 2' limit 1)
insert into extras (coworking_id, type, identifier, monthly_price, status)
select (select id from cw1), 'locker'::extra_type,  'TQ-01', 15, 'rented'::extra_status    union all
select (select id from cw1), 'locker'::extra_type,  'TQ-02', 15, 'available'::extra_status union all
select (select id from cw1), 'screen'::extra_type,  'PT-01', 35, 'rented'::extra_status    union all
select (select id from cw2), 'locker'::extra_type,  'TQ-10', 15, 'rented'::extra_status    union all
select (select id from cw2), 'screen'::extra_type,  'PT-10', 35, 'available'::extra_status;

-- Client extras assignments
insert into client_extras (client_id, coworking_id, extra_id, price, start_date, status)
select c.id, c.coworking_id, e.id, e.monthly_price, current_date - interval '30 days', 'rented'::extra_status
from clients c
join extras e on e.coworking_id = c.coworking_id
where c.email = 'ana@example.com' and e.identifier = 'TQ-01';

insert into client_extras (client_id, coworking_id, extra_id, price, start_date, status)
select c.id, c.coworking_id, e.id, e.monthly_price, current_date - interval '15 days', 'rented'::extra_status
from clients c
join extras e on e.coworking_id = c.coworking_id
where c.email = 'hola@acme.com' and e.identifier = 'PT-01';

insert into client_extras (client_id, coworking_id, extra_id, price, start_date, status)
select c.id, c.coworking_id, e.id, e.monthly_price, current_date - interval '10 days', 'rented'::extra_status
from clients c
join extras e on e.coworking_id = c.coworking_id
where c.email = 'diego@example.com' and e.identifier = 'TQ-10';

-- Incidents
with cw1 as (select id from coworkings where name = 'Cowork Up — Coworking 1' limit 1),
     cw2 as (select id from coworkings where name = 'Cowork Up — Coworking 2' limit 1)
insert into incidents (coworking_id, title, description, type, priority, status, responsible, estimated_cost)
select (select id from cw1), 'Aire acondicionado sala 2', 'No enfría en horario de tarde', 'climate'::incident_type, 'high'::incident_priority, 'open'::incident_status, 'Pedro (Manager 1)', 180 union all
select (select id from cw2), 'Cambio de cerradura puerta principal', 'Solicitud por seguridad', 'access'::incident_type, 'medium'::incident_priority, 'in_progress'::incident_status, 'Marta (Manager 2)', 90;

-- Invoices for active subscriptions
insert into invoices (client_id, coworking_id, month, invoice_number, concept, taxable_base, vat_amount, total_amount, status, issue_date, due_date)
select s.client_id, s.coworking_id,
       date_trunc('month', current_date)::date,
       'CW-' || lpad((row_number() over ())::text, 4, '0'),
       'Cuota ' || s.plan_name,
       s.final_price,
       round(s.final_price * 0.21, 2),
       round(s.final_price * 1.21, 2),
       (case when s.status = 'cancelled' then 'cancelled' else 'issued' end)::invoice_status,
       date_trunc('month', current_date)::date + 1,
       date_trunc('month', current_date)::date + 10
from subscriptions s
where s.status = 'active';
