import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`p-10 flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-navy-750 bg-navy-900/40 select-none ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-navy-800 border border-navy-700/80 flex items-center justify-center text-accent-bright mb-4 shadow-elevation-1">
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-100 mb-1.5 tracking-tight">{title}</h3>
      <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
