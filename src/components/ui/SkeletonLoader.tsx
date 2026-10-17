import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'line' | 'rect' | 'circle' | 'card';
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'line',
}) => {
  if (variant === 'circle') {
    return <div className={`rounded-full bg-navy-800 animate-pulse ${className}`} />;
  }

  if (variant === 'card') {
    return (
      <div className={`p-4 rounded-xl bg-navy-900 border border-navy-800 animate-pulse space-y-3 ${className}`}>
        <div className="h-4 bg-navy-800 rounded w-1/3" />
        <div className="h-3 bg-navy-800/60 rounded w-2/3" />
        <div className="h-8 bg-navy-800/40 rounded w-full" />
      </div>
    );
  }

  return (
    <div
      className={`rounded bg-navy-800/80 animate-pulse ${
        variant === 'line' ? 'h-3 w-full' : 'h-24 w-full'
      } ${className}`}
    />
  );
};
