import React, { useState } from 'react';
import {
  Gauge,
  X,
  Check,
  Scale,
  DollarSign,
  ShieldCheck,
  Zap,
  SlidersHorizontal,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateOptimizationOptions } from '../data/engineeringRules';
import type { OptimizationObjective, OptimizationOption } from '../types';

interface OptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OBJECTIVES: { id: OptimizationObjective; label: string; icon: LucideIcon }[] = [
  { id: 'weight', label: 'Reduce Weight', icon: Scale },
  { id: 'cost', label: 'Reduce Cost', icon: DollarSign },
  { id: 'strength', label: 'Increase Strength', icon: ShieldCheck },
  { id: 'fatigue', label: 'Increase Fatigue Life', icon: Zap },
  { id: 'balanced', label: 'Balance All Factors', icon: SlidersHorizontal },
];

export default function OptimizationModal({ isOpen, onClose }: OptimizationModalProps) {
  const { designParams, applyRecommendation } = useApp();
  const [activeObjective, setActiveObjective] = useState<OptimizationObjective>('balanced');
  const [appliedOptionId, setAppliedOptionId] = useState<string | null>(null);

  if (!isOpen) return null;

  const options = generateOptimizationOptions(activeObjective, designParams);

  const handleApplyOption = (opt: OptimizationOption) => {
    setAppliedOptionId(opt.id);
    applyRecommendation({
      diameter: opt.diameter,
      materialId: opt.materialId,
    });

    setTimeout(() => {
      onClose();
    }, 550);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 backdrop-blur-xs animate-fade-in p-4 font-sans">
      <div className="bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#1E2D45] rounded-[8px] w-full max-w-4xl shadow-modal overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#1E2D45] flex items-center justify-between bg-[#F8FAFC] dark:bg-[#162236] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white dark:bg-[#101A2B] text-[#2563EB] rounded-[6px] border border-[#E2E8F0] dark:border-[#334155]">
              <Gauge size={16} />
            </div>
            <div>
              <h2 className="text-xs font-mono font-bold text-[#172033] dark:text-white uppercase tracking-wider">
                Multi-Objective Design Optimization
              </h2>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                Explore Pareto-optimal trade-offs across mass, cost, yield reserve, and fatigue life.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#64748B] hover:text-[#172033] dark:hover:text-white p-1 rounded-[5px] hover:bg-[#E2E8F0] dark:hover:bg-[#1B2942] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Objective Selector Bar */}
        <div className="px-4 py-3 bg-[#F8FAFC] dark:bg-[#0D1526] border-b border-[#E2E8F0] dark:border-[#1E2D45] shrink-0">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] mb-1.5">
            Select Optimization Target
          </div>
          <div className="flex flex-wrap gap-1.5">
            {OBJECTIVES.map((obj) => {
              const Icon = obj.icon;
              const isActive = activeObjective === obj.id;
              return (
                <button
                  key={obj.id}
                  type="button"
                  onClick={() => {
                    setActiveObjective(obj.id);
                    setAppliedOptionId(null);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-xs font-mono transition-colors ${
                    isActive
                      ? 'bg-[#2563EB] text-white font-semibold border border-[#2563EB]'
                      : 'bg-white dark:bg-[#162236] hover:bg-[#EFF6FF] dark:hover:bg-[#1B2942] text-[#475569] dark:text-[#94A3B8] hover:text-[#2563EB] dark:hover:text-white border border-[#E2E8F0] dark:border-[#24344F]'
                  }`}
                >
                  <Icon size={12} className={isActive ? 'text-white' : 'text-[#64748B] dark:text-[#94A3B8]'} />
                  {obj.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Candidate Options Grid */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {options.map((opt, idx) => {
              const isApplied = appliedOptionId === opt.id;
              const isRecommended = opt.isRecommended;

              return (
                <div
                  key={opt.id}
                  className={`flex flex-col justify-between p-3.5 relative rounded-[8px] border transition-colors ${
                    isRecommended
                      ? 'bg-[#EFF6FF]/60 dark:bg-[#162236] border-[#BFDBFE] dark:border-[#2563EB]/50'
                      : 'bg-[#F8FAFC] dark:bg-[#162236] border-[#E2E8F0] dark:border-[#24344F] hover:border-[#94A3B8]'
                  }`}
                >
                  {isRecommended && (
                    <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-[#2563EB] text-white text-[9px] font-mono font-bold rounded-[4px] uppercase tracking-wider">
                      Optimal Target
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-start mb-1.5 pt-1">
                      <span className="text-[10px] font-mono font-bold text-[#64748B] dark:text-[#94A3B8]">
                        Option {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] bg-white dark:bg-[#101A2B] text-[#2563EB] border border-[#E2E8F0] dark:border-[#334155]">
                        {opt.tag}
                      </span>
                    </div>

                    <h3 className="text-xs font-mono font-bold text-[#172033] dark:text-white mb-0.5">{opt.title}</h3>
                    <p className="text-[11px] font-mono text-[#2563EB] font-semibold mb-2">{opt.materialName}</p>

                    {/* Metrics table */}
                    <div className="space-y-1 bg-white dark:bg-[#101A2B] p-2.5 rounded-[6px] border border-[#E2E8F0] dark:border-[#24344F] mb-2.5 text-xs font-mono tabular-nums">
                      <div className="flex justify-between">
                        <span className="text-[#64748B] text-[10px]">Diameter:</span>
                        <span className="font-bold text-[#172033] dark:text-white">⌀{opt.diameter} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B] text-[10px]">Est. Weight:</span>
                        <span className="text-[#172033] dark:text-white font-semibold">{opt.weightKg} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B] text-[10px]">Safety Factor:</span>
                        <span className="text-[#16A34A] font-bold">{opt.safetyFactor.toFixed(2)}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B] text-[10px]">Cost Category:</span>
                        <span className="text-[#D97706] font-semibold">{opt.costCategory}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#64748B] text-[10px]">Fatigue Life:</span>
                        <span className="text-[#172033] dark:text-white truncate max-w-[110px]" title={opt.fatigueLifeCycles}>
                          {opt.fatigueLifeCycles}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed mb-3 font-sans">
                      {opt.tradeOffSummary}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyOption(opt)}
                    disabled={isApplied}
                    className={`w-full py-1.5 px-3 rounded-[6px] text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      isApplied
                        ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]'
                        : isRecommended
                        ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
                        : 'bg-white dark:bg-[#101A2B] hover:border-[#2563EB] text-[#172033] dark:text-white border border-[#E2E8F0] dark:border-[#334155]'
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <Check size={13} /> Applied to Design
                      </>
                    ) : (
                      <>
                        Apply to Model
                        <ArrowUpRight size={13} />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#E2E8F0] dark:border-[#1E2D45] bg-[#F8FAFC] dark:bg-[#162236] flex items-center justify-between text-[11px] font-mono text-[#64748B] dark:text-[#94A3B8] shrink-0">
          <span>Parameters update automatically across CAD viewport and calculations engine upon selection.</span>
          <button
            type="button"
            onClick={onClose}
            className="bg-white dark:bg-[#101A2B] hover:border-[#2563EB] text-[#172033] dark:text-white border border-[#E2E8F0] dark:border-[#334155] text-xs font-mono py-1 px-3 rounded-[6px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
