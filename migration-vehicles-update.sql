-- Ejecutar en Supabase SQL Editor
-- Agrega política de actualización para vehículos
-- Necesaria para que el owner pueda corregir el tipo al editar un registro

CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
