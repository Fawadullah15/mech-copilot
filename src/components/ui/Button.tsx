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
    xs: 'px-2 py-0.5 text-[10px] gap-1',
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3.5 py-1.5 text-xs gap-2',
    lg: 'px-4 py-2 text-sm gap-2',
  }[size];

  const variantClasses = {
    primary:
      'bg-[#64D6C5] hover:bg-[#52c4b3] text-[#111315] font-mono font-semibold shadow-sm transition-colors',
    secondary:
      'bg-[#14171A] hover:bg-[#22262A] text-[#F0F1F2] border border-[#34393F] font-mono transition-colors',
    ghost:
      'text-[#969DA5] hover:text-[#F0F1F2] hover:bg-[#22262A] font-mono transition-colors',
    danger:
      'bg-[#E16D72]/15 hover:bg-[#E16D72]/25 text-[#E16D72] border border-[#E16D72]/30 font-mono transition-colors',
    'outline-accent':
      'border border-[#64D6C5]/40 text-[#64D6C5] hover:bg-[#64D6C5]/10 font-mono font-semibold transition-colors',
  }[variant];

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded-[3px] select-none ${sizeClasses} ${variantClasses} ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
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
        <span className="ml-1 px-1 py-0.2 text-[9px] font-mono font-semibold bg-black/40 text-[#969DA5] rounded-[2px] border border-[#34393F]">
          {shortcut}
        </span>
      )}
    </button>
  );
};
