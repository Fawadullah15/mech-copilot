import React, { useState } from 'react';
import { Sparkles, ArrowRight, CheckCircle2, Sliders, X, Terminal } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { parseEngineeringProblem } from '../data/engineeringRules';

interface ProblemInputModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXAMPLE_PROBLEMS = [
  'Design a shaft for 500 Nm torque at 1500 RPM with a safety factor of 2.',
  'Size an automotive drive shaft for 850 Nm torque and 3500 RPM with safety factor 2.5.',
  'Design a lightweight 200 Nm pump shaft for 2200 RPM with safety factor 3.0 at 80°C.',
  'Calculate shaft diameter for 1200 Nm torque with AISI 4340 and safety factor 2.2.',
];

export default function ProblemInputModal({ isOpen, onClose }: ProblemInputModalProps) {
  const { updateDesignParam, runAnalysis, sendCopilotMessage } = useApp();
  const [inputProblem, setInputProblem] = useState(
    'Design a shaft for 500 Nm torque at 1500 RPM with a safety factor of 2.'
  );
  const [isEditing, setIsEditing] = useState(false);

  if (!isOpen) return null;

  const parsed = parseEngineeringProblem(inputProblem);

  const handleApplyAndAnalyze = () => {
    if (parsed.torque) updateDesignParam('torque', parsed.torque);
    if (parsed.rpm) updateDesignParam('rpm', parsed.rpm);
    if (parsed.safetyFactor) updateDesignParam('safetyFactor', parsed.safetyFactor);
    if (parsed.diameter) updateDesignParam('diameter', parsed.diameter);
    if (parsed.length) updateDesignParam('length', parsed.length);

    sendCopilotMessage(
      `Problem specified: "${inputProblem}". Extracted Requirements: Torque=${parsed.torque || 500} Nm, RPM=${parsed.rpm || 1500}, Safety Factor=${parsed.safetyFactor || 2.0}. Please analyze sizing.`
    );
    onClose();
    runAnalysis();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs animate-fade-in p-4 font-sans">
      <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] w-full max-w-2xl shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-4 border-b border-[#34393F] flex items-center justify-between bg-[#22262A]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#14171A] text-[#64D6C5] rounded-[3px] border border-[#34393F]">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">
                Specify Design Problem
              </h2>
              <p className="text-[11px] text-[#969DA5] font-mono">
                Describe operational loads and target safety factors in natural language
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

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Textarea */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-mono font-semibold text-[#969DA5] uppercase tracking-wider flex items-center gap-1.5">
                <Terminal size={12} className="text-[#64D6C5]" />
                Engineering Problem Statement
              </label>
              <span className="text-[10px] font-mono text-[#6C737D]">Natural language parser</span>
            </div>
            <textarea
              rows={3}
              value={inputProblem}
              onChange={(e) => setInputProblem(e.target.value)}
              placeholder="e.g. Design a shaft for 500 Nm torque at 1500 RPM with a safety factor of 2..."
              className="w-full p-2.5 bg-[#14171A] border border-[#34393F] rounded-[3px] text-xs text-[#F0F1F2] placeholder-[#6C737D] font-mono focus:outline-none focus:border-[#64D6C5] transition-colors"
            />
          </div>

          {/* Quick Examples */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-[#969DA5] uppercase">Standard Scenarios:</span>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_PROBLEMS.map((prob, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputProblem(prob)}
                  className="text-[11px] px-2 py-0.5 bg-[#14171A] hover:bg-[#22262A] border border-[#2A2E35] rounded-[2px] text-[#C2C8D0] hover:text-[#F0F1F2] font-mono transition-colors text-left truncate max-w-full"
                >
                  {prob}
                </button>
              ))}
            </div>
          </div>

          {/* Visually Parsed Requirements Card */}
          <div className="bg-[#14171A] border border-[#2A2E35] rounded-[3px] p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[#F0F1F2]">
                <CheckCircle2 size={14} className="text-[#34D399]" />
                Extracted Load Parameters
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-[2px] bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30 font-bold uppercase">
                Analysis Ready
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-[#191C1F] rounded-[3px] border border-[#2A2E35]">
                <span className="text-[10px] font-mono text-[#969DA5] block">Torque (T)</span>
                <span className="text-sm font-mono font-bold text-[#64D6C5]">
                  {parsed.torque ? `${parsed.torque} N·m` : '500 N·m (Default)'}
                </span>
              </div>
              <div className="p-2 bg-[#191C1F] rounded-[3px] border border-[#2A2E35]">
                <span className="text-[10px] font-mono text-[#969DA5] block">Speed (n)</span>
                <span className="text-sm font-mono font-bold text-[#F0F1F2]">
                  {parsed.rpm ? `${parsed.rpm} RPM` : '1500 RPM (Default)'}
                </span>
              </div>
              <div className="p-2 bg-[#191C1F] rounded-[3px] border border-[#2A2E35]">
                <span className="text-[10px] font-mono text-[#969DA5] block">Safety Factor</span>
                <span className="text-sm font-mono font-bold text-[#34D399]">
                  {parsed.safetyFactor ? `${parsed.safetyFactor.toFixed(1)}x` : '2.0x (Target)'}
                </span>
              </div>
            </div>

            {(parsed.diameter || parsed.length || parsed.material) && (
              <div className="pt-2 border-t border-[#2A2E35] flex flex-wrap gap-3 text-[11px] font-mono text-[#969DA5]">
                {parsed.diameter && (
                  <span>
                    Diameter: <strong className="text-[#F0F1F2]">{parsed.diameter} mm</strong>
                  </span>
                )}
                {parsed.length && (
                  <span>
                    Length: <strong className="text-[#F0F1F2]">{parsed.length} mm</strong>
                  </span>
                )}
                {parsed.material && (
                  <span>
                    Material: <strong className="text-[#64D6C5]">{parsed.material}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quick manual tweak drawer */}
          {isEditing && (
            <div className="p-3 bg-[#14171A] rounded-[3px] border border-[#2A2E35] space-y-2">
              <h4 className="text-[10px] font-mono uppercase tracking-wider text-[#969DA5]">
                Manual Parameter Override:
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-[#969DA5] block mb-0.5">Torque (N·m)</label>
                  <input
                    type="number"
                    defaultValue={parsed.torque || 500}
                    onChange={(e) => updateDesignParam('torque', Number(e.target.value))}
                    className="w-full bg-[#191C1F] border border-[#34393F] rounded-[2px] px-2 py-1 text-xs text-[#F0F1F2] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[#969DA5] block mb-0.5">RPM</label>
                  <input
                    type="number"
                    defaultValue={parsed.rpm || 1500}
                    onChange={(e) => updateDesignParam('rpm', Number(e.target.value))}
                    className="w-full bg-[#191C1F] border border-[#34393F] rounded-[2px] px-2 py-1 text-xs text-[#F0F1F2] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-[#969DA5] block mb-0.5">Safety Factor</label>
                  <input
                    type="number"
                    step={0.1}
                    defaultValue={parsed.safetyFactor || 2.0}
                    onChange={(e) => updateDesignParam('safetyFactor', Number(e.target.value))}
                    className="w-full bg-[#191C1F] border border-[#34393F] rounded-[2px] px-2 py-1 text-xs text-[#F0F1F2] font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-4 py-2.5 border-t border-[#34393F] bg-[#22262A] flex items-center justify-between">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-[#14171A] hover:bg-[#2A2E35] text-[#969DA5] hover:text-[#F0F1F2] border border-[#34393F] text-xs font-mono py-1 px-2.5 rounded-[3px] flex items-center gap-1 transition-colors"
          >
            <Sliders size={12} />
            <span>{isEditing ? 'Hide Overrides' : 'Adjust Manually'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-[#969DA5] hover:text-white text-xs font-mono py-1 px-3"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyAndAnalyze}
              className="bg-[#64D6C5] hover:bg-[#52c4b3] text-[#111315] font-mono text-xs font-semibold flex items-center gap-1.5 py-1 px-3 rounded-[3px] shadow-sm transition-colors"
            >
              <span>Apply & Analyze</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
