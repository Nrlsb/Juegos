-- Habilitar la extensión para UUID si no está habilitada
create extension if not exists "uuid-ossp";

-- =========================================================================
-- TABLAS DE LA BASE DE DATOS
-- =========================================================================

-- 1. Tabla de Preguntas (questions)
create table if not exists questions (
  id uuid default gen_random_uuid() primary key,
  question_text text not null,
  options jsonb not null, -- Array de strings: ["Opción A", "Opción B", "Opción C", "Opción D"]
  correct_option_index integer not null, -- 0, 1, 2, 3
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabla de Salas de Juego (rooms)
create table if not exists rooms (
  id uuid default gen_random_uuid() primary key,
  code text unique not null, -- Código corto de 4 letras (ej: "TRIV")
  status text not null default 'LOBBY', -- 'LOBBY', 'QUESTION', 'ANSWER', 'LEADERBOARD', 'FINISHED'
  current_question_id uuid references questions(id) on delete set null,
  question_started_at timestamp with time zone, -- Marca de tiempo de cuándo inició la pregunta
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabla de Jugadores (players)
create table if not exists players (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  nickname text not null,
  score integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (room_id, nickname)
);

-- 4. Tabla de Respuestas (responses)
create table if not exists responses (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade not null,
  player_id uuid references players(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  selected_option integer not null,
  is_correct boolean not null,
  points_awarded integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (room_id, player_id, question_id)
);

-- =========================================================================
-- HABILITAR SUPABASE REALTIME
-- =========================================================================
-- Agrega las tablas al canal de publicaciones en tiempo real de Supabase
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table responses;

-- =========================================================================
-- DATA SEMILLA (Preguntas de prueba)
-- =========================================================================
insert into questions (question_text, options, correct_option_index) values
('¿Cuál es el planeta más grande de nuestro sistema solar?', '["Tierra", "Marte", "Júpiter", "Saturno"]'::jsonb, 2),
('¿En qué año llegó el hombre a la Luna?', '["1965", "1969", "1972", "1959"]'::jsonb, 1),
('¿Quién pintó la famosa "Mona Lisa"?', '["Michelangelo", "Vincent van Gogh", "Leonardo da Vinci", "Pablo Picasso"]'::jsonb, 2),
('¿Cuál es el río más largo del mundo?', '["Nilo", "Amazonas", "Misisipi", "Yangtsé"]'::jsonb, 1),
('¿Qué elemento químico tiene el símbolo "O"?', '["Oro", "Oxígeno", "Osmio", "Opalita"]'::jsonb, 1),
('¿Cuál es el idioma oficial de Brasil?', '["Español", "Portugués", "Inglés", "Francés"]'::jsonb, 1),
('¿Cuántos huesos tiene el cuerpo humano adulto?', '["206", "300", "150", "250"]'::jsonb, 0),
('¿Qué país es conocido como la tierra del sol naciente?', '["China", "Japón", "Corea del Sur", "Tailandia"]'::jsonb, 1),
('¿Quién escribió "Don Quijote de la Mancha"?', '["Gabriel García Márquez", "Miguel de Cervantes", "Federico García Lorca", "Pablo Neruda"]'::jsonb, 1),
('¿Cuál es la velocidad de la luz?', '["300,000 km/s", "150,000 km/s", "500,000 km/s", "1,000,000 km/s"]'::jsonb, 0);
