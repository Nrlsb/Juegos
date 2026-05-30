-- =========================================================================
-- MIGRACIÓN PARA EL MODO ADIVINA LA CANCIÓN (MUSIC QUIZ)
-- Ejecuta este script en el editor SQL de tu panel de Supabase
-- =========================================================================

-- 1. Agregar soporte para el modo música en la tabla de preguntas (questions)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS category text DEFAULT 'trivia';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS video_start_seconds integer DEFAULT 0;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS song_title text;

-- 2. Agregar soporte para sincronizar la reproducción del video de música en la tabla de salas (rooms)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS music_video_playing boolean DEFAULT false;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS music_video_time integer DEFAULT 0;

-- 3. Cargar las 22 preguntas de Disney basadas en el video de YouTube
-- Se utiliza la categoría 'music', con sus opciones de películas y la marca de tiempo de inicio correspondiente.
INSERT INTO questions (question_text, options, correct_option_index, category, video_start_seconds, song_title) VALUES
('¿Qué película de Disney tiene esta canción?', '["Turning Red", "Luca", "Soul", "Intensamente"]'::jsonb, 0, 'music', 0, 'Nadie como tú (Nobody Like U)'),
('¿Qué película de Disney tiene esta canción?', '["Coco", "Encanto", "Moana", "Raya y el último dragón"]'::jsonb, 1, 'music', 28, 'En lo profundo (Surface Pressure)'),
('¿Qué película de Disney tiene esta canción?', '["La Bella y la Bestia", "Cenicienta", "La Sirenita", "Aladdin"]'::jsonb, 2, 'music', 39, 'Parte de él (Part of Your World)'),
('¿Qué película de Disney tiene esta canción?', '["Coco", "El Libro de la Vida", "Valiente", "Frozen"]'::jsonb, 0, 'music', 55, 'Un poco loco'),
('¿Qué película de Disney tiene esta canción?', '["Valiente", "Frozen", "Enredados", "La Princesa y el Sapo"]'::jsonb, 2, 'music', 66, '¿Cuándo empezaré a vivir? (When Will My Life Begin?)'),
('¿Qué película de Disney tiene esta canción?', '["Tarzán", "Tierra de Osos", "El Rey León", "Pocahontas"]'::jsonb, 1, 'music', 83, 'En marcha estoy (On My Way)'),
('¿Qué película de Disney tiene esta canción?', '["Tarzán", "Hércules", "Mulan", "El Libro de la Selva"]'::jsonb, 0, 'music', 98, 'En mi corazón vivirás (You''ll Be in My Heart)'),
('¿Qué película de Disney tiene esta canción?', '["Monsters, Inc.", "Toy Story", "Buscando a Nemo", "Cars"]'::jsonb, 1, 'music', 116, 'Yo soy tu amigo fiel (You''ve Got a Friend in Me)'),
('¿Qué película de Disney tiene esta canción?', '["Hércules", "Aladdin", "Mulan", "Pocahontas"]'::jsonb, 1, 'music', 128, 'Un mundo ideal (A Whole New World)'),
('¿Qué película de Disney tiene esta canción?', '["Enredados", "Mulan", "La Princesa y el Sapo", "Lilo y Stitch"]'::jsonb, 2, 'music', 138, 'Ya llegaré (Almost There)'),
('¿Qué película de Disney tiene esta canción?', '["Pocahontas", "Tarzán", "Tierra de Osos", "Mulan"]'::jsonb, 0, 'music', 150, 'Colores en el viento (Colors of the Wind)'),
('¿Qué película de Disney tiene esta canción?', '["Cenicienta", "La Bella Durmiente", "Blancanieves y los siete enanos", "Pinocho"]'::jsonb, 2, 'music', 165, 'Heigh-Ho'),
('¿Qué película de Disney tiene esta canción?', '["Lilo y Stitch", "Moana", "Enredados", "Frozen"]'::jsonb, 1, 'music', 180, 'Cuán lejos voy (How Far I''ll Go)'),
('¿Qué película de Disney tiene esta canción?', '["Tarzán", "El Libro de la Selva", "El Rey León", "Dumbo"]'::jsonb, 1, 'music', 225, 'Busca lo más vital (The Bare Necessities)'),
('¿Qué película de Disney tiene esta canción?', '["La Bella y la Bestia", "Cenicienta", "La Sirenita", "Aladdin"]'::jsonb, 0, 'music', 242, 'La bella y la bestia (Beauty and the Beast)'),
('¿Qué película de Disney tiene esta canción?', '["Enredados", "Valiente", "Moana", "Frozen"]'::jsonb, 3, 'music', 265, '¿Y si hacemos un muñeco? (Do You Want to Build a Snowman?)'),
('¿Qué película de Disney tiene esta canción?', '["Tierra de Osos", "Valiente", "Frozen", "Enredados"]'::jsonb, 1, 'music', 278, 'Viento y cielo alcanzar (Touch the Sky)'),
('¿Qué película de Disney tiene esta canción?', '["Moana", "Lilo y Stitch", "Tarzán", "Peter Pan"]'::jsonb, 1, 'music', 293, 'Hawaiian Roller Coaster Ride'),
('¿Qué película de Disney tiene esta canción?', '["La Bella Durmiente", "Blancanieves y los siete enanos", "Cenicienta", "Alicia en el país de las maravillas"]'::jsonb, 0, 'music', 311, 'Eres tú (Once Upon a Dream)'),
('¿Qué película de Disney tiene esta canción?', '["Aviones", "Toy Story", "Cars", "Monsters, Inc."]'::jsonb, 2, 'music', 350, 'Life Is a Highway'),
('¿Qué película de Disney tiene esta canción?', '["Ratatouille", "Brave", "Wall-E", "Up: Una aventura de altura"]'::jsonb, 0, 'music', 370, 'Le Festin'),
('¿Qué película de Disney tiene esta canción?', '["El Libro de la Selva", "Tarzán", "Tierra de Osos", "El Rey León"]'::jsonb, 3, 'music', 403, 'Hakuna Matata / Esta noche es para amar')
ON CONFLICT DO NOTHING;
