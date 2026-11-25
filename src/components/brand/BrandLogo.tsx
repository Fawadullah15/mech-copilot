import React from 'react';
import { BrandIcon } from './BrandIcon';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  compact?: boolean;
  className?: string;
  variant?: 'filled' | 'outline' | 'monochrome';
  isDarkTheme?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = false,
  compact = false,
  className = '',
  variant = 'filled',
  isDarkTheme = true,
}) => {
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 34 : 28;

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <BrandIcon size={iconSize} variant={variant} />
      {!compact && (
        <div className="flex flex-col leading-tight">
          <div className={`font-sans font-semibold tracking-tight text-sm ${isDarkTheme ? 'text-white' : 'text-[#172033]'}`}>
            <div>Mechanical</div>
            <div className="text-xs text-white/90">Copilot</div>
          </div>
          {showSubtitle && (
            <span className="text-[9px] uppercase tracking-[0.18em] text-[#8D9BB5] font-mono mt-0.5">
              CAD Workspace
            </span>
          )}
        </div>
      )}
    </div>
  );
};
