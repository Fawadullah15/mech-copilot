import React from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  X,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface WarningsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WarningsDrawer({ isOpen, onClose }: WarningsDrawerProps) {
  const { engineeringWarnings, applyWarningFix } = useApp();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#0F172A]/50 backdrop-blur-xs animate-fade-in font-sans">
      <div className="w-full max-w-md bg-white dark:bg-[#101A2B] border-l border-[#E2E8F0] dark:border-[#1E2D45] h-full shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="p-4 border-b border-[#E2E8F0] dark:border-[#1E2D45] flex items-center justify-between bg-[#F8FAFC] dark:bg-[#162236]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-[6px] bg-white dark:bg-[#101A2B] text-[#D97706] border border-[#E2E8F0] dark:border-[#334155]">
              <ShieldAlert size={16} />
            </div>
            <div>
              <h2 className="text-xs font-mono font-bold text-[#172033] dark:text-white uppercase tracking-wider flex items-center gap-2">
                Engineering Diagnostics
                <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#FFFBEB] text-[#D97706] font-mono border border-[#FDE68A]">
                  {engineeringWarnings.length}
                </span>
              </h2>
              <p className="text-[11px] text-[#64748B] font-mono">Automated mechanical integrity verifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#172033] dark:hover:text-white p-1 rounded-[5px] hover:bg-[#E2E8F0] dark:hover:bg-[#1B2942] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Warning Cards List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 font-sans">
          {engineeringWarnings.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <CheckCircle2 size={32} className="text-[#16A34A] mx-auto" />
              <h4 className="text-xs font-mono font-bold text-[#172033] dark:text-white uppercase tracking-wider">Zero Active Faults</h4>
              <p className="text-xs text-[#64748B] max-w-xs mx-auto font-mono">
                Current design parameters satisfy stress, deflection, and material safety margins.
              </p>
            </div>
          ) : (
            engineeringWarnings.map((warning) => {
              const isCritical = warning.severity === 'critical';
              const Icon = isCritical ? AlertOctagon : AlertTriangle;

              return (
                <div
                  key={warning.id}
                  className={`p-3 rounded-[8px] border transition-colors ${
                    isCritical
                      ? 'bg-[#FEF2F2] dark:bg-[#450A0A]/30 border-[#FECACA] dark:border-[#DC2626]/40'
                      : 'bg-[#FFFBEB] dark:bg-[#451A03]/30 border-[#FDE68A] dark:border-[#D97706]/40'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <Icon
                      size={15}
                      className={`mt-0.5 shrink-0 ${
                        isCritical ? 'text-[#DC2626]' : 'text-[#D97706]'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                            isCritical ? 'text-[#DC2626]' : 'text-[#D97706]'
                          }`}
                        >
                          {warning.severity}
                        </span>
                        <span className="text-[10px] font-mono text-[#64748B]">
                          {warning.affectedParameter}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[#172033] dark:text-white mt-0.5">{warning.title}</h4>
                    </div>
                  </div>

                  <p className="text-xs text-[#475569] dark:text-[#CBD5E1] leading-relaxed mb-2.5">{warning.reason}</p>

                  <div className="grid grid-cols-2 gap-2 bg-white dark:bg-[#101A2B] p-2 rounded-[6px] border border-[#E2E8F0] dark:border-[#24344F] text-xs font-mono mb-2.5">
                    <div>
                      <span className="text-[#64748B] block text-[9px] uppercase">Current Value</span>
                      <span className="text-[#DC2626] font-bold">{warning.currentValue}</span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[9px] uppercase">Required Margin</span>
                      <span className="text-[#16A34A] font-bold">{warning.requiredValue}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#24344F]">
                    <div className="text-[11px] text-[#64748B] mb-2 font-mono">
                      <strong className="text-[#172033] dark:text-white">Advisory: </strong>
                      {warning.recommendedAction}
                    </div>

                    {warning.autoFixValue && (
                      <button
                        onClick={() => applyWarningFix(warning.id)}
                        className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-mono text-xs font-semibold py-1.5 px-3 rounded-[6px] flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                      >
                        <span>Apply Recommended Parameter</span>
                        <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-[#E2E8F0] dark:border-[#1E2D45] bg-[#F8FAFC] dark:bg-[#162236] flex items-center justify-between text-[10px] font-mono text-[#64748B]">
          <span>Automated evaluation using Shigley & AGMA standards</span>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#172033] dark:hover:text-white py-0.5 px-2 font-mono"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
