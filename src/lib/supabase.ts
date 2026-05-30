import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Falta configurar las variables de entorno de Supabase en .env.local. Por favor, configúralas para habilitar las funcionalidades en tiempo real.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
