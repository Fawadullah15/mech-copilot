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
    sm: 'w-full sm:w-[360px]',
    md: 'w-full sm:w-[420px]',
    lg: 'w-full sm:w-[520px]',
    xl: 'w-full sm:w-[640px]',
  }[width];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      <div
        className="absolute inset-0 bg-[#0F172A]/50 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-8">
        <div
          className={`${widthClasses} max-w-full bg-white dark:bg-[#101A2B] border-l border-[#E2E8F0] dark:border-[#1E2D45] shadow-modal flex flex-col animate-slide-in relative`}
        >
          <div className="h-12 px-4 border-b border-[#E2E8F0] dark:border-[#1E2D45] flex items-center justify-between bg-[#F8FAFC] dark:bg-[#162236] shrink-0">
            <div className="flex items-center gap-2.5">
              {icon && (
                <div className="p-1.5 rounded-[6px] bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#334155] text-[#2563EB]">
                  {icon}
                </div>
              )}
              <div>
                <h2 className="text-xs font-mono font-bold text-[#172033] dark:text-white uppercase tracking-wider">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-mono mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-[5px] text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#E2E8F0] dark:hover:bg-[#1B2942] transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 text-[#172033] dark:text-[#F0F4FA]">{children}</div>

          {footer && (
            <div className="px-4 py-3 border-t border-[#E2E8F0] dark:border-[#1E2D45] bg-[#F8FAFC] dark:bg-[#162236] flex items-center justify-end gap-2 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
