-- Ejecutar en Supabase SQL Editor
-- El formulario de "Nuevo lavado" (usado también por empleados) necesita
-- poder leer si un vehículo tiene la membresía del mes pagada para calcular
-- el monto automáticamente. La policy original solo permitía leer al dueño,
-- lo cual rompía esa lógica para los empleados. Insert/update/delete siguen
-- siendo solo del dueño.

drop policy if exists "membership_payments_select" on membership_payments;

create policy "membership_payments_select" on membership_payments for select
  to authenticated using (true);
