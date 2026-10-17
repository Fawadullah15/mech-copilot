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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-navy-900 border border-navy-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-5 border-b border-navy-700/60 flex items-center justify-between bg-navy-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/15 text-accent rounded-lg border border-accent/30">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                Ask Copilot — Specify Design Problem
              </h2>
              <p className="text-xs text-gray-400">
                Describe your mechanical loading and operating constraints in natural language
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

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Textarea */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal size={14} className="text-accent" />
                Engineering Problem Statement
              </label>
              <span className="text-xs text-gray-500">Natural language NLP parser</span>
            </div>
            <textarea
              rows={3}
              value={inputProblem}
              onChange={(e) => setInputProblem(e.target.value)}
              placeholder="e.g. Design a shaft for 500 Nm torque at 1500 RPM with a safety factor of 2..."
              className="w-full p-3.5 bg-navy-950 border border-navy-700 rounded-xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all font-mono"
            />
          </div>

          {/* Preset Example Chips */}
          <div className="space-y-1.5">
            <span className="text-xs text-gray-400">Quick Examples:</span>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_PROBLEMS.map((prob, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputProblem(prob)}
                  className="text-xs px-2.5 py-1 bg-navy-800 hover:bg-navy-700 border border-navy-700/60 rounded-lg text-gray-300 transition-colors text-left truncate max-w-full"
                >
                  {prob}
                </button>
              ))}
            </div>
          </div>

          {/* Visually Parsed Requirements Card */}
          <div className="bg-navy-950/80 border border-navy-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                <CheckCircle2 size={16} className="text-status-pass" />
                Requirements Detected
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-status-pass/10 text-status-pass border border-status-pass/30 font-medium">
                Design Analysis Ready
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-navy-900/80 rounded-lg border border-navy-700/50">
                <span className="text-xs text-gray-400 block mb-0.5">Torque</span>
                <span className="text-base font-mono font-bold text-accent-light">
                  {parsed.torque ? `${parsed.torque} Nm` : '500 Nm (Default)'}
                </span>
              </div>
              <div className="p-3 bg-navy-900/80 rounded-lg border border-navy-700/50">
                <span className="text-xs text-gray-400 block mb-0.5">Rotational Speed</span>
                <span className="text-base font-mono font-bold text-cyan">
                  {parsed.rpm ? `${parsed.rpm} RPM` : '1500 RPM (Default)'}
                </span>
              </div>
              <div className="p-3 bg-navy-900/80 rounded-lg border border-navy-700/50">
                <span className="text-xs text-gray-400 block mb-0.5">Safety Factor</span>
                <span className="text-base font-mono font-bold text-status-pass">
                  {parsed.safetyFactor ? `${parsed.safetyFactor.toFixed(1)}` : '2.0 (Target)'}
                </span>
              </div>
            </div>

            {/* Optional parameters if detected */}
            {(parsed.diameter || parsed.length || parsed.material) && (
              <div className="pt-2 border-t border-navy-800 flex flex-wrap gap-4 text-xs text-gray-400">
                {parsed.diameter && (
                  <span>
                    Specified Diameter: <strong className="text-gray-200 font-mono">{parsed.diameter} mm</strong>
                  </span>
                )}
                {parsed.length && (
                  <span>
                    Specified Length: <strong className="text-gray-200 font-mono">{parsed.length} mm</strong>
                  </span>
                )}
                {parsed.material && (
                  <span>
                    Specified Material: <strong className="text-accent-light">{parsed.material}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quick manual tweak drawer */}
          {isEditing && (
            <div className="p-4 bg-navy-800/60 rounded-xl border border-navy-700 space-y-3 animate-fade-in">
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Fine-tune detected parameters:
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Torque (Nm)</label>
                  <input
                    type="number"
                    defaultValue={parsed.torque || 500}
                    onChange={(e) => updateDesignParam('torque', Number(e.target.value))}
                    className="input-field text-xs py-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">RPM</label>
                  <input
                    type="number"
                    defaultValue={parsed.rpm || 1500}
                    onChange={(e) => updateDesignParam('rpm', Number(e.target.value))}
                    className="input-field text-xs py-1.5"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Safety Factor</label>
                  <input
                    type="number"
                    step={0.1}
                    defaultValue={parsed.safetyFactor || 2.0}
                    onChange={(e) => updateDesignParam('safetyFactor', Number(e.target.value))}
                    className="input-field text-xs py-1.5"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-navy-700/60 bg-navy-950/80 flex items-center justify-between">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2"
          >
            <Sliders size={14} />
            {isEditing ? 'Hide Manual Tweaks' : 'Modify Requirements'}
          </button>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-ghost text-xs py-2 px-3">
              Cancel
            </button>
            <button
              onClick={handleApplyAndAnalyze}
              className="btn-primary text-xs flex items-center gap-2 py-2 px-4 shadow-lg shadow-accent/20"
            >
              Run Design Analysis
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
