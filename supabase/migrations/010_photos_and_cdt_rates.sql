-- =============================================
-- Sistema de Fotos de Estudiantes
-- Run this in Supabase SQL Editor
-- =============================================

-- Agregar columna de foto a estudiantes
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- =============================================
-- Mejoras al sistema de CDT/Ahorro - Tasas escalonadas por monto
-- =============================================

-- Agregar columnas para tasas escalonadas (bonificación por monto mayor)
ALTER TABLE savings_rates
ADD COLUMN IF NOT EXISTS bonus_rate_threshold INTEGER, -- Monto mínimo para bonus
ADD COLUMN IF NOT EXISTS bonus_rate DECIMAL(5,2) DEFAULT 0, -- Tasa adicional para montos grandes
ADD COLUMN IF NOT EXISTS description TEXT; -- Descripción del plazo

-- Actualizar las tasas con descripciones y bonus
UPDATE savings_rates SET
  description = 'Corto plazo - Ideal para principiantes',
  bonus_rate_threshold = 100,
  bonus_rate = 0.50
WHERE lock_days = 7;

UPDATE savings_rates SET
  description = 'Plazo quincenal - Balance entre liquidez y retorno',
  bonus_rate_threshold = 200,
  bonus_rate = 1.00
WHERE lock_days = 14;

UPDATE savings_rates SET
  description = 'Plazo mensual - Retorno moderado',
  bonus_rate_threshold = 300,
  bonus_rate = 1.50
WHERE lock_days = 30;

UPDATE savings_rates SET
  description = 'Plazo bimensual - Alto retorno',
  bonus_rate_threshold = 500,
  bonus_rate = 2.50
WHERE lock_days = 60;

UPDATE savings_rates SET
  description = 'Plazo trimestral - Máximo retorno',
  bonus_rate_threshold = 1000,
  bonus_rate = 4.00
WHERE lock_days = 90;

-- =============================================
-- Actualizar función de inicialización de tasas
-- =============================================

CREATE OR REPLACE FUNCTION initialize_savings_rates(p_classroom_id UUID)
RETURNS void AS $$
BEGIN
  -- Insertar tasas por defecto con bonus escalonados
  INSERT INTO savings_rates (classroom_id, lock_days, interest_rate, min_amount, bonus_rate_threshold, bonus_rate, description)
  VALUES
    (p_classroom_id, 7, 2.00, 10, 100, 0.50, 'Corto plazo - Ideal para principiantes'),
    (p_classroom_id, 14, 5.00, 20, 200, 1.00, 'Plazo quincenal - Balance entre liquidez y retorno'),
    (p_classroom_id, 30, 10.00, 50, 300, 1.50, 'Plazo mensual - Retorno moderado'),
    (p_classroom_id, 60, 18.00, 100, 500, 2.50, 'Plazo bimensual - Alto retorno'),
    (p_classroom_id, 90, 25.00, 200, 1000, 4.00, 'Plazo trimestral - Máximo retorno')
  ON CONFLICT (classroom_id, lock_days) DO UPDATE SET
    bonus_rate_threshold = EXCLUDED.bonus_rate_threshold,
    bonus_rate = EXCLUDED.bonus_rate,
    description = EXCLUDED.description;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Storage bucket para fotos (ejecutar en Dashboard > Storage)
-- =============================================
-- NOTA: Crear bucket 'student-photos' manualmente en Supabase Dashboard:
-- 1. Ir a Storage
-- 2. New Bucket: 'student-photos'
-- 3. Public: false
-- 4. File size limit: 4MB
-- 5. Allowed MIME types: image/jpeg, image/png, image/webp

-- Política de storage para fotos (ejecutar si el bucket existe)
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'student-photos',
--   'student-photos',
--   false,
--   4194304, -- 4MB
--   ARRAY['image/jpeg', 'image/png', 'image/webp']
-- );
