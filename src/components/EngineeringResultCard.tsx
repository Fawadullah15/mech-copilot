import React from 'react';
import { EngineeringResult } from '../types';
import { ShieldAlert, CheckCircle, Info, Beaker } from 'lucide-react';

interface EngineeringResultCardProps {
  result: EngineeringResult;
  onApply?: (param: string, value: any) => void;
}

export default function EngineeringResultCard({ result, onApply }: EngineeringResultCardProps) {
  const isRequiredDiameter = result.tool === 'calculate_required_shaft_diameter';
  const isFullAnalysis = result.tool === 'run_full_shaft_analysis';

  const formatKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .replace('Mm3', ' mm³')
      .replace('Mm', ' mm')
      .replace('MPa', ' MPa')
      .replace('Nm', ' Nm')
      .replace('GPa', ' GPa')
      .replace('N', ' N');
  };

  const formatValue = (val: any) => {
    if (typeof val === 'number') {
      return Number.isInteger(val) ? val.toString() : val.toFixed(2);
    }
    return String(val);
  };

  return (
    <div className="mt-4 bg-navy-900 border border-navy-700/60 rounded-xl overflow-hidden shadow-lg font-sans">
      <div className="bg-navy-800/80 border-b border-navy-700 px-3 py-2 flex items-center gap-2">
        <Beaker size={14} className="text-accent" />
        <span className="text-xs font-semibold text-gray-200 uppercase tracking-wide">
          {isRequiredDiameter ? 'Required Shaft Diameter' : isFullAnalysis ? 'Full Shaft Analysis' : 'Engineering Result'}
        </span>
      </div>

      <div className="p-3 space-y-3">
        {/* Status display if exists */}
        {result.outputs.overallStatus && (
          <div className={`px-3 py-2 rounded-lg border flex items-center gap-2 text-xs font-bold uppercase tracking-wider
            ${result.outputs.overallStatus.toLowerCase() === 'pass' 
                ? 'bg-status-pass/20 border-status-pass/30 text-status-pass' 
                : result.outputs.overallStatus.toLowerCase() === 'fail'
                ? 'bg-status-fail/20 border-status-fail/30 text-status-fail'
                : 'bg-amber-500/20 border-amber-500/30 text-amber-500'}`}>
            {result.outputs.overallStatus.toLowerCase() === 'pass' ? <CheckCircle size={14} /> : <ShieldAlert size={14} />}
            Status: {result.outputs.overallStatus}
          </div>
        )}

        {result.outputs.summary && (
           <div className="text-xs text-gray-300 leading-relaxed bg-navy-950/50 p-2 rounded border border-navy-800">
             {result.outputs.summary}
           </div>
        )}

        {/* Inputs */}
        <div className="space-y-1">
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1.5">Inputs</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(result.inputs).map(([key, value]) => (
              <div key={key} className="flex flex-col bg-navy-950/40 p-1.5 rounded">
                <span className="text-gray-400 text-[10px]">{formatKey(key)}</span>
                <span className="text-gray-200 font-mono">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Outputs */}
        <div className="space-y-1 pt-2 border-t border-navy-800/60">
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1.5">Calculated Outputs</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(result.outputs).map(([key, value]) => {
              if (key === 'formula' || key === 'disclaimer' || key === 'overallStatus' || key === 'summary') return null;
              
              const isHighlight = key === 'requiredDiameterMm' || key === 'safetyFactor';
              
              return (
                <div key={key} className={`flex flex-col p-1.5 rounded ${isHighlight ? 'bg-accent/10 border border-accent/20' : 'bg-navy-950/40'}`}>
                  <span className={`${isHighlight ? 'text-accent-light' : 'text-gray-400'} text-[10px]`}>{formatKey(key)}</span>
                  <span className={`${isHighlight ? 'text-white font-bold' : 'text-gray-200'} font-mono`}>{formatValue(value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      {isRequiredDiameter && result.outputs.requiredDiameterMm && onApply && (
        <div className="bg-navy-950/80 p-2.5 border-t border-navy-700/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <Info size={12} className="text-accent" />
            <span>Apply to current design</span>
          </div>
          <button
            onClick={() => onApply('diameter', result.outputs.requiredDiameterMm)}
            className="btn-primary text-xs py-1 px-3 rounded font-medium shadow-lg hover:shadow-accent/20 transition-all"
          >
            Apply {formatValue(result.outputs.requiredDiameterMm)} mm
          </button>
        </div>
      )}
    </div>
  );
}
