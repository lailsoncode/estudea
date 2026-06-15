import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  GameControllerIcon,
  CheckmarkCircle02Icon,
  Medal01Icon,
  Medal02Icon,
  Medal03Icon,
  FireIcon,
  Trophy,
  CrownIcon
} from '@hugeicons/core-free-icons';

interface ArenaLiveProfessorProps {
  session: any;
  onClose: () => void;
}

interface Question {
  id: string;
  enunciado: string;
  opcoes: string[];
  resposta_correta: string;
}

interface Player {
  id: string;
  nickname: string;
  total_score: number;
  streak: number;
  aluno_id?: string | null;
  turma_id?: string | null;
}

interface ResponseData {
  chosen_option: string;
  is_correct: boolean;
}

export const ArenaLiveProfessor: React.FC<ArenaLiveProfessorProps> = ({ session, onClose }) => {
  const professorId = session?.user?.id;

  // Step 1: Select quiz
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedAulaId, setSelectedAulaId] = useState<string>('');
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [aiLoadingMessage, setAiLoadingMessage] = useState<string>('');

  // Step 2: Game state
  const [gameSessionId, setGameSessionId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [gameStatus, setGameStatus] = useState<'lobby' | 'question' | 'scoreboard' | 'finished'>('lobby');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [responses, setResponses] = useState<ResponseData[]>([]);

  // Timers and counters
  const [timer, setTimer] = useState<number>(30);
  const [activeTimer, setActiveTimer] = useState<boolean>(false);
  const timerIntervalRef = useRef<any>(null);
  const questionStartRef = useRef<number>(0);

  // Custom Arena configurations
  const [exibirPerguntas, setExibirPerguntas] = useState<boolean>(true);
  const [projectorMode, setProjectorMode] = useState<boolean>(true);

  // Color schemas for options
  const optionStyles = [
    { bg: 'bg-red-500 hover:bg-red-600', border: 'border-red-600', shape: '▲', colorName: 'Vermelho' },
    { bg: 'bg-blue-500 hover:bg-blue-600', border: 'border-blue-600', shape: '◆', colorName: 'Azul' },
    { bg: 'bg-amber-500 hover:bg-amber-600', border: 'border-amber-600', shape: '●', colorName: 'Amarelo' },
    { bg: 'bg-emerald-500 hover:bg-emerald-600', border: 'border-emerald-600', shape: '■', colorName: 'Verde' }
  ];

  // Fetch quizzes on mount
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const { data, error } = await supabase
          .from('aulas')
          .select(`
            id,
            titulo,
            modulo_id,
            modulos (
              id,
              titulo,
              cursos (
                id,
                titulo
              )
            )
          `)
          .eq('tipo', 'quiz')
          .eq('permite_arena', true);
        if (error) throw error;
        setQuizzes(data || []);
        if (data && data.length > 0) {
          setSelectedAulaId(data[0].id);
        }
      } catch (err: any) {
        console.error('Erro ao buscar quizzes:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, []);

  // Subscribe to players entering the lobby and responses
  useEffect(() => {
    if (!gameSessionId) return;

    // Fetch players initially
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('kahoot_players')
        .select('*')
        .eq('session_id', gameSessionId);
      setPlayers(data || []);
    };
    fetchPlayers();

    // Subscribe to changes in players
    const playersSub = supabase
      .channel(`players_${gameSessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kahoot_players', filter: `session_id=eq.${gameSessionId}` },
        () => {
          fetchPlayers();
        }
      )
      .subscribe();

    // Subscribe to responses
    const fetchResponses = async () => {
      const { data } = await supabase
        .from('kahoot_responses')
        .select('chosen_option, is_correct')
        .eq('session_id', gameSessionId)
        .eq('question_index', currentQuestionIdx);
      setResponses(data || []);
    };

    const responsesSub = supabase
      .channel(`responses_${gameSessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'kahoot_responses', filter: `session_id=eq.${gameSessionId}` },
        () => {
          fetchResponses();
        }
      )
      .subscribe();

    fetchResponses();

    return () => {
      supabase.removeChannel(playersSub);
      supabase.removeChannel(responsesSub);
    };
  }, [gameSessionId, currentQuestionIdx]);

  // Handle countdown timer
  useEffect(() => {
    if (activeTimer && timer > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setActiveTimer(false);
            showScoreboard();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeTimer, timer]);

  // End question timer if everyone answered
  useEffect(() => {
    if (activeTimer && players.length > 0 && responses.length >= players.length) {
      clearInterval(timerIntervalRef.current);
      setActiveTimer(false);
      showScoreboard();
    }
  }, [responses, players, activeTimer]);

  const generatePin = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const startLiveQuiz = async () => {
    if (!selectedAulaId) return;
    setLoading(true);
    setAiLoadingMessage('Carregando questões da Arena...');

    try {
      // 1. Fetch Arena questions first
      const { data: qData, error: qError } = await supabase
        .from('questoes')
        .select('*')
        .eq('aula_id', selectedAulaId)
        .eq('para_arena', true)
        .order('ordem', { ascending: true });
      if (qError) throw qError;

      let finalQuestions = qData || [];

      // Fallback to standard questions if no Arena questions are configured
      if (finalQuestions.length === 0) {
        setAiLoadingMessage('Nenhuma questão específica da Arena encontrada. Carregando quiz original...');
        const { data: stdData, error: stdError } = await supabase
          .from('questoes')
          .select('*')
          .eq('aula_id', selectedAulaId)
          .eq('para_arena', false)
          .order('ordem', { ascending: true });
        if (stdError) throw stdError;
        finalQuestions = stdData || [];
      }

      if (finalQuestions.length === 0) {
        alert('Este quiz não possui questões cadastradas!');
        setLoading(false);
        return;
      }

      setQuestions(finalQuestions);

      // 2. Create session freezing the questions
      const gamePin = generatePin();
      const insertPayload: any = {
        pin: gamePin,
        professor_id: professorId,
        aula_id: selectedAulaId,
        status: 'lobby',
        current_question_index: 0,
        questoes_customizadas: finalQuestions,
        exibir_perguntas: exibirPerguntas
      };

      let { data: sessionData, error: sError } = await supabase
        .from('kahoot_sessions')
        .insert(insertPayload)
        .select()
        .single();

      if (sError) {
        console.warn('Erro ao inserir com exibir_perguntas, tentando sem a coluna:', sError);
        delete insertPayload.exibir_perguntas;
        const retryResult = await supabase
          .from('kahoot_sessions')
          .insert(insertPayload)
          .select()
          .single();
        sessionData = retryResult.data;
        sError = retryResult.error;
      }

      if (sError) throw sError;

      setGameSessionId(sessionData.id);
      setPin(gamePin);
      setGameStatus('lobby');
      setGameStarted(true);

      // Notify realtime channel
      const gameChannel = supabase.channel(`kahoot_${gamePin}`);
      await gameChannel.subscribe();
    } catch (err: any) {
      console.error('Erro ao iniciar Arena Live:', err.message);
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
      setAiLoadingMessage('');
    }
  };

  const nextQuestion = async () => {
    const nextIdx = gameStatus === 'lobby' ? 0 : currentQuestionIdx + 1;
    if (nextIdx >= questions.length) {
      // Game over, go to podium
      setGameStatus('finished');
      await supabase
        .from('kahoot_sessions')
        .update({ status: 'finished' })
        .eq('id', gameSessionId);

      // Save ranking entries for all players
      try {
        const sorted = [...players].sort((a, b) => b.total_score - a.total_score);
        const totalPlayers = sorted.length;

        // Fetch per-player correct answer counts from kahoot_responses
        const { data: allResponses } = await supabase
          .from('kahoot_responses')
          .select('player_id, is_correct')
          .eq('session_id', gameSessionId);

        // Fetch the quiz title
        const selectedQuiz = quizzes.find(q => q.id === selectedAulaId);
        const quizTitulo = selectedQuiz?.titulo || null;

        const rankingEntries = sorted.map((p, idx) => {
          const playerResponses = (allResponses || []).filter(r => r.player_id === p.id);
          const totalCorrect = playerResponses.filter(r => r.is_correct).length;

          return {
            session_id: gameSessionId,
            aluno_id: p.aluno_id || null,
            turma_id: p.turma_id || null,
            nickname: p.nickname,
            total_score: p.total_score,
            total_correct: totalCorrect,
            total_questions: questions.length,
            final_position: idx + 1,
            total_players: totalPlayers,
            streak_max: p.streak || 0,
            quiz_titulo: quizTitulo,
            played_at: new Date().toISOString(),
          };
        });

        if (rankingEntries.length > 0) {
          await supabase.from('arena_ranking').insert(rankingEntries);
        }
      } catch (err: any) {
        console.error('Erro ao salvar ranking da arena:', err.message);
      }

      // Broadcast to players
      const channel = supabase.channel(`kahoot_${pin}`);
      channel.send({
        type: 'broadcast',
        event: 'game_state',
        payload: { status: 'finished' }
      });
      return;
    }

    setCurrentQuestionIdx(nextIdx);
    setResponses([]);
    setTimer(30);
    setGameStatus('question');
    questionStartRef.current = Date.now();

    // Update DB
    await supabase
      .from('kahoot_sessions')
      .update({
        status: 'question',
        current_question_index: nextIdx,
        question_started_at: new Date().toISOString()
      })
      .eq('id', gameSessionId);

    // Broadcast
    const channel = supabase.channel(`kahoot_${pin}`);
    channel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: {
        status: 'question',
        questionIndex: nextIdx,
        questionLength: questions.length,
        optionsCount: questions[nextIdx].opcoes.length,
        exibirPerguntas: exibirPerguntas
      }
    });

    setActiveTimer(true);
  };

  const showScoreboard = async () => {
    setGameStatus('scoreboard');
    
    // Update DB
    await supabase
      .from('kahoot_sessions')
      .update({ status: 'scoreboard' })
      .eq('id', gameSessionId);

    // Broadcast
    const channel = supabase.channel(`kahoot_${pin}`);
    channel.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { status: 'scoreboard' }
    });
  };

  const endSession = async () => {
    if (window.confirm('Deseja encerrar esta Arena Live?')) {
      if (gameSessionId) {
        await supabase.from('kahoot_sessions').delete().eq('id', gameSessionId);
      }
      onClose();
    }
  };

  // Render option chart metrics
  const getOptionCount = (optionText: string) => {
    return responses.filter(r => r.chosen_option === optionText).length;
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden flex flex-col font-sans transition-colors duration-300 ${projectorMode ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-white'}`}>
      
      {/* Upper header */}
      <header className={`px-6 py-4 flex justify-between items-center flex-shrink-0 transition-colors duration-300 border-b ${projectorMode ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-slate-900 border-slate-800 text-white'}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-md">
            <HugeiconsIcon icon={GameControllerIcon} size={18} strokeWidth={2} />
          </div>
          <div>
            <h1 className={`font-heading font-black text-body-lg leading-tight ${projectorMode ? 'text-slate-900' : 'text-white'}`}>Arena Estudea Live</h1>
            <p className={`text-xs ${projectorMode ? 'text-slate-500' : 'text-slate-400'}`}>Quiz Multiplayer em Tempo Real</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setProjectorMode(!projectorMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              projectorMode 
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-350 text-slate-750' 
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="Alternar entre tema claro (projetor) e escuro"
          >
            {projectorMode ? '☀ Modo Projetor (Claro)' : '🌙 Modo Escuro'}
          </button>
          <button 
            onClick={endSession}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
          >
            Encerrar Partida
          </button>
        </div>
      </header>

      {/* Main Game Screen */}
      {!gameStarted ? (
        <div className={`flex-1 flex items-center justify-center p-6 transition-colors duration-300 ${projectorMode ? 'bg-slate-100' : 'bg-radial-at-t from-slate-900 via-slate-950 to-black'}`}>
          <div className={`max-w-md w-full border rounded-3xl p-8 space-y-6 shadow-2xl text-center transition-all duration-300 ${projectorMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'}`}>
            <h2 className="font-heading font-black text-headline-lg">Criar Nova Arena</h2>
            <p className={`text-sm ${projectorMode ? 'text-slate-600' : 'text-slate-400'}`}>Selecione um dos quizzes disponíveis no curso para criar uma sessão multiplayer ao vivo com seus alunos.</p>
            
            {loading ? (
              <div className="py-8 flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
                <span className="text-xs text-slate-500 font-medium">{aiLoadingMessage || 'Buscando quizzes...'}</span>
              </div>
            ) : quizzes.length === 0 ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl text-sm italic">
                Nenhum quiz cadastrado sob a gestão deste curso.
              </div>
            ) : (
              <div className="space-y-4 text-left">
                <div>
                  <label className={`text-xs font-bold uppercase tracking-wide block mb-1.5 ${projectorMode ? 'text-slate-600' : 'text-slate-400'}`}>Escolha o Quiz:</label>
                  <select 
                    value={selectedAulaId} 
                    onChange={(e) => setSelectedAulaId(e.target.value)}
                    className={`w-full p-3 border rounded-xl focus:border-primary text-sm outline-none ${projectorMode ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'}`}
                  >
                    {quizzes.map(q => {
                      const courseTitle = q.modulos?.cursos?.titulo || 
                                          (Array.isArray(q.modulos) ? q.modulos[0]?.cursos?.titulo : null) || 
                                          (Array.isArray(q.modulos?.cursos) ? q.modulos.cursos[0]?.titulo : null);
                      const displayTitle = courseTitle ? `[${courseTitle}] ${q.titulo}` : q.titulo;
                      return (
                        <option key={q.id} value={q.id}>
                          {displayTitle}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="flex items-center gap-2.5 py-1">
                  <input
                    type="checkbox"
                    id="exibirPerguntas"
                    checked={exibirPerguntas}
                    onChange={(e) => setExibirPerguntas(e.target.checked)}
                    className={`w-4 h-4 rounded border focus:ring-primary ${
                      projectorMode 
                        ? 'border-slate-300 bg-slate-50 text-primary' 
                        : 'border-slate-800 bg-slate-950 text-primary'
                    }`}
                  />
                  <label htmlFor="exibirPerguntas" className={`text-xs font-bold cursor-pointer select-none ${projectorMode ? 'text-slate-700' : 'text-slate-300'}`}>
                    Mostrar perguntas e alternativas na tela do aluno
                  </label>
                </div>

                <button
                  onClick={startLiveQuiz}
                  className="w-full py-4 bg-primary hover:bg-blue-700 text-white font-heading font-black text-body-md rounded-xl transition-all shadow-lg shadow-primary/20"
                >
                  Criar Arena Live
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`flex-1 flex flex-col relative transition-all duration-300 ${projectorMode ? 'bg-slate-100' : 'bg-slate-950'}`}>
          
          {/* LOBBY STATE */}
          {gameStatus === 'lobby' && (
            <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8 animate-fade-in transition-all duration-300 ${projectorMode ? 'bg-slate-100' : 'bg-radial-at-t from-indigo-950 via-slate-950 to-black'}`}>
              <div className="space-y-2">
                <p className={`text-sm font-semibold uppercase tracking-widest ${projectorMode ? 'text-slate-600' : 'text-slate-400'}`}>Entre no painel do aluno e digite o PIN:</p>
                <h2 className={`text-7xl font-heading font-black tracking-widest drop-shadow-sm select-all ${projectorMode ? 'text-primary' : 'text-primary-fixed-dim'}`}>{pin}</h2>
              </div>

              <div className={`w-full max-w-2xl border rounded-3xl p-6 flex flex-col h-[350px] transition-all duration-300 ${projectorMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/40 border-slate-800/60 backdrop-blur'}`}>
                <div className={`flex justify-between items-center pb-3 border-b ${projectorMode ? 'border-slate-100' : 'border-slate-800'}`}>
                  <span className={`font-bold text-sm ${projectorMode ? 'text-slate-600' : 'text-slate-400'}`}>Jogadores no Lobby</span>
                  <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${projectorMode ? 'bg-primary/10 text-primary' : 'bg-primary/20 text-primary-fixed-dim'}`}>
                    {players.length} Conectados
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 align-content-start pr-1 scrollbar-thin">
                  {players.map(p => (
                    <div 
                      key={p.id} 
                      className={`px-4 py-2.5 border rounded-xl font-sans font-bold text-sm text-center shadow-sm animate-scale-up ${projectorMode ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-800/80 border-slate-700/50 text-white'}`}
                    >
                      {p.nickname}
                    </div>
                  ))}
                  {players.length === 0 && (
                    <div className={`col-span-full h-full flex items-center justify-center italic text-sm ${projectorMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Aguardando alunos entrarem...
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={nextQuestion}
                disabled={players.length === 0}
                className="px-12 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-black text-body-md rounded-xl transition-all shadow-lg"
              >
                Começar Partida
              </button>
            </div>
          )}

          {/* QUESTION PLAYING STATE */}
          {gameStatus === 'question' && (
            <div className="flex-1 flex flex-col p-6 space-y-6 animate-fade-in">
              
              {/* Question card */}
              <div className={`border rounded-3xl p-6 text-center shadow-md transition-all duration-300 ${projectorMode ? 'bg-white border-slate-200' : 'bg-slate-900/50 border-slate-800'}`}>
                <span className="text-xs text-primary font-bold uppercase tracking-wider">Questão {currentQuestionIdx + 1} de {questions.length}</span>
                <h2 className={`text-2xl sm:text-3xl font-heading font-extrabold mt-3 max-w-4xl mx-auto leading-tight ${projectorMode ? 'text-slate-900' : 'text-white'}`}>
                  {questions[currentQuestionIdx].enunciado}
                </h2>
              </div>

              {/* Grid: Timer, Options, Counter */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Timer Column (3 Columns) */}
                <div className={`lg:col-span-3 flex flex-col items-center justify-center border rounded-3xl p-6 text-center space-y-4 transition-all duration-300 ${projectorMode ? 'bg-white border-slate-200 shadow-sm text-slate-900' : 'bg-slate-900/30 border-slate-800 backdrop-blur'}`}>
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    {/* Ring indicator */}
                    <div className={`w-28 h-28 rounded-full border-8 ${timer < 5 ? 'border-red-600 animate-ping absolute opacity-10' : 'border-primary/10 absolute'}`} />
                    <div className={`w-28 h-28 rounded-full border-8 ${timer < 5 ? 'border-red-600' : 'border-primary'} flex items-center justify-center font-heading font-black text-4xl ${projectorMode ? 'text-slate-900' : 'text-white'}`}>
                      {timer}
                    </div>
                  </div>
                  <span className={`font-bold text-xs uppercase tracking-wide ${projectorMode ? 'text-slate-650 font-bold' : 'text-slate-400'}`}>Segundos Restantes</span>
                </div>

                {/* Question Options (6 Columns) */}
                <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {questions[currentQuestionIdx].opcoes.map((option, idx) => {
                    const style = optionStyles[idx];
                    return (
                      <div 
                        key={idx}
                        className={`p-5 rounded-2xl border ${style.bg} border-transparent flex items-center gap-4 text-left shadow-md`}
                      >
                        <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-lg">{style.shape}</span>
                        <span className="font-sans font-bold text-sm text-white">{option}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Answers Counter (3 Columns) */}
                <div className={`lg:col-span-3 flex flex-col items-center justify-center border rounded-3xl p-6 text-center space-y-4 transition-all duration-300 ${projectorMode ? 'bg-white border-slate-200 shadow-sm text-slate-900' : 'bg-slate-900/30 border-slate-800 backdrop-blur'}`}>
                  <div className={`text-5xl font-heading font-black ${projectorMode ? 'text-slate-900' : 'text-white'}`}>{responses.length}</div>
                  <span className={`font-bold text-xs uppercase tracking-wide ${projectorMode ? 'text-slate-650 font-bold' : 'text-slate-400'}`}>Respostas Recebidas</span>
                  <div className={`w-full rounded-full h-2 overflow-hidden mt-2 ${projectorMode ? 'bg-slate-250' : 'bg-slate-800'}`}>
                    <div 
                      className="bg-primary h-full rounded-full transition-all duration-300" 
                      style={{ width: `${players.length > 0 ? (responses.length / players.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* SCOREBOARD STATE */}
          {gameStatus === 'scoreboard' && (
            <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto scrollbar-thin animate-fade-in">
              <div className="text-center space-y-2">
                <span className="text-xs text-primary font-bold uppercase tracking-wider">Resultado da Questão {currentQuestionIdx + 1}</span>
                <h2 className={`text-xl sm:text-2xl font-heading font-extrabold ${projectorMode ? 'text-slate-900' : 'text-white'}`}>Opção Correta:</h2>
                <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl font-heading font-bold text-sm max-w-lg mx-auto border ${projectorMode ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                  <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} strokeWidth={3} />
                  </span>
                  {questions[currentQuestionIdx].resposta_correta}
                </div>
              </div>

              {/* Grid: Bar Chart & Leaderboard */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Options answers count bar chart (6 Columns) */}
                <div className={`lg:col-span-6 border rounded-3xl p-6 space-y-4 transition-all duration-300 ${projectorMode ? 'bg-white border-slate-200 shadow-sm text-slate-900' : 'bg-slate-900/40 border-slate-800/60 backdrop-blur'}`}>
                  <h3 className={`font-heading font-bold text-sm ${projectorMode ? 'text-slate-700' : 'text-slate-300'}`}>Respostas dos Alunos</h3>
                  <div className="space-y-4">
                    {questions[currentQuestionIdx].opcoes.map((option, idx) => {
                      const style = optionStyles[idx];
                      const count = getOptionCount(option);
                      const maxResponses = responses.length || 1;
                      const percent = Math.round((count / maxResponses) * 100);
                      const isCorrect = option === questions[currentQuestionIdx].resposta_correta;

                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between font-sans text-xs font-bold">
                            <span className="flex items-center gap-1.5">
                              <span className="opacity-80">{style.shape}</span>
                              <span className={`truncate max-w-[200px] sm:max-w-xs ${projectorMode ? 'text-slate-700' : 'text-white'}`}>{option}</span>
                            </span>
                            <span className="flex items-center gap-2">
                              {isCorrect && <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Correta</span>}
                              <span className={projectorMode ? 'text-slate-500' : 'text-slate-400'}>{count} votos ({percent}%)</span>
                            </span>
                          </div>
                          <div className={`w-full rounded-full h-3.5 overflow-hidden border relative ${projectorMode ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                            <div 
                              className={`h-full rounded-full ${isCorrect ? 'bg-emerald-500' : 'bg-slate-600'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Score list leaderboard (6 Columns) */}
                <div className={`lg:col-span-6 border rounded-3xl p-6 space-y-4 transition-all duration-300 ${projectorMode ? 'bg-white border-slate-200 shadow-sm text-slate-900' : 'bg-slate-900/40 border-slate-800/60 backdrop-blur'}`}>
                  <h3 className={`font-heading font-bold text-sm ${projectorMode ? 'text-slate-700' : 'text-slate-300'}`}>Líderes da Rodada</h3>
                  <div className="space-y-2.5">
                    {(() => {
                      // Fetch sorted players lists
                      const list = [...players].sort((a, b) => b.total_score - a.total_score).slice(0, 5);
                      return list.map((p, idx) => (
                        <div key={p.id} className={`flex items-center justify-between p-3 border rounded-xl ${projectorMode ? 'bg-slate-50 border-slate-150 text-slate-900' : 'bg-slate-950/50 border-slate-800 text-white'}`}>
                          <div className="flex items-center gap-3">
                            <span className="w-6 text-center font-heading font-black text-sm text-slate-400">
                              {idx === 0 ? (
                                <HugeiconsIcon icon={Medal01Icon} size={18} className="text-yellow-405 drop-shadow inline-block" />
                              ) : idx === 1 ? (
                                <HugeiconsIcon icon={Medal02Icon} size={18} className="text-slate-300 drop-shadow inline-block" />
                              ) : idx === 2 ? (
                                <HugeiconsIcon icon={Medal03Icon} size={18} className="text-amber-600 drop-shadow inline-block" />
                              ) : (
                                `#${idx + 1}`
                              )}
                            </span>
                            <span className={`font-sans font-bold text-sm ${projectorMode ? 'text-slate-850' : 'text-white'}`}>{p.nickname}</span>
                            {p.streak >= 3 && (
                              <span className="text-[9px] bg-orange-500 text-white px-2 py-0.5 rounded font-extrabold uppercase animate-pulse flex items-center gap-1">
                                <HugeiconsIcon icon={FireIcon} size={10} strokeWidth={2.5} />
                                Fogo ({p.streak})
                              </span>
                            )}
                          </div>
                          <div className={`font-heading font-black text-sm ${projectorMode ? 'text-primary' : 'text-primary-fixed-dim'}`}>{p.total_score} pts</div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

              </div>

              <div className="pt-4 text-center">
                <button
                  onClick={nextQuestion}
                  className="px-12 py-4 bg-primary hover:bg-blue-700 text-white font-heading font-black text-body-md rounded-xl transition-all shadow-lg shadow-primary/20"
                >
                  {currentQuestionIdx + 1 >= questions.length ? 'Exibir Pódio Final' : 'Próxima Questão'}
                </button>
              </div>

            </div>
          )}

          {/* FINISHED STATE (PODIUM) */}
          {gameStatus === 'finished' && (
            <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center space-y-12 animate-fade-in overflow-y-auto scrollbar-thin transition-all duration-300 ${projectorMode ? 'bg-slate-100' : 'bg-radial-at-t from-purple-950 via-slate-950 to-black'}`}>
              <div className="space-y-2 flex flex-col items-center">
                <HugeiconsIcon icon={Trophy} size={40} className="text-yellow-400 drop-shadow" />
                <h2 className={`text-4xl font-heading font-black ${projectorMode ? 'text-slate-900 font-extrabold' : 'text-white'}`}>Grande Pódio</h2>
                <p className={`text-sm ${projectorMode ? 'text-slate-655 font-bold' : 'text-slate-400'}`}>Parabéns a todos os participantes!</p>
              </div>

              {/* Podium podium visual display */}
              <div className="flex items-end justify-center gap-4 max-w-lg w-full h-[280px]">
                {(() => {
                  const sorted = [...players].sort((a, b) => b.total_score - a.total_score);
                  const first = sorted[0];
                  const second = sorted[1];
                  const third = sorted[2];

                  return (
                    <>
                      {/* 2nd place */}
                      {second && (
                        <div className="flex flex-col items-center flex-1 h-[70%] group">
                          <div className={`font-sans font-extrabold text-sm mb-2 truncate max-w-[100px] ${projectorMode ? 'text-slate-800' : 'text-slate-300'}`}>{second.nickname}</div>
                          <div className={`w-full border-t-4 rounded-t-2xl flex-1 flex flex-col items-center justify-center shadow-lg relative ${projectorMode ? 'bg-slate-200 border-slate-350 text-slate-800 shadow' : 'bg-slate-700 border-slate-500 text-slate-300'}`}>
                            <span className="text-3xl font-heading font-black text-slate-400">2</span>
                            <span className={`text-[10px] font-semibold absolute bottom-2 ${projectorMode ? 'text-slate-600' : 'text-slate-400'}`}>{second.total_score} pts</span>
                          </div>
                        </div>
                      )}

                      {/* 1st place */}
                      {first && (
                        <div className="flex flex-col items-center flex-1 h-full group">
                          <div className="text-yellow-400 mb-1 animate-bounce">
                            <HugeiconsIcon icon={CrownIcon} size={22} strokeWidth={2} />
                          </div>
                          <div className={`font-sans font-extrabold text-body-md mb-2 truncate max-w-[120px] ${projectorMode ? 'text-yellow-600 font-black' : 'text-yellow-300'}`}>{first.nickname}</div>
                          <div className="w-full bg-gradient-to-t from-yellow-600 to-yellow-500 border-t-4 border-yellow-400 rounded-t-2xl flex-1 flex flex-col items-center justify-center shadow-2xl relative">
                            <span className="text-4xl font-heading font-black text-white">1</span>
                            <span className="text-xs text-yellow-100 font-black absolute bottom-3">{first.total_score} pts</span>
                          </div>
                        </div>
                      )}

                      {/* 3rd place */}
                      {third && (
                        <div className="flex flex-col items-center flex-1 h-[55%] group">
                          <div className={`font-sans font-extrabold text-sm mb-2 truncate max-w-[100px] ${projectorMode ? 'text-amber-900' : 'text-amber-700'}`}>{third.nickname}</div>
                          <div className={`w-full border-t-4 rounded-t-2xl flex-1 flex flex-col items-center justify-center shadow-md relative ${projectorMode ? 'bg-slate-300 border-slate-400 text-slate-800 shadow' : 'bg-slate-800 border-slate-600'}`}>
                            <span className="text-2xl font-heading font-black text-amber-700">3</span>
                            <span className={`text-[10px] font-semibold absolute bottom-2 ${projectorMode ? 'text-slate-600' : 'text-slate-500'}`}>{third.total_score} pts</span>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <button
                onClick={endSession}
                className="px-12 py-4 bg-primary hover:bg-blue-700 text-white font-heading font-black text-body-md rounded-xl transition-all shadow-lg"
              >
                Voltar ao Painel
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
