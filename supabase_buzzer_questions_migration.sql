-- =========================================================================
-- MIGRACIÓN PARA LAS PREGUNTAS DEL PULSADOR (BUZZER QUESTIONS)
-- Ejecuta este script en el editor SQL de tu panel de Supabase
-- =========================================================================

-- 1. Crear tabla para las preguntas exclusivas del pulsador
CREATE TABLE IF NOT EXISTS buzzer_questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text text NOT NULL,
  answer_text text, -- La respuesta correcta como texto plano para que el admin la vea de guía
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Cargar preguntas semilla para el pulsador
INSERT INTO buzzer_questions (question_text, answer_text) VALUES
('¿Cuál es la capital de Francia?', 'París'),
('¿Qué país tiene forma de bota?', 'Italia'),
('¿Cuántos continentes existen en la Tierra?', '6 (o 7 según el modelo)'),
('¿Qué animal es conocido como el rey de la selva?', 'El león'),
('¿Cuál es el color que resulta de mezclar azul y amarillo?', 'Verde')
ON CONFLICT DO NOTHING;
