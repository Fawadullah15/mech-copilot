import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  maxWidth = 'lg',
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

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/50 backdrop-blur-xs animate-fade-in font-sans">
      <div
        className={`w-full ${maxWidthClasses} bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#1E2D45] rounded-[8px] shadow-modal flex flex-col max-h-[90vh] overflow-hidden`}
      >
        <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#1E2D45] flex items-center justify-between bg-[#F8FAFC] dark:bg-[#162236] shrink-0">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="p-1.5 rounded-[6px] bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#334155] text-[#2563EB]">
                {icon}
              </div>
            )}
            <div>
              <h2 className="text-xs font-mono font-bold text-[#172033] dark:text-white uppercase tracking-wider">{title}</h2>
              {subtitle && <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[5px] text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#E2E8F0] dark:hover:bg-[#1B2942] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 text-[#172033] dark:text-[#F0F4FA]">{children}</div>

        {footer && (
          <div className="px-4 py-3 border-t border-[#E2E8F0] dark:border-[#1E2D45] bg-[#F8FAFC] dark:bg-[#162236] flex items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
