-- Agregar columnas para control de cantar línea en Bingo
ALTER TABLE players ADD COLUMN IF NOT EXISTS bingo_line_called boolean DEFAULT false;
ALTER TABLE players ADD COLUMN IF NOT EXISTS bingo_line_winner boolean DEFAULT false;
