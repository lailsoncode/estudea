import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import type { IconSvgElement } from '@hugeicons/react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconSvgElement;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-navy text-on-primary hover:bg-brand-mid active:scale-95 shadow-product-card border border-brand-bright/20',
  secondary:
    'bg-secondary text-on-secondary hover:bg-secondary/90 active:scale-95 shadow-md shadow-secondary/15',
  ghost:
    'bg-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface border border-outline-variant/60 active:scale-95',
  danger:
    'bg-transparent text-on-surface-variant hover:text-error hover:bg-error-container/20 border border-outline-variant/40 hover:border-error/30 active:scale-95',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-2 text-label-sm rounded-product-control gap-1.5',
  md: 'min-h-11 px-5 py-3 text-label-md rounded-product-control gap-2',
  lg: 'min-h-12 px-7 py-4 text-body-md rounded-product-control gap-2.5',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-heading font-bold transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

  return (
    <button
      className={[
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <HugeiconsIcon icon={icon} size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} strokeWidth={2} />
          )}
          <span>{children}</span>
          {icon && iconPosition === 'right' && (
            <HugeiconsIcon icon={icon} size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} strokeWidth={2} />
          )}
        </>
      )}
    </button>
  );
};
