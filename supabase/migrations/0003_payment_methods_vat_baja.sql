-- =====================================================================
-- 0003 — Métodos de pago (Stripe/SEPA), tax_treatment, baja programada
-- =====================================================================

-- 1. Añadir nuevos métodos de pago al enum
do $$ begin
  if not exists (select 1 from pg_enum where enumtypid = 'payment_method'::regtype and enumlabel = 'stripe') then
    alter type payment_method add value 'stripe';
  end if;
  if not exists (select 1 from pg_enum where enumtypid = 'payment_method'::regtype and enumlabel = 'sepa') then
    alter type payment_method add value 'sepa';
  end if;
end $$;

-- Migrar valores antiguos: direct_debit → sepa
update payments      set payment_method = 'sepa' where payment_method = 'direct_debit';
update subscriptions set payment_method = 'sepa' where payment_method = 'direct_debit';

-- 2. Tax treatment para suscripciones e ingresos
do $$ begin
  if not exists (select 1 from pg_type where typname = 'tax_treatment') then
    create type tax_treatment as enum ('standard', 'reverse_charge', 'intracom', 'exempt');
  end if;
end $$;

alter table clients       add column if not exists tax_treatment tax_treatment not null default 'standard';
alter table subscriptions add column if not exists tax_treatment tax_treatment;
alter table subscriptions add column if not exists vat_rate numeric(5,2) not null default 21;

-- Backfill: suscripciones existentes heredan el tax_treatment del cliente
update subscriptions s set tax_treatment = c.tax_treatment
from clients c
where s.client_id = c.id and s.tax_treatment is null;

-- 3. Baja programada en clientes
alter table clients add column if not exists scheduled_end_date date;

-- 4. Helper: precio con IVA aplicado según tax_treatment
create or replace function gross_price(net numeric, treatment tax_treatment, rate numeric default 21)
returns numeric language sql immutable as $$
  select case
    when treatment in ('reverse_charge', 'intracom', 'exempt') then net
    else round(net * (1 + rate / 100.0), 2)
  end
$$;
