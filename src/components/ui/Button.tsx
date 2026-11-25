import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline-accent';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  shortcut?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'sm',
  isLoading = false,
  leftIcon,
  rightIcon,
  shortcut,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    xs: 'px-2 py-1 text-[11px] gap-1',
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-1.5 text-xs gap-2',
    lg: 'px-4 py-2 text-sm gap-2',
  }[size];

  const variantClasses = {
    primary:
      'bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-sans font-semibold shadow-xs transition-colors',
    secondary:
      'bg-[#F8FAFC] dark:bg-[#1B2942] hover:bg-[#EFF6FF] dark:hover:bg-[#24344F] text-[#172033] dark:text-[#F0F4FA] border border-[#E2E8F0] dark:border-[#334155] font-sans transition-colors',
    ghost:
      'text-[#64748B] dark:text-[#94A3B8] hover:text-[#172033] dark:hover:text-white hover:bg-[#F1F5F9] dark:hover:bg-[#1B2942] font-sans transition-colors',
    danger:
      'bg-[#FEF2F2] dark:bg-[#450A0A]/40 hover:bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] dark:border-[#DC2626]/40 font-sans transition-colors',
    'outline-accent':
      'border border-[#BFDBFE] dark:border-[#2563EB]/40 text-[#2563EB] hover:bg-[#EFF6FF] dark:hover:bg-[#1B2942] font-sans font-semibold transition-colors',
  }[variant];

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded-[6px] select-none ${sizeClasses} ${variantClasses} ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin w-3.5 h-3.5" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children && <span>{children}</span>}
      {rightIcon && !isLoading && <span className="shrink-0">{rightIcon}</span>}
      {shortcut && (
        <span className="ml-1 px-1 py-0.5 text-[9px] font-mono font-semibold bg-[#F1F5F9] dark:bg-[#101A2B] text-[#64748B] rounded-[3px] border border-[#E2E8F0] dark:border-[#334155]">
          {shortcut}
        </span>
      )}
    </button>
  );
};
