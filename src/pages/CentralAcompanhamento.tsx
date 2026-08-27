import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  EyeIcon,
  KeyboardIcon,
  Alert01Icon,
  FireIcon,
  Edit01Icon,
  SchoolIcon,
  ArrowDown01Icon,
  SparklesIcon,
  CheckmarkCircle02Icon,
  Download01Icon,
  File01Icon
} from '@hugeicons/core-free-icons';

interface CentralAcompanhamentoProps {
  alunoId: string;
  onBack: () => void;
  initialTab?: 'chat' | 'ficha';
  onChangeStudent?: (id: string) => void;
}

interface StudentProfile {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
  progresso_geral: number;
  frequencia: number;
  autonomia_digital: 'S' | 'P' | 'N';
  status_risco: 'Excelente' | 'No Caminho' | 'Alerta Médio' | 'Em Risco';
  media_digitacao: number;
  ofensiva_atual: number;
  tempo_resolucao: number;
  turma_nome?: string;
  anotacoes?: string | null;
  aulas_concluidas?: number;
  total_aulas?: number;
  situacao_final?: 'cursando' | 'aprovado' | 'reprovado' | 'desistente' | null;
  data_conclusao?: string | null;
}

interface AutonomiaData {
  usa_computador: 'S' | 'P' | 'N' | null;
  navega_internet: 'S' | 'P' | 'N' | null;
  cria_salva_arquivos: 'S' | 'P' | 'N' | null;
  organiza_pastas: 'S' | 'P' | 'N' | null;
  copia_cola_links: 'S' | 'P' | 'N' | null;
  conhece_redes_sociais: 'S' | 'P' | 'N' | null;
  conhece_ferramentas: 'S' | 'P' | 'N' | null;
  precisa_apoio: 'S' | 'N' | null;
}

interface DiarioRecord {
  id: string;
  aluno_id: string;
  turma_id: string;
  aula_id: string;
  status: 'presente' | 'falta' | 'atrasado';
  observacao: string | null;
  compreendeu: 'S' | 'P' | 'N';
  participou: 'S' | 'P' | 'N';
  precisou_apoio: 'S' | 'N';
  data: string;
  aulas?: {
    id: string;
    titulo: string;
    numero_aula: number;
  } | null;
}

interface EntregaRecord {
  id: string;
  aluno_id: string;
  atividade_id: string;
  resposta: string;
  nota: number | null;
  feedback_professor: string | null;
  created_at: string;
  atividades?: {
    id: string;
    enunciado: string;
    tipo_entrega: 'texto' | 'imagem' | 'quiz' | 'multipla' | 'arquivo';
    pontua: boolean;
    aulas?: {
      id: string;
      titulo: string;
      numero_aula: number;
    } | null;
  } | null;
}

const DEFAULT_AUTONOMIA: AutonomiaData = {
  usa_computador: null,
  navega_internet: null,
  cria_salva_arquivos: null,
  organiza_pastas: null,
  copia_cola_links: null,
  conhece_redes_sociais: null,
  conhece_ferramentas: null,
  precisa_apoio: null
};

const getCleanFilename = (url: string) => {
  if (!url) return '';
  try {
    const parts = url.split('/');
    const rawName = parts[parts.length - 1] || 'arquivo';
    const cleanName = rawName.replace(/^[0-9a-fA-F-]{36}-?[0-9]*-?/, '');
    return decodeURIComponent(cleanName);
  } catch {
    return 'arquivo_anexo';
  }
};

const generateAIReport = (profile: StudentProfile, autonomia: AutonomiaData, diario: DiarioRecord[]) => {
  const totalClasses = diario.length;
  const presents = diario.filter((d) => d.status === 'presente').length;
  const lates = diario.filter((d) => d.status === 'atrasado').length;
  const absences = diario.filter((d) => d.status === 'falta').length;

  const calculatedAttendanceRatio = totalClasses > 0 ? Math.round(((presents + lates * 0.5) / totalClasses) * 100) : profile.frequencia;

  const masteredSkills: string[] = [];
  const improvingSkills: string[] = [];

  if (autonomia.usa_computador === 'S') masteredSkills.push('Operação de Hardware');
  if (autonomia.navega_internet === 'S') masteredSkills.push('Navegação Web');
  if (autonomia.cria_salva_arquivos === 'S') masteredSkills.push('Gerenciamento de Arquivos');
  if (autonomia.organiza_pastas === 'S') masteredSkills.push('Organização de Pastas');
  if (autonomia.copia_cola_links === 'S') masteredSkills.push('Manipulação de Conteúdo');
  if (autonomia.conhece_redes_sociais === 'S') masteredSkills.push('Comunicação Digital');
  if (autonomia.conhece_ferramentas === 'S') masteredSkills.push('Ferramentas Digitais');

  if (autonomia.cria_salva_arquivos === 'P' || autonomia.cria_salva_arquivos === 'N') improvingSkills.push('Salvar e Localizar Arquivos');
  if (autonomia.organiza_pastas === 'P' || autonomia.organiza_pastas === 'N') improvingSkills.push('Estrutura de Pastas e Diretórios');
  if (autonomia.copia_cola_links === 'P' || autonomia.copia_cola_links === 'N') improvingSkills.push('Atalhos de Teclado (Ctrl+C / Ctrl+V)');
  if (autonomia.precisa_apoio === 'S') improvingSkills.push('Autonomia em Atividades Individuais');

  let summary = `O(A) estudante ${profile.nome} apresenta uma taxa de assiduidade de ${calculatedAttendanceRatio}%. `;
  if (profile.status_risco === 'Excelente') {
    summary += 'Demonstra excelente evolução técnica e alto grau de independência nas atividades propostas.';
  } else if (profile.status_risco === 'No Caminho') {
    summary += 'Apresenta desenvolvimento consistente com bom aproveitamento dos conteúdos ministrados.';
  } else if (profile.status_risco === 'Alerta Médio') {
    summary += 'Requer atenção pontual para consolidar conceitos essenciais e manter o ritmo de entregas.';
  } else {
    summary += 'Encontra-se em momento que exige intervenção pedagógica direta e acompanhamento personalizado.';
  }

  const recommendations: string[] = [];
  if (improvingSkills.length > 0) {
    recommendations.push(`Reforçar os tópicos práticos: ${improvingSkills.slice(0, 2).join(', ')}.`);
  }
  if (absences > 1) {
    recommendations.push('Acompanhar motivos de ausência recente para evitar defasagem de conteúdo.');
  }
  if (profile.media_digitacao < 200) {
    recommendations.push('Incentivar a prática diária no Treinador de Digitação para ganhar agilidade.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Manter o plano de estudos avançado e propor desafios complementares.');
  }

  return {
    performanceSummary: summary,
    recommendations,
    attendance: {
      ratio: calculatedAttendanceRatio,
      total: totalClasses,
      presents,
      lates,
      absences
    },
    masteredSkills,
    improvingSkills
  };
};

export const CentralAcompanhamento: React.FC<CentralAcompanhamentoProps> = ({
  alunoId,
  onBack,
  initialTab = 'ficha',
  onChangeStudent
}) => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [autonomia, setAutonomia] = useState<AutonomiaData>(DEFAULT_AUTONOMIA);
  const [diarioRecords, setDiarioRecords] = useState<DiarioRecord[]>([]);
  const [entregas, setEntregas] = useState<EntregaRecord[]>([]);
  const [classStudents, setClassStudents] = useState<{ id: string; nome: string }[]>([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  const [activeSubTab, setActiveSubTab] = useState<'ficha' | 'ia' | 'notas'>(initialTab === 'ficha' ? 'ficha' : 'ficha');
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingDiario, setLoadingDiario] = useState(true);
  const [loadingEntregas, setLoadingEntregas] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentDetails();
  }, [alunoId]);

  const fetchStudentDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: pData, error: pError } = await supabase
        .from('profiles')
        .select(`
          id,
          nome,
          email,
          avatar_url,
          progresso_geral,
          frequencia,
          autonomia_digital,
          status_risco,
          media_digitacao,
          ofensiva_atual,
          tempo_resolucao,
          turma_id,
          anotacoes,
          situacao_final,
          data_conclusao,
          turmas:turma_id (
            nome
          )
        `)
        .eq('id', alunoId)
        .single();

      if (pError) throw pError;

      const formattedProfile: StudentProfile = {
        ...pData,
        turma_nome: (pData.turmas as any)?.nome || 'Sem Turma',
        progresso_geral: pData.progresso_geral || 0,
        frequencia: pData.frequencia || 100,
        media_digitacao: pData.media_digitacao || 0,
        ofensiva_atual: pData.ofensiva_atual || 0,
        tempo_resolucao: pData.tempo_resolucao || 0,
        anotacoes: pData.anotacoes || ''
      };

      setProfile(formattedProfile);
      setNotes(formattedProfile.anotacoes || '');

      if (pData.turma_id) {
        const { data: cStudents } = await supabase
          .from('profiles')
          .select('id, nome')
          .eq('turma_id', pData.turma_id)
          .eq('role', 'student')
          .order('nome', { ascending: true });

        if (cStudents) {
          setClassStudents(cStudents);
        }
      }

      const { data: autoData } = await supabase
        .from('observacoes_autonomia')
        .select('*')
        .eq('aluno_id', alunoId)
        .maybeSingle();

      if (autoData) {
        setAutonomia(autoData);
      } else {
        setAutonomia(DEFAULT_AUTONOMIA);
      }

      setLoadingDiario(true);
      const { data: dData } = await supabase
        .from('diario_classe')
        .select(`
          id,
          aluno_id,
          turma_id,
          aula_id,
          status,
          observacao,
          compreendeu,
          participou,
          precisou_apoio,
          data,
          aulas:aula_id (
            id,
            titulo,
            numero_aula
          )
        `)
        .eq('aluno_id', alunoId)
        .order('data', { ascending: false });

      if (dData) {
        setDiarioRecords(dData as any);
      }
      setLoadingDiario(false);

      setLoadingEntregas(true);
      const { data: entregasData } = await supabase
        .from('entregas_atividades')
        .select(`
          id,
          aluno_id,
          atividade_id,
          resposta,
          nota,
          feedback_professor,
          created_at,
          atividades:atividade_id (
            id,
            enunciado,
            tipo_entrega,
            pontua,
            aulas:aula_id (
              id,
              titulo,
              numero_aula
            )
          ),
          aulas:aula_id (
            id,
            titulo,
            numero_aula
          )
        `)
        .eq('aluno_id', alunoId)
        .order('created_at', { ascending: false });

      if (entregasData) {
        const formatted = (entregasData || []).map((e: any) => {
          const atividade = e.atividades;
          const aula = atividade?.aulas || e.aulas;
          return {
            ...e,
            atividades: atividade || {
              id: null,
              enunciado: 'Quiz Geral da Aula',
              tipo_entrega: 'quiz',
              pontua: true,
              aulas: aula
            }
          };
        });
        setEntregas(formatted as any);
      }
      setLoadingEntregas(false);

    } catch (err: any) {
      console.error('Error fetching student details:', err);
      setError(err.message || 'Erro ao carregar dados do aluno');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAutonomia = async (criterio: keyof AutonomiaData, valor: 'S' | 'P' | 'N') => {
    const previousValue = autonomia[criterio];
    setAutonomia((prev) => ({
      ...prev,
      [criterio]: valor
    }));

    try {
      const { error } = await supabase
        .from('observacoes_autonomia')
        .upsert({
          aluno_id: alunoId,
          [criterio]: valor,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'aluno_id'
        });

      if (error) throw error;
    } catch (err) {
      console.error('Error updating autonomy criteria:', err);
      setAutonomia((prev) => ({
        ...prev,
        [criterio]: previousValue
      }));
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ anotacoes: notes })
        .eq('id', alunoId);

      if (error) throw error;
      setProfile((prev) => (prev ? { ...prev, anotacoes: notes } : null));
    } catch (err) {
      console.error('Error saving notes:', err);
      alert('Erro ao salvar anotações.');
    } finally {
      setSavingNotes(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const formatShortName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 2) return fullName;
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  const report = useMemo(() => {
    if (!profile) return null;
    return generateAIReport(profile, autonomia, diarioRecords);
  }, [profile, autonomia, diarioRecords]);

  if (loading && !profile) {
    return (
      <div className="product-page max-w-7xl mx-auto space-y-6 animate-fade-in py-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-surface-container-high rounded-product-control animate-pulse"></div>
          <div className="w-48 h-6 bg-surface-container-high rounded-product-control animate-pulse"></div>
        </div>
        <div className="w-full h-32 product-card animate-pulse"></div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="h-96 product-card animate-pulse"></div>
          <div className="h-96 product-card animate-pulse"></div>
          <div className="h-96 product-card animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-page max-w-7xl mx-auto relative animate-fade-in pb-10 space-y-6">
      {error && (
        <div className="p-4 bg-error/10 border border-error/20 rounded-product-control text-error text-xs font-semibold flex items-center gap-2">
          <HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      {/* Page Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors w-fit group"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Voltar para Lista de Alunos</span>
          </button>
          <h1 className="product-section-heading mt-0 text-xl sm:text-2xl">Ficha 360° do Estudante</h1>
        </div>

        {/* Student Switcher Dropdown */}
        {classStudents.length > 1 && (
          <div className="relative inline-block text-left z-20">
            <button
              onClick={() => setShowStudentDropdown(!showStudentDropdown)}
              className="product-secondary-action text-xs"
            >
              <span>Aluno: {profile ? formatShortName(profile.nome) : 'Carregando...'}</span>
              <HugeiconsIcon icon={ArrowDown01Icon} size={15} strokeWidth={2} className={`text-on-surface-variant transition-transform ${showStudentDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showStudentDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowStudentDropdown(false)}
                />
                <div className="absolute right-0 mt-1.5 w-56 bg-surface-container-lowest border border-outline-variant/70 rounded-product-control shadow-xl py-1.5 z-20 max-h-60 overflow-y-auto">
                  {classStudents.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        onChangeStudent?.(s.id);
                        setShowStudentDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors hover:bg-surface-container-low flex items-center justify-between ${
                        alunoId === s.id 
                          ? 'text-primary bg-primary/10 font-bold' 
                          : 'text-on-surface'
                      }`}
                    >
                      <span>{formatShortName(s.nome)}</span>
                      {alunoId === s.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Hero Student Summary Card */}
      {profile && (
        <section className="product-card p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Student Info & Avatar */}
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.nome}
                  className="w-14 h-14 rounded-product-control object-cover border-2 border-primary/20 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-product-control bg-primary/10 text-primary flex items-center justify-center font-heading text-lg font-extrabold shadow-inner shrink-0">
                  {getInitials(profile.nome)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-heading font-extrabold text-lg sm:text-xl text-on-surface leading-tight truncate">
                    {profile.nome}
                  </h2>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5 truncate">{profile.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    <span>{profile.turma_nome || 'Sem Turma'}</span>
                  </span>

                  {profile.situacao_final && profile.situacao_final !== 'cursando' && (
                    <span className={`inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wide border ${
                      profile.situacao_final === 'aprovado'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : profile.situacao_final === 'reprovado'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}>
                      {profile.situacao_final === 'aprovado' && '🎓 Aprovado(a) no Curso'}
                      {profile.situacao_final === 'reprovado' && '⚠️ Reprovado(a)'}
                      {profile.situacao_final === 'desistente' && '📋 Desistente'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 lg:gap-6 flex-1 justify-start lg:justify-end">
              {/* Progress Bar Widget */}
              <div className="w-full lg:w-40 space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-on-surface-variant uppercase text-[10px] tracking-wider">Progresso</span>
                  <span className="text-secondary">{profile.progresso_geral}%</span>
                </div>
                <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-brand-cyan to-secondary rounded-full"
                    style={{ width: `${profile.progresso_geral}%` }}
                  />
                </div>
              </div>

              {/* Frequency */}
              <div className="flex items-center gap-2.5 border-l border-outline-variant/70 pl-4 py-1">
                <span className={`w-2.5 h-2.5 rounded-full ${profile.frequencia >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <div>
                  <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider leading-none">Frequência</p>
                  <p className="text-sm font-extrabold text-on-surface mt-1 leading-none">{profile.frequencia}%</p>
                </div>
              </div>

              {/* Streak */}
              <div className="flex items-center gap-2.5 border-l border-outline-variant/70 pl-4 py-1">
                <HugeiconsIcon icon={FireIcon} size={18} className="text-orange-500" strokeWidth={2} />
                <div>
                  <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider leading-none">Ofensiva</p>
                  <p className="text-sm font-extrabold text-on-surface mt-1 leading-none">{profile.ofensiva_atual} dias</p>
                </div>
              </div>

              {/* Typing */}
              <div className="flex items-center gap-2.5 border-l border-outline-variant/70 pl-4 py-1">
                <HugeiconsIcon icon={KeyboardIcon} size={18} className="text-primary" strokeWidth={2} />
                <div>
                  <p className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider leading-none">Digitação</p>
                  <p className="text-sm font-extrabold text-on-surface mt-1 leading-none">{profile.media_digitacao} ppm</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Navigation SubTabs */}
      <div className="flex border-b border-outline-variant/70 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('ficha')}
          className={`pb-3 px-3 text-xs font-heading font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'ficha'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <HugeiconsIcon icon={EyeIcon} size={16} strokeWidth={2} />
          <span>Ficha de Observação</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ia')}
          className={`pb-3 px-3 text-xs font-heading font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'ia'
              ? 'border-secondary text-secondary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <HugeiconsIcon icon={SparklesIcon} size={16} strokeWidth={2} />
          <span>Diagnóstico de IA</span>
        </button>

        <button
          onClick={() => setActiveSubTab('notas')}
          className={`pb-3 px-3 text-xs font-heading font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'notas'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <HugeiconsIcon icon={SchoolIcon} size={16} strokeWidth={2} />
          <span>Entregas & Notas</span>
        </button>
      </div>

      {activeSubTab === 'ficha' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Col 1: Checklist de Autonomia */}
          <div className="product-card overflow-hidden">
            <div className="p-4 border-b border-outline-variant/70 bg-surface-container-low/50">
              <h3 className="font-heading font-extrabold text-xs uppercase tracking-wider text-on-surface flex items-center gap-2">
                <HugeiconsIcon icon={EyeIcon} size={17} strokeWidth={2} className="text-primary" />
                <span>Observação Prática de Autonomia</span>
              </h3>
            </div>

            <div className="p-4 space-y-3">
              {[
                { label: 'Usa computador', key: 'usa_computador', hasP: true },
                { label: 'Navega na internet', key: 'navega_internet', hasP: true },
                { label: 'Cria e salva arquivos', key: 'cria_salva_arquivos', hasP: true },
                { label: 'Organiza pastas', key: 'organiza_pastas', hasP: true },
                { label: 'Copia e cola links', key: 'copia_cola_links', hasP: true },
                { label: 'Conhece redes sociais', key: 'conhece_redes_sociais', hasP: true },
                { label: 'Conhece ferramentas', key: 'conhece_ferramentas', hasP: true },
                { label: 'Precisa de apoio', key: 'precisa_apoio', hasP: false }
              ].map((item) => {
                const key = item.key as keyof AutonomiaData;
                const value = autonomia[key];

                return (
                  <div key={item.key} className="flex items-center justify-between py-1 border-b border-outline-variant/30 last:border-0">
                    <span className={`text-xs ${item.key === 'precisa_apoio' ? 'font-bold text-on-surface' : 'font-medium text-on-surface-variant'}`}>
                      {item.label}
                    </span>
                    <div className="flex gap-1 bg-surface-container-low p-1 rounded-full border border-outline-variant/50">
                      {item.hasP ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateAutonomia(key, 'S')}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                              value === 'S' ? 'bg-emerald-500 text-white shadow-sm scale-105' : 'text-on-surface-variant hover:bg-surface-container'
                            }`}
                          >
                            S
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateAutonomia(key, 'P')}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                              value === 'P' ? 'bg-amber-500 text-white shadow-sm scale-105' : 'text-on-surface-variant hover:bg-surface-container'
                            }`}
                          >
                            P
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateAutonomia(key, 'N')}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                              value === 'N' ? 'bg-error text-white shadow-sm scale-105' : 'text-on-surface-variant hover:bg-surface-container'
                            }`}
                          >
                            N
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateAutonomia(key, 'S')}
                            className={`px-2.5 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                              value === 'S' ? 'bg-error text-white shadow-sm scale-105' : 'text-on-surface-variant hover:bg-surface-container'
                            }`}
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateAutonomia(key, 'N')}
                            className={`px-2.5 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                              value === 'N' ? 'bg-surface-container-highest text-on-surface shadow-sm scale-105' : 'text-on-surface-variant hover:bg-surface-container'
                            }`}
                          >
                            Não
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Col 2: Inteligência Pedagógica & Anotações */}
          <div className="space-y-6">
            <div className="product-card p-4 space-y-4">
              <h3 className="font-heading font-extrabold text-xs uppercase tracking-wider text-on-surface flex items-center gap-2">
                <HugeiconsIcon icon={SparklesIcon} size={17} strokeWidth={2} className="text-secondary" />
                <span>Inteligência Pedagógica</span>
              </h3>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-product-control p-3.5 border-l-4 border-l-emerald-500">
                <h4 className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400" />
                  Zonas de Domínio
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {autonomia.navega_internet === 'S' || autonomia.usa_computador === 'S' ? (
                    <span className="px-2.5 py-1 bg-surface-container-lowest rounded-full font-bold text-[9px] text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shadow-xs">
                      Autonomia de Hardware
                    </span>
                  ) : null}
                  {autonomia.conhece_redes_sociais === 'S' || autonomia.conhece_redes_sociais === 'P' ? (
                    <span className="px-2.5 py-1 bg-surface-container-lowest rounded-full font-bold text-[9px] text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shadow-xs">
                      Conectividade
                    </span>
                  ) : null}
                  {autonomia.copia_cola_links === 'S' || autonomia.conhece_ferramentas === 'P' ? (
                    <span className="px-2.5 py-1 bg-surface-container-lowest rounded-full font-bold text-[9px] text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shadow-xs">
                      Interação Web
                    </span>
                  ) : null}
                  {!(autonomia.navega_internet === 'S' || autonomia.conhece_redes_sociais === 'S' || autonomia.copia_cola_links === 'S') && (
                    <span className="px-2.5 py-1 bg-surface-container-lowest rounded-full font-bold text-[9px] text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shadow-xs">
                      Interação Básica
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-error/10 border border-error/20 rounded-product-control p-3.5 border-l-4 border-l-error">
                <h4 className="text-[10px] font-extrabold text-error uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <HugeiconsIcon icon={Alert01Icon} size={13} strokeWidth={2.5} className="text-error" />
                  Pontos de Atenção
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {autonomia.cria_salva_arquivos === 'N' || autonomia.organiza_pastas === 'N' ? (
                    <span className="px-2.5 py-1 bg-surface-container-lowest rounded-full font-bold text-[9px] text-error border border-error/20 shadow-xs">
                      Gestão de Arquivos
                    </span>
                  ) : null}
                  {autonomia.precisa_apoio === 'S' ? (
                    <span className="px-2.5 py-1 bg-surface-container-lowest rounded-full font-bold text-[9px] text-error border border-error/20 shadow-xs">
                      Suporte Prático
                    </span>
                  ) : null}
                  {!(autonomia.cria_salva_arquivos === 'N' || autonomia.precisa_apoio === 'S') && (
                    <span className="px-2.5 py-1 bg-surface-container-lowest rounded-full font-bold text-[9px] text-on-surface-variant border border-outline-variant/40 shadow-xs">
                      Acompanhar Evolução
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Anotações do Professor */}
            <div className="product-card p-4 space-y-3">
              <h3 className="font-heading font-extrabold text-xs uppercase tracking-wider text-on-surface flex items-center gap-2">
                <HugeiconsIcon icon={Edit01Icon} size={17} strokeWidth={2} className="text-primary" />
                <span>Anotações Pedagógicas</span>
              </h3>
              <textarea
                className="product-control resize-none text-xs leading-relaxed"
                placeholder="Escreva anotações pedagógicas sobre a evolução, dificuldades e comportamento do aluno..."
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="product-primary-action text-xs"
                >
                  {savingNotes ? 'Salvando...' : 'Salvar Anotações'}
                </button>
              </div>
            </div>
          </div>

          {/* Col 3: Histórico de Aulas (Diário) */}
          <div className="product-card overflow-hidden">
            <div className="p-4 border-b border-outline-variant/70 bg-surface-container-low/50">
              <h3 className="font-heading font-extrabold text-xs uppercase tracking-wider text-on-surface flex items-center gap-2">
                <HugeiconsIcon icon={SchoolIcon} size={17} strokeWidth={2} className="text-primary" />
                <span>Histórico de Chamadas & Diário</span>
              </h3>
            </div>

            <div className="p-4 space-y-3 max-h-[580px] overflow-y-auto">
              {loadingDiario ? (
                <div className="text-center py-8 text-xs font-semibold text-on-surface-variant animate-pulse">Carregando diário...</div>
              ) : diarioRecords.length > 0 ? (
                diarioRecords.map((rec) => (
                  <div key={rec.id} className="border border-outline-variant/70 p-3 rounded-product-control hover:bg-surface-container-low transition-all flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          Aula {rec.aulas?.numero_aula || 0}
                        </span>
                        <h4 className="text-xs font-bold text-on-surface mt-1 leading-tight">{rec.aulas?.titulo || 'Aula sem título'}</h4>
                      </div>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        rec.status === 'presente' 
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' 
                          : rec.status === 'atrasado' 
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' 
                            : 'bg-error/10 text-error'
                      }`}>
                        {rec.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 border-t border-outline-variant/40 pt-2 text-[10px] font-semibold text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${rec.compreendeu === 'S' ? 'bg-emerald-500' : rec.compreendeu === 'P' ? 'bg-amber-500' : 'bg-error'}`} />
                        Compreensão: {rec.compreendeu}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${rec.participou === 'S' ? 'bg-emerald-500' : rec.participou === 'P' ? 'bg-amber-500' : 'bg-error'}`} />
                        Engajamento: {rec.participou}
                      </span>
                      {rec.precisou_apoio === 'S' && (
                        <span className="text-error font-bold bg-error/10 px-1.5 py-0.5 rounded-full">
                          Apoio
                        </span>
                      )}
                    </div>

                    {rec.observacao && (
                      <p className="text-[10px] text-on-surface-variant bg-surface-container-low p-2 rounded-product-control leading-relaxed italic mt-0.5 border border-outline-variant/40">
                        "{rec.observacao}"
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="product-empty-state py-8">
                  <HugeiconsIcon icon={SchoolIcon} size={28} className="text-primary mb-1" />
                  <p className="text-xs font-bold text-on-surface">Nenhum registro de aula</p>
                  <p className="text-[10px] text-on-surface-variant">Lance a chamada para este aluno no diário de classe.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SubTab: IA Diagnosis */}
      {activeSubTab === 'ia' && (
        <section className="product-card p-5 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/70 pb-4">
            <div className="space-y-1">
              <h3 className="font-heading font-extrabold text-base text-on-surface flex items-center gap-2">
                <HugeiconsIcon icon={SparklesIcon} size={18} strokeWidth={2} className="text-secondary" />
                <span>Diagnóstico Pedagógico com IA</span>
              </h3>
              <p className="text-xs text-on-surface-variant">Análise de assiduidade, autonomia digital e pontos de atenção com base no histórico.</p>
            </div>
            <button
              onClick={() => {
                setGeneratingReport(true);
                setTimeout(() => {
                  setGeneratingReport(false);
                }, 1000);
              }}
              className="product-primary-action text-xs"
            >
              <HugeiconsIcon icon={SparklesIcon} size={15} strokeWidth={2} />
              <span>{generatingReport ? 'Analisando dados...' : 'Atualizar Análise'}</span>
            </button>
          </div>

          {generatingReport ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 rounded-full border-3 border-secondary/20 border-t-secondary animate-spin" />
              <p className="text-xs font-bold text-on-surface-variant animate-pulse">Lendo histórico pedagógico...</p>
            </div>
          ) : report ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Diagnostic text & Recommendations */}
              <div className="space-y-5 lg:col-span-2">
                <div className="bg-surface-container-low border border-outline-variant/70 rounded-product-control p-4 space-y-2">
                  <h4 className="text-xs font-heading font-extrabold uppercase tracking-wider text-on-surface">Diagnóstico de Aprendizagem</h4>
                  <p className="text-xs font-medium text-on-surface-variant leading-relaxed whitespace-pre-wrap">{report.performanceSummary}</p>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-product-control p-4 space-y-2.5">
                  <h4 className="text-xs font-heading font-extrabold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <HugeiconsIcon icon={SparklesIcon} size={15} strokeWidth={2} />
                    Diretrizes & Recomendações Pedagógicas
                  </h4>
                  <ul className="space-y-2">
                    {report.recommendations.map((rec, i) => (
                      <li key={i} className="text-xs text-on-surface flex items-start gap-2 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Numbers & Skills */}
              <div className="space-y-5">
                <div className="bg-surface-container-low border border-outline-variant/70 rounded-product-control p-4 space-y-3">
                  <h4 className="text-xs font-heading font-extrabold uppercase tracking-wider text-on-surface">Assiduidade</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="product-metric !min-h-[60px] p-2.5">
                      <div>
                        <p className="product-metric-label">Presença</p>
                        <p className="product-metric-value text-base">{report.attendance.ratio}%</p>
                      </div>
                    </div>
                    <div className="product-metric !min-h-[60px] p-2.5">
                      <div>
                        <p className="product-metric-label">Aulas</p>
                        <p className="product-metric-value text-base">{report.attendance.total}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] font-semibold text-on-surface-variant space-y-1 border-t border-outline-variant/40 pt-2.5">
                    <div className="flex justify-between">
                      <span>Presenças Computadas:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{report.attendance.presents}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Atrasos Registrados:</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">{report.attendance.lates}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Faltas:</span>
                      <span className="text-error font-bold">{report.attendance.absences}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-low border border-outline-variant/70 rounded-product-control p-4 space-y-3">
                  <div>
                    <h4 className="text-xs font-heading font-extrabold text-on-surface flex items-center gap-1.5 mb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Habilidades Consolidadas</span>
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {report.masteredSkills.map((sk) => (
                        <span key={sk} className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-full font-bold text-[9px] border border-emerald-500/20">
                          {sk}
                        </span>
                      ))}
                      {report.masteredSkills.length === 0 && (
                        <span className="text-[10px] text-on-surface-variant italic">Nenhuma habilidade consolidada mapeada.</span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-outline-variant/40 pt-3">
                    <h4 className="text-xs font-heading font-extrabold text-on-surface flex items-center gap-1.5 mb-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Em Desenvolvimento</span>
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {report.improvingSkills.map((sk) => (
                        <span key={sk} className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-full font-bold text-[9px] border border-amber-500/20">
                          {sk}
                        </span>
                      ))}
                      {report.improvingSkills.length === 0 && (
                        <span className="text-[10px] text-on-surface-variant italic">Nenhuma habilidade em melhoria pendente.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="product-empty-state">
              <p className="text-xs text-on-surface-variant font-semibold">Sem dados suficientes para gerar relatório.</p>
            </div>
          )}
        </section>
      )}

      {/* SubTab: Deliveries & Notes */}
      {activeSubTab === 'notas' && (
        <section className="product-card p-5 space-y-6">
          <div className="border-b border-outline-variant/70 pb-4">
            <h3 className="font-heading font-extrabold text-base text-on-surface flex items-center gap-2">
              <HugeiconsIcon icon={SchoolIcon} size={18} strokeWidth={2} className="text-primary" />
              <span>Entregas de Atividades & Notas</span>
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">Acompanhe as respostas enviadas pelo aluno, as notas obtidas e os feedbacks publicados.</p>
          </div>

          <div className="space-y-4">
            {loadingEntregas ? (
              <div className="text-center py-10 text-xs font-semibold text-on-surface-variant animate-pulse">Carregando histórico de entregas...</div>
            ) : entregas.length > 0 ? (
              entregas.map((entrega) => {
                const atividade = entrega.atividades;
                const aula = atividade?.aulas;
                const hasFeedback = entrega.feedback_professor && entrega.feedback_professor.trim() !== '';

                return (
                  <div key={entrega.id} className="product-card-interactive p-4 flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-outline-variant/50 pb-3">
                      <div>
                        <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          Aula {aula?.numero_aula || 0}
                        </span>
                        <h4 className="text-xs font-heading font-extrabold text-on-surface mt-1">{aula?.titulo || 'Atividade'}</h4>
                        <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">Tipo: {atividade?.tipo_entrega || 'texto'}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-on-surface-variant font-medium">
                          Enviado em: {new Date(entrega.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                          entrega.nota !== null 
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                        }`}>
                          {entrega.nota !== null ? `Nota: ${entrega.nota}/100` : 'Pendente de Nota'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-[9px] font-extrabold text-on-surface-variant uppercase tracking-wider mb-1">Enunciado da Atividade</p>
                        <p className="text-xs text-on-surface bg-surface-container-low p-3 rounded-product-control border border-outline-variant/60 leading-relaxed font-medium">
                          {atividade?.enunciado || 'Enunciado não disponível.'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] font-extrabold text-on-surface-variant uppercase tracking-wider mb-1">Resposta do Estudante</p>
                         {atividade?.tipo_entrega === 'imagem' ? (
                          <div className="max-w-md rounded-product-control overflow-hidden border border-outline-variant/70 shadow-inner bg-black/40 p-2">
                            <img 
                              src={entrega.resposta} 
                              alt="Resposta enviada pelo aluno" 
                              className="max-h-64 object-contain rounded-product-control mx-auto bg-white" 
                            />
                          </div>
                        ) : atividade?.tipo_entrega === 'arquivo' ? (
                          <div className="flex items-center justify-between gap-3 bg-surface-container-low p-3 rounded-product-control border border-outline-variant/70 max-w-lg">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-product-control bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <HugeiconsIcon icon={File01Icon} size={16} strokeWidth={2} />
                              </div>
                              <span className="text-xs font-bold text-on-surface truncate" title={getCleanFilename(entrega.resposta)}>
                                {getCleanFilename(entrega.resposta)}
                              </span>
                            </div>
                            <a
                              href={entrega.resposta}
                              target="_blank"
                              rel="noreferrer"
                              className="product-primary-action !min-h-8 text-xs shrink-0"
                            >
                              <HugeiconsIcon icon={Download01Icon} size={14} strokeWidth={2} />
                              Abrir
                            </a>
                          </div>
                        ) : (() => {
                          try {
                            const parsed = JSON.parse(entrega.resposta);
                            if (parsed && (parsed.respostas !== undefined || parsed.score !== undefined)) {
                              return (
                                <div className="bg-surface-container-low p-3.5 rounded-product-control border border-outline-variant/60 space-y-2 text-xs">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    {parsed.score !== null && parsed.score !== undefined && (
                                      <span className="font-bold text-primary">Nota: {parsed.score}/100</span>
                                    )}
                                    {parsed.correctCount !== null && parsed.correctCount !== undefined && (
                                      <span className="font-semibold text-on-surface">Acertos: {parsed.correctCount} de {parsed.totalQuestions ?? '?'}</span>
                                    )}
                                    {parsed.passed !== undefined && (
                                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${parsed.passed ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}`}>
                                        {parsed.passed ? 'Aprovado' : 'Abaixo da Média'}
                                      </span>
                                    )}
                                  </div>
                                  {parsed.respostas && typeof parsed.respostas === 'object' && (
                                    <div className="pt-1 border-t border-outline-variant/40 space-y-1">
                                      <p className="text-[10px] font-mono text-on-surface-variant uppercase font-bold">Respostas Registradas:</p>
                                      {Object.entries(parsed.respostas).map(([key, val], idx) => (
                                        <p key={key} className="text-xs text-on-surface">
                                          <span className="font-mono text-secondary font-bold">Q{idx + 1}:</span> {String(val)}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          } catch {}
                          return (
                            <p className="font-mono text-xs text-on-surface bg-surface-container-low p-3 rounded-product-control border border-outline-variant/60 leading-relaxed whitespace-pre-wrap">
                              {entrega.resposta}
                            </p>
                          );
                        })()}
                      </div>

                      {hasFeedback ? (
                        <div className="bg-primary/5 border-l-4 border-l-primary rounded-r-product-control p-3.5 mt-2">
                          <p className="text-[9px] font-extrabold text-primary uppercase tracking-wider mb-1">Feedback do Professor</p>
                          <p className="text-xs text-on-surface leading-relaxed italic">
                            "{entrega.feedback_professor}"
                          </p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-on-surface-variant italic">Nenhum feedback pedagógico publicado para esta entrega.</p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="product-empty-state py-10">
                <HugeiconsIcon icon={SchoolIcon} size={32} className="text-primary mb-2" />
                <p className="font-heading text-sm font-extrabold text-on-surface">Nenhuma entrega registrada</p>
                <p className="text-xs text-on-surface-variant mt-0.5">As atividades resolvidas na trilha do aluno serão listadas aqui.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
