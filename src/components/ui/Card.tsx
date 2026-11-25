import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  ...props
}) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  }[padding];

  const variantClasses = {
    default: 'bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#1E2D45] shadow-xs rounded-[8px]',
    elevated: 'bg-white dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F] shadow-panel rounded-[8px]',
    glass: 'bg-white/95 dark:bg-[#101A2B]/95 backdrop-blur-md border border-[#E2E8F0] dark:border-[#1E2D45] shadow-panel rounded-[8px]',
    interactive:
      'bg-white dark:bg-[#101A2B] hover:border-[#2563EB]/50 hover:shadow-panel border border-[#E2E8F0] dark:border-[#1E2D45] rounded-[8px] cursor-pointer transition-all duration-150',
  }[variant];

  return (
    <div className={`${variantClasses} ${paddingClasses} ${className}`} {...props}>
      {children}
    </div>
  );
};
