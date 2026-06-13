import React from 'react';

type CardVariant = 'default' | 'glass' | 'metric' | 'error';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  children: React.ReactNode;
  padding?: boolean;
  hoverable?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default:
    'bg-surface-container-lowest border border-outline-variant/40 rounded-xl shadow-sm',
  glass:
    'glass-card rounded-2xl',
  metric:
    'bg-surface-container-lowest border border-outline-variant/40 rounded-xl shadow-sm hover:-translate-y-1 transition-transform duration-300',
  error:
    'bg-surface-container-lowest border border-error/20 rounded-xl shadow-sm',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  children,
  padding = true,
  hoverable = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={[
        variantClasses[variant],
        padding ? 'p-6' : '',
        hoverable ? 'hover:shadow-md transition-shadow' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  );
};
