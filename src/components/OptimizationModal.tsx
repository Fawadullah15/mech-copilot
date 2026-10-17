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
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in p-4 font-sans">
      <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-navy-700/60 flex items-center justify-between bg-navy-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan/15 text-cyan rounded-lg border border-cyan/30">
              <Gauge size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                Multi-Objective Design Optimization
              </h2>
              <p className="text-xs text-gray-400">
                Explore Pareto-optimal trade-offs across mass, cost, strength, and fatigue reserve
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-navy-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Objective Selector Bar */}
        <div className="p-4 bg-navy-950/40 border-b border-navy-800 shrink-0">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Select Optimization Target:
          </div>
          <div className="flex flex-wrap gap-2">
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-accent text-white shadow-md shadow-accent/20 border border-accent'
                      : 'bg-navy-800/80 text-gray-300 hover:bg-navy-700/60 border border-navy-700'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-accent-light'} />
                  {obj.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Candidate Options Grid */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {options.map((opt, idx) => {
              const isApplied = appliedOptionId === opt.id;
              const isRecommended = opt.isRecommended;

              return (
                <div
                  key={opt.id}
                  className={`card flex flex-col justify-between p-5 relative rounded-xl border transition-all ${
                    isRecommended
                      ? 'bg-navy-850 border-accent/60 shadow-lg shadow-accent/10'
                      : 'bg-navy-800/80 border-navy-700 hover:border-navy-600'
                  }`}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-4 px-2.5 py-0.5 bg-accent text-white text-[11px] font-bold rounded-full uppercase tracking-wider shadow">
                      AI Recommended
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono font-bold text-gray-400">
                        Option {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-navy-700 text-cyan font-medium border border-navy-600">
                        {opt.tag}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-gray-100 mb-1">{opt.title}</h3>
                    <p className="text-xs text-accent-light font-medium mb-3">{opt.materialName}</p>

                    {/* Metrics table */}
                    <div className="space-y-1.5 bg-navy-900/90 p-3 rounded-lg border border-navy-700/50 mb-3 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Diameter:</span>
                        <span className="font-bold text-gray-200">⌀{opt.diameter} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Est. Weight:</span>
                        <span className="text-gray-200 font-bold">{opt.weightKg} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Safety Factor:</span>
                        <span className="text-status-pass font-bold">{opt.safetyFactor.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cost Category:</span>
                        <span className="text-amber-400 font-medium">{opt.costCategory}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Fatigue Life:</span>
                        <span className="text-gray-300 truncate max-w-[120px]" title={opt.fatigueLifeCycles}>
                          {opt.fatigueLifeCycles}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 leading-relaxed mb-4">
                      {opt.tradeOffSummary}
                    </p>
                  </div>

                  <button
                    onClick={() => handleApplyOption(opt)}
                    disabled={isApplied}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                      isApplied
                        ? 'bg-status-pass/20 text-status-pass border border-status-pass/40'
                        : isRecommended
                        ? 'btn-primary shadow-md shadow-accent/20'
                        : 'btn-secondary'
                    }`}
                  >
                    {isApplied ? (
                      <>
                        <Check size={14} /> Applied to Design
                      </>
                    ) : (
                      <>
                        Apply to Current Design
                        <ArrowUpRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-navy-700/60 bg-navy-950/80 flex items-center justify-between text-xs text-gray-400 shrink-0">
          <span>Parameters update automatically in 3D CAD visualization and calculation engine upon selection.</span>
          <button onClick={onClose} className="btn-ghost py-1.5 px-3">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
