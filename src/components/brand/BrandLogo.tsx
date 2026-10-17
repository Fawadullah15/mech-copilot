import React from 'react';
import { BrandIcon } from './BrandIcon';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  compact?: boolean;
  className?: string;
  variant?: 'filled' | 'outline' | 'monochrome';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  compact = false,
  className = '',
  variant = 'filled',
}) => {
  const imgSize = size === 'sm' ? 28 : size === 'lg' ? 48 : 36;
  const titleClass =
    size === 'sm'
      ? 'text-sm font-bold tracking-tight'
      : size === 'lg'
      ? 'text-xl font-bold tracking-tight'
      : 'text-base font-bold tracking-tight';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <img src="/q-logo.png" alt="Logo" width={imgSize} height={imgSize} className="object-contain drop-shadow-md" />
      {!compact && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`${titleClass} bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent tracking-tight font-sans`}>
              QUANTUM
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-accent/15 text-accent-light border border-accent/20 font-semibold tracking-wide">
              ME
            </span>
          </div>
          {showSubtitle && (
            <span className="text-[9px] uppercase tracking-[0.18em] text-gray-400 font-mono mt-0.5">
              Design Copilot
            </span>
          )}
        </div>
      )}
    </div>
  );
};
