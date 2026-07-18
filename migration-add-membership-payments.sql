-- Ejecutar en Supabase SQL Editor
-- Registro de pago de la mensualidad de membresía, por vehículo y por mes.
-- La existencia de una fila (vehicle_id, month) significa "pagó ese mes".
-- Si se borra la fila, vuelve a quedar "pendiente de pago".

create table if not exists membership_payments (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles on delete cascade,
  month text not null, -- formato 'YYYY-MM'
  amount decimal(10,2) not null,
  payment_method text not null check (payment_method in ('efectivo', 'transferencia')),
  paid_date date not null,
  registered_by uuid references profiles on delete set null,
  created_at timestamptz default now(),
  unique (vehicle_id, month)
);

alter table membership_payments enable row level security;

-- Solo el dueño puede ver, registrar y quitar pagos de membresía
create policy "membership_payments_select" on membership_payments for select
  to authenticated using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

create policy "membership_payments_insert" on membership_payments for insert
  to authenticated with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

create policy "membership_payments_update" on membership_payments for update
  to authenticated using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

create policy "membership_payments_delete" on membership_payments for delete
  to authenticated using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );
