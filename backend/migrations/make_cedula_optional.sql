-- Migración: Hacer campos cedula y nombre_propietario opcionales en soats_expedidos
-- Fecha: 2026-01-16
-- Motivo: Permitir expedición de SOAT sin datos completos del propietario

-- Permitir NULL en cedula
ALTER TABLE soats_expedidos 
ALTER COLUMN cedula DROP NOT NULL;

-- Permitir NULL en nombre_propietario
ALTER TABLE soats_expedidos 
ALTER COLUMN nombre_propietario DROP NOT NULL;

-- Verificar cambios
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'soats_expedidos' 
AND column_name IN ('cedula', 'nombre_propietario');
