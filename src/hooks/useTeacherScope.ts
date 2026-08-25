import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface ProfessorProfile {
  id: string;
  nome: string | null;
  email: string | null;
  role: 'student' | 'teacher' | 'admin';
  avatar_url?: string | null;
  total_turmas?: number;
  total_alunos?: number;
}

export interface ScopeTurma {
  id: string;
  nome: string;
  codigo_acesso: string;
  curso_id?: string | null;
  status?: string;
  professor_id?: string | null;
  professor_nome?: string | null;
  curso_titulo?: string | null;
  total_alunos?: number;
  created_at?: string;
  finalizada_em?: string | null;
  observacoes_finais?: string | null;
}

export function useTeacherScope(sessionUserId?: string | null) {
  const [role, setRole] = useState<'student' | 'teacher' | 'admin' | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [myTurmas, setMyTurmas] = useState<ScopeTurma[]>([]);
  const [allTurmas, setAllTurmas] = useState<ScopeTurma[]>([]);
  const [professores, setProfessores] = useState<ProfessorProfile[]>([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string | 'all'>('all');
  const [loading, setLoading] = useState(true);

  const fetchScopeData = useCallback(async () => {
    if (!sessionUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Fetch current profile
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, nome, email, role, avatar_url')
        .eq('id', sessionUserId)
        .single();

      if (profileErr) throw profileErr;

      const userRole = (profile?.role as 'student' | 'teacher' | 'admin') || 'student';
      setRole(userRole);
      const isAdmin = userRole === 'admin';
      setIsSuperAdmin(isAdmin);

      // 2. Fetch all professors (for assignment and admin view)
      const { data: profsData, error: profsErr } = await supabase
        .from('profiles')
        .select('id, nome, email, role, avatar_url')
        .in('role', ['teacher', 'admin'])
        .order('nome', { ascending: true });

      if (!profsErr && profsData) {
        setProfessores(profsData);
      }

      // 3. Fetch courses to resolve titles
      const { data: coursesData } = await supabase
        .from('cursos')
        .select('id, titulo');

      const courseMap = new Map((coursesData || []).map(c => [c.id, c.titulo]));

      // 4. Fetch co-teaching links for current user
      const { data: coTeachingData } = await supabase
        .from('turma_professores')
        .select('turma_id')
        .eq('professor_id', sessionUserId);

      const coTeachingTurmaIds = new Set((coTeachingData || []).map(cp => cp.turma_id));

      // 5. Fetch turmas
      const { data: turmasData, error: turmasErr } = await supabase
        .from('turmas')
        .select('*')
        .order('created_at', { ascending: false });

      if (turmasErr) throw turmasErr;

      // 6. Fetch students counts
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('turma_id')
        .eq('role', 'student');

      const studentCountMap = new Map<string, number>();
      (studentsData || []).forEach(s => {
        if (s.turma_id) {
          studentCountMap.set(s.turma_id, (studentCountMap.get(s.turma_id) || 0) + 1);
        }
      });

      const profMap = new Map((profsData || []).map(p => [p.id, p.nome || p.email || 'Sem Nome']));

      const formattedTurmas: ScopeTurma[] = (turmasData || []).map(t => ({
        ...t,
        curso_titulo: t.curso_id ? (courseMap.get(t.curso_id) || 'Sem Curso') : 'Sem Curso',
        professor_nome: t.professor_id ? (profMap.get(t.professor_id) || 'Não atribuído') : 'Não atribuído',
        total_alunos: studentCountMap.get(t.id) || 0
      }));

      setAllTurmas(formattedTurmas);

      // Filter teacher-specific classes
      const filteredForTeacher = formattedTurmas.filter(t => 
        t.professor_id === sessionUserId || coTeachingTurmaIds.has(t.id)
      );

      setMyTurmas(isAdmin ? formattedTurmas : filteredForTeacher);

    } catch (err) {
      console.error('Erro ao carregar escopo do professor:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionUserId]);

  useEffect(() => {
    fetchScopeData();
  }, [fetchScopeData]);

  // Derived turma IDs that the teacher is responsible for
  const activeTurmaIds = (isSuperAdmin ? allTurmas : myTurmas).map(t => t.id);

  return {
    role,
    isSuperAdmin,
    isTeacher: role === 'teacher' || role === 'admin',
    myTurmas,
    allTurmas,
    activeTurmas: isSuperAdmin ? allTurmas : myTurmas,
    activeTurmaIds,
    professores,
    selectedTurmaId,
    setSelectedTurmaId,
    loading,
    refreshScope: fetchScopeData
  };
}
