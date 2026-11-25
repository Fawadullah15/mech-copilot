import React, { useState, useEffect } from 'react';
import { EngineeringResult } from '../types';
import { materials } from '../data/materials';
import { ShieldAlert, CheckCircle, Info, Calculator, Check, ArrowRight } from 'lucide-react';

interface EngineeringResultCardProps {
  result: EngineeringResult;
  onApply?: (payload: any) => void;
}

function resolveMaterialIdFromResult(
  inp: Record<string, any>,
  out: Record<string, any>,
  yieldStrength?: number
): string | undefined {
  const rawId = inp.materialId ?? out.materialId;
  if (typeof rawId === 'string' && rawId.trim()) {
    const exact = materials.find((m) => m.id.toLowerCase() === rawId.trim().toLowerCase());
    if (exact) return exact.id;
  }
  const rawName = inp.material ?? out.material ?? inp.materialName ?? out.materialName;
  if (typeof rawName === 'string' && rawName.trim()) {
    const q = rawName.trim().toLowerCase();
    const byName = materials.find(
      (m) => m.name.toLowerCase() === q || m.name.toLowerCase().includes(q) || q.includes(m.id.toLowerCase())
    );
    if (byName) return byName.id;
  }
  if (typeof yieldStrength === 'number' && Number.isFinite(yieldStrength)) {
    const byYield = materials.find((m) => Math.abs(m.yieldStrength - yieldStrength) < 1e-3);
    if (byYield) return byYield.id;
  }
  return undefined;
}

export default function EngineeringResultCard({ result, onApply }: EngineeringResultCardProps) {
  const [appliedAction, setAppliedAction] = useState<'diameter' | 'all' | null>(null);
  const isRequiredDiameter = result.tool === 'calculate_required_shaft_diameter' || result.tool === 'calculate_required_diameter';
  const isFullAnalysis = result.tool === 'run_full_shaft_analysis' || result.tool === 'run_complete_shaft_analysis';

  useEffect(() => {
    setAppliedAction(null);
  }, [result]);

  const formatValue = (val: any) => {
    if (typeof val === 'number') {
      return Number.isInteger(val) ? val.toString() : val.toFixed(2);
    }
    return String(val ?? '—');
  };

  const overallStatus =
    result.outputs.overallStatus ||
    (result.outputs.actualFactorOfSafety
      ? result.outputs.actualFactorOfSafety >= (result.inputs.requiredFactorOfSafety || 2.0)
        ? 'PASS'
        : 'FAIL'
      : 'PASS');
  const isPass = String(overallStatus).toUpperCase() === 'PASS';
  const isFail = String(overallStatus).toUpperCase() === 'FAIL';

  const inp = result.inputs || {};
  const out = result.outputs || {};

  const appliedTorque = inp.appliedTorqueNm ?? inp.torqueNm ?? out.appliedTorqueNm ?? out.torqueNm;
  const rotationalSpeed = inp.rotationalSpeedRpm ?? inp.rpm ?? out.rotationalSpeedRpm ?? out.rpm;
  const yieldStrength = inp.yieldStrengthMPa ?? out.yieldStrengthMPa;
  const resolvedMaterialId = resolveMaterialIdFromResult(inp, out, yieldStrength !== undefined ? Number(yieldStrength) : undefined);
  const resolvedMaterialObj = resolvedMaterialId ? materials.find((m) => m.id === resolvedMaterialId) : undefined;
  const materialName = inp.material ?? out.material ?? resolvedMaterialObj?.name;
  const requiredFoS = inp.requiredFactorOfSafety ?? inp.safetyFactor ?? inp.targetSafetyFactor ?? out.safetyFactor ?? out.requiredFactorOfSafety;
  const actualFoS = out.actualFactorOfSafety;
  const shaftLength = inp.shaftSpanMm ?? inp.lengthMm ?? out.lengthMm ?? out.shaftSpanMm;
  const radialForce = inp.radialForceN ?? inp.force ?? out.radialForceN;
  const currentDiameter = inp.currentDiameterMm ?? inp.diameterMm;
  const requiredDiameter = out.requiredDiameterMm ?? out.minimumRequiredDiameterMm ?? out.recommendedDiameter;
  const torsionalStress = out.torsionalStressMPa ?? out.torsionalShearMPa;
  const bendingMoment = out.bendingMomentNm;
  const bendingStress = out.bendingStressMPa;
  const combinedStress = out.combinedStressMPa ?? out.equivalentStressMPa;
  const failureCriterion = inp.failureCriterion ?? inp.criterion ?? out.failureCriterion;
  const deflection = out.flexuralDeflectionMm ?? out.maxDeflectionMm;
  const operatingTemp = inp.operatingTempC ?? inp.temperature;

  const engineeringFields: { label: string; value: string; highlight?: boolean }[] = [];

  if (appliedTorque !== undefined) engineeringFields.push({ label: '1. Applied Torque', value: `${formatValue(appliedTorque)} Nm` });
  if (rotationalSpeed !== undefined) engineeringFields.push({ label: '2. Rotational Speed', value: `${formatValue(rotationalSpeed)} RPM` });
  if (materialName !== undefined) engineeringFields.push({ label: '3. Shaft Material', value: String(materialName) });
  if (yieldStrength !== undefined) engineeringFields.push({ label: '4. Yield Strength (Sy)', value: `${formatValue(yieldStrength)} MPa` });
  if (requiredFoS !== undefined) engineeringFields.push({ label: '5. Required FoS', value: `${formatValue(requiredFoS)}` });
  if (actualFoS !== undefined) engineeringFields.push({ label: '6. Actual FoS', value: `${formatValue(actualFoS)}`, highlight: true });
  if (shaftLength !== undefined) engineeringFields.push({ label: '7. Shaft Span Length', value: `${formatValue(shaftLength)} mm` });
  if (radialForce !== undefined) engineeringFields.push({ label: '8. Radial Force', value: `${formatValue(radialForce)} N` });
  if (requiredDiameter !== undefined) {
    engineeringFields.push({ label: '9. Min Required Diameter', value: `⌀${formatValue(requiredDiameter)} mm`, highlight: true });
  } else if (currentDiameter !== undefined) {
    engineeringFields.push({ label: '9. Shaft Diameter', value: `⌀${formatValue(currentDiameter)} mm` });
  }
  if (torsionalStress !== undefined) engineeringFields.push({ label: '10. Torsional Shear (τ)', value: `${formatValue(torsionalStress)} MPa` });
  if (bendingMoment !== undefined) engineeringFields.push({ label: '11. Bending Moment', value: `${formatValue(bendingMoment)} Nm` });
  if (bendingStress !== undefined) engineeringFields.push({ label: '12. Bending Stress (σb)', value: `${formatValue(bendingStress)} MPa` });
  if (combinedStress !== undefined) engineeringFields.push({ label: '13. Combined Stress (σeq)', value: `${formatValue(combinedStress)} MPa`, highlight: true });
  if (failureCriterion !== undefined) engineeringFields.push({ label: '14. Failure Criterion', value: String(failureCriterion) });
  if (deflection !== undefined) engineeringFields.push({ label: '15. Deflection (δ)', value: `${formatValue(deflection)} mm` });
  engineeringFields.push({ label: '16. Overall Status', value: String(overallStatus).toUpperCase(), highlight: true });

  const rawDia = requiredDiameter ?? currentDiameter;
  const diameterToApply =
    rawDia !== undefined && Number.isFinite(Number(rawDia)) && Number(rawDia) > 0
      ? Math.round(Number(rawDia) * 100) / 100
      : undefined;

  const handleApplyDiameter = () => {
    if (onApply && diameterToApply !== undefined) {
      onApply({ diameter: diameterToApply });
      setAppliedAction('diameter');
    }
  };

  const handleApplyAll = () => {
    if (onApply) {
      const payload: Record<string, any> = {};
      if (diameterToApply !== undefined) payload.diameter = diameterToApply;
      if (appliedTorque !== undefined && Number.isFinite(Number(appliedTorque))) payload.torque = Number(appliedTorque);
      if (rotationalSpeed !== undefined && Number.isFinite(Number(rotationalSpeed))) payload.rpm = Number(rotationalSpeed);
      if (shaftLength !== undefined && Number.isFinite(Number(shaftLength))) payload.length = Number(shaftLength);
      if (radialForce !== undefined && Number.isFinite(Number(radialForce))) payload.force = Number(radialForce);
      if (requiredFoS !== undefined && Number.isFinite(Number(requiredFoS))) payload.safetyFactor = Number(requiredFoS);
      if (operatingTemp !== undefined && Number.isFinite(Number(operatingTemp))) payload.temperature = Number(operatingTemp);
      if (failureCriterion !== undefined) payload.criterion = failureCriterion;
      if (resolvedMaterialId) payload.materialId = resolvedMaterialId;
      onApply(payload);
      setAppliedAction('all');
    }
  };

  return (
    <div className="mt-2.5 bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#24344F] rounded-[8px] overflow-hidden text-xs font-sans">
      <div className="bg-[#F8FAFC] dark:bg-[#162236] border-b border-[#E2E8F0] dark:border-[#24344F] px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Calculator size={13} className="text-[#2563EB]" />
          <span className="text-[11px] font-mono font-semibold text-[#172033] dark:text-white uppercase tracking-wider">
            {isRequiredDiameter ? 'Shaft Sizing Verification' : isFullAnalysis ? 'Full Shaft Synthesis' : 'Engineering Verification'}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-bold uppercase tracking-wider border ${
            isPass
              ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]'
              : isFail
              ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
              : 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]'
          }`}
        >
          {isPass ? <CheckCircle size={10} /> : <ShieldAlert size={10} />}
          {String(overallStatus).toUpperCase()}
        </span>
      </div>

      <div className="p-2.5 space-y-2">
        {out.summary && (
          <div className="text-[11px] text-[#172033] dark:text-[#F0F4FA] leading-relaxed bg-[#F8FAFC] dark:bg-[#162236] p-2 rounded-[6px] border border-[#E2E8F0] dark:border-[#24344F]">
            {out.summary}
          </div>
        )}

        <div className="space-y-1">
          <div className="text-[10px] text-[#64748B] uppercase font-mono font-bold tracking-wider flex items-center justify-between">
            <span>Verified Parameters</span>
            <span className="text-[#2563EB] font-mono">{engineeringFields.length} metrics</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {engineeringFields.map((f, i) => (
              <div
                key={i}
                className={`flex flex-col px-2 py-1.5 rounded-[6px] border ${
                  f.highlight
                    ? 'bg-[#EFF6FF] dark:bg-[#1B2942] border-[#BFDBFE] dark:border-[#2563EB]/40'
                    : 'bg-[#F8FAFC] dark:bg-[#162236] border-[#E2E8F0] dark:border-[#24344F]'
                }`}
              >
                <span className={`text-[10px] font-mono ${f.highlight ? 'text-[#2563EB] font-semibold' : 'text-[#64748B]'}`}>
                  {f.label}
                </span>
                <span className={`font-mono font-semibold tabular-nums ${f.highlight ? 'text-[#2563EB] text-xs' : 'text-[#172033] dark:text-white'}`}>
                  {f.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {out.methodology && (
          <div className="text-[10px] font-mono text-[#64748B] bg-[#F8FAFC] dark:bg-[#162236] p-1.5 rounded-[6px] border border-[#E2E8F0] dark:border-[#24344F]">
            <span className="text-[#172033] dark:text-white font-semibold">Basis:</span> {out.methodology}
          </div>
        )}
      </div>

      {onApply && (
        <div className="bg-[#F8FAFC] dark:bg-[#162236] px-3 py-2 border-t border-[#E2E8F0] dark:border-[#24344F] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-[10px] text-[#64748B] font-mono">
            <Info size={11} className="text-[#2563EB]" />
            <span>Sync to CAD</span>
          </div>
          <div className="flex items-center gap-1.5">
            {diameterToApply && (
              <button
                type="button"
                onClick={handleApplyDiameter}
                className={`text-white text-[10px] font-mono font-semibold py-1 px-2.5 rounded-[5px] flex items-center gap-1 transition-colors ${
                  appliedAction === 'diameter'
                    ? 'bg-[#16A34A] hover:bg-[#15803D]'
                    : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
                }`}
                title="Apply recommended shaft diameter to CAD"
              >
                <Check size={11} />
                {appliedAction === 'diameter'
                  ? `Applied ⌀${formatValue(diameterToApply)} mm`
                  : `Apply ⌀${formatValue(diameterToApply)} mm`}
              </button>
            )}
            <button
              type="button"
              onClick={handleApplyAll}
              className={`border text-[10px] font-mono font-medium py-1 px-2.5 rounded-[5px] flex items-center gap-1 transition-colors ${
                appliedAction === 'all'
                  ? 'bg-[#F0FDF4] dark:bg-[#052E16]/40 border-[#16A34A] text-[#16A34A]'
                  : 'bg-white dark:bg-[#101A2B] border-[#E2E8F0] dark:border-[#334155] text-[#172033] dark:text-white hover:border-[#2563EB]'
              }`}
              title="Apply all load, material & geometry parameters"
            >
              {appliedAction === 'all' ? <Check size={11} /> : <ArrowRight size={11} />}
              {appliedAction === 'all' ? 'Applied All' : 'Apply All'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
