import React, { useState, useEffect } from 'react';
import type { DesignParameters } from '../../types';
import type { DrawingDimension } from '../../engineering/drawing/types';

interface DimensionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  dimension: DrawingDimension | null;
  designParams: DesignParameters;
  onSaveDimension: (paramKey: keyof DesignParameters, newValue: number) => void;
}

export const DimensionEditorModal: React.FC<DimensionEditorModalProps> = ({
  isOpen,
  onClose,
  dimension,
  designParams,
  onSaveDimension,
}) => {
  if (!isOpen || !dimension) return null;

  const paramKey = dimension.parameterKey;
  const currentVal = paramKey && designParams[paramKey] !== undefined ? Number(designParams[paramKey]) : dimension.nominalValue;
  const [valInput, setValInput] = useState<string>(currentVal.toString());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setValInput(currentVal.toString());
    setErrorMsg(null);
  }, [dimension, currentVal]);

  const parsedVal = parseFloat(valInput);
  const isValidNumber = !isNaN(parsedVal) && isFinite(parsedVal);

  // Validate limits
  let minAllowed = 10;
  let maxAllowed = 2000;
  if (paramKey === 'diameter') {
    minAllowed = 10;
    maxAllowed = 200;
  } else if (paramKey === 'length') {
    minAllowed = 50;
    maxAllowed = 2000;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setValInput(raw);

    const num = parseFloat(raw);
    if (isNaN(num)) {
      setErrorMsg('Please enter a valid numeric dimension.');
    } else if (num < minAllowed) {
      setErrorMsg(`Minimum allowed ${dimension.label} is ${minAllowed} mm.`);
    } else if (num > maxAllowed) {
      setErrorMsg(`Maximum allowed ${dimension.label} is ${maxAllowed} mm.`);
    } else {
      setErrorMsg(null);
    }
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidNumber || errorMsg || !paramKey) return;

    onSaveDimension(paramKey, parsedVal);
    onClose();
  };

  const delta = isValidNumber ? parsedVal - currentVal : 0;
  const deltaPct = isValidNumber && currentVal > 0 ? ((delta / currentVal) * 100).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-[#111827] rounded-xl border border-[#D9DFED] dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D9DFED] dark:border-white/10 bg-[#F8FAFC] dark:bg-[#151D2E]">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#315EDE]" />
            <h3 className="text-sm font-semibold text-[#111827] dark:text-white uppercase tracking-wider">
              Parametric Dimension Sync
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleApply} className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {dimension.label}
              </label>
              {paramKey && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-[#315EDE] border border-blue-200 dark:border-blue-800">
                  params.{paramKey}
                </span>
              )}
            </div>

            <div className="relative mt-2">
              <input
                type="number"
                step="0.5"
                min={minAllowed}
                max={maxAllowed}
                value={valInput}
                onChange={handleInputChange}
                autoFocus
                className={`w-full px-4 py-2.5 text-base font-mono font-medium rounded-lg border bg-white dark:bg-[#0B0F17] text-[#111827] dark:text-white transition-all focus:outline-none focus:ring-2 ${
                  errorMsg
                    ? 'border-red-400 focus:ring-red-300'
                    : 'border-[#D9DFED] dark:border-white/15 focus:ring-[#315EDE]'
                }`}
              />
              <span className="absolute right-3 top-2.5 text-sm font-mono text-gray-400">
                {dimension.unit}
              </span>
            </div>

            {errorMsg ? (
              <p className="mt-1.5 text-xs text-red-500 font-medium">{errorMsg}</p>
            ) : (
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Range: {minAllowed} – {maxAllowed} mm</span>
                {delta !== 0 && (
                  <span className={`font-mono font-semibold ${delta > 0 ? 'text-blue-600' : 'text-amber-600'}`}>
                    {delta > 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)} mm ({delta > 0 ? `+${deltaPct}` : deltaPct}%)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Tolerance & Fit Info */}
          <div className="p-3 rounded-lg bg-[#F8FAFC] dark:bg-[#0B0F17] border border-[#D9DFED] dark:border-white/10 text-xs space-y-1.5">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Standard Fit / Class:</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-gray-200">
                {dimension.fitTolerance || 'ISO 2768-mK (Medium)'}
              </span>
            </div>
            {dimension.upperDevMm !== undefined && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Tolerance Limits:</span>
                <span className="font-mono text-gray-900 dark:text-gray-200">
                  +{dimension.upperDevMm.toFixed(3)} / {dimension.lowerDevMm?.toFixed(3)} mm
                </span>
              </div>
            )}
          </div>

          {/* Live Sync Warning */}
          <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-300 flex items-start space-x-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5 text-[#315EDE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <span className="font-semibold">Bidirectional Model Associativity:</span>
              <p className="mt-0.5 text-blue-800 dark:text-blue-300/90 leading-relaxed">
                Applying will update the 3D geometry mesh, re-solve structural stress and deflection, re-render all 2D views, and flag the design for saving.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValidNumber || !!errorMsg}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-gradient-to-r from-[#315EDE] to-[#7653C9] hover:opacity-90 shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Apply & Regenerate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
