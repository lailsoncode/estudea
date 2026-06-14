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
  SchoolIcon
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
    tipo_entrega: 'texto' | 'imagem' | 'quiz' | 'multipla';
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

const generateAIReport = (
  profile: StudentProfile,
  autonomia: AutonomiaData,
  diarioRecords: DiarioRecord[]
) => {
  const totalClasses = diarioRecords.length;
  const presents = diarioRecords.filter(r => r.status === 'presente').length;
  const lates = diarioRecords.filter(r => r.status === 'atrasado').length;
  const absences = diarioRecords.filter(r => r.status === 'falta').length;
  const presenceRatio = totalClasses > 0 ? ((presents + lates) / totalClasses) * 100 : 100;

  const neededSupportS = diarioRecords.filter(r => r.precisou_apoio === 'S').length;

  const masteredSkills: string[] = [];
  const improvingSkills: string[] = [];
  const criticalSkills: string[] = [];

  const checkSkill = (label: string, value: 'S' | 'P' | 'N' | null) => {
    if (value === 'S') masteredSkills.push(label);
    else if (value === 'P') improvingSkills.push(label);
    else if (value === 'N') criticalSkills.push(label);
  };

  checkSkill('Uso do Computador', autonomia.usa_computador);
  checkSkill('Navegação na Internet', autonomia.navega_internet);
  checkSkill('Criação de Arquivos', autonomia.cria_salva_arquivos);
  checkSkill('Organização de Pastas', autonomia.organiza_pastas);
  checkSkill('Copia e Cola Links', autonomia.copia_cola_links);
  checkSkill('Redes Sociais', autonomia.conhece_redes_sociais);
  checkSkill('Uso de Ferramentas', autonomia.conhece_ferramentas);

  let performanceSummary = '';
  if (profile.status_risco === 'Excelente') {
    performanceSummary = 'O aluno demonstra um desempenho excepcional. Apresenta alta assiduidade, autonomia digital consolidada e excelente engajamento nas aulas.';
  } else if (profile.status_risco === 'No Caminho') {
    performanceSummary = 'O aluno apresenta um ritmo de aprendizado adequado, mantendo boa frequência e participando ativamente da maioria das atividades.';
  } else if (profile.status_risco === 'Alerta Médio') {
    performanceSummary = 'Atenção pedagógica recomendada. O aluno demonstra oscilações na compreensão ou entrega de atividades, necessitando de suporte assistido esporádico.';
  } else {
    performanceSummary = 'Alerta de risco crítico. O aluno apresenta baixo engajamento nas aulas práticas, frequência insuficiente ou sérias barreiras no uso operacional básico do computador.';
  }

  const recommendations: string[] = [];
  if (autonomia.cria_salva_arquivos === 'N' || autonomia.organiza_pastas === 'N') {
    recommendations.push('Reforçar a prática de gestão de arquivos locais, como criar pastas, salvar e renomear arquivos.');
  }
  if (autonomia.precisa_apoio === 'S' || neededSupportS > totalClasses / 3) {
    recommendations.push('Oferecer monitoria dedicada para as atividades práticas mais complexas.');
  }
  if (profile.media_digitacao < 200) {
    recommendations.push('Incentivar treinos adicionais na trilha de digitação para elevar a fluidez e precisão no teclado.');
  }
  if (absences > 0) {
    recommendations.push('Acompanhar os motivos das ausências recentes e propor atividades de recuperação correspondentes.');
  }
  if (recommendations.length === 0) {
    recommendations.push('Manter o ritmo de desenvolvimento atual e sugerir que o aluno atue como monitor auxiliando os colegas.');
  }

  return {
    performanceSummary,
    masteredSkills,
    improvingSkills,
    criticalSkills,
    attendance: {
      total: totalClasses,
      presents,
      lates,
      absences,
      ratio: presenceRatio.toFixed(1)
    },
    recommendations
  };
};

export const CentralAcompanhamento: React.FC<CentralAcompanhamentoProps> = ({
  alunoId,
  onBack,
  initialTab: _initialTab = 'ficha',
  onChangeStudent
}) => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [autonomia, setAutonomia] = useState<AutonomiaData>(DEFAULT_AUTONOMIA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classStudents, setClassStudents] = useState<{ id: string; nome: string }[]>([]);

  // Sub Tab States
  const [activeSubTab, setActiveSubTab] = useState<'ficha' | 'ia' | 'notas'>('ficha');
  const [diarioRecords, setDiarioRecords] = useState<DiarioRecord[]>([]);
  const [entregas, setEntregas] = useState<EntregaRecord[]>([]);
  const [loadingDiario, setLoadingDiario] = useState(false);
  const [loadingEntregas, setLoadingEntregas] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // AI Report Widget States
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [alunoId]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Student Profile with Turma join
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, turmas(nome, curso_id)')
        .eq('id', alunoId)
        .single();

      if (profileError) throw profileError;

      let tName = 'Sem Turma';
      let cursoId = null;
      if (profileData) {
        const associatedTurma = profileData.turmas;
        if (associatedTurma) {
          tName = Array.isArray(associatedTurma)
            ? associatedTurma[0]?.nome || 'Sem Turma'
            : (associatedTurma as any).nome || 'Sem Turma';
          cursoId = Array.isArray(associatedTurma)
            ? associatedTurma[0]?.curso_id || null
            : (associatedTurma as any).curso_id || null;
        }
      }

      let totalAulasCount = 0;
      let completedAulasCount = 0;

      if (profileData && profileData.turma_id && cursoId) {
        // Fetch all modules of the course
        const { data: modulosData } = await supabase
          .from('modulos')
          .select('id')
          .eq('curso_id', cursoId);

        if (modulosData && modulosData.length > 0) {
          const moduloIds = modulosData.map(m => m.id);

          // Get list of all lesson IDs in this course
          const { data: courseAulasData } = await supabase
            .from('aulas')
            .select('id')
            .in('modulo_id', moduloIds);

          const courseAulaIds = new Set(courseAulasData?.map(a => a.id) || []);
          totalAulasCount = courseAulaIds.size;

          // Fetch student's progress to count completed lessons in this course
          const { data: progressData } = await supabase
            .from('progresso_alunos')
            .select('aula_id')
            .eq('aluno_id', alunoId);

          completedAulasCount = progressData?.filter(p => courseAulaIds.has(p.aula_id)).length || 0;
        }
      }

      if (profileData) {
        setProfile({
          id: profileData.id,
          nome: profileData.nome || 'João da Silva',
          email: profileData.email || 'joao.silva@edu.com',
          avatar_url: profileData.avatar_url,
          progresso_geral: profileData.progresso_geral !== null && profileData.progresso_geral !== undefined ? profileData.progresso_geral : 0,
          frequencia: profileData.frequencia !== null && profileData.frequencia !== undefined ? profileData.frequencia : 100,
          autonomia_digital: profileData.autonomia_digital || 'P',
          status_risco: profileData.status_risco || 'No Caminho',
          media_digitacao: profileData.media_digitacao !== null && profileData.media_digitacao !== undefined ? profileData.media_digitacao : 0,
          ofensiva_atual: profileData.ofensiva_atual !== null && profileData.ofensiva_atual !== undefined ? profileData.ofensiva_atual : 0,
          tempo_resolucao: profileData.tempo_resolucao !== null && profileData.tempo_resolucao !== undefined ? profileData.tempo_resolucao : 0,
          turma_nome: tName,
          anotacoes: profileData.anotacoes || '',
          aulas_concluidas: completedAulasCount,
          total_aulas: totalAulasCount
        });

        setNotes(profileData.anotacoes || '');
      }

      // Fetch other students from the same class
      if (profileData && profileData.turma_id) {
        const { data: listData, error: listError } = await supabase
          .from('profiles')
          .select('id, nome')
          .eq('role', 'student')
          .eq('turma_id', profileData.turma_id)
          .order('nome', { ascending: true });

        if (!listError && listData) {
          setClassStudents(listData);
        }
      } else {
        setClassStudents([]);
      }

      // 2. Fetch Autonomia Criteria
      const { data: autoData, error: autoError } = await supabase
        .from('observacoes_autonomia')
        .select('*')
        .eq('aluno_id', alunoId)
        .maybeSingle();

      if (autoError) throw autoError;

      if (autoData) {
        setAutonomia({
          usa_computador: autoData.usa_computador ?? null,
          navega_internet: autoData.navega_internet ?? null,
          cria_salva_arquivos: autoData.cria_salva_arquivos ?? null,
          organiza_pastas: autoData.organiza_pastas ?? null,
          copia_cola_links: autoData.copia_cola_links ?? null,
          conhece_redes_sociais: autoData.conhece_redes_sociais ?? null,
          conhece_ferramentas: autoData.conhece_ferramentas ?? null,
          precisa_apoio: autoData.precisa_apoio ?? null
        });
      } else {
        setAutonomia(DEFAULT_AUTONOMIA);
      }



      // 4. Fetch Class Diary Logs
      setLoadingDiario(true);
      const { data: diarioData, error: diarioError } = await supabase
        .from('diario_classe')
        .select('*, aulas(id, titulo, numero_aula)')
        .eq('aluno_id', alunoId)
        .order('data', { ascending: false });

      if (!diarioError && diarioData) {
        setDiarioRecords(diarioData as any);
      }
      setLoadingDiario(false);

      // 5. Fetch Student Homework Deliveries
      setLoadingEntregas(true);
      const { data: entregasData, error: entregasError } = await supabase
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
          )
        `)
        .eq('aluno_id', alunoId)
        .order('created_at', { ascending: false });

      if (!entregasError && entregasData) {
        setEntregas(entregasData as any);
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
    // Optimistic UI Update
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
      // Revert state if error
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

  // Generate IA Report dynamically
  const report = useMemo(() => {
    if (!profile) return null;
    return generateAIReport(profile, autonomia, diarioRecords);
  }, [profile, autonomia, diarioRecords]);



  if (loading && !profile) {
    return (
      <div className="w-full space-y-8 animate-fade-in py-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse"></div>
          <div className="w-48 h-6 bg-slate-200 rounded-lg animate-pulse"></div>
        </div>
        <div className="w-full h-32 bg-white rounded-2xl border border-outline-variant/30 animate-pulse"></div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="h-96 bg-white rounded-2xl border border-outline-variant/30 animate-pulse"></div>
          <div className="h-96 bg-white rounded-2xl border border-outline-variant/30 animate-pulse"></div>
          <div className="h-96 bg-white rounded-2xl border border-outline-variant/30 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 animate-fade-in pb-12">
      {error && (
        <div className="bg-red-50 border border-red-200 text-error px-4 py-3 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors w-fit group"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Voltar para Lista de Alunos</span>
        </button>
        <h2 className="font-heading font-extrabold text-2xl text-on-surface">Central de Acompanhamento</h2>
      </div>

      {/* Hero Card */}
      {profile && (
        <div className="bg-white border border-outline-variant/30 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Student Info */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.nome}
                  className="w-14 h-14 rounded-full object-cover border-2 border-primary/20 shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-heading text-lg font-bold shadow-inner shrink-0">
                  {getInitials(profile.nome)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="font-heading font-extrabold text-lg sm:text-xl text-on-surface leading-tight truncate">
                    {profile.nome}
                  </h3>
                  {classStudents.length > 1 && onChangeStudent && (
                    <div className="relative shrink-0">
                      <select
                        value={profile.id}
                        onChange={(e) => onChangeStudent(e.target.value)}
                        className="bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 text-xs font-bold rounded-lg px-2 py-1 pr-7 cursor-pointer focus:outline-none appearance-none transition-colors"
                        style={{
                          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23004ac6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 6px center',
                          backgroundSize: '10px'
                        }}
                      >
                        {classStudents.map((std) => (
                          <option key={std.id} value={std.id} className="text-on-surface bg-white font-sans text-xs">
                            {std.nome} {std.id === profile.id ? ' (Atual)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-medium text-on-surface-variant/70 mt-1 truncate">{profile.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/5 border border-primary/10 px-2.5 py-1 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    <span>{profile.turma_nome || 'Sem Turma'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-5 lg:gap-8 flex-1 justify-start lg:justify-end">
              {/* Progress */}
              <div className="w-full lg:w-40 space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-on-surface-variant/50 uppercase tracking-wider">Progresso</span>
                  <span className="text-secondary">{profile.progresso_geral}%</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full"
                    style={{ width: `${profile.progresso_geral}%` }}
                  ></div>
                </div>
              </div>

              {/* Frequency */}
              <div className="flex items-center gap-2.5 border-l border-slate-100 lg:pl-6 py-1">
                <span className={`w-2 h-2 rounded-full ${profile.frequencia >= 75 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-wider leading-none">Frequência</p>
                  <p className="text-sm font-extrabold text-on-surface mt-1 leading-none">{profile.frequencia}%</p>
                </div>
              </div>

              {/* Streak */}
              <div className="flex items-center gap-2.5 border-l border-slate-100 lg:pl-6 py-1">
                <HugeiconsIcon icon={FireIcon} size={16} className="text-orange-500" />
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-wider leading-none">Ofensiva</p>
                  <p className="text-sm font-extrabold text-on-surface mt-1 leading-none">{profile.ofensiva_atual} dias</p>
                </div>
              </div>

              {/* Typing Speed */}
              <div className="flex items-center gap-2.5 border-l border-slate-100 lg:pl-6 py-1">
                <HugeiconsIcon icon={KeyboardIcon} size={16} className="text-primary" />
                <div>
                  <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-wider leading-none">Digitação</p>
                  <p className="text-sm font-extrabold text-on-surface mt-1 leading-none">{profile.media_digitacao} ppm</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex border-b border-outline-variant/30 gap-6">
        <button
          onClick={() => setActiveSubTab('ficha')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'ficha'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant/60 hover:text-on-surface'
          }`}
        >
          <HugeiconsIcon icon={EyeIcon} size={15} strokeWidth={2.5} />
          <span>Ficha de Acompanhamento</span>
        </button>

        <button
          onClick={() => setActiveSubTab('ia')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'ia'
              ? 'border-secondary text-secondary'
              : 'border-transparent text-on-surface-variant/60 hover:text-on-surface'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
          <span>Análise com IA</span>
        </button>

        <button
          onClick={() => setActiveSubTab('notas')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'notas'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant/60 hover:text-on-surface'
          }`}
        >
          <HugeiconsIcon icon={SchoolIcon} size={15} strokeWidth={2.5} />
          <span>Notas & Entregas</span>
        </button>
      </div>

      {activeSubTab === 'ficha' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Col 1: Checklist */}
          <div className="flex flex-col gap-5">
              
              {/* Practical Observation Checklist */}
              <div className="bg-white border border-outline-variant/30 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h4 className="font-heading font-bold text-sm text-on-surface flex items-center gap-2">
                    <HugeiconsIcon icon={EyeIcon} size={18} strokeWidth={2} className="text-primary" />
                    <span>Ficha de Observação Prática</span>
                  </h4>
                </div>

                <div className="p-5 space-y-3">
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
                      <div key={item.key} className="flex items-center justify-between group py-1">
                        <span className={`text-xs font-semibold ${item.key === 'precisa_apoio' ? 'font-bold text-on-surface' : 'text-on-surface/80'}`}>
                          {item.label}
                        </span>
                        <div className="flex gap-1 bg-slate-50 p-1 rounded-full border border-slate-100">
                          {item.hasP ? (
                            <>
                              <button onClick={() => handleUpdateAutonomia(key, 'S')} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${value === 'S' ? 'bg-emerald-500 text-white shadow-sm scale-105' : 'text-on-surface-variant/40 hover:bg-slate-200/50'}`}>S</button>
                              <button onClick={() => handleUpdateAutonomia(key, 'P')} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${value === 'P' ? 'bg-amber-500 text-white shadow-sm scale-105' : 'text-on-surface-variant/40 hover:bg-slate-200/50'}`}>P</button>
                              <button onClick={() => handleUpdateAutonomia(key, 'N')} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${value === 'N' ? 'bg-red-500 text-white shadow-sm scale-105' : 'text-on-surface-variant/40 hover:bg-slate-200/50'}`}>N</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleUpdateAutonomia(key, 'S')} className={`w-8 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${value === 'S' ? 'bg-red-500 text-white shadow-sm scale-105' : 'text-on-surface-variant/40 hover:bg-slate-200/50'}`}>Sim</button>
                              <button onClick={() => handleUpdateAutonomia(key, 'N')} className={`w-8 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${value === 'N' ? 'bg-slate-300 text-on-surface shadow-sm scale-105' : 'text-on-surface-variant/40 hover:bg-slate-200/50'}`}>Não</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
          </div>


          {/* Col 2: Intelligence + Diary + Notes */}
          <div className="flex flex-col gap-5">
            {/* Pedagogical Intelligence Cards */}
            <div className="bg-white border border-outline-variant/30 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
                <h4 className="font-heading font-bold text-sm text-on-surface flex items-center gap-2">
                  <svg className="w-5 h-5 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                  <span>Inteligência Pedagógica</span>
                </h4>

                <div className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-3.5 border-l-4 border-l-emerald-500">
                  <h5 className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    Zonas de Domínio
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {autonomia.navega_internet === 'S' || autonomia.usa_computador === 'S' ? (
                      <span className="px-2.5 py-1 bg-white rounded-full font-bold text-[9px] text-emerald-700 border border-emerald-100/50 shadow-sm">
                        Autonomia de Hardware
                      </span>
                    ) : null}
                    {autonomia.conhece_redes_sociais === 'S' || autonomia.conhece_redes_sociais === 'P' ? (
                      <span className="px-2.5 py-1 bg-white rounded-full font-bold text-[9px] text-emerald-700 border border-emerald-100/50 shadow-sm">
                        Conectividade
                      </span>
                    ) : null}
                    {autonomia.copia_cola_links === 'S' || autonomia.conhece_ferramentas === 'P' ? (
                      <span className="px-2.5 py-1 bg-white rounded-full font-bold text-[9px] text-emerald-700 border border-emerald-100/50 shadow-sm">
                        Interação Web
                      </span>
                    ) : null}
                    {!(autonomia.navega_internet === 'S' || autonomia.conhece_redes_sociais === 'S' || autonomia.copia_cola_links === 'S') && (
                      <span className="px-2.5 py-1 bg-white rounded-full font-bold text-[9px] text-emerald-700 border border-emerald-100/50 shadow-sm">
                        Interação Básica
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-red-50/20 border border-red-100 rounded-xl p-3.5 border-l-4 border-l-red-500">
                  <h5 className="text-[10px] font-extrabold text-red-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <HugeiconsIcon icon={Alert01Icon} size={12} strokeWidth={2.5} className="text-red-600" />
                    Pontos de Atenção
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {autonomia.cria_salva_arquivos === 'N' || autonomia.organiza_pastas === 'N' ? (
                      <span className="px-2.5 py-1 bg-white rounded-full font-bold text-[9px] text-red-700 border border-red-100/50 shadow-sm">
                        Gestão de Arquivos
                      </span>
                    ) : null}
                    {autonomia.precisa_apoio === 'S' ? (
                      <span className="px-2.5 py-1 bg-white rounded-full font-bold text-[9px] text-red-700 border border-red-100/50 shadow-sm">
                        Suporte Prático
                      </span>
                    ) : null}
                    {!(autonomia.cria_salva_arquivos === 'N' || autonomia.precisa_apoio === 'S') && (
                      <span className="px-2.5 py-1 bg-white rounded-full font-bold text-[9px] text-red-700 border border-red-100/50 shadow-sm">
                        Acompanhar Evolução
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Teacher Notes */}
              <div className="bg-white border border-outline-variant/30 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
                <h4 className="font-heading font-bold text-sm text-on-surface flex items-center gap-2">
                  <HugeiconsIcon icon={Edit01Icon} size={18} strokeWidth={2} className="text-primary" />
                  <span>Anotações do Professor</span>
                </h4>
                <textarea
                  className="w-full bg-slate-50/50 border border-outline-variant/40 rounded-xl p-3.5 text-xs font-semibold text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                  placeholder="Escreva anotações pedagógicas sobre a evolução, dificuldades e comportamento do aluno..."
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="bg-primary hover:bg-primary/95 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all disabled:opacity-50 self-end"
                >
                  {savingNotes ? 'Salvando...' : 'Salvar Anotações'}
                </button>
              </div>
            </div>

            {/* Col 3: Class Attendance History */}
            <div className="flex flex-col gap-5">
              <div className="bg-white border border-outline-variant/30 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h4 className="font-heading font-bold text-sm text-on-surface flex items-center gap-2">
                    <HugeiconsIcon icon={SchoolIcon} size={18} strokeWidth={2} className="text-primary" />
                    <span>Histórico de Aulas (Diário)</span>
                  </h4>
                </div>
                <div className="p-4 space-y-3">
                  {loadingDiario ? (
                    <div className="text-center py-8 text-xs font-semibold text-on-surface-variant/40">Carregando diário...</div>
                  ) : diarioRecords.length > 0 ? (
                    diarioRecords.map((rec) => (
                      <div key={rec.id} className="border border-slate-100 hover:border-slate-200/80 p-3 rounded-xl hover:bg-slate-50/30 transition-all flex flex-col gap-2 shadow-xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md">
                              Aula {rec.aulas?.numero_aula || 0}
                            </span>
                            <h5 className="text-xs font-bold text-on-surface mt-1 leading-tight">{rec.aulas?.titulo || 'Aula sem título'}</h5>
                          </div>
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            rec.status === 'presente' 
                              ? 'bg-emerald-500/10 text-emerald-600' 
                              : rec.status === 'atrasado' 
                                ? 'bg-amber-500/10 text-amber-600' 
                                : 'bg-red-500/10 text-red-600'
                          }`}>
                            {rec.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 border-t border-slate-100/60 pt-2 text-[10px] font-semibold text-on-surface-variant/70">
                          <span className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${rec.compreendeu === 'S' ? 'bg-emerald-500' : rec.compreendeu === 'P' ? 'bg-amber-500' : 'bg-red-500'}`} />
                            Compreensão: {rec.compreendeu}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${rec.participou === 'S' ? 'bg-emerald-500' : rec.participou === 'P' ? 'bg-amber-500' : 'bg-red-500'}`} />
                            Engajamento: {rec.participou}
                          </span>
                          {rec.precisou_apoio === 'S' && (
                            <span className="text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded-md border border-red-100 animate-pulse">
                              Apoio
                            </span>
                          )}
                        </div>

                        {rec.observacao && (
                          <p className="text-[10px] text-on-surface-variant bg-slate-50 p-2 rounded-lg leading-relaxed italic mt-0.5 border border-slate-100/50">
                            "{rec.observacao}"
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant/40 space-y-2 py-10">
                      <HugeiconsIcon icon={SchoolIcon} size={28} strokeWidth={1.5} />
                      <p className="text-xs font-bold">Nenhum registro de aula encontrado.</p>
                      <p className="text-[10px]">Lance a chamada para este aluno no diário de classe.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
      )}


      {/* AI Report View */}
      {activeSubTab === 'ia' && (
        <div className="bg-white border border-outline-variant/30 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <h3 className="font-heading font-extrabold text-lg text-on-surface flex items-center gap-2">
                <svg className="w-5 h-5 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
                <span>Relatório Pedagógico Gerado por IA</span>
              </h3>
              <p className="text-xs text-on-surface-variant/60 font-semibold">Análise instantânea de assiduidade, autonomia digital e pontos críticos.</p>
            </div>
            <button
              onClick={() => {
                setGeneratingReport(true);
                setTimeout(() => {
                  setGeneratingReport(false);
                }, 1000);
              }}
              className="bg-secondary hover:bg-secondary/95 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all flex items-center gap-2 self-start md:self-auto"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>{generatingReport ? 'Analisando dados...' : 'Atualizar Análise'}</span>
            </button>
          </div>

          {generatingReport ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin" />
              <p className="text-xs font-bold text-on-surface-variant animate-pulse">Lendo histórico pedagógico do Supabase...</p>
            </div>
          ) : report ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Diagnostics and Recommendations */}
              <div className="space-y-6 lg:col-span-2">
                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/80">Diagnóstico de Aprendizagem</h4>
                  <p className="text-xs font-semibold text-on-surface leading-relaxed whitespace-pre-wrap">{report.performanceSummary}</p>
                </div>

                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    Diretrizes & Recomendações Pedagógicas
                  </h4>
                  <ul className="space-y-2.5">
                    {report.recommendations.map((rec, i) => (
                      <li key={i} className="text-xs font-semibold text-on-surface flex items-start gap-2 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right Column: Numbers and Skills mapped */}
              <div className="space-y-6">
                
                <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 space-y-4 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/80">Assiduidade na IA</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase leading-none">Presença Geral</p>
                      <p className="text-lg font-extrabold text-on-surface mt-1.5">{report.attendance.ratio}%</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase leading-none">Aulas Totais</p>
                      <p className="text-lg font-extrabold text-on-surface mt-1.5">{report.attendance.total}</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-semibold text-on-surface-variant/80 space-y-1.5 border-t border-slate-100 pt-3">
                    <div className="flex justify-between">
                      <span>Presenças Computadas:</span>
                      <span className="text-emerald-600 font-bold">{report.attendance.presents}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Atrasos Registrados:</span>
                      <span className="text-amber-600 font-bold">{report.attendance.lates}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Faltas Justificadas/Não:</span>
                      <span className="text-red-600 font-bold">{report.attendance.absences}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-outline-variant/30 rounded-2xl p-5 space-y-4 shadow-xs">
                  <div>
                    <h4 className="text-xs font-bold text-on-surface flex items-center gap-1.5 mb-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>Habilidades Mapeadas</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {report.masteredSkills.map((sk) => (
                        <span key={sk} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[9px] border border-emerald-100/30">
                          {sk}
                        </span>
                      ))}
                      {report.masteredSkills.length === 0 && (
                        <span className="text-[10px] text-on-surface-variant/40 italic">Nenhuma habilidade consolidada mapeada.</span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3.5">
                    <h4 className="text-xs font-bold text-on-surface flex items-center gap-1.5 mb-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span>Em Desenvolvimento</span>
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {report.improvingSkills.map((sk) => (
                        <span key={sk} className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full font-bold text-[9px] border border-amber-100/30">
                          {sk}
                        </span>
                      ))}
                      {report.improvingSkills.length === 0 && (
                        <span className="text-[10px] text-on-surface-variant/40 italic">Nenhuma habilidade em melhoria pendente.</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="text-center py-10 text-xs text-on-surface-variant/40 font-semibold">Sem dados suficientes para gerar relatório.</div>
          )}
        </div>
      )}

      {/* Deliveries & Notes View */}
      {activeSubTab === 'notas' && (
        <div className="bg-white border border-outline-variant/30 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-5">
            <h3 className="font-heading font-extrabold text-lg text-on-surface flex items-center gap-2">
              <HugeiconsIcon icon={SchoolIcon} size={20} strokeWidth={2} className="text-primary" />
              <span>Entregas de Atividades & Notas</span>
            </h3>
            <p className="text-xs text-on-surface-variant/60 font-semibold mt-1">Acompanhe as respostas enviadas pelo aluno, as notas obtidas e as avaliações do professor.</p>
          </div>

          <div className="space-y-4">
            {loadingEntregas ? (
              <div className="text-center py-10 text-xs font-semibold text-on-surface-variant/40">Carregando histórico de entregas...</div>
            ) : entregas.length > 0 ? (
              entregas.map((entrega) => {
                const atividade = entrega.atividades;
                const aula = atividade?.aulas;
                const hasFeedback = entrega.feedback_professor && entrega.feedback_professor.trim() !== '';

                return (
                  <div key={entrega.id} className="border border-slate-100 rounded-2xl p-5 hover:bg-slate-50/20 transition-all flex flex-col gap-4 shadow-sm hover:shadow-md">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100/50 pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md">
                          Aula {aula?.numero_aula || 0}
                        </span>
                        <h4 className="text-xs font-extrabold text-on-surface mt-1">{aula?.titulo || 'Atividade'}</h4>
                        <p className="text-[10px] text-on-surface-variant/60 font-semibold mt-0.5">Tipo: {atividade?.tipo_entrega || 'texto'}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-on-surface-variant/50 font-bold">
                          Enviado em: {new Date(entrega.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${
                          entrega.nota !== null 
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200/20' 
                            : 'bg-amber-500/10 text-amber-600 border border-amber-200/20'
                        }`}>
                          {entrega.nota !== null ? `Nota: ${entrega.nota}/100` : 'Pendente de Nota'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-[9px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest leading-none mb-1.5">Enunciado da Atividade</p>
                        <p className="text-xs font-bold text-on-surface bg-slate-50/50 p-3 rounded-xl border border-slate-100/60 leading-relaxed">
                          {atividade?.enunciado || 'Enunciado não disponível.'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[9px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest leading-none mb-1.5">Resposta do Aluno</p>
                        {atividade?.tipo_entrega === 'imagem' ? (
                          <div className="max-w-md rounded-xl overflow-hidden border border-slate-100 shadow-inner bg-slate-50 p-2">
                            <img 
                              src={entrega.resposta} 
                              alt="Resposta enviada pelo aluno" 
                              className="max-h-64 object-contain rounded-lg mx-auto" 
                            />
                          </div>
                        ) : (
                          <p className="font-mono text-[10.5px] font-semibold text-on-surface-variant bg-slate-50/50 p-3.5 rounded-xl border border-slate-100/60 leading-relaxed whitespace-pre-wrap">
                            {entrega.resposta}
                          </p>
                        )}
                      </div>

                      {hasFeedback ? (
                        <div className="bg-primary/5 border-l-4 border-l-primary rounded-r-xl p-4 mt-2">
                          <p className="text-[9px] font-extrabold text-primary uppercase tracking-widest leading-none mb-1.5">Feedback Pedagógico</p>
                          <p className="text-xs font-semibold text-on-surface leading-relaxed italic">
                            "{entrega.feedback_professor}"
                          </p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-on-surface-variant/40 italic font-bold">Nenhum feedback pedagógico publicado para esta entrega.</p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-xs font-semibold text-on-surface-variant/40 space-y-2 border border-slate-100 rounded-2xl py-14">
                <HugeiconsIcon icon={SchoolIcon} size={28} strokeWidth={1.5} />
                <p className="text-xs font-bold">Nenhuma entrega de atividade registrada para este aluno.</p>
                <p className="text-[10px]">As atividades resolvidas na trilha do aluno serão listadas aqui.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
