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
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  }[size];

  const variantClasses = {
    primary:
      'bg-blue-600 hover:bg-blue-500 text-white font-semibold border border-blue-400/30 shadow-sm shadow-blue-500/20 active:scale-[0.98]',
    secondary:
      'bg-navy-800 hover:bg-navy-750 text-slate-200 font-medium border border-navy-700 hover:border-navy-600 active:scale-[0.98]',
    ghost:
      'text-slate-400 hover:text-slate-100 hover:bg-navy-800/80 font-medium active:scale-[0.98]',
    danger:
      'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-medium active:scale-[0.98]',
    'outline-accent':
      'border border-accent-bright/40 text-accent-bright hover:bg-accent-bright/10 font-semibold active:scale-[0.98]',
  }[variant];

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded-lg transition-all duration-150 select-none ${sizeClasses} ${variantClasses} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
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
        <span className="ml-1 px-1 py-0.2 text-[9px] font-mono font-semibold bg-black/25 text-slate-400 rounded border border-white/10">
          {shortcut}
        </span>
      )}
    </button>
  );
};
