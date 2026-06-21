import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  KeyboardIcon,
  Chat01Icon
} from '@hugeicons/core-free-icons';
import { TreinadorDigitacao } from './pages/TreinadorDigitacao';
import { ListaAlunos } from './pages/ListaAlunos';
import { CentralAcompanhamento } from './pages/CentralAcompanhamento';
import { DiarioClasse } from './pages/DiarioClasse';
import { DashboardProfessor } from './pages/DashboardProfessor';
import { ChatProfessor } from './pages/ChatProfessor';

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
import { ArenaLiveProfessor } from './pages/ArenaLiveProfessor';
import { ArenaLiveAluno } from './pages/ArenaLiveAluno';
import { StudentChatWidget } from './components/common/StudentChatWidget';
import { ProjetoIntegrador } from './pages/ProjetoIntegrador';
import { ProjetoIntegradorProfessor } from './pages/ProjetoIntegradorProfessor';
import logoIcon from './assets/logo-compact.png';

type TeacherTab = 'overview' | 'progress' | 'corrections' | 'assignments' | 'turmas' | 'settings' | 'materials' | 'arena_ranking' | 'diario' | 'lessons' | 'chat' | 'projeto_integrador';
type UserTab = 'dashboard' | 'achievements' | 'profile' | 'arena_ranking' | 'digitacao' | 'projeto_integrador';

const getSidebarItemClass = (active: boolean, collapsed = false) =>
  `relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-label-md transition-all w-full text-left ${collapsed ? 'lg:justify-center lg:px-0' : ''
  } ${active
    ? 'bg-primary text-on-primary shadow-sm shadow-primary/15'
    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
  }`;

const sidebarActionClass =
  'w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-label-md font-heading font-bold transition-all';

const getSidebarLabelClass = (collapsed: boolean) => collapsed ? 'lg:hidden' : '';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentProfileUserIdRef = useRef<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [teacherView, setTeacherView] = useState<'content' | 'preview'>('content');
  const [activeUserTab, setActiveUserTab] = useState<UserTab>('dashboard');

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const ThemeToggle = () => (
    <button
      onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm shrink-0"
      title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {/* Sun Icon */}
        <svg
          className={`absolute w-5 h-5 transform transition-all duration-500 ease-in-out ${
            theme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="M4.93 4.93l1.41 1.41" />
          <path d="M17.66 17.66l1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="M6.34 17.66l-1.41 1.41" />
          <path d="M19.07 4.93l-1.41 1.41" />
        </svg>
        {/* Moon Icon */}
        <svg
          className={`absolute w-5 h-5 transform transition-all duration-500 ease-in-out ${
            theme === 'light' ? '-rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      </div>
    </button>
  );

  // Teacher panel navigation & metrics states
  const [activeTeacherTab, setActiveTeacherTab] = useState<TeacherTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string>('ativo');
  const [profileRole, setProfileRole] = useState<'student' | 'teacher' | 'admin' | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Arena states
  const [arenaActive, setArenaActive] = useState(false);
  const [arenaRole, setArenaRole] = useState<'professor' | 'aluno' | null>(null);

  // Student list & tracking center states
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedChatStudentId, setSelectedChatStudentId] = useState<string | null>(null);
  const [initialTrackingSection, setInitialTrackingSection] = useState<'chat' | 'ficha'>('ficha');

  const [totalUnreadChatCount, setTotalUnreadChatCount] = useState<number>(0);

  const fetchTotalUnreadChatCount = async () => {
    if (!session) return;
    try {
      const teacherId = session.user.id;
      const { data: students } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'student');

      if (!students || students.length === 0) return;
      const studentIds = students.map(s => s.id);

      const { data: messages } = await supabase
        .from('chat_messages')
        .select('aluno_id, remetente_id, created_at')
        .in('aluno_id', studentIds);

      let totalUnread = 0;
      studentIds.forEach(id => {
        const lastOpenedKey = `chat_last_opened:${teacherId}:${id}`;
        const lastOpenedStr = localStorage.getItem(lastOpenedKey) || new Date(0).toISOString();
        const lastOpenedTime = new Date(lastOpenedStr).getTime();

        const studentMessages = messages?.filter(m => m.aluno_id === id && m.remetente_id === id) || [];
        const unread = studentMessages.filter(m => new Date(m.created_at).getTime() > lastOpenedTime).length;
        totalUnread += unread;
      });

      setTotalUnreadChatCount(totalUnread);
    } catch (err) {
      console.error('Error fetching total unread chat count:', err);
    }
  };

  useEffect(() => {
    if (session) {
      fetchTotalUnreadChatCount();

      const channel = supabase
        .channel('app_total_unread_chat')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages'
          },
          () => {
            fetchTotalUnreadChatCount();
          }
        )
        .subscribe();

      const handleStorageChange = () => {
        fetchTotalUnreadChatCount();
      };
      window.addEventListener('storage', handleStorageChange);

      const interval = setInterval(fetchTotalUnreadChatCount, 8000);

      return () => {
        supabase.removeChannel(channel);
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(interval);
      };
    }
  }, [session, activeTeacherTab]);


  const isAdmin = profileRole === 'admin' || profileRole === 'teacher';
  const shellStyle = {
    '--sidebar-width': arenaActive ? '0px' : (sidebarCollapsed ? '80px' : '280px'),
  } as CSSProperties;

  // Hook centralizado — elimina query duplicada que existia em 3 lugares
  const { count: pendingCorrectionsCount } = usePendingCorrections(!!session && isAdmin);

  const fetchUserProfile = async (userId: string) => {
    currentProfileUserIdRef.current = userId;
    if (!profileRole) {
      setProfileLoaded(false);
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('status, role')
        .eq('id', userId)
        .single();
      if (error) throw error;
      if (data) {
        setProfileStatus(data.status || 'ativo');
        const role = (data.role as 'student' | 'teacher' | 'admin' | null) || 'student';
        setProfileRole(role);
        
        const justLoggedIn = sessionStorage.getItem('just_logged_in') === 'true';
        if (justLoggedIn) {
          sessionStorage.removeItem('just_logged_in');
          // Reset view states on new login to avoid stale tabs
          setSelectedStudentId(null);
          setSelectedChatStudentId(null);
          setArenaActive(false);
          setArenaRole(null);
          setMobileMenuOpen(false);
          setSidebarCollapsed(false);
          setTeacherView('content');
          
          if (role === 'admin' || role === 'teacher') {
            navigate('/admin/overview', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar status do perfil:', err);
      if (!profileRole) {
        setProfileRole('student');
      }
    } finally {
      setProfileLoaded(true);
    }
  };

  // Track session status on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        if (currentProfileUserIdRef.current !== session.user.id) {
          fetchUserProfile(session.user.id);
        }
      } else {
        setProfileLoaded(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !currentProfileUserIdRef.current) {
        // Already signed out, ignore redundant background checks
        return;
      }
      setSession(session);
      if (session) {
        if (currentProfileUserIdRef.current !== session.user.id) {
          fetchUserProfile(session.user.id);
        }
      } else {
        currentProfileUserIdRef.current = null;
        setProfileStatus('ativo');
        setProfileRole(null);
        setProfileLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Synchronize URL path to App State
  useEffect(() => {
    if (!profileLoaded) return;

    const path = location.pathname;

    // 1. Not Authenticated Flow
    if (!session) {
      if (path === '/signup') {
        setAuthView('signup');
      } else {
        setAuthView('login');
        if (path !== '/login') {
          navigate('/login', { replace: true });
        }
      }
      return;
    }

    // 2. Authenticated Flow
    if (isAdmin && teacherView === 'content') {
      // Teacher Panel Routing
      if (path === '/' || path === '/login' || path === '/signup' || path === '/dashboard') {
        navigate('/admin/overview', { replace: true });
        return;
      }

      if (path.startsWith('/admin/alunos/')) {
        const studentId = path.substring('/admin/alunos/'.length);
        if (studentId) {
          setActiveTeacherTab('progress');
          setSelectedStudentId(studentId);
          setInitialTrackingSection('ficha');
        } else {
          setActiveTeacherTab('progress');
          setSelectedStudentId(null);
        }
      } else if (path.startsWith('/admin/chat/')) {
        const studentId = path.substring('/admin/chat/'.length);
        if (studentId) {
          setActiveTeacherTab('chat');
          setSelectedChatStudentId(studentId);
        } else {
          setActiveTeacherTab('chat');
          setSelectedChatStudentId(null);
        }
      } else {
        const tabMap: Record<string, TeacherTab> = {
          '/admin': 'overview',
          '/admin/overview': 'overview',
          '/admin/alunos': 'progress',
          '/admin/diario': 'diario',
          '/admin/lessons': 'lessons',
          '/admin/correcoes': 'corrections',
          '/admin/course-builder': 'assignments',
          '/admin/turmas': 'turmas',
          '/admin/materiais': 'materials',
          '/admin/arena-ranking': 'arena_ranking',
          '/admin/chat': 'chat',
          '/admin/perfil': 'settings',
          '/admin/projeto-integrador': 'projeto_integrador',
        };

        const targetTab = tabMap[path];
        if (targetTab) {
          setActiveTeacherTab(targetTab);
          if (targetTab === 'progress') {
            setSelectedStudentId(null);
          } else if (targetTab === 'chat') {
            setSelectedChatStudentId(null);
          }
        } else if (path.startsWith('/admin')) {
          navigate('/admin/overview', { replace: true });
        } else {
          navigate('/admin/overview', { replace: true });
        }
      }
    } else {
      // Student Portal Routing (or teacher in preview mode)
      if (path.startsWith('/admin') || path === '/login' || path === '/signup') {
        navigate('/dashboard', { replace: true });
        return;
      }

      const tabMap: Record<string, UserTab> = {
        '/': 'dashboard',
        '/dashboard': 'dashboard',
        '/conquistas': 'achievements',
        '/arena': 'arena_ranking',
        '/digitacao': 'digitacao',
        '/perfil': 'profile',
        '/projeto-integrador': 'projeto_integrador',
      };

      const targetTab = tabMap[path];
      if (targetTab) {
        setActiveUserTab(targetTab);
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [location.pathname, session, profileRole, teacherView, profileLoaded]);

  // Dynamic page title — teacher panel
  useEffect(() => {
    if (!session || !isAdmin || teacherView !== 'content') return;
    const titles: Record<string, string> = {
      overview: 'Visão Geral | Estudea',
      progress: 'Alunos | Estudea',
      corrections: 'Corrigir Atividades | Estudea',
      assignments: 'Gerenciar Cursos | Estudea',
      turmas: 'Gerenciar Turmas | Estudea',
      settings: 'Minha Conta | Estudea',
      arena_ranking: 'Ranking da Arena | Estudea',
      diario: 'Diário de Classe | Estudea',
      lessons: 'Liberação de Aulas | Estudea',
      projeto_integrador: 'Projeto Integrador | Estudea',
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
      digitacao: 'Treino de Digitação | Estudea',
      projeto_integrador: 'Projeto Integrador | Estudea',
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
    setProfileRole(null);
    setProfileLoaded(true);
  };

  const teacherSidebarNav = (
    <nav className={`fixed inset-y-0 left-0 z-50 w-[280px] ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-[280px]'} bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col justify-between transform transition-[width,transform] duration-300 lg:translate-x-0 lg:static ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
      <div className="overflow-y-auto flex-1">
        <div className={`px-4 py-4 flex items-center gap-3 justify-between ${sidebarCollapsed ? 'lg:flex-col lg:justify-center lg:px-3' : ''}`}>
          <div className="flex items-center gap-3">
            <img src={logoIcon} alt="Estudea Logo" className="w-11 h-11 rounded-xl object-contain shrink-0 shadow-sm" />
            <div className={getSidebarLabelClass(sidebarCollapsed)}>
              <h1 className="font-heading font-extrabold text-body-lg text-on-surface leading-none">Estudea</h1>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Painel do Professor</p>
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

        <div className={`flex flex-col gap-1.5 px-4 mt-4 ${sidebarCollapsed ? 'lg:px-3' : ''}`}>
          <button
            onClick={() => { navigate('/admin/overview'); setMobileMenuOpen(false); }}
            className={getSidebarItemClass(activeTeacherTab === 'overview', sidebarCollapsed)}
            title="Visão Geral"
          >
            <HugeiconsIcon icon={DashboardSquare01Icon} size={20} strokeWidth={2} />
            <span className={getSidebarLabelClass(sidebarCollapsed)}>Visão Geral</span>
          </button>

          <button
            onClick={() => {
              navigate('/admin/alunos');
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
              navigate('/admin/diario');
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
              navigate('/admin/lessons');
              setMobileMenuOpen(false);
            }}
            className={getSidebarItemClass(activeTeacherTab === 'lessons', sidebarCollapsed)}
            title="Liberação de Aulas"
          >
            <HugeiconsIcon icon={Task01Icon} size={20} strokeWidth={2} />
            <span className={getSidebarLabelClass(sidebarCollapsed)}>Liberação de Aulas</span>
          </button>

          <button
            onClick={() => { navigate('/admin/correcoes'); setMobileMenuOpen(false); }}
            className={getSidebarItemClass(activeTeacherTab === 'corrections', sidebarCollapsed)}
            title="Corrigir Atividades"
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} strokeWidth={2} />
            <span className={getSidebarLabelClass(sidebarCollapsed)}>Corrigir Atividades</span>
            {pendingCorrectionsCount > 0 && (
              <span className={`ml-auto bg-error text-on-error font-label-sm text-[11px] px-2 py-0.5 rounded-full ${sidebarCollapsed ? 'lg:absolute lg:right-1 lg:top-1 lg:ml-0 lg:px-1.5' : ''}`}>
                {pendingCorrectionsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { navigate('/admin/course-builder'); setMobileMenuOpen(false); }}
            className={getSidebarItemClass(activeTeacherTab === 'assignments', sidebarCollapsed)}
            title="Gerenciar Cursos"
          >
            <HugeiconsIcon icon={BookOpen01Icon} size={20} strokeWidth={2} />
            <span className={getSidebarLabelClass(sidebarCollapsed)}>Gerenciar Cursos</span>
          </button>

          <button
            onClick={() => { navigate('/admin/projeto-integrador'); setMobileMenuOpen(false); }}
            className={getSidebarItemClass(activeTeacherTab === 'projeto_integrador', sidebarCollapsed)}
            title="Projeto Integrador"
          >
            <HugeiconsIcon icon={Task01Icon} size={20} strokeWidth={2} />
            <span className={getSidebarLabelClass(sidebarCollapsed)}>Projeto Integrador</span>
          </button>

          <button
            onClick={() => { navigate('/admin/turmas'); setMobileMenuOpen(false); }}
            className={getSidebarItemClass(activeTeacherTab === 'turmas', sidebarCollapsed)}
            title="Gerenciar Turmas"
          >
            <HugeiconsIcon icon={SchoolIcon} size={20} strokeWidth={2} />
            <span className={getSidebarLabelClass(sidebarCollapsed)}>Gerenciar Turmas</span>
          </button>

          <button
            onClick={() => { navigate('/admin/arena-ranking'); setMobileMenuOpen(false); }}
            className={getSidebarItemClass(activeTeacherTab === 'arena_ranking', sidebarCollapsed)}
            title="Ranking da Arena"
          >
            <HugeiconsIcon icon={Award01Icon} size={20} strokeWidth={2} />
            <span className={getSidebarLabelClass(sidebarCollapsed)}>Ranking da Arena</span>
          </button>

          <button
            onClick={() => {
              navigate('/admin/chat');
              setMobileMenuOpen(false);
            }}
            className={getSidebarItemClass(activeTeacherTab === 'chat', sidebarCollapsed)}
            title="Chat com Alunos"
          >
            <HugeiconsIcon icon={Chat01Icon} size={20} strokeWidth={2} />
            <span className={getSidebarLabelClass(sidebarCollapsed)}>Chat com Alunos</span>
            {totalUnreadChatCount > 0 && (
              <span className={`ml-auto bg-error text-on-error font-label-sm text-[11px] px-2 py-0.5 rounded-full ${sidebarCollapsed ? 'lg:absolute lg:right-1 lg:top-1 lg:ml-0 lg:px-1.5' : ''}`}>
                {totalUnreadChatCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { navigate('/admin/materiais'); setMobileMenuOpen(false); }}
            className={getSidebarItemClass(activeTeacherTab === 'materials', sidebarCollapsed)}
            title="Materiais de Apoio"
          >
            <HugeiconsIcon icon={SparklesIcon} size={20} strokeWidth={2} />
            <span className={getSidebarLabelClass(sidebarCollapsed)}>Materiais de Apoio</span>
          </button>

          <div className={`my-2 border-t border-outline-variant/30 ${sidebarCollapsed ? 'lg:mx-1' : 'mx-4'}`}></div>

          <button
            onClick={() => { navigate('/admin/perfil'); setMobileMenuOpen(false); }}
            className={getSidebarItemClass(activeTeacherTab === 'settings', sidebarCollapsed)}
            title="Minha Conta / Perfil"
          >
            <HugeiconsIcon icon={Settings01Icon} size={20} strokeWidth={2} />
            <span className={getSidebarLabelClass(sidebarCollapsed)}>Minha Conta / Perfil</span>
          </button>
        </div>
      </div>

      <div className={`p-4 border-t border-outline-variant/30 bg-surface-container-lowest ${sidebarCollapsed ? 'lg:px-2' : ''}`}>
        <button
          onClick={handleLogout}
          className={`${sidebarActionClass} ${sidebarCollapsed ? 'lg:px-0' : ''} bg-error-container/20 border border-error/20 text-error hover:bg-error-container/40`}
          title="Sair"
        >
          <HugeiconsIcon icon={Logout01Icon} size={20} strokeWidth={2} />
          <span className={getSidebarLabelClass(sidebarCollapsed)}>Sair</span>
        </button>
      </div>
    </nav>
  );

  const studentSidebarNav = (
    <nav className={`fixed inset-y-0 left-0 z-50 w-[280px] ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-[280px]'} bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col justify-between transform transition-[width,transform] duration-300 lg:translate-x-0 lg:static ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
      <div>
        <div className={`px-5 py-6 flex items-center gap-3 justify-between ${sidebarCollapsed ? 'lg:flex-col lg:justify-center lg:px-3' : ''}`}>
          <div className="flex items-center gap-3">
            <img src={logoIcon} alt="Estudea Logo" className="w-11 h-11 rounded-xl object-contain shrink-0 shadow-sm" />
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

        <div className={`flex flex-col gap-1.5 px-4 mt-4 ${sidebarCollapsed ? 'lg:px-3' : ''}`}>
          <button
            onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
            className={getSidebarItemClass(activeUserTab === 'dashboard', sidebarCollapsed)}
            title="Minhas Aulas"
          >
            <HugeiconsIcon icon={BookOpen01Icon} size={20} strokeWidth={2} />
            <span className={getSidebarLabelClass(sidebarCollapsed)}>Minhas Aulas</span>
          </button>

          <button
            onClick={() => { navigate('/conquistas'); setMobileMenuOpen(false); }}
            className={getSidebarItemClass(activeUserTab === 'achievements', sidebarCollapsed)}
            title="Minhas Conquistas"
          >
            <HugeiconsIcon icon={Award01Icon} size={20} strokeWidth={2} />
            <span className={getSidebarLabelClass(sidebarCollapsed)}>Minhas Conquistas</span>
          </button>

          <button
            onClick={() => { navigate('/arena'); setMobileMenuOpen(false); }}
            className={getSidebarItemClass(activeUserTab === 'arena_ranking', sidebarCollapsed)}
            title="Ranking da Arena"
          >
            <HugeiconsIcon icon={Trophy} size={20} strokeWidth={2} />
            <span className={getSidebarLabelClass(sidebarCollapsed)}>Ranking da Arena</span>
          </button>

          <button
            onClick={() => { navigate('/digitacao'); setMobileMenuOpen(false); }}
            className={getSidebarItemClass(activeUserTab === 'digitacao', sidebarCollapsed)}
            title="Treino de Digitação"
          >
            <HugeiconsIcon icon={KeyboardIcon} size={20} strokeWidth={2} />
            <span className={getSidebarLabelClass(sidebarCollapsed)}>Treino de Digitação</span>
          </button>

          <button
            onClick={() => { navigate('/projeto-integrador'); setMobileMenuOpen(false); }}
            className={getSidebarItemClass(activeUserTab === 'projeto_integrador', sidebarCollapsed)}
            title="Projeto Integrador"
          >
            <HugeiconsIcon icon={Task01Icon} size={20} strokeWidth={2} />
            <span className={getSidebarLabelClass(sidebarCollapsed)}>Projeto Integrador</span>
          </button>

          <button
            onClick={() => { navigate('/perfil'); setMobileMenuOpen(false); }}
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
  );

  if (session && !profileLoaded) {
    return (
      <div className="min-h-screen w-full bg-background text-on-background flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
          <div className="w-9 h-9 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <p className="text-label-md font-bold">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  // If teacher is logged in and viewing content dashboard, show full-screen admin layout with sidebar
  if (session && isAdmin && teacherView === 'content') {
    return (
      <div className="min-h-screen w-full bg-background text-on-background flex font-sans overflow-hidden" style={shellStyle}>
        {/* Sidebar Nav */}
        {!arenaActive && teacherSidebarNav}

        {/* Overlay for mobile drawer */}
        {!arenaActive && mobileMenuOpen && (
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
                  {activeTeacherTab === 'overview' && 'Visão Geral'}
                  {activeTeacherTab === 'progress' && 'Alunos'}
                  {activeTeacherTab === 'diario' && 'Diário de Classe'}
                  {activeTeacherTab === 'chat' && 'Chat com Alunos'}
                  {activeTeacherTab === 'lessons' && 'Liberação de Aulas'}
                  {activeTeacherTab === 'assignments' && 'Gerenciar Cursos'}
                  {activeTeacherTab === 'projeto_integrador' && 'Projeto Integrador'}
                  {activeTeacherTab === 'turmas' && 'Gerenciar Turmas'}
                  {activeTeacherTab === 'corrections' && 'Corrigir Atividades'}
                  {activeTeacherTab === 'settings' && 'Minha Conta / Perfil'}
                  {activeTeacherTab === 'materials' && 'Materiais de Apoio'}
                  {activeTeacherTab === 'arena_ranking' && 'Ranking da Arena'}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                className="text-on-surface-variant hover:bg-surface-container-low rounded-full p-2 transition-all relative"
                onClick={() => navigate('/admin/correcoes')}
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

              <ThemeToggle />

              <div className="h-8 w-px bg-outline-variant/30 mx-1"></div>

              {/* Profile click item */}
              <div
                onClick={() => { navigate('/admin/perfil'); }}
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
          <main className={`flex-1 ${activeTeacherTab === 'chat' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'} p-4 sm:p-6 lg:p-8`}>
            <div className={`max-w-[1280px] mx-auto w-full ${activeTeacherTab === 'chat' ? 'flex-1 flex flex-col min-h-0' : ''}`}>
              {activeTeacherTab === 'progress' && (
                selectedStudentId ? (
                  <CentralAcompanhamento
                    alunoId={selectedStudentId}
                    initialTab={initialTrackingSection}
                    onBack={() => navigate('/admin/alunos')}
                    onChangeStudent={(id) => navigate(`/admin/alunos/${id}`)}
                  />
                ) : (
                  <ListaAlunos
                    onSelectStudent={(id, section) => {
                      if (section === 'chat') {
                        navigate(`/admin/chat/${id}`);
                      } else {
                        navigate(`/admin/alunos/${id}`);
                      }
                    }}
                  />
                )
              )}
              {activeTeacherTab === 'assignments' && <CourseBuilder />}
              {activeTeacherTab === 'projeto_integrador' && <ProjetoIntegradorProfessor />}
              {activeTeacherTab === 'turmas' && (
                <GerenciadorTurmas
                  onSelectStudent={(id, section) => {
                    if (section === 'chat') {
                      navigate(`/admin/chat/${id}`);
                    } else {
                      navigate(`/admin/alunos/${id}`);
                    }
                  }}
                />
              )}
              {activeTeacherTab === 'diario' && <DiarioClasse />}
              {activeTeacherTab === 'chat' && (
                <ChatProfessor
                  initialStudentId={selectedChatStudentId}
                  onClearInitialStudent={() => setSelectedChatStudentId(null)}
                />
              )}
              {activeTeacherTab === 'lessons' && <DashboardProfessor />}
              {activeTeacherTab === 'materials' && <MateriaisApoio />}
              {activeTeacherTab === 'arena_ranking' && <ArenaRanking session={session} isAdmin={true} />}

              {activeTeacherTab === 'overview' && (
                <DashboardProfessorOverview
                  setActiveTab={(tab) => {
                    const pathMap: Record<TeacherTab, string> = {
                      overview: '/admin/overview',
                      progress: '/admin/alunos',
                      corrections: '/admin/correcoes',
                      assignments: '/admin/course-builder',
                      turmas: '/admin/turmas',
                      settings: '/admin/perfil',
                      materials: '/admin/materiais',
                      arena_ranking: '/admin/arena-ranking',
                      diario: '/admin/diario',
                      lessons: '/admin/lessons',
                      chat: '/admin/chat',
                      projeto_integrador: '/admin/projeto-integrador'
                    };
                    navigate(pathMap[tab]);
                  }}
                  session={session}
                  onStartArena={() => {
                    setArenaActive(true);
                    setArenaRole('professor');
                    setSidebarCollapsed(true);
                  }}
                />
              )}

              {activeTeacherTab === 'corrections' && <CentralCorrecoes />}

              {activeTeacherTab === 'settings' && (
                <PerfilUsuario session={session} isAdmin={isAdmin} />
              )}
            </div>
          </main>
        </div>
        {arenaActive && arenaRole === 'professor' && (
          <ArenaLiveProfessor session={session} onClose={() => { setArenaActive(false); setArenaRole(null); }} />
        )}
      </div>
    );
  }

  if (session && (!isAdmin || teacherView === 'preview')) {
    return (
      <div className="min-h-screen w-full bg-background text-on-background flex font-sans overflow-hidden" style={shellStyle}>
        {/* Sidebar Nav do Aluno */}
        {!arenaActive && studentSidebarNav}

        {/* Overlay for mobile drawer */}
        {!arenaActive && mobileMenuOpen && (
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
                  {activeUserTab === 'projeto_integrador' && 'Projeto Integrador'}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <NotificationBell userId={session.user.id} enabled={!isAdmin} />

              <ThemeToggle />

              <div className="h-8 w-px bg-outline-variant/30 mx-1"></div>

              {/* User Avatar */}
              <div
                onClick={() => { navigate('/perfil'); }}
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
                  onBack={() => navigate('/dashboard')}
                />
              ) : activeUserTab === 'achievements' ? (
                <TrilhaAluno
                  session={session}
                  isAdmin={isAdmin}
                  initialViewMode="achievements"
                  onStartArena={() => {
                    setArenaActive(true);
                    setArenaRole('aluno');
                    setSidebarCollapsed(true);
                  }}
                />
              ) : activeUserTab === 'arena_ranking' ? (
                <ArenaRanking session={session} isAdmin={false} />
              ) : activeUserTab === 'digitacao' ? (
                <TreinadorDigitacao session={session} />
              ) : activeUserTab === 'projeto_integrador' ? (
                <ProjetoIntegrador session={session} />
              ) : (
                <TrilhaAluno
                  session={session}
                  isAdmin={isAdmin}
                  initialViewMode="trail"
                  onStartArena={() => {
                    setArenaActive(true);
                    setArenaRole('aluno');
                    setSidebarCollapsed(true);
                  }}
                />
              )}
            </div>
          </main>
        </div>
        {arenaActive && arenaRole === 'aluno' && (
          <ArenaLiveAluno session={session} onClose={() => { setArenaActive(false); setArenaRole(null); }} />
        )}
        {!arenaActive && (
          <StudentChatWidget
            studentId={session.user.id}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-on-background relative flex flex-col items-center justify-center font-sans">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-3xl pointer-events-none" />

      <main className="w-full max-w-md p-4 z-10">
        {authView === 'login' ? (
          <LoginAluno
            onNavigateToSignup={() => navigate('/signup')}
            onAuthSuccess={() => {
              sessionStorage.setItem('just_logged_in', 'true');
            }}
          />
        ) : (
          <CadastroAluno
            onNavigateToLogin={() => navigate('/login')}
            onAuthSuccess={() => navigate('/login')}
          />
        )}
      </main>

      {/* Open Source / Free Badge Footer */}
      <footer className="mt-2 text-center z-10 flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant/80 font-semibold">
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-primary/10 text-primary font-bold text-[10px] tracking-wide uppercase">Open Source</span>
          <span className="w-1.5 h-1.5 rounded-full bg-outline" />
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-tertiary/10 text-tertiary font-bold text-[10px] tracking-wide uppercase">Gratuito</span>
        </div>
        <p className="text-[11px] text-on-surface-variant/70 flex items-center gap-1 select-none">
          Feito com <span className="text-error animate-pulse">❤️</span> por{' '}
          <a
            href="https://github.com/lailsoncode/estudea"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-primary hover:underline transition-colors"
          >
            Oxente Code
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
