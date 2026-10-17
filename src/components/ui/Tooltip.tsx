import React, { useState } from 'react';

export interface TooltipProps {
  content: string | React.ReactNode;
  shortcut?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
  delayMs?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  shortcut,
  position = 'top',
  children,
  delayMs = 200,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    const id = setTimeout(() => setIsVisible(true), delayMs);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsVisible(false);
  };

  const posClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position];

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 pointer-events-none whitespace-nowrap px-2 py-1 bg-navy-950/95 text-slate-200 border border-navy-700/90 text-[11px] font-sans font-medium rounded-md shadow-elevation-3 flex items-center gap-1.5 animate-fade-in ${posClasses}`}
        >
          <span>{content}</span>
          {shortcut && (
            <span className="px-1 py-0.2 text-[9px] font-mono bg-navy-850 text-slate-400 rounded border border-navy-700">
              {shortcut}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
