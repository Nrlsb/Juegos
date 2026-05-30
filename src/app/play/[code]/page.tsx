'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Gamepad2, Clock, CheckCircle2, XCircle, Trophy, 
  Sparkles, HelpCircle, LogOut, AlertTriangle, Radio, Zap, Music
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
  buzzed_at?: string | null;
}

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const code = resolvedParams.code.toUpperCase();
  const router = useRouter();

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  
  const [roomStatus, setRoomStatus] = useState<string>('LOBBY');
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState<string | null>(null);
  
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  
  const [playersList, setPlayersList] = useState<Player[]>([]);
  const [myPlayerInfo, setMyPlayerInfo] = useState<Player | null>(null);
  const [questionResult, setQuestionResult] = useState<{
    answered: boolean;
    isCorrect: boolean;
    pointsAwarded: number;
    correctOptionIndex: number;
  } | null>(null);

  // Estados para el Modo Pulsador
  const [roomBuzzerActive, setRoomBuzzerActive] = useState(false);
  const [roomBuzzerQuestion, setRoomBuzzerQuestion] = useState('');
  const [pressingBuzzer, setPressingBuzzer] = useState(false);

  // Estados para el Modo Música
  const [musicVideoPlaying, setMusicVideoPlaying] = useState(false);
  const [musicVideoTime, setMusicVideoTime] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const playerRef = useRef<any>(null);

  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Cargar datos de la sesión del jugador
  useEffect(() => {
    const storedPlayerId = sessionStorage.getItem('trivia_player_id');
    const storedNickname = sessionStorage.getItem('trivia_nickname');
    const storedRoomId = sessionStorage.getItem('trivia_room_id');
    const storedRoomCode = sessionStorage.getItem('trivia_room_code');

    if (!storedPlayerId || !storedNickname || !storedRoomId || storedRoomCode !== code) {
      setErrorMsg('No se encontró una sesión activa para esta sala. Por favor, únete desde la página de inicio.');
      return;
    }

    setPlayerId(storedPlayerId);
    setNickname(storedNickname);
    setRoomId(storedRoomId);

    // Cargar estado inicial de la sala y jugador
    initGameSession(storedRoomId, storedPlayerId);
  }, [code]);

  // 2. Suscribirse a los cambios en tiempo real de la sala
  useEffect(() => {
    if (!roomId || !playerId) return;

    // Escuchar cambios en la tabla 'rooms' para esa sala
    const roomChannel = supabase
      .channel(`player-room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        async (payload: any) => {
          const updatedRoom = payload.new;
          setRoomStatus(updatedRoom.status);
          setCurrentQuestionId(updatedRoom.current_question_id);
          setQuestionStartedAt(updatedRoom.question_started_at);
          setRoomBuzzerActive(updatedRoom.buzzer_active || false);
          setRoomBuzzerQuestion(updatedRoom.buzzer_question || '');
          setMusicVideoPlaying(updatedRoom.music_video_playing || false);
          setMusicVideoTime(updatedRoom.music_video_time || 0);

          if ((updatedRoom.status === 'QUESTION' || updatedRoom.status === 'MUSIC') && updatedRoom.current_question_id) {
            // Se lanzó una nueva pregunta/canción: resetear estados locales y cargarla
            setSelectedOption(null);
            setHasAnswered(false);
            setQuestionResult(null);
            await fetchQuestion(updatedRoom.current_question_id);
          } else if (updatedRoom.status === 'ANSWER') {
            // El administrador detuvo el tiempo o se acabó, revelar resultado
            await fetchQuestionResult(updatedRoom.current_question_id);
          } else if (updatedRoom.status === 'LEADERBOARD') {
            // Cargar clasificación y actualizar información de puntaje
            await fetchLeaderboard();
          } else if (updatedRoom.status === 'FINISHED') {
            // Fin del juego, actualizar podio
            await fetchLeaderboard();
            triggerFinishedConfetti();
          }
        }
      )
      .subscribe();

    // Escuchar si eliminan al jugador o actualizan su información
    const playerChannel = supabase
      .channel(`player-self-${playerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `id=eq.${playerId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setErrorMsg('Has sido desconectado o eliminado de la sala.');
          } else if (payload.eventType === 'UPDATE') {
            setMyPlayerInfo(payload.new as Player);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(playerChannel);
    };
  }, [roomId, playerId]);

  // 3. Manejo de temporizador
  useEffect(() => {
    if (roomStatus === 'QUESTION' && questionStartedAt) {
      const start = new Date(questionStartedAt).getTime();
      
      const updateTimer = () => {
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 1000);
        const remaining = Math.max(15 - diff, 0);
        setTimeLeft(remaining);

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Si el jugador no respondió a tiempo, bloquear interacción
          setHasAnswered(true);
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
  }, [roomStatus, questionStartedAt, currentQuestionId]);

  // Controlar la reproducción de YouTube del cliente basándose en el estado de la sala
  useEffect(() => {
    if (!playerRef.current || !audioEnabled) return;
    try {
      if (musicVideoPlaying) {
        playerRef.current.seekTo(musicVideoTime, true);
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
        playerRef.current.seekTo(musicVideoTime, true);
      }
    } catch (e) {
      console.error('Error al controlar reproductor de audio:', e);
    }
  }, [musicVideoPlaying, musicVideoTime, audioEnabled]);

  // Habilitar audio y montar reproductor en el cliente
  const enableAudio = () => {
    if ((window as any).YT && (window as any).YT.Player && !playerRef.current) {
      initClientPlayer();
    } else {
      if (!(window as any).YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }
      (window as any).onYouTubeIframeAPIReady = () => {
        initClientPlayer();
      };
      setTimeout(() => {
        if ((window as any).YT && (window as any).YT.Player && !playerRef.current) {
          initClientPlayer();
        }
      }, 1000);
    }

    function initClientPlayer() {
      try {
        playerRef.current = new (window as any).YT.Player('client-youtube-player', {
          videoId: 'vLD_R65SvAQ',
          playerVars: {
            autoplay: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            volume: 100
          },
          events: {
            onReady: () => {
              setAudioEnabled(true);
              if (musicVideoPlaying) {
                playerRef.current.seekTo(musicVideoTime, true);
                playerRef.current.playVideo();
              } else {
                playerRef.current.seekTo(musicVideoTime, true);
                playerRef.current.pauseVideo();
              }
            }
          }
        });
      } catch (err) {
        console.error('Error al crear reproductor de cliente:', err);
      }
    }
  };

  // Limpiar el reproductor al desmontar el componente
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
        setAudioEnabled(false);
      }
    };
  }, []);

  // Inicializar estados iniciales
  const initGameSession = async (rId: string, pId: string) => {
    try {
      // Obtener estado actual de la sala
      const { data: roomData } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', rId)
        .single();
 
      if (roomData) {
        setRoomStatus(roomData.status);
        setCurrentQuestionId(roomData.current_question_id);
        setQuestionStartedAt(roomData.question_started_at);
        setRoomBuzzerActive(roomData.buzzer_active || false);
        setRoomBuzzerQuestion(roomData.buzzer_question || '');
        setMusicVideoPlaying(roomData.music_video_playing || false);
        setMusicVideoTime(roomData.music_video_time || 0);
 
        if ((roomData.status === 'QUESTION' || roomData.status === 'MUSIC') && roomData.current_question_id) {
          await fetchQuestion(roomData.current_question_id);
          // Verificar si ya había respondido esta pregunta
          await checkAlreadyAnswered(rId, pId, roomData.current_question_id);
        } else if (roomData.status === 'ANSWER' && roomData.current_question_id) {
          await fetchQuestion(roomData.current_question_id);
          await fetchQuestionResult(roomData.current_question_id);
        }
      }
 
      // Obtener info del jugador
      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('id', pId)
        .single();
 
      if (playerData) {
        setMyPlayerInfo(playerData);
      }
    } catch (err) {
      console.error('Error al inicializar sesión:', err);
    }
  };

  const fetchQuestion = async (qId: string) => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('id', qId)
      .single();
    if (data) setActiveQuestion(data);
  };

  const checkAlreadyAnswered = async (rId: string, pId: string, qId: string) => {
    const { data } = await supabase
      .from('responses')
      .select('*')
      .eq('room_id', rId)
      .eq('player_id', pId)
      .eq('question_id', qId)
      .maybeSingle();

    if (data) {
      setSelectedOption(data.selected_option);
      setHasAnswered(true);
    }
  };

  const submitAnswer = async (optionIndex: number) => {
    if (hasAnswered || submittingAnswer || !roomId || !playerId || !activeQuestion) return;
    setSubmittingAnswer(true);
    setSelectedOption(optionIndex);

    // Calcular velocidad de respuesta (segundos transcurridos)
    const start = questionStartedAt ? new Date(questionStartedAt).getTime() : new Date().getTime();
    const now = new Date().getTime();
    const elapsedSeconds = Math.min((now - start) / 1000, 15);
    const timeLeftAtAnswer = Math.max(15 - elapsedSeconds, 0);

    const isCorrect = optionIndex === activeQuestion.correct_option_index;
    
    // Puntuación: 500 puntos base + bono por velocidad de hasta 500 puntos
    let pointsAwarded = 0;
    if (isCorrect) {
      const speedBonus = Math.round((timeLeftAtAnswer / 15) * 500);
      pointsAwarded = 500 + speedBonus;
    }

    try {
      const { error } = await supabase
        .from('responses')
        .insert([
          {
            room_id: roomId,
            player_id: playerId,
            question_id: activeQuestion.id,
            selected_option: optionIndex,
            is_correct: isCorrect,
            points_awarded: pointsAwarded,
          }
        ]);

      if (error) {
        console.error(error);
        alert('Hubo un error al enviar tu respuesta.');
      } else {
        setHasAnswered(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // Obtener el resultado de la pregunta actual
  const fetchQuestionResult = async (qId: string | null) => {
    if (!qId || !roomId || !playerId || !activeQuestion) return;

    const { data, error } = await supabase
      .from('responses')
      .select('*')
      .eq('room_id', roomId)
      .eq('player_id', playerId)
      .eq('question_id', qId)
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      setQuestionResult({
        answered: true,
        isCorrect: data.is_correct,
        pointsAwarded: data.points_awarded,
        correctOptionIndex: activeQuestion.correct_option_index,
      });

      if (data.is_correct) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 }
        });
      }
    } else {
      // El jugador no respondió
      setQuestionResult({
        answered: false,
        isCorrect: false,
        pointsAwarded: 0,
        correctOptionIndex: activeQuestion.correct_option_index,
      });
    }
  };

  const fetchLeaderboard = async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('score', { ascending: false });
    
    if (data) {
      setPlayersList(data);
      // Buscar información propia actualizada
      const me = data.find(p => p.id === playerId);
      if (me) setMyPlayerInfo(me);
    }
  };

  const triggerFinishedConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  // Enviar pulsación del Modo Pulsador
  const handlePressBuzzer = async () => {
    if (pressingBuzzer || !playerId || !roomId || !roomBuzzerActive) return;
    if (myPlayerInfo?.buzzed_at) return;

    setPressingBuzzer(true);

    // Sonido de pulsador local (audio sintetizado usando Web Audio API)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(180, audioCtx.currentTime); // Sonido grave de pulsador
      
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {}

    try {
      const { data, error } = await supabase
        .from('players')
        .update({ buzzed_at: new Date().toISOString() })
        .eq('id', playerId)
        .is('buzzed_at', null) // Solo si no ha pulsado todavía
        .select()
        .single();

      if (error) {
        console.error(error);
        alert('Error al presionar el pulsador. Inténtalo de nuevo.');
      } else if (data) {
        setMyPlayerInfo(data);
        
        // Lanzar una pequeña explosión de confeti para diversión del jugador
        confetti({
          particleCount: 20,
          spread: 30,
          origin: { y: 0.8 }
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPressingBuzzer(false);
    }
  };

  const handleExit = () => {
    if (confirm('¿Seguro que deseas salir del juego?')) {
      sessionStorage.clear();
      router.push('/');
    }
  };

  if (errorMsg) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-6 text-center min-h-screen">
        <div className="w-full max-w-md glass-panel p-8 rounded-3xl neon-border-pink">
          <AlertTriangle className="w-12 h-12 text-neon-pink mx-auto mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-white mb-2">Error de Conexión</h2>
          <p className="text-zinc-400 text-sm mb-6">{errorMsg}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-neon-pink to-neon-purple text-white font-bold py-3.5 rounded-xl transition active:scale-95 cursor-pointer"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  // Obtener la posición del jugador en la clasificación
  const myPosition = playersList.findIndex(p => p.id === playerId) + 1;

  return (
    <div className="flex flex-col flex-1 min-h-screen relative overflow-hidden bg-background">
      
      {/* HEADER MÓVIL */}
      <header className="flex justify-between items-center px-4 py-3 bg-zinc-950/60 border-b border-zinc-900 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-neon-blue" />
          <span className="font-extrabold text-sm text-white tracking-wide">Sala: {code}</span>
        </div>
        
        <div className="flex items-center gap-3">
          {myPlayerInfo && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-right">
              <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none">Mi Puntaje</div>
              <div className="text-xs font-black text-neon-green font-mono">{myPlayerInfo.score} pts</div>
            </div>
          )}
          <button 
            onClick={handleExit}
            className="p-2 text-zinc-400 hover:text-neon-pink transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* CUERPO PRINCIPAL DEL JUGADOR */}
      <main className="flex-1 flex flex-col p-4 justify-center items-center max-w-lg w-full mx-auto relative z-10">
        
        {/* ============================================================
            1. PANTALLA: LOBBY (ESPERA)
            ============================================================ */}
        {roomStatus === 'LOBBY' && (
          <div className="w-full glass-panel p-8 rounded-3xl neon-border-blue text-center animate-float">
            <div className="inline-flex p-4 bg-neon-blue/15 rounded-2xl mb-4 border border-neon-blue/30 animate-pulse">
              <Sparkles className="w-8 h-8 text-neon-blue" />
            </div>
            <h2 className="text-2xl font-black text-white mb-2">¡Bienvenido, {nickname}!</h2>
            <p className="text-zinc-400 text-sm mb-6">
              Estás conectado a la sala de trivia. Por favor, mira la pantalla principal del administrador para ver cuándo inicia el juego.
            </p>
            
            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-zinc-950/60 border border-zinc-900 text-xs text-zinc-500 font-semibold uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-neon-green animate-ping"></span>
              Esperando al Administrador...
            </div>
          </div>
        )}

        {/* ============================================================
            2. PANTALLA: PREGUNTA (RESPONDER)
            ============================================================ */}
        {roomStatus === 'QUESTION' && activeQuestion && (
          <div className="w-full flex flex-col flex-1 py-4 justify-between">
            
            {/* Header Pregunta */}
            <div className="text-center mb-6">
              <div className="flex justify-between items-center mb-4 px-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">Trivia en Curso</span>
                <span className={`text-xs font-bold font-mono px-3 py-1 rounded-full border flex items-center gap-1.5 ${timeLeft <= 5 ? 'bg-neon-red/10 text-neon-red border-neon-red/30 animate-pulse' : 'bg-neon-blue/10 text-neon-blue border-neon-blue/20'}`}>
                  <Clock className="w-3.5 h-3.5" /> {timeLeft}s
                </span>
              </div>
              
              {/* Barra de progreso de cuenta regresiva */}
              <div className="w-full bg-zinc-900/60 h-1.5 rounded-full overflow-hidden border border-zinc-900 mb-6">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 5 ? 'bg-neon-red' : 'bg-neon-blue'}`}
                  style={{ width: `${(timeLeft / 15) * 100}%` }}
                />
              </div>

              <h2 className="text-xl md:text-2xl font-extrabold text-white leading-snug">
                {activeQuestion.question_text}
              </h2>
            </div>

            {/* Opciones del Juego */}
            {!hasAnswered ? (
              <div className="grid grid-cols-1 gap-3.5 mb-6">
                {activeQuestion.options.map((opt: string, i: number) => {
                  const neonBorderColors = [
                    'border-zinc-800 hover:border-neon-blue focus:border-neon-blue active:bg-neon-blue/10',
                    'border-zinc-800 hover:border-neon-pink focus:border-neon-pink active:bg-neon-pink/10',
                    'border-zinc-800 hover:border-neon-purple focus:border-neon-purple active:bg-neon-purple/10',
                    'border-zinc-800 hover:border-neon-green focus:border-neon-green active:bg-neon-green/10'
                  ];
                  const bulletColors = [
                    'bg-neon-blue/15 text-neon-blue border-neon-blue/30',
                    'bg-neon-pink/15 text-neon-pink border-neon-pink/30',
                    'bg-neon-purple/15 text-neon-purple border-neon-purple/30',
                    'bg-neon-green/15 text-neon-green border-neon-green/30'
                  ];
                  return (
                    <button
                      key={i}
                      onClick={() => submitAnswer(i)}
                      disabled={submittingAnswer}
                      className={`w-full p-4 rounded-2xl border bg-zinc-950/40 text-left font-bold text-white transition duration-150 flex items-center gap-3 cursor-pointer ${neonBorderColors[i % 4]}`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border font-extrabold ${bulletColors[i % 4]}`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* PANTALLA ESPERA DE RESPUESTA ENVIADA */
              <div className="w-full glass-panel p-8 rounded-3xl border-zinc-800 text-center my-auto">
                <div className="w-12 h-12 bg-neon-purple/15 border border-neon-purple/30 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-pulse">
                  <Clock className="w-6 h-6 text-neon-purple" />
                </div>
                {selectedOption !== null ? (
                  <>
                    <h3 className="text-lg font-bold text-white mb-2">¡Respuesta Enviada!</h3>
                    <p className="text-zinc-400 text-sm mb-4">
                      Has seleccionado la opción: <strong className="text-neon-purple font-mono">{String.fromCharCode(65 + selectedOption)}</strong>
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-white mb-2">¡Tiempo Agotado!</h3>
                    <p className="text-zinc-400 text-sm mb-4">No enviaste una respuesta a tiempo.</p>
                  </>
                )}
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest animate-pulse">
                  Esperando a que termine el tiempo...
                </span>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            3. PANTALLA: RESPUESTA (REVELACIÓN DE RESULTADO)
            ============================================================ */}
        {roomStatus === 'ANSWER' && activeQuestion && questionResult && (
          <div className="w-full glass-panel p-8 rounded-3xl text-center my-auto flex flex-col justify-center items-center relative overflow-hidden">
            
            {questionResult.answered && questionResult.isCorrect ? (
              /* CORRECTO */
              <>
                <div className="absolute top-0 left-0 w-full h-1 bg-neon-green"></div>
                <div className="w-16 h-16 bg-neon-green/15 border border-neon-green/30 rounded-2xl mb-4 flex items-center justify-center shadow-lg shadow-neon-green/10">
                  <CheckCircle2 className="w-10 h-10 text-neon-green" />
                </div>
                <h2 className="text-3xl font-black text-neon-green tracking-tight mb-2">¡CORRECTO!</h2>
                <div className="text-4xl font-mono font-black text-white mb-4 animate-bounce">
                  +{questionResult.pointsAwarded} <span className="text-xs text-zinc-400 uppercase font-normal">pts</span>
                </div>
                <p className="text-zinc-400 text-sm">
                  ¡Gran velocidad! Sigue así para subir en la tabla de posiciones.
                </p>
              </>
            ) : questionResult.answered ? (
              /* INCORRECTO */
              <>
                <div className="absolute top-0 left-0 w-full h-1 bg-neon-pink"></div>
                <div className="w-16 h-16 bg-neon-pink/15 border border-neon-pink/30 rounded-2xl mb-4 flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-neon-pink" />
                </div>
                <h2 className="text-3xl font-black text-neon-pink tracking-tight mb-2">¡INCORRECTO!</h2>
                <div className="text-xl font-mono font-black text-white mb-4">
                  +0 <span className="text-xs text-zinc-400 uppercase font-normal">pts</span>
                </div>
                <p className="text-zinc-400 text-sm">
                  La respuesta correcta era: <strong className="text-neon-green font-bold">{activeQuestion.options[questionResult.correctOptionIndex]}</strong>
                </p>
              </>
            ) : (
              /* TIEMPO AGOTADO */
              <>
                <div className="absolute top-0 left-0 w-full h-1 bg-neon-red"></div>
                <div className="w-16 h-16 bg-neon-red/15 border border-neon-red/30 rounded-2xl mb-4 flex items-center justify-center">
                  <Clock className="w-10 h-10 text-neon-red" />
                </div>
                <h2 className="text-3xl font-black text-neon-red tracking-tight mb-2">¡SIN TIEMPO!</h2>
                <div className="text-xl font-mono font-black text-white mb-4">
                  +0 <span className="text-xs text-zinc-400 uppercase font-normal">pts</span>
                </div>
                <p className="text-zinc-400 text-sm">
                  No seleccionaste ninguna opción. La correcta era: <strong className="text-neon-green font-bold">{activeQuestion.options[questionResult.correctOptionIndex]}</strong>
                </p>
              </>
            )}

            <div className="mt-8 pt-6 border-t border-zinc-800 w-full">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest animate-pulse">
                Espera a que el administrador cambie la vista...
              </span>
            </div>
          </div>
        )}

        {/* ============================================================
            4. PANTALLA: CLASIFICACIÓN (LEADERBOARD)
            ============================================================ */}
        {roomStatus === 'LEADERBOARD' && (
          <div className="w-full glass-panel p-6 rounded-3xl border-zinc-700/80 flex flex-col flex-1">
            <div className="text-center mb-4">
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-neon-purple mb-1 block">Tabla de Posiciones</span>
              <h2 className="text-xl font-black text-white">Clasificación Móvil</h2>
            </div>

            {/* Posición propia destacada */}
            {myPlayerInfo && (
              <div className="bg-neon-purple/10 border border-neon-purple/30 p-4 rounded-2xl flex items-center justify-between mb-6">
                <div>
                  <span className="text-[9px] uppercase font-bold text-neon-purple block tracking-wider leading-none">Mi Posición</span>
                  <span className="font-extrabold text-2xl text-white">#{myPosition > 0 ? myPosition : '-'}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-neon-purple block tracking-wider leading-none">Puntos Totales</span>
                  <span className="font-black text-2xl text-neon-green font-mono">{myPlayerInfo.score} pts</span>
                </div>
              </div>
            )}

            {/* Mini tabla de líderes */}
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px] mb-4 pr-1">
              {playersList.slice(0, 5).map((player, idx) => {
                const isMe = player.id === playerId;
                return (
                  <div 
                    key={player.id} 
                    className={`p-3 rounded-xl flex items-center justify-between border text-sm ${
                      isMe 
                        ? 'border-neon-purple bg-neon-purple/10' 
                        : idx === 0 
                        ? 'border-neon-blue bg-neon-blue/5' 
                        : 'border-zinc-900 bg-zinc-950/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold text-xs ${
                        idx === 0 ? 'bg-neon-blue text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className={`font-bold ${isMe ? 'text-neon-purple' : 'text-zinc-200'}`}>{player.nickname} {isMe && '(Tú)'}</span>
                    </div>
                    <span className="font-mono font-bold text-neon-green">{player.score} pts</span>
                  </div>
                );
              })}
            </div>

            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest text-center mt-auto block animate-pulse">
              Esperando la siguiente pregunta...
            </span>
          </div>
        )}

        {/* ============================================================
            5. PANTALLA: JUEGO TERMINADO
            ============================================================ */}
        {roomStatus === 'FINISHED' && (
          <div className="w-full glass-panel p-8 rounded-3xl border-zinc-700/80 text-center my-auto relative">
            <div className="inline-flex p-4 bg-neon-pink/15 rounded-2xl mb-4 border border-neon-pink/30 animate-bounce">
              <Trophy className="w-8 h-8 text-neon-pink" />
            </div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-pink to-neon-purple mb-2">
              ¡Trivia Terminada!
            </h2>
            
            {myPlayerInfo && (
              <div className="bg-zinc-950/60 border border-zinc-900 p-6 rounded-2xl my-6">
                <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Tu puntuación final</p>
                <div className="text-4xl font-mono font-black text-neon-green mb-2">{myPlayerInfo.score} pts</div>
                <div className="text-sm text-zinc-400">
                  {myPosition === 1 ? (
                    <span className="text-neon-blue font-bold flex items-center justify-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-neon-blue" /> ¡Felicitaciones! Has ganado el 1er lugar. <Sparkles className="w-4 h-4 text-neon-blue" />
                    </span>
                  ) : (
                    <span>Terminaste en la posición <strong className="text-white font-bold">#{myPosition}</strong> de la tabla.</span>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                sessionStorage.clear();
                router.push('/');
              }}
              className="w-full bg-gradient-to-r from-neon-blue to-neon-purple text-white font-bold py-3.5 rounded-xl transition active:scale-95 cursor-pointer"
            >
              Volver a Jugar
            </button>
          </div>
        )}

        {/* ============================================================
            6. PANTALLA: MODO PULSADOR (BUZZER)
            ============================================================ */}
        {roomStatus === 'BUZZER' && (
          <div className="w-full flex-1 flex flex-col justify-center items-center py-4">
            {roomBuzzerQuestion && (
              <div className="w-full bg-zinc-950/60 border border-zinc-900 p-6 rounded-2xl mb-8 text-center">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">Pregunta del Administrador</span>
                <h2 className="text-xl font-extrabold text-white leading-snug">
                  {roomBuzzerQuestion}
                </h2>
              </div>
            )}

            {!roomBuzzerActive ? (
              /* PULSADORES INACTIVOS / BLOQUEADOS */
              <div className="w-full glass-panel p-8 rounded-3xl border-zinc-800 text-center my-auto">
                <div className="w-16 h-16 bg-neon-red/10 border border-neon-red/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Radio className="w-8 h-8 text-neon-red animate-pulse" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Pulsador Bloqueado</h3>
                <p className="text-zinc-400 text-sm mb-6">
                  {myPlayerInfo?.buzzed_at 
                    ? "Ronda terminada. Espera a que el administrador limpie las respuestas."
                    : "El administrador aún no ha habilitado las respuestas para esta pregunta."
                  }
                </p>
                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-zinc-950/60 border border-zinc-900 text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-neon-red"></span>
                  Esperando activación...
                </div>
              </div>
            ) : myPlayerInfo?.buzzed_at ? (
              /* YA PULSÓ */
              <div className="w-full glass-panel p-8 rounded-3xl border-neon-green/30 text-center my-auto animate-float">
                <div className="w-20 h-20 bg-neon-green/15 border border-neon-green/30 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-neon-green/10">
                  <Zap className="w-10 h-10 text-neon-green animate-bounce" />
                </div>
                <h3 className="text-2xl font-black text-neon-green mb-2">¡PULSADO!</h3>
                <p className="text-zinc-300 text-sm mb-4">
                  Tu pulsación fue registrada con éxito.
                </p>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest animate-pulse">
                  Mira la pantalla principal para ver el orden
                </span>
              </div>
            ) : (
              /* PULSADOR ACTIVO PARA PRESIONAR */
              <div className="flex flex-col items-center justify-center my-auto space-y-8">
                <div className="text-center">
                  <span className="text-xs uppercase font-extrabold tracking-widest text-neon-pink mb-1 block">Modo Pulsador</span>
                  <h3 className="text-lg font-bold text-zinc-300">¡Sé el primero en presionar para responder!</h3>
                </div>

                {/* BOTÓN MÓVIL DEL PULSADOR GIGANTE */}
                <button
                  onClick={handlePressBuzzer}
                  disabled={pressingBuzzer}
                  className="w-52 h-52 rounded-full bg-gradient-to-b from-neon-red via-[#e60000] to-[#990000] text-white font-black text-3xl tracking-wide shadow-[0_14px_0_#660000,0_20px_30px_rgba(255,49,49,0.4)] active:translate-y-3.5 active:shadow-[0_2px_0_#660000,0_4px_10px_rgba(255,49,49,0.2)] hover:scale-102 hover:brightness-110 active:scale-95 transition-all duration-75 cursor-pointer flex items-center justify-center border-4 border-zinc-950 select-none animate-pulse-glow"
                  style={{ touchAction: 'manipulation' }}
                >
                  <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">¡PULSAR!</span>
                </button>

                <p className="text-xs text-zinc-500 animate-pulse text-center">
                  Toca la pantalla tan rápido como escuches la pregunta.
                </p>
              </div>
            )}
          </div>
        )}
        {/* ============================================================
            7. PANTALLA: MODO MÚSICA (ADIVINA LA CANCION)
            ============================================================ */}
        {roomStatus === 'MUSIC' && (
          <div className="w-full flex-1 flex flex-col justify-center items-center py-4">
            
            {/* Elemento oculto para el reproductor de YouTube para sincronizar audio */}
            <div className="hidden">
              <div id="client-youtube-player"></div>
            </div>

            {!audioEnabled && activeQuestion && (
              <button
                onClick={enableAudio}
                className="w-full bg-neon-green/20 border border-neon-green/45 hover:bg-neon-green/30 text-neon-green text-xs font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 mb-6 transition active:scale-[0.98] cursor-pointer"
              >
                <Radio className="w-4 h-4 animate-pulse text-neon-green" />
                Habilitar Audio Sincronizado
              </button>
            )}

            {!activeQuestion ? (
              /* ESPERA DE SELECCIÓN DE CANCIÓN */
              <div className="w-full glass-panel p-8 rounded-3xl border-zinc-800 text-center my-auto animate-float">
                <div className="w-16 h-16 bg-neon-green/10 border border-neon-green/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Radio className="w-8 h-8 text-neon-green animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Adivina la Canción</h3>
                <p className="text-zinc-400 text-sm mb-6">
                  El administrador está eligiendo la siguiente canción de Disney...
                </p>
                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-zinc-950/60 border border-zinc-900 text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-neon-green animate-ping"></span>
                  Esperando selección...
                </div>
              </div>
            ) : (
              /* TRIVIA DE CANCIONES ACTIVA */
              <div className="w-full flex flex-col flex-1 justify-between">
                <div className="text-center mb-6">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-neon-green block mb-2">
                    Adivina la Película
                  </span>
                  
                  {audioEnabled ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neon-green/10 border border-neon-green/20 text-[10px] text-neon-green font-bold uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-neon-green animate-ping"></span>
                      Audio en Vivo Habilitado
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neon-red/10 border border-neon-red/20 text-[10px] text-neon-red font-bold uppercase tracking-wider">
                      Audio Silenciado
                    </div>
                  )}

                  <h2 className="text-lg font-bold text-zinc-300 mt-4 leading-snug">
                    ¿A qué película de Disney pertenece esta canción?
                  </h2>
                </div>

                {!hasAnswered ? (
                  /* OPCIONES DE PELÍCULAS */
                  <div className="grid grid-cols-1 gap-3.5 mb-6">
                    {activeQuestion.options.map((opt: string, i: number) => {
                      const colors = [
                        'border-zinc-800 hover:border-neon-blue focus:border-neon-blue active:bg-neon-blue/10',
                        'border-zinc-800 hover:border-neon-pink focus:border-neon-pink active:bg-neon-pink/10',
                        'border-zinc-800 hover:border-neon-purple focus:border-neon-purple active:bg-neon-purple/10',
                        'border-zinc-800 hover:border-neon-green focus:border-neon-green active:bg-neon-green/10'
                      ];
                      const bullets = [
                        'bg-neon-blue/15 text-neon-blue border-neon-blue/30',
                        'bg-neon-pink/15 text-neon-pink border-neon-pink/30',
                        'bg-neon-purple/15 text-neon-purple border-neon-purple/30',
                        'bg-neon-green/15 text-neon-green border-neon-green/30'
                      ];

                      return (
                        <button
                          key={i}
                          onClick={() => submitAnswer(i)}
                          disabled={submittingAnswer}
                          className={`w-full p-4 rounded-2xl border bg-zinc-950/40 text-left font-bold text-white transition duration-150 flex items-center gap-3 cursor-pointer ${colors[i % 4]}`}
                        >
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border font-extrabold ${bullets[i % 4]}`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* PANTALLA ESPERA DE RESPUESTA ENVIADA */
                  <div className="w-full glass-panel p-8 rounded-3xl border-zinc-800 text-center my-auto">
                    <div className="w-12 h-12 bg-neon-green/15 border border-neon-green/30 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-pulse">
                      <Music className="w-6 h-6 text-neon-green" />
                    </div>
                    {selectedOption !== null ? (
                      <>
                        <h3 className="text-lg font-bold text-white mb-2">¡Respuesta Registrada!</h3>
                        <p className="text-zinc-400 text-sm mb-4">
                          Has elegido la opción: <strong className="text-neon-green font-mono">{String.fromCharCode(65 + selectedOption)}</strong>
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-bold text-white mb-2">Modo Música</h3>
                        <p className="text-zinc-400 text-sm mb-4">Esperando resultados...</p>
                      </>
                    )}
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest animate-pulse">
                      El administrador revelará la respuesta pronto...
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
