import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Award01Icon,
  Trophy,
  RefreshIcon,
  SearchIcon,
  Cancel01Icon,
  FireIcon,
  ChartHistogramIcon,
  FilterIcon,
  Medal01Icon,
  Medal02Icon,
  Medal03Icon,
  GameControllerIcon,
  ClockIcon,
  UserGroupIcon,
  CheckmarkCircle02Icon,
  StarIcon,
  TargetIcon,
  CrownIcon,
  ArrowDown01Icon,
  SortingZAIcon,
} from '@hugeicons/core-free-icons';

interface ArenaRankingProps {
  session: any;
  isAdmin?: boolean;
}

interface RankingEntry {
  id: string;
  aluno_id: string | null;
  turma_id: string | null;
  nickname: string;
  total_score: number;
  total_correct: number;
  total_questions: number;
  final_position: number;
  total_players: number;
  streak_max: number;
  quiz_titulo: string | null;
  played_at: string;
}

interface AggregatedPlayer {
  aluno_id: string | null;
  nickname: string;
  partidas: number;
  total_score_sum: number;
  melhor_score: number;
  media_score: number;
  total_corretas_all: number;
  total_questoes_all: number;
  streak_max_all: number;
  win_count: number;
  last_played: string;
}

type FilterPeriod = 'all' | '7d' | '30d' | '90d';
type FilterView = 'global' | 'history';

const periodLabels: Record<FilterPeriod, string> = {
  all: 'Todo o período',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
};

export const ArenaRanking: React.FC<ArenaRankingProps> = ({ session, isAdmin = false }) => {
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [aggregated, setAggregated] = useState<AggregatedPlayer[]>([]);
  const [history, setHistory] = useState<RankingEntry[]>([]);
  const [turmas, setTurmas] = useState<{ id: string; nome: string }[]>([]);

  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');
  const [filterTurma, setFilterTurma] = useState<string>('all');
  const [filterView, setFilterView] = useState<FilterView>('global');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedPlayer, setSelectedPlayer] = useState<AggregatedPlayer | null>(null);
  const [playerHistory, setPlayerHistory] = useState<RankingEntry[]>([]);
  const [playerHistoryLoading, setPlayerHistoryLoading] = useState(false);

  useEffect(() => {
    const fetchTurmas = async () => {
      const { data } = await supabase.from('turmas').select('id, nome').order('nome');
      setTurmas(data || []);
    };
    if (isAdmin) fetchTurmas();
  }, [isAdmin]);

  const getDateFilter = useCallback(() => {
    if (filterPeriod === 'all') return null;
    const days = filterPeriod === '7d' ? 7 : filterPeriod === '30d' ? 30 : 90;
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }, [filterPeriod]);

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('arena_ranking')
        .select('*')
        .order('played_at', { ascending: false });

      const dateFilter = getDateFilter();
      if (dateFilter) query = query.gte('played_at', dateFilter);
      if (filterTurma !== 'all') query = query.eq('turma_id', filterTurma);
      if (!isAdmin && filterView === 'history') query = query.eq('aluno_id', userId);

      const { data, error } = await query;
      if (error) throw error;

      const entries: RankingEntry[] = data || [];
      setHistory(entries);

      // Aggregate per player
      const playerMap = new Map<string, AggregatedPlayer>();
      for (const entry of entries) {
        const key = entry.aluno_id || entry.nickname;
        if (!playerMap.has(key)) {
          playerMap.set(key, {
            aluno_id: entry.aluno_id,
            nickname: entry.nickname,
            partidas: 0,
            total_score_sum: 0,
            melhor_score: 0,
            media_score: 0,
            total_corretas_all: 0,
            total_questoes_all: 0,
            streak_max_all: 0,
            win_count: 0,
            last_played: entry.played_at,
          });
        }
        const p = playerMap.get(key)!;
        p.partidas += 1;
        p.total_score_sum += entry.total_score;
        p.melhor_score = Math.max(p.melhor_score, entry.total_score);
        p.total_corretas_all += entry.total_correct;
        p.total_questoes_all += entry.total_questions;
        p.streak_max_all = Math.max(p.streak_max_all, entry.streak_max);
        if (entry.final_position === 1) p.win_count += 1;
        if (entry.played_at > p.last_played) p.last_played = entry.played_at;
      }

      const aggList = Array.from(playerMap.values()).map(p => ({
        ...p,
        media_score: p.partidas > 0 ? Math.round(p.total_score_sum / p.partidas) : 0,
      }));

      aggList.sort((a, b) => b.total_score_sum - a.total_score_sum);
      setAggregated(aggList);
    } catch (err: any) {
      console.error('Erro ao buscar ranking da arena:', err.message);
    } finally {
      setLoading(false);
    }
  }, [filterPeriod, filterTurma, filterView, userId, isAdmin, getDateFilter]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  const fetchPlayerHistory = async (player: AggregatedPlayer) => {
    setSelectedPlayer(player);
    setPlayerHistoryLoading(true);
    try {
      let query = supabase
        .from('arena_ranking')
        .select('*')
        .order('played_at', { ascending: false })
        .limit(20);

      if (player.aluno_id) {
        query = query.eq('aluno_id', player.aluno_id);
      } else {
        query = query.eq('nickname', player.nickname).is('aluno_id', null);
      }

      const { data } = await query;
      setPlayerHistory(data || []);
    } finally {
      setPlayerHistoryLoading(false);
    }
  };

  const closePlayerModal = () => {
    setSelectedPlayer(null);
    setPlayerHistory([]);
  };

  const filteredAggregated = aggregated.filter(p =>
    searchQuery === '' || p.nickname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHistory = history.filter(p =>
    searchQuery === '' ||
    p.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.quiz_titulo || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const myEntry = aggregated.find(p => p.aluno_id === userId);
  const myRank = myEntry ? aggregated.indexOf(myEntry) + 1 : null;

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const accuracyPercent = (correct: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  };

  const top3 = filteredAggregated.slice(0, 3);

  const PositionIcon = ({ pos, size = 20 }: { pos: number; size?: number }) => {
    if (pos === 1) return <HugeiconsIcon icon={Medal01Icon} size={size} strokeWidth={2} className="text-yellow-400" />;
    if (pos === 2) return <HugeiconsIcon icon={Medal02Icon} size={size} strokeWidth={2} className="text-slate-300" />;
    if (pos === 3) return <HugeiconsIcon icon={Medal03Icon} size={size} strokeWidth={2} className="text-amber-600" />;
    return <span className="text-xs font-heading font-black text-on-surface-variant">#{pos}</span>;
  };

  return (
    <div className="min-h-full bg-background text-on-background font-sans">

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 border border-indigo-800/30 shadow-2xl">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 px-6 py-8 sm:px-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                  <HugeiconsIcon icon={Trophy} size={22} strokeWidth={2} className="text-white" />
                </div>
                <div>
                  <h1 className="font-heading font-black text-2xl text-white leading-tight">
                    Ranking da Arena
                  </h1>
                  <p className="text-indigo-300 text-sm font-medium">
                    Hall da Fama · Competição Multiplayer
                  </p>
                </div>
              </div>
            </div>

            {/* My position card (student only) */}
            {!isAdmin && myEntry && myRank && (
              <div className="bg-white/5 border border-white/10 backdrop-blur rounded-xl px-5 py-3 flex items-center gap-4">
                <div className="text-center">
                  <div className="text-xs text-indigo-300 font-bold uppercase tracking-widest">Minha Posição</div>
                  <div className={`text-3xl font-heading font-black mt-0.5 ${
                    myRank === 1 ? 'text-yellow-400' :
                    myRank === 2 ? 'text-slate-300' :
                    myRank === 3 ? 'text-amber-600' : 'text-white'
                  }`}>
                    #{myRank}
                  </div>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div className="text-center">
                  <div className="text-xs text-indigo-300 font-bold uppercase tracking-widest">Pts Totais</div>
                  <div className="text-xl font-heading font-black text-white mt-0.5">
                    {myEntry.total_score_sum.toLocaleString()}
                  </div>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div className="text-center">
                  <div className="text-xs text-indigo-300 font-bold uppercase tracking-widest">Partidas</div>
                  <div className="text-xl font-heading font-black text-white mt-0.5">
                    {myEntry.partidas}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">

        {/* View toggle */}
        <div className="flex bg-surface-container-low border border-outline-variant/30 rounded-xl p-1 gap-1">
          <button
            onClick={() => setFilterView('global')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filterView === 'global'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <HugeiconsIcon icon={SortingZAIcon} size={16} strokeWidth={2} />
            Ranking Global
          </button>
          <button
            onClick={() => setFilterView('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filterView === 'history'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <HugeiconsIcon icon={ChartHistogramIcon} size={16} strokeWidth={2} />
            Histórico de Partidas
          </button>
        </div>

        {/* Period filter */}
        <div className="relative">
          <HugeiconsIcon icon={FilterIcon} size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          <select
            value={filterPeriod}
            onChange={e => setFilterPeriod(e.target.value as FilterPeriod)}
            className="pl-8 pr-8 py-2 text-sm font-semibold bg-surface-container-low border border-outline-variant/30 rounded-xl text-on-surface outline-none focus:border-primary transition-colors cursor-pointer appearance-none"
          >
            {Object.entries(periodLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={2} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
        </div>

        {/* Turma filter (admin only) */}
        {isAdmin && turmas.length > 0 && (
          <div className="relative">
            <HugeiconsIcon icon={UserGroupIcon} size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <select
              value={filterTurma}
              onChange={e => setFilterTurma(e.target.value)}
              className="pl-8 pr-8 py-2 text-sm font-semibold bg-surface-container-low border border-outline-variant/30 rounded-xl text-on-surface outline-none focus:border-primary transition-colors cursor-pointer appearance-none"
            >
              <option value="all">Todas as turmas</option>
              {turmas.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
            <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={2} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          </div>
        )}

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs ml-auto">
          <HugeiconsIcon icon={SearchIcon} size={15} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar jogador..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface-container-low border border-outline-variant/30 rounded-xl text-on-surface placeholder-on-surface-variant/50 outline-none focus:border-primary transition-colors"
          />
        </div>

        <button
          onClick={fetchRanking}
          className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant/30 rounded-xl text-sm font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all"
          title="Atualizar ranking"
        >
          <HugeiconsIcon icon={RefreshIcon} size={15} strokeWidth={2} />
          Atualizar
        </button>
      </div>

      {loading ? (
        /* Loading skeleton */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[0, 1, 2].map(i => (
              <div key={i} className="animate-pulse bg-surface-container-low border border-outline-variant/20 rounded-2xl p-6">
                <div className="h-4 bg-surface-container-high rounded w-1/2 mx-auto mb-4" />
                <div className="h-12 bg-surface-container-high rounded w-3/4 mx-auto mb-2" />
                <div className="h-3 bg-surface-container-high rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse bg-surface-container-low border border-outline-variant/20 rounded-xl p-4 flex gap-4">
              <div className="w-8 h-8 rounded-full bg-surface-container-high" />
              <div className="flex-1">
                <div className="h-4 bg-surface-container-high rounded w-1/3 mb-2" />
                <div className="h-3 bg-surface-container-high rounded w-1/4" />
              </div>
              <div className="w-16 h-6 bg-surface-container-high rounded" />
            </div>
          ))}
        </div>
      ) : filterView === 'global' ? (
        <>
          {filteredAggregated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container-low border border-outline-variant/20 flex items-center justify-center mb-4">
                <HugeiconsIcon icon={GameControllerIcon} size={28} strokeWidth={2} className="text-on-surface-variant" />
              </div>
              <h3 className="font-heading font-black text-lg text-on-surface mb-1">Nenhuma partida registrada</h3>
              <p className="text-on-surface-variant text-sm">
                {searchQuery
                  ? 'Nenhum jogador encontrado com esse nome.'
                  : 'Realize partidas na Arena Live para aparecer no ranking!'}
              </p>
            </div>
          ) : (
            <>
              {/* Podium — top 3 */}
              {top3.length > 0 && searchQuery === '' && (
                <div className="mb-8">
                  <div className="flex items-end justify-center gap-3 sm:gap-6 h-[260px] sm:h-[300px] max-w-2xl mx-auto">

                    {/* 2nd place */}
                    {top3[1] ? (
                      <div className="flex flex-col items-center flex-1 h-[72%]">
                        <HugeiconsIcon icon={Medal02Icon} size={28} strokeWidth={2} className="text-slate-300 mb-1 drop-shadow" />
                        <div className="font-sans font-extrabold text-xs sm:text-sm text-slate-300 mb-2 truncate max-w-[90px] sm:max-w-[120px] text-center">
                          {top3[1].nickname}
                        </div>
                        <div className="w-full bg-gradient-to-t from-slate-700 to-slate-600 border-t-4 border-slate-400 rounded-t-2xl flex-1 flex flex-col items-center justify-center shadow-xl shadow-slate-500/20 relative">
                          <span className="text-3xl font-heading font-black text-slate-300">2</span>
                          <span className="text-[10px] sm:text-xs text-slate-400 font-bold absolute bottom-2 text-center px-1">
                            {top3[1].total_score_sum.toLocaleString()} pts
                          </span>
                        </div>
                      </div>
                    ) : <div className="flex-1" />}

                    {/* 1st place */}
                    <div className="flex flex-col items-center flex-1 h-full">
                      <div className="animate-bounce mb-1">
                        <HugeiconsIcon icon={CrownIcon} size={32} strokeWidth={2} className="text-yellow-400 drop-shadow" />
                      </div>
                      <div className="font-sans font-extrabold text-sm sm:text-base text-yellow-300 mb-2 truncate max-w-[100px] sm:max-w-[140px] text-center">
                        {top3[0].nickname}
                      </div>
                      <div className="w-full bg-gradient-to-t from-yellow-600 to-yellow-500 border-t-4 border-yellow-400 rounded-t-2xl flex-1 flex flex-col items-center justify-center shadow-2xl shadow-yellow-500/30 relative">
                        <span className="text-4xl font-heading font-black text-white">1</span>
                        <span className="text-xs text-yellow-100 font-black absolute bottom-3 text-center px-1">
                          {top3[0].total_score_sum.toLocaleString()} pts
                        </span>
                      </div>
                    </div>

                    {/* 3rd place */}
                    {top3[2] ? (
                      <div className="flex flex-col items-center flex-1 h-[55%]">
                        <HugeiconsIcon icon={Medal03Icon} size={24} strokeWidth={2} className="text-amber-600 mb-1 drop-shadow" />
                        <div className="font-sans font-extrabold text-xs sm:text-sm text-amber-600 mb-2 truncate max-w-[90px] sm:max-w-[120px] text-center">
                          {top3[2].nickname}
                        </div>
                        <div className="w-full bg-gradient-to-t from-amber-900 to-amber-800 border-t-4 border-amber-600 rounded-t-2xl flex-1 flex flex-col items-center justify-center shadow-lg shadow-amber-700/20 relative">
                          <span className="text-2xl font-heading font-black text-amber-500">3</span>
                          <span className="text-[10px] sm:text-xs text-amber-700 font-bold absolute bottom-2 text-center px-1">
                            {top3[2].total_score_sum.toLocaleString()} pts
                          </span>
                        </div>
                      </div>
                    ) : <div className="flex-1" />}

                  </div>
                </div>
              )}

              {/* Full Leaderboard Table */}
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
                {/* Table header */}
                <div className="grid grid-cols-[40px_1fr_auto_auto_auto_auto] gap-3 px-4 py-3 bg-surface-container-low border-b border-outline-variant/20 text-[10px] sm:text-xs font-black uppercase tracking-widest text-on-surface-variant">
                  <span className="text-center">#</span>
                  <span>Jogador</span>
                  <span className="text-right hidden sm:block">Pts Totais</span>
                  <span className="text-right">Partidas</span>
                  <span className="text-right hidden md:block">Acertos</span>
                  <span className="text-right hidden lg:block">Vitórias</span>
                </div>

                <div className="divide-y divide-outline-variant/10">
                  {filteredAggregated.map((player, idx) => {
                    const isCurrentUser = player.aluno_id === userId;
                    const rankPos = idx + 1;
                    const accPct = accuracyPercent(player.total_corretas_all, player.total_questoes_all);

                    return (
                      <div
                        key={player.aluno_id || player.nickname}
                        onClick={() => fetchPlayerHistory(player)}
                        className={`grid grid-cols-[40px_1fr_auto_auto_auto_auto] gap-3 px-4 py-3.5 items-center cursor-pointer transition-all hover:bg-surface-container-low group ${
                          isCurrentUser ? 'bg-primary/5 border-l-2 border-primary' : ''
                        }`}
                      >
                        {/* Position */}
                        <div className="flex items-center justify-center">
                          <PositionIcon pos={rankPos} size={20} />
                        </div>

                        {/* Player name & info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-sans font-bold text-sm truncate ${
                              isCurrentUser ? 'text-primary' : 'text-on-surface'
                            }`}>
                              {player.nickname}
                            </span>
                            {isCurrentUser && (
                              <span className="text-[9px] bg-primary text-on-primary font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                                Você
                              </span>
                            )}
                            {player.streak_max_all >= 5 && (
                              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] bg-orange-500/10 text-orange-500 border border-orange-500/20 font-black px-1.5 py-0.5 rounded-full shrink-0">
                                <HugeiconsIcon icon={FireIcon} size={10} strokeWidth={2} />
                                {player.streak_max_all}x
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                            Melhor: {player.melhor_score.toLocaleString()} pts · {accPct}% de acerto
                          </div>
                        </div>

                        {/* Total Score */}
                        <div className="text-right hidden sm:block">
                          <span className={`font-heading font-black text-sm ${
                            rankPos === 1 ? 'text-yellow-500' :
                            rankPos === 2 ? 'text-slate-400' :
                            rankPos === 3 ? 'text-amber-600' :
                            isCurrentUser ? 'text-primary' : 'text-on-surface'
                          }`}>
                            {player.total_score_sum.toLocaleString()}
                          </span>
                        </div>

                        {/* Partidas */}
                        <div className="text-right">
                          <span className="text-xs font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                            {player.partidas}
                          </span>
                        </div>

                        {/* Accuracy */}
                        <div className="text-right hidden md:block">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="w-12 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  accPct >= 70 ? 'bg-green-500' :
                                  accPct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${accPct}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-on-surface-variant w-8 text-right">{accPct}%</span>
                          </div>
                        </div>

                        {/* Wins */}
                        <div className="text-right hidden lg:block">
                          {player.win_count > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-500">
                              <HugeiconsIcon icon={Trophy} size={13} strokeWidth={2} />
                              {player.win_count}
                            </span>
                          ) : (
                            <span className="text-xs text-on-surface-variant/40">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-center text-xs text-on-surface-variant mt-3 opacity-60">
                Clique em qualquer jogador para ver o histórico de partidas.
              </p>
            </>
          )}
        </>
      ) : (
        /* === HISTORY VIEW === */
        <div className="space-y-3">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container-low border border-outline-variant/20 flex items-center justify-center mb-4">
                <HugeiconsIcon icon={ChartHistogramIcon} size={28} strokeWidth={2} className="text-on-surface-variant" />
              </div>
              <h3 className="font-heading font-black text-lg text-on-surface mb-1">Nenhuma partida encontrada</h3>
              <p className="text-on-surface-variant text-sm">
                {searchQuery
                  ? 'Tente outro termo de busca.'
                  : 'Nenhuma partida registrada no período selecionado.'}
              </p>
            </div>
          ) : (
            filteredHistory.map((entry) => {
              const accPct = accuracyPercent(entry.total_correct, entry.total_questions);
              const posPercent = entry.total_players > 1
                ? Math.round(((entry.total_players - entry.final_position) / (entry.total_players - 1)) * 100)
                : 100;
              const isTop = entry.final_position <= 3;

              return (
                <div
                  key={entry.id}
                  className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 hover:bg-surface-container-low transition-all"
                >
                  <div className="flex flex-wrap items-start gap-3 sm:gap-4">

                    {/* Position badge */}
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border-2 ${
                      entry.final_position === 1
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : entry.final_position === 2
                        ? 'bg-slate-500/10 border-slate-500/30'
                        : entry.final_position === 3
                        ? 'bg-amber-700/10 border-amber-700/30'
                        : 'bg-surface-container border-outline-variant/20'
                    }`}>
                      <PositionIcon pos={entry.final_position} size={22} />
                      <span className="text-[9px] font-bold text-on-surface-variant mt-0.5">
                        de {entry.total_players}
                      </span>
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-sans font-bold text-sm text-on-surface">
                          {entry.nickname}
                        </span>
                        {isTop && (
                          <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-600 font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                            Top {entry.final_position}
                          </span>
                        )}
                        {entry.streak_max >= 3 && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-orange-500/10 border border-orange-500/20 text-orange-500 font-black px-1.5 py-0.5 rounded-full">
                            <HugeiconsIcon icon={FireIcon} size={10} strokeWidth={2} />
                            {entry.streak_max}x
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-on-surface-variant mt-1">
                        <HugeiconsIcon icon={TargetIcon} size={12} strokeWidth={2} />
                        <span className="truncate">{entry.quiz_titulo || 'Quiz'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-on-surface-variant/60 mt-0.5">
                        <HugeiconsIcon icon={ClockIcon} size={11} strokeWidth={2} />
                        {formatDate(entry.played_at)}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Pontos</div>
                        <div className="font-heading font-black text-base text-primary">
                          {entry.total_score.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center hidden sm:block">
                        <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Acertos</div>
                        <div className="font-heading font-black text-base text-on-surface">
                          {entry.total_correct}/{entry.total_questions}
                        </div>
                        <div className={`text-[10px] font-bold ${
                          accPct >= 70 ? 'text-green-500' :
                          accPct >= 40 ? 'text-amber-500' : 'text-red-500'
                        }`}>
                          {accPct}%
                        </div>
                      </div>
                      <div className="text-center hidden md:block">
                        <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Top%</div>
                        <div className={`font-heading font-black text-base ${
                          posPercent >= 75 ? 'text-green-500' :
                          posPercent >= 50 ? 'text-amber-500' : 'text-on-surface'
                        }`}>
                          {posPercent}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mini accuracy bar */}
                  <div className="mt-3 flex items-center gap-2">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} strokeWidth={2} className="text-on-surface-variant/40 shrink-0" />
                    <div className="flex-1 bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          accPct >= 70 ? 'bg-green-500' :
                          accPct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${accPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-on-surface-variant w-10 text-right">
                      {accPct}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Player History Modal */}
      {selectedPlayer && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closePlayerModal}
        >
          <div
            className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-6 py-5 bg-gradient-to-r from-indigo-950 to-purple-950 border-b border-outline-variant/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <HugeiconsIcon icon={Award01Icon} size={18} strokeWidth={2} className="text-white" />
                  </div>
                  <div>
                    <div className="font-heading font-black text-lg text-white">
                      {selectedPlayer.nickname}
                    </div>
                    <div className="text-indigo-300 text-xs font-medium mt-0.5">
                      Histórico de Partidas
                    </div>
                  </div>
                </div>
                <button
                  onClick={closePlayerModal}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
                </button>
              </div>

              {/* Player stats summary */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                {[
                  { label: 'Partidas', value: selectedPlayer.partidas, icon: GameControllerIcon },
                  { label: 'Pts Totais', value: selectedPlayer.total_score_sum.toLocaleString(), icon: StarIcon },
                  { label: 'Melhor', value: selectedPlayer.melhor_score.toLocaleString(), icon: TargetIcon },
                  { label: 'Vitórias', value: selectedPlayer.win_count, icon: Trophy },
                ].map(stat => (
                  <div key={stat.label} className="text-center bg-white/5 rounded-xl py-2 px-1">
                    <HugeiconsIcon icon={stat.icon} size={14} strokeWidth={2} className="text-indigo-300 mx-auto mb-1" />
                    <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">{stat.label}</div>
                    <div className="font-heading font-black text-white text-sm mt-0.5">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* History list */}
            <div className="p-4 overflow-y-auto max-h-[55vh] space-y-2 scrollbar-thin">
              {playerHistoryLoading ? (
                <div className="py-8 flex flex-col items-center gap-3">
                  <div className="w-7 h-7 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  <span className="text-xs text-on-surface-variant font-medium">Carregando histórico...</span>
                </div>
              ) : playerHistory.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant text-sm">
                  Nenhuma partida encontrada.
                </div>
              ) : (
                playerHistory.map((entry) => {
                  const accPct = accuracyPercent(entry.total_correct, entry.total_questions);
                  return (
                    <div key={entry.id} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        entry.final_position === 1 ? 'bg-yellow-500/10' :
                        entry.final_position === 2 ? 'bg-slate-500/10' :
                        entry.final_position === 3 ? 'bg-amber-700/10' :
                        'bg-surface-container'
                      }`}>
                        <PositionIcon pos={entry.final_position} size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-on-surface truncate">
                          {entry.quiz_titulo || 'Quiz'}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-on-surface-variant mt-0.5">
                          <HugeiconsIcon icon={ClockIcon} size={10} strokeWidth={2} />
                          {formatDate(entry.played_at)}
                          <span className="opacity-50 mx-1">·</span>
                          {entry.total_correct}/{entry.total_questions} corretas ({accPct}%)
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-heading font-black text-sm text-primary">
                          {entry.total_score.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-on-surface-variant">pts</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
