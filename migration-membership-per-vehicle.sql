-- Ejecutar en Supabase SQL Editor
-- 1) Nombre opcional para el cliente (antes solo se identificaba por teléfono)
-- 2) Precios por defecto de lavado normal (sin membresía) por tipo de vehículo,
--    para autocompletar el monto cuando la membresía no aplica (ej: 5° lavado del mes)

alter table clients add column if not exists name text;

alter table app_settings add column if not exists price_auto int not null default 0;
alter table app_settings add column if not exists price_camioneta int not null default 0;
alter table app_settings add column if not exists price_moto int not null default 0;
