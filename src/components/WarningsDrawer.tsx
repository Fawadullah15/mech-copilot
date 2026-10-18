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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-xs animate-fade-in font-sans">
      <div className="w-full max-w-md bg-[#191C1F] border-l border-[#34393F] h-full shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="p-4 border-b border-[#34393F] flex items-center justify-between bg-[#22262A]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-[3px] bg-[#14171A] text-[#E7B65C] border border-[#34393F]">
              <ShieldAlert size={16} />
            </div>
            <div>
              <h2 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider flex items-center gap-2">
                Engineering Diagnostics
                <span className="text-[10px] px-1.5 py-0.2 rounded-[2px] bg-[#E7B65C]/15 text-[#E7B65C] font-mono border border-[#E7B65C]/30">
                  {engineeringWarnings.length}
                </span>
              </h2>
              <p className="text-[11px] text-[#969DA5] font-mono">Automated mechanical integrity verifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#969DA5] hover:text-white p-1 rounded-[3px] hover:bg-[#2E3339] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Warning Cards List */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 font-sans">
          {engineeringWarnings.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <CheckCircle2 size={32} className="text-[#34D399] mx-auto" />
              <h4 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">Zero Active Faults</h4>
              <p className="text-xs text-[#969DA5] max-w-xs mx-auto font-mono">
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
                  className={`p-3 rounded-[4px] border transition-colors ${
                    isCritical
                      ? 'bg-[#E16D72]/10 border-[#E16D72]/40'
                      : 'bg-[#E7B65C]/10 border-[#E7B65C]/40'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <Icon
                      size={15}
                      className={`mt-0.5 shrink-0 ${
                        isCritical ? 'text-[#E16D72]' : 'text-[#E7B65C]'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                            isCritical ? 'text-[#E16D72]' : 'text-[#E7B65C]'
                          }`}
                        >
                          {warning.severity}
                        </span>
                        <span className="text-[10px] font-mono text-[#969DA5]">
                          {warning.affectedParameter}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[#F0F1F2] mt-0.5">{warning.title}</h4>
                    </div>
                  </div>

                  <p className="text-xs text-[#C2C8D0] leading-relaxed mb-2.5">{warning.reason}</p>

                  {/* Current vs Required box */}
                  <div className="grid grid-cols-2 gap-2 bg-[#14171A] p-2 rounded-[3px] border border-[#2A2E35] text-xs font-mono mb-2.5">
                    <div>
                      <span className="text-[#969DA5] block text-[9px] uppercase">Current Value</span>
                      <span className="text-[#E16D72] font-bold">{warning.currentValue}</span>
                    </div>
                    <div>
                      <span className="text-[#969DA5] block text-[9px] uppercase">Required Margin</span>
                      <span className="text-[#34D399] font-bold">{warning.requiredValue}</span>
                    </div>
                  </div>

                  {/* Recommended action & button */}
                  <div className="pt-2 border-t border-[#2A2E35]">
                    <div className="text-[11px] text-[#969DA5] mb-2 font-mono">
                      <strong className="text-[#F0F1F2]">Advisory: </strong>
                      {warning.recommendedAction}
                    </div>

                    {warning.autoFixValue && (
                      <button
                        onClick={() => applyWarningFix(warning.id)}
                        className="w-full bg-[#64D6C5] hover:bg-[#52c4b3] text-[#111315] font-mono text-xs font-semibold py-1.5 px-3 rounded-[3px] flex items-center justify-center gap-1.5 transition-colors shadow-sm"
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
        <div className="px-4 py-2.5 border-t border-[#34393F] bg-[#22262A] flex items-center justify-between text-[10px] font-mono text-[#969DA5]">
          <span>Automated evaluation using Shigley & AGMA standards</span>
          <button
            onClick={onClose}
            className="text-[#969DA5] hover:text-white py-0.5 px-2 font-mono"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
