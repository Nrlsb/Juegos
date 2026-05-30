'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, Play, Award, RotateCcw, RotateCw, Volume2, Plus, 
  HelpCircle, CheckCircle, BarChart3, Trophy, ArrowRight, Trash2, ShieldAlert,
  Zap, Radio, ArrowUp, ArrowDown, Search, X, Edit2, Music, Pause
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
  category?: string;
  video_start_seconds?: number;
  song_title?: string;
}

interface BuzzerQuestion {
  id: string;
  question_text: string;
  answer_text?: string;
}

interface Player {
  id: string;
  nickname: string;
  score: number;
  buzzed_at?: string | null;
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
  const roomRef = useRef<any>(null);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // Pestaña activa de administración de preguntas (cuando no hay sala)
  const [activeQuestionTab, setActiveQuestionTab] = useState<'trivia' | 'buzzer' | 'music'>('trivia');

  // Estados para crear/editar una pregunta de trivia
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [newCorrectIndex, setNewCorrectIndex] = useState(0);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Estados para crear/editar una pregunta del pulsador
  const [newBuzzerQuestionText, setNewBuzzerQuestionText] = useState('');
  const [newBuzzerAnswerText, setNewBuzzerAnswerText] = useState('');
  const [addingBuzzerQuestion, setAddingBuzzerQuestion] = useState(false);
  const [editingBuzzerQuestionId, setEditingBuzzerQuestionId] = useState<string | null>(null);

  // Estados para el Modo Pulsador
  const [buzzerQuestionInput, setBuzzerQuestionInput] = useState('');
  const [pointsToAwardInput, setPointsToAwardInput] = useState('100');
  const [selectedBuzzerQuestionId, setSelectedBuzzerQuestionId] = useState<string | null>(null);
  const [askedBuzzerQuestionIds, setAskedBuzzerQuestionIds] = useState<string[]>([]);
  const [buzzerQuestions, setBuzzerQuestions] = useState<BuzzerQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para el Modo Música (Adivina la Canción)
  const [newMusicSongTitle, setNewMusicSongTitle] = useState('');
  const [newMusicStartSeconds, setNewMusicStartSeconds] = useState(0);
  const playerRef = useRef<any>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [musicSearchQuery, setMusicSearchQuery] = useState('');
  const [askedMusicQuestionIds, setAskedMusicQuestionIds] = useState<string[]>([]);
  const ignoreStateChangeRef = useRef(false);

  // Seleccionar una pregunta de la lista para el pulsador
  const handleSelectBuzzerQuestion = (q: BuzzerQuestion) => {
    setSelectedBuzzerQuestionId(q.id);
    setBuzzerQuestionInput(q.question_text);
  };

  // Mover una pregunta de posición en la lista del pulsador
  const moveBuzzerQuestion = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= buzzerQuestions.length) return;
    
    const updated = [...buzzerQuestions];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setBuzzerQuestions(updated);
  };

  // Cargar preguntas al montar el componente
  useEffect(() => {
    fetchQuestions();
    fetchBuzzerQuestions();
  }, []);

  // Sincronizar estado del reproductor de YouTube con Supabase
  const handleAdminPlayerStateChange = async (state: number) => {
    if (ignoreStateChangeRef.current) return;
    const currentRoom = roomRef.current;
    if (!currentRoom || !playerRef.current) return;

    // 1 = YT.PlayerState.PLAYING
    const isPlaying = state === 1;

    // Evitar actualizaciones de base de datos redundantes si el estado ya coincide
    if (isPlaying === currentRoom.music_video_playing) return;

    try {
      let currentTime = 0;
      if (typeof playerRef.current.getCurrentTime === 'function') {
        currentTime = Math.floor(playerRef.current.getCurrentTime());
      }

      const { data, error } = await supabase
        .from('rooms')
        .update({
          music_video_playing: isPlaying,
          music_video_time: currentTime
        })
        .eq('id', currentRoom.id)
        .select()
        .single();

      if (data && !error) {
        setRoom(data);
      }
    } catch (e) {
      console.error('Error al sincronizar estado de reproducción de YouTube:', e);
    }
  };

  // Inicializar YouTube Iframe API para el Administrador
  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    (window as any).onYouTubeIframeAPIReady = () => {
      initPlayer();
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    }

    function initPlayer() {
      if (document.getElementById('admin-youtube-player') && !playerRef.current) {
        playerRef.current = new (window as any).YT.Player('admin-youtube-player', {
          videoId: 'vLD_R65SvAQ',
          playerVars: {
            autoplay: 0,
            controls: 1,
            modestbranding: 1,
            rel: 0
          },
          events: {
            onReady: () => {
              setPlayerReady(true);
            },
            onStateChange: (event: any) => {
              handleAdminPlayerStateChange(event.data);
            }
          }
        });
      }
    }

    const interval = setInterval(() => {
      if (document.getElementById('admin-youtube-player') && !playerRef.current && (window as any).YT && (window as any).YT.Player) {
        initPlayer();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
        setPlayerReady(false);
      }
    };
  }, [room?.status]);

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

  const fetchBuzzerQuestions = async () => {
    const { data, error } = await supabase
      .from('buzzer_questions')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (data) {
      setBuzzerQuestions(data);
    } else {
      console.error(error);
    }
  };

  const generateSeedBuzzerQuestions = async () => {
    setLoading(true);
    try {
      const { count } = await supabase.from('buzzer_questions').select('*', { count: 'exact', head: true });
      
      if (count === 0) {
        const defaultQuestions = [
          { question_text: '¿Cuál es la capital de Francia?', answer_text: 'París' },
          { question_text: '¿Qué país tiene forma de bota?', answer_text: 'Italia' },
          { question_text: '¿Cuántos continentes existen en la Tierra?', answer_text: '6 (o 7 según el modelo)' },
          { question_text: '¿Qué animal es conocido como el rey de la selva?', answer_text: 'El león' },
          { question_text: '¿Cuál es el color que resulta de mezclar azul y amarillo?', answer_text: 'Verde' }
        ];

        const { error } = await supabase.from('buzzer_questions').insert(defaultQuestions);
        if (error) {
          alert('Error cargando preguntas semilla del pulsador: ' + error.message);
        } else {
          await fetchBuzzerQuestions();
          alert('¡Preguntas semilla del pulsador cargadas con éxito!');
        }
      } else {
        alert('Ya existen preguntas del pulsador en la base de datos.');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBuzzerQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuzzerQuestionText.trim()) {
      alert('Por favor completa el texto de la pregunta.');
      return;
    }

    setAddingBuzzerQuestion(true);
    try {
      if (editingBuzzerQuestionId) {
        // Modo Edición
        const { data, error } = await supabase
          .from('buzzer_questions')
          .update({
            question_text: newBuzzerQuestionText.trim(),
            answer_text: newBuzzerAnswerText.trim() || null
          })
          .eq('id', editingBuzzerQuestionId)
          .select()
          .single();

        if (error) throw error;

        setBuzzerQuestions(prev => prev.map(q => q.id === editingBuzzerQuestionId ? data : q));
        cancelEditingBuzzer();
        alert('¡Pregunta del pulsador actualizada exitosamente!');
      } else {
        // Modo Crear
        const { data, error } = await supabase
          .from('buzzer_questions')
          .insert([{
            question_text: newBuzzerQuestionText.trim(),
            answer_text: newBuzzerAnswerText.trim() || null
          }])
          .select()
          .single();

        if (error) throw error;

        setBuzzerQuestions(prev => [...prev, data]);
        setNewBuzzerQuestionText('');
        setNewBuzzerAnswerText('');
        alert('¡Pregunta del pulsador guardada exitosamente!');
      }
    } catch (err: any) {
      alert('Error al guardar la pregunta del pulsador: ' + err.message);
    } finally {
      setAddingBuzzerQuestion(false);
    }
  };

  const startEditingBuzzerQuestion = (q: BuzzerQuestion) => {
    setEditingBuzzerQuestionId(q.id);
    setNewBuzzerQuestionText(q.question_text);
    setNewBuzzerAnswerText(q.answer_text || '');
    
    const formElement = document.getElementById('question-form-container');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const cancelEditingBuzzer = () => {
    setEditingBuzzerQuestionId(null);
    setNewBuzzerQuestionText('');
    setNewBuzzerAnswerText('');
  };

  const handleDeleteBuzzerQuestion = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta pregunta del pulsador?')) return;

    try {
      const { error } = await supabase
        .from('buzzer_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBuzzerQuestions(prev => prev.filter(q => q.id !== id));

      if (editingBuzzerQuestionId === id) {
        cancelEditingBuzzer();
      }
    } catch (err: any) {
      alert('Error al eliminar la pregunta del pulsador: ' + err.message);
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

  // Guardar (crear o actualizar) una pregunta en Supabase
  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim() || newOptions.some(opt => !opt.trim())) {
      alert('Por favor completa el texto de la pregunta y todas las opciones.');
      return;
    }

    setAddingQuestion(true);
    try {
      if (editingQuestionId) {
        // Modo Edición
        const updates: any = {
          question_text: newQuestionText.trim(),
          options: newOptions.map(o => o.trim()),
          correct_option_index: newCorrectIndex
        };

        if (activeQuestionTab === 'music') {
          updates.category = 'music';
          updates.song_title = newMusicSongTitle.trim() || null;
          updates.video_start_seconds = Number(newMusicStartSeconds) || 0;
        } else {
          updates.category = 'trivia';
          updates.song_title = null;
          updates.video_start_seconds = 0;
        }

        const { data, error } = await supabase
          .from('questions')
          .update(updates)
          .eq('id', editingQuestionId)
          .select()
          .single();

        if (error) throw error;

        // Actualizar el listado local de preguntas
        setQuestions(prev => prev.map(q => q.id === editingQuestionId ? data : q));

        // Limpiar formulario y salir de modo edición
        setNewQuestionText('');
        setNewOptions(['', '', '', '']);
        setNewCorrectIndex(0);
        setNewMusicSongTitle('');
        setNewMusicStartSeconds(0);
        setEditingQuestionId(null);
        alert('¡Pregunta actualizada exitosamente!');
      } else {
        // Modo Crear
        const insertObj: any = {
          question_text: newQuestionText.trim(),
          options: newOptions.map(o => o.trim()),
          correct_option_index: newCorrectIndex
        };

        if (activeQuestionTab === 'music') {
          insertObj.category = 'music';
          insertObj.song_title = newMusicSongTitle.trim() || null;
          insertObj.video_start_seconds = Number(newMusicStartSeconds) || 0;
        } else {
          insertObj.category = 'trivia';
        }

        const { data, error } = await supabase
          .from('questions')
          .insert([insertObj])
          .select()
          .single();

        if (error) throw error;

        // Actualizar el listado local de preguntas
        setQuestions(prev => [...prev, data]);

        // Limpiar formulario
        setNewQuestionText('');
        setNewOptions(['', '', '', '']);
        setNewCorrectIndex(0);
        setNewMusicSongTitle('');
        setNewMusicStartSeconds(0);
        alert('¡Pregunta guardada exitosamente!');
      }
    } catch (err: any) {
      alert('Error al guardar la pregunta: ' + err.message);
    } finally {
      setAddingQuestion(false);
    }
  };

  // Iniciar la edición de una pregunta
  const startEditingQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setNewQuestionText(q.question_text);
    setNewOptions([...q.options]);
    setNewCorrectIndex(q.correct_option_index);
    if (q.category === 'music') {
      setNewMusicSongTitle(q.song_title || '');
      setNewMusicStartSeconds(q.video_start_seconds || 0);
      setActiveQuestionTab('music');
    } else {
      setActiveQuestionTab('trivia');
    }
    
    // Hacer scroll suave hacia el formulario en móviles
    const formElement = document.getElementById('question-form-container');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Cancelar la edición
  const cancelEditing = () => {
    setEditingQuestionId(null);
    setNewQuestionText('');
    setNewOptions(['', '', '', '']);
    setNewCorrectIndex(0);
    setNewMusicSongTitle('');
    setNewMusicStartSeconds(0);
  };

  // Eliminar una pregunta de Supabase
  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta pregunta?')) return;

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Actualizar el estado local
      setQuestions(prev => prev.filter(q => q.id !== id));

      // Si se estaba editando la pregunta que se eliminó, cancelamos edición
      if (editingQuestionId === id) {
        cancelEditing();
      }
    } catch (err: any) {
      alert('Error al eliminar la pregunta: ' + err.message);
    }
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

  // Sincronizar tiempo de video de música periódicamente si está reproduciéndose
  // Usamos roomRef para evitar cierres de ámbito obsoletos (stale closures) y limitamos la actualización
  useEffect(() => {
    const currentRoom = roomRef.current;
    if (!currentRoom || currentRoom.status !== 'MUSIC' || !currentRoom.music_video_playing || !playerRef.current) return;

    const syncInterval = setInterval(async () => {
      if (ignoreStateChangeRef.current) return;
      const latestRoom = roomRef.current;
      if (!latestRoom || !playerRef.current) return;

      if (typeof playerRef.current.getCurrentTime === 'function') {
        const currentTime = Math.floor(playerRef.current.getCurrentTime());
        // Solo sincronizamos si hay un desvío mayor a 3 segundos para evitar escrituras redundantes continuas
        if (Math.abs(currentTime - (latestRoom.music_video_time || 0)) > 3) {
          await supabase
            .from('rooms')
            .update({ music_video_time: currentTime })
            .eq('id', latestRoom.id);
        }
      }
    }, 4000);

    return () => clearInterval(syncInterval);
  }, [room?.music_video_playing, room?.status]);

  // Lanzar pregunta de tipo música
  const launchMusicQuestion = async (q: Question) => {
    setLoading(true);
    try {
      ignoreStateChangeRef.current = true;
      const { error: rError } = await supabase
        .from('responses')
        .delete()
        .eq('room_id', room.id);
      if (rError) throw rError;

      const index = questions.findIndex(item => item.id === q.id);
      if (index !== -1) {
        setCurrentQuestionIndex(index);
      }

      const { data, error } = await supabase
        .from('rooms')
        .update({
          current_question_id: q.id,
          question_started_at: new Date().toISOString(),
          music_video_playing: false,
          music_video_time: q.video_start_seconds || 0
        })
        .eq('id', room.id)
        .select()
        .single();

      if (error) throw error;
      setRoom(data);
      setResponses([]);

      // Registrar en el historial de canciones preguntadas
      setAskedMusicQuestionIds(prev => {
        if (prev.includes(q.id)) return prev;
        return [...prev, q.id];
      });

      if (playerRef.current) {
        if (typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(q.video_start_seconds || 0, true);
        }
        if (typeof playerRef.current.pauseVideo === 'function') {
          playerRef.current.pauseVideo();
        }
      }
      
      // Esperamos un segundo a que se estabilice el reproductor antes de aceptar eventos automáticos
      setTimeout(() => {
        ignoreStateChangeRef.current = false;
      }, 1000);
    } catch (err: any) {
      alert('Error al lanzar canción: ' + err.message);
      ignoreStateChangeRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  // Alternar reproducción de video
  const toggleMusicPlayback = async () => {
    if (!room || !playerRef.current) return;
    try {
      ignoreStateChangeRef.current = true;
      const isCurrentlyPlaying = room.music_video_playing;
      let currentTime = room.music_video_time || 0;

      if (isCurrentlyPlaying) {
        if (typeof playerRef.current.getCurrentTime === 'function') {
          currentTime = Math.floor(playerRef.current.getCurrentTime());
        }
        playerRef.current.pauseVideo();
      } else {
        const activeQ = questions.find(q => q.id === room.current_question_id);
        const startSec = activeQ?.video_start_seconds || 0;
        
        let ytTime = 0;
        if (typeof playerRef.current.getCurrentTime === 'function') {
          ytTime = Math.floor(playerRef.current.getCurrentTime());
        }
        
        // Si el tiempo actual de YouTube es 0 o difiere significativamente del inicio de la pregunta activa,
        // forzamos a que empiece en el segundo de inicio correcto para evitar desfases del buffer
        if (ytTime === 0 || Math.abs(ytTime - startSec) > 10) {
          currentTime = startSec;
        } else {
          currentTime = ytTime;
        }
        
        if (typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(currentTime, true);
        }
        playerRef.current.playVideo();
      }

      const { data, error } = await supabase
        .from('rooms')
        .update({
          music_video_playing: !isCurrentlyPlaying,
          music_video_time: currentTime
        })
        .eq('id', room.id)
        .select()
        .single();

      if (error) throw error;
      setRoom(data);

      setTimeout(() => {
        ignoreStateChangeRef.current = false;
      }, 800);
    } catch (e) {
      console.error(e);
      ignoreStateChangeRef.current = false;
    }
  };

  // Adelantar o retroceder la música por N segundos
  const seekMusicBySeconds = async (seconds: number) => {
    if (!room || !playerRef.current) return;
    try {
      ignoreStateChangeRef.current = true;
      let currentTime = room.music_video_time || 0;
      if (typeof playerRef.current.getCurrentTime === 'function') {
        currentTime = Math.floor(playerRef.current.getCurrentTime());
      }
      
      const newTime = Math.max(0, currentTime + seconds);
      
      if (typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(newTime, true);
      }

      const { data, error } = await supabase
        .from('rooms')
        .update({
          music_video_time: newTime
        })
        .eq('id', room.id)
        .select()
        .single();

      if (error) throw error;
      setRoom(data);

      setTimeout(() => {
        ignoreStateChangeRef.current = false;
      }, 800);
    } catch (e) {
      console.error('Error al adelantar/retroceder música:', e);
      ignoreStateChangeRef.current = false;
    }
  };

  // Volver al listado de canciones de música
  const backToMusicList = async () => {
    if (!room) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .update({
          status: 'MUSIC',
          current_question_id: null,
          question_started_at: null,
          music_video_playing: false,
          music_video_time: 0
        })
        .eq('id', room.id)
        .select()
        .single();
      if (error) throw error;
      setRoom(data);
      setResponses([]);
    } catch (err: any) {
      alert('Error al volver al listado: ' + err.message);
    } finally {
      setLoading(false);
    }
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

  // Cambiar el estado de la sala (e.g., ir a Modo Pulsador o Adivina la Canción)
  const changeRoomStatus = async (newStatus: string) => {
    if (!room) return;
    setLoading(true);
    try {
      const updates: any = { 
        status: newStatus 
      };
      
      // Si cambia a LOBBY, resetea estados de trivia y de buzzer/música
      if (newStatus === 'LOBBY') {
        updates.current_question_id = null;
        updates.question_started_at = null;
        updates.buzzer_active = false;
        updates.buzzer_question = null;
        updates.music_video_playing = false;
        updates.music_video_time = 0;
      } else if (newStatus === 'BUZZER') {
        updates.buzzer_active = false;
        updates.buzzer_question = '';
        updates.music_video_playing = false;
        updates.music_video_time = 0;
      } else if (newStatus === 'MUSIC') {
        updates.current_question_id = null;
        updates.question_started_at = null;
        updates.buzzer_active = false;
        updates.buzzer_question = null;
        updates.music_video_playing = false;
        updates.music_video_time = 0;
      }

      const { data, error } = await supabase
        .from('rooms')
        .update(updates)
        .eq('id', room.id)
        .select()
        .single();

      if (error) throw error;
      setRoom(data);
      
      // Limpiar pulsaciones de jugadores al cambiar de modo
      if (newStatus === 'BUZZER' || newStatus === 'LOBBY' || newStatus === 'MUSIC') {
        await supabase
          .from('players')
          .update({ buzzed_at: null })
          .eq('room_id', room.id);
        
        // Actualizar la lista local
        setPlayers(prev => prev.map(p => ({ ...p, buzzed_at: null })));
      }
    } catch (err: any) {
      alert('Error al cambiar de modo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Activar Pulsadores
  const activateBuzzers = async () => {
    if (!room) return;
    setLoading(true);
    try {
      // 1. Limpiar pulsaciones de todos los jugadores en la base de datos
      const { error: resetError } = await supabase
        .from('players')
        .update({ buzzed_at: null })
        .eq('room_id', room.id);

      if (resetError) throw resetError;

      // 2. Activar el pulsador y guardar la pregunta en la sala
      const { data, error } = await supabase
        .from('rooms')
        .update({
          buzzer_active: true,
          buzzer_question: buzzerQuestionInput.trim() || null,
          question_started_at: new Date().toISOString()
        })
        .eq('id', room.id)
        .select()
        .single();

      if (error) throw error;
      setRoom(data);
      
      // Registrar la pregunta como preguntada en el historial
      const matchingQuestion = buzzerQuestions.find(
        q => q.question_text.trim().toLowerCase() === buzzerQuestionInput.trim().toLowerCase()
      );
      if (matchingQuestion) {
        setAskedBuzzerQuestionIds(prev => {
          if (prev.includes(matchingQuestion.id)) return prev;
          return [...prev, matchingQuestion.id];
        });
      } else if (selectedBuzzerQuestionId) {
        setAskedBuzzerQuestionIds(prev => {
          if (prev.includes(selectedBuzzerQuestionId)) return prev;
          return [...prev, selectedBuzzerQuestionId];
        });
      }

      // Resetear la lista local de jugadores (limpiar buzzed_at)
      setPlayers(prev => prev.map(p => ({ ...p, buzzed_at: null })));
    } catch (err: any) {
      alert('Error al activar pulsadores: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Bloquear / Desactivar Pulsadores sin reiniciar
  const disableBuzzers = async () => {
    if (!room) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .update({ buzzer_active: false })
        .eq('id', room.id)
        .select()
        .single();

      if (error) throw error;
      setRoom(data);
    } catch (err: any) {
      alert('Error al desactivar pulsadores: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reiniciar Pulsadores para una nueva ronda
  const resetBuzzers = async () => {
    if (!room) return;
    setLoading(true);
    try {
      // Limpiar pulsaciones en la BD
      const { error: resetError } = await supabase
        .from('players')
        .update({ buzzed_at: null })
        .eq('room_id', room.id);

      if (resetError) throw resetError;

      // Desactivar el pulsador en la sala
      const { data, error } = await supabase
        .from('rooms')
        .update({
          buzzer_active: false,
          buzzer_question: ''
        })
        .eq('id', room.id)
        .select()
        .single();

      if (error) throw error;
      setRoom(data);
      setBuzzerQuestionInput('');
      setSelectedBuzzerQuestionId(null);
      setPlayers(prev => prev.map(p => ({ ...p, buzzed_at: null })));
    } catch (err: any) {
      alert('Error al reiniciar pulsadores: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Limpiar la pulsación de un jugador individual (por ejemplo, si responde mal y queremos que otros tengan oportunidad)
  const clearPlayerBuzzer = async (playerId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({ buzzed_at: null })
        .eq('id', playerId);

      if (error) throw error;

      // Actualizar la lista local
      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, buzzed_at: null } : p));
    } catch (err: any) {
      alert('Error al limpiar pulsación: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Dar puntos al jugador que pulsó
  const awardBuzzerPoints = async (playerId: string, points: number) => {
    setLoading(true);
    try {
      const player = players.find(p => p.id === playerId);
      if (!player) return;

      const newScore = player.score + points;

      const { error } = await supabase
        .from('players')
        .update({ score: newScore })
        .eq('id', playerId);

      if (error) throw error;

      // Actualizar la lista local
      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, score: newScore } : p));
      
      // Sonido de éxito
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (e) {}

      alert(`¡Se otorgaron ${points} puntos a ${player.nickname}!`);
    } catch (err: any) {
      alert('Error al otorgar puntos: ' + err.message);
    } finally {
      setLoading(false);
    }
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
            <div className="flex items-center gap-2">
              {(room.status === 'BUZZER' || room.status === 'MUSIC') ? (
                <button
                  onClick={() => changeRoomStatus('LOBBY')}
                  disabled={loading}
                  className="bg-neon-blue/15 hover:bg-neon-blue/25 text-neon-blue border border-neon-blue/30 text-xs font-semibold py-2 px-3.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5" /> Volver a Trivia
                </button>
              ) : (
                <>
                  <button
                    onClick={() => changeRoomStatus('MUSIC')}
                    disabled={loading}
                    className="bg-neon-green/15 hover:bg-neon-green/25 text-neon-green border border-neon-green/30 text-xs font-semibold py-2 px-3.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Music className="w-3.5 h-3.5 animate-pulse" /> Adivina la Canción
                  </button>

                  <button
                    onClick={() => changeRoomStatus('BUZZER')}
                    disabled={loading}
                    className="bg-neon-pink/15 hover:bg-neon-pink/25 text-neon-pink border border-neon-pink/30 text-xs font-semibold py-2 px-3.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 animate-pulse" /> Modo Pulsador
                  </button>
                </>
              )}
              
              <button
                onClick={deleteRoom}
                disabled={loading}
                className="bg-neon-red/10 hover:bg-neon-red/20 text-neon-red border border-neon-red/30 text-xs font-semibold py-2 px-3.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Cerrar Sala
              </button>
            </div>
          )}
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-5xl w-full mx-auto">
        {!room ? (
          /* CONFIGURACIÓN Y PREPARACIÓN INICIAL (SIN SALA) */
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* PANEL IZQUIERDO: CREAR SALA */}
            <div className="lg:col-span-5 text-center glass-panel p-8 rounded-3xl neon-border-blue flex flex-col justify-center items-center h-full min-h-[380px]">
              <div className="w-16 h-16 bg-neon-blue/15 rounded-2xl mb-6 mx-auto flex items-center justify-center border border-neon-blue/30 shadow-lg shadow-neon-blue/10">
                <Play className="w-8 h-8 text-neon-blue fill-neon-blue" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Crear nueva Sala</h2>
              <p className="text-zinc-400 text-sm mb-8">
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
              <p className="text-xs text-zinc-500 mt-6">
                Preguntas disponibles: <span className="text-neon-blue font-bold">{questions.length}</span>
              </p>
              {questions.length === 0 && (
                <button
                  onClick={generateSeedQuestions}
                  disabled={loading}
                  className="mt-4 text-xs font-semibold text-neon-blue hover:text-neon-pink transition flex items-center gap-1.5 cursor-pointer bg-zinc-800/60 hover:bg-zinc-800 py-2 px-3 rounded-lg border border-zinc-700"
                >
                  <Plus className="w-3.5 h-3.5" /> Cargar Preguntas Semilla
                </button>
              )}
            </div>

            {/* PANEL DERECHO: GESTIÓN DE PREGUNTAS */}
            <div className="lg:col-span-7 flex flex-col gap-6 w-full font-sans">
              
              {/* SELECTOR DE PESTAÑAS */}
              <div className="flex gap-2 p-1.5 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setActiveQuestionTab('trivia');
                    cancelEditing();
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                    activeQuestionTab === 'trivia'
                      ? 'bg-neon-blue/10 text-neon-blue border-neon-blue/30 shadow-sm shadow-neon-blue/5'
                      : 'text-zinc-400 hover:text-white border-transparent'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Preguntas de Trivia
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveQuestionTab('music');
                    cancelEditing();
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                    activeQuestionTab === 'music'
                      ? 'bg-neon-green/10 text-neon-green border-neon-green/30 shadow-sm shadow-neon-green/5'
                      : 'text-zinc-400 hover:text-white border-transparent'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  Adivina la Canción
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveQuestionTab('buzzer');
                    cancelEditing();
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                    activeQuestionTab === 'buzzer'
                      ? 'bg-neon-pink/10 text-neon-pink border-neon-pink/30 shadow-sm shadow-neon-pink/5'
                      : 'text-zinc-400 hover:text-white border-transparent'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Preguntas de Pulsador
                </button>
              </div>

              {activeQuestionTab === 'trivia' || activeQuestionTab === 'music' ? (
                <>
                  {/* CREAR PREGUNTA */}
                  <div id="question-form-container" className="glass-panel p-6 rounded-3xl border border-zinc-800/80 bg-zinc-950/20">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      {editingQuestionId ? (
                        <>
                          <Edit2 className="w-5 h-5 text-neon-blue" />
                          {activeQuestionTab === 'music' ? 'Editar Canción de Disney' : 'Editar Pregunta'}
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5 text-neon-pink" />
                          {activeQuestionTab === 'music' ? 'Agregar Canción de Disney' : 'Agregar Nueva Pregunta'}
                        </>
                      )}
                    </h3>
                    
                    <form onSubmit={handleSubmitQuestion} className="space-y-4">
                      <div>
                        <label className="text-xs text-zinc-400 font-semibold block mb-1">Texto de la Pregunta</label>
                        <input 
                          type="text"
                          value={newQuestionText}
                          onChange={(e) => setNewQuestionText(e.target.value)}
                          placeholder={activeQuestionTab === 'music' ? 'Ej: ¿Qué película de Disney tiene esta canción?' : 'Ej: ¿Cuál es el río más largo del mundo?'}
                          className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/20 transition"
                          required
                        />
                      </div>
                      
                      {activeQuestionTab === 'music' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-zinc-400 font-semibold block mb-1">Título de la Canción</label>
                            <input 
                              type="text"
                              value={newMusicSongTitle}
                              onChange={(e) => setNewMusicSongTitle(e.target.value)}
                              placeholder="Ej: Un mundo ideal / Nadie como tú"
                              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green/20 transition"
                              required
                            />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-400 font-semibold block mb-1">Segundo de inicio (YouTube)</label>
                            <input 
                              type="number"
                              value={newMusicStartSeconds}
                              onChange={(e) => setNewMusicStartSeconds(Number(e.target.value))}
                              placeholder="Ej: 128"
                              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green/20 transition"
                              min={0}
                              required
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {newOptions.map((opt, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-xs text-zinc-400 font-semibold">
                                Opción {String.fromCharCode(65 + idx)}
                              </label>
                              <label className="text-[10px] text-zinc-400 hover:text-neon-green flex items-center gap-1 cursor-pointer transition select-none">
                                <input 
                                  type="radio" 
                                  name="correctOption"
                                  checked={newCorrectIndex === idx}
                                  onChange={() => setNewCorrectIndex(idx)}
                                  className="accent-neon-green"
                                />
                                ¿Correcta?
                              </label>
                            </div>
                            <input 
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const updated = [...newOptions];
                                updated[idx] = e.target.value;
                                setNewOptions(updated);
                              }}
                              placeholder={activeQuestionTab === 'music' ? `Película distractora ${String.fromCharCode(65 + idx)}` : `Opción ${String.fromCharCode(65 + idx)}`}
                              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-2 px-3 text-white text-xs focus:outline-none focus:border-neon-blue focus:ring-1 focus:ring-neon-blue/10 transition"
                              required
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end items-center gap-2 pt-2">
                        {editingQuestionId && (
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs py-2.5 px-5 rounded-xl transition cursor-pointer active:scale-95"
                          >
                            Cancelar
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={addingQuestion}
                          className="bg-gradient-to-r from-neon-blue to-neon-purple hover:shadow-neon-blue/20 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          {addingQuestion ? (
                            'Guardando...'
                          ) : editingQuestionId ? (
                            'Actualizar Pregunta'
                          ) : (
                            'Guardar Pregunta'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* LISTA DE PREGUNTAS */}
                  <div className="glass-panel p-6 rounded-3xl border border-zinc-800/80 bg-zinc-950/20 max-h-[350px] overflow-hidden flex flex-col">
                    {(() => {
                      const filteredQuestions = questions.filter(q => 
                        activeQuestionTab === 'music' ? q.category === 'music' : q.category !== 'music'
                      );

                      return (
                        <>
                          <h3 className="text-lg font-bold text-white mb-3 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              {activeQuestionTab === 'music' ? (
                                <Music className="w-5 h-5 text-neon-green" />
                              ) : (
                                <HelpCircle className="w-5 h-5 text-neon-blue" />
                              )}
                              {activeQuestionTab === 'music' ? `Canciones Existentes (${filteredQuestions.length})` : `Preguntas Existentes (${filteredQuestions.length})`}
                            </span>
                            {filteredQuestions.length > 0 && (
                              <button 
                                onClick={async () => {
                                  if (confirm(`¿Estás seguro de que deseas eliminar TODAS las preguntas de ${activeQuestionTab === 'music' ? 'música' : 'trivia'}?`)) {
                                    const { error } = await supabase
                                      .from('questions')
                                      .delete()
                                      .eq('category', activeQuestionTab === 'music' ? 'music' : 'trivia');
                                    if (error) {
                                      alert('Error al vaciar: ' + error.message);
                                    } else {
                                      fetchQuestions();
                                      alert('¡Preguntas eliminadas correctamente!');
                                    }
                                  }
                                }}
                                className="text-[10px] text-neon-red hover:underline cursor-pointer font-bold uppercase tracking-wider transition"
                              >
                                Eliminar Todas
                              </button>
                            )}
                          </h3>

                          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                            {filteredQuestions.map((q, idx) => (
                              <div key={q.id} className={`p-3 bg-zinc-950/40 border rounded-xl flex justify-between items-start hover:border-zinc-800 transition ${editingQuestionId === q.id ? 'border-neon-blue/60 bg-neon-blue/5' : 'border-zinc-900'}`}>
                                <div className="flex-1 min-w-0 pr-4">
                                  <p className="text-sm font-semibold text-white break-words">{idx + 1}. {q.question_text}</p>
                                  {q.song_title && (
                                    <p className="text-xs text-neon-green font-bold mt-1 flex items-center gap-1.5">
                                      <Music className="w-3.5 h-3.5" /> Canción: {q.song_title} ({q.video_start_seconds}s)
                                    </p>
                                  )}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
                                    {q.options.map((opt, oIdx) => (
                                      <span 
                                        key={oIdx} 
                                        className={`text-[10px] break-words ${oIdx === q.correct_option_index ? 'text-neon-green font-bold' : 'text-zinc-500'}`}
                                      >
                                        {String.fromCharCode(65 + oIdx)}) {opt}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                                  <button 
                                    onClick={() => startEditingQuestion(q)}
                                    className={`p-1 transition cursor-pointer rounded ${editingQuestionId === q.id ? 'text-neon-blue bg-neon-blue/10' : 'text-zinc-500 hover:text-neon-blue hover:bg-zinc-900'}`}
                                    title="Editar"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteQuestion(q.id)}
                                    className="text-zinc-500 hover:text-neon-red p-1 transition cursor-pointer rounded hover:bg-zinc-900"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}

                            {filteredQuestions.length === 0 && (
                              <div className="text-center py-8 text-zinc-600">
                                <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-xs">No hay preguntas cargadas en esta categoría.</p>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </>
              ) : (
                <>
                  {/* CREAR PREGUNTA PULSADOR */}
                  <div id="question-form-container" className="glass-panel p-6 rounded-3xl border border-zinc-800/80 bg-zinc-950/20">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      {editingBuzzerQuestionId ? (
                        <>
                          <Edit2 className="w-5 h-5 text-neon-pink" />
                          Editar Pregunta de Pulsador
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5 text-neon-pink" />
                          Agregar Pregunta de Pulsador
                        </>
                      )}
                    </h3>
                    
                    <form onSubmit={handleSubmitBuzzerQuestion} className="space-y-4">
                      <div>
                        <label className="text-xs text-zinc-400 font-semibold block mb-1">Texto de la Pregunta</label>
                        <input 
                          type="text"
                          value={newBuzzerQuestionText}
                          onChange={(e) => setNewBuzzerQuestionText(e.target.value)}
                          placeholder="Ej: ¿Cuál es la capital de Italia?"
                          className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink/20 transition"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs text-zinc-400 font-semibold block mb-1">Respuesta Correcta (Opcional - Como guía para el administrador)</label>
                        <input 
                          type="text"
                          value={newBuzzerAnswerText}
                          onChange={(e) => setNewBuzzerAnswerText(e.target.value)}
                          placeholder="Ej: Roma"
                          className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink/20 transition"
                        />
                      </div>

                      <div className="flex justify-end items-center gap-2 pt-2">
                        {editingBuzzerQuestionId && (
                          <button
                            type="button"
                            onClick={cancelEditingBuzzer}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs py-2.5 px-5 rounded-xl transition cursor-pointer active:scale-95"
                          >
                            Cancelar
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={addingBuzzerQuestion}
                          className="bg-gradient-to-r from-neon-pink to-neon-purple hover:shadow-neon-pink/20 text-white font-bold text-xs py-2.5 px-6 rounded-xl transition cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          {addingBuzzerQuestion ? (
                            'Guardando...'
                          ) : editingBuzzerQuestionId ? (
                            'Actualizar Pregunta'
                          ) : (
                            'Guardar Pregunta'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* LISTA PREGUNTAS PULSADOR */}
                  <div className="glass-panel p-6 rounded-3xl border border-zinc-800/80 bg-zinc-950/20 max-h-[350px] overflow-hidden flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-neon-pink" />
                        Preguntas de Pulsador Existentes ({buzzerQuestions.length})
                      </span>
                      <div className="flex items-center gap-3">
                        {buzzerQuestions.length === 0 && (
                          <button
                            type="button"
                            onClick={generateSeedBuzzerQuestions}
                            disabled={loading}
                            className="text-[10px] text-neon-pink hover:underline cursor-pointer font-bold uppercase tracking-wider transition"
                          >
                            Cargar Semilla
                          </button>
                        )}
                        {buzzerQuestions.length > 0 && (
                          <button 
                            onClick={async () => {
                              if (confirm('¿Estás seguro de que deseas eliminar TODAS las preguntas del pulsador?')) {
                                const { error } = await supabase.from('buzzer_questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                                if (error) {
                                  alert('Error al vaciar: ' + error.message);
                                } else {
                                  fetchBuzzerQuestions();
                                  alert('¡Preguntas del pulsador eliminadas correctamente!');
                                }
                              }
                            }}
                            className="text-[10px] text-neon-red hover:underline cursor-pointer font-bold uppercase tracking-wider transition"
                          >
                            Eliminar Todas
                          </button>
                        )}
                      </div>
                    </h3>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                      {buzzerQuestions.map((q, idx) => (
                        <div key={q.id} className={`p-3 bg-zinc-950/40 border rounded-xl flex justify-between items-start hover:border-zinc-800 transition ${editingBuzzerQuestionId === q.id ? 'border-neon-pink/60 bg-neon-pink/5' : 'border-zinc-900'}`}>
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-sm font-semibold text-white break-words">{idx + 1}. {q.question_text}</p>
                            {q.answer_text && (
                              <p className="text-xs text-neon-green font-semibold mt-1">
                                Respuesta: {q.answer_text}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                            <button 
                              onClick={() => startEditingBuzzerQuestion(q)}
                              className={`p-1 transition cursor-pointer rounded ${editingBuzzerQuestionId === q.id ? 'text-neon-pink bg-neon-pink/10' : 'text-zinc-500 hover:text-neon-pink hover:bg-zinc-900'}`}
                              title="Editar pregunta"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteBuzzerQuestion(q.id)}
                              className="text-zinc-500 hover:text-neon-red p-1 transition cursor-pointer rounded hover:bg-zinc-900"
                              title="Eliminar pregunta"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {buzzerQuestions.length === 0 && (
                        <div className="text-center py-8 text-zinc-600">
                          <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-xs">No hay preguntas de pulsador cargadas en la base de datos.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

            </div>

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
                    {activeQuestion && activeQuestion.category === 'music' ? (
                      <button
                        onClick={backToMusicList}
                        disabled={loading}
                        className="px-8 py-4 bg-gradient-to-r from-neon-green to-neon-blue text-zinc-950 font-black rounded-xl hover:shadow-neon-green/20 transition cursor-pointer flex items-center gap-2"
                      >
                        Elegir Siguiente Canción
                        <Music className="w-5 h-5" />
                      </button>
                    ) : (
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
                    )}
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

              {/* ESTADO MODO PULSADOR (BUZZER) */}
              {room.status === 'BUZZER' && (
                <div className="glass-panel p-8 rounded-3xl border-zinc-700/80 flex-1 flex flex-col relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-pink to-neon-purple"></div>
                  
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-neon-pink animate-pulse" /> Modo Pulsador Activo
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
                      room.buzzer_active 
                        ? 'bg-neon-green/10 text-neon-green border-neon-green/20' 
                        : 'bg-neon-red/10 text-neon-red border-neon-red/20'
                    }`}>
                      <span className={`w-2 h-2 rounded-full mr-1 ${room.buzzer_active ? 'bg-neon-green animate-ping' : 'bg-neon-red'}`} />
                      {room.buzzer_active ? 'Pulsadores Activos' : 'Bloqueado'}
                    </span>
                  </div>

                  {!room.buzzer_active && (!players.some(p => p.buzzed_at)) ? (
                    /* CONFIGURACIÓN Y ACTIVACIÓN DEL PULSADOR */
                    <div className="flex-1 flex flex-col my-4 space-y-6">
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-white mb-1">Preparar Ronda de Pulsador</h2>
                        <p className="text-zinc-400 text-xs">
                          Selecciona una pregunta precargada o escribe una nueva a continuación.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
                        {/* Columna de Pregunta Activa */}
                        <div className="lg:col-span-5 space-y-4">
                          <div className="space-y-1">
                            <label className="text-xs text-zinc-400 font-semibold block">Pregunta a realizar (Opcional)</label>
                            <input 
                              type="text"
                              value={buzzerQuestionInput}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBuzzerQuestionInput(val);
                                if (selectedBuzzerQuestionId) {
                                  const selectedQuestion = buzzerQuestions.find(q => q.id === selectedBuzzerQuestionId);
                                  if (selectedQuestion && selectedQuestion.question_text !== val) {
                                    setSelectedBuzzerQuestionId(null);
                                  }
                                }
                              }}
                              placeholder="Ej: ¿Cuál es la capital de Italia?"
                              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-neon-pink focus:ring-1 focus:ring-neon-pink/20 transition"
                            />
                          </div>

                          {selectedBuzzerQuestionId ? (
                            (() => {
                              const selectedQuestion = buzzerQuestions.find(q => q.id === selectedBuzzerQuestionId);
                              if (!selectedQuestion) return null;
                              return (
                                <div className="bg-zinc-950/80 border border-neon-pink/30 p-4 rounded-xl relative space-y-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedBuzzerQuestionId(null);
                                      setBuzzerQuestionInput('');
                                    }}
                                    className="absolute top-2 right-2 text-zinc-500 hover:text-white transition cursor-pointer"
                                    title="Quitar selección"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                  <span className="text-[10px] text-neon-pink font-bold uppercase tracking-wider block">Pregunta de la lista activa</span>
                                  <p className="text-xs font-bold text-white pr-6 leading-snug">
                                    {selectedQuestion.question_text}
                                  </p>
                                  {selectedQuestion.answer_text && (
                                    <div className="pt-2 border-t border-zinc-900/60">
                                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Respuesta Correcta</span>
                                      <div className="text-[11px] p-2 rounded bg-neon-green/10 border border-neon-green/20 text-neon-green font-bold">
                                        {selectedQuestion.answer_text}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()
                          ) : null}

                          <button
                            onClick={activateBuzzers}
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-neon-pink to-neon-purple text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-neon-pink/30 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
                          >
                            {loading ? (
                              <span className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
                            ) : (
                              <>
                                <Zap className="w-5 h-5 text-white" />
                                Activar Pulsadores
                              </>
                            )}
                          </button>
                        </div>

                        {/* Columna de Banco de Preguntas precargadas */}
                        <div className="lg:col-span-7 bg-zinc-950/20 border border-zinc-900 rounded-2xl p-4 flex flex-col h-[320px]">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <HelpCircle className="w-4 h-4 text-neon-blue" />
                              Banco de Preguntas ({buzzerQuestions.length})
                            </span>
                            {askedBuzzerQuestionIds.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setAskedBuzzerQuestionIds([])}
                                className="text-[9px] text-zinc-500 hover:text-neon-pink transition font-bold uppercase tracking-wider underline cursor-pointer"
                              >
                                Limpiar historial
                              </button>
                            )}
                          </div>

                          <div className="relative mb-3">
                            <input 
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Buscar pregunta..."
                              className="w-full bg-zinc-950/60 border border-zinc-900 rounded-lg py-2 pl-8 pr-3 text-white text-xs focus:outline-none focus:border-neon-blue transition"
                            />
                            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                          </div>

                          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                            {(() => {
                              const filtered = buzzerQuestions.filter(q => 
                                q.question_text.toLowerCase().includes(searchQuery.toLowerCase())
                              );

                              if (filtered.length === 0) {
                                return (
                                  <div className="text-center py-8 text-zinc-600">
                                    <HelpCircle className="w-8 h-8 mx-auto mb-1.5 opacity-20" />
                                    <p className="text-[11px]">No se encontraron preguntas.</p>
                                  </div>
                                );
                              }

                              return filtered.map((q) => {
                                const realIdx = buzzerQuestions.findIndex(bq => bq.id === q.id);
                                const isSelected = selectedBuzzerQuestionId === q.id;
                                const isAsked = askedBuzzerQuestionIds.includes(q.id);

                                return (
                                  <div 
                                    key={q.id} 
                                    className={`p-2.5 bg-zinc-950/40 border rounded-xl flex items-center justify-between gap-3 transition ${
                                      isSelected 
                                        ? 'border-neon-pink bg-neon-pink/5' 
                                        : 'border-zinc-900 hover:border-zinc-850'
                                    }`}
                                  >
                                    {/* Controles de Reordenamiento */}
                                    <div className="flex flex-col gap-0.5 items-center shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => moveBuzzerQuestion(realIdx, 'up')}
                                        disabled={realIdx === 0}
                                        className="text-zinc-600 hover:text-neon-blue disabled:opacity-30 disabled:hover:text-zinc-600 transition p-0.5 cursor-pointer"
                                        title="Mover arriba"
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <span className="text-[9px] text-zinc-500 font-mono font-bold">#{realIdx + 1}</span>
                                      <button
                                        type="button"
                                        onClick={() => moveBuzzerQuestion(realIdx, 'down')}
                                        disabled={realIdx === buzzerQuestions.length - 1}
                                        className="text-zinc-600 hover:text-neon-blue disabled:opacity-30 disabled:hover:text-zinc-600 transition p-0.5 cursor-pointer"
                                        title="Mover abajo"
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                    </div>

                                    {/* Detalle de Pregunta */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-zinc-200 leading-tight line-clamp-2" title={q.question_text}>
                                        {q.question_text}
                                      </p>
                                      {q.answer_text && (
                                        <span className="text-[9px] text-neon-green font-bold block mt-0.5">
                                          Rta: {q.answer_text}
                                        </span>
                                      )}
                                    </div>

                                    {/* Botón Seleccionar / Indicador */}
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                      {isAsked && (
                                        <span className="text-[7.5px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full border border-zinc-700 font-bold uppercase tracking-wider mb-1">
                                          Usada
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleSelectBuzzerQuestion(q)}
                                        className={`text-[9px] font-black py-1 px-2 rounded-lg transition cursor-pointer ${
                                          isSelected 
                                            ? 'bg-neon-pink text-white border border-neon-pink'
                                            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:text-white'
                                        }`}
                                      >
                                        {isSelected ? 'Cargada' : 'Cargar'}
                                      </button>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* RESULTADOS DEL PULSADOR EN TIEMPO REAL */
                    <div className="flex-1 flex flex-col my-4">
                      {(() => {
                        const matchingQuestion = buzzerQuestions.find(
                          q => q.question_text.trim().toLowerCase() === room.buzzer_question?.trim().toLowerCase()
                        );
                        
                        return (
                          <div className="bg-zinc-950/50 border border-zinc-900 p-4 rounded-2xl mb-6 flex flex-col md:flex-row gap-4 items-center justify-between text-left">
                            <div className="text-left flex-1 min-w-0">
                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Pregunta en pantalla</span>
                              <p className="text-base font-bold text-white leading-snug">"{room.buzzer_question}"</p>
                            </div>
                            
                            {matchingQuestion && matchingQuestion.answer_text && (
                              <div className="w-full md:w-64 shrink-0 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 space-y-1 text-left">
                                <span className="text-[9px] text-neon-green font-bold uppercase tracking-wider block mb-1">Respuesta Correcta</span>
                                <div className="text-xs p-2.5 rounded-lg bg-neon-green/10 border border-neon-green/20 text-neon-green font-bold">
                                  {matchingQuestion.answer_text}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Quien fue el primero en presionar */}
                      {players.filter(p => p.buzzed_at).length > 0 ? (
                        <div className="space-y-6">
                          {(() => {
                            const buzzedPlayers = players
                              .filter(p => p.buzzed_at)
                              .sort((a, b) => new Date(a.buzzed_at!).getTime() - new Date(b.buzzed_at!).getTime());
                            
                            return (
                              <>
                                {/* Primero en presionar - DESTACADO */}
                                <div className="glass-panel p-6 rounded-2xl border border-neon-green/40 shadow-lg shadow-neon-green/5 relative overflow-hidden text-center">
                                  <div className="absolute top-0 right-0 p-2 bg-neon-green/10 text-neon-green rounded-bl-xl text-xs font-mono font-bold border-l border-b border-neon-green/20 animate-pulse">
                                    ¡1º EN PULSAR!
                                  </div>
                                  
                                  <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider block mb-1">Ganó la palabra:</span>
                                  <h3 className="text-3xl font-black text-white neon-glow-green mb-4">
                                    {buzzedPlayers[0].nickname}
                                  </h3>

                                  {/* Controles para otorgar puntos al primer jugador */}
                                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 bg-zinc-950/40 p-4 rounded-xl border border-zinc-900 max-w-sm mx-auto">
                                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block whitespace-nowrap">Pts:</span>
                                      <input 
                                        type="number"
                                        value={pointsToAwardInput}
                                        onChange={(e) => setPointsToAwardInput(e.target.value)}
                                        className="w-16 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-center text-xs font-bold text-neon-green font-mono"
                                        min={1}
                                      />
                                    </div>
                                    <div className="flex gap-2 w-full">
                                      <button
                                        onClick={() => awardBuzzerPoints(buzzedPlayers[0].id, Number(pointsToAwardInput))}
                                        disabled={loading}
                                        className="flex-1 bg-neon-green/20 hover:bg-neon-green/30 text-neon-green border border-neon-green/30 font-bold text-xs py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                                      >
                                        ✓ Correcto
                                      </button>
                                      <button
                                        onClick={() => clearPlayerBuzzer(buzzedPlayers[0].id)}
                                        disabled={loading}
                                        className="bg-neon-red/20 hover:bg-neon-red/30 text-neon-red border border-neon-red/30 font-bold text-xs py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
                                        title="Marcar incorrecto y pasar al siguiente en la lista"
                                      >
                                        ✗ Incorrecto
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Lista completa de los que pulsaron */}
                                {buzzedPlayers.length > 1 && (
                                  <div className="space-y-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Orden de llegada</h4>
                                    <div className="max-h-[150px] overflow-y-auto space-y-2 pr-1">
                                      {buzzedPlayers.slice(1).map((player, idx) => {
                                        const diffMs = new Date(player.buzzed_at!).getTime() - new Date(buzzedPlayers[0].buzzed_at!).getTime();
                                        const diffSec = (diffMs / 1000).toFixed(2);
                                        return (
                                          <div key={player.id} className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl flex items-center justify-between hover:border-zinc-800 transition">
                                            <div className="flex items-center gap-2">
                                              <span className="w-5 h-5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center font-mono font-bold text-xs text-zinc-400">
                                                #{idx + 2}
                                              </span>
                                              <span className="font-bold text-zinc-300 text-sm">{player.nickname}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="font-mono text-xs text-zinc-500">+{diffSec}s</span>
                                              <button
                                                onClick={() => clearPlayerBuzzer(player.id)}
                                                disabled={loading}
                                                className="text-zinc-600 hover:text-neon-red p-1 transition cursor-pointer"
                                                title="Quitar de la lista"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-zinc-500 flex flex-col items-center justify-center gap-4">
                          <div className="w-16 h-16 bg-neon-pink/5 rounded-full border border-neon-pink/15 flex items-center justify-center animate-pulse">
                            <Radio className="w-8 h-8 text-neon-pink animate-ping" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">Pulsadores habilitados...</p>
                            <p className="text-xs text-zinc-500 mt-1">Los jugadores tienen el botón de responder en sus móviles.</p>
                          </div>
                        </div>
                      )}

                      <div className="mt-auto pt-6 border-t border-zinc-800/80 flex flex-wrap justify-between items-center gap-4">
                        <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                          Pulsados: <strong className="text-white">{players.filter(p => p.buzzed_at).length} / {players.length}</strong>
                        </span>

                        <div className="flex gap-2">
                          {room.buzzer_active && (
                            <button
                              onClick={disableBuzzers}
                              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-semibold rounded-xl border border-zinc-800 text-xs transition cursor-pointer"
                            >
                              Bloquear Pulsadores
                            </button>
                          )}
                          <button
                            onClick={resetBuzzers}
                            className="px-4 py-2 bg-neon-pink/10 hover:bg-neon-pink/20 text-neon-pink font-bold rounded-xl border border-neon-pink/20 text-xs transition cursor-pointer"
                          >
                            Reiniciar Pulsadores
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODO MÚSICA (ADIVINA LA CANCIÓN) */}
              {room.status === 'MUSIC' && (
                <div className="glass-panel p-6 rounded-3xl border-zinc-800 flex-1 flex flex-col min-h-[480px]">
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
                    <div>
                      <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <Music className="w-5 h-5 text-neon-green animate-pulse" />
                        Adivina la Canción (Disney)
                      </h2>
                      <p className="text-xs text-zinc-400">Selecciona y reproduce las canciones de Disney para los usuarios</p>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Columna Izquierda: Reproductor y controles permanentes (8 columnas) */}
                    <div className="lg:col-span-8 flex flex-col gap-4 font-sans border-r border-zinc-900/50 pr-0 lg:pr-6">
                      <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block">Reproductor de Video</span>
                      
                      {/* Contenedor del reproductor de YouTube */}
                      <div className="w-full aspect-video rounded-2xl overflow-hidden border border-zinc-800 bg-black relative flex items-center justify-center">
                        <div id="admin-youtube-player" className="w-full h-full"></div>
                        {!playerReady && (
                          <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-2">
                            <span className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-neon-green border-t-transparent"></span>
                            <span className="text-xs text-zinc-400 font-medium">Cargando reproductor...</span>
                          </div>
                        )}
                      </div>

                      {/* Controles de reproducción */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-zinc-950/40 p-4 rounded-xl border border-zinc-900">
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Retroceder 5 segundos */}
                          <button
                            onClick={() => seekMusicBySeconds(-5)}
                            disabled={!playerReady}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer relative"
                            title="Retroceder 5 segundos"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span className="text-[8px] font-bold absolute bottom-1">-5s</span>
                          </button>

                          {/* Play / Pause */}
                          <button
                            onClick={toggleMusicPlayback}
                            disabled={!playerReady}
                            className={`w-14 h-14 rounded-full flex items-center justify-center transition shrink-0 cursor-pointer ${
                              room.music_video_playing
                                ? 'bg-neon-red/10 text-neon-red border border-neon-red/30 hover:bg-neon-red/20'
                                : 'bg-neon-green/10 text-neon-green border border-neon-green/30 hover:bg-neon-green/20'
                            }`}
                          >
                            {room.music_video_playing ? (
                              <Pause className="w-6 h-6 fill-current" />
                            ) : (
                              <Play className="w-6 h-6 fill-current ml-1" />
                            )}
                          </button>

                          {/* Avanzar 5 segundos */}
                          <button
                            onClick={() => seekMusicBySeconds(5)}
                            disabled={!playerReady}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition cursor-pointer relative"
                            title="Avanzar 5 segundos"
                          >
                            <RotateCw className="w-4 h-4" />
                            <span className="text-[8px] font-bold absolute bottom-1">+5s</span>
                          </button>
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {room.music_video_playing ? 'Reproduciendo audio...' : 'Audio en pausa'}
                          </p>
                          <p className="text-[10px] text-zinc-500 leading-tight">
                            Sincronizado con los teléfonos de los usuarios.
                          </p>
                        </div>
                      </div>

                      {/* Información de la canción activa y botón para finalizar ronda */}
                      {room.current_question_id && (() => {
                        const activeQ = questions.find(q => q.id === room.current_question_id);
                        if (!activeQ) return null;
                        return (
                          <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-900 space-y-4 text-left">
                            <div>
                              <span className="text-[9px] text-neon-green font-black uppercase tracking-wider block mb-1">Pregunta Activa en Teléfonos</span>
                              <p className="text-sm font-bold text-white leading-snug">"{activeQ.question_text}"</p>
                              {activeQ.song_title && (
                                <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                                  <Music className="w-3 h-3 text-neon-green" /> Canción: <span className="text-white font-medium">{activeQ.song_title}</span>
                                </p>
                              )}
                            </div>

                            {/* Opciones de respuesta para el administrador */}
                            <div className="space-y-1.5">
                              <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-widest block">Opciones del juego</span>
                              <div className="grid grid-cols-2 gap-2">
                                {activeQ.options.map((opt, idx) => {
                                  const isCorrect = idx === activeQ.correct_option_index;
                                  return (
                                    <div 
                                      key={idx} 
                                      className={`p-2 rounded-lg border text-xs truncate font-medium flex items-center gap-1.5 ${
                                        isCorrect 
                                          ? 'border-neon-green/45 bg-neon-green/10 text-white' 
                                          : 'border-zinc-800/80 bg-zinc-950/60 text-zinc-400'
                                      }`}
                                    >
                                      <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold ${
                                        isCorrect ? 'bg-neon-green text-zinc-950' : 'bg-zinc-900 text-zinc-500'
                                      }`}>
                                        {String.fromCharCode(65 + idx)}
                                      </span>
                                      <span className="truncate">{opt}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="flex gap-2 pt-1 border-t border-zinc-900/60">
                              <button
                                onClick={async () => {
                                  if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
                                    playerRef.current.pauseVideo();
                                  }
                                  await showLeaderboard();
                                }}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-neon-green to-neon-blue text-zinc-950 font-black py-2 px-3 rounded-lg hover:shadow-neon-green/20 transition cursor-pointer text-xs flex items-center justify-center gap-1.5"
                              >
                                Finalizar Ronda y Puntos
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={backToMusicList}
                                disabled={loading}
                                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-[10px] font-bold py-2 px-3 rounded-lg transition cursor-pointer"
                              >
                                Quitar Pregunta
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Columna Derecha: Listado de Canciones o Estadísticas de Respuestas (4 columnas) */}
                    <div className="lg:col-span-4 flex flex-col gap-4 font-sans">
                      {!room.current_question_id ? (
                        /* LISTADO DE CANCIONES DE MÚSICA DISPONIBLES PARA LANZAR */
                        <div className="flex flex-col h-full">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest block">Seleccionar Canción</span>
                            {askedMusicQuestionIds.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setAskedMusicQuestionIds([])}
                                className="text-[9px] text-zinc-500 hover:text-neon-green transition font-bold uppercase tracking-wider underline cursor-pointer"
                              >
                                Limpiar historial
                              </button>
                            )}
                          </div>
                          <div className="mb-3 relative">
                            <input
                              type="text"
                              value={musicSearchQuery}
                              onChange={(e) => setMusicSearchQuery(e.target.value)}
                              placeholder="Buscar película o canción de Disney..."
                              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green/20 transition"
                            />
                            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                          </div>

                          <div className="flex-1 overflow-y-auto max-h-[360px] space-y-2 pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                            {(() => {
                              const musicQuestions = questions.filter(q => q.category === 'music');
                              const filtered = musicQuestions.filter(q => 
                                q.question_text.toLowerCase().includes(musicSearchQuery.toLowerCase()) ||
                                (q.song_title && q.song_title.toLowerCase().includes(musicSearchQuery.toLowerCase())) ||
                                q.options.some(opt => opt.toLowerCase().includes(musicSearchQuery.toLowerCase()))
                              );

                              return (
                                <>
                                  {filtered.map((q) => {
                                    const isAsked = askedMusicQuestionIds.includes(q.id);
                                    return (
                                      <div 
                                        key={q.id} 
                                        className={`p-2.5 border rounded-xl flex items-center justify-between hover:border-zinc-855 transition ${
                                          isAsked 
                                            ? 'border-zinc-900/50 bg-zinc-950/10 opacity-50 hover:opacity-80' 
                                            : 'bg-zinc-950/30 border-zinc-900 hover:bg-zinc-900/10'
                                        }`}
                                      >
                                        <div className="flex-1 min-w-0 pr-3">
                                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                                            <Music className="w-3 h-3 text-neon-green shrink-0" />
                                            <span className="truncate">{q.song_title || 'Canción sin título'}</span>
                                            {isAsked && (
                                              <span className="text-[7.5px] bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-800 font-bold uppercase tracking-wider shrink-0">
                                                Usada
                                              </span>
                                            )}
                                          </h4>
                                          <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                                            Película correcta: <span className="text-neon-green font-semibold">{q.options[q.correct_option_index]}</span>
                                          </p>
                                          <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
                                            Segundo de inicio: {q.video_start_seconds}s
                                          </p>
                                        </div>
                                        
                                        <button
                                          onClick={() => launchMusicQuestion(q)}
                                          disabled={loading}
                                          className={`font-bold text-[10px] py-1.5 px-3 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0 ${
                                            isAsked
                                              ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-850 hover:border-zinc-700'
                                              : 'bg-neon-green/10 hover:bg-neon-green/20 text-neon-green border border-neon-green/30 hover:border-neon-green'
                                          }`}
                                        >
                                          {isAsked ? 'Lanzar de nuevo' : 'Lanzar a teléfonos'}
                                        </button>
                                      </div>
                                    );
                                  })}

                                  {filtered.length === 0 && (
                                    <div className="text-center py-8 text-zinc-600">
                                      <Music className="w-8 h-8 mx-auto mb-1.5 opacity-20" />
                                      <p className="text-xs font-semibold">No se encontraron canciones.</p>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      ) : (
                        /* RESPUESTAS RECIBIDAS EN TIEMPO REAL */
                        (() => {
                          const activeQ = questions.find(q => q.id === room.current_question_id);
                          if (!activeQ) return null;
                          return (
                            <div className="flex flex-col justify-between h-full bg-zinc-950/20 border border-zinc-900 rounded-2xl p-4">
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                    Respuestas recibidas:
                                  </h4>
                                  <span className="text-xs font-bold text-white font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                                    {responses.length} / {players.length}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                  {activeQ.options.map((opt, oIdx) => {
                                    const count = responses.filter(r => r.selected_option === oIdx).length;
                                    const isCorrect = oIdx === activeQ.correct_option_index;

                                    return (
                                      <div key={oIdx} className={`p-2.5 rounded-xl border flex justify-between items-center bg-zinc-950/40 ${
                                        isCorrect ? 'border-neon-green/30 bg-neon-green/5' : 'border-zinc-900'
                                      }`}>
                                        <span className={`text-xs truncate ${isCorrect ? 'text-neon-green font-bold' : 'text-zinc-400'}`}>
                                          {String.fromCharCode(65 + oIdx)}) {opt}
                                        </span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                          count > 0 ? 'bg-zinc-800 text-white' : 'bg-transparent text-zinc-600'
                                        }`}>
                                          {count}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="mt-4 text-center">
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest animate-pulse">
                                  Los jugadores están respondiendo en sus teléfonos móviles.
                                </span>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
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
