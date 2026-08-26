import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Award01Icon,
  ArrowRight01Icon,
  BookOpen01Icon,
  ChartHistogramIcon,
  CheckmarkCircle02Icon,
  Cursor01Icon,
  FireIcon,
  GameControllerIcon,
  KeyboardIcon,
  Layers01Icon,
  Menu01Icon,
  PlayIcon,
  Rocket01Icon,
  SchoolIcon,
  SparklesIcon,
  Task01Icon,
  TeacherIcon,
  Tick01Icon,
  TrendingUp,
  Trophy,
  UserGroupIcon,
  UserIcon,
  WindowsNewIcon,
} from '@hugeicons/core-free-icons';
import logoIcon from '../assets/logo-compact.png';

interface HomePageProps {
  onLogin: () => void;
  onStudentSignup: () => void;
  onTeacherSignup: () => void;
}

const progressItems = [
  { label: 'Fundamentos digitais', value: 86, color: 'bg-primary' },
  { label: 'Digitação e produtividade', value: 68, color: 'bg-secondary' },
  { label: 'Projeto integrador', value: 42, color: 'bg-violet-500' },
];

const platformFeatures = [
  {
    icon: BookOpen01Icon,
    eyebrow: 'Conteúdo que guia',
    title: 'Trilhas que dão vontade de continuar',
    description: 'Módulos, aulas, vídeos, quizzes e práticas organizados em uma jornada clara — com progresso sequencial e objetivos visíveis.',
    tone: 'blue',
    visual: 'trail',
  },
  {
    icon: Trophy,
    eyebrow: 'Aprender jogando',
    title: 'XP, conquistas e Arena ao vivo',
    description: 'Gamificação com propósito: ofensivas, ranking e quizzes multijogador transformam participação em hábito de aprendizagem.',
    tone: 'orange',
    visual: 'arena',
  },
  {
    icon: ChartHistogramIcon,
    eyebrow: 'Visão pedagógica',
    title: 'Cada aluno visto por inteiro',
    description: 'Progresso, frequência, autonomia digital, digitação, engajamento e risco pedagógico reunidos em uma visão 360°.',
    tone: 'violet',
    visual: 'insights',
  },
  {
    icon: KeyboardIcon,
    eyebrow: 'Prática de verdade',
    title: 'Tecnologia se aprende fazendo',
    description: 'Treinadores de mouse e digitação, curso de Windows 11, Kanban pessoal e projeto integrador para desenvolver autonomia real.',
    tone: 'emerald',
    visual: 'practice',
  },
];

const audienceContent = {
  student: {
    label: 'Para estudantes',
    title: 'Uma jornada que mostra o próximo passo.',
    description: 'O aluno sabe onde está, o que conquistou e o que vem depois. Cada avanço vira uma pequena vitória visível.',
    bullets: ['Trilhas e aulas em sequência', 'XP, conquistas e ofensivas', 'Arena, digitação, mouse e projetos', 'Chat direto com o professor'],
    stat: '+ autonomia',
    statDetail: 'para aprender no próprio ritmo',
  },
  teacher: {
    label: 'Para educadores',
    title: 'Menos planilha. Mais tempo para ensinar.',
    description: 'Do planejamento à intervenção pedagógica, o professor encontra contexto e ação no mesmo ambiente.',
    bullets: ['Cursos, turmas e diário de classe', 'Correções e feedback individual', 'Acompanhamento 360° e alertas de risco', 'Diagnóstico e PDI com inteligência artificial'],
    stat: '1 painel',
    statDetail: 'para acompanhar toda a turma',
  },
};

const journeySteps = [
  { number: '01', title: 'Crie ou entre em uma turma', description: 'Professor organiza a experiência; aluno acessa com uma jornada pronta para começar.' },
  { number: '02', title: 'Aprenda com a mão na massa', description: 'Aulas, quizzes, práticas e desafios constroem habilidade, não só presença.' },
  { number: '03', title: 'Acompanhe e avance', description: 'Evolução visível para o aluno e sinais claros para o professor agir na hora certa.' },
];

const featureToneClasses: Record<string, { icon: string; wash: string; accent: string }> = {
  blue: { icon: 'bg-sky-100 text-primary', wash: 'from-sky-50 to-blue-50/40', accent: 'bg-primary' },
  orange: { icon: 'bg-orange-100 text-orange-600', wash: 'from-orange-50 to-amber-50/40', accent: 'bg-secondary' },
  violet: { icon: 'bg-violet-100 text-violet-600', wash: 'from-violet-50 to-fuchsia-50/30', accent: 'bg-violet-500' },
  emerald: { icon: 'bg-emerald-100 text-emerald-600', wash: 'from-emerald-50 to-teal-50/40', accent: 'bg-emerald-500' },
};

export function HomePage({ onLogin, onStudentSignup, onTeacherSignup }: HomePageProps) {
  const [audience, setAudience] = useState<'student' | 'teacher'>('student');
  const [navCompact, setNavCompact] = useState(false);
  const currentAudience = audienceContent[audience];

  useEffect(() => {
    document.title = 'Estudea — Educação digital que transforma';

    const handleScroll = () => setNavCompact(window.scrollY > 24);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
        });
      },
      { threshold: 0.12 },
    );

    document.querySelectorAll('.home-animate').forEach((element) => observer.observe(element));
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-canvas text-slate-950 selection:bg-secondary/25">
      <div className="relative isolate min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0 home-grid-mask opacity-70" />
        <div className="pointer-events-none absolute -left-40 top-20 h-[32rem] w-[32rem] rounded-full bg-sky-200/45 blur-3xl" />
        <div className="pointer-events-none absolute -right-52 -top-24 h-[38rem] w-[38rem] rounded-full bg-orange-200/40 blur-3xl" />

        <header className={`sticky top-0 z-40 mx-auto flex w-full max-w-[1240px] items-center justify-between px-5 transition-all duration-300 sm:px-8 lg:px-10 ${navCompact ? 'py-3' : 'py-5'}`}>
          <div className={`pointer-events-none absolute inset-x-3 inset-y-1 -z-10 rounded-2xl border transition-all duration-300 ${navCompact ? 'border-white/80 bg-white/85 shadow-lg shadow-slate-900/5 backdrop-blur-xl' : 'border-transparent bg-transparent'}`} />
          <a href="#inicio" className="flex items-center gap-3" aria-label="Estudea — início">
            <img src={logoIcon} alt="" className="h-11 w-11 rounded-[14px] object-contain shadow-lg shadow-primary/10" />
            <span className="font-heading text-xl font-extrabold tracking-[-0.04em] text-brand-navy">estudea</span>
          </a>

          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex" aria-label="Navegação principal">
            <a href="#recursos" className="transition-colors hover:text-primary">Recursos</a>
            <a href="#para-quem" className="transition-colors hover:text-primary">Para quem</a>
            <a href="#open-source" className="transition-colors hover:text-primary">Open source</a>
          </nav>

          <div className="flex items-center gap-1 sm:gap-3">
            <button
              type="button"
              onClick={onLogin}
              className="rounded-xl px-3 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary/5 sm:px-4"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={onStudentSignup}
              className="hidden rounded-product-control bg-brand-navy px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/15 transition-all hover:-translate-y-0.5 hover:bg-primary sm:inline-flex"
            >
              Criar conta grátis
            </button>
            <a
              href="#recursos"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary/5 md:hidden"
              aria-label="Ver recursos"
            >
              <HugeiconsIcon icon={Menu01Icon} size={20} />
            </a>
          </div>
        </header>

        <main id="inicio" className="relative z-10 mx-auto grid min-h-[calc(100vh-84px)] w-full max-w-[1240px] items-center gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:pb-24 lg:pt-8">
          <div className="max-w-2xl home-reveal">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-primary shadow-sm backdrop-blur">
              <HugeiconsIcon icon={SparklesIcon} size={15} strokeWidth={2.2} />
              Educação digital que transforma
            </div>

            <h1 className="brand-display-title">
              Aprender tecnologia pode ser{' '}
              <span className="relative inline-block text-secondary">
                incrível.
                <span className="absolute -bottom-1 left-1 h-2 w-[92%] -rotate-1 rounded-full bg-secondary/18" />
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
              Trilhas gamificadas, ferramentas práticas e acompanhamento pedagógico em uma plataforma gratuita feita para quem ensina e aprende tecnologia.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onStudentSignup}
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary px-7 py-4 font-heading text-base font-extrabold text-white shadow-xl shadow-orange-500/20 transition-all hover:-translate-y-1 hover:bg-orange-500"
              >
                Começar como aluno
                <HugeiconsIcon icon={ArrowRight01Icon} size={19} className="transition-transform group-hover:translate-x-1" />
              </button>
              <button
                type="button"
                onClick={onTeacherSignup}
                className="inline-flex items-center justify-center gap-2 rounded-product-card border border-slate-200 bg-white/80 px-7 py-4 font-heading text-base font-extrabold text-brand-navy shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/25 hover:bg-white"
              >
                <HugeiconsIcon icon={PlayIcon} size={19} />
                Sou educador
              </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold text-slate-500">
              <span className="flex items-center gap-2"><HugeiconsIcon icon={CheckmarkCircle02Icon} size={17} className="text-emerald-500" />Gratuito</span>
              <span className="flex items-center gap-2"><HugeiconsIcon icon={CheckmarkCircle02Icon} size={17} className="text-emerald-500" />Open source</span>
              <span className="flex items-center gap-2"><HugeiconsIcon icon={CheckmarkCircle02Icon} size={17} className="text-emerald-500" />Feito no Brasil</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[650px] home-reveal-delayed">
            <div className="absolute -left-8 top-10 h-28 w-28 rounded-full bg-secondary/20 blur-2xl" />
            <div className="absolute -right-6 bottom-10 h-36 w-36 rounded-full bg-sky-300/30 blur-3xl" />

            <div className="relative rotate-[1.5deg] rounded-product-display border border-white/80 bg-white/75 p-3 shadow-product-display backdrop-blur-xl transition-transform duration-500 hover:rotate-0 sm:p-4">
              <div className="overflow-hidden rounded-product-panel border border-slate-200/80 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/20">
                      <HugeiconsIcon icon={BookOpen01Icon} size={20} />
                    </div>
                    <div>
                      <p className="font-heading text-sm font-extrabold text-slate-900">Minha jornada</p>
                      <p className="text-[11px] font-semibold text-slate-400">Turma Inclusão Digital</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-extrabold text-orange-600">
                    <span aria-hidden="true">🔥</span> 12 dias
                  </div>
                </div>

                <div className="grid gap-4 bg-slate-50/70 p-4 sm:grid-cols-[1.25fr_0.75fr] sm:p-5">
                  <div className="rounded-product-card bg-brand-navy p-5 text-white shadow-lg shadow-blue-950/15">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-200">Progresso geral</p>
                        <p className="mt-2 font-heading text-4xl font-extrabold tracking-tight">72%</p>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-secondary">
                        <HugeiconsIcon icon={Trophy} size={22} />
                      </div>
                    </div>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/15">
                      <div className="home-progress h-full w-[72%] rounded-full bg-gradient-to-r from-secondary to-amber-300" />
                    </div>
                    <p className="mt-3 text-xs font-semibold text-blue-100">Mais 2 aulas para subir de nível</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-violet-600">
                        <HugeiconsIcon icon={Trophy} size={17} />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">XP total</span>
                      </div>
                      <p className="mt-2 font-heading text-2xl font-extrabold text-slate-900">1.840</p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-emerald-600">
                        <HugeiconsIcon icon={Task01Icon} size={17} />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">Concluídas</span>
                      </div>
                      <p className="mt-2 font-heading text-2xl font-extrabold text-slate-900">18 aulas</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="font-heading text-sm font-extrabold text-slate-800">Trilhas em andamento</p>
                      <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-[10px] font-extrabold text-primary">3 ATIVAS</span>
                    </div>
                    <div className="space-y-3.5">
                      {progressItems.map((item) => (
                        <div key={item.label} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5">
                          <span className="text-xs font-bold text-slate-600">{item.label}</span>
                          <span className="text-xs font-extrabold text-slate-400">{item.value}%</span>
                          <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className={`home-progress h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="home-float absolute -left-4 top-[47%] hidden items-center gap-3 rounded-2xl border border-white bg-white/95 p-3 pr-4 shadow-xl backdrop-blur sm:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <HugeiconsIcon icon={UserGroupIcon} size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sua turma</p>
                <p className="text-sm font-extrabold text-slate-800">aprendendo junta</p>
              </div>
            </div>
          </div>
        </main>
      </div>

      <div className="overflow-hidden border-y border-slate-200/80 bg-white py-4" aria-label="Principais recursos">
        <div className="home-marquee flex w-max items-center gap-10 whitespace-nowrap pr-10 text-sm font-extrabold text-slate-500">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center gap-10" aria-hidden={copy === 1}>
              <span className="flex items-center gap-2"><HugeiconsIcon icon={BookOpen01Icon} size={18} className="text-primary" />Trilhas gamificadas</span>
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              <span className="flex items-center gap-2"><HugeiconsIcon icon={GameControllerIcon} size={18} className="text-violet-500" />Arena ao vivo</span>
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              <span className="flex items-center gap-2"><HugeiconsIcon icon={KeyboardIcon} size={18} className="text-emerald-500" />Treino prático</span>
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              <span className="flex items-center gap-2"><HugeiconsIcon icon={ChartHistogramIcon} size={18} className="text-sky-500" />Acompanhamento 360°</span>
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              <span className="flex items-center gap-2"><HugeiconsIcon icon={SparklesIcon} size={18} className="text-orange-500" />Inteligência pedagógica</span>
            </div>
          ))}
        </div>
      </div>

      <section id="recursos" className="bg-white px-5 py-24 sm:px-8 sm:py-32 lg:px-10">
        <div className="mx-auto max-w-[1180px]">
          <div className="home-animate mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-secondary">
              <span className="h-px w-8 bg-secondary" />
              Muito além de assistir aulas
              <span className="h-px w-8 bg-secondary" />
            </span>
            <h2 className="brand-section-title mt-5">
              Um ecossistema inteiro para aprender tecnologia.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              O Estudea conecta conteúdo, prática, motivação e acompanhamento para fazer a aprendizagem acontecer de verdade.
            </p>
          </div>

          <div className="mt-16 grid gap-5 lg:grid-cols-2">
            {platformFeatures.map((feature, index) => {
              const tone = featureToneClasses[feature.tone];
              return (
                <article
                  key={feature.title}
                  className={`home-animate group relative overflow-hidden rounded-product-display border border-slate-200/80 bg-gradient-to-br ${tone.wash} p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/10 sm:p-8`}
                  style={{ transitionDelay: `${index * 65}ms` }}
                >
                  <div className="relative z-10 flex h-full min-h-[350px] flex-col">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone.icon}`}>
                      <HugeiconsIcon icon={feature.icon} size={23} strokeWidth={2} />
                    </div>
                    <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">{feature.eyebrow}</p>
                    <h3 className="mt-2 max-w-md font-heading text-2xl font-extrabold tracking-[-0.035em] text-slate-900 sm:text-3xl">{feature.title}</h3>
                    <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">{feature.description}</p>

                    <div className="mt-auto pt-8">
                      {feature.visual === 'trail' && (
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { icon: BookOpen01Icon, text: 'Aula', done: true },
                            { icon: Task01Icon, text: 'Prática', done: true },
                            { icon: Trophy, text: 'Conquista', done: false },
                          ].map((item, itemIndex) => (
                            <div key={item.text} className={`relative rounded-2xl border p-3 ${item.done ? 'border-primary/15 bg-white shadow-sm' : 'border-dashed border-slate-300 bg-white/45'}`}>
                              {itemIndex < 2 && <span className="absolute left-[calc(100%+1px)] top-7 h-px w-3 bg-slate-300" />}
                              <HugeiconsIcon icon={item.icon} size={18} className={item.done ? 'text-primary' : 'text-slate-400'} />
                              <p className="mt-4 text-[11px] font-extrabold text-slate-600">{item.text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {feature.visual === 'arena' && (
                        <div className="flex items-end justify-center gap-2 rounded-product-card bg-brand-ink p-5 text-center text-white">
                          {[
                            { place: '2', name: 'Bia', height: 'h-16', color: 'bg-sky-400' },
                            { place: '1', name: 'Leo', height: 'h-24', color: 'bg-secondary' },
                            { place: '3', name: 'Iara', height: 'h-12', color: 'bg-violet-400' },
                          ].map((player) => (
                            <div key={player.place} className="w-20">
                              <div className="mb-2 text-xs font-bold text-blue-100">{player.name}</div>
                              <div className={`${player.height} ${player.color} flex items-start justify-center rounded-t-xl pt-2 font-heading text-xl font-extrabold`}>{player.place}º</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {feature.visual === 'insights' && (
                        <div className="grid grid-cols-[1fr_auto] items-end gap-5 rounded-2xl border border-violet-100 bg-white/80 p-5">
                          <div>
                            <div className="mb-4 flex items-center justify-between text-xs font-bold text-slate-500"><span>Engajamento da turma</span><span className="text-emerald-600">+18%</span></div>
                            <div className="flex h-20 items-end gap-2">
                              {[36, 51, 44, 68, 61, 82, 92].map((height, barIndex) => <span key={barIndex} className="flex-1 rounded-t-md bg-violet-400/80 transition-colors group-hover:bg-violet-500" style={{ height: `${height}%` }} />)}
                            </div>
                          </div>
                          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
                            <p className="font-heading text-xl font-extrabold text-emerald-700">84%</p>
                            <p className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600">ativos</p>
                          </div>
                        </div>
                      )}
                      {feature.visual === 'practice' && (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {[
                            { icon: KeyboardIcon, label: 'Digitação' },
                            { icon: Cursor01Icon, label: 'Mouse' },
                            { icon: WindowsNewIcon, label: 'Windows' },
                            { icon: Layers01Icon, label: 'Kanban' },
                          ].map((practice) => (
                            <div key={practice.label} className="rounded-2xl border border-emerald-100 bg-white/85 p-3 text-center shadow-sm transition-transform group-hover:-translate-y-1">
                              <HugeiconsIcon icon={practice.icon} size={20} className="mx-auto text-emerald-600" />
                              <p className="mt-2 text-[10px] font-extrabold text-slate-600">{practice.label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="para-quem" className="relative overflow-hidden bg-brand-ink px-5 py-24 text-white sm:px-8 sm:py-32 lg:px-10">
        <div className="pointer-events-none absolute -right-32 top-0 h-[32rem] w-[32rem] rounded-full bg-primary/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-32 h-[30rem] w-[30rem] rounded-full bg-orange-500/15 blur-3xl" />
        <div className="home-dark-grid pointer-events-none absolute inset-0 opacity-40" />

        <div className="relative mx-auto max-w-[1180px]">
          <div className="home-animate flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-300">Dois olhares, uma só jornada</p>
              <h2 className="mt-4 font-heading text-4xl font-extrabold tracking-[-0.05em] sm:text-5xl lg:text-6xl">Bom para quem aprende.<br />Poderoso para quem ensina.</h2>
            </div>
            <div className="inline-flex w-fit rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur">
              <button
                type="button"
                onClick={() => setAudience('student')}
                className={`flex items-center gap-2 rounded-product-control px-4 py-3 text-sm font-extrabold transition-all ${audience === 'student' ? 'bg-white text-brand-ink shadow-lg' : 'text-blue-100 hover:bg-white/10'}`}
              >
                <HugeiconsIcon icon={UserIcon} size={18} /> Aluno
              </button>
              <button
                type="button"
                onClick={() => setAudience('teacher')}
                className={`flex items-center gap-2 rounded-product-control px-4 py-3 text-sm font-extrabold transition-all ${audience === 'teacher' ? 'bg-white text-brand-ink shadow-lg' : 'text-blue-100 hover:bg-white/10'}`}
              >
                <HugeiconsIcon icon={TeacherIcon} size={18} /> Educador
              </button>
            </div>
          </div>

          <div className="home-animate mt-14 grid overflow-hidden rounded-product-display border border-white/10 bg-white/[0.07] shadow-2xl shadow-black/15 backdrop-blur-sm lg:grid-cols-[1fr_0.9fr]">
            <div key={audience} className="home-tab-enter p-7 sm:p-10 lg:p-14">
              <span className="inline-flex items-center gap-2 rounded-full bg-orange-400/15 px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-orange-300">
                {audience === 'student' ? <HugeiconsIcon icon={UserIcon} size={15} /> : <HugeiconsIcon icon={SchoolIcon} size={15} />}
                {currentAudience.label}
              </span>
              <h3 className="mt-6 max-w-xl font-heading text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">{currentAudience.title}</h3>
              <p className="mt-5 max-w-xl text-base leading-7 text-blue-100/80 sm:text-lg">{currentAudience.description}</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {currentAudience.bullets.map((bullet) => (
                  <div key={bullet} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/5 p-3.5 text-sm font-semibold text-blue-50">
                    <HugeiconsIcon icon={Tick01Icon} size={17} className="mt-0.5 shrink-0 text-orange-300" />
                    {bullet}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex min-h-[390px] items-center justify-center overflow-hidden border-t border-white/10 bg-brand-deep p-8 lg:border-l lg:border-t-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,161,228,0.18),transparent_62%)]" />
              <div key={`${audience}-visual`} className="home-tab-enter relative w-full max-w-sm">
                {audience === 'student' ? (
                  <div className="relative rounded-[1.75rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur">
                    <div className="flex items-center justify-between">
                      <div><p className="text-xs font-bold text-blue-200">Nível 8</p><p className="mt-1 font-heading text-xl font-extrabold">Explorador digital</p></div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-white"><HugeiconsIcon icon={Award01Icon} size={25} /></div>
                    </div>
                    <div className="mt-7 h-3 overflow-hidden rounded-full bg-white/10"><div className="home-progress h-full w-[78%] rounded-full bg-gradient-to-r from-secondary to-amber-300" /></div>
                    <div className="mt-5 grid grid-cols-3 gap-3">
                      {[['1.840', 'XP'], ['12', 'ofensiva'], ['#4', 'ranking']].map(([value, label]) => <div key={label} className="rounded-xl bg-white/8 p-3 text-center"><p className="font-heading text-lg font-extrabold">{value}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-blue-200">{label}</p></div>)}
                    </div>
                    <div className="home-float absolute -right-5 -top-5 flex items-center gap-2 rounded-product-control bg-white px-3 py-2 text-brand-ink shadow-xl"><HugeiconsIcon icon={FireIcon} size={18} className="text-orange-500" /><span className="text-xs font-extrabold">Sequência mantida!</span></div>
                  </div>
                ) : (
                  <div className="relative rounded-[1.75rem] border border-white/15 bg-white p-5 text-slate-900 shadow-2xl">
                    <div className="flex items-center justify-between"><div><p className="text-xs font-bold text-slate-400">Visão da turma</p><p className="mt-1 font-heading text-xl font-extrabold text-brand-ink">Inclusão Digital</p></div><div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-600">84% ativos</div></div>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-sky-50 p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Progresso médio</p><p className="mt-2 font-heading text-2xl font-extrabold text-primary">68%</p></div>
                      <div className="rounded-xl bg-orange-50 p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Para acompanhar</p><p className="mt-2 font-heading text-2xl font-extrabold text-orange-600">3 alunos</p></div>
                    </div>
                    <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-100 p-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><HugeiconsIcon icon={SparklesIcon} size={18} /></div><div><p className="text-xs font-extrabold">Inteligência pedagógica</p><p className="text-[10px] font-semibold text-slate-400">Novo insight disponível</p></div></div>
                    <div className="home-float absolute -left-5 -bottom-5 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-white shadow-xl"><HugeiconsIcon icon={TrendingUp} size={18} /><span className="text-xs font-extrabold">Turma evoluindo</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-brand-warm px-5 py-24 sm:px-8 sm:py-32 lg:px-10">
        <div className="mx-auto max-w-[1180px]">
          <div className="home-animate grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-white shadow-lg shadow-orange-500/20"><HugeiconsIcon icon={GameControllerIcon} size={27} /></span>
              <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">Arena Estudea</p>
              <h2 className="brand-section-title mt-4 !text-4xl sm:!text-5xl">A sala inteira entra no jogo.</h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">Quizzes ao vivo com PIN, pontuação instantânea e pódio. O professor cria o momento; a turma aprende disputando, colaborando e celebrando.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {['Tempo real', 'Pódio automático', 'Ranking da turma'].map((tag) => <span key={tag} className="rounded-full border border-orange-200 bg-white px-4 py-2 text-xs font-extrabold text-orange-700 shadow-sm">{tag}</span>)}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-2xl">
              <div className="absolute -inset-5 rotate-2 rounded-[2.5rem] bg-gradient-to-br from-orange-300/45 to-sky-300/35 blur-sm" />
              <div className="relative overflow-hidden rounded-product-display bg-brand-deep p-5 shadow-2xl shadow-blue-950/25 sm:p-8">
                <div className="flex items-center justify-between text-white"><div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.8)]" /><span className="text-xs font-extrabold uppercase tracking-wider text-blue-200">Arena ao vivo</span></div><span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-extrabold">PIN 482 163</span></div>
                <div className="mt-7 rounded-2xl bg-white p-5 text-center sm:p-7"><p className="text-xs font-extrabold uppercase tracking-wider text-violet-500">Pergunta 6 de 10</p><h3 className="mx-auto mt-3 max-w-md font-heading text-xl font-extrabold leading-snug text-slate-900 sm:text-2xl">Qual atalho usamos para copiar um arquivo?</h3><div className="mt-6 grid grid-cols-2 gap-3 text-sm font-extrabold"><div className="rounded-xl bg-sky-500 p-4 text-white">Ctrl + C</div><div className="rounded-xl bg-violet-500 p-4 text-white">Ctrl + V</div><div className="rounded-xl bg-orange-500 p-4 text-white">Alt + F4</div><div className="rounded-xl bg-emerald-500 p-4 text-white">Ctrl + Z</div></div></div>
                <div className="mt-5 flex items-center justify-between text-xs font-bold text-blue-200"><span>24 respostas</span><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-secondary" /> 08 segundos</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-24 sm:px-8 sm:py-32 lg:px-10">
        <div className="mx-auto max-w-[1180px]">
          <div className="home-animate max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Simples para começar</p>
            <h2 className="brand-section-title mt-4 !text-4xl sm:!text-5xl">Do primeiro acesso ao próximo salto.</h2>
          </div>
          <div className="mt-14 grid gap-4 lg:grid-cols-3">
            {journeySteps.map((step, index) => (
              <div key={step.number} className="home-animate group relative overflow-hidden rounded-product-panel border border-slate-200 bg-slate-50/70 p-7 transition-all hover:border-primary/20 hover:bg-white hover:shadow-product-elevated" style={{ transitionDelay: `${index * 80}ms` }}>
                <span className="font-heading text-5xl font-extrabold tracking-[-0.06em] text-slate-200 transition-colors group-hover:text-primary/20">{step.number}</span>
                <h3 className="mt-10 font-heading text-xl font-extrabold text-slate-900">{step.title}</h3>
                <p className="mt-3 leading-7 text-slate-600">{step.description}</p>
                {index < 2 && <HugeiconsIcon icon={ArrowRight01Icon} className="absolute right-6 top-8 hidden text-slate-300 lg:block" size={23} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="open-source" className="px-5 pb-24 sm:px-8 sm:pb-32 lg:px-10">
        <div className="home-animate relative mx-auto max-w-[1180px] overflow-hidden rounded-product-display bg-gradient-to-br from-brand-navy via-brand-mid to-brand-bright px-6 py-16 text-white shadow-product-display sm:px-12 lg:px-16 lg:py-20">
          <div className="home-dark-grid pointer-events-none absolute inset-0 opacity-30" />
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="relative grid gap-12 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <div className="flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-blue-100">100% gratuito</span><span className="rounded-full bg-orange-400/20 px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-orange-200">Open source</span></div>
              <h2 className="mt-6 font-heading text-4xl font-extrabold tracking-[-0.05em] sm:text-5xl">Tecnologia de educação deve abrir portas, não criar barreiras.</h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100/85">Criado pela Oxente Code para escolas, projetos sociais, ONGs e educadores que fazem inclusão digital acontecer — do básico ao avançado.</p>
            </div>
            <div className="grid min-w-[230px] gap-3">
              {[['MIT', 'licença aberta'], ['Brasil', 'feito com propósito'], ['∞', 'possibilidades']].map(([value, label]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/8 px-5 py-4 backdrop-blur"><p className="font-heading text-2xl font-extrabold text-orange-300">{value}</p><p className="mt-1 text-xs font-bold text-blue-100">{label}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-brand-warm-strong px-5 py-24 text-center sm:px-8 sm:py-32 lg:px-10">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-200/50 blur-3xl" />
        <div className="home-animate relative mx-auto max-w-4xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-secondary text-white shadow-xl shadow-orange-500/20"><HugeiconsIcon icon={Rocket01Icon} size={30} /></div>
          <p className="mt-7 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">Seu próximo passo começa aqui</p>
          <h2 className="brand-section-title mt-4 sm:!text-6xl">Pronto para aprender fazendo?</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">Entre para uma experiência de educação digital viva, prática e feita para acompanhar cada conquista.</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={onStudentSignup} className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary px-8 py-4 font-heading font-extrabold text-white shadow-xl shadow-orange-500/20 transition-all hover:-translate-y-1 hover:bg-orange-500">Criar minha conta grátis <HugeiconsIcon icon={ArrowRight01Icon} size={19} className="transition-transform group-hover:translate-x-1" /></button>
            <button type="button" onClick={onTeacherSignup} className="inline-flex items-center justify-center gap-2 rounded-product-card border border-slate-200 bg-white px-8 py-4 font-heading font-extrabold text-brand-navy shadow-sm transition-all hover:-translate-y-1 hover:border-primary/25"><HugeiconsIcon icon={SchoolIcon} size={19} /> Levar para minha turma</button>
          </div>
          <button type="button" onClick={onLogin} className="mt-6 text-sm font-bold text-slate-500 transition-colors hover:text-primary">Já usa o Estudea? <span className="underline decoration-slate-300 underline-offset-4">Entrar na plataforma</span></button>
        </div>
      </section>

      <footer className="bg-brand-deep px-5 py-10 text-blue-100 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><img src={logoIcon} alt="" className="h-11 w-11 rounded-xl object-contain" /><div><p className="font-heading text-lg font-extrabold text-white">estudea</p><p className="text-xs font-semibold text-blue-200/70">Educação digital que transforma.</p></div></div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold"><a href="#recursos" className="transition-colors hover:text-white">Recursos</a><a href="#para-quem" className="transition-colors hover:text-white">Para quem</a><a href="#open-source" className="transition-colors hover:text-white">Open source</a><button type="button" onClick={onLogin} className="transition-colors hover:text-white">Entrar</button></div>
          <p className="text-xs font-semibold text-blue-200/60">Feito com <span className="text-orange-400">♥</span> pela Oxente Code</p>
        </div>
      </footer>
    </div>
  );
}
