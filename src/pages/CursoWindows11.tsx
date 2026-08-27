import React, { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PlayCircleIcon,
  CheckmarkCircle02Icon,
  KeyboardIcon,
  Award01Icon,
  Tick01Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { dispararCelebracao } from '../utils/celebracao';

interface Atalho {
  tecla: string;
  acao: string;
}

interface AulaWindows {
  id: string;
  youtubeId: string;
  titulo: string;
  duracao: string;
  descricao: string;
  atalhos: Atalho[];
}

const aulasWindows11: AulaWindows[] = [
  {
    id: '1',
    youtubeId: 'qT-EWam8h9U',
    titulo: 'Conheça a Desktop do Sistema (Área de Trabalho)',
    duracao: '14:51',
    descricao: 'Aprenda os fundamentos da área de trabalho do Windows 11. Conheça a organização de ícones, navegação básica, menus de contexto e as primeiras interações essenciais com a tela principal do sistema operacional que usamos em nosso laboratório.',
    atalhos: [
      { tecla: 'Win + D', acao: 'Mostra ou oculta a Área de Trabalho (Desktop)' },
      { tecla: 'Win + M', acao: 'Minimiza todas as janelas abertas' },
    ],
  },
  {
    id: '2',
    youtubeId: 'I_7rPZkKT2M',
    titulo: 'Menu Iniciar',
    duracao: '07:23',
    descricao: 'Explore o novo Menu Iniciar centralizado do Windows 11. Veja como pesquisar aplicativos ou arquivos instantaneamente, fixar seus programas de uso diário e acessar a seção de itens recomendados.',
    atalhos: [
      { tecla: 'Win', acao: 'Abre ou fecha o Menu Iniciar' },
      { tecla: 'Win + S', acao: 'Abre a barra de pesquisa do Windows' },
    ],
  },
  {
    id: '3',
    youtubeId: '5LfbFwAnAAU',
    titulo: 'Barra de Tarefas',
    duracao: '06:52',
    descricao: 'Aprenda a controlar e gerenciar a Barra de Tarefas do Windows 11. Descubra como fixar aplicativos, usar widgets úteis e dominar o recurso de Múltiplas Áreas de Trabalho Virtuais para organizar seus estudos.',
    atalhos: [
      { tecla: 'Win + T', acao: 'Navega pelos aplicativos da barra de tarefas utilizando o teclado' },
      { tecla: 'Win + Tab', acao: 'Abre o Visor de Tarefas (Task View) para gerenciar áreas de trabalho' },
    ],
  },
  {
    id: '4',
    youtubeId: 's5PJet09nXc',
    titulo: 'Personalização do Windows 11',
    duracao: '10:06',
    descricao: 'Deixe o computador do laboratório com a sua cara! Saiba como alterar a imagem de fundo (papel de parede), escolher cores de destaque personalizadas e alternar facilmente entre o Modo Claro e o Modo Escuro.',
    atalhos: [
      { tecla: 'Win + I', acao: 'Abre o painel de Configurações do Windows' },
    ],
  },
  {
    id: '5',
    youtubeId: '-3feFDRmjWM',
    titulo: 'Configurações do Mouse',
    duracao: '05:42',
    descricao: 'Domine o controle e a precisão do mouse. Entenda como configurar o botão principal (esquerdo/direito), ajustar a velocidade de rastreamento do ponteiro e personalizar o design, tamanho e cor do cursor.',
    atalhos: [
      { tecla: 'Win + U', acao: 'Abre as configurações de Acessibilidade do Windows' },
    ],
  },
  {
    id: '6',
    youtubeId: '_-GJu9qwb7M',
    titulo: 'Configurações do Teclado',
    duracao: '08:15',
    descricao: 'Configure seu teclado corretamente para digitação no laboratório. Aprenda a adicionar e alternar layouts de idioma (como ABNT e ABNT2), ativar o teclado virtual na tela e acessar o painel de emojis e caracteres especiais.',
    atalhos: [
      { tecla: 'Win + .', acao: 'Abre o painel de emojis, símbolos e GIFs' },
      { tecla: 'Win + Espaço', acao: 'Alterna entre os layouts de idioma de teclado instalados' },
    ],
  },
  {
    id: '7',
    youtubeId: 'bsNlVF2r0LI',
    titulo: 'Conhecendo o Explorador de Arquivos - Parte 01',
    duracao: '14:33',
    descricao: 'Dê os primeiros passos essenciais na organização de arquivos. Aprenda a abrir o explorador, criar pastas, gerenciar arquivos dentro das pastas do usuário (Downloads, Documentos, Imagens) e entender a árvore de diretórios.',
    atalhos: [
      { tecla: 'Win + E', acao: 'Abre o Explorador de Arquivos do Windows' },
      { tecla: 'Ctrl + N', acao: 'Abre uma nova janela do Explorador de Arquivos' },
    ],
  },
  {
    id: '8',
    youtubeId: 'VHnRCNEIvOI',
    titulo: 'Explorador de Arquivos - Parte 02',
    duracao: '10:25',
    descricao: 'Aprofunde seus conhecimentos em manipulação de arquivos no Windows 11. Aprenda a usar a navegação em abas nas pastas, descompactar arquivos (.ZIP), realizar buscas refinadas e gerenciar o histórico de arquivos recentes.',
    atalhos: [
      { tecla: 'Ctrl + T', acao: 'Abre uma nova aba no Explorador de Arquivos' },
      { tecla: 'Ctrl + W', acao: 'Fecha a aba ativa do Explorador de Arquivos' },
      { tecla: 'Alt + Enter', acao: 'Exibe as propriedades do arquivo ou pasta selecionada' },
    ],
  },
];

interface CursoWindows11Props {
  session: any;
}

export const CursoWindows11: React.FC<CursoWindows11Props> = ({ session }) => {
  const userId = session?.user?.id || 'anon';
  const storageKey = `estudea:windows11:concluidas:${userId}`;

  // State for tracking completed lessons
  const [concluidas, setConcluidas] = useState<string[]>([]);
  const [selectedAula, setSelectedAula] = useState<AulaWindows>(aulasWindows11[0]);

  // Load progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids)) {
          setConcluidas(ids);
        }
      } catch (e) {
        console.error('Erro ao ler progresso do Windows 11:', e);
      }
    }
  }, [storageKey]);

  // Handle completion toggle
  const handleToggleConclusao = (aulaId: string) => {
    let newConcluidas: string[];
    const isCompleted = concluidas.includes(aulaId);

    if (isCompleted) {
      newConcluidas = concluidas.filter(id => id !== aulaId);
    } else {
      newConcluidas = [...concluidas, aulaId];
    }

    setConcluidas(newConcluidas);
    localStorage.setItem(storageKey, JSON.stringify(newConcluidas));

    // If just completed the final lesson (all 8) and hasn't celebrated yet
    if (newConcluidas.length === aulasWindows11.length && !isCompleted) {
      dispararCelebracao();
    }
  };

  const progressPercent = Math.round((concluidas.length / aulasWindows11.length) * 100);
  const isCourseComplete = concluidas.length === aulasWindows11.length;

  return (
    <div className="product-page max-w-7xl mx-auto space-y-6 relative overflow-hidden animate-fade-in pb-10">
      {/* Header com estilo Estudea Product UI */}
      <header className="product-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="product-section-kicker flex items-center gap-1.5 text-primary">
            <HugeiconsIcon icon={Award01Icon} size={14} className="animate-pulse" strokeWidth={2} />
            <span>Curso de Informática Básica</span>
          </span>
          <h1 className="product-section-heading mt-0 text-xl sm:text-2xl flex items-center gap-2.5">
            Windows 11 Básico
          </h1>
          <p className="product-subtitle">
            Aprenda a dominar o sistema operacional utilizado em nosso laboratório de informática. Conheça a Área de Trabalho, Menu Iniciar, Arquivos e os principais atalhos.
          </p>
        </div>

        {/* Card de Progresso */}
        <div className="flex flex-col sm:items-end justify-center min-w-[220px] bg-surface-container-low border border-outline-variant/60 rounded-product-control p-3.5 shadow-xs">
          <div className="flex items-center justify-between w-full mb-1.5 text-xs font-bold">
            <span className="text-on-surface-variant">Progresso Geral</span>
            <span className="text-primary font-mono">{progressPercent}%</span>
          </div>
          
          {/* Barra de Progresso */}
          <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden relative">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-on-surface-variant mt-1.5">
            {concluidas.length} de {aulasWindows11.length} aulas concluídas
          </span>
        </div>
      </header>

      {/* Alerta de curso completo */}
      {isCourseComplete && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-product-control p-5 flex flex-col sm:flex-row items-center gap-4 animate-scale-up">
          <div className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <HugeiconsIcon icon={Award01Icon} size={24} strokeWidth={2} />
          </div>
          <div className="space-y-1 text-center sm:text-left flex-1">
            <h4 className="font-heading font-extrabold text-sm text-emerald-800 dark:text-emerald-300">Parabéns! Você concluiu o Curso de Windows 11! 🎓</h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              Você assistiu a todas as aulas de introdução e agora conhece os conceitos essenciais do sistema operacional para usar o laboratório com autonomia. Continue praticando!
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => dispararCelebracao()}
              className="product-primary-action text-xs !bg-emerald-600 hover:!bg-emerald-700"
            >
              Celebrar Novamente!
            </button>
          </div>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-cols-12 gap-6 items-start">
        
        {/* Painel Esquerdo: Lista de Aulas */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="product-card p-0 overflow-hidden">
            <div className="p-4 border-b border-outline-variant/60 bg-surface-container-low flex items-center justify-between">
              <h3 className="font-heading font-extrabold text-sm text-on-surface">Lista de Aulas</h3>
              <span className="text-[10px] font-extrabold text-on-surface-variant uppercase font-mono bg-surface-container px-2 py-0.5 rounded">
                8 vídeos
              </span>
            </div>

            <div className="divide-y divide-outline-variant/40 max-h-[580px] overflow-y-auto bg-surface-container-lowest">
              {aulasWindows11.map((aula) => {
                const isSelected = selectedAula.id === aula.id;
                const isCompleted = concluidas.includes(aula.id);

                return (
                  <button
                    key={aula.id}
                    onClick={() => setSelectedAula(aula)}
                    className={`w-full text-left p-3.5 transition-all flex items-start gap-3 hover:bg-surface-container-low cursor-pointer select-none group relative ${
                      isSelected
                        ? 'bg-primary/10 border-l-4 border-primary text-primary font-bold'
                        : 'border-l-4 border-transparent text-on-surface'
                    }`}
                  >
                    {/* Indicador de Status do Vídeo */}
                    <div className="shrink-0 mt-0.5">
                      {isCompleted ? (
                        <HugeiconsIcon
                          icon={CheckmarkCircle02Icon}
                          className="text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform"
                          size={18}
                          strokeWidth={2.5}
                        />
                      ) : (
                        <HugeiconsIcon
                          icon={PlayCircleIcon}
                          className={`group-hover:scale-110 transition-transform ${
                            isSelected
                              ? 'text-primary'
                              : 'text-on-surface-variant/60 group-hover:text-on-surface'
                          }`}
                          size={18}
                          strokeWidth={2}
                        />
                      )}
                    </div>

                    {/* Detalhes da Aula */}
                    <div className="space-y-0.5">
                      <p className={`text-xs font-bold leading-snug transition-colors ${
                        isSelected
                          ? 'text-primary'
                          : 'text-on-surface group-hover:text-primary'
                      }`}>
                        {aula.titulo}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-medium">
                        <span className="bg-surface-container-low px-1.5 py-0.5 rounded font-mono">
                          {aula.duracao}
                        </span>
                        {isCompleted && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                            <HugeiconsIcon icon={Tick01Icon} size={11} strokeWidth={3} /> Concluída
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Painel Direito: Player de Vídeo e Detalhes da Aula Selecionada */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Player com aspect-video */}
          <div className="product-card p-0 overflow-hidden shadow-sm">
            <div className="aspect-video w-full bg-black relative">
              <iframe
                src={`https://www.youtube.com/embed/${selectedAula.youtubeId}?rel=0&modestbranding=1&showinfo=0`}
                title={selectedAula.titulo}
                className="absolute inset-0 w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            
            {/* Rodapé do Player / Título e Ação */}
            <div className="p-4 sm:p-5 bg-surface-container-lowest border-t border-outline-variant/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <h3 className="font-heading font-extrabold text-sm sm:text-base text-on-surface leading-tight">
                  {selectedAula.titulo}
                </h3>
                <p className="text-xs font-semibold text-on-surface-variant flex items-center gap-1.5">
                  Duração da aula: <span className="font-mono bg-surface-container-low px-1.5 py-0.5 rounded">{selectedAula.duracao}</span>
                </p>
              </div>

              {/* Botão de marcar como concluída */}
              <button
                onClick={() => handleToggleConclusao(selectedAula.id)}
                className={`product-primary-action text-xs ${
                  concluidas.includes(selectedAula.id)
                    ? '!bg-emerald-600 hover:!bg-emerald-700'
                    : ''
                }`}
              >
                <HugeiconsIcon
                  icon={concluidas.includes(selectedAula.id) ? CheckmarkCircle02Icon : PlayCircleIcon}
                  size={16}
                  strokeWidth={2}
                />
                <span>{concluidas.includes(selectedAula.id) ? 'Concluída!' : 'Marcar como Concluída'}</span>
              </button>
            </div>
          </div>

          {/* Grid de Detalhes da Aula & Dicas de Atalhos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Notas Didáticas */}
            <div className="product-card p-4 sm:p-5 space-y-3">
              <h4 className="font-heading font-extrabold text-xs text-on-surface flex items-center gap-2">
                <HugeiconsIcon icon={InformationCircleIcon} className="text-primary" size={16} strokeWidth={2} />
                <span>Notas Didáticas</span>
              </h4>
              <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
                {selectedAula.descricao}
              </p>
              <div className="text-[11px] text-on-surface-variant border-t border-outline-variant/60 pt-3 flex items-start gap-1.5 font-medium">
                <span className="font-bold text-primary">💡 Dica:</span>
                <span>Assista ao vídeo atentamente e tente reproduzir os mesmos cliques e configurações no computador que você está usando agora.</span>
              </div>
            </div>

            {/* Atalhos Rápidos */}
            <div className="product-card p-4 sm:p-5 space-y-3">
              <h4 className="font-heading font-extrabold text-xs text-on-surface flex items-center gap-2">
                <HugeiconsIcon icon={KeyboardIcon} className="text-secondary" size={16} strokeWidth={2} />
                <span>Atalhos do Teclado</span>
              </h4>
              <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
                No Windows 11, o uso de atalhos acelera seu trabalho e demonstra proficiência digital:
              </p>
              <div className="space-y-2.5 pt-1">
                {selectedAula.atalhos.map((at, idx) => (
                  <div key={idx} className="flex flex-col gap-1 border-b border-outline-variant/40 pb-2 last:border-none last:pb-0">
                    <span className="font-mono bg-surface-container-low text-primary text-xs px-2.5 py-0.5 rounded-product-control border border-outline-variant/60 w-fit font-bold select-all">
                      {at.tecla}
                    </span>
                    <span className="text-xs text-on-surface-variant font-medium">
                      {at.acao}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
