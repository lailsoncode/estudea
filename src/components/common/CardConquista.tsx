import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import type { IconSvgElement } from '@hugeicons/react';
import {
  Award01Icon,
  BookOpen01Icon,
  FireIcon,
  GraduateMaleIcon,
  Layers01Icon,
  LockPasswordIcon,
  NotebookIcon,
  Rocket01Icon,
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
  BookOpen01Icon,
  FireIcon,
  GraduateMaleIcon,
  Layers01Icon,
  NotebookIcon,
  Rocket01Icon,
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
      className={`product-card group relative flex min-h-[190px] flex-col items-center justify-center space-y-3 p-4 text-center select-none sm:p-5 ${
        bloqueado ? 'text-on-surface-variant' : 'text-on-surface hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-product-elevated'
      }`}
    >
      {/* Mini ícone de cadeado no canto superior para conquistas bloqueadas */}
      {bloqueado && (
        <div className="absolute right-3 top-3 rounded-full bg-surface-container-high p-1.5 text-on-surface-variant" title="Bloqueado">
          <HugeiconsIcon icon={LockPasswordIcon} size={14} strokeWidth={2.5} />
        </div>
      )}

      {/* Círculo do Ícone */}
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-[20px] border transition-transform duration-300 ${
          bloqueado
            ? 'border-outline-variant/50 bg-surface-container-high text-on-surface-variant'
            : 'border-primary/15 bg-primary/10 text-primary shadow-sm group-hover:scale-105'
        }`}
      >
        <HugeiconsIcon icon={IconComponent} size={32} strokeWidth={2} />
      </div>

      {/* Conteúdo Textual */}
      <div className="space-y-1">
        <h4 className="font-heading text-sm font-extrabold text-on-surface">
          {titulo}
        </h4>
        <p className="font-sans text-xs leading-relaxed text-on-surface-variant">
          {descricao}
        </p>
      </div>
    </div>
  );
};
