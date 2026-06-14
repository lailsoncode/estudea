import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

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
  const [timer, setTimer] = useState<number>(20);
  const [activeTimer, setActiveTimer] = useState<boolean>(false);
  const timerIntervalRef = useRef<any>(null);
  const questionStartRef = useRef<number>(0);

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
          .select('id, titulo, modulo_id')
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
      const { data: sessionData, error: sError } = await supabase
        .from('kahoot_sessions')
        .insert({
          pin: gamePin,
          professor_id: professorId,
          aula_id: selectedAulaId,
          status: 'lobby',
          current_question_index: 0,
          questoes_customizadas: finalQuestions
        })
        .select()
        .single();

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
    setTimer(20);
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
        optionsCount: questions[nextIdx].opcoes.length
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
    <div className="fixed inset-0 bg-slate-950 text-white z-50 overflow-hidden flex flex-col font-sans">
      
      {/* Upper header */}
      <header className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold shadow-md">
            🎮
          </div>
          <div>
            <h1 className="font-heading font-black text-body-lg text-white leading-tight">Arena Estudea Live</h1>
            <p className="text-xs text-slate-400">Quiz Multiplayer em Tempo Real</p>
          </div>
        </div>
        <button 
          onClick={endSession}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
        >
          Encerrar Partida
        </button>
      </header>

      {/* Main Game Screen */}
      {!gameStarted ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-radial-at-t from-slate-900 via-slate-950 to-black">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl text-center">
            <h2 className="font-heading font-black text-headline-lg text-white">Criar Nova Arena</h2>
            <p className="text-slate-400 text-sm">Selecione um dos quizzes disponíveis no curso para criar uma sessão multiplayer ao vivo com seus alunos.</p>
            
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
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Escolha o Quiz:</label>
                  <select 
                    value={selectedAulaId} 
                    onChange={(e) => setSelectedAulaId(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-primary text-white text-sm outline-none"
                  >
                    {quizzes.map(q => (
                      <option key={q.id} value={q.id}>{q.titulo}</option>
                    ))}
                  </select>
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
        <div className="flex-1 flex flex-col bg-slate-950 relative">
          
          {/* LOBBY STATE */}
          {gameStatus === 'lobby' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-radial-at-t from-indigo-950 via-slate-950 to-black text-center space-y-8 animate-fade-in">
              <div className="space-y-2">
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest">Entre no painel do aluno e digite o PIN:</p>
                <h2 className="text-7xl font-heading font-black tracking-widest text-primary-fixed-dim drop-shadow-md select-all">{pin}</h2>
              </div>

              <div className="w-full max-w-2xl bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 backdrop-blur flex flex-col h-[350px]">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                  <span className="font-bold text-sm text-slate-400">Jogadores no Lobby</span>
                  <span className="bg-primary/20 text-primary-fixed-dim text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    {players.length} Conectados
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 align-content-start pr-1 scrollbar-thin">
                  {players.map(p => (
                    <div 
                      key={p.id} 
                      className="px-4 py-2.5 bg-slate-800/80 border border-slate-700/50 rounded-xl font-sans font-bold text-sm text-white text-center shadow-sm animate-scale-up"
                    >
                      {p.nickname}
                    </div>
                  ))}
                  {players.length === 0 && (
                    <div className="col-span-full h-full flex items-center justify-center text-slate-500 italic text-sm">
                      Aguardando alunos entrarem...
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={nextQuestion}
                disabled={players.length === 0}
                className="px-12 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-black text-body-md rounded-xl transition-all shadow-lg shadow-emerald-500/10"
              >
                Começar Partida
              </button>
            </div>
          )}

          {/* QUESTION PLAYING STATE */}
          {gameStatus === 'question' && (
            <div className="flex-1 flex flex-col p-6 space-y-6 animate-fade-in">
              
              {/* Question card */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 text-center backdrop-blur shadow-md">
                <span className="text-xs text-primary font-bold uppercase tracking-wider">Questão {currentQuestionIdx + 1} de {questions.length}</span>
                <h2 className="text-2xl sm:text-3xl font-heading font-extrabold mt-3 text-white max-w-4xl mx-auto leading-tight">
                  {questions[currentQuestionIdx].enunciado}
                </h2>
              </div>

              {/* Grid: Timer, Options, Counter */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Timer Column (3 Columns) */}
                <div className="lg:col-span-3 flex flex-col items-center justify-center bg-slate-900/30 border border-slate-800 rounded-3xl p-6 backdrop-blur text-center space-y-4">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    {/* Ring indicator */}
                    <div className={`w-28 h-28 rounded-full border-8 ${timer < 5 ? 'border-red-600 animate-ping absolute opacity-10' : 'border-primary/10 absolute'}`} />
                    <div className={`w-28 h-28 rounded-full border-8 ${timer < 5 ? 'border-red-600' : 'border-primary'} flex items-center justify-center font-heading font-black text-4xl`}>
                      {timer}
                    </div>
                  </div>
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-wide">Segundos Restantes</span>
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
                <div className="lg:col-span-3 flex flex-col items-center justify-center bg-slate-900/30 border border-slate-800 rounded-3xl p-6 backdrop-blur text-center space-y-4">
                  <div className="text-5xl font-heading font-black text-white">{responses.length}</div>
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-wide">Respostas Recebidas</span>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-2">
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
                <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white">Opção Correta:</h2>
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl font-heading font-bold text-sm max-w-lg mx-auto">
                  <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">✔</span>
                  {questions[currentQuestionIdx].resposta_correta}
                </div>
              </div>

              {/* Grid: Bar Chart & Leaderboard */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Options answers count bar chart (6 Columns) */}
                <div className="lg:col-span-6 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur space-y-4">
                  <h3 className="font-heading font-bold text-sm text-slate-300">Respostas dos Alunos</h3>
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
                              <span className="truncate max-w-[200px] sm:max-w-xs">{option}</span>
                            </span>
                            <span className="flex items-center gap-2">
                              {isCorrect && <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Correta</span>}
                              <span className="text-slate-400">{count} votos ({percent}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 rounded-full h-3.5 overflow-hidden border border-slate-800 relative">
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
                <div className="lg:col-span-6 bg-slate-900/40 border border-slate-800 rounded-3xl p-6 backdrop-blur space-y-4">
                  <h3 className="font-heading font-bold text-sm text-slate-300">Líderes da Rodada</h3>
                  <div className="space-y-2.5">
                    {(() => {
                      // Fetch sorted players lists
                      const list = [...players].sort((a, b) => b.total_score - a.total_score).slice(0, 5);
                      return list.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-slate-950/50 border border-slate-800 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className="w-6 text-center font-heading font-black text-sm text-slate-400">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                            </span>
                            <span className="font-sans font-bold text-sm text-white">{p.nickname}</span>
                            {p.streak >= 3 && (
                              <span className="text-[9px] bg-orange-500 text-white px-2 py-0.5 rounded font-extrabold uppercase animate-pulse">🔥 Fogo ({p.streak})</span>
                            )}
                          </div>
                          <div className="font-heading font-black text-sm text-primary-fixed-dim">{p.total_score} pts</div>
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
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-radial-at-t from-purple-950 via-slate-950 to-black text-center space-y-12 animate-fade-in overflow-y-auto scrollbar-thin">
              <div className="space-y-2">
                <span className="text-xl">🏆</span>
                <h2 className="text-4xl font-heading font-black text-white">Grande Pódio</h2>
                <p className="text-slate-400 text-sm">Parabéns a todos os participantes!</p>
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
                          <div className="font-sans font-extrabold text-sm text-slate-300 mb-2 truncate max-w-[100px]">{second.nickname}</div>
                          <div className="w-full bg-slate-700 border-t-4 border-slate-500 rounded-t-2xl flex-1 flex flex-col items-center justify-center shadow-lg relative">
                            <span className="text-3xl font-heading font-black text-slate-400">2</span>
                            <span className="text-[10px] text-slate-400 font-semibold absolute bottom-2">{second.total_score} pts</span>
                          </div>
                        </div>
                      )}

                      {/* 1st place */}
                      {first && (
                        <div className="flex flex-col items-center flex-1 h-full group">
                          <div className="text-yellow-400 text-lg mb-1 animate-bounce">👑</div>
                          <div className="font-sans font-extrabold text-body-md text-yellow-300 mb-2 truncate max-w-[120px]">{first.nickname}</div>
                          <div className="w-full bg-gradient-to-t from-yellow-600 to-yellow-500 border-t-4 border-yellow-400 rounded-t-2xl flex-1 flex flex-col items-center justify-center shadow-2xl relative">
                            <span className="text-4xl font-heading font-black text-white">1</span>
                            <span className="text-xs text-yellow-100 font-black absolute bottom-3">{first.total_score} pts</span>
                          </div>
                        </div>
                      )}

                      {/* 3rd place */}
                      {third && (
                        <div className="flex flex-col items-center flex-1 h-[55%] group">
                          <div className="font-sans font-extrabold text-sm text-amber-700 mb-2 truncate max-w-[100px]">{third.nickname}</div>
                          <div className="w-full bg-slate-800 border-t-4 border-slate-600 rounded-t-2xl flex-1 flex flex-col items-center justify-center shadow-md relative">
                            <span className="text-2xl font-heading font-black text-amber-700">3</span>
                            <span className="text-[10px] text-slate-500 font-semibold absolute bottom-2">{third.total_score} pts</span>
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
