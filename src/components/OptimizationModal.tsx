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
  const { designParams, updateDesignParam, selectMaterial, sendCopilotMessage } = useApp();
  const [activeObjective, setActiveObjective] = useState<OptimizationObjective>('balanced');
  const [appliedOptionId, setAppliedOptionId] = useState<string | null>(null);

  if (!isOpen) return null;

  const options = generateOptimizationOptions(activeObjective, designParams);

  const handleApplyOption = (opt: OptimizationOption) => {
    updateDesignParam('diameter', opt.diameter);
    selectMaterial(opt.materialId);
    setAppliedOptionId(opt.id);

    sendCopilotMessage(
      `Optimization option applied: "${opt.title}". Diameter set to ${opt.diameter} mm with ${opt.materialName}. Estimated mass: ${opt.weightKg} kg, FoS: ${opt.safetyFactor}.`
    );

    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs animate-fade-in p-4 font-sans">
      <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#34393F] flex items-center justify-between bg-[#22262A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#14171A] text-[#64D6C5] rounded-[3px] border border-[#34393F]">
              <Gauge size={16} />
            </div>
            <div>
              <h2 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">
                Multi-Objective Design Optimization
              </h2>
              <p className="text-[11px] text-[#969DA5] font-mono">
                Explore Pareto-optimal trade-offs across mass, cost, yield reserve, and fatigue life.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#969DA5] hover:text-white p-1 rounded-[3px] hover:bg-[#2E3339] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Objective Selector Bar */}
        <div className="p-3 bg-[#14171A] border-b border-[#2A2E35] shrink-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#969DA5] mb-1.5">
            Select Optimization Target:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {OBJECTIVES.map((obj) => {
              const Icon = obj.icon;
              const isActive = activeObjective === obj.id;
              return (
                <button
                  key={obj.id}
                  onClick={() => {
                    setActiveObjective(obj.id);
                    setAppliedOptionId(null);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] text-xs font-mono transition-colors ${
                    isActive
                      ? 'bg-[#22262A] text-[#64D6C5] font-bold border border-[#34393F]'
                      : 'bg-[#191C1F] hover:bg-[#22262A] text-[#969DA5] hover:text-[#F0F1F2] border border-[#2A2E35]'
                  }`}
                >
                  <Icon size={12} className={isActive ? 'text-[#64D6C5]' : 'text-[#969DA5]'} />
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
                  className={`flex flex-col justify-between p-3.5 relative rounded-[4px] border transition-colors ${
                    isRecommended
                      ? 'bg-[#14171A] border-[#64D6C5]/50'
                      : 'bg-[#14171A] border-[#2A2E35] hover:border-[#34393F]'
                  }`}
                >
                  {isRecommended && (
                    <div className="absolute -top-2 left-3 px-2 py-0.2 bg-[#64D6C5] text-[#111315] text-[9px] font-mono font-bold rounded-[2px] uppercase tracking-wider">
                      Optimal Target
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-start mb-1.5 pt-1">
                      <span className="text-[10px] font-mono font-bold text-[#969DA5]">
                        Option {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] bg-[#22262A] text-[#64D6C5] border border-[#34393F]">
                        {opt.tag}
                      </span>
                    </div>

                    <h3 className="text-xs font-mono font-bold text-[#F0F1F2] mb-0.5">{opt.title}</h3>
                    <p className="text-[11px] font-mono text-[#64D6C5] mb-2">{opt.materialName}</p>

                    {/* Metrics table */}
                    <div className="space-y-1 bg-[#191C1F] p-2 rounded-[3px] border border-[#2A2E35] mb-2.5 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-[#969DA5] text-[10px]">Diameter:</span>
                        <span className="font-bold text-[#F0F1F2]">⌀{opt.diameter} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#969DA5] text-[10px]">Est. Weight:</span>
                        <span className="text-[#F0F1F2] font-semibold">{opt.weightKg} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#969DA5] text-[10px]">Safety Factor:</span>
                        <span className="text-[#34D399] font-bold">{opt.safetyFactor.toFixed(2)}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#969DA5] text-[10px]">Cost Category:</span>
                        <span className="text-[#E7B65C]">{opt.costCategory}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#969DA5] text-[10px]">Fatigue Life:</span>
                        <span className="text-[#F0F1F2] truncate max-w-[110px]" title={opt.fatigueLifeCycles}>
                          {opt.fatigueLifeCycles}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-[#969DA5] leading-relaxed mb-3 font-sans">
                      {opt.tradeOffSummary}
                    </p>
                  </div>

                  <button
                    onClick={() => handleApplyOption(opt)}
                    disabled={isApplied}
                    className={`w-full py-1.5 px-3 rounded-[3px] text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      isApplied
                        ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/40'
                        : isRecommended
                        ? 'bg-[#64D6C5] hover:bg-[#52c4b3] text-[#111315]'
                        : 'bg-[#22262A] hover:bg-[#2E3339] text-[#F0F1F2] border border-[#34393F]'
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
        <div className="px-4 py-2.5 border-t border-[#34393F] bg-[#22262A] flex items-center justify-between text-[11px] font-mono text-[#969DA5] shrink-0">
          <span>Parameters update automatically across CAD viewport and calculations engine upon selection.</span>
          <button
            onClick={onClose}
            className="bg-[#14171A] hover:bg-[#2A2E35] text-[#F0F1F2] border border-[#34393F] text-xs font-mono py-1 px-3 rounded-[3px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
