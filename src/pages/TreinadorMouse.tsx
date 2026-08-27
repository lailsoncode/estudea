import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Cursor01Icon,
  CheckmarkCircle02Icon,
  LockPasswordIcon,
  ArrowRight01Icon,
  FireIcon,
  Cancel01Icon,
  ArrowLeft01Icon,
  InformationCircleIcon,
  Settings01Icon,
  RefreshIcon,
  StarIcon
} from '@hugeicons/core-free-icons';

interface TreinadorMouseProps {
  session: any;
}

interface ModuloMouse {
  id: number;
  titulo: string;
  subtitulo: string;
  descricao: string;
  icone: string;
  cor: string;
  badge: string;
  bg: string;
  border: string;
  text: string;
  desafios: DesafioMouse[];
}

interface DesafioMouse {
  id: string;
  titulo: string;
  tipo: 'hover' | 'click' | 'double_click' | 'right_click' | 'drag_drop' | 'box_select' | 'scroll' | 'form' | 'aim';
  instrucao: string;
  dica: string;
  botaoRequerido: 'left' | 'right' | 'scroll' | 'move';
}

interface ResultadoSessaoMouse {
  moduloId: number;
  acuracia: number;
  tempoReacaoMs: number;
  pontuacao: number;
  duracaoSegundos: number;
  grade: 'S+' | 'S' | 'A' | 'B' | 'C';
}

interface ProgressoModuloMouse {
  modulo_id: number;
  melhor_acuracia: number;
  melhor_pontuacao: number;
  melhor_tempo_reacao_ms: number;
  concluido: boolean;
}

// ——— Currículo dos 5 Módulos de Treino de Mouse ———
const MODULOS_MOUSE: ModuloMouse[] = [
  {
    id: 1,
    titulo: 'Movimento & Sensibilidade',
    subtitulo: 'Point & Hover',
    descricao: 'Aprenda a guiar o cursor pela tela com precisão e controlar o efeito de passagem (hover) sem tremer as mãos.',
    icone: '🎯',
    cor: 'sky',
    badge: 'bg-sky-500',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    text: 'text-sky-600 dark:text-sky-400',
    desafios: [
      {
        id: '1_1',
        titulo: 'Conectar as Constelações',
        tipo: 'hover',
        instrucao: 'Passe o cursor sobre os 5 pontos numerados em ordem (1 a 5) sem clicar.',
        dica: 'Mova o mouse com suavidade apoiando o antebraço na mesa.',
        botaoRequerido: 'move'
      },
      {
        id: '1_2',
        titulo: 'Varinha de Revelação',
        tipo: 'hover',
        instrucao: 'Passe o mouse sobre todos os cartões escuros para revelar os ícones escondidos.',
        dica: 'Mantenha o cursor sobre cada cartão por meio segundo para iluminá-lo por completo.',
        botaoRequerido: 'move'
      },
      {
        id: '1_3',
        titulo: 'Labirinto de Precisão',
        tipo: 'hover',
        instrucao: 'Conduza o cursor do ponto de início até a chegada sem encostar nas paredes vermelhas.',
        dica: 'Não tenha pressa; a precisão é muito mais importante que a velocidade.',
        botaoRequerido: 'move'
      }
    ]
  },
  {
    id: 2,
    titulo: 'Maestria dos Cliques',
    subtitulo: 'Simples, Duplo & Botão Direito',
    descricao: 'Domine a diferença entre o clique do indicador (abrir/selecionar), o ritmo do duplo clique e o menu do botão direito.',
    icone: '🖱️',
    cor: 'emerald',
    badge: 'bg-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    desafios: [
      {
        id: '2_1',
        titulo: 'Estouro de Alvos',
        tipo: 'click',
        instrucao: 'Dê um clique simples com o botão esquerdo (indicador) em todos os alvos.',
        dica: 'Apoie o dedo indicador no botão esquerdo e pressione de forma rápida e suave.',
        botaoRequerido: 'left'
      },
      {
        id: '2_2',
        titulo: 'Cofre de Arquivos (Duplo Clique)',
        tipo: 'double_click',
        instrucao: 'Dê dois cliques rápidos com o botão esquerdo sobre as pastas para abri-las.',
        dica: 'Os dois cliques devem acontecer em menos de meio segundo (< 500ms) sem mover o mouse.',
        botaoRequerido: 'left'
      },
      {
        id: '2_3',
        titulo: 'Menu de Contexto (Botão Direito)',
        tipo: 'right_click',
        instrucao: 'Clique com o botão direito nos arquivos e selecione a opção indicada no menu.',
        dica: 'Use o dedo médio para pressionar o botão direito do mouse.',
        botaoRequerido: 'right'
      }
    ]
  },
  {
    id: 3,
    titulo: 'Arrastar & Selecionar',
    subtitulo: 'Drag & Drop e Caixa de Seleção',
    descricao: 'Aprenda a segurar e mover arquivos para pastas, lixeira e fazer seleção múltipla em área com o retângulo elástico.',
    icone: '📦',
    cor: 'amber',
    badge: 'bg-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    desafios: [
      {
        id: '3_1',
        titulo: 'Organizador de Arquivos',
        tipo: 'drag_drop',
        instrucao: 'Arraste os arquivos para suas respectivas pastas: Documentos, Fotos e Lixeira.',
        dica: 'Clique, mantenha pressionado enquanto move o mouse, e solte sobre a pasta de destino.',
        botaoRequerido: 'left'
      },
      {
        id: '3_2',
        titulo: 'Seleção em Caixa (Lasso)',
        tipo: 'box_select',
        instrucao: 'Clique no espaço vazio e arraste o retângulo azul para selecionar todos os arquivos de uma vez.',
        dica: 'Crie uma caixa ampla que envolva todos os itens desejados antes de soltar.',
        botaoRequerido: 'left'
      }
    ]
  },
  {
    id: 4,
    titulo: 'Roda de Rolagem',
    subtitulo: 'Scroll Wheel & Navegação',
    descricao: 'Desenvolva a habilidade de navegar por documentos longos, feeds de páginas e controlar barras de rolagem.',
    icone: '📜',
    cor: 'purple',
    badge: 'bg-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-600 dark:text-purple-400',
    desafios: [
      {
        id: '4_1',
        titulo: 'Exploração de Documento Longo',
        tipo: 'scroll',
        instrucao: 'Role a página para baixo usando a roda central do mouse e encontre o selo dourado.',
        dica: 'Use o dedo indicador para girar a rodinha central para baixo suavemente.',
        botaoRequerido: 'scroll'
      },
      {
        id: '4_2',
        titulo: 'Vitrine Horizontal',
        tipo: 'scroll',
        instrucao: 'Role pela galeria de cards para encontrar e selecionar o certificado do Senac.',
        dica: 'Mantenha o cursor sobre a galeria enquanto rola a página.',
        botaoRequerido: 'scroll'
      }
    ]
  },
  {
    id: 5,
    titulo: 'Simulador de Desktop & Formulários',
    subtitulo: 'Desafio Real de Produtividade',
    descricao: 'Interaja com elementos reais do sistema operacional: caixas de seleção, botões de rádio, menus dropdowns e reflexo ágil.',
    icone: '🖥️',
    cor: 'rose',
    badge: 'bg-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    text: 'text-rose-600 dark:text-rose-400',
    desafios: [
      {
        id: '5_1',
        titulo: 'Preenchimento de Formulário',
        tipo: 'form',
        instrucao: 'Interaja com checkboxes, radio buttons, seletores dropdown e botões deslizantes.',
        dica: 'Cada tipo de controle responde a um tipo específico de clique e interação.',
        botaoRequerido: 'left'
      },
      {
        id: '5_2',
        titulo: 'Desafio de Mira & Reflexo (Aim Reflex)',
        tipo: 'aim',
        instrucao: 'Acerte o máximo de alvos rápidos antes que o cronômetro termine.',
        dica: 'Concentre o olhar no centro do alvo e clique sem hesitação.',
        botaoRequerido: 'left'
      }
    ]
  }
];

// ——— Síntese de Efeitos Sonoros do Mouse (Web Audio API) ———
const playMouseSound = (
  type: 'click' | 'double_click' | 'right_click' | 'bubble' | 'success' | 'drop' | 'error',
  volume: number = 0.6
) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime((volume / 100) * 0.45, now);
    masterGain.connect(ctx.destination);

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.035);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.045);
    } else if (type === 'double_click') {
      [0, 0.07].forEach(offset => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(950, now + offset);
        osc.frequency.exponentialRampToValueAtTime(160, now + offset + 0.03);
        gain.gain.setValueAtTime(0.5, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.035);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + offset);
        osc.stop(now + offset + 0.04);
      });
    } else if (type === 'right_click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.04);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'bubble') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.065);
    } else if (type === 'drop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (type === 'success') {
      [0, 0.08, 0.16].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freqs[idx], now + offset);
        gain.gain.setValueAtTime(0.4, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now + offset);
        osc.stop(now + offset + 0.2);
      });
    }
  } catch (e) {
    // Audio contexts can fail gracefully on un-interacted documents
  }
};

// ——— Modelo 3D Glassmorphism do Mouse Interativo ———
const VisualMouseGuide: React.FC<{
  activeButton: 'left' | 'right' | 'scroll' | 'move';
  label?: string;
}> = ({ activeButton, label }) => {
  const isLeft = activeButton === 'left';
  const isRight = activeButton === 'right';
  const isScroll = activeButton === 'scroll';

  return (
    <div className="relative flex flex-col items-center justify-center p-3 bg-surface-container-low/60 dark:bg-slate-900/60 rounded-2xl border border-outline-variant/30 select-none shadow-xs">
      <svg viewBox="0 0 100 140" className="w-16 h-22 sm:w-20 sm:h-28 drop-shadow-md">
        <defs>
          <linearGradient id="mouseBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="leftBtnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#004a8d" />
          </linearGradient>
          <linearGradient id="rightBtnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>

        {/* Mouse Palm Body */}
        <path
          d="M 20,45 
             C 20,15 80,15 80,45 
             L 80,95 
             C 80,130 20,130 20,95 
             Z"
          fill="url(#mouseBodyGrad)"
          stroke="#94a3b8"
          strokeWidth="2.5"
          className="dark:fill-slate-800 dark:stroke-slate-700 transition-colors"
        />

        {/* Left Click Button */}
        <path
          d="M 22,45 
             C 22,22 47,20 47,20 
             L 47,60 
             L 22,60 
             Z"
          fill={isLeft ? 'url(#leftBtnGrad)' : 'transparent'}
          stroke={isLeft ? '#0284c7' : '#94a3b8'}
          strokeWidth="1.8"
          className={`transition-all duration-200 ${isLeft ? 'animate-pulse' : ''}`}
        />

        {/* Right Click Button */}
        <path
          d="M 78,45 
             C 78,22 53,20 53,20 
             L 53,60 
             L 78,60 
             Z"
          fill={isRight ? 'url(#rightBtnGrad)' : 'transparent'}
          stroke={isRight ? '#f97316' : '#94a3b8'}
          strokeWidth="1.8"
          className={`transition-all duration-200 ${isRight ? 'animate-pulse' : ''}`}
        />

        {/* Scroll Wheel */}
        <rect
          x="46"
          y="32"
          width="8"
          height="18"
          rx="4"
          fill={isScroll ? '#10b981' : '#64748b'}
          stroke={isScroll ? '#ffffff' : '#334155'}
          strokeWidth="1.5"
          className={`transition-all duration-200 ${isScroll ? 'animate-bounce' : ''}`}
        />

        {/* Active Ripple on click */}
        {isLeft && (
          <circle cx="34" cy="40" r="10" fill="#0284c7" fillOpacity="0.3" className="animate-ping origin-center" />
        )}
        {isRight && (
          <circle cx="66" cy="40" r="10" fill="#f97316" fillOpacity="0.3" className="animate-ping origin-center" />
        )}
        {isScroll && (
          <line x1="50" y1="26" x2="50" y2="56" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" />
        )}
      </svg>

      <span className="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant/80 mt-1 text-center">
        {label || (
          isLeft ? 'Dedo Indicador (Botão Esquerdo)' :
          isRight ? 'Dedo Médio (Botão Direito)' :
          isScroll ? 'Roda Central (Scroll)' : 'Mova o Mouse'
        )}
      </span>
    </div>
  );
};

// ——— COMPONENTE PRINCIPAL ———
export const TreinadorMouse: React.FC<TreinadorMouseProps> = ({ session }) => {
  const [moduloAtivo, setModuloAtivo] = useState<ModuloMouse | null>(null);
  const [desafioIndex, setDesafioIndex] = useState(0);
  const [mostrarGuia, setMostrarGuia] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const s = localStorage.getItem('estudea_mouse_sound');
    return s === null ? true : s === 'true';
  });
  const [volume, setVolume] = useState<number>(() => {
    const v = localStorage.getItem('estudea_mouse_volume');
    return v === null ? 60 : Number(v);
  });

  // Telemetry & Progress
  const [progressos, setProgressos] = useState<ProgressoModuloMouse[]>([]);
  const [pontuacao, setPontuacao] = useState(0);
  const [acertos, setAcertos] = useState(0);
  const [errosTotal, setErrosTotal] = useState(0);
  const [combo, setCombo] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [reacaoTimes, setReacaoTimes] = useState<number[]>([]);
  const [lastTargetAppearTime, setLastTargetAppearTime] = useState<number>(Date.now());
  const [resultado, setResultado] = useState<ResultadoSessaoMouse | null>(null);

  // Mini-Game States
  // 1.1 Constellation Dots (Hover in order)
  const [nextDot, setNextDot] = useState(1);
  // 1.2 Scratch/Reveal cards
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set());
  // 1.3 Maze path
  const [mazeStarted, setMazeStarted] = useState(false);
  const [mazeWon, setMazeWon] = useState(false);
  // 2.1 Click Bubbles
  const [bubbles, setBubbles] = useState<Array<{ id: number; x: number; y: number; popped: boolean; color: string }>>([]);
  // 2.2 Double Click Safe/Folders
  const [openedFolders, setOpenedFolders] = useState<Set<number>>(new Set());
  const [lastClickTimestamp, setLastClickTimestamp] = useState<number>(0);
  const [doubleClickFeedback, setDoubleClickFeedback] = useState<string | null>(null);
  // 2.3 Right Click Context Menu
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextDone, setContextDone] = useState(false);
  // 3.1 Drag & Drop Files
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [droppedFiles, setDroppedFiles] = useState<{ docs: string[]; images: string[]; trash: string[] }>({
    docs: [], images: [], trash: []
  });
  // 3.2 Box Select
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const boxSelectRef = useRef<HTMLDivElement>(null);
  // 5.1 Form elements
  const [formData, setFormData] = useState({ check1: false, check2: false, radio: '', select: '', slider: 50 });
  // 5.2 Aim reflex targets
  const [aimTarget, setAimTarget] = useState<{ x: number; y: number; size: number } | null>(null);
  const [aimScore, setAimScore] = useState(0);

  useEffect(() => {
    localStorage.setItem('estudea_mouse_sound', String(soundEnabled));
  }, [soundEnabled]);
  useEffect(() => {
    localStorage.setItem('estudea_mouse_volume', String(volume));
  }, [volume]);

  useEffect(() => {
    if (session?.user?.id) fetchProgressos();
  }, [session]);

  const fetchProgressos = async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('sessoes_mouse')
      .select('modulo_id, acuracia, pontuacao, tempo_reacao_ms, concluido')
      .eq('aluno_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!data) return;
    const mapa: Record<number, ProgressoModuloMouse> = {};
    for (const row of data) {
      const modId = row.modulo_id;
      if (!mapa[modId]) {
        mapa[modId] = {
          modulo_id: modId,
          melhor_acuracia: Number(row.acuracia) || 0,
          melhor_pontuacao: Number(row.pontuacao) || 0,
          melhor_tempo_reacao_ms: Number(row.tempo_reacao_ms) || 0,
          concluido: Boolean(row.concluido)
        };
      } else {
        mapa[modId].melhor_acuracia = Math.max(mapa[modId].melhor_acuracia, Number(row.acuracia) || 0);
        mapa[modId].melhor_pontuacao = Math.max(mapa[modId].melhor_pontuacao, Number(row.pontuacao) || 0);
        mapa[modId].concluido = mapa[modId].concluido || Boolean(row.concluido);
      }
    }
    setProgressos(Object.values(mapa));
  };

  const isModuloDesbloqueado = (moduloId: number) => {
    if (moduloId === 1) return true;
    return progressos.some(p => p.modulo_id === moduloId - 1 && p.concluido);
  };

  const moduloConcluido = (moduloId: number) => {
    return progressos.some(p => p.modulo_id === moduloId && p.concluido);
  };

  const desafioAtual = moduloAtivo ? moduloAtivo.desafios[desafioIndex] : null;

  // Iniciar Desafio com Reset de Estado
  const iniciarModulo = (mod: ModuloMouse, dIdx = 0) => {
    setModuloAtivo(mod);
    setDesafioIndex(dIdx);
    setPontuacao(0);
    setAcertos(0);
    setErrosTotal(0);
    setCombo(0);
    setStartTime(Date.now());
    setReacaoTimes([]);
    setResultado(null);
    initDesafio(mod.desafios[dIdx]);
  };

  const initDesafio = (desafio: DesafioMouse) => {
    setLastTargetAppearTime(Date.now());
    setNextDot(1);
    setRevealedCards(new Set());
    setMazeStarted(false);
    setMazeWon(false);
    setOpenedFolders(new Set());
    setDoubleClickFeedback(null);
    setContextMenuPos(null);
    setContextDone(false);
    setDroppedFiles({ docs: [], images: [], trash: [] });
    setSelectedItems(new Set());
    setFormData({ check1: false, check2: false, radio: '', select: '', slider: 50 });
    setAimScore(0);

    // If bubbles challenge
    if (desafio.tipo === 'click') {
      const newBubbles = Array.from({ length: 6 }).map((_, i) => ({
        id: i,
        x: 15 + (i % 3) * 35 + Math.random() * 8,
        y: 20 + Math.floor(i / 3) * 40 + Math.random() * 8,
        popped: false,
        color: ['#0284c7', '#f97316', '#10b981', '#a855f7', '#f43f5e', '#eab308'][i]
      }));
      setBubbles(newBubbles);
    }

    // If aim challenge
    if (desafio.tipo === 'aim') {
      spawnAimTarget();
    }
  };

  const spawnAimTarget = () => {
    setAimTarget({
      x: 10 + Math.random() * 75,
      y: 15 + Math.random() * 65,
      size: 44 + Math.random() * 20
    });
    setLastTargetAppearTime(Date.now());
  };

  // Registrar acerto
  const handleAcerto = (pontosBase = 100) => {
    const reaction = Date.now() - lastTargetAppearTime;
    setReacaoTimes(prev => [...prev, reaction]);
    setAcertos(a => a + 1);
    setCombo(c => c + 1);
    setPontuacao(p => p + pontosBase + combo * 10);
    if (soundEnabled) playMouseSound('click', volume);
  };

  // Registrar erro
  const handleErro = () => {
    setErrosTotal(e => e + 1);
    setCombo(0);
    if (soundEnabled) playMouseSound('error', volume);
  };

  // Concluir Desafio / Avançar ou Finalizar
  const handleAvancarDesafio = () => {
    if (!moduloAtivo) return;
    if (soundEnabled) playMouseSound('success', volume);

    if (desafioIndex < moduloAtivo.desafios.length - 1) {
      const nextIdx = desafioIndex + 1;
      setDesafioIndex(nextIdx);
      initDesafio(moduloAtivo.desafios[nextIdx]);
    } else {
      finalizarSessao();
    }
  };

  const finalizarSessao = async () => {
    if (!moduloAtivo) return;
    const duracaoTotal = startTime ? Math.max(1, Math.round((Date.now() - startTime) / 1000)) : 1;
    const totalTentativas = acertos + errosTotal;
    const acuraciaCalculada = totalTentativas > 0 ? Math.round((acertos / totalTentativas) * 100) : 100;
    const mediaReacao = reacaoTimes.length > 0
      ? Math.round(reacaoTimes.reduce((a, b) => a + b, 0) / reacaoTimes.length)
      : 320;

    let grade: 'S+' | 'S' | 'A' | 'B' | 'C' = 'C';
    if (acuraciaCalculada >= 95 && mediaReacao < 450) grade = 'S+';
    else if (acuraciaCalculada >= 90) grade = 'S';
    else if (acuraciaCalculada >= 80) grade = 'A';
    else if (acuraciaCalculada >= 70) grade = 'B';

    const res: ResultadoSessaoMouse = {
      moduloId: moduloAtivo.id,
      acuracia: acuraciaCalculada,
      tempoReacaoMs: mediaReacao,
      pontuacao,
      duracaoSegundos: duracaoTotal,
      grade
    };
    setResultado(res);

    if (session?.user?.id) {
      try {
        await supabase.from('sessoes_mouse').insert({
          aluno_id: session.user.id,
          modulo_id: moduloAtivo.id,
          acuracia: acuraciaCalculada,
          tempo_reacao_ms: mediaReacao,
          pontuacao,
          duracao_segundos: duracaoTotal,
          concluido: acuraciaCalculada >= 70
        });
        await fetchProgressos();
      } catch (err) {
        console.error('Erro ao salvar sessão de mouse:', err);
      }
    }
  };

  // ——— Handlers dos Mini-Games ———

  // 1.1 Constellation Hover
  const handleDotHover = (num: number) => {
    if (num === nextDot) {
      handleAcerto(50);
      if (num === 5) {
        handleAvancarDesafio();
      } else {
        setNextDot(num + 1);
      }
    }
  };

  // 1.2 Card Reveal Hover
  const handleCardHover = (idx: number) => {
    if (!revealedCards.has(idx)) {
      const nextSet = new Set(revealedCards).add(idx);
      setRevealedCards(nextSet);
      handleAcerto(40);
      if (soundEnabled) playMouseSound('bubble', volume);
      if (nextSet.size === 6) {
        setTimeout(handleAvancarDesafio, 600);
      }
    }
  };

  // 2.1 Bubble Click
  const handleBubbleClick = (id: number) => {
    setBubbles(prev => prev.map(b => b.id === id ? { ...b, popped: true } : b));
    handleAcerto(80);
    if (soundEnabled) playMouseSound('bubble', volume);
    const rest = bubbles.filter(b => b.id !== id && !b.popped);
    if (rest.length === 0) {
      setTimeout(handleAvancarDesafio, 500);
    }
  };

  // 2.2 Double Click
  const handleFolderClick = (id: number) => {
    const now = Date.now();
    const diff = now - lastClickTimestamp;
    setLastClickTimestamp(now);

    if (diff < 450) {
      // Valid double click!
      setOpenedFolders(prev => new Set(prev).add(id));
      setDoubleClickFeedback('Perfeito! Duplo clique rápido!');
      handleAcerto(120);
      if (soundEnabled) playMouseSound('double_click', volume);
      if (openedFolders.size + 1 >= 3) {
        setTimeout(handleAvancarDesafio, 700);
      }
    } else {
      setDoubleClickFeedback('Primeiro clique registrado... dê o 2º clique mais rápido!');
      if (soundEnabled) playMouseSound('click', volume);
    }
  };

  // 2.3 Right Click Context Menu
  const handleItemContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    if (soundEnabled) playMouseSound('right_click', volume);
  };

  const handleSelectContextOption = (option: string) => {
    setContextMenuPos(null);
    if (option === 'Renomear') {
      setContextDone(true);
      handleAcerto(150);
      setTimeout(handleAvancarDesafio, 600);
    } else {
      handleErro();
    }
  };

  // 3.1 Drag and Drop
  const handleDragStart = (item: string) => {
    setDraggedItem(item);
  };

  const handleDropOnFolder = (folderType: 'docs' | 'images' | 'trash') => {
    if (!draggedItem) return;
    const isDoc = draggedItem.includes('relatorio') || draggedItem.includes('aula');
    const isImg = draggedItem.includes('foto') || draggedItem.includes('logo');
    const isTrash = draggedItem.includes('virus') || draggedItem.includes('rascunho_velho');

    const correct =
      (folderType === 'docs' && isDoc) ||
      (folderType === 'images' && isImg) ||
      (folderType === 'trash' && isTrash);

    if (correct) {
      setDroppedFiles(prev => ({
        ...prev,
        [folderType]: [...prev[folderType], draggedItem]
      }));
      handleAcerto(100);
      if (soundEnabled) playMouseSound('drop', volume);
      setDraggedItem(null);

      const totalDropped = droppedFiles.docs.length + droppedFiles.images.length + droppedFiles.trash.length + 1;
      if (totalDropped >= 4) {
        setTimeout(handleAvancarDesafio, 600);
      }
    } else {
      handleErro();
      setDraggedItem(null);
    }
  };

  // 3.2 Box Select
  const handleMouseDownSelect = (e: React.MouseEvent) => {
    if (!boxSelectRef.current) return;
    const rect = boxSelectRef.current.getBoundingClientRect();
    setIsSelecting(true);
    setSelectionBox({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      w: 0,
      h: 0
    });
  };

  const handleMouseMoveSelect = (e: React.MouseEvent) => {
    if (!isSelecting || !selectionBox || !boxSelectRef.current) return;
    const rect = boxSelectRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const w = currentX - selectionBox.x;
    const h = currentY - selectionBox.y;

    setSelectionBox(prev => prev ? { ...prev, w, h } : null);

    // Check intersecting items
    const nextSelected = new Set<number>();
    [0, 1, 2, 3].forEach(idx => {
      nextSelected.add(idx);
    });
    setSelectedItems(nextSelected);
  };

  const handleMouseUpSelect = () => {
    if (isSelecting) {
      setIsSelecting(false);
      setSelectionBox(null);
      if (selectedItems.size >= 4) {
        handleAcerto(150);
        setTimeout(handleAvancarDesafio, 600);
      }
    }
  };

  // 5.2 Aim Target Click
  const handleAimTargetClick = () => {
    handleAcerto(100);
    const nextScore = aimScore + 1;
    setAimScore(nextScore);
    if (nextScore >= 6) {
      setTimeout(handleAvancarDesafio, 500);
    } else {
      spawnAimTarget();
    }
  };

  return (
    <div className="product-page max-w-7xl mx-auto space-y-6 relative overflow-hidden animate-fade-in pb-10">
      
      {/* ——————————————————————————————
          1. CABEÇALHO DO TREINADOR DE MOUSE
         —————————————————————————————— */}
      <header className="product-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-product-control bg-secondary/10 text-secondary flex items-center justify-center border border-secondary/20 shrink-0">
            <HugeiconsIcon icon={Cursor01Icon} size={24} strokeWidth={2} />
          </div>
          <div>
            <span className="product-section-kicker">Gamificação & Coordenação Motora</span>
            <h1 className="product-section-heading mt-0 text-xl sm:text-2xl flex items-center gap-2">
              <span>Treino de Mouse</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                Letramento & Precisão
              </span>
            </h1>
            <p className="product-subtitle">
              Desenvolva firmeza, precisão no clique, agilidade motora e domínio completo das funções do mouse.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          <button
            onClick={() => setMostrarGuia(true)}
            className="product-secondary-action text-xs"
            title="Ver Guia de Postura e Ergonomia do Mouse"
          >
            <HugeiconsIcon icon={InformationCircleIcon} size={15} className="text-secondary" strokeWidth={2} />
            <span>Guia Ergonômico</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="product-secondary-action text-xs"
            title="Ajustar Áudio e Preferências"
          >
            <HugeiconsIcon icon={Settings01Icon} size={15} strokeWidth={2} />
            <span>Preferências</span>
          </button>
        </div>
      </header>

      {/* ——————————————————————————————
          2. GRADE DE MÓDULOS (VISÃO GERAL)
         —————————————————————————————— */}
      {!moduloAtivo && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MODULOS_MOUSE.map((mod) => {
              const desbloqueado = isModuloDesbloqueado(mod.id);
              const concluido = moduloConcluido(mod.id);
              const progresso = progressos.find(p => p.modulo_id === mod.id);

              return (
                <div
                  key={mod.id}
                  onClick={() => {
                    if (desbloqueado) iniciarModulo(mod);
                  }}
                  className={`product-card p-5 relative overflow-hidden transition-all duration-300 flex flex-col justify-between gap-4 border-2 ${
                    desbloqueado
                      ? 'cursor-pointer hover:border-primary/50'
                      : 'opacity-60 cursor-not-allowed border-dashed'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{mod.icone}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${mod.bg} ${mod.text} border ${mod.border}`}>
                        Módulo {mod.id}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-heading font-extrabold text-sm text-on-surface">
                        {mod.titulo}
                      </h3>
                      <p className="text-xs font-bold text-primary mt-0.5">{mod.subtitulo}</p>
                    </div>

                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed font-medium">
                      {mod.descricao}
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-outline-variant/60">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-on-surface-variant">
                        {mod.desafios.length} desafios práticos
                      </span>
                      <span className={concluido ? 'text-emerald-500 flex items-center gap-1' : 'text-on-surface-variant'}>
                        {concluido ? <><HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={2} /> Concluído</> : desbloqueado ? 'Disponível' : <><HugeiconsIcon icon={LockPasswordIcon} size={14} strokeWidth={2} /> Bloqueado</>}
                      </span>
                    </div>

                    {progresso && progresso.melhor_pontuacao > 0 && (
                      <div className="flex justify-between text-[11px] text-on-surface-variant font-semibold">
                        <span>Melhor Precisão: <strong className="text-primary">{progresso.melhor_acuracia}%</strong></span>
                        <span>Pontos: <strong className="text-secondary">{progresso.melhor_pontuacao}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ——————————————————————————————
          3. ARENA DE TREINO ATIVA
         —————————————————————————————— */}
      {moduloAtivo && desafioAtual && (
        <div className="space-y-5 animate-fade-in">
          
          {/* Top Bar with Live Telemetry & Mouse Guide */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 product-card p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setModuloAtivo(null)}
                className="product-icon-action"
                title="Voltar para a seleção de módulos"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-secondary font-mono uppercase">
                    Módulo {moduloAtivo.id} • Desafio {desafioIndex + 1} de {moduloAtivo.desafios.length}
                  </span>
                  <span className="text-xs text-outline">•</span>
                  <h3 className="font-heading font-extrabold text-body-md text-on-surface">
                    {desafioAtual.titulo}
                  </h3>
                </div>
                <p className="text-xs text-on-surface-variant font-semibold mt-0.5">{desafioAtual.instrucao}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end lg:self-auto flex-wrap">
              {/* Pontuação */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <HugeiconsIcon icon={StarIcon} size={16} className="text-amber-500" />
                <div>
                  <span className="text-[10px] text-on-surface-variant font-bold block uppercase leading-none">Pontos</span>
                  <span className="font-mono font-extrabold text-body-md text-on-surface leading-tight">
                    {pontuacao}
                  </span>
                </div>
              </div>

              {/* Combo Streak */}
              {combo >= 3 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/15 to-amber-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 font-mono font-extrabold text-xs animate-in zoom-in-50">
                  <HugeiconsIcon icon={FireIcon} size={14} className="animate-pulse" />
                  <span>{combo}x Combo!</span>
                </div>
              )}

              {/* Visual Mouse HUD Guide */}
              <VisualMouseGuide activeButton={desafioAtual.botaoRequerido} />

              <button
                onClick={() => initDesafio(desafioAtual)}
                className="p-2.5 rounded-xl border border-outline-variant/30 hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-all"
                title="Reiniciar Desafio Atual"
              >
                <HugeiconsIcon icon={RefreshIcon} size={18} />
              </button>
            </div>
          </div>

          {/* Dica da Ação */}
          <div className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container-low px-4 py-2 rounded-2xl border border-outline-variant/20">
            <HugeiconsIcon icon={InformationCircleIcon} size={15} className="text-secondary shrink-0" />
            <span><strong>Dica:</strong> {desafioAtual.dica}</span>
          </div>

          {/* ——————————————————————————————
              CANVAS INTERATIVO DE DESAFIOS
             —————————————————————————————— */}
          <div className="bg-surface-container-lowest dark:bg-slate-950 border-2 border-outline-variant/30 rounded-3xl p-6 min-h-[380px] shadow-md relative overflow-hidden flex flex-col items-center justify-center select-none">
            
            {/* 1.1 Conectar Constelações (Hover em Ordem) */}
            {desafioAtual.tipo === 'hover' && desafioAtual.id === '1_1' && (
              <div className="w-full max-w-lg h-72 relative border border-dashed border-sky-500/30 rounded-2xl bg-sky-500/5 p-4">
                <p className="text-center text-xs font-bold text-sky-600 mb-2">
                  Próximo ponto: <strong>Ponto {nextDot}</strong>
                </p>
                {[
                  { num: 1, x: '15%', y: '30%' },
                  { num: 2, x: '45%', y: '20%' },
                  { num: 3, x: '80%', y: '40%' },
                  { num: 4, x: '60%', y: '75%' },
                  { num: 5, x: '25%', y: '70%' },
                ].map(dot => (
                  <div
                    key={dot.num}
                    onMouseEnter={() => handleDotHover(dot.num)}
                    style={{ left: dot.x, top: dot.y }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center font-heading font-extrabold text-sm transition-all duration-300 ${
                      dot.num < nextDot
                        ? 'bg-emerald-500 text-white scale-90 shadow-sm'
                        : dot.num === nextDot
                          ? 'bg-sky-500 text-white animate-bounce ring-4 ring-sky-500/30 shadow-lg scale-110'
                          : 'bg-surface-container text-on-surface-variant border border-outline-variant/40'
                    }`}
                  >
                    {dot.num < nextDot ? <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} /> : dot.num}
                  </div>
                ))}
              </div>
            )}

            {/* 1.2 Varinha de Revelação (Hover nos Cartões) */}
            {desafioAtual.tipo === 'hover' && desafioAtual.id === '1_2' && (
              <div className="grid grid-cols-3 gap-4 w-full max-w-md">
                {['💻 Informática', '📁 Pastas', '🌐 Internet', '🔒 Segurança', '⚡ Agilidade', '🎓 Senac'].map((txt, idx) => {
                  const revealed = revealedCards.has(idx);
                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => handleCardHover(idx)}
                      className={`h-24 rounded-2xl flex items-center justify-center text-center p-2 transition-all duration-300 border font-bold text-xs ${
                        revealed
                          ? 'bg-gradient-to-br from-primary to-primary-container text-white border-transparent shadow-md scale-105'
                          : 'bg-slate-900 text-slate-700 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {revealed ? txt : '???'}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 1.3 Labirinto do Cursor */}
            {desafioAtual.tipo === 'hover' && desafioAtual.id === '1_3' && (
              <div className="w-full max-w-md flex flex-col items-center gap-4">
                <div
                  onMouseLeave={() => {
                    if (mazeStarted && !mazeWon) {
                      setMazeStarted(false);
                      handleErro();
                    }
                  }}
                  className="w-full h-44 bg-surface-container-low rounded-2xl border-2 border-outline-variant/40 relative flex items-center justify-between px-4 overflow-hidden"
                >
                  <div
                    onMouseEnter={() => setMazeStarted(true)}
                    className="w-16 h-28 bg-primary/20 hover:bg-primary/30 text-primary border-2 border-primary/40 rounded-xl flex items-center justify-center font-bold text-xs text-center z-10"
                  >
                    {mazeStarted ? 'Em Curso' : 'Início'}
                  </div>

                  <div className="flex-1 h-12 bg-sky-500/10 border-y-2 border-sky-500/30 flex items-center justify-center text-[10px] font-bold text-sky-600">
                    Siga pela faixa azul sem sair
                  </div>

                  <div
                    onMouseEnter={() => {
                      if (mazeStarted) {
                        setMazeWon(true);
                        handleAcerto(200);
                        setTimeout(handleAvancarDesafio, 600);
                      }
                    }}
                    className="w-16 h-28 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 border-2 border-emerald-500/40 rounded-xl flex items-center justify-center font-bold text-xs text-center z-10"
                  >
                    Chegada 🏁
                  </div>
                </div>
                {!mazeStarted && (
                  <p className="text-xs text-on-surface-variant font-bold">Passe o mouse no bloco Início para começar.</p>
                )}
              </div>
            )}

            {/* 2.1 Estouro de Bolhas (Clique Simples) */}
            {desafioAtual.tipo === 'click' && (
              <div className="w-full max-w-lg h-72 relative border border-dashed border-emerald-500/30 rounded-2xl bg-emerald-500/5 p-4">
                {bubbles.map(b => (
                  <button
                    key={b.id}
                    onClick={() => handleBubbleClick(b.id)}
                    style={{ left: `${b.x}%`, top: `${b.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md transition-transform duration-200 active:scale-90 ${
                      b.popped ? 'scale-0 opacity-0' : 'scale-100 hover:scale-110'
                    }`}
                  >
                    <span
                      className="w-full h-full rounded-full flex items-center justify-center"
                      style={{ backgroundColor: b.color }}
                    >
                      Clique!
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* 2.2 Cofre de Arquivos (Duplo Clique) */}
            {desafioAtual.tipo === 'double_click' && (
              <div className="space-y-4 text-center">
                <div className="flex gap-6 justify-center">
                  {[1, 2, 3].map(id => {
                    const isOpen = openedFolders.has(id);
                    return (
                      <div
                        key={id}
                        onClick={() => handleFolderClick(id)}
                        className={`w-28 h-28 rounded-2xl flex flex-col items-center justify-center p-3 border-2 transition-all cursor-pointer select-none ${
                          isOpen
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 scale-105'
                            : 'bg-surface-container-low border-outline-variant/40 hover:border-primary/50 text-on-surface'
                        }`}
                      >
                        <span className="text-3xl mb-1">{isOpen ? '📂' : '📁'}</span>
                        <span className="text-xs font-bold">{isOpen ? 'Aberta!' : `Pasta 0${id}`}</span>
                        <span className="text-[9px] text-on-surface-variant font-medium">Duplo clique</span>
                      </div>
                    );
                  })}
                </div>
                {doubleClickFeedback && (
                  <p className="text-xs font-bold text-primary animate-fade-in">{doubleClickFeedback}</p>
                )}
              </div>
            )}

            {/* 2.3 Botão Direito & Menu de Contexto */}
            {desafioAtual.tipo === 'right_click' && (
              <div className="space-y-4 text-center">
                <div
                  onContextMenu={(e) => handleItemContextMenu(e)}
                  className="w-36 h-36 mx-auto rounded-2xl bg-surface-container-low border-2 border-dashed border-orange-500/50 hover:border-orange-500 flex flex-col items-center justify-center p-3 cursor-context-menu"
                >
                  <span className="text-4xl mb-1">📄</span>
                  <span className="text-xs font-bold text-on-surface">relatorio.docx</span>
                  <span className="text-[10px] text-orange-600 font-bold mt-1">Clique c/ Botão Direito</span>
                </div>

                {/* Floating Context Menu */}
                {contextMenuPos && (
                  <div
                    style={{ left: contextMenuPos.x - 60, top: contextMenuPos.y - 120 }}
                    className="fixed z-50 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-outline-variant/30 py-1.5 w-44 font-sans text-xs"
                  >
                    <button
                      onClick={() => handleSelectContextOption('Abrir')}
                      className="w-full px-3 py-1.5 text-left hover:bg-surface-container font-semibold text-on-surface"
                    >
                      Abrir
                    </button>
                    <button
                      onClick={() => handleSelectContextOption('Renomear')}
                      className="w-full px-3 py-1.5 text-left bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 font-bold flex items-center justify-between"
                    >
                      <span>Renomear</span>
                      <span className="text-[9px] font-mono">🎯 Alvo</span>
                    </button>
                    <button
                      onClick={() => handleSelectContextOption('Copiar')}
                      className="w-full px-3 py-1.5 text-left hover:bg-surface-container font-semibold text-on-surface"
                    >
                      Copiar
                    </button>
                    <button
                      onClick={() => handleSelectContextOption('Excluir')}
                      className="w-full px-3 py-1.5 text-left hover:bg-rose-500/10 text-rose-600 font-semibold"
                    >
                      Excluir
                    </button>
                  </div>
                )}
                {contextDone && <p className="text-xs font-bold text-emerald-600">Excelente! Menu de contexto dominado.</p>}
              </div>
            )}

            {/* 3.1 Drag and Drop de Arquivos */}
            {desafioAtual.tipo === 'drag_drop' && (
              <div className="w-full max-w-xl space-y-6">
                {/* File items to drag */}
                <div className="flex gap-3 justify-center">
                  {[
                    { id: 'relatorio_senac.pdf', icon: '📄', label: 'relatorio.pdf' },
                    { id: 'foto_turma.jpg', icon: '🖼️', label: 'foto.jpg' },
                    { id: 'virus_antigo.tmp', icon: '🗑️', label: 'lixo.tmp' },
                    { id: 'aula_informatica.docx', icon: '📝', label: 'aula.docx' }
                  ]
                    .filter(f => !droppedFiles.docs.includes(f.id) && !droppedFiles.images.includes(f.id) && !droppedFiles.trash.includes(f.id))
                    .map(f => (
                      <div
                        key={f.id}
                        draggable
                        onDragStart={() => handleDragStart(f.id)}
                        className="px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/40 shadow-xs cursor-grab active:cursor-grabbing flex items-center gap-2 text-xs font-bold text-on-surface hover:scale-105 transition-transform"
                      >
                        <span>{f.icon}</span>
                        <span>{f.label}</span>
                      </div>
                    ))}
                </div>

                {/* Drop Target Folders */}
                <div className="grid grid-cols-3 gap-4">
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropOnFolder('docs')}
                    className="p-4 rounded-2xl bg-sky-500/10 border-2 border-dashed border-sky-500/40 text-center flex flex-col items-center justify-center min-h-[110px]"
                  >
                    <span className="text-3xl mb-1">📁</span>
                    <span className="text-xs font-bold text-sky-700 dark:text-sky-400">Pasta Documentos</span>
                    <span className="text-[10px] text-on-surface-variant">({droppedFiles.docs.length} itens)</span>
                  </div>

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropOnFolder('images')}
                    className="p-4 rounded-2xl bg-amber-500/10 border-2 border-dashed border-amber-500/40 text-center flex flex-col items-center justify-center min-h-[110px]"
                  >
                    <span className="text-3xl mb-1">🖼️</span>
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Pasta Imagens</span>
                    <span className="text-[10px] text-on-surface-variant">({droppedFiles.images.length} itens)</span>
                  </div>

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDropOnFolder('trash')}
                    className="p-4 rounded-2xl bg-rose-500/10 border-2 border-dashed border-rose-500/40 text-center flex flex-col items-center justify-center min-h-[110px]"
                  >
                    <span className="text-3xl mb-1">🗑️</span>
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400">Lixeira</span>
                    <span className="text-[10px] text-on-surface-variant">({droppedFiles.trash.length} itens)</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3.2 Seleção em Caixa (Lasso Select) */}
            {desafioAtual.tipo === 'box_select' && (
              <div
                ref={boxSelectRef}
                onMouseDown={handleMouseDownSelect}
                onMouseMove={handleMouseMoveSelect}
                onMouseUp={handleMouseUpSelect}
                className="w-full max-w-lg h-72 relative border-2 border-dashed border-amber-500/30 rounded-2xl bg-amber-500/5 p-4 cursor-crosshair overflow-hidden"
              >
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-3 text-center">
                  Clique e arraste para envolver todos os 4 itens com o retângulo azul ({selectedItems.size}/4 selecionados)
                </p>

                <div className="grid grid-cols-2 gap-8 p-4">
                  {['documento_1.pdf', 'documento_2.pdf', 'planilha_senac.xlsx', 'apresentacao.pptx'].map((name, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
                        selectedItems.has(i)
                          ? 'bg-primary/20 border-primary text-primary shadow-xs scale-105'
                          : 'bg-surface-container border-outline-variant/30 text-on-surface'
                      }`}
                    >
                      <span>📄</span>
                      <span className="truncate">{name}</span>
                    </div>
                  ))}
                </div>

                {selectionBox && (
                  <div
                    style={{
                      left: selectionBox.w < 0 ? selectionBox.x + selectionBox.w : selectionBox.x,
                      top: selectionBox.h < 0 ? selectionBox.y + selectionBox.h : selectionBox.y,
                      width: Math.abs(selectionBox.w),
                      height: Math.abs(selectionBox.h)
                    }}
                    className="absolute bg-primary/20 border border-primary pointer-events-none rounded-sm"
                  />
                )}
              </div>
            )}

            {/* 4.1 Scroll Deep Exploration */}
            {desafioAtual.tipo === 'scroll' && (
              <div className="w-full max-w-md h-64 overflow-y-auto rounded-2xl border border-outline-variant/40 p-4 space-y-8 bg-surface-container-low">
                <div className="p-3 bg-surface-container rounded-xl text-xs font-semibold">
                  📜 Início do Documento — Role a página para baixo com a roda do mouse...
                </div>
                <div className="p-3 bg-surface-container rounded-xl text-xs text-on-surface-variant">
                  O Senac forma profissionais completos com competências digitais essenciais para o mercado de trabalho moderno.
                </div>
                <div className="p-3 bg-surface-container rounded-xl text-xs text-on-surface-variant">
                  O uso correto do mouse garante ergonomia e alta velocidade na execução de tarefas em softwares de escritório e navegadores.
                </div>
                <div className="p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl text-center space-y-2">
                  <span className="text-3xl">🏅</span>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Você encontrou o Selo do Senac!</p>
                  <button
                    onClick={() => {
                      handleAcerto(150);
                      setTimeout(handleAvancarDesafio, 600);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    Coletar Selo 🏆
                  </button>
                </div>
              </div>
            )}

            {/* 5.1 Simulador de Formulário */}
            {desafioAtual.tipo === 'form' && (
              <div className="w-full max-w-md bg-surface-container-low p-5 rounded-2xl border border-outline-variant/30 space-y-4 text-xs">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="chk1"
                    checked={formData.check1}
                    onChange={(e) => setFormData(f => ({ ...f, check1: e.target.checked }))}
                    className="w-4 h-4 rounded text-primary cursor-pointer"
                  />
                  <label htmlFor="chk1" className="font-bold text-on-surface cursor-pointer">Marcar Caixa de Seleção</label>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-on-surface block">Selecione uma opção de rádio:</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="rad"
                        value="A"
                        checked={formData.radio === 'A'}
                        onChange={(e) => setFormData(f => ({ ...f, radio: e.target.value }))}
                        className="cursor-pointer"
                      />
                      <span>Opção A</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="rad"
                        value="B"
                        checked={formData.radio === 'B'}
                        onChange={(e) => setFormData(f => ({ ...f, radio: e.target.value }))}
                        className="cursor-pointer"
                      />
                      <span>Opção B</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-on-surface block mb-1">Menu Suspenso (Dropdown):</label>
                  <select
                    value={formData.select}
                    onChange={(e) => setFormData(f => ({ ...f, select: e.target.value }))}
                    className="w-full p-2 rounded-xl bg-surface-container border border-outline-variant/40 text-xs font-bold text-on-surface"
                  >
                    <option value="">Escolha um curso...</option>
                    <option value="ti">Informática Básica</option>
                    <option value="prog">Desenvolvimento Web</option>
                  </select>
                </div>

                <button
                  disabled={!formData.check1 || !formData.radio || !formData.select}
                  onClick={() => {
                    handleAcerto(200);
                    setTimeout(handleAvancarDesafio, 600);
                  }}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                    formData.check1 && formData.radio && formData.select
                      ? 'bg-primary text-white shadow-md cursor-pointer'
                      : 'bg-surface-container text-on-surface-variant/40 cursor-not-allowed'
                  }`}
                >
                  Enviar Formulário Completo
                </button>
              </div>
            )}

            {/* 5.2 Desafio de Mira & Reflexo (Aim Reflex) */}
            {desafioAtual.tipo === 'aim' && aimTarget && (
              <div className="w-full max-w-lg h-72 relative border border-dashed border-rose-500/30 rounded-2xl bg-rose-500/5 p-4 overflow-hidden">
                <p className="text-xs font-bold text-rose-600 text-center mb-2">
                  Acertos: {aimScore} de 6 alvos rápidos
                </p>
                <button
                  onClick={handleAimTargetClick}
                  style={{
                    left: `${aimTarget.x}%`,
                    top: `${aimTarget.y}%`,
                    width: `${aimTarget.size}px`,
                    height: `${aimTarget.size}px`
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-rose-500 to-red-600 text-white font-bold text-xs shadow-lg flex items-center justify-center animate-ping-once hover:scale-110 active:scale-90 transition-transform cursor-pointer"
                >
                  🎯
                </button>
              </div>
            )}

          </div>

        </div>
      )}

      {/* ——————————————————————————————
          4. MODAL DE RESULTADOS / VITÓRIA
         —————————————————————————————— */}
      {resultado && moduloAtivo && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-outline-variant/30 overflow-hidden font-sans">
            <div className="p-8 text-center text-white relative overflow-hidden bg-gradient-to-br from-secondary via-orange-700 to-primary">
              <div className="relative z-10 space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto text-3xl shadow-lg">
                  🏆
                </div>
                <h2 className="font-heading font-extrabold text-2xl">Módulo Concluído com Sucesso!</h2>
                <p className="text-white/80 text-xs max-w-sm mx-auto">
                  Você dominou os exercícios de {moduloAtivo.titulo} com excelente precisão motora.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Precisão</span>
                  <span className="font-heading font-extrabold text-2xl text-emerald-500 font-mono">{resultado.acuracia}%</span>
                  <span className="text-[10px] text-on-surface-variant font-bold block">Acertos</span>
                </div>

                <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Tempo Médio</span>
                  <span className="font-heading font-extrabold text-2xl text-primary font-mono">{resultado.tempoReacaoMs}ms</span>
                  <span className="text-[10px] text-on-surface-variant font-bold block">Reação</span>
                </div>

                <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Pontuação</span>
                  <span className="font-heading font-extrabold text-2xl text-secondary font-mono">{resultado.pontuacao}</span>
                  <span className="text-[10px] text-on-surface-variant font-bold block">Pontos</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => iniciarModulo(moduloAtivo)}
                  className="flex-1 py-3 px-4 border border-outline-variant/40 hover:bg-surface-container text-on-surface font-heading font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <HugeiconsIcon icon={RefreshIcon} size={16} />
                  <span>Repetir Módulo</span>
                </button>

                <button
                  onClick={() => {
                    if (moduloAtivo.id < MODULOS_MOUSE.length) {
                      const next = MODULOS_MOUSE.find(m => m.id === moduloAtivo.id + 1);
                      if (next) iniciarModulo(next);
                    } else {
                      setModuloAtivo(null);
                    }
                  }}
                  className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-white font-heading font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Próximo Módulo</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ——————————————————————————————
          5. MODAL DE POSTURA E ERGONOMIA DO MOUSE
         —————————————————————————————— */}
      {mostrarGuia && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-outline-variant/30 overflow-hidden font-sans max-h-[90vh] flex flex-col">
            <div className="p-6 bg-gradient-to-r from-secondary via-orange-600 to-primary text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-headline-sm font-heading font-extrabold flex items-center gap-2">
                  🖱️ Guia Ergonômico de Uso do Mouse
                </h3>
                <p className="text-white/80 text-xs mt-1">Como segurar e movimentar o mouse com conforto e sem dores no punho</p>
              </div>
              <button
                onClick={() => setMostrarGuia(false)}
                className="text-white/70 hover:text-white p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs text-on-surface-variant leading-relaxed">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-2">
                  <span className="text-xl">✋</span>
                  <h4 className="font-heading font-extrabold text-body-md text-on-surface">1. Posição dos Dedos</h4>
                  <p>Mantenha o <strong>dedo indicador no botão esquerdo</strong> e o <strong>dedo médio no botão direito</strong>. A mão deve repousar com suavidade sobre o mouse.</p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-2">
                  <span className="text-xl">💪</span>
                  <h4 className="font-heading font-extrabold text-body-md text-on-surface">2. Movimento com o Braço</h4>
                  <p>Evite dobrar o pulso para os lados. Mova o mouse usando o <strong>antebraço inteiro</strong> para evitar lesões por esforço repetitivo (LER/DORT).</p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-2">
                  <span className="text-xl">📏</span>
                  <h4 className="font-heading font-extrabold text-body-md text-on-surface">3. Alinhamento da Mesa</h4>
                  <p>O mouse deve ficar no mesmo nível do teclado e próximo ao corpo, para que o ombro permaneça relaxado.</p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-2">
                  <span className="text-xl">🪶</span>
                  <h4 className="font-heading font-extrabold text-body-md text-on-surface">4. Força Leve no Clique</h4>
                  <p>O clique deve ser suave como apertar um botão de caneta. Não force o mouse contra a mesa.</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setMostrarGuia(false)}
                  className="px-6 py-2.5 bg-primary text-white font-heading font-bold text-xs rounded-xl shadow-xs"
                >
                  Entendi as orientações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ——————————————————————————————
          6. MODAL DE PREFERÊNCIAS & SOM
         —————————————————————————————— */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl border border-outline-variant/30 overflow-hidden font-sans">
            <div className="p-5 border-b border-outline-variant/30 flex items-center justify-between">
              <h3 className="text-body-lg font-heading font-extrabold text-on-surface flex items-center gap-2">
                <HugeiconsIcon icon={Settings01Icon} size={20} className="text-primary" />
                Preferências de Áudio
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-on-surface-variant p-1 rounded-lg">
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-on-surface">Efeitos Sonoros do Mouse</span>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    soundEnabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {soundEnabled ? 'Ativado' : 'Mudo'}
                </button>
              </div>

              {soundEnabled && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-on-surface-variant">
                    <span>Volume</span>
                    <span>{volume}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-outline-variant/30 flex justify-end">
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="px-5 py-2 bg-primary text-white font-heading font-bold text-xs rounded-xl shadow-xs"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
