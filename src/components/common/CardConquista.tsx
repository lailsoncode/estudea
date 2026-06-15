import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import type { IconSvgElement } from '@hugeicons/react';
import {
  Award01Icon,
  FireIcon,
  GraduateMaleIcon,
  LockPasswordIcon,
} from '@hugeicons/core-free-icons';

export interface CardConquistaProps {
  /** O título da medalha ou conquista */
  titulo: string;
  /** Uma breve descrição do comportamento necessário para obter a conquista */
  descricao: string;
  /** O nome do ícone correspondente no pacote @hugeicons/core-free-icons (ex: "StarAwardIcon") */
  iconeName: string;
  /** Define se a conquista está bloqueada para o aluno */
  bloqueado: boolean;
}

const achievementIcons: Record<string, IconSvgElement> = {
  Award01Icon,
  FireIcon,
  GraduateMaleIcon,
};

/**
 * Componente premium de Card de Conquista (Badge) para a gamificação da plataforma Estudea.
 * Exibe medalhas desbloqueadas com efeitos modernos de hover e medalhas bloqueadas em grayscale com ícone de cadeado.
 */
export const CardConquista: React.FC<CardConquistaProps> = ({
  titulo,
  descricao,
  iconeName,
  bloqueado,
}) => {
  const IconComponent = achievementIcons[iconeName] || Award01Icon;

  return (
    <div
      className={`relative p-5 rounded-2xl border transition-all duration-300 flex flex-col items-center text-center space-y-3 shadow-sm select-none ${
        bloqueado
          ? 'grayscale opacity-60 bg-gray-100 border-slate-200 text-slate-500 dark:bg-surface-container dark:border-outline-variant/30 dark:text-on-surface-variant'
          : 'bg-gradient-to-br from-surface-container-lowest to-surface-container-low/40 border-outline-variant/30 hover:border-secondary/40 hover:shadow-md hover:-translate-y-1 text-on-surface'
      }`}
    >
      {/* Mini ícone de cadeado no canto superior para conquistas bloqueadas */}
      {bloqueado && (
        <div className="absolute top-3 right-3 text-slate-400 bg-slate-200/50 p-1 rounded-full dark:bg-surface-container-highest/50 dark:text-on-surface-variant/80" title="Bloqueado">
          <HugeiconsIcon icon={LockPasswordIcon} size={14} strokeWidth={2.5} />
        </div>
      )}

      {/* Círculo do Ícone */}
      <div
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-300 ${
          bloqueado
            ? 'bg-slate-200 text-slate-400 dark:bg-surface-container-high dark:text-on-surface-variant/60'
            : 'bg-secondary/5 text-secondary group-hover:scale-110 shadow-sm border border-secondary/10'
        }`}
      >
        <HugeiconsIcon icon={IconComponent} size={32} strokeWidth={2} />
      </div>

      {/* Conteúdo Textual */}
      <div className="space-y-1">
        <h4 className={`font-heading font-extrabold text-label-md ${bloqueado ? 'text-slate-600 dark:text-on-surface/80' : 'text-on-surface'}`}>
          {titulo}
        </h4>
        <p className={`font-sans text-label-sm ${bloqueado ? 'text-slate-400 dark:text-on-surface-variant/80' : 'text-on-surface-variant'}`}>
          {descricao}
        </p>
      </div>

      {/* Efeito Visual Premium de Progresso/Brilho */}
      {!bloqueado && (
        <div className="absolute bottom-0 inset-x-6 h-1 bg-gradient-to-r from-transparent via-secondary/20 to-transparent rounded-full opacity-0 hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
};
