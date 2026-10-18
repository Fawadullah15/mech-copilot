import React from 'react';
import { EngineeringResult } from '../types';
import { ShieldAlert, CheckCircle, Info, Calculator } from 'lucide-react';

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

  const isPass = result.outputs.overallStatus?.toLowerCase() === 'pass';
  const isFail = result.outputs.overallStatus?.toLowerCase() === 'fail';

  return (
    <div className="mt-3 bg-[#191C1F] border border-[#34393F] rounded-[4px] overflow-hidden text-xs font-sans shadow-sm">
      {/* Header */}
      <div className="bg-[#22262A] border-b border-[#34393F] px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Calculator size={13} className="text-[#64D6C5]" />
          <span className="text-[11px] font-mono font-semibold text-[#F0F1F2] uppercase tracking-wider">
            {isRequiredDiameter ? 'Required Shaft Diameter' : isFullAnalysis ? 'Full Analytical Synthesis' : 'Engineering Telemetry'}
          </span>
        </div>
        {result.outputs.overallStatus && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-[10px] font-mono font-bold uppercase tracking-wider border ${
            isPass
              ? 'bg-[#34D399]/15 border-[#34D399]/30 text-[#34D399]'
              : isFail
              ? 'bg-[#E16D72]/15 border-[#E16D72]/30 text-[#E16D72]'
              : 'bg-[#E7B65C]/15 border-[#E7B65C]/30 text-[#E7B65C]'
          }`}>
            {isPass ? <CheckCircle size={10} /> : <ShieldAlert size={10} />}
            {result.outputs.overallStatus}
          </span>
        )}
      </div>

      <div className="p-3 space-y-2.5">
        {result.outputs.summary && (
          <div className="text-[11px] text-[#C2C8D0] leading-relaxed bg-[#14171A] p-2 rounded-[3px] border border-[#2A2E35]">
            {result.outputs.summary}
          </div>
        )}

        {/* Inputs */}
        <div className="space-y-1">
          <div className="text-[10px] text-[#969DA5] uppercase font-mono font-medium tracking-wider">Design Inputs</div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(result.inputs).map(([key, value]) => (
              <div key={key} className="flex flex-col bg-[#14171A] px-2 py-1.5 rounded-[3px] border border-[#2A2E35]">
                <span className="text-[#969DA5] text-[10px] font-mono">{formatKey(key)}</span>
                <span className="text-[#F0F1F2] font-mono font-medium">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Outputs */}
        <div className="space-y-1 pt-1.5 border-t border-[#2A2E35]">
          <div className="text-[10px] text-[#969DA5] uppercase font-mono font-medium tracking-wider">Computed Results</div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(result.outputs).map(([key, value]) => {
              if (key === 'formula' || key === 'disclaimer' || key === 'overallStatus' || key === 'summary') return null;
              
              const isHighlight = key === 'requiredDiameterMm' || key === 'safetyFactor';
              
              return (
                <div
                  key={key}
                  className={`flex flex-col px-2 py-1.5 rounded-[3px] border ${
                    isHighlight
                      ? 'bg-[#64D6C5]/10 border-[#64D6C5]/30'
                      : 'bg-[#14171A] border-[#2A2E35]'
                  }`}
                >
                  <span className={`text-[10px] font-mono ${isHighlight ? 'text-[#64D6C5]' : 'text-[#969DA5]'}`}>
                    {formatKey(key)}
                  </span>
                  <span className={`font-mono font-bold ${isHighlight ? 'text-[#64D6C5] text-xs' : 'text-[#F0F1F2]'}`}>
                    {formatValue(value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      {isRequiredDiameter && result.outputs.requiredDiameterMm && onApply && (
        <div className="bg-[#22262A] px-3 py-2 border-t border-[#34393F] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-[#969DA5]">
            <Info size={12} className="text-[#64D6C5]" />
            <span>Recommended parameter</span>
          </div>
          <button
            onClick={() => onApply('diameter', result.outputs.requiredDiameterMm)}
            className="bg-[#64D6C5] hover:bg-[#52c4b3] text-[#111315] text-[11px] font-mono font-semibold py-1 px-3 rounded-[3px] transition-colors"
          >
            Apply {formatValue(result.outputs.requiredDiameterMm)} mm
          </button>
        </div>
      )}
    </div>
  );
}
