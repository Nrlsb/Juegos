-- 1. Crear tabla para las canciones del bingo
CREATE TABLE IF NOT EXISTS bingo_songs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  artist text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Insertar las 45 canciones seleccionadas del Spotify playlist
INSERT INTO bingo_songs (title, artist) VALUES
('La Perla', 'ROSALÍA, Yahritza Y Su Esencia'),
('FAVORITA', 'Angela Torres'),
('Beauty And A Beat', 'Justin Bieber, Nicki Minaj'),
('Best Song Ever', 'One Direction'),
('Zoo - From "Zootopia 2"', 'Disney, Shakira'),
('APT.', 'ROSÉ, Bruno Mars'),
('Las Jordans', 'TINI'),
('Heathens', 'Twenty One Pilots'),
('Believer', 'Imagine Dragons'),
('Blinding Lights', 'The Weeknd'),
('24K Magic', 'Bruno Mars'),
('Party In The U.S.A.', 'Miley Cyrus'),
('RAMEN PARA DOS', 'Maria Becerra, Paulo Londra, XROSS'),
('Tal Vez', 'Paulo Londra'),
('Me Rehúso', 'Danny Ocean'),
('Problem', 'Ariana Grande, Iggy Azalea'),
('Un Año Sin Lluvia', 'Selena Gomez & The Scene'),
('See You Again (feat. Charlie Puth)', 'Wiz Khalifa, Charlie Puth'),
('Summer', 'Calvin Harris'),
('Umbrella', 'Rihanna, JAŸ-Z'),
('Stitches', 'Shawn Mendes'),
('STAY (with Justin Bieber)', 'The Kid LAROI, Justin Bieber'),
('REAL GANGSTA LOVE', 'Trueno'),
('Malbec', 'Duki, Bizarrap'),
('Quevedo: Bzrp Music Sessions, Vol. 52/66', 'Bizarrap, Quevedo'),
('HOLA PERDIDA', 'Luck Ra, KHEA'),
('BIRDS OF A FEATHER', 'Billie Eilish'),
('Levitating', 'Dua Lipa'),
('Manchild', 'Sabrina Carpenter'),
('I Wanna Be Yours', 'Arctic Monkeys'),
('End of Beginning', 'Djo'),
('Call Me Maybe', 'Carly Rae Jepsen'),
('In the Name of Love', 'Martin Garrix, Bebe Rexha'),
('Closer', 'The Chainsmokers, Halsey'),
('Sucker', 'Jonas Brothers'),
('BESO', 'ROSALÍA, Rauw Alejandro'),
('Blank Space', 'Taylor Swift'),
('Tutu', 'Camilo, Pedro Capó'),
('No Se Va', 'Morat'),
('Tusa', 'KAROL G, Nicki Minaj'),
('Ojitos Lindos', 'Bad Bunny, Bomba Estéreo'),
('Los del Espacio', 'LIT killah, Tiago PZK, Maria Becerra, Duki, Emilia, Rusherking, Big One, FMK'),
('Pa'' la Selección', 'La T y La M'),
('Sorry', 'Justin Bieber'),
('Tiroteo - Remix', 'Marc Seguí, Rauw Alejandro, Pol Granch')
ON CONFLICT DO NOTHING;

-- 3. Modificar la tabla 'rooms' para soportar Bingo
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS bingo_songs_played jsonb DEFAULT '[]'::jsonb;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS bingo_called_by uuid; -- ID del jugador que cantó bingo
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS bingo_called_card jsonb; -- La matriz del jugador que cantó para verificar

-- 4. Modificar la tabla 'players' para almacenar el cartón y estado de Bingo
ALTER TABLE players ADD COLUMN IF NOT EXISTS bingo_card jsonb; -- Matriz de 3x3 de canciones
ALTER TABLE players ADD COLUMN IF NOT EXISTS bingo_marked jsonb DEFAULT '[]'::jsonb; -- Array de índices de la matriz marcados, ej: [0, 4, 8]
ALTER TABLE players ADD COLUMN IF NOT EXISTS bingo_called boolean DEFAULT false;
ALTER TABLE players ADD COLUMN IF NOT EXISTS bingo_winner boolean DEFAULT false;
