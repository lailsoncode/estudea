import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface ArenaLiveAlunoProps {
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
  session_id: string;
  nickname: string;
  total_score: number;
  streak: number;
}

export const ArenaLiveAluno: React.FC<ArenaLiveAlunoProps> = ({ session, onClose }) => {
  const alunoId = session?.user?.id;
  const studentName = session?.user?.user_metadata?.nome || '';

  // Step 1: Pin & Nickname entry
  const [pinInput, setPinInput] = useState<string>('');
  const [nicknameInput, setNicknameInput] = useState<string>(studentName);
  const [loading, setLoading] = useState<boolean>(false);
  const [joined, setJoined] = useState<boolean>(false);

  // Game session states
  const [gameSession, setGameSession] = useState<any>(null);
  const [playerInfo, setPlayerInfo] = useState<Player | null>(null);
  const [gameStatus, setGameStatus] = useState<'lobby' | 'question' | 'scoreboard' | 'finished'>('lobby');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);

  // Interactive states
  const [chosenOption, setChosenOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [pointsEarned, setPointsEarned] = useState<number>(0);
  const [isLastAnswerCorrect, setIsLastAnswerCorrect] = useState<boolean>(false);
  const [questionStartedAt, setQuestionStartedAt] = useState<number>(0);
  const [ranking, setRanking] = useState<number>(1);
  const [optionsCount, setOptionsCount] = useState<number>(4);

  // Geometric shapes and styles for options
  const optionStyles = [
    { bg: 'bg-red-500 active:bg-red-600', border: 'border-red-600', shape: '▲', colorName: 'Vermelho' },
    { bg: 'bg-blue-500 active:bg-blue-600', border: 'border-blue-600', shape: '◆', colorName: 'Azul' },
    { bg: 'bg-amber-500 active:bg-amber-600', border: 'border-amber-600', shape: '●', colorName: 'Amarelo' },
    { bg: 'bg-emerald-500 active:bg-emerald-600', border: 'border-emerald-600', shape: '■', colorName: 'Verde' }
  ];

  // Try to join game session
  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pinInput.trim();
    const nickname = nicknameInput.trim();

    if (!cleanPin || !nickname) {
      alert('Preencha o PIN e o Nickname!');
      return;
    }

    setLoading(true);

    try {
      // 1. Fetch active session with this PIN
      const { data: sData, error: sError } = await supabase
        .from('kahoot_sessions')
        .select('*')
        .eq('pin', cleanPin)
        .neq('status', 'finished')
        .single();

      if (sError || !sData) {
        console.error('Erro ao buscar Arena:', sError);
        alert('Arena Live não encontrada ou já encerrada! ' + (sError ? `Detalhes: ${sError.message}` : ''));
        setLoading(false);
        return;
      }

      setGameSession(sData);

      // 2. Fetch the quiz questions to check correctness client-side
      let activeQuestions: Question[] = [];
      if (sData.questoes_customizadas && Array.isArray(sData.questoes_customizadas) && sData.questoes_customizadas.length > 0) {
        activeQuestions = sData.questoes_customizadas;
      } else {
        const { data: questionsData } = await supabase
          .from('questoes')
          .select('*')
          .eq('aula_id', sData.aula_id)
          .order('ordem', { ascending: true });
        activeQuestions = questionsData || [];
      }

      if (activeQuestions && activeQuestions.length > 0) {
        setTotalQuestions(activeQuestions.length);
        const activeIdx = sData.current_question_index || 0;
        setCurrentQuestionIdx(activeIdx);
        setCurrentQuestion(activeQuestions[activeIdx]);
        setOptionsCount(activeQuestions[activeIdx].opcoes.length);
      }

      // 3. Create or get player row in DB
      const { data: pData, error: pError } = await supabase
        .from('kahoot_players')
        .upsert({
          session_id: sData.id,
          aluno_id: alunoId,
          nickname: nickname,
          total_score: 0,
          streak: 0
        }, { onConflict: 'session_id, aluno_id' })
        .select()
        .single();

      if (pError) throw pError;

      setPlayerInfo(pData);
      setGameStatus(sData.status);
      setJoined(true);

      // Subscribe to Realtime Game Session changes
      const sessionChannel = supabase.channel(`kahoot_${cleanPin}`);
      sessionChannel
        .on('broadcast', { event: 'game_state' }, async ({ payload }) => {
          setGameStatus(payload.status);
          if (payload.status === 'question') {
            const index = payload.questionIndex;
            setCurrentQuestionIdx(index);
            setHasAnswered(false);
            setChosenOption(null);
            setPointsEarned(0);
            setQuestionStartedAt(Date.now());
            setOptionsCount(payload.optionsCount || 4);

            if (activeQuestions && activeQuestions[index]) {
              setCurrentQuestion(activeQuestions[index]);
            }
          } else if (payload.status === 'scoreboard') {
            // Recalculate ranking
            const { data: allPlayers } = await supabase
              .from('kahoot_players')
              .select('*')
              .eq('session_id', sData.id)
              .order('total_score', { ascending: false });

            if (allPlayers) {
              const currentRank = allPlayers.findIndex(x => x.id === pData.id) + 1;
              setRanking(currentRank > 0 ? currentRank : 1);
              
              // Sync playerInfo scores
              const synced = allPlayers.find(x => x.id === pData.id);
              if (synced) {
                setPlayerInfo(synced);
              }
            }
          }
        })
        .subscribe();

    } catch (err: any) {
      console.error('Erro ao conectar na Arena:', err.message);
      alert('Erro ao conectar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Answer submission
  const handleAnswerClick = async (optionIndex: number) => {
    if (hasAnswered || !currentQuestion || !playerInfo || !gameSession) return;
    setHasAnswered(true);

    const optionText = currentQuestion.opcoes[optionIndex];
    setChosenOption(optionText);

    const isCorrect = optionText === currentQuestion.resposta_correta;
    setIsLastAnswerCorrect(isCorrect);

    // Calculate score based on response speed
    const responseTime = Date.now() - questionStartedAt;
    const timeLimit = 20000; // 20s
    let points = 0;

    if (isCorrect) {
      // Points scale from 500 to 1000 based on speed
      const speedRatio = Math.min(1, responseTime / timeLimit);
      points = Math.max(500, Math.round(1000 * (1 - speedRatio * 0.5)));
      
      // Streak bonus: add 50 points per streak level up to 250
      const currentStreak = (playerInfo.streak || 0) + 1;
      points += Math.min(250, currentStreak * 50);
    }

    setPointsEarned(points);

    try {
      // 1. Save response in DB
      await supabase
        .from('kahoot_responses')
        .insert({
          session_id: gameSession.id,
          player_id: playerInfo.id,
          question_index: currentQuestionIdx,
          chosen_option: optionText,
          is_correct: isCorrect,
          points_awarded: points,
          response_time_ms: responseTime
        });

      // 2. Update player streak and score
      const newScore = (playerInfo.total_score || 0) + points;
      const newStreak = isCorrect ? (playerInfo.streak || 0) + 1 : 0;

      const { data: updatedPlayer } = await supabase
        .from('kahoot_players')
        .update({
          total_score: newScore,
          streak: newStreak
        })
        .eq('id', playerInfo.id)
        .select()
        .single();

      if (updatedPlayer) {
        setPlayerInfo(updatedPlayer);
      }
    } catch (err: any) {
      console.error('Erro ao registrar resposta:', err.message);
    }
  };

  const handleExit = () => {
    if (window.confirm('Tem certeza que deseja sair da Arena Live?')) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-white z-50 overflow-hidden flex flex-col font-sans">
      
      {/* Upper header */}
      <header className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-sm">
            🎮
          </div>
          <span className="font-heading font-black text-body-md text-white">Arena Estudea Aluno</span>
        </div>
        <button 
          onClick={handleExit}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold rounded-lg transition-all"
        >
          Sair
        </button>
      </header>

      {/* Join Screen */}
      {!joined ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-radial-at-t from-slate-900 via-slate-950 to-black">
          <form onSubmit={handleJoinGame} className="max-w-xs w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl text-center">
            <div className="space-y-1">
              <h2 className="font-heading font-black text-headline-md text-white">Entrar na Arena 🏆</h2>
              <p className="text-slate-400 text-xs">Digite o código PIN fornecido pelo professor e escolha um nickname.</p>
            </div>
            
            <div className="space-y-4 text-left">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">PIN do Jogo:</label>
                <input 
                  type="text" 
                  value={pinInput} 
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="PIN de 6 dígitos"
                  maxLength={6}
                  required
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-primary text-center font-heading font-black text-body-lg text-white outline-none tracking-widest"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Apelido (Nickname):</label>
                <input 
                  type="text" 
                  value={nicknameInput} 
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder="Ex: Pedro_Dev"
                  maxLength={15}
                  required
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-primary text-white text-body-md font-sans font-bold outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-primary hover:bg-blue-700 disabled:opacity-50 text-white font-heading font-black text-body-md rounded-xl transition-all shadow-md"
              >
                {loading ? 'Conectando...' : 'Entrar no Jogo'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-slate-950">
          
          {/* LOBBY STATE */}
          {gameStatus === 'lobby' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 animate-fade-in bg-radial-at-t from-indigo-950 via-slate-950 to-black">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-2xl animate-bounce">
                👤
              </div>
              <div className="space-y-1">
                <h3 className="font-heading font-black text-headline-md text-white">Você está no lobby!</h3>
                <p className="text-slate-400 text-sm">Aguarde o professor iniciar a Arena.</p>
              </div>
              <div className="px-6 py-3 bg-slate-900 border border-slate-800 rounded-2xl font-heading font-black text-body-md text-primary-fixed-dim shadow-sm">
                Apelido: {playerInfo?.nickname}
              </div>
            </div>
          )}

          {/* PLAYING QUESTION STATE */}
          {gameStatus === 'question' && (
            <div className="flex-1 flex flex-col p-4 space-y-4 animate-fade-in justify-center">
              {hasAnswered ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5 bg-radial-at-t from-slate-900 via-slate-950 to-black">
                  <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl animate-pulse">
                    ⏳
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-heading font-black text-body-lg text-white">Resposta Enviada!</h3>
                    <p className="text-slate-400 text-xs">Aguardando outros jogadores ou o tempo acabar...</p>
                  </div>
                  <div className="text-xs bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-slate-400 font-semibold">
                    Opção escolhida: <strong className="text-white">{chosenOption}</strong>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between py-6">
                  
                  {/* Status header */}
                  <div className="text-center px-4">
                    <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary-fixed-dim font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                      Questão {currentQuestionIdx + 1} de {totalQuestions}
                    </span>
                    <h2 className="font-heading font-bold text-body-md text-slate-300 mt-2">Escolha a resposta correspondente no projetor:</h2>
                  </div>

                  {/* Shapes Controller Grid */}
                  <div className="grid grid-cols-2 gap-4 h-[70%] max-h-[450px] px-2 mt-4">
                    {Array.from({ length: optionsCount }).map((_, idx) => {
                      const style = optionStyles[idx];
                      return (
                        <button
                          key={idx}
                          onClick={() => handleAnswerClick(idx)}
                          className={`flex flex-col items-center justify-center rounded-3xl ${style.bg} transition-all border-b-8 ${style.border} active:border-b-0 shadow-lg text-white`}
                        >
                          <span className="text-5xl drop-shadow-md select-none">{style.shape}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SCOREBOARD STATE */}
          {gameStatus === 'scoreboard' && (
            <div className={`flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 animate-fade-in ${
              isLastAnswerCorrect ? 'bg-gradient-to-br from-emerald-950 via-slate-950 to-black' : 'bg-gradient-to-br from-red-950 via-slate-950 to-black'
            }`}>
              
              {/* Correct / Incorrect animation banner */}
              {isLastAnswerCorrect ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center text-3xl shadow-lg border border-emerald-400 animate-bounce">
                    ✔
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-heading font-black text-headline-lg text-emerald-400">Excelente!</h3>
                    <p className="text-emerald-100/70 text-sm font-semibold">Você respondeu corretamente.</p>
                  </div>
                  <div className="space-y-1 bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl shadow-sm">
                    <div className="text-2xl font-heading font-black text-emerald-400">+{pointsEarned} pts</div>
                    {playerInfo?.streak && playerInfo.streak >= 2 ? (
                      <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest animate-pulse">🔥 Sequência de {playerInfo.streak} acertos!</span>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center text-3xl shadow-lg border border-red-500">
                    ❌
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-heading font-black text-headline-lg text-red-500">Ops, incorreto!</h3>
                    <p className="text-red-100/70 text-sm font-semibold">Estude mais para a próxima rodada.</p>
                  </div>
                </>
              )}

              {/* Player rank details */}
              <div className="w-full max-w-xs bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex justify-between items-center font-sans text-sm font-bold">
                <div className="text-left text-slate-400">
                  <p>Posição no Ranking:</p>
                  <p className="text-white text-lg font-heading font-black mt-1">#{ranking}º lugar</p>
                </div>
                <div className="text-right text-slate-400">
                  <p>Pontuação Total:</p>
                  <p className="text-primary-fixed-dim text-lg font-heading font-black mt-1">{playerInfo?.total_score || 0} pts</p>
                </div>
              </div>

              <p className="text-slate-500 text-[11px] font-semibold tracking-wide uppercase">Olhe para a tela do professor para continuar</p>
            </div>
          )}

          {/* FINISHED STATE (PODIUM) */}
          {gameStatus === 'finished' && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 bg-radial-at-t from-purple-950 via-slate-950 to-black animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-yellow-500 text-white flex items-center justify-center text-3xl shadow-lg animate-bounce">
                👑
              </div>
              <div className="space-y-1">
                <h3 className="font-heading font-black text-headline-lg text-white">Jogo Concluído!</h3>
                <p className="text-slate-400 text-sm">Você finalizou a partida na posição:</p>
              </div>
              <div className="px-8 py-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-3xl font-heading font-black text-4xl shadow-md">
                #{ranking}º Lugar
              </div>
              <div className="text-slate-400 font-semibold text-sm">
                Pontuação Final: <strong className="text-white">{playerInfo?.total_score || 0} pts</strong>
              </div>
              <button
                onClick={onClose}
                className="px-8 py-3.5 bg-primary hover:bg-blue-700 text-white font-heading font-black text-body-md rounded-xl transition-all shadow-md"
              >
                Voltar à Trilha
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
