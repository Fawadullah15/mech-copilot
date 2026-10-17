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
    lg: 'p-6',
  }[padding];

  const variantClasses = {
    default: 'bg-navy-900 border border-navy-750 shadow-elevation-1 rounded-xl',
    elevated: 'bg-navy-850 border border-navy-700 shadow-elevation-2 rounded-xl',
    glass: 'bg-navy-900/80 backdrop-blur-md border border-navy-700/60 shadow-elevation-2 rounded-xl',
    interactive:
      'bg-navy-900 hover:bg-navy-850 border border-navy-750 hover:border-navy-600 shadow-elevation-1 hover:shadow-elevation-2 rounded-xl cursor-pointer transition-all duration-150',
  }[variant];

  return (
    <div className={`${variantClasses} ${paddingClasses} ${className}`} {...props}>
      {children}
    </div>
  );
};
