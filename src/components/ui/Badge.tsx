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
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]';

  const variantClasses = {
    pass: 'bg-[#F0FDF4] dark:bg-[#052E16]/40 text-[#16A34A] border-[#BBF7D0] dark:border-[#16A34A]/40',
    warning: 'bg-[#FFFBEB] dark:bg-[#451A03]/40 text-[#D97706] border-[#FDE68A] dark:border-[#D97706]/40',
    critical: 'bg-[#FEF2F2] dark:bg-[#450A0A]/40 text-[#DC2626] border-[#FECACA] dark:border-[#DC2626]/40',
    info: 'bg-[#EFF6FF] dark:bg-[#1B2942] text-[#2563EB] border-[#BFDBFE] dark:border-[#2563EB]/40',
    neutral: 'bg-[#F1F5F9] dark:bg-[#1B2942] text-[#64748B] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#334155]',
    accent: 'bg-[#EFF6FF] dark:bg-[#1B2942] text-[#2563EB] border-[#BFDBFE] dark:border-[#2563EB]/40',
    mono: 'bg-[#F8FAFC] dark:bg-[#101A2B] text-[#64748B] dark:text-[#94A3B8] border-[#E2E8F0] dark:border-[#334155]',
  }[variant];

  const dotColor = {
    pass: 'bg-[#16A34A]',
    warning: 'bg-[#D97706]',
    critical: 'bg-[#DC2626]',
    info: 'bg-[#2563EB]',
    neutral: 'bg-[#94A3B8]',
    accent: 'bg-[#2563EB]',
    mono: 'bg-[#64748B]',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[4px] border font-mono font-medium leading-none whitespace-nowrap ${sizeClasses} ${variantClasses} ${className}`}
    >
      {withSymbol && ['pass', 'warning', 'critical', 'info'].includes(variant) && (
        <EngineeringStatusSymbol status={variant as EngineeringStatusType} size={11} />
      )}
      {withDot && !withSymbol && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      )}
      <span>{children}</span>
    </span>
  );
};
