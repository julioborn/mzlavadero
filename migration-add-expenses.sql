-- Ejecutar en Supabase SQL Editor
-- Agrega la tabla de insumos/gastos (compras del lavadero)
-- Solo el dueño puede ver, crear, editar y borrar insumos

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references profiles on delete set null,
  product text not null,
  price decimal(10,2) not null,
  quantity int not null default 1,
  expense_date date not null,
  created_at timestamptz default now()
);

alter table expenses enable row level security;

create policy "expenses_select" on expenses for select
  to authenticated using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

create policy "expenses_insert" on expenses for insert
  to authenticated with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

create policy "expenses_update" on expenses for update
  to authenticated using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

create policy "expenses_delete" on expenses for delete
  to authenticated using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );
