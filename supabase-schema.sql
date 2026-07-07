-- ============================================================
-- MZ Lavadero - Esquema de base de datos para Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. Perfiles de usuario (extiende auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('owner', 'employee')),
  name text not null default '',
  created_at timestamptz default now()
);

-- 2. Clientes (identificados por teléfono)
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  created_at timestamptz default now()
);

-- 3. Vehículos (identificados por patente)
create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  plate text unique not null,
  type text not null check (type in ('auto', 'camioneta', 'moto')),
  created_at timestamptz default now()
);

-- 4. Relación cliente - vehículo (muchos a muchos)
create table if not exists client_vehicles (
  client_id uuid references clients on delete cascade,
  vehicle_id uuid references vehicles on delete cascade,
  primary key (client_id, vehicle_id)
);

-- 5. Registros de lavado
create table if not exists wash_records (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references profiles on delete set null,
  client_id uuid references clients on delete restrict,
  vehicle_id uuid references vehicles on delete restrict,
  wash_date date not null,
  wash_time time not null,
  payment_method text not null check (payment_method in ('efectivo', 'transferencia')),
  amount decimal(10,2) not null,
  detail text,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table profiles enable row level security;
alter table clients enable row level security;
alter table vehicles enable row level security;
alter table client_vehicles enable row level security;
alter table wash_records enable row level security;

-- Profiles: cada usuario ve y edita solo su perfil
create policy "profiles_select" on profiles for select
  to authenticated using (auth.uid() = id);

create policy "profiles_update" on profiles for update
  to authenticated using (auth.uid() = id);

-- Clients: todos los autenticados pueden ver e insertar
create policy "clients_select" on clients for select
  to authenticated using (true);

create policy "clients_insert" on clients for insert
  to authenticated with check (true);

create policy "clients_update" on clients for update
  to authenticated using (true);

-- Vehicles: todos los autenticados pueden ver e insertar
create policy "vehicles_select" on vehicles for select
  to authenticated using (true);

create policy "vehicles_insert" on vehicles for insert
  to authenticated with check (true);

-- Client vehicles: todos los autenticados pueden ver e insertar
create policy "client_vehicles_select" on client_vehicles for select
  to authenticated using (true);

create policy "client_vehicles_insert" on client_vehicles for insert
  to authenticated with check (true);

-- Wash records: todos ven, todos insertan, solo el empleado o dueño puede borrar
create policy "wash_records_select" on wash_records for select
  to authenticated using (true);

create policy "wash_records_insert" on wash_records for insert
  to authenticated with check (true);

create policy "wash_records_delete" on wash_records for delete
  to authenticated using (
    employee_id = auth.uid()
    or exists (
      select 1 from profiles
      where id = auth.uid() and role = 'owner'
    )
  );

-- ============================================================
-- Función para crear perfil automáticamente al registrarse
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'employee'),
    coalesce(new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger para ejecutar la función al crear usuario
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- MIGRACIONES — Membresía
-- ============================================================

-- Campo is_membership en wash_records
alter table wash_records add column if not exists is_membership boolean not null default false;

-- Campo status (si no fue agregado previamente)
alter table wash_records add column if not exists status text not null default 'completed'
  check (status in ('pending', 'completed'));

-- Tabla de configuración global (singleton, id siempre = 1)
create table if not exists app_settings (
  id int primary key default 1,
  constraint app_settings_single check (id = 1),
  membership_price_auto int not null default 0,
  membership_price_camioneta int not null default 0,
  updated_at timestamptz default now()
);

alter table app_settings enable row level security;

create policy "app_settings_select" on app_settings for select
  to authenticated using (true);

create policy "app_settings_update" on app_settings for update
  to authenticated using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

create policy "app_settings_insert" on app_settings for insert
  to authenticated with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );

-- Fila por defecto
insert into app_settings (id, membership_price_auto, membership_price_camioneta)
values (1, 0, 0)
on conflict (id) do nothing;

-- ============================================================
-- MIGRACIONES — Insumos / Gastos
-- ============================================================

-- Tabla de insumos/gastos (compras del lavadero)
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

-- Solo el dueño puede ver, crear, editar y borrar insumos
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

-- ============================================================
-- INSTRUCCIONES DE USO
-- ============================================================
--
-- 1. Ejecutá todo este script en el SQL Editor de Supabase.
--
-- 2. Para crear el usuario DUEÑO (owner), ir a Supabase >
--    Authentication > Users > Invite user y luego actualizar
--    el perfil:
--
--    UPDATE profiles SET role = 'owner', name = 'Tu Nombre'
--    WHERE id = 'uuid-del-usuario';
--
-- 3. Para crear el usuario EMPLEADO, igual pero con role = 'employee'.
--
-- O bien, podés crear los usuarios así desde SQL:
--    (reemplazá el UUID por el real del usuario creado)
--
-- ============================================================
