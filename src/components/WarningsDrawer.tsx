import React from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  X,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { EngineeringWarning } from '../types';

interface WarningsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WarningsDrawer({ isOpen, onClose }: WarningsDrawerProps) {
  const { engineeringWarnings, applyWarningFix } = useApp();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-full max-w-md bg-navy-900 border-l border-navy-700 h-full shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="p-5 border-b border-navy-700 flex items-center justify-between bg-navy-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-100 flex items-center gap-2">
                Engineering Warnings
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  {engineeringWarnings.length}
                </span>
              </h2>
              <p className="text-xs text-gray-400">Automated mechanical integrity checks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-navy-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning Cards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {engineeringWarnings.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <CheckCircle2 size={40} className="text-status-pass mx-auto" />
              <h4 className="text-sm font-bold text-gray-200">No Design Warnings</h4>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Current design parameters satisfy stress, temperature, and material safety margins.
              </p>
            </div>
          ) : (
            engineeringWarnings.map((warning) => {
              const isCritical = warning.severity === 'critical';
              const Icon = isCritical ? AlertOctagon : AlertTriangle;

              return (
                <div
                  key={warning.id}
                  className={`card p-4 rounded-xl border transition-all ${
                    isCritical
                      ? 'bg-red-950/20 border-red-800/60'
                      : 'bg-amber-950/20 border-amber-800/60'
                  }`}
                >
                  <div className="flex items-start gap-2.5 mb-2">
                    <Icon
                      size={18}
                      className={`mt-0.5 shrink-0 ${
                        isCritical ? 'text-status-fail' : 'text-status-warning'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider ${
                            isCritical ? 'text-status-fail' : 'text-status-warning'
                          }`}
                        >
                          {warning.severity}
                        </span>
                        <span className="text-xs font-mono text-gray-400">
                          {warning.affectedParameter}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-100 mt-0.5">{warning.title}</h4>
                    </div>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed mb-3">{warning.reason}</p>

                  {/* Current vs Required box */}
                  <div className="grid grid-cols-2 gap-2 bg-navy-900/90 p-2.5 rounded-lg border border-navy-800 text-xs font-mono mb-3">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Current Value</span>
                      <span className="text-red-400 font-bold">{warning.currentValue}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Required Margin</span>
                      <span className="text-status-pass font-bold">{warning.requiredValue}</span>
                    </div>
                  </div>

                  {/* Recommended action & button */}
                  <div className="pt-2 border-t border-navy-800">
                    <div className="text-xs text-gray-400 mb-2">
                      <strong className="text-gray-200">AI Recommendation: </strong>
                      {warning.recommendedAction}
                    </div>

                    {warning.autoFixValue && (
                      <button
                        onClick={() => applyWarningFix(warning.id)}
                        className="btn-primary w-full py-2 text-xs flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        Apply Recommendation
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-navy-700 bg-navy-950 flex items-center justify-between text-xs text-gray-400">
          <span>Automated evaluation using Shigley & AGMA formulas</span>
          <button onClick={onClose} className="btn-ghost py-1 px-3">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
