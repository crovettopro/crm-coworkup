-- =====================================================================
-- 0005 — Movimientos de caja (ingresos sin factura + gastos menores)
-- =====================================================================

create type if not exists cash_direction as enum ('in', 'out');

create table if not exists cash_movements (
  id uuid primary key default gen_random_uuid(),
  coworking_id uuid not null references coworkings(id) on delete cascade,
  occurred_at date not null default current_date,
  direction cash_direction not null,
  concept text not null,
  amount numeric(10,2) not null check (amount > 0),
  category text,                  -- libre: 'compra', 'venta puntual', 'fianza devuelta', etc.
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_cash_movements_cw_date on cash_movements (coworking_id, occurred_at desc);

alter table cash_movements enable row level security;

drop policy if exists cash_movements_select on cash_movements;
create policy cash_movements_select on cash_movements for select using (
  is_super_admin() or coworking_id = current_coworking_id()
);

drop policy if exists cash_movements_write on cash_movements;
create policy cash_movements_write on cash_movements for all using (
  is_super_admin() or coworking_id = current_coworking_id()
) with check (
  is_super_admin() or coworking_id = current_coworking_id()
);
