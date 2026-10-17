import React, { useState } from 'react';
import { Scale, ArrowRight, Check, ArrowLeftRight, ShieldAlert, Zap, Layers } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { calculateFullShaftAnalysis } from '../engineering';
import { getMaterialById } from '../data/materials';

export default function DesignCompareModal() {
  const {
    isCompareModalOpen,
    setIsCompareModalOpen,
    designParams,
    selectedMaterial,
    allMaterials,
    updateDesignParam,
    selectMaterial,
    designVersions,
  } = useApp();

  // Config A is always current working state
  // Config B can be selected from versions or an alternative material
  const [altDiameter, setAltDiameter] = useState<number>(
    designParams.diameter === 45 ? 42 : 45
  );
  const [altMaterialId, setAltMaterialId] = useState<string>('aisi-4340');

  if (!isCompareModalOpen) return null;

  const altMaterial = getMaterialById(altMaterialId) || selectedMaterial;

  // Analysis for Config A
  const analysisA = calculateFullShaftAnalysis({
    torqueNm: designParams.torque,
    radialForceN: designParams.force,
    diameterMm: designParams.diameter,
    lengthMm: designParams.length,
    rpm: designParams.rpm,
    yieldStrengthMPa: selectedMaterial.yieldStrength,
    tensileStrengthMPa: selectedMaterial.tensileStrength,
    elasticModulusGPa: selectedMaterial.elasticModulus,
    targetSafetyFactor: designParams.safetyFactor,
    operatingTempC: designParams.temperature,
    criterion: 'Von Mises',
  });

  // Analysis for Config B
  const analysisB = calculateFullShaftAnalysis({
    torqueNm: designParams.torque,
    radialForceN: designParams.force,
    diameterMm: altDiameter,
    lengthMm: designParams.length,
    rpm: designParams.rpm,
    yieldStrengthMPa: altMaterial.yieldStrength,
    tensileStrengthMPa: altMaterial.tensileStrength,
    elasticModulusGPa: altMaterial.elasticModulus,
    targetSafetyFactor: designParams.safetyFactor,
    operatingTempC: designParams.temperature,
    criterion: 'Von Mises',
  });

  // Weight estimates
  const volA = (Math.PI / 4) * Math.pow(designParams.diameter / 1000, 2) * (designParams.length / 1000);
  const weightA = selectedMaterial.density * volA;

  const volB = (Math.PI / 4) * Math.pow(altDiameter / 1000, 2) * (designParams.length / 1000);
  const weightB = altMaterial.density * volB;

  const weightDeltaPercent = (((weightB - weightA) / weightA) * 100).toFixed(1);
  const fosDelta = (analysisB.combinedStress.result.factorOfSafety - analysisA.combinedStress.result.factorOfSafety).toFixed(2);

  const handleApplyConfigB = () => {
    updateDesignParam('diameter', altDiameter);
    selectMaterial(altMaterialId);
    setIsCompareModalOpen(false);
  };

  return (
    <Modal
      isOpen={isCompareModalOpen}
      onClose={() => setIsCompareModalOpen(false)}
      title="Design Compare Mode"
      subtitle="Side-by-side mechanical trade-off evaluation between two configurations"
      icon={<Scale size={18} />}
      maxWidth="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-400">
            Comparing <span className="text-slate-200 font-semibold">Config A (Active)</span> with{' '}
            <span className="text-accent-bright font-semibold">Config B (Candidate)</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsCompareModalOpen(false)}>
              Close
            </Button>
            <Button variant="primary" leftIcon={<Check size={13} />} onClick={handleApplyConfigB}>
              Apply Config B to Current Design
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-xs">
        {/* Comparison Header Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Config A Header */}
          <div className="p-4 rounded-xl bg-navy-950 border border-navy-750">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-navy-850 text-slate-300 border border-navy-700">
                Configuration A (Current Working State)
              </span>
              <Badge variant={analysisA.overallStatus === 'fail' ? 'critical' : analysisA.overallStatus}>
                FoS {analysisA.combinedStress.result.factorOfSafety.toFixed(2)}
              </Badge>
            </div>
            <div className="text-base font-bold text-slate-100 mb-1">
              ⌀{designParams.diameter} mm • {selectedMaterial.name}
            </div>
            <div className="text-slate-400 text-[11px]">
              Active project baseline under {designParams.torque} N·m load.
            </div>
          </div>

          {/* Config B Controls */}
          <div className="p-4 rounded-xl bg-navy-950 border border-accent/40 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-accent/20 text-accent-light border border-accent/30">
                Configuration B (Alternative Candidate)
              </span>
              <Badge variant={analysisB.overallStatus === 'fail' ? 'critical' : analysisB.overallStatus}>
                FoS {analysisB.combinedStress.result.factorOfSafety.toFixed(2)}
              </Badge>

            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="label-text">Candidate Diameter</label>
                <select
                  value={altDiameter}
                  onChange={(e) => setAltDiameter(Number(e.target.value))}
                  className="input-field"
                >
                  {[38, 40, 42, 44, 45, 48, 50, 55].map((d) => (
                    <option key={d} value={d}>
                      ⌀{d} mm {d === 45 ? '(Standard)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-text">Candidate Material</label>
                <select
                  value={altMaterialId}
                  onChange={(e) => setAltMaterialId(e.target.value)}
                  className="input-field"
                >
                  {allMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Delta Summary Pill */}
        <div className="p-3 rounded-xl bg-navy-850 border border-navy-700 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <ArrowLeftRight size={14} className="text-accent-bright" />
            <span>Delta Summary (B vs A):</span>
          </div>
          <div className="flex items-center gap-6">
            <div>
              Mass Delta:{' '}
              <span className={`font-bold ${Number(weightDeltaPercent) < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {Number(weightDeltaPercent) > 0 ? `+${weightDeltaPercent}%` : `${weightDeltaPercent}%`}
              </span>
            </div>
            <div>
              Safety Factor Delta:{' '}
              <span className={`font-bold ${Number(fosDelta) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {Number(fosDelta) > 0 ? `+${fosDelta}` : fosDelta}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Table */}
        <div className="rounded-xl border border-navy-750 overflow-hidden bg-navy-950">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-navy-900 border-b border-navy-800 text-[11px] text-slate-400 uppercase font-mono">
                <th className="py-2.5 px-4">Engineering Parameter</th>
                <th className="py-2.5 px-4">Configuration A</th>
                <th className="py-2.5 px-4">Configuration B</th>
                <th className="py-2.5 px-4">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-850 font-mono text-xs text-slate-300">
              <tr>
                <td className="py-2.5 px-4 font-sans text-slate-200">Shaft Outer Diameter</td>
                <td className="py-2.5 px-4">⌀{designParams.diameter} mm</td>
                <td className="py-2.5 px-4 text-accent-light font-bold">⌀{altDiameter} mm</td>
                <td className="py-2.5 px-4 text-slate-400">{altDiameter - designParams.diameter} mm</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-slate-200">Material Yield Strength</td>
                <td className="py-2.5 px-4">{selectedMaterial.yieldStrength} MPa</td>
                <td className="py-2.5 px-4 text-accent-light">{altMaterial.yieldStrength} MPa</td>
                <td className="py-2.5 px-4 text-slate-400">
                  {altMaterial.yieldStrength - selectedMaterial.yieldStrength > 0 ? `+${altMaterial.yieldStrength - selectedMaterial.yieldStrength}` : altMaterial.yieldStrength - selectedMaterial.yieldStrength} MPa
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-slate-200">Torsional Shear Stress (τ)</td>
                <td className="py-2.5 px-4">{analysisA.torsion.result.shearStressMPa.toFixed(1)} MPa</td>
                <td className="py-2.5 px-4">{analysisB.torsion.result.shearStressMPa.toFixed(1)} MPa</td>
                <td className="py-2.5 px-4 text-slate-400">
                  {(analysisB.torsion.result.shearStressMPa - analysisA.torsion.result.shearStressMPa).toFixed(1)} MPa
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-slate-200">Von Mises Equivalent Stress</td>
                <td className="py-2.5 px-4">{analysisA.combinedStress.result.equivalentStressMPa.toFixed(1)} MPa</td>
                <td className="py-2.5 px-4">{analysisB.combinedStress.result.equivalentStressMPa.toFixed(1)} MPa</td>
                <td className="py-2.5 px-4 text-slate-400">
                  {(analysisB.combinedStress.result.equivalentStressMPa - analysisA.combinedStress.result.equivalentStressMPa).toFixed(1)} MPa
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-slate-200">Factor of Safety (FoS)</td>
                <td className="py-2.5 px-4 font-bold">{analysisA.combinedStress.result.factorOfSafety.toFixed(2)}</td>
                <td className="py-2.5 px-4 font-bold text-accent-bright">{analysisB.combinedStress.result.factorOfSafety.toFixed(2)}</td>
                <td className="py-2.5 px-4 font-bold text-slate-400">{Number(fosDelta) > 0 ? `+${fosDelta}` : fosDelta}</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-slate-200">Centerline Deflection (δ)</td>
                <td className="py-2.5 px-4">{analysisA.deflection.result.maxDeflectionMm.toFixed(4)} mm</td>
                <td className="py-2.5 px-4">{analysisB.deflection.result.maxDeflectionMm.toFixed(4)} mm</td>
                <td className="py-2.5 px-4 text-slate-400">
                  {(analysisB.deflection.result.maxDeflectionMm - analysisA.deflection.result.maxDeflectionMm).toFixed(4)} mm
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-sans text-slate-200">Total Shaft Mass</td>
                <td className="py-2.5 px-4">{weightA.toFixed(2)} kg</td>
                <td className="py-2.5 px-4 text-accent-light">{weightB.toFixed(2)} kg</td>
                <td className="py-2.5 px-4 text-slate-400">{(weightB - weightA).toFixed(2)} kg ({weightDeltaPercent}%)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
