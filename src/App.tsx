import { useState, useEffect, type CSSProperties } from 'react';
import type { Session } from '@supabase/supabase-js';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  BookOpen01Icon,
  Settings01Icon,
  SchoolIcon,
  SparklesIcon,
  CheckmarkCircle02Icon,
  DashboardSquare01Icon,
  Logout01Icon,
  Menu01Icon,
  Cancel01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Notification01Icon,
  UserCircleIcon,
  Award01Icon,
  Trophy,
  UserGroupIcon,
  Calendar01Icon,
  Task01Icon,
  KeyboardIcon
} from '@hugeicons/core-free-icons';
import { TreinadorDigitacao } from './pages/TreinadorDigitacao';
import { ListaAlunos } from './pages/ListaAlunos';
import { CentralAcompanhamento } from './pages/CentralAcompanhamento';
import { DiarioClasse } from './pages/DiarioClasse';
import { DashboardProfessor } from './pages/DashboardProfessor';

import { supabase } from './lib/supabaseClient';
import { usePendingCorrections } from './hooks/usePendingCorrections';
import { LoginAluno } from './pages/LoginAluno';
import { CadastroAluno } from './pages/CadastroAluno';
import { CourseBuilder } from './pages/CourseBuilder';
import { GerenciadorTurmas } from './pages/GerenciadorTurmas';
import { TrilhaAluno } from './pages/TrilhaAluno';
import { CentralCorrecoes } from './pages/CentralCorrecoes';
import { PerfilUsuario } from './pages/PerfilUsuario';
import { DashboardProfessorOverview } from './pages/DashboardProfessorOverview';
import { NotificationBell } from './components/common/NotificationBell';
import { MateriaisApoio } from './pages/MateriaisApoio';
import { ArenaRanking } from './pages/ArenaRanking';
import logoIcon from './assets/logo-compact.png';

type TeacherTab = 'overview' | 'progress' | 'corrections' | 'assignments' | 'turmas' | 'settings' | 'materials' | 'arena_ranking' | 'diario' | 'lessons';
type UserTab = 'dashboard' | 'achievements' | 'profile' | 'arena_ranking' | 'digitacao';

const getSidebarItemClass = (active: boolean, collapsed = false) =>
  `relative flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-label-md transition-all w-full text-left ${
    collapsed ? 'lg:justify-center lg:px-0' : ''
  } ${
    active
      ? 'bg-primary text-on-primary shadow-sm shadow-primary/15'
      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
  }`;

const sidebarActionClass =
  'w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-label-md font-heading font-bold transition-all';

const getSidebarLabelClass = (collapsed: boolean) => collapsed ? 'lg:hidden' : '';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [teacherView, setTeacherView] = useState<'content' | 'preview'>('content');
  const [activeUserTab, setActiveUserTab] = useState<UserTab>('dashboard');
  
  // Teacher panel navigation & metrics states
  const [activeTeacherTab, setActiveTeacherTab] = useState<TeacherTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string>('ativo');

  // Student list & tracking center states
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [initialTrackingSection, setInitialTrackingSection] = useState<'chat' | 'ficha'>('ficha');


  const isAdmin = session?.user?.user_metadata?.role === 'admin';
  const shellStyle = {
    '--sidebar-width': sidebarCollapsed ? '80px' : '280px',
  } as CSSProperties;

  // Hook centralizado — elimina query duplicada que existia em 3 lugares
  const { count: pendingCorrectionsCount } = usePendingCorrections(!!session && isAdmin);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', userId)
        .single();
      if (error) throw error;
      if (data) {
        setProfileStatus(data.status || 'ativo');
      }
    } catch (err) {
      console.error('Erro ao buscar status do perfil:', err);
    }
  };

  // Track session status on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setProfileStatus('ativo');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Dynamic page title — teacher panel
  useEffect(() => {
    if (!session || !isAdmin || teacherView !== 'content') return;
    const titles: Record<string, string> = {
      overview: 'Visão Geral | Estudea',
      progress: 'Alunos | Estudea',
      corrections: 'Central de Correções | Estudea',
      assignments: 'Criador de Cursos | Estudea',
      turmas: 'Gerenciar Turmas | Estudea',
      settings: 'Minha Conta | Estudea',
      arena_ranking: 'Ranking da Arena | Estudea',
      diario: 'Diário de Classe | Estudea',
      lessons: 'Liberação de Aulas | Estudea',
    };
    document.title = titles[activeTeacherTab] ?? 'Estudea';
  }, [activeTeacherTab, session, isAdmin, teacherView]);

  // Dynamic page title — student portal
  useEffect(() => {
    if (!session || (isAdmin && teacherView === 'content')) return;
    const titles: Record<string, string> = {
      dashboard: 'Minhas Aulas | Estudea',
      achievements: 'Minhas Conquistas | Estudea',
      profile: 'Meu Perfil | Estudea',
      arena_ranking: 'Ranking da Arena | Estudea',
    };
    document.title = titles[activeUserTab] ?? 'Estudea';
  }, [activeUserTab, session, isAdmin, teacherView]);

  // Reset title on logout
  useEffect(() => {
    if (!session) document.title = 'Estudea';
  }, [session]);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfileStatus('ativo');
  };

  // If teacher is logged in and viewing content dashboard, show full-screen admin layout with sidebar
  if (session && isAdmin && teacherView === 'content') {
    return (
      <div className="min-h-screen w-full bg-background text-on-background flex font-sans overflow-hidden" style={shellStyle}>
        {/* Sidebar Nav */}
        <nav className={`fixed inset-y-0 left-0 z-50 w-[280px] ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-[280px]'} bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col justify-between transform transition-[width,transform] duration-300 lg:translate-x-0 lg:static ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div>
            <div className={`px-5 py-6 flex items-center gap-3 justify-between ${sidebarCollapsed ? 'lg:flex-col lg:justify-center lg:px-3' : ''}`}>
              <div className="flex items-center gap-3">
                <img src={logoIcon} alt="Estudea Logo" className="w-9 h-9 rounded-xl object-contain shrink-0 shadow-sm" />
                <div className={getSidebarLabelClass(sidebarCollapsed)}>
                  <h1 className="font-heading font-extrabold text-body-lg text-on-surface leading-none">Painel do Professor</h1>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Gerenciar Cursos</p>
                </div>
              </div>
              <button
                className="hidden lg:inline-flex app-icon-button"
                onClick={() => setSidebarCollapsed((value) => !value)}
                title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
              >
                <HugeiconsIcon icon={sidebarCollapsed ? ArrowRight01Icon : ArrowLeft01Icon} size={18} strokeWidth={2} />
              </button>
              <button className="lg:hidden text-outline-variant hover:text-on-surface" onClick={() => setMobileMenuOpen(false)}>
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            
            <div className={`flex flex-col gap-1.5 px-4 ${sidebarCollapsed ? 'lg:px-3' : ''}`}>
              <button
                onClick={() => { setActiveTeacherTab('overview'); setMobileMenuOpen(false); }}
                className={getSidebarItemClass(activeTeacherTab === 'overview', sidebarCollapsed)}
                title="Visão Geral"
              >
                <HugeiconsIcon icon={DashboardSquare01Icon} size={20} strokeWidth={2} />
                <span className={getSidebarLabelClass(sidebarCollapsed)}>Visão Geral</span>
              </button>

              <button
                onClick={() => {
                  setActiveTeacherTab('progress');
                  setSelectedStudentId(null);
                  setMobileMenuOpen(false);
                }}
                className={getSidebarItemClass(activeTeacherTab === 'progress', sidebarCollapsed)}
                title="Alunos"
              >
                <HugeiconsIcon icon={UserGroupIcon} size={20} strokeWidth={2} />
                <span className={getSidebarLabelClass(sidebarCollapsed)}>Alunos</span>
              </button>

              <button
                onClick={() => {
                  setActiveTeacherTab('diario');
                  setMobileMenuOpen(false);
                }}
                className={getSidebarItemClass(activeTeacherTab === 'diario', sidebarCollapsed)}
                title="Diário de Classe"
              >
                <HugeiconsIcon icon={Calendar01Icon} size={20} strokeWidth={2} />
                <span className={getSidebarLabelClass(sidebarCollapsed)}>Diário de Classe</span>
              </button>

              <button
                onClick={() => {
                  setActiveTeacherTab('lessons');
                  setMobileMenuOpen(false);
                }}
                className={getSidebarItemClass(activeTeacherTab === 'lessons', sidebarCollapsed)}
                title="Liberação de Aulas"
              >
                <HugeiconsIcon icon={Task01Icon} size={20} strokeWidth={2} />
                <span className={getSidebarLabelClass(sidebarCollapsed)}>Liberação de Aulas</span>
              </button>

              <button
                onClick={() => { setActiveTeacherTab('corrections'); setMobileMenuOpen(false); }}
                className={getSidebarItemClass(activeTeacherTab === 'corrections', sidebarCollapsed)}
                title="Central de Correções"
              >
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} strokeWidth={2} />
                <span className={getSidebarLabelClass(sidebarCollapsed)}>Central de Correções</span>
                {pendingCorrectionsCount > 0 && (
                  <span className={`ml-auto bg-error text-on-error font-label-sm text-[11px] px-2 py-0.5 rounded-full ${sidebarCollapsed ? 'lg:absolute lg:right-1 lg:top-1 lg:ml-0 lg:px-1.5' : ''}`}>
                    {pendingCorrectionsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => { setActiveTeacherTab('assignments'); setMobileMenuOpen(false); }}
                className={getSidebarItemClass(activeTeacherTab === 'assignments', sidebarCollapsed)}
                title="Criador de Cursos"
              >
                <HugeiconsIcon icon={BookOpen01Icon} size={20} strokeWidth={2} />
                <span className={getSidebarLabelClass(sidebarCollapsed)}>Criador de Cursos</span>
              </button>

              <button
                onClick={() => { setActiveTeacherTab('turmas'); setMobileMenuOpen(false); }}
                className={getSidebarItemClass(activeTeacherTab === 'turmas', sidebarCollapsed)}
                title="Gerenciar Turmas"
              >
                <HugeiconsIcon icon={SchoolIcon} size={20} strokeWidth={2} />
                <span className={getSidebarLabelClass(sidebarCollapsed)}>Gerenciar Turmas</span>
              </button>

              <button
                onClick={() => { setActiveTeacherTab('materials'); setMobileMenuOpen(false); }}
                className={getSidebarItemClass(activeTeacherTab === 'materials', sidebarCollapsed)}
                title="Materiais de Apoio (IA)"
              >
                <HugeiconsIcon icon={SparklesIcon} size={20} strokeWidth={2} />
                <span className={getSidebarLabelClass(sidebarCollapsed)}>Materiais de Apoio (IA)</span>
              </button>

              <button
                onClick={() => { setActiveTeacherTab('arena_ranking'); setMobileMenuOpen(false); }}
                className={getSidebarItemClass(activeTeacherTab === 'arena_ranking', sidebarCollapsed)}
                title="Ranking da Arena"
              >
                <HugeiconsIcon icon={Award01Icon} size={20} strokeWidth={2} />
                <span className={getSidebarLabelClass(sidebarCollapsed)}>Ranking da Arena</span>
              </button>

              <div className={`my-4 border-t border-outline-variant/30 ${sidebarCollapsed ? 'lg:mx-1' : 'mx-4'}`}></div>

              <button
                onClick={() => { setActiveTeacherTab('settings'); setMobileMenuOpen(false); }}
                className={getSidebarItemClass(activeTeacherTab === 'settings', sidebarCollapsed)}
                title="Minha Conta / Perfil"
              >
                <HugeiconsIcon icon={Settings01Icon} size={20} strokeWidth={2} />
                <span className={getSidebarLabelClass(sidebarCollapsed)}>Minha Conta / Perfil</span>
              </button>
            </div>
          </div>

          <div className={`p-4 border-t border-outline-variant/30 bg-surface-container-lowest ${sidebarCollapsed ? 'lg:px-3' : ''}`}>
            <button
              onClick={() => { setTeacherView('preview'); setMobileMenuOpen(false); }}
              className={`${sidebarActionClass} ${sidebarCollapsed ? 'lg:px-0' : ''} border border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface mb-2`}
              title="Visualização do Aluno"
            >
              <HugeiconsIcon icon={SparklesIcon} size={18} strokeWidth={2} />
              <span className={getSidebarLabelClass(sidebarCollapsed)}>Visualização do Aluno</span>
            </button>
            
            <button
              onClick={handleLogout}
              className={`${sidebarActionClass} ${sidebarCollapsed ? 'lg:px-0' : ''} bg-error-container/20 border border-error/20 text-error hover:bg-error-container/40`}
              title="Sair"
            >
              <HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={2} />
              <span className={getSidebarLabelClass(sidebarCollapsed)}>Sair</span>
            </button>
          </div>
        </nav>

        {/* Overlay for mobile drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Main Canvas */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
          {/* Top Navbar */}
          <header className="px-4 sm:px-6 lg:px-8 py-4 border-b border-outline-variant/30 bg-surface-container-lowest flex justify-between items-center z-10 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-3">
              <button className="lg:hidden p-2 rounded-lg hover:bg-surface-container text-on-surface-variant" onClick={() => setMobileMenuOpen(true)}>
                <HugeiconsIcon icon={Menu01Icon} size={20} />
              </button>
              <div>
                <h3 className="font-heading font-extrabold text-body-lg text-on-surface">
                  Olá, {session.user.user_metadata?.nome || 'Professor'}!
                </h3>
                <p className="text-on-surface-variant text-label-sm">
                  {activeTeacherTab === 'overview' && 'Visão geral das estatísticas.'}
                  {activeTeacherTab === 'progress' && 'Acompanhe a lista de alunos e a central de monitoramento de risco.'}
                  {activeTeacherTab === 'diario' && 'Registre a frequência diária e observações da aula.'}
                  {activeTeacherTab === 'lessons' && 'Libere ou bloqueie lições por turma.'}
                  {activeTeacherTab === 'assignments' && 'Crie Cursos, gerencie módulos e organize lições.'}
                  {activeTeacherTab === 'turmas' && 'Gerencie turmas, códigos de acesso e enturmação de alunos.'}
                  {activeTeacherTab === 'corrections' && 'Avalie e dê feedbacks nas entregas dos alunos.'}
                  {activeTeacherTab === 'settings' && 'Configurações do painel administrativo.'}
                  {activeTeacherTab === 'materials' && 'Acesse prompts e materiais de apoio para acelerar a criação com IA.'}
                  {activeTeacherTab === 'arena_ranking' && 'Veja o ranking histórico das partidas da Arena Live.'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-2 transition-all relative"
                onClick={() => setActiveTeacherTab('corrections')}
                title="Correções pendentes"
              >
                <HugeiconsIcon icon={Notification01Icon} size={20} strokeWidth={2} />
                {pendingCorrectionsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-error text-on-error text-[10px] leading-5 font-bold text-center ring-2 ring-white">
                    {pendingCorrectionsCount > 9 ? '9+' : pendingCorrectionsCount}
                  </span>
                )}
              </button>

              {/* Help icon */}
              <button className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-2 transition-all">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>

              <div className="h-8 w-px bg-outline-variant/30 mx-1"></div>

              {/* Profile click item */}
              <div 
                onClick={() => { setActiveTeacherTab('settings'); }}
                className="flex items-center gap-3 cursor-pointer hover:bg-surface-container-low rounded-lg p-1.5 pr-3 transition-colors"
                title="Ver Meu Perfil"
              >
                <img 
                  alt="Teacher Avatar" 
                  className="w-9 h-9 rounded-full object-cover border border-outline-variant/20" 
                  src={session?.user?.user_metadata?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuCS79ZaYToIkfTUIGNaC8uyMcC4bxm5aJv5aZ9Zv_m3tBPV-52R11_d1OzmpzEcpIJffY_KQwgQt_ljUFRrfMn2mon_Kc4P5STZ5QatEcpjaH4S515M9Uqjw-RNRThsLstiIoTnzzvOc2tSJw405oVGl04HQnMV1NWh6Wfv7j2kMW8IWb3BTnVm0wKf1J3FZDAuPq1Ntdf176ZCeDpOWYXp4h_TFxRBA-EuzBz5-AOfPZpxCh6erw3KD9_yVeWMNTHo-ypFDJRGchA"}
                />
                <div className="hidden md:block text-left text-xs">
                  <p className="font-label-md text-label-md text-on-surface font-bold leading-tight">{session.user.user_metadata?.nome || 'Instrutor(a)'}</p>
                  <p className="font-label-sm text-label-sm text-primary font-medium leading-none mt-1">Meu Perfil</p>
                </div>
              </div>
            </div>
          </header>

          {/* Main workspace scrollable area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-[1280px] mx-auto w-full">
              {activeTeacherTab === 'progress' && (
                selectedStudentId ? (
                  <CentralAcompanhamento
                    alunoId={selectedStudentId}
                    initialTab={initialTrackingSection}
                    onBack={() => setSelectedStudentId(null)}
                    onChangeStudent={setSelectedStudentId}
                  />
                ) : (
                  <ListaAlunos
                    onSelectStudent={(id, section) => {
                      setSelectedStudentId(id);
                      setInitialTrackingSection(section || 'ficha');
                    }}
                  />
                )
              )}
              {activeTeacherTab === 'assignments' && <CourseBuilder />}
              {activeTeacherTab === 'turmas' && (
                <GerenciadorTurmas
                  onSelectStudent={(id, section) => {
                    setSelectedStudentId(id);
                    setInitialTrackingSection(section || 'ficha');
                    setActiveTeacherTab('progress');
                  }}
                />
              )}
              {activeTeacherTab === 'diario' && <DiarioClasse />}
              {activeTeacherTab === 'lessons' && <DashboardProfessor />}
              {activeTeacherTab === 'materials' && <MateriaisApoio />}
              {activeTeacherTab === 'arena_ranking' && <ArenaRanking session={session} isAdmin={true} />}
              
              {activeTeacherTab === 'overview' && (
                <DashboardProfessorOverview setActiveTab={setActiveTeacherTab} session={session} />
              )}

              {activeTeacherTab === 'corrections' && <CentralCorrecoes />}

              {activeTeacherTab === 'settings' && (
                <PerfilUsuario session={session} isAdmin={isAdmin} />
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (session && (!isAdmin || teacherView === 'preview')) {
    return (
      <div className="min-h-screen w-full bg-background text-on-background flex font-sans overflow-hidden" style={shellStyle}>
        {/* Sidebar Nav do Aluno */}
        <nav className={`fixed inset-y-0 left-0 z-50 w-[280px] ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-[280px]'} bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col justify-between transform transition-[width,transform] duration-300 lg:translate-x-0 lg:static ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div>
            <div className={`px-5 py-6 flex items-center gap-3 justify-between ${sidebarCollapsed ? 'lg:flex-col lg:justify-center lg:px-3' : ''}`}>
              <div className="flex items-center gap-3">
                <img src={logoIcon} alt="Estudea Logo" className="w-9 h-9 rounded-xl object-contain shrink-0 shadow-sm" />
                <div className={getSidebarLabelClass(sidebarCollapsed)}>
                  <h1 className="font-heading font-extrabold text-body-lg text-on-surface leading-none">Estudea</h1>
                  <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Portal do Aluno</p>
                </div>
              </div>
              <button
                className="hidden lg:inline-flex app-icon-button"
                onClick={() => setSidebarCollapsed((value) => !value)}
                title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
              >
                <HugeiconsIcon icon={sidebarCollapsed ? ArrowRight01Icon : ArrowLeft01Icon} size={18} strokeWidth={2} />
              </button>
              <button className="lg:hidden text-outline-variant hover:text-on-surface" onClick={() => setMobileMenuOpen(false)}>
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>
            
            <div className={`flex flex-col gap-1.5 px-4 ${sidebarCollapsed ? 'lg:px-3' : ''}`}>
              <button
                onClick={() => { setActiveUserTab('dashboard'); setMobileMenuOpen(false); }}
                className={getSidebarItemClass(activeUserTab === 'dashboard', sidebarCollapsed)}
                title="Minhas Aulas"
              >
                <HugeiconsIcon icon={BookOpen01Icon} size={20} strokeWidth={2} />
                <span className={getSidebarLabelClass(sidebarCollapsed)}>Minhas Aulas</span>
              </button>

              <button
                onClick={() => { setActiveUserTab('achievements'); setMobileMenuOpen(false); }}
                className={getSidebarItemClass(activeUserTab === 'achievements', sidebarCollapsed)}
                title="Minhas Conquistas"
              >
                <HugeiconsIcon icon={Award01Icon} size={20} strokeWidth={2} />
                <span className={getSidebarLabelClass(sidebarCollapsed)}>Minhas Conquistas</span>
              </button>

              <button
                onClick={() => { setActiveUserTab('arena_ranking'); setMobileMenuOpen(false); }}
                className={getSidebarItemClass(activeUserTab === 'arena_ranking', sidebarCollapsed)}
                title="Ranking da Arena"
              >
                <HugeiconsIcon icon={Trophy} size={20} strokeWidth={2} />
                <span className={getSidebarLabelClass(sidebarCollapsed)}>Ranking da Arena</span>
              </button>

              <button
                onClick={() => { setActiveUserTab('digitacao'); setMobileMenuOpen(false); }}
                className={getSidebarItemClass(activeUserTab === 'digitacao', sidebarCollapsed)}
                title="Treino de Digitação"
              >
                <HugeiconsIcon icon={KeyboardIcon} size={20} strokeWidth={2} />
                <span className={getSidebarLabelClass(sidebarCollapsed)}>Treino de Digitação</span>
              </button>

              <button
                onClick={() => { setActiveUserTab('profile'); setMobileMenuOpen(false); }}
                className={getSidebarItemClass(activeUserTab === 'profile', sidebarCollapsed)}
                title="Meu Perfil"
              >
                <HugeiconsIcon icon={UserCircleIcon} size={20} strokeWidth={2} />
                <span className={getSidebarLabelClass(sidebarCollapsed)}>Meu Perfil</span>
              </button>
            </div>
          </div>

          <div className={`p-4 border-t border-outline-variant/30 bg-surface-container-lowest ${sidebarCollapsed ? 'lg:px-3' : ''}`}>
            {isAdmin && teacherView === 'preview' && (
              <button
                onClick={() => { setTeacherView('content'); setMobileMenuOpen(false); }}
                className={`${sidebarActionClass} ${sidebarCollapsed ? 'lg:px-0' : ''} border border-primary/50 text-primary hover:bg-primary/5 mb-3`}
                title="Voltar ao Painel"
              >
                <HugeiconsIcon icon={SchoolIcon} size={18} strokeWidth={2} />
                <span className={getSidebarLabelClass(sidebarCollapsed)}>Voltar ao Painel</span>
              </button>
            )}
            
            <button
              onClick={handleLogout}
              className={`${sidebarActionClass} ${sidebarCollapsed ? 'lg:px-0' : ''} bg-error-container/20 border border-error/20 text-error hover:bg-error/10`}
              title="Sair da Conta"
            >
              <HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={2} />
              <span className={getSidebarLabelClass(sidebarCollapsed)}>Sair da Conta</span>
            </button>
          </div>
        </nav>

        {/* Overlay for mobile drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Main Canvas do Aluno */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
          {/* Top Navbar do Aluno */}
          <header className="px-4 sm:px-6 lg:px-8 py-4 border-b border-outline-variant/30 bg-surface-container-lowest flex justify-between items-center z-10 shadow-sm flex-shrink-0">
            <div className="flex items-center gap-3">
              <button className="lg:hidden p-2 rounded-lg hover:bg-surface-container text-on-surface-variant" onClick={() => setMobileMenuOpen(true)}>
                <HugeiconsIcon icon={Menu01Icon} size={20} />
              </button>
              <div>
                <h3 className="font-heading font-extrabold text-body-lg text-on-surface">
                  {activeUserTab === 'dashboard' && 'Minhas Aulas'}
                  {activeUserTab === 'achievements' && 'Minhas Conquistas'}
                  {activeUserTab === 'profile' && 'Meu Perfil'}
                  {activeUserTab === 'arena_ranking' && 'Ranking da Arena'}
                  {activeUserTab === 'digitacao' && 'Treino de Digitação'}
                </h3>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <NotificationBell userId={session.user.id} enabled={!isAdmin} />

              <div className="h-8 w-px bg-outline-variant/30 mx-1"></div>

              {/* User Avatar */}
              <div 
                onClick={() => { setActiveUserTab('profile'); }}
                className="flex items-center gap-3 cursor-pointer hover:bg-surface-container-low rounded-lg p-1.5 pr-3 transition-colors"
                title="Ver Meu Perfil"
              >
                <img 
                  alt="User Avatar" 
                  className="w-9 h-9 rounded-full object-cover border border-outline-variant/20 shadow-sm" 
                  src={session?.user?.user_metadata?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuDjHJPa48VdYiR05ZWGxXbALLDYlIWcSxoTbPlibTUuk_A5DCL8ceP5PgSnt9UDcsU9RAFB5c91IDtPmTCljSnfhoH8EoBhXp_QcCMb4QnDf_L_yuFFhQtcrk823AyvvrtjJbAwqlYZnOsu_lk5zBOMbLX8egLCirDVds1o7bri1xsI-opaFngNWT6CGBfc3F9lG9SBh4apN4fBXkExG7Rqfn34GSDZwsYInAIDdo4Jl6M42fD0xaeWUBN2lwtf5cebz3BoHRN3ypo"}
                />
                <div className="hidden md:block text-left text-xs">
                  <p className="font-label-md text-label-md text-on-surface font-bold leading-tight">
                    {session.user.user_metadata?.nome || 'Estudante'}
                  </p>
                  <p className="font-label-sm text-label-sm text-primary font-medium leading-none mt-1">Ver Perfil</p>
                </div>
              </div>
            </div>
          </header>

          {/* Main workspace scrollable area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-[1280px] mx-auto w-full">
              {profileStatus === 'bloqueado' ? (
                /* Locked Student Screen */
                <div className="flex items-center justify-center min-h-[60vh]">
                  <div className="flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-6 bg-surface-container-lowest border border-error/20 rounded-2xl p-8 shadow-md">
                    <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center text-error border border-error/20">
                      <HugeiconsIcon icon={Cancel01Icon} size={32} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-headline-lg font-heading font-extrabold text-on-surface">Acesso Suspenso</h2>
                      <p className="text-on-surface-variant text-body-md leading-relaxed">
                        Olá, <span className="font-bold text-on-surface">{session.user.user_metadata?.nome || session.user.email}</span>. Seu acesso à plataforma Estudea foi temporariamente bloqueado ou suspenso.
                      </p>
                      <p className="text-label-md text-on-surface-variant/80">
                        Por favor, entre em contato com seu professor ou com a secretaria para regularizar a sua situation.
                      </p>
                    </div>
                    <div className="pt-4 w-full">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 bg-error text-on-error hover:bg-error-container/40 hover:text-error border border-error font-heading font-bold rounded-xl px-4 py-3 transition-colors"
                      >
                        <HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={2} />
                        Sair da Conta
                      </button>
                    </div>
                  </div>
                </div>
              ) : activeUserTab === 'profile' ? (
                <PerfilUsuario 
                  session={session} 
                  isAdmin={isAdmin} 
                  onBack={() => setActiveUserTab('dashboard')} 
                />
              ) : activeUserTab === 'achievements' ? (
                <TrilhaAluno session={session} isAdmin={isAdmin} initialViewMode="achievements" />
              ) : activeUserTab === 'arena_ranking' ? (
                <ArenaRanking session={session} isAdmin={false} />
              ) : activeUserTab === 'digitacao' ? (
                <TreinadorDigitacao session={session} />
              ) : (
                <TrilhaAluno session={session} isAdmin={isAdmin} initialViewMode="trail" />
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-on-background relative flex items-center justify-center font-sans">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <main className="w-full max-w-md p-4 z-10">
        {authView === 'login' ? (
          <LoginAluno
            onNavigateToSignup={() => setAuthView('signup')}
            onAuthSuccess={() => {}}
          />
        ) : (
          <CadastroAluno
            onNavigateToLogin={() => setAuthView('login')}
            onAuthSuccess={() => setAuthView('login')}
          />
        )}
      </main>
    </div>
  );
}

export default App;
