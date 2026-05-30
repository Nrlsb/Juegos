-- =========================================================================
-- MIGRACIÓN PARA EL MODO PULSADOR (BUZZER MODE)
-- Ejecuta este script en el editor SQL de tu panel de Supabase
-- =========================================================================

-- 1. Agregar soporte para la pregunta del pulsador y estado activo a la tabla 'rooms'
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS buzzer_question text;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS buzzer_active boolean DEFAULT false;

-- 2. Agregar la marca de tiempo de pulsación a la tabla 'players'
ALTER TABLE players ADD COLUMN IF NOT EXISTS buzzed_at timestamp with time zone;

-- Nota: Si tu realtime ya estaba activo para estas tablas, Supabase notificará
-- automáticamente los cambios en estas nuevas columnas.
