-- =========================================================================
-- MIGRACIÓN PARA EL DESGLOSE DE PUNTAJES POR TIPO DE JUEGO
-- Ejecuta este script en el editor SQL de tu panel de Supabase
-- =========================================================================

-- Agregar columnas para puntajes individuales por tipo de juego en la tabla de jugadores (players)
ALTER TABLE players ADD COLUMN IF NOT EXISTS score_trivia integer DEFAULT 0 NOT NULL;
ALTER TABLE players ADD COLUMN IF NOT EXISTS score_music integer DEFAULT 0 NOT NULL;
ALTER TABLE players ADD COLUMN IF NOT EXISTS score_buzzer integer DEFAULT 0 NOT NULL;
ALTER TABLE players ADD COLUMN IF NOT EXISTS score_bingo integer DEFAULT 0 NOT NULL;
