import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  width = 'md',
  children,
  footer,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'w-[360px]',
    md: 'w-[420px]',
    lg: 'w-[520px]',
    xl: 'w-[640px]',
  }[width];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-over Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-8">
        <div
          className={`${widthClasses} max-w-screen bg-[#191C1F] border-l border-[#34393F] shadow-2xl flex flex-col animate-slide-in relative`}
        >
          {/* Header */}
          <div className="h-12 px-4 border-b border-[#34393F] flex items-center justify-between bg-[#22262A] shrink-0">
            <div className="flex items-center gap-2.5">
              {icon && (
                <div className="p-1.5 rounded-[3px] bg-[#14171A] border border-[#34393F] text-[#64D6C5]">
                  {icon}
                </div>
              )}
              <div>
                <h3 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">{title}</h3>
                {subtitle && <p className="text-[11px] font-mono text-[#969DA5] mt-0.5">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-[#969DA5] hover:text-white rounded-[3px] hover:bg-[#2E3339] transition-colors"
              title="Close drawer (Esc)"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto flex-1 font-sans">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="px-4 py-2.5 border-t border-[#34393F] bg-[#22262A] flex items-center justify-end gap-2 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
