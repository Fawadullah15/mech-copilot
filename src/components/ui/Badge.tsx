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
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.2 text-[10px]' : 'px-2 py-0.5 text-[11px]';

  const variantClasses = {
    pass: 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30',
    warning: 'bg-[#E7B65C]/15 text-[#E7B65C] border-[#E7B65C]/30',
    critical: 'bg-[#E16D72]/15 text-[#E16D72] border-[#E16D72]/30',
    info: 'bg-[#64D6C5]/10 text-[#64D6C5] border-[#64D6C5]/20',
    neutral: 'bg-[#22262A] text-[#969DA5] border-[#34393F]',
    accent: 'bg-[#64D6C5]/15 text-[#64D6C5] border-[#64D6C5]/30',
    mono: 'bg-[#14171A] text-[#969DA5] border-[#2A2E35]',
  }[variant];

  const dotColor = {
    pass: 'bg-[#34D399]',
    warning: 'bg-[#E7B65C]',
    critical: 'bg-[#E16D72]',
    info: 'bg-[#64D6C5]',
    neutral: 'bg-[#969DA5]',
    accent: 'bg-[#64D6C5]',
    mono: 'bg-[#6C737D]',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[2px] border font-mono font-medium leading-none whitespace-nowrap ${sizeClasses} ${variantClasses} ${className}`}
    >
      {withSymbol && ['pass', 'warning', 'critical', 'info'].includes(variant) && (
        <EngineeringStatusSymbol status={variant as EngineeringStatusType} size={11} />
      )}
      {withDot && !withSymbol && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      )}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
