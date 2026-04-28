-- Ejecutar en Supabase SQL Editor
-- Agrega la columna status a wash_records

ALTER TABLE wash_records
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed'
CHECK (status IN ('pending', 'completed'));

-- Los registros existentes quedan como 'completed' (ya realizados)

-- Política para que empleados y dueño puedan actualizar el status
CREATE POLICY "wash_records_update" ON wash_records FOR UPDATE
TO authenticated
USING (
  employee_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
);
