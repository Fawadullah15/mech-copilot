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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in font-sans">
      <div
        className={`w-full ${maxWidthClasses} bg-[#191C1F] border border-[#34393F] rounded-[4px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden`}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-[#34393F] flex items-center justify-between bg-[#22262A] shrink-0">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="p-1.5 rounded-[3px] bg-[#14171A] border border-[#34393F] text-[#64D6C5]">
                {icon}
              </div>
            )}
            <div>
              <h2 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">{title}</h2>
              {subtitle && <p className="text-[11px] font-mono text-[#969DA5] mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#969DA5] hover:text-white rounded-[3px] hover:bg-[#2E3339] transition-colors"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex-1 font-sans">{children}</div>

        {/* Optional Modal Footer */}
        {footer && (
          <div className="px-4 py-2.5 border-t border-[#34393F] bg-[#22262A] flex items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
