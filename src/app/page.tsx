'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Sparkles, Gamepad2, User, KeyRound, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !nickname) {
      setError('Por favor, ingresa el código y tu apodo.');
      return;
    }

    setLoading(true);
    setError('');

    const formattedCode = code.trim().toUpperCase();
    const formattedNickname = nickname.trim();

    try {
      // 1. Buscar si la sala existe y está en estado LOBBY
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', formattedCode)
        .single();

      if (roomError || !room) {
        setError('No se encontró ninguna sala con ese código.');
        setLoading(false);
        return;
      }

      if (room.status !== 'LOBBY') {
        setError('El juego ya ha comenzado en esta sala.');
        setLoading(false);
        return;
      }

      // 2. Registrar al jugador en la sala
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert([
          {
            room_id: room.id,
            nickname: formattedNickname,
            score: 0,
          },
        ])
        .select()
        .single();

      if (playerError) {
        if (playerError.code === '23505') {
          setError('El nombre ya está ocupado en esta sala. Elige otro.');
        } else {
          setError('Error al unirse a la sala. Inténtalo de nuevo.');
          console.error(playerError);
        }
        setLoading(false);
        return;
      }

      // 3. Guardar datos en sessionStorage para persistencia en recargas
      sessionStorage.setItem('trivia_player_id', player.id);
      sessionStorage.setItem('trivia_nickname', player.nickname);
      sessionStorage.setItem('trivia_room_id', room.id);
      sessionStorage.setItem('trivia_room_code', room.code);

      // 4. Redirigir al juego del jugador
      router.push(`/play/${formattedCode}`);
    } catch (err) {
      setError('Ocurrió un error inesperado al conectar con Supabase.');
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-4 sm:p-8 min-h-screen relative overflow-hidden">
      {/* Círculos de luz flotantes */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-neon-purple/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-neon-blue/10 rounded-full blur-3xl animate-pulse delay-700"></div>

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl neon-border-purple relative z-10 transition-all duration-300">
        
        {/* Encabezado animado */}
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-neon-purple/20 rounded-2xl mb-4 border border-neon-purple/30 animate-bounce">
            <Gamepad2 className="w-8 h-8 text-neon-pink" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-neon-blue via-neon-pink to-neon-purple bg-clip-text text-transparent">
            Trivia Live
          </h1>
          <p className="text-zinc-400 text-sm">
            ¡Ingresa el código y prepárate para responder!
          </p>
        </div>

        {/* Alerta de Error */}
        {error && (
          <div className="mb-6 flex items-start gap-2 bg-neon-red/10 border border-neon-red/30 p-4 rounded-xl text-neon-red text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario de Acceso */}
        <form onSubmit={handleJoinGame} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-neon-blue flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Código de Sala
            </label>
            <input
              type="text"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABCD"
              className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl py-3.5 px-4 text-center text-xl font-bold tracking-widest text-white focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/40 uppercase placeholder:text-zinc-700 transition"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-neon-pink flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Tu Apodo (Nickname)
            </label>
            <input
              type="text"
              maxLength={15}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ej. TriviaMaster"
              className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl py-3.5 px-4 text-center text-lg text-white focus:outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink/40 placeholder:text-zinc-700 transition"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-neon-purple/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 transition duration-150 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-neon-blue" />
                Unirse al Juego
              </>
            )}
          </button>
        </form>

        {/* Sección de Administrador */}
        <div className="mt-8 pt-6 border-t border-zinc-800/80 text-center">
          <Link
            href="/admin"
            className="text-xs font-medium text-zinc-400 hover:text-neon-blue transition duration-150 underline decoration-dotted underline-offset-4"
          >
            ¿Eres administrador? Crea una nueva sala aquí
          </Link>
        </div>
      </div>
    </div>
  );
}
