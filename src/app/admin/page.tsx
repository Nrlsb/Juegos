'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, Play, Award, RotateCcw, Volume2, Plus, 
  HelpCircle, CheckCircle, BarChart3, Trophy, ArrowRight, Trash2, ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
}

interface Player {
  id: string;
  nickname: string;
  score: number;
}

interface ResponseCount {
  [key: number]: number;
}

export default function AdminPage() {
  const [room, setRoom] = useState<any>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar preguntas al montar el componente
  useEffect(() => {
    fetchQuestions();
  }, []);

  // Suscribirse a cambios en tiempo real una vez creada la sala
  useEffect(() => {
    if (!room) return;

    // 1. Canal para escuchar jugadores que se unen a la sala
    const playersChannel = supabase
      .channel(`admin-players-${room.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPlayer = payload.new as Player;
            setPlayers((prev) => {
              if (prev.find((p) => p.id === newPlayer.id)) return prev;
              return [...prev, newPlayer];
            });
          } else if (payload.eventType === 'DELETE') {
            const oldPlayer = payload.old as Player;
            setPlayers((prev) => prev.filter((p) => p.id !== oldPlayer.id));
          } else if (payload.eventType === 'UPDATE') {
            const updatedPlayer = payload.new as Player;
            setPlayers((prev) =>
              prev.map((p) => (p.id === updatedPlayer.id ? updatedPlayer : p))
            );
          }
        }
      )
      .subscribe();

    // 2. Canal para escuchar respuestas de jugadores en tiempo real
    const responsesChannel = supabase
      .channel(`admin-responses-${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'responses',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          setResponses((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    // Cargar jugadores iniciales por si acaso
    fetchPlayers();

    return () => {
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(responsesChannel);
    };
  }, [room]);

  // Manejar el temporizador en tiempo real
  useEffect(() => {
    if (room?.status === 'QUESTION' && room?.question_started_at) {
      const start = new Date(room.question_started_at).getTime();
      
      const updateTimer = () => {
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 1000);
        const remaining = Math.max(15 - diff, 0);
        setTimeLeft(remaining);

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Revelar respuesta automáticamente al terminar el tiempo
          revealAnswer();
        }
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [room?.status, room?.question_started_at, room?.current_question_id]);

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (data) {
      setQuestions(data);
    } else {
      console.error(error);
    }
  };

  const fetchPlayers = async () => {
    if (!room) return;
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id)
      .order('score', { ascending: false });
    if (data) setPlayers(data);
  };

  const generateSeedQuestions = async () => {
    setLoading(true);
    // Verificar si hay preguntas. Si no, las creamos.
    const { count } = await supabase.from('questions').select('*', { count: 'exact', head: true });
    
    if (count === 0) {
      const defaultQuestions = [
        {
          question_text: '¿Cuál es el planeta más grande de nuestro sistema solar?',
          options: ['Tierra', 'Marte', 'Júpiter', 'Saturno'],
          correct_option_index: 2
        },
        {
          question_text: '¿En qué año llegó el hombre a la Luna?',
          options: ['1965', '1969', '1972', '1959'],
          correct_option_index: 1
        },
        {
          question_text: '¿Quién pintó la famosa "Mona Lisa"?',
          options: ['Michelangelo', 'Vincent van Gogh', 'Leonardo da Vinci', 'Pablo Picasso'],
          correct_option_index: 2
        },
        {
          question_text: '¿Cuál es el río más largo del mundo?',
          options: ['Nilo', 'Amazonas', 'Misisipi', 'Yangtsé'],
          correct_option_index: 1
        },
        {
          question_text: '¿Qué elemento químico tiene el símbolo "O"?',
          options: ['Oro', 'Oxígeno', 'Osmio', 'Opalita'],
          correct_option_index: 1
        }
      ];

      const { error } = await supabase.from('questions').insert(defaultQuestions);
      if (error) {
        alert('Error cargando preguntas: ' + error.message);
      } else {
        await fetchQuestions();
        alert('¡Preguntas semilla cargadas con éxito!');
      }
    } else {
      alert('Ya existen preguntas en la base de datos.');
    }
    setLoading(false);
  };

  // Crear una nueva sala
  const createRoom = async () => {
    setLoading(true);
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();

    try {
      const { data, error } = await supabase
        .from('rooms')
        .insert([{ code: roomCode, status: 'LOBBY' }])
        .select()
        .single();

      if (error) throw error;
      setRoom(data);
      setPlayers([]);
      setCurrentQuestionIndex(0);
      setGameStarted(false);
    } catch (err: any) {
      alert('Error creando sala: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Iniciar el juego
  const startGame = async () => {
    if (questions.length === 0) {
      alert('Por favor carga o crea preguntas antes de empezar.');
      return;
    }
    if (players.length === 0) {
      alert('Espera a que se una al menos un jugador.');
      return;
    }

    setLoading(true);
    const firstQuestion = questions[0];
    
    const { data, error } = await supabase
      .from('rooms')
      .update({
        status: 'QUESTION',
        current_question_id: firstQuestion.id,
        question_started_at: new Date().toISOString()
      })
      .eq('id', room.id)
      .select()
      .single();

    if (error) {
      alert('Error al iniciar: ' + error.message);
    } else {
      setRoom(data);
      setResponses([]);
      setGameStarted(true);
      setCurrentQuestionIndex(0);
    }
    setLoading(false);
  };

  // Pasar a la respuesta
  const revealAnswer = async () => {
    if (!room) return;
    
    // Cambiar estado a ANSWER
    const { data, error } = await supabase
      .from('rooms')
      .update({ status: 'ANSWER' })
      .eq('id', room.id)
      .select()
      .single();

    if (error) {
      console.error('Error al revelar respuesta:', error);
    } else {
      setRoom(data);
    }
  };

  // Mostrar tabla de posiciones e ir calculando puntos
  const showLeaderboard = async () => {
    if (!room) return;
    setLoading(true);

    try {
      // 1. Obtener todas las respuestas correctas para la pregunta actual
      const currentQuestion = questions[currentQuestionIndex];
      const { data: qResponses, error: rError } = await supabase
        .from('responses')
        .select('*')
        .eq('room_id', room.id)
        .eq('question_id', currentQuestion.id);

      if (rError) throw rError;

      // 2. Por cada respuesta correcta, actualizar el puntaje del jugador en la BD
      if (qResponses && qResponses.length > 0) {
        for (const resp of qResponses) {
          if (resp.is_correct && resp.points_awarded > 0) {
            // Actualizar puntaje del jugador agregando los puntos de esta respuesta
            const player = players.find(p => p.id === resp.player_id);
            const currentScore = player ? player.score : 0;
            
            await supabase
              .from('players')
              .update({ score: currentScore + resp.points_awarded })
              .eq('id', resp.player_id);
          }
        }
      }

      // 3. Volver a cargar la lista de jugadores actualizada
      const { data: updatedPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', room.id)
        .order('score', { ascending: false });

      if (updatedPlayers) setPlayers(updatedPlayers);

      // 4. Cambiar el estado de la sala a LEADERBOARD
      const { data: updatedRoom } = await supabase
        .from('rooms')
        .update({ status: 'LEADERBOARD' })
        .eq('id', room.id)
        .select()
        .single();

      if (updatedRoom) setRoom(updatedRoom);
    } catch (err: any) {
      alert('Error al calcular posiciones: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Pasar a la siguiente pregunta
  const nextQuestion = async () => {
    if (!room) return;
    setLoading(true);

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= questions.length) {
      // Fin del juego
      const { data, error } = await supabase
        .from('rooms')
        .update({ status: 'FINISHED' })
        .eq('id', room.id)
        .select()
        .single();

      if (error) {
        alert('Error al finalizar el juego: ' + error.message);
      } else {
        setRoom(data);
        // Lanzar confeti para celebrar
        triggerCelebration();
      }
    } else {
      // Siguiente pregunta
      const nextQ = questions[nextIndex];
      const { data, error } = await supabase
        .from('rooms')
        .update({
          status: 'QUESTION',
          current_question_id: nextQ.id,
          question_started_at: new Date().toISOString()
        })
        .eq('id', room.id)
        .select()
        .single();

      if (error) {
        alert('Error al lanzar la siguiente pregunta: ' + error.message);
      } else {
        setRoom(data);
        setCurrentQuestionIndex(nextIndex);
        setResponses([]);
      }
    }
    setLoading(false);
  };

  // Cerrar/Reiniciar la sala
  const deleteRoom = async () => {
    if (!room) return;
    if (!confirm('¿Estás seguro de que deseas cerrar esta sala? Todos los datos de juego de los jugadores se eliminarán.')) return;
    
    setLoading(true);
    await supabase.from('rooms').delete().eq('id', room.id);
    setRoom(null);
    setPlayers([]);
    setGameStarted(false);
    setLoading(false);
  };

  const triggerCelebration = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  // Obtener estadísticas de respuestas elegidas por los jugadores
  const getResponseStats = () => {
    const currentQ = questions[currentQuestionIndex];
    if (!currentQ) return { stats: [0, 0, 0, 0], total: 0 };

    const stats: ResponseCount = { 0: 0, 1: 0, 2: 0, 3: 0 };
    responses.forEach((resp) => {
      const option = resp.selected_option;
      if (option >= 0 && option <= 3) {
        stats[option] = (stats[option] || 0) + 1;
      }
    });

    return {
      stats: [stats[0], stats[1], stats[2], stats[3]],
      total: responses.length
    };
  };

  const activeQuestion = questions[currentQuestionIndex];

  return (
    <div className="flex flex-col flex-1 min-h-screen p-6 md:p-12 relative overflow-hidden">
      {/* Círculos decorativos */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-neon-purple/5 rounded-full blur-3xl -z-10"></div>

      {/* Header */}
      <header className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-neon-blue/10 rounded-xl border border-neon-blue/30">
            <Trophy className="w-6 h-6 text-neon-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Trivia Live <span className="text-xs bg-neon-blue/10 text-neon-blue px-2.5 py-0.5 rounded-full border border-neon-blue/20">ADMIN</span>
            </h1>
            <p className="text-xs text-zinc-400">Controla el juego en tiempo real</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {questions.length === 0 && (
            <button
              onClick={generateSeedQuestions}
              disabled={loading}
              className="bg-zinc-800/80 hover:bg-zinc-700 text-xs font-semibold py-2 px-3.5 rounded-lg border border-zinc-700 text-zinc-300 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 text-neon-blue" /> Cargar Preguntas Semilla
            </button>
          )}
          
          {room && (
            <button
              onClick={deleteRoom}
              disabled={loading}
              className="bg-neon-red/10 hover:bg-neon-red/20 text-neon-red border border-neon-red/30 text-xs font-semibold py-2 px-3.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Cerrar Sala
            </button>
          )}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-5xl w-full mx-auto">
        {!room ? (
          /* PANTALLA CREAR SALA */
          <div className="text-center max-w-md w-full glass-panel p-8 rounded-3xl neon-border-blue animate-float">
            <div className="w-16 h-16 bg-neon-blue/15 rounded-2xl mb-6 mx-auto flex items-center justify-center border border-neon-blue/30 shadow-lg shadow-neon-blue/10">
              <Play className="w-8 h-8 text-neon-blue fill-neon-blue" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Crear nueva Sala de Juego</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Inicia una sala para que los jugadores se unan con sus teléfonos móviles.
            </p>
            <button
              onClick={createRoom}
              disabled={loading}
              className="w-full bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-neon-blue/30 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
              ) : (
                'Crear Sala de Trivia'
              )}
            </button>
            <p className="text-[10px] text-zinc-500 mt-4">
              Preguntas cargadas actualmente: <span className="text-neon-blue font-bold">{questions.length}</span>
            </p>
          </div>
        ) : (
          /* SALA ACTIVA */
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* PANEL DE CONTROL DEL JUEGO (IZQUIERDO - 2 COLUMNAS) */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* ESTADO LOBBY */}
              {room.status === 'LOBBY' && (
                <div className="glass-panel p-8 rounded-3xl neon-border-blue flex-1 flex flex-col justify-center items-center text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-blue to-neon-purple"></div>
                  <span className="text-xs uppercase font-extrabold tracking-widest text-neon-blue mb-2">Código para unirse</span>
                  <div className="text-7xl font-black tracking-widest text-white neon-glow-blue select-all bg-zinc-950/60 px-8 py-4 rounded-2xl border border-zinc-800 mb-6 font-mono animate-pulse">
                    {room.code}
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-300 mb-6">
                    Esperando a los jugadores para comenzar...
                  </h3>
                  
                  <div className="flex items-center gap-2 bg-zinc-900/60 py-2.5 px-5 rounded-full border border-zinc-800 text-sm text-zinc-400 mb-8">
                    <Users className="w-4 h-4 text-neon-pink" />
                    <span>Jugadores listos: <strong className="text-white">{players.length}</strong></span>
                  </div>

                  <button
                    onClick={startGame}
                    disabled={loading || players.length === 0}
                    className="px-10 py-4 bg-gradient-to-r from-neon-green to-neon-blue text-zinc-950 font-black text-lg rounded-xl shadow-lg hover:shadow-neon-green/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center gap-2.5"
                  >
                    <Play className="w-5 h-5 fill-zinc-950" />
                    Empezar Juego
                  </button>
                  {players.length === 0 && (
                    <span className="text-xs text-neon-pink mt-2">Se necesita al menos 1 jugador para iniciar.</span>
                  )}
                </div>
              )}

              {/* ESTADO PREGUNTA (CUESTIONARIO) */}
              {room.status === 'QUESTION' && activeQuestion && (
                <div className="glass-panel p-8 rounded-3xl border-zinc-700/80 flex-1 flex flex-col relative">
                  {/* Temporizador */}
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Pregunta {currentQuestionIndex + 1} de {questions.length}
                    </span>
                    <div className={`w-12 h-12 rounded-full border border-zinc-800 flex items-center justify-center font-bold text-xl glass-card ${timeLeft <= 5 ? 'animate-pulse-timer text-neon-red border-neon-red/30' : 'text-neon-blue border-neon-blue/30'}`}>
                      {timeLeft}
                    </div>
                  </div>

                  {/* Barra de progreso de tiempo de 15 segundos */}
                  <div className="w-full bg-zinc-900 h-2 rounded-full mb-8 overflow-hidden border border-zinc-800">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 5 ? 'bg-neon-red' : 'bg-gradient-to-r from-neon-blue to-neon-purple'}`}
                      style={{ width: `${(timeLeft / 15) * 100}%` }}
                    />
                  </div>

                  {/* Pregunta */}
                  <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10 leading-snug">
                    {activeQuestion.question_text}
                  </h2>

                  {/* Opciones */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {activeQuestion.options.map((opt: string, i: number) => {
                      const colors = [
                        'border-neon-blue text-neon-blue bg-neon-blue/5',
                        'border-neon-pink text-neon-pink bg-neon-pink/5',
                        'border-neon-purple text-neon-purple bg-neon-purple/5',
                        'border-neon-green text-neon-green bg-neon-green/5'
                      ];
                      return (
                        <div 
                          key={i} 
                          className={`p-4 rounded-xl border text-left font-semibold text-lg flex items-center gap-3 ${colors[i % 4]}`}
                        >
                          <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-sm font-bold">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span>{opt}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Barra de respuestas del administrador */}
                  <div className="mt-auto pt-6 border-t border-zinc-800/80 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <HelpCircle className="w-5 h-5 text-neon-pink" />
                      <span>Respuestas recibidas: <strong className="text-white text-lg font-bold">{responses.length} / {players.length}</strong></span>
                    </div>

                    <button
                      onClick={revealAnswer}
                      className="px-6 py-3 bg-neon-pink/15 hover:bg-neon-pink/20 text-neon-pink font-semibold rounded-xl border border-neon-pink/30 hover:shadow-neon-pink/20 transition cursor-pointer text-sm flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Terminar Tiempo y Revelar
                    </button>
                  </div>
                </div>
              )}

              {/* ESTADO RESPUESTA (REVELADA) */}
              {room.status === 'ANSWER' && activeQuestion && (
                <div className="glass-panel p-8 rounded-3xl border-zinc-700/80 flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Resultados de la Pregunta {currentQuestionIndex + 1}
                    </span>
                    <span className="bg-neon-green/10 text-neon-green px-3 py-1 rounded-full text-xs font-bold border border-neon-green/20 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Tiempo Terminado
                    </span>
                  </div>

                  <h2 className="text-2xl font-bold text-white text-center mb-8 leading-snug">
                    {activeQuestion.question_text}
                  </h2>

                  {/* Distribución de respuestas del grupo */}
                  <div className="space-y-4 mb-8">
                    {activeQuestion.options.map((opt: string, i: number) => {
                      const isCorrect = i === activeQuestion.correct_option_index;
                      const { stats, total } = getResponseStats();
                      const count = stats[i] || 0;
                      const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                      
                      return (
                        <div key={i} className="relative">
                          <div className={`p-4 rounded-xl border flex items-center justify-between relative z-10 ${isCorrect ? 'border-neon-green bg-neon-green/10 text-white' : 'border-zinc-800 bg-zinc-950/40 text-zinc-400'}`}>
                            <div className="flex items-center gap-3">
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${isCorrect ? 'bg-neon-green text-zinc-950' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}`}>
                                {String.fromCharCode(65 + i)}
                              </span>
                              <span className="font-semibold">{opt}</span>
                            </div>
                            <div className="flex items-center gap-3 font-mono font-bold">
                              {isCorrect && <span className="text-xs text-neon-green font-bold uppercase tracking-wider mr-2">Correcta</span>}
                              <span>{count} ({percent}%)</span>
                            </div>
                          </div>
                          
                          {/* Barra de progreso de fondo */}
                          <div 
                            className={`absolute top-0 left-0 h-full rounded-xl -z-0 opacity-15 transition-all duration-1000 ${isCorrect ? 'bg-neon-green' : 'bg-zinc-600'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-auto pt-6 border-t border-zinc-800/80 flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Total respuestas: <strong className="text-white">{responses.length}</strong></span>
                    
                    <button
                      onClick={showLeaderboard}
                      disabled={loading}
                      className="px-6 py-3.5 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold rounded-xl hover:shadow-neon-blue/20 transition cursor-pointer text-sm flex items-center gap-2"
                    >
                      {loading ? (
                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      ) : (
                        <>
                          <BarChart3 className="w-4 h-4" />
                          Calcular Puntos y Ver Posiciones
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ESTADO CLASIFICACIÓN (LEADERBOARD) */}
              {room.status === 'LEADERBOARD' && (
                <div className="glass-panel p-8 rounded-3xl border-zinc-700/80 flex-1 flex flex-col">
                  <div className="text-center mb-6">
                    <span className="text-xs uppercase font-extrabold tracking-widest text-neon-purple mb-1 block">Tabla de Posiciones</span>
                    <h2 className="text-3xl font-black text-white">Clasificación Parcial</h2>
                  </div>

                  {/* Lista de Líderes */}
                  <div className="space-y-3 my-6 flex-1 overflow-y-auto max-h-[350px] pr-2">
                    {players.slice(0, 5).map((player, idx) => (
                      <div 
                        key={player.id} 
                        className={`p-4 rounded-xl flex items-center justify-between border ${
                          idx === 0 
                            ? 'border-neon-blue bg-neon-blue/5' 
                            : idx === 1 
                            ? 'border-neon-pink bg-neon-pink/5'
                            : idx === 2 
                            ? 'border-neon-purple bg-neon-purple/5'
                            : 'border-zinc-800 bg-zinc-950/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                            idx === 0 ? 'bg-neon-blue text-zinc-950' : idx === 1 ? 'bg-neon-pink text-zinc-950' : idx === 2 ? 'bg-neon-purple text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-white text-lg">{player.nickname}</span>
                        </div>
                        <div className="font-mono text-xl font-black text-neon-green">
                          {player.score} <span className="text-[10px] text-zinc-400 font-normal uppercase">pts</span>
                        </div>
                      </div>
                    ))}

                    {players.length === 0 && (
                      <p className="text-center text-zinc-500 py-8">No hay jugadores registrados en la sala.</p>
                    )}
                  </div>

                  <div className="mt-auto pt-6 border-t border-zinc-800/80 flex justify-end">
                    <button
                      onClick={nextQuestion}
                      disabled={loading}
                      className="px-8 py-4 bg-gradient-to-r from-neon-green to-neon-blue text-zinc-950 font-black rounded-xl hover:shadow-neon-green/20 transition cursor-pointer flex items-center gap-2"
                    >
                      {currentQuestionIndex + 1 >= questions.length ? (
                        <>
                          Finalizar Trivia
                          <Trophy className="w-5 h-5" />
                        </>
                      ) : (
                        <>
                          Siguiente Pregunta
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ESTADO FINAL (PODIUM Y FIN DEL JUEGO) */}
              {room.status === 'FINISHED' && (
                <div className="glass-panel p-8 rounded-3xl border-zinc-700/80 flex-1 flex flex-col justify-center items-center text-center">
                  <div className="inline-flex p-4 bg-neon-purple/20 rounded-2xl mb-4 border border-neon-purple/30 animate-bounce">
                    <Trophy className="w-10 h-10 text-neon-pink" />
                  </div>
                  <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-pink to-neon-purple mb-8">
                    ¡Trivia Finalizada!
                  </h2>

                  {/* Podio visual */}
                  <div className="flex items-end justify-center gap-4 md:gap-8 w-full max-w-md my-8 h-48">
                    
                    {/* 2do Puesto */}
                    {players[1] && (
                      <div className="flex flex-col items-center w-24">
                        <span className="font-bold text-zinc-300 text-sm mb-1 truncate max-w-full">{players[1].nickname}</span>
                        <span className="text-xs text-zinc-500 mb-2 font-mono">{players[1].score} pts</span>
                        <div className="w-20 h-20 bg-gradient-to-t from-zinc-800 to-zinc-700/70 border-t border-zinc-600 rounded-t-xl flex items-center justify-center font-extrabold text-2xl text-zinc-400 shadow-lg shadow-zinc-800/50">
                          2
                        </div>
                      </div>
                    )}

                    {/* 1er Puesto */}
                    {players[0] && (
                      <div className="flex flex-col items-center w-28">
                        <span className="font-black text-neon-blue text-base mb-1 truncate max-w-full">{players[0].nickname}</span>
                        <span className="text-xs text-neon-blue mb-2 font-mono font-bold">{players[0].score} pts</span>
                        <div className="w-24 h-28 bg-gradient-to-t from-neon-blue/30 via-neon-blue/20 to-neon-purple/20 border-t-2 border-neon-blue rounded-t-2xl flex items-center justify-center font-extrabold text-4xl text-neon-blue shadow-lg shadow-neon-blue/20 relative">
                          <Trophy className="w-6 h-6 text-neon-blue absolute -top-8 animate-pulse" />
                          1
                        </div>
                      </div>
                    )}

                    {/* 3er Puesto */}
                    {players[2] && (
                      <div className="flex flex-col items-center w-20">
                        <span className="font-bold text-amber-600 text-xs mb-1 truncate max-w-full">{players[2].nickname}</span>
                        <span className="text-xs text-zinc-500 mb-2 font-mono">{players[2].score} pts</span>
                        <div className="w-16 h-16 bg-gradient-to-t from-zinc-900 to-zinc-800/80 border-t border-zinc-700 rounded-t-lg flex items-center justify-center font-extrabold text-xl text-amber-700 shadow-md">
                          3
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button
                      onClick={createRoom}
                      className="px-6 py-3.5 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold rounded-xl hover:shadow-neon-blue/20 active:scale-95 transition cursor-pointer flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Jugar de nuevo
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* LISTA DE JUGADORES (DERECHA - 1 COLUMNA) */}
            <div className="glass-panel p-6 rounded-3xl border-zinc-800 flex flex-col max-h-[500px] lg:max-h-none">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-neon-pink" />
                  Jugadores ({players.length})
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {players.map((p, index) => (
                  <div 
                    key={p.id}
                    className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl flex items-center justify-between hover:border-zinc-800 transition"
                  >
                    <span className="font-medium text-zinc-200 text-sm truncate max-w-[120px]">{p.nickname}</span>
                    <span className="font-mono text-xs font-semibold text-neon-green">{p.score} pts</span>
                  </div>
                ))}

                {players.length === 0 && (
                  <div className="h-40 flex flex-col items-center justify-center text-center text-zinc-600 gap-2">
                    <Users className="w-8 h-8 opacity-30" />
                    <p className="text-xs">Sin jugadores conectados todavía.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
