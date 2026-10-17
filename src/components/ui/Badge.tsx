import React from 'react';
import { EngineeringStatusSymbol, EngineeringStatusType } from '../brand/EngineeringStatusSymbol';

export interface BadgeProps {
  variant?: 'pass' | 'warning' | 'critical' | 'info' | 'neutral' | 'accent' | 'mono';
  size?: 'sm' | 'md';
  withDot?: boolean;
  withSymbol?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  withDot = false,
  withSymbol = false,
  children,
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  const variantClasses = {
    pass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    critical: 'bg-red-500/15 text-red-400 border-red-500/30',
    info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    neutral: 'bg-navy-800 text-slate-300 border-navy-700',
    accent: 'bg-accent/15 text-accent-light border-accent/30',
    mono: 'bg-navy-950 text-slate-400 border-navy-800 font-mono',
  }[variant];

  const dotColor = {
    pass: 'bg-emerald-400',
    warning: 'bg-amber-400',
    critical: 'bg-red-400',
    info: 'bg-blue-400',
    neutral: 'bg-slate-400',
    accent: 'bg-sky-400',
    mono: 'bg-slate-500',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium leading-none whitespace-nowrap ${sizeClasses} ${variantClasses} ${className}`}
    >
      {withSymbol && ['pass', 'warning', 'critical', 'info'].includes(variant) && (
        <EngineeringStatusSymbol status={variant as EngineeringStatusType} size={12} />
      )}
      {withDot && !withSymbol && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      )}
      <span>{children}</span>
    </span>
  );
};

export default Badge;

