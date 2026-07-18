-- Ejecutar en Supabase SQL Editor
-- Permite al dueño desvincular un vehículo de un cliente (no borra el vehículo,
-- solo la relación cliente-vehículo)

create policy "client_vehicles_delete" on client_vehicles for delete
  to authenticated using (
    exists (select 1 from profiles where id = auth.uid() and role = 'owner')
  );
