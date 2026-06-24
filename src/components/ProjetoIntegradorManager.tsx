import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Settings01Icon,
  UserGroupIcon,
  CheckmarkCircle02Icon,
  AddCircleIcon,
  Delete02Icon,
  Edit01Icon,
  Tick01Icon,
  Alert01Icon,
  Calendar01Icon,
  Clock01Icon,
  FileAttachmentIcon,
  LinkSquare01Icon,
  TextIcon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';

interface ProjetoIntegradorManagerProps {
  courseId: string;
}

interface PI {
  id: string;
  curso_id: string;
  titulo: string;
  descricao: string | null;
  tipo: 'individual' | 'grupo';
  tamanho_min_grupo: number;
  tamanho_max_grupo: number;
  xp_por_entrega: number;
  nota_minima_xp: number;
  ativo: boolean;
}

interface EntregaDef {
  id: string;
  projeto_id: string;
  titulo: string;
  descricao: string | null;
  prazo: string | null;
  peso: number;
  ordem: number;
  aceita_arquivo: boolean;
  aceita_link: boolean;
  aceita_texto: boolean;
}

interface Turma {
  id: string;
  nome: string;
}

interface Grupo {
  id: string;
  nome: string;
  projeto_id: string;
  turma_id: string;
  membros_count?: number;
}

interface Aluno {
  id: string;
  nome: string;
  avatar_url?: string;
  grupo_id?: string | null;
  grupo_nome?: string | null;
}

interface Submissao {
  id: string;
  entrega_def_id: string;
  aluno_id: string | null;
  grupo_id: string | null;
  descricao: string | null;
  arquivo_url: string | null;
  link_url: string | null;
  nota: number | null;
  feedback_professor: string | null;
  status: string;
  xp_concedido: boolean;
  updated_at: string;
  aluno_nome?: string;
  grupo_nome?: string;
}

export const ProjetoIntegradorManager: React.FC<ProjetoIntegradorManagerProps> = ({ courseId }) => {
  const [activeTab, setActiveTab] = useState<'configuracao' | 'grupos' | 'avaliacoes'>('configuracao');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cursoTitulo, setCursoTitulo] = useState<string>('');

  // PI Settings State
  const [pi, setPi] = useState<PI | null>(null);
  const [piForm, setPiForm] = useState({
    titulo: '',
    descricao: '',
    tipo: 'individual' as 'individual' | 'grupo',
    tamanho_min_grupo: 2,
    tamanho_max_grupo: 5,
    xp_por_entrega: 100,
    nota_minima_xp: 6.0,
    ativo: true,
  });

  // Milestones State
  const [etapas, setEtapas] = useState<EntregaDef[]>([]);
  const [editingEtapa, setEditingEtapa] = useState<EntregaDef | null>(null);
  const [showEtapaModal, setShowEtapaModal] = useState(false);
  const [etapaForm, setEtapaForm] = useState({
    titulo: '',
    descricao: '',
    prazo: '',
    peso: 1.0,
    ordem: 1,
    aceita_arquivo: true,
    aceita_link: true,
    aceita_texto: true,
  });

  // Groups and Turmas State
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>('');
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [alunosSemGrupo, setAlunosSemGrupo] = useState<Aluno[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  const [membrosGrupo, setMembrosGrupo] = useState<any[]>([]);
  const [newGrupoNome, setNewGrupoNome] = useState('');

  // Evaluation State
  const [selectedEtapaId, setSelectedEtapaId] = useState<string>('');
  const [selectedSubmissao, setSelectedSubmissao] = useState<Submissao | null>(null);
  const [evaluationForm, setEvaluationForm] = useState({
    nota: '',
    feedback_professor: '',
    status: 'avaliada' as 'avaliada' | 'revisao',
  });

  const [selectedMarcaDetalhes, setSelectedMarcaDetalhes] = useState<any | null>(null);
  const [loadingSelectedMarca, setLoadingSelectedMarca] = useState(false);

  // Cockpit Evaluations States
  const [showMatrix, setShowMatrix] = useState(true);
  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [unifiedDeliveries, setUnifiedDeliveries] = useState<any[]>([]);

  const isMidiasDigitais =
    cursoTitulo.toLowerCase().includes('mídia') ||
    cursoTitulo.toLowerCase().includes('midia') ||
    (pi?.titulo || '').toLowerCase().includes('mídia') ||
    (pi?.titulo || '').toLowerCase().includes('midia');

  const fetchSelectedMarcaDetails = async (projetoId: string, options: { alunoId?: string | null; grupoId?: string | null }) => {
    try {
      setLoadingSelectedMarca(true);
      setSelectedMarcaDetalhes(null);
      let query = supabase
        .from('pi_marca_detalhes')
        .select('*')
        .eq('projeto_id', projetoId);
      
      if (options.grupoId) {
        query = query.eq('grupo_id', options.grupoId);
      } else if (options.alunoId) {
        query = query.eq('aluno_id', options.alunoId);
      } else {
        setLoadingSelectedMarca(false);
        return;
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      setSelectedMarcaDetalhes(data);
    } catch (err: any) {
      console.error('Erro ao carregar detalhes da marca do aluno/grupo:', err);
    } finally {
      setLoadingSelectedMarca(false);
    }
  };

  useEffect(() => {
    if (pi && selectedGrupo) {
      fetchSelectedMarcaDetails(pi.id, { grupoId: selectedGrupo.id });
    } else {
      setSelectedMarcaDetalhes(null);
    }
  }, [selectedGrupo, pi]);

  // Fetch initial course PI
  const fetchPI = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: cursoData } = await supabase
        .from('cursos')
        .select('titulo')
        .eq('id', courseId)
        .single();
      if (cursoData) {
        setCursoTitulo(cursoData.titulo);
      }

      const { data: piData, error: piErr } = await supabase
        .from('projetos_integradores')
        .select('*')
        .eq('curso_id', courseId)
        .maybeSingle();

      if (piErr) throw piErr;

      if (piData) {
        setPi(piData);
        setPiForm({
          titulo: piData.titulo,
          descricao: piData.descricao || '',
          tipo: piData.tipo,
          tamanho_min_grupo: piData.tamanho_min_grupo,
          tamanho_max_grupo: piData.tamanho_max_grupo,
          xp_por_entrega: piData.xp_por_entrega,
          nota_minima_xp: Number(piData.nota_minima_xp),
          ativo: piData.ativo,
        });

        // Load milestones
        const { data: etData, error: etErr } = await supabase
          .from('pi_entregas_definicoes')
          .select('*')
          .eq('projeto_id', piData.id)
          .order('ordem', { ascending: true });
        if (etErr) throw etErr;
        setEtapas(etData || []);
        if (etData && etData.length > 0 && !selectedEtapaId) {
          setSelectedEtapaId(etData[0].id);
        }
      } else {
        setPi(null);
        setPiForm({
          titulo: 'Projeto Integrador',
          descricao: '',
          tipo: 'individual',
          tamanho_min_grupo: 2,
          tamanho_max_grupo: 5,
          xp_por_entrega: 100,
          nota_minima_xp: 6.0,
          ativo: true,
        });
        setEtapas([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTurmas = async () => {
    try {
      const { data, error } = await supabase
        .from('turmas')
        .select('id, nome')
        .eq('curso_id', courseId);
      if (error) throw error;
      setTurmas(data || []);
      if (data && data.length > 0 && !selectedTurmaId) {
        setSelectedTurmaId(data[0].id);
      }
    } catch (err: any) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    fetchPI();
    fetchTurmas();
  }, [courseId]);

  // Fetch groups when turma changes or groups are modified
  const fetchGroupsAndStudents = async () => {
    if (!pi || !selectedTurmaId) return;
    try {
      // Fetch groups
      const { data: gData, error: gErr } = await supabase
        .from('pi_grupos')
        .select('*')
        .eq('projeto_id', pi.id)
        .eq('turma_id', selectedTurmaId);
      if (gErr) throw gErr;

      // Fetch all students in this class
      const { data: sData, error: sErr } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url')
        .eq('turma_id', selectedTurmaId)
        .eq('role', 'student');
      if (sErr) throw sErr;

      // Fetch members of all groups in this class
      const groupIds = (gData || []).map(g => g.id);
      let membersMap: Record<string, string> = {}; // studentId -> groupId
      let groupMembersList: any[] = [];
      if (groupIds.length > 0) {
        const { data: mData } = await supabase
          .from('pi_grupo_membros')
          .select('aluno_id, grupo_id')
          .in('grupo_id', groupIds);
        if (mData) {
          groupMembersList = mData;
          mData.forEach(m => {
            membersMap[m.aluno_id] = m.grupo_id;
          });
        }
      }

      // Count members per group
      const gruposWithCount = (gData || []).map(g => ({
        ...g,
        membros_count: groupMembersList.filter(m => m.grupo_id === g.id).length,
      }));

      setGrupos(gruposWithCount);

      // Filter students who are not in any group
      const unassignedStudents = (sData || []).map(s => ({
        id: s.id,
        nome: s.nome || 'Aluno Sem Nome',
        avatar_url: s.avatar_url,
        grupo_id: membersMap[s.id] || null,
        grupo_nome: membersMap[s.id] ? (gData || []).find(g => g.id === membersMap[s.id])?.nome || '' : null,
      })).filter(s => !s.grupo_id);

      setAlunosSemGrupo(unassignedStudents);

      if (selectedGrupo) {
        // Refresh selected group
        const refreshedSelected = gruposWithCount.find(g => g.id === selectedGrupo.id) || null;
        setSelectedGrupo(refreshedSelected);
        if (refreshedSelected) {
          fetchGroupMembers(refreshedSelected.id);
        }
      }
    } catch (err: any) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    fetchGroupsAndStudents();
  }, [pi, selectedTurmaId]);

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('pi_grupo_membros')
        .select('id, aluno_id, lider, profiles(nome, avatar_url)')
        .eq('grupo_id', groupId);
      if (error) throw error;
      setMembrosGrupo(data || []);
    } catch (err: any) {
      console.error(err.message);
    }
  };

  // Fetch submissions and build matrix/unified views for Evaluation tab
  const fetchMatrixData = async () => {
    if (!pi) return;
    try {
      setLoadingMatrix(true);

      const etapaIds = etapas.map(e => e.id);
      if (etapaIds.length === 0) {
        setMatrixData([]);
        setLoadingMatrix(false);
        return;
      }

      const { data: subs, error: subsErr } = await supabase
        .from('pi_submissoes')
        .select('id, entrega_def_id, aluno_id, grupo_id, status, nota')
        .in('entrega_def_id', etapaIds);
      if (subsErr) throw subsErr;

      const { data: grps, error: grpsErr } = await supabase
        .from('pi_grupos')
        .select('id, nome, turma_id')
        .eq('projeto_id', pi.id);
      if (grpsErr) throw grpsErr;

      const { data: studs, error: studsErr } = await supabase
        .from('profiles')
        .select('id, nome, turma_id')
        .eq('role', 'student');
      if (studsErr) throw studsErr;

      const stats: any[] = [];

      turmas.forEach(t => {
        const turmaGroups = grps ? grps.filter(g => g.turma_id === t.id) : [];
        const turmaStudents = studs ? studs.filter(s => s.turma_id === t.id) : [];
        const expectedCount = pi.tipo === 'grupo' ? turmaGroups.length : turmaStudents.length;

        const rowEtapas = etapas.map(et => {
          const milestoneSubs = subs ? subs.filter(s => s.entrega_def_id === et.id) : [];

          let received = 0;
          let pending = 0;
          let evaluated = 0;

          if (pi.tipo === 'grupo') {
            const groupIds = new Set(turmaGroups.map(g => g.id));
            milestoneSubs.forEach(s => {
              if (s.grupo_id && groupIds.has(s.grupo_id)) {
                received++;
                if (s.nota !== null || s.status === 'avaliada') {
                  evaluated++;
                } else {
                  pending++;
                }
              }
            });
          } else {
            const studentIds = new Set(turmaStudents.map(s => s.id));
            milestoneSubs.forEach(s => {
              if (s.aluno_id && studentIds.has(s.aluno_id)) {
                received++;
                if (s.nota !== null || s.status === 'avaliada') {
                  evaluated++;
                } else {
                  pending++;
                }
              }
            });
          }

          return {
            etapaId: et.id,
            etapaTitulo: et.titulo,
            expected: expectedCount,
            received,
            pending,
            evaluated,
          };
        });

        stats.push({
          turmaId: t.id,
          turmaNome: t.nome,
          expectedCount,
          etapas: rowEtapas,
        });
      });

      setMatrixData(stats);
    } catch (err: any) {
      console.error('Erro ao buscar dados da matriz:', err);
    } finally {
      setLoadingMatrix(false);
    }
  };

  const fetchSubmissions = async () => {
    if (!selectedEtapaId || !selectedTurmaId || !pi) return;
    try {
      setError(null);

      // 1. Fetch submissions
      const { data: subData, error: subErr } = await supabase
        .from('pi_submissoes')
        .select('*')
        .eq('entrega_def_id', selectedEtapaId);
      if (subErr) throw subErr;

      // We resolve names and construct both received list and unified list
      if (pi.tipo === 'grupo') {
        const { data: grps, error: grpsErr } = await supabase
          .from('pi_grupos')
          .select('id, nome')
          .eq('turma_id', selectedTurmaId)
          .eq('projeto_id', pi.id);
        if (grpsErr) throw grpsErr;

        // Unified list
        const subsMap = new Map((subData || []).filter(s => s.grupo_id).map(s => [s.grupo_id, s]));
        const unified = (grps || []).map(g => {
          const sub = subsMap.get(g.id);
          return {
            id: g.id,
            name: g.nome,
            submission: sub ? { ...sub, grupo_nome: g.nome } : null,
            status: sub ? sub.status : 'missing',
            nota: sub ? sub.nota : null,
          };
        });

        // Sort: Pending -> In Revision -> Missing -> Graded
        unified.sort((a, b) => {
          const statusOrder: Record<string, number> = {
            enviada: 1,
            pendente: 1,
            revisao: 2,
            missing: 3,
            avaliada: 4,
          };
          return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        });

        setUnifiedDeliveries(unified);
      } else {
        const { data: studs, error: studsErr } = await supabase
          .from('profiles')
          .select('id, nome')
          .eq('turma_id', selectedTurmaId)
          .eq('role', 'student');
        if (studsErr) throw studsErr;

        // Unified list
        const subsMap = new Map((subData || []).filter(s => s.aluno_id).map(s => [s.aluno_id, s]));
        const unified = (studs || []).map(s => {
          const sub = subsMap.get(s.id);
          return {
            id: s.id,
            name: s.nome,
            submission: sub ? { ...sub, aluno_nome: s.nome } : null,
            status: sub ? sub.status : 'missing',
            nota: sub ? sub.nota : null,
          };
        });

        // Sort
        unified.sort((a, b) => {
          const statusOrder: Record<string, number> = {
            enviada: 1,
            pendente: 1,
            revisao: 2,
            missing: 3,
            avaliada: 4,
          };
          return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
        });

        setUnifiedDeliveries(unified);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'avaliacoes') {
      fetchSubmissions();
      fetchMatrixData();
    }
  }, [selectedEtapaId, selectedTurmaId, activeTab, pi, etapas]);

  const handleSavePI = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (pi) {
        // Update existing PI
        const { data, error } = await supabase
          .from('projetos_integradores')
          .update({
            titulo: piForm.titulo,
            descricao: piForm.descricao || null,
            tipo: piForm.tipo,
            tamanho_min_grupo: piForm.tamanho_min_grupo,
            tamanho_max_grupo: piForm.tamanho_max_grupo,
            xp_por_entrega: piForm.xp_por_entrega,
            nota_minima_xp: piForm.nota_minima_xp,
            ativo: piForm.ativo,
          })
          .eq('id', pi.id)
          .select()
          .single();
        if (error) throw error;
        setPi(data);
      } else {
        // Create new PI
        const { data, error } = await supabase
          .from('projetos_integradores')
          .insert({
            curso_id: courseId,
            titulo: piForm.titulo,
            descricao: piForm.descricao || null,
            tipo: piForm.tipo,
            tamanho_min_grupo: piForm.tamanho_min_grupo,
            tamanho_max_grupo: piForm.tamanho_max_grupo,
            xp_por_entrega: piForm.xp_por_entrega,
            nota_minima_xp: piForm.nota_minima_xp,
            ativo: piForm.ativo,
          })
          .select()
          .single();
        if (error) throw error;
        setPi(data);
      }
      setSuccess('Projeto Integrador salvo com sucesso! 🚀');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadMidiasPreset = async () => {
    if (!window.confirm('Isso irá configurar o projeto em grupo e gerar as 5 etapas padrão do Projeto Integrador de Mídias Digitais (Plano de Mídias, Produção, Campanha, Métricas e Apresentação). Se já houver etapas salvas, elas serão substituídas. Deseja prosseguir?')) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let currentPi = pi;

      // 1. Create PI if it doesn't exist
      if (!currentPi) {
        const { data, error: piErr } = await supabase
          .from('projetos_integradores')
          .insert({
            curso_id: courseId,
            titulo: 'Projeto Integrador — Assistente em Mídias Digitais',
            descricao: 'Desenvolvimento prático da presença digital de uma marca/empresa de escolha da equipe, construindo o planejamento de mídias, criação de conteúdos, organização de campanha, análise de métricas e apresentação final.',
            tipo: 'grupo',
            tamanho_min_grupo: 2,
            tamanho_max_grupo: 5,
            xp_por_entrega: 100,
            nota_minima_xp: 6.0,
            ativo: true,
          })
          .select()
          .single();

        if (piErr) throw piErr;
        currentPi = data;
        setPi(data);
      } else {
        // Update existing PI to standard settings
        const { data, error: piErr } = await supabase
          .from('projetos_integradores')
          .update({
            titulo: 'Projeto Integrador — Assistente em Mídias Digitais',
            descricao: 'Desenvolvimento prático da presença digital de uma marca/empresa de escolha da equipe, construindo o planejamento de mídias, criação de conteúdos, organização de campanha, análise de métricas e apresentação final.',
            tipo: 'grupo',
            tamanho_min_grupo: 2,
            tamanho_max_grupo: 5,
            xp_por_entrega: 100,
            nota_minima_xp: 6.0,
            ativo: true,
          })
          .eq('id', currentPi.id)
          .select()
          .single();

        if (piErr) throw piErr;
        currentPi = data;
        setPi(data);
      }

      if (!currentPi) throw new Error('Não foi possível identificar ou inicializar o projeto.');

      // 2. Clear existing stages to avoid duplicates
      const { error: delErr } = await supabase
        .from('pi_entregas_definicoes')
        .delete()
        .eq('projeto_id', currentPi.id);
      if (delErr) throw delErr;

      // 3. Batch insert the 5 default milestones
      const defaultEtapas = [
        {
          projeto_id: currentPi.id,
          titulo: 'Plano Inicial de Mídias Digitais',
          descricao: 'Definição da marca/empresa, justificativa, público-alvo, persona de cliente e diagnóstico SWOT inicial da presença digital atual.',
          prazo: null,
          peso: 2.0,
          ordem: 1,
          aceita_arquivo: true,
          aceita_link: true,
          aceita_texto: true,
        },
        {
          projeto_id: currentPi.id,
          titulo: 'Produção de Conteúdos',
          descricao: 'Desenvolvimento prático de publicações, rascunhos de criativos (imagens, vídeos), copywriting e calendário editorial para a marca.',
          prazo: null,
          peso: 2.0,
          ordem: 2,
          aceita_arquivo: true,
          aceita_link: true,
          aceita_texto: true,
        },
        {
          projeto_id: currentPi.id,
          titulo: 'Organização de Campanha',
          descricao: 'Estruturação do planejamento da campanha (anúncios, verba, tráfego pago/orgânico) e cronograma oficial de postagens.',
          prazo: null,
          peso: 2.0,
          ordem: 3,
          aceita_arquivo: true,
          aceita_link: true,
          aceita_texto: true,
        },
        {
          projeto_id: currentPi.id,
          titulo: 'Análise de Resultados',
          descricao: 'Coleta de dados de engajamento, alcance, impressões e cliques. Construção do relatório preliminar de resultados.',
          prazo: null,
          peso: 2.0,
          ordem: 4,
          aceita_arquivo: true,
          aceita_link: true,
          aceita_texto: true,
        },
        {
          projeto_id: currentPi.id,
          titulo: 'Apresentação Final',
          descricao: 'Entrega final da estratégia de mídias consolidada, defesa oral do projeto integrado e planos futuros para a marca.',
          prazo: null,
          peso: 2.0,
          ordem: 5,
          aceita_arquivo: true,
          aceita_link: true,
          aceita_texto: true,
        },
      ];

      const { error: insErr } = await supabase
        .from('pi_entregas_definicoes')
        .insert(defaultEtapas);

      if (insErr) throw insErr;

      setSuccess('Modelo de Mídias Digitais carregado com sucesso! 🚀');
      fetchPI();
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar modelo.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEtapaModal = (etapa: EntregaDef | null = null) => {
    if (etapa) {
      setEditingEtapa(etapa);
      setEtapaForm({
        titulo: etapa.titulo,
        descricao: etapa.descricao || '',
        prazo: etapa.prazo || '',
        peso: Number(etapa.peso),
        ordem: etapa.ordem,
        aceita_arquivo: etapa.aceita_arquivo,
        aceita_link: etapa.aceita_link,
        aceita_texto: etapa.aceita_texto,
      });
    } else {
      setEditingEtapa(null);
      setEtapaForm({
        titulo: '',
        descricao: '',
        prazo: '',
        peso: 1.0,
        ordem: etapas.length + 1,
        aceita_arquivo: true,
        aceita_link: true,
        aceita_texto: true,
      });
    }
    setShowEtapaModal(true);
  };

  const handleSaveEtapa = async () => {
    if (!pi) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        projeto_id: pi.id,
        titulo: etapaForm.titulo,
        descricao: etapaForm.descricao || null,
        prazo: etapaForm.prazo || null,
        peso: etapaForm.peso,
        ordem: etapaForm.ordem,
        aceita_arquivo: etapaForm.aceita_arquivo,
        aceita_link: etapaForm.aceita_link,
        aceita_texto: etapaForm.aceita_texto,
      };

      if (editingEtapa) {
        const { error } = await supabase
          .from('pi_entregas_definicoes')
          .update(payload)
          .eq('id', editingEtapa.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pi_entregas_definicoes')
          .insert(payload);
        if (error) throw error;
      }

      setShowEtapaModal(false);
      fetchPI();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEtapa = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta etapa? Submissões e avaliações relacionadas serão perdidas.')) return;
    try {
      const { error } = await supabase
        .from('pi_entregas_definicoes')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchPI();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateGroup = async () => {
    if (!pi || !selectedTurmaId || !newGrupoNome.trim()) return;
    try {
      setError(null);
      const { error } = await supabase
        .from('pi_grupos')
        .insert({
          projeto_id: pi.id,
          turma_id: selectedTurmaId,
          nome: newGrupoNome.trim(),
        });
      if (error) throw error;
      setNewGrupoNome('');
      fetchGroupsAndStudents();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Excluir este grupo? Os membros ficarão sem grupo.')) return;
    try {
      const { error } = await supabase
        .from('pi_grupos')
        .delete()
        .eq('id', groupId);
      if (error) throw error;
      if (selectedGrupo?.id === groupId) {
        setSelectedGrupo(null);
        setMembrosGrupo([]);
      }
      fetchGroupsAndStudents();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddMember = async (studentId: string) => {
    if (!selectedGrupo) return;
    try {
      setError(null);
      const { error } = await supabase
        .from('pi_grupo_membros')
        .insert({
          grupo_id: selectedGrupo.id,
          aluno_id: studentId,
          lider: membrosGrupo.length === 0, // make leader if first member
        });
      if (error) throw error;
      fetchGroupsAndStudents();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('pi_grupo_membros')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
      fetchGroupsAndStudents();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleLeader = async (member: any) => {
    try {
      const { error } = await supabase
        .from('pi_grupo_membros')
        .update({ lider: !member.lider })
        .eq('id', member.id);
      if (error) throw error;
      fetchGroupsAndStudents();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenEvaluation = async (sub: Submissao) => {
    setSelectedSubmissao(sub);
    setEvaluationForm({
      nota: sub.nota !== null ? sub.nota.toString() : '',
      feedback_professor: sub.feedback_professor || '',
      status: (sub.status === 'revisao' ? 'revisao' : 'avaliada') as 'avaliada' | 'revisao',
    });
    if (pi) {
      await fetchSelectedMarcaDetails(pi.id, { alunoId: sub.aluno_id, grupoId: sub.grupo_id });
    }
  };

  const handleSaveEvaluation = async () => {
    if (!selectedSubmissao) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('pi_submissoes')
        .update({
          nota: evaluationForm.nota ? Number(evaluationForm.nota) : null,
          feedback_professor: evaluationForm.feedback_professor || null,
          status: evaluationForm.status,
          avaliado_em: new Date().toISOString(),
        })
        .eq('id', selectedSubmissao.id);

      if (error) throw error;
      setSuccess('Avaliação salva com sucesso!');
      setSelectedSubmissao(null);
      fetchSubmissions();
      fetchMatrixData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderMarcaDetailsSection = (marca: any) => {
    if (loadingSelectedMarca) {
      return (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      );
    }

    if (!marca) {
      return (
        <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-4 text-center text-xs text-slate-400">
          Nenhuma Ficha da Marca preenchida por este aluno ou grupo ainda.
        </div>
      );
    }

    return (
      <div className="bg-slate-50 border border-slate-200/85 rounded-xl p-4 space-y-4 max-h-[450px] overflow-y-auto">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
          <h4 className="font-heading font-bold text-body-md text-primary">Ficha da Marca: {marca.nome_marca}</h4>
          {marca.segmento && <span className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-0.5 rounded">{marca.segmento}</span>}
        </div>

        {marca.justificativa && (
          <div className="space-y-1">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Justificativa</h5>
            <p className="text-xs text-on-surface leading-relaxed">{marca.justificativa}</p>
          </div>
        )}

        {marca.drive_url && (
          <div className="bg-green-50/50 border border-green-200/60 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl leading-none shrink-0 select-none">📂</span>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-green-700 block uppercase tracking-wider">Pasta da Equipe (Google Drive)</span>
                <a
                  href={marca.drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-800 hover:text-green-950 font-semibold hover:underline truncate block"
                >
                  {marca.drive_url}
                </a>
              </div>
            </div>
            <a
              href={marca.drive_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg shrink-0 transition-all shadow-md shadow-green-500/10"
            >
              Abrir Pasta
            </a>
          </div>
        )}

        {Array.isArray(marca.canais_digitais) && marca.canais_digitais.some((c: any) => c.url) && (
          <div className="space-y-1.5">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Presença Digital (Canais)</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {marca.canais_digitais.filter((c: any) => c.url).map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-100 px-2 py-1 rounded">
                  <span className="font-semibold text-slate-700">{c.canal}:</span>
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1">{c.url}</a>
                </div>
              ))}
            </div>
          </div>
        )}

        {marca.publico_alvo && (
          <div className="space-y-1">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Público-Alvo</h5>
            <p className="text-xs text-on-surface leading-relaxed">{marca.publico_alvo}</p>
          </div>
        )}

        {(marca.persona_nome || marca.persona_idade || marca.persona_dores || marca.persona_desejos || marca.persona_necessidades || marca.persona_comportamento) && (
          <div className="bg-white border border-slate-200/60 rounded-lg p-3 space-y-2">
            <h5 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-1 flex items-center justify-between">
              <span>Persona</span>
              {marca.persona_nome && <span className="text-primary">{marca.persona_nome} {marca.persona_idade ? `(${marca.persona_idade})` : ''}</span>}
            </h5>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {marca.persona_dores && (
                <div><span className="font-semibold text-slate-600 block">Dores:</span><p className="text-slate-700 leading-normal">{marca.persona_dores}</p></div>
              )}
              {marca.persona_desejos && (
                <div><span className="font-semibold text-slate-600 block">Desejos:</span><p className="text-slate-700 leading-normal">{marca.persona_desejos}</p></div>
              )}
              {marca.persona_necessidades && (
                <div><span className="font-semibold text-slate-600 block">Necessidades:</span><p className="text-slate-700 leading-normal">{marca.persona_necessidades}</p></div>
              )}
              {marca.persona_comportamento && (
                <div><span className="font-semibold text-slate-600 block">Comportamento Digital:</span><p className="text-slate-700 leading-normal">{marca.persona_comportamento}</p></div>
              )}
            </div>
          </div>
        )}

        {(marca.pontos_fortes || marca.pontos_fracos || marca.oportunidades || marca.concorrentes) && (
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Diagnóstico & Concorrência</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {marca.pontos_fortes && (
                <div className="bg-green-50/40 border border-green-100/50 p-2.5 rounded-lg">
                  <span className="font-bold text-green-700 block mb-0.5">Pontos Fortes:</span>
                  <p className="text-slate-700 leading-normal">{marca.pontos_fortes}</p>
                </div>
              )}
              {marca.pontos_fracos && (
                <div className="bg-red-50/40 border border-red-100/50 p-2.5 rounded-lg">
                  <span className="font-bold text-red-700 block mb-0.5">Pontos Fracos:</span>
                  <p className="text-slate-700 leading-normal">{marca.pontos_fracos}</p>
                </div>
              )}
              {marca.oportunidades && (
                <div className="bg-blue-50/40 border border-blue-100/50 p-2.5 rounded-lg col-span-1 md:col-span-2">
                  <span className="font-bold text-blue-700 block mb-0.5">Oportunidades:</span>
                  <p className="text-slate-700 leading-normal">{marca.oportunidades}</p>
                </div>
              )}
              {marca.concorrentes && (
                <div className="bg-slate-100/60 border border-slate-200/50 p-2.5 rounded-lg col-span-1 md:col-span-2">
                  <span className="font-bold text-slate-700 block mb-0.5">Concorrentes & Referências:</span>
                  <p className="text-slate-700 leading-normal">{marca.concorrentes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {(marca.palavras_chave || marca.frase_posicionamento || marca.tom_voz) && (
          <div className="space-y-2 border-t border-slate-200/60 pt-3">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Posicionamento & Branding</h5>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {marca.palavras_chave && (
                <div><span className="font-semibold text-slate-600">Palavras-chave:</span> <span className="text-slate-700 font-medium italic">{marca.palavras_chave}</span></div>
              )}
              {marca.frase_posicionamento && (
                <div><span className="font-semibold text-slate-600 block">Frase de Posicionamento:</span><p className="text-slate-700 leading-normal italic">"{marca.frase_posicionamento}"</p></div>
              )}
              {marca.tom_voz && (
                <div><span className="font-semibold text-slate-600 block">Tom de Voz:</span><p className="text-slate-700 leading-normal">{marca.tom_voz}</p></div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('configuracao')}
          className={`px-5 py-3 font-heading font-bold text-label-md transition-all border-b-2 -mb-[1px] flex items-center gap-1.5 ${
            activeTab === 'configuracao'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={2} />
          Configuração & Etapas
        </button>

        <button
          onClick={() => {
            setActiveTab('grupos');
            if (turmas.length > 0 && !selectedTurmaId) {
              setSelectedTurmaId(turmas[0].id);
            }
          }}
          className={`px-5 py-3 font-heading font-bold text-label-md transition-all border-b-2 -mb-[1px] flex items-center gap-1.5 ${
            activeTab === 'grupos'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <HugeiconsIcon icon={UserGroupIcon} size={16} strokeWidth={2} />
          Gestão de Grupos
        </button>

        <button
          onClick={() => setActiveTab('avaliacoes')}
          className={`px-5 py-3 font-heading font-bold text-label-md transition-all border-b-2 -mb-[1px] flex items-center gap-1.5 ${
            activeTab === 'avaliacoes'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={2} />
          Avaliações
        </button>
      </div>

      {error && (
        <div className="bg-error-container/20 border border-error/30 text-error rounded-xl p-3 text-body-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 text-green-700 dark:text-green-400 rounded-xl p-3 text-body-sm">
          {success}
        </div>
      )}

      {/* Loading state */}
      {loading && activeTab === 'configuracao' ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : (
        <>
          {/* TAB 1: CONFIGURATION */}
          {activeTab === 'configuracao' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Configuration Form */}
              <div className="lg:col-span-1 app-card-padded space-y-4 h-fit">
                <h3 className="font-heading font-extrabold text-body-lg text-on-surface">Configurações Gerais</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-label-sm font-semibold text-on-surface-variant mb-1">Título do Projeto</label>
                    <input
                      type="text"
                      value={piForm.titulo}
                      onChange={e => setPiForm({ ...piForm, titulo: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-body-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-label-sm font-semibold text-on-surface-variant mb-1">Descrição</label>
                    <textarea
                      value={piForm.descricao}
                      onChange={e => setPiForm({ ...piForm, descricao: e.target.value })}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-body-sm focus:outline-none focus:border-primary resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-label-sm font-semibold text-on-surface-variant mb-1">Formato</label>
                    <select
                      value={piForm.tipo}
                      onChange={e => setPiForm({ ...piForm, tipo: e.target.value as 'individual' | 'grupo' })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-body-sm focus:outline-none focus:border-primary"
                    >
                      <option value="individual">Individual</option>
                      <option value="grupo">Em Grupo</option>
                    </select>
                  </div>

                  {piForm.tipo === 'grupo' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-label-sm font-semibold text-on-surface-variant mb-1">Mín. Alunos</label>
                        <input
                          type="number"
                          value={piForm.tamanho_min_grupo}
                          onChange={e => setPiForm({ ...piForm, tamanho_min_grupo: parseInt(e.target.value, 10) || 2 })}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-body-sm focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-label-sm font-semibold text-on-surface-variant mb-1">Máx. Alunos</label>
                        <input
                          type="number"
                          value={piForm.tamanho_max_grupo}
                          onChange={e => setPiForm({ ...piForm, tamanho_max_grupo: parseInt(e.target.value, 10) || 5 })}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-body-sm focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-label-sm font-semibold text-on-surface-variant mb-1">XP por entrega</label>
                      <input
                        type="number"
                        value={piForm.xp_por_entrega}
                        onChange={e => setPiForm({ ...piForm, xp_por_entrega: parseInt(e.target.value, 10) || 0 })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-body-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-label-sm font-semibold text-on-surface-variant mb-1">Média p/ XP</label>
                      <input
                        type="number"
                        step="0.1"
                        value={piForm.nota_minima_xp}
                        onChange={e => setPiForm({ ...piForm, nota_minima_xp: parseFloat(e.target.value) || 0 })}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-body-sm focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 pt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={piForm.ativo}
                      onChange={e => setPiForm({ ...piForm, ativo: e.target.checked })}
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <span className="text-body-sm font-semibold text-on-surface">Projeto Integrador Ativo</span>
                  </label>

                   <button
                    onClick={handleSavePI}
                    disabled={saving || !piForm.titulo.trim()}
                    className="w-full py-2.5 bg-primary text-on-primary font-heading font-bold text-label-sm rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    <HugeiconsIcon icon={Tick01Icon} size={16} strokeWidth={2.5} />
                    {pi ? 'Salvar Configurações' : 'Inicializar PI'}
                  </button>

                  {isMidiasDigitais && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <button
                        type="button"
                        onClick={handleLoadMidiasPreset}
                        disabled={saving}
                        className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-heading font-bold text-label-sm rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-violet-500/20"
                      >
                        ⚡ Modelo de Mídias Digitais
                      </button>
                      <p className="text-[10px] text-slate-400 leading-normal text-center">
                        Configura o projeto em grupo e gera as 5 etapas padrão do curso de Mídias Digitais automaticamente.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Milestones / Delivery Steps List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-extrabold text-body-lg text-on-surface">Etapas do Projeto</h3>
                  {pi && (
                    <button
                      onClick={() => handleOpenEtapaModal(null)}
                      className="flex items-center gap-1 bg-primary/10 hover:bg-primary/20 text-primary font-heading font-bold text-label-sm px-3.5 py-1.5 rounded-xl border border-primary/20 transition-all"
                    >
                      <HugeiconsIcon icon={AddCircleIcon} size={16} strokeWidth={2.5} />
                      Nova Etapa
                    </button>
                  )}
                </div>

                {!pi ? (
                  <div className="app-card-padded text-center text-slate-400 space-y-3">
                    <p className="text-body-md font-bold text-on-surface">Inicialize o Projeto Integrador.</p>
                    <p className="text-label-sm max-w-sm mx-auto">Preencha o formulário ao lado e salve, ou carregue o modelo padrão:</p>
                    {isMidiasDigitais && (
                      <button
                        type="button"
                        onClick={handleLoadMidiasPreset}
                        className="mx-auto py-2 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-violet-500/10"
                      >
                        ⚡ Inicializar com Modelo de Mídias Digitais
                      </button>
                    )}
                  </div>
                ) : etapas.length === 0 ? (
                  <div className="app-card-padded text-center text-slate-400 space-y-3">
                    <p className="text-body-md font-bold text-on-surface">Nenhuma etapa cadastrada.</p>
                    <p className="text-label-sm max-w-sm mx-auto">Crie prazos e entregas para os alunos clicando em "Nova Etapa", ou carregue o modelo do curso:</p>
                    {isMidiasDigitais && (
                      <button
                        type="button"
                        onClick={handleLoadMidiasPreset}
                        className="mx-auto py-2 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-violet-500/10"
                      >
                        ⚡ Carregar Modelo de Mídias Digitais
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {etapas.map((et, idx) => (
                      <div
                        key={et.id}
                        className="bg-white border border-slate-200 rounded-xl p-4 flex items-start justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Etapa {idx + 1}
                            </span>
                            <h4 className="font-bold text-on-surface text-body-md">{et.titulo}</h4>
                          </div>
                          {et.descricao && <p className="text-xs text-on-surface-variant line-clamp-2">{et.descricao}</p>}
                          <div className="flex items-center gap-4 text-xs text-on-surface-variant pt-1.5">
                            {et.prazo && (
                              <span className="flex items-center gap-1">
                                <HugeiconsIcon icon={Calendar01Icon} size={12} />
                                Prazo: {new Date(`${et.prazo}T12:00:00`).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <HugeiconsIcon icon={Clock01Icon} size={12} />
                              Peso: {et.peso}
                            </span>
                            <div className="flex items-center gap-1">
                              {et.aceita_arquivo && <span title="Aceita arquivo"><HugeiconsIcon icon={FileAttachmentIcon} size={12} /></span>}
                              {et.aceita_link && <span title="Aceita link"><HugeiconsIcon icon={LinkSquare01Icon} size={12} /></span>}
                              {et.aceita_texto && <span title="Aceita texto"><HugeiconsIcon icon={TextIcon} size={12} /></span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEtapaModal(et)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-primary transition-all"
                            title="Editar Etapa"
                          >
                            <HugeiconsIcon icon={Edit01Icon} size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteEtapa(et.id)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-error transition-all"
                            title="Excluir Etapa"
                          >
                            <HugeiconsIcon icon={Delete02Icon} size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GROUPS MANAGEMENT */}
          {activeTab === 'grupos' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <label className="text-label-sm font-bold text-on-surface shrink-0">Turma:</label>
                  <select
                    value={selectedTurmaId}
                    onChange={e => setSelectedTurmaId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-body-sm focus:outline-none focus:border-primary"
                  >
                    {turmas.map(t => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </div>

                {pi?.tipo === 'grupo' && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nome do novo grupo..."
                      value={newGrupoNome}
                      onChange={e => setNewGrupoNome(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-body-sm focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleCreateGroup}
                      disabled={!newGrupoNome.trim()}
                      className="px-4 py-2 bg-primary text-on-primary font-heading font-bold text-label-sm rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1"
                    >
                      <HugeiconsIcon icon={AddCircleIcon} size={15} strokeWidth={2.5} />
                      Criar Grupo
                    </button>
                  </div>
                )}
              </div>

              {!pi ? (
                <div className="app-card-padded text-center text-slate-400">
                  <p className="text-body-md font-bold text-on-surface">Inicialize o Projeto Integrador primeiro.</p>
                </div>
              ) : pi.tipo === 'individual' ? (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-6 flex items-start gap-3">
                  <HugeiconsIcon icon={Alert01Icon} className="text-amber-600 shrink-0 mt-0.5" size={20} strokeWidth={2} />
                  <div>
                    <h4 className="font-bold text-amber-800 dark:text-amber-400 text-body-md">Projeto Individual</h4>
                    <p className="text-body-sm text-amber-700 dark:text-amber-500 mt-1">
                      Este Projeto Integrador foi configurado no modo <strong>Individual</strong>. Alunos submetem suas entregas diretamente, sem necessidade de formação de grupos.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Groups List */}
                  <div className="lg:col-span-1 space-y-3">
                    <h3 className="font-heading font-extrabold text-body-md text-on-surface px-1">Grupos Existentes</h3>
                    {grupos.length === 0 ? (
                      <p className="text-xs text-slate-400 px-1">Nenhum grupo criado para esta turma.</p>
                    ) : (
                      <div className="space-y-2">
                        {grupos.map(g => (
                          <div
                            key={g.id}
                            onClick={() => {
                              setSelectedGrupo(g);
                              fetchGroupMembers(g.id);
                            }}
                            className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                              selectedGrupo?.id === g.id
                                ? 'bg-primary/5 border-primary shadow-sm'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div>
                              <h4 className="font-bold text-on-surface text-body-sm">{g.nome}</h4>
                              <p className="text-xs text-on-surface-variant mt-0.5">
                                {g.membros_count} membros
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteGroup(g.id);
                              }}
                              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-error transition-all"
                            >
                              <HugeiconsIcon icon={Delete02Icon} size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Group Members Detail Panel */}
                  <div className="lg:col-span-2 space-y-4">
                    {selectedGrupo ? (
                      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                          <div>
                            <h3 className="font-heading font-extrabold text-body-lg text-on-surface">{selectedGrupo.nome}</h3>
                            <p className="text-xs text-slate-400">Gerencie a composição e o líder do grupo</p>
                          </div>
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                            Membros: {membrosGrupo.length} / {pi.tamanho_max_grupo}
                          </span>
                        </div>

                        {/* Current Members List */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Integrantes</h4>
                          {membrosGrupo.length === 0 ? (
                            <p className="text-xs text-slate-400">Nenhum integrante no grupo ainda.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {membrosGrupo.map(m => (
                                <div key={m.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-xl">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {m.profiles?.avatar_url ? (
                                      <img src={m.profiles.avatar_url} className="w-6 h-6 rounded-full shrink-0" alt="" />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-slate-200 shrink-0" />
                                    )}
                                    <span className="text-body-sm font-semibold text-on-surface truncate">{m.profiles?.nome || 'Aluno'}</span>
                                    {m.lider && (
                                      <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200/50 px-1.5 py-0.2 rounded shrink-0">Líder</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleToggleLeader(m)}
                                      className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-amber-500 transition-all"
                                      title={m.lider ? "Remover cargo de Líder" : "Tornar Líder"}
                                    >
                                      ★
                                    </button>
                                    <button
                                      onClick={() => handleRemoveMember(m.id)}
                                      className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-error transition-all"
                                      title="Remover do Grupo"
                                    >
                                      <HugeiconsIcon icon={Cancel01Icon} size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Add Members Area */}
                        {membrosGrupo.length < pi.tamanho_max_grupo && (
                          <div className="space-y-2 pt-2">
                            <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Adicionar Alunos da Turma</h4>
                            {alunosSemGrupo.length === 0 ? (
                              <p className="text-xs text-slate-400">Todos os alunos desta turma já estão alocados em algum grupo.</p>
                            ) : (
                              <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                                {alunosSemGrupo.map(a => (
                                  <div key={a.id} className="p-2.5 flex items-center justify-between text-body-sm">
                                    <span className="font-semibold text-on-surface">{a.nome}</span>
                                    <button
                                      onClick={() => handleAddMember(a.id)}
                                      className="flex items-center gap-0.5 text-xs text-primary font-bold hover:underline"
                                    >
                                      <HugeiconsIcon icon={AddCircleIcon} size={14} />
                                      Adicionar
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Ficha da Marca do Grupo */}
                        {isMidiasDigitais && (
                          <div className="space-y-2 pt-3 border-t border-slate-100">
                            <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Ficha da Marca do Grupo</h4>
                            {renderMarcaDetailsSection(selectedMarcaDetalhes)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="app-card-padded text-center text-slate-400">
                        <p className="text-body-md font-bold text-on-surface">Nenhum grupo selecionado.</p>
                        <p className="text-label-sm">Clique em um dos grupos da lista lateral para ver os integrantes e adicionar membros.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EVALUATIONS */}
          {activeTab === 'avaliacoes' && (
            <div className="space-y-6">
              {/* Header com Toggle Visão Geral vs Correção Focada */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-heading font-black text-title-sm text-on-surface">Central de Avaliações</h3>
                  <p className="text-xs text-on-surface-variant">Acompanhe o progresso de entregas de todas as turmas em tempo real.</p>
                </div>

                <div className="flex bg-slate-100 dark:bg-white/5 rounded-xl p-1 gap-1 border border-slate-200/50 dark:border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMatrix(true);
                      fetchMatrixData();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      showMatrix
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span>📊 Visão Geral (Matriz)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMatrix(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      !showMatrix
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span>🎯 Fila de Correção</span>
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 dark:bg-white/5 border border-outline-variant/30 rounded-2xl p-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest block">Pendentes (Total)</span>
                  <div className="text-xl font-heading font-black text-amber-500 flex items-center gap-1.5">
                    <span>⚠️ {matrixData.reduce((acc, row) => acc + row.etapas.reduce((etAcc: number, et: any) => etAcc + et.pending, 0), 0)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest block">Taxa de Entrega</span>
                  <div className="text-xl font-heading font-black text-blue-600 dark:text-blue-400">
                    {(() => {
                      const totalExpected = unifiedDeliveries.length;
                      const totalReceived = unifiedDeliveries.filter(d => d.submission).length;
                      return totalExpected > 0 ? `${Math.round((totalReceived / totalExpected) * 100)}%` : '0%';
                    })()}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest block">Média Geral (Etapa)</span>
                  <div className="text-xl font-heading font-black text-primary">
                    {(() => {
                      const graded = unifiedDeliveries.filter(d => d.submission && d.submission.nota !== null);
                      if (graded.length === 0) return '-';
                      const avg = graded.reduce((acc, d) => acc + d.submission.nota, 0) / graded.length;
                      return avg.toFixed(1);
                    })()}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-white/20 uppercase tracking-widest block">Aproveitamento</span>
                  <div className="text-xl font-heading font-black text-green-600 dark:text-green-400">
                    {(() => {
                      const totalExpected = unifiedDeliveries.length;
                      const totalGraded = unifiedDeliveries.filter(d => d.submission && d.submission.nota !== null).length;
                      return totalExpected > 0 ? `${totalGraded}/${totalExpected} avaliados` : '0/0';
                    })()}
                  </div>
                </div>
              </div>

              {/* Visão Geral (Matriz de Entregas) */}
              {showMatrix ? (
                loadingMatrix ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white dark:bg-[#0f0f13] border border-outline-variant/30 rounded-2xl">
                    <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <p className="text-xs text-on-surface-variant font-medium">Carregando matriz de entregas...</p>
                  </div>
                ) : matrixData.length === 0 ? (
                  <div className="bg-white dark:bg-[#0f0f13] border border-outline-variant/30 rounded-2xl p-8 text-center text-slate-400">
                    Nenhuma turma ou etapa cadastrada para exibir na matriz.
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#0f0f13] border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-outline-variant/20 bg-surface-container-low flex justify-between items-center">
                      <span className="text-xs font-bold text-on-surface">Resumo de Entregas por Turma e Etapa</span>
                      <div className="flex gap-4 text-[10px] font-bold text-on-surface-variant">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500" /> Pendentes</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-600" /> Concluídas</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-200 dark:bg-white/10" /> Sem entrega</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-outline-variant/30 bg-surface-container-lowest">
                            <th className="p-3.5 font-bold text-on-surface border-r border-outline-variant/20 min-w-[150px]">Turma</th>
                            {etapas.map((et, idx) => (
                              <th key={et.id} className="p-3.5 font-bold text-on-surface text-center min-w-[120px]">
                                <div className="truncate" title={et.titulo}>Etapa {idx + 1}</div>
                                <div className="text-[10px] text-on-surface-variant font-medium truncate mt-0.5" title={et.titulo}>{et.titulo}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/20">
                          {matrixData.map(row => (
                            <tr key={row.turmaId} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all">
                              <td className="p-3.5 font-bold text-on-surface border-r border-outline-variant/20">
                                <div>{row.turmaNome}</div>
                                <div className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                                  {row.expectedCount} {pi?.tipo === 'grupo' ? 'Grupos' : 'Alunos'}
                                </div>
                              </td>
                              {row.etapas.map((etCol: any) => {
                                const hasPending = etCol.pending > 0;

                                return (
                                  <td
                                    key={etCol.etapaId}
                                    onClick={() => {
                                      setSelectedTurmaId(row.turmaId);
                                      setSelectedEtapaId(etCol.etapaId);
                                      setShowMatrix(false);
                                    }}
                                    className="p-3 text-center cursor-pointer hover:bg-primary/5 transition-all"
                                  >
                                    <div className="flex flex-col items-center justify-center gap-1.5">
                                      <div className="text-body-xs font-black text-on-surface">
                                        {etCol.received}/{row.expectedCount} entregas
                                      </div>
                                      {hasPending ? (
                                        <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                          ⚠️ {etCol.pending} pendentes
                                        </span>
                                      ) : etCol.received > 0 && etCol.evaluated === etCol.received ? (
                                        <span className="bg-green-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                          ✅ Concluído
                                        </span>
                                      ) : etCol.expected === 0 ? (
                                        <span className="text-slate-400 dark:text-white/20">-</span>
                                      ) : (
                                        <span className="bg-slate-100 dark:bg-white/5 text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded-full">
                                          Nenhuma
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              ) : (
                <>
                  {/* Select filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-[#0f0f13] border border-slate-200/80 dark:border-white/5 rounded-2xl p-4">
                    <div className="flex items-center gap-2">
                      <label className="text-label-sm font-bold text-on-surface shrink-0">Turma:</label>
                      <select
                        value={selectedTurmaId}
                        onChange={e => setSelectedTurmaId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-body-sm focus:outline-none focus:border-primary text-on-surface"
                      >
                        {turmas.map(t => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-label-sm font-bold text-on-surface shrink-0">Etapa:</label>
                      <select
                        value={selectedEtapaId}
                        onChange={e => setSelectedEtapaId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-body-sm focus:outline-none focus:border-primary text-on-surface"
                      >
                        {etapas.map(et => (
                          <option key={et.id} value={et.id}>{et.titulo}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {!selectedEtapaId ? (
                    <div className="app-card-padded text-center text-slate-400">
                      <p className="text-body-md font-bold text-on-surface">Adicione etapas ao Projeto Integrador primeiro.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Submissions/Teams List */}
                      <div className="lg:col-span-1 space-y-3">
                        <h3 className="font-heading font-extrabold text-body-md text-on-surface px-1">Integrantes / Equipes</h3>
                        {unifiedDeliveries.length === 0 ? (
                          <p className="text-xs text-slate-400 px-1">Nenhum grupo ou aluno encontrado para esta turma.</p>
                        ) : (
                          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                            {unifiedDeliveries.map(d => {
                              const hasSub = !!d.submission;
                              const status = d.status;

                              let statusLabel = 'Não Entregue';
                              let statusColor = 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/20 border-red-100 dark:border-red-950/30';

                              if (status === 'avaliada') {
                                statusLabel = 'Avaliado';
                                statusColor = 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/20 border-green-100 dark:border-green-950/30';
                              } else if (status === 'revisao') {
                                statusLabel = 'Em Revisão';
                                statusColor = 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/20 border-orange-100 dark:border-orange-950/30';
                              } else if (status === 'enviada' || status === 'pendente') {
                                statusLabel = 'Pendente';
                                statusColor = 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20 border-amber-100 dark:border-amber-950/30 animate-pulse';
                              }

                              const isSelected = selectedSubmissao?.id === d.submission?.id || (selectedSubmissao?.id === 'missing-' + d.id);

                              return (
                                <div
                                  key={d.id}
                                  onClick={() => {
                                    if (!pi) return;
                                    if (hasSub) {
                                      handleOpenEvaluation(d.submission);
                                    } else {
                                      setSelectedSubmissao({
                                        id: 'missing-' + d.id,
                                        entrega_def_id: selectedEtapaId,
                                        aluno_id: pi.tipo === 'individual' ? d.id : null,
                                        grupo_id: pi.tipo === 'grupo' ? d.id : null,
                                        descricao: null,
                                        arquivo_url: null,
                                        link_url: null,
                                        nota: null,
                                        feedback_professor: null,
                                        status: 'missing',
                                        xp_concedido: false,
                                        updated_at: new Date().toISOString(),
                                        aluno_nome: pi.tipo === 'individual' ? d.name : undefined,
                                        grupo_nome: pi.tipo === 'grupo' ? d.name : undefined,
                                      } as any);
                                      setSelectedMarcaDetalhes(null);
                                      if (pi) {
                                        fetchSelectedMarcaDetails(pi.id, {
                                          alunoId: pi.tipo === 'individual' ? d.id : null,
                                          grupoId: pi.tipo === 'grupo' ? d.id : null
                                        });
                                      }
                                    }
                                  }}
                                  className={`p-3.5 border rounded-xl cursor-pointer transition-all flex flex-col gap-1.5 ${
                                    isSelected
                                      ? 'bg-primary/5 border-primary shadow-sm'
                                      : 'bg-white dark:bg-[#0f0f13] border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
                                  }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-on-surface text-body-sm truncate pr-2">
                                      {d.name}
                                    </h4>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 uppercase tracking-wider ${statusColor}`}>
                                      {statusLabel}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs text-on-surface-variant">
                                    <span>
                                      {hasSub
                                        ? `Entregue: ${new Date(d.submission.updated_at).toLocaleDateString('pt-BR')}`
                                        : 'Aguardando envio'}
                                    </span>
                                    {d.nota !== null && (
                                      <span className="font-extrabold text-primary">Nota: {d.nota}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Evaluation detail panel */}
                      <div className="lg:col-span-2 space-y-4">
                        {selectedSubmissao ? (
                          selectedSubmissao.status === 'missing' ? (
                            <div className="bg-white dark:bg-[#0f0f13] border border-slate-200 dark:border-white/5 rounded-2xl p-5 space-y-4">
                              <div className="pb-2 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                                <div>
                                  <h3 className="font-heading font-extrabold text-body-lg text-on-surface">
                                    {pi?.tipo === 'grupo' ? selectedSubmissao.grupo_nome : selectedSubmissao.aluno_nome}
                                  </h3>
                                  <p className="text-xs text-slate-400">Esta entrega ainda não foi enviada.</p>
                                </div>
                                <span className="text-[10px] font-black px-2.5 py-1 rounded-full border bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30 uppercase tracking-widest">
                                  Não Entregue
                                </span>
                              </div>
                              <div className="bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl p-4 text-center text-xs text-slate-400">
                                Aguardando envio da primeira versão pelo aluno ou grupo.
                              </div>

                              {/* Ficha da Marca do Aluno/Grupo */}
                              {isMidiasDigitais && (
                                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/5">
                                  <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Ficha da Marca da Equipe</h4>
                                  {renderMarcaDetailsSection(selectedMarcaDetalhes)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-white dark:bg-[#0f0f13] border border-slate-200 dark:border-white/5 rounded-2xl p-5 space-y-4">
                              <div className="pb-2 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                                <div>
                                  <h3 className="font-heading font-extrabold text-body-lg text-on-surface">
                                    {pi?.tipo === 'grupo' ? selectedSubmissao.grupo_nome : selectedSubmissao.aluno_nome}
                                  </h3>
                                  <p className="text-xs text-slate-400">Visualizar entrega e aplicar notas</p>
                                </div>
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest ${
                                  selectedSubmissao.status === 'avaliada'
                                    ? 'text-green-600 bg-green-50 border-green-100 dark:text-green-400 dark:bg-green-950/20 dark:border-green-900/30'
                                    : selectedSubmissao.status === 'revisao'
                                    ? 'text-orange-600 bg-orange-50 border-orange-100 dark:text-orange-400 dark:bg-orange-950/20 dark:border-orange-900/30'
                                    : 'text-blue-600 bg-blue-50 border-blue-100 dark:text-blue-400 dark:bg-blue-950/20 dark:border-blue-900/30'
                                }`}>
                                  {selectedSubmissao.status === 'avaliada' ? 'Avaliado' : selectedSubmissao.status === 'revisao' ? 'Em Revisão' : 'Pendente'}
                                </span>
                              </div>

                              {/* Submission Contents */}
                              <div className="space-y-3 bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 rounded-xl p-4">
                                {selectedSubmissao.descricao && (
                                  <div>
                                    <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Descrição / Resposta</h4>
                                    <p className="text-body-sm text-on-surface leading-relaxed whitespace-pre-wrap">{selectedSubmissao.descricao}</p>
                                  </div>
                                )}

                                {selectedSubmissao.link_url && (
                                  <div>
                                    <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Link do Projeto</h4>
                                    <a
                                      href={selectedSubmissao.link_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-body-sm text-primary font-bold hover:underline"
                                    >
                                      <HugeiconsIcon icon={LinkSquare01Icon} size={15} />
                                      {selectedSubmissao.link_url}
                                    </a>
                                  </div>
                                )}

                                {selectedSubmissao.arquivo_url && (
                                  <div>
                                    <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Arquivo Anexo</h4>
                                    <a
                                      href={selectedSubmissao.arquivo_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-body-sm text-primary font-bold hover:underline"
                                    >
                                      <HugeiconsIcon icon={FileAttachmentIcon} size={15} />
                                      Baixar / Visualizar Arquivo
                                    </a>
                                  </div>
                                )}
                              </div>

                              {/* Ficha da Marca do Aluno/Grupo */}
                              {isMidiasDigitais && (
                                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-white/5">
                                  <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Ficha da Marca da Equipe</h4>
                                  {renderMarcaDetailsSection(selectedMarcaDetalhes)}
                                </div>
                              )}

                              {/* Evaluation Form */}
                              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
                                <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Avaliação do Professor</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-label-sm font-semibold text-on-surface-variant mb-1">Nota (0 a 10)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="10"
                                      step="0.1"
                                      placeholder="8.5"
                                      value={evaluationForm.nota}
                                      onChange={e => setEvaluationForm({ ...evaluationForm, nota: e.target.value })}
                                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-body-sm focus:outline-none focus:border-primary text-on-surface"
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="block text-label-sm font-semibold text-on-surface-variant mb-1">Situação / Status</label>
                                    <select
                                      value={evaluationForm.status}
                                      onChange={e => setEvaluationForm({ ...evaluationForm, status: e.target.value as 'avaliada' | 'revisao' })}
                                      className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-body-sm focus:outline-none focus:border-primary text-on-surface"
                                    >
                                      <option value="avaliada">Avaliada (Concluir e liberar XP se média atingida)</option>
                                      <option value="revisao">Solicitar Correções (Em Revisão)</option>
                                    </select>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-label-sm font-semibold text-on-surface-variant mb-1">Feedback para o Aluno</label>
                                  <textarea
                                    rows={3}
                                    placeholder="Excelente trabalho, o escopo foi muito bem desenhado..."
                                    value={evaluationForm.feedback_professor}
                                    onChange={e => setEvaluationForm({ ...evaluationForm, feedback_professor: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-transparent px-3 py-2 text-body-sm focus:outline-none focus:border-primary resize-none text-on-surface"
                                  />
                                </div>

                                <div className="flex gap-3 pt-2">
                                  <button
                                    onClick={() => setSelectedSubmissao(null)}
                                    className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-body-sm font-semibold text-on-surface-variant hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={handleSaveEvaluation}
                                    disabled={saving}
                                    className="flex-1 py-2 bg-primary text-on-primary text-body-sm font-bold rounded-xl hover:opacity-90 transition-all"
                                  >
                                    Salvar Nota & Feedback
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="bg-white dark:bg-[#0f0f13] border border-slate-200 dark:border-white/5 rounded-2xl p-6 text-center text-slate-400">
                            <p className="text-body-md font-bold text-on-surface">Nenhuma entrega selecionada.</p>
                            <p className="text-label-sm mt-1">Selecione uma das entregas na lista lateral para iniciar a correção das entregas da Etapa.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* MILESTONE / ETAPA MODAL */}
      {showEtapaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-heading font-bold text-title-sm text-on-surface">
                {editingEtapa ? 'Editar Etapa' : 'Nova Etapa do PI'}
              </h2>
              <button onClick={() => setShowEtapaModal(false)} className="text-slate-400 hover:text-slate-600">
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-label-sm font-semibold text-on-surface-variant mb-1">Título da Etapa</label>
                <input
                  type="text"
                  value={etapaForm.titulo}
                  onChange={e => setEtapaForm({ ...etapaForm, titulo: e.target.value })}
                  placeholder="Ex: Entrega 1 - Protótipo e Wireframes"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-body-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-label-sm font-semibold text-on-surface-variant mb-1">Instruções / Descrição</label>
                <textarea
                  value={etapaForm.descricao}
                  onChange={e => setEtapaForm({ ...etapaForm, descricao: e.target.value })}
                  placeholder="Descreva o que o aluno ou grupo deve enviar nesta etapa..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-body-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-label-sm font-semibold text-on-surface-variant mb-1">Prazo de Entrega</label>
                  <input
                    type="date"
                    value={etapaForm.prazo}
                    onChange={e => setEtapaForm({ ...etapaForm, prazo: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-body-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-label-sm font-semibold text-on-surface-variant mb-1">Peso</label>
                  <input
                    type="number"
                    step="0.1"
                    value={etapaForm.peso}
                    onChange={e => setEtapaForm({ ...etapaForm, peso: parseFloat(e.target.value) || 1.0 })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-body-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-label-sm font-semibold text-on-surface-variant">Formatos de Entrega Aceitos</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={etapaForm.aceita_arquivo}
                      onChange={e => setEtapaForm({ ...etapaForm, aceita_arquivo: e.target.checked })}
                      className="rounded border-slate-300 text-primary"
                    />
                    <span className="text-body-sm">Arquivo Anexo</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={etapaForm.aceita_link}
                      onChange={e => setEtapaForm({ ...etapaForm, aceita_link: e.target.checked })}
                      className="rounded border-slate-300 text-primary"
                    />
                    <span className="text-body-sm">Link Externo</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={etapaForm.aceita_texto}
                      onChange={e => setEtapaForm({ ...etapaForm, aceita_texto: e.target.checked })}
                      className="rounded border-slate-300 text-primary"
                    />
                    <span className="text-body-sm">Texto/Resposta</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowEtapaModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-body-sm font-semibold text-on-surface-variant hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEtapa}
                disabled={saving || !etapaForm.titulo.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-body-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                Salvar Etapa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
