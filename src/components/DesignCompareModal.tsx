import React, { useState, useEffect, useMemo } from 'react';
import { Scale, Check, ArrowLeftRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { calculateFullShaftAnalysis } from '../engineering';
import { getMaterialById } from '../data/materials';

const STANDARD_DIAMETERS = [25, 30, 32, 35, 38, 40, 42, 45, 48, 50, 55, 60, 65, 70, 80];

export default function DesignCompareModal() {
  const {
    isCompareModalOpen,
    setIsCompareModalOpen,
    designParams,
    selectedMaterial,
    allMaterials,
    setDesignParams,
    selectMaterial,
  } = useApp();

  const [altDiameter, setAltDiameter] = useState<number>(() =>
    designParams.diameter >= 45 ? designParams.diameter + 5 : 45
  );
  const [altMaterialId, setAltMaterialId] = useState<string>(selectedMaterial.id || 'aisi-4140');

  // Re-sync Candidate B starting baseline whenever modal opens so it never shows stale values
  useEffect(() => {
    if (isCompareModalOpen) {
      const nextDia =
        designParams.diameter < 40
          ? 45
          : Math.round((designParams.diameter + 5) * 100) / 100;
      setAltDiameter(nextDia);
      setAltMaterialId(selectedMaterial.id || 'aisi-4140');
    }
  }, [isCompareModalOpen, designParams.diameter, selectedMaterial.id]);

  const diameterOptions = useMemo(() => {
    const set = new Set<number>(STANDARD_DIAMETERS);
    if (Number.isFinite(designParams.diameter) && designParams.diameter > 0) {
      set.add(Math.round(designParams.diameter * 100) / 100);
    }
    if (Number.isFinite(altDiameter) && altDiameter > 0) {
      set.add(Math.round(altDiameter * 100) / 100);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [designParams.diameter, altDiameter]);

  if (!isCompareModalOpen) return null;

  const altMaterial = getMaterialById(altMaterialId) || selectedMaterial;
  const activeCriterion = designParams.criterion || 'Von Mises';
  const deflectionLimitRatio = designParams.deflectionLimitRatio || 1000;

  // Analysis for Config A (Working Model)
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
    criterion: activeCriterion,
    deflectionLimitRatio,
  });

  // Analysis for Config B (Candidate)
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
    criterion: activeCriterion,
    deflectionLimitRatio,
  });

  // Weight estimates
  const volA = (Math.PI / 4) * Math.pow(designParams.diameter / 1000, 2) * (designParams.length / 1000);
  const weightA = selectedMaterial.density * volA;

  const volB = (Math.PI / 4) * Math.pow(altDiameter / 1000, 2) * (designParams.length / 1000);
  const weightB = altMaterial.density * volB;

  const weightDeltaPercent = weightA > 0 ? (((weightB - weightA) / weightA) * 100).toFixed(1) : '0.0';
  const fosDelta = (
    analysisB.combinedStress.result.factorOfSafety -
    analysisA.combinedStress.result.factorOfSafety
  ).toFixed(2);

  const handleApplyConfigB = () => {
    setDesignParams({
      ...designParams,
      diameter: altDiameter,
      materialId: altMaterialId,
    });
    if (altMaterialId !== selectedMaterial.id) {
      selectMaterial(altMaterialId);
    }
    setIsCompareModalOpen(false);
  };

  return (
    <Modal
      isOpen={isCompareModalOpen}
      onClose={() => setIsCompareModalOpen(false)}
      title="Design Comparison & Variance Matrix"
      subtitle="Side-by-side mechanical trade-off evaluation between working baseline and candidate"
      icon={<Scale size={16} />}
      maxWidth="4xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full font-mono text-xs">
          <div className="text-[#64748B] dark:text-[#94A3B8]">
            Comparing{' '}
            <span className="text-[#172033] dark:text-white font-semibold">Config A (Active)</span> with{' '}
            <span className="text-[#2563EB] font-semibold">Config B (Candidate)</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setIsCompareModalOpen(false)}>
              Close
            </Button>
            <Button variant="primary" leftIcon={<Check size={13} />} onClick={handleApplyConfigB}>
              Apply Candidate B to Model
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs font-sans">
        {/* Comparison Header Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Config A Header */}
          <div className="p-3.5 rounded-[8px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-white dark:bg-[#101A2B] text-[#475569] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-[#334155]">
                Config A (Working Model)
              </span>
              <Badge variant={analysisA.overallStatus === 'fail' ? 'critical' : analysisA.overallStatus}>
                FoS {analysisA.combinedStress.result.factorOfSafety.toFixed(2)}x
              </Badge>
            </div>
            <div className="text-sm font-mono font-bold text-[#172033] dark:text-white mb-0.5 tabular-nums">
              ⌀{designParams.diameter} mm • {selectedMaterial.name}
            </div>
            <div className="text-[#64748B] dark:text-[#94A3B8] font-mono text-[11px]">
              Active project baseline under {designParams.torque} N·m · {designParams.force} N load ({activeCriterion}).
            </div>
          </div>

          {/* Config B Controls */}
          <div className="p-3.5 rounded-[8px] bg-[#EFF6FF]/60 dark:bg-[#162236] border border-[#BFDBFE] dark:border-[#2563EB]/40 relative">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] bg-[#2563EB] text-white">
                Config B (Candidate)
              </span>
              <Badge variant={analysisB.overallStatus === 'fail' ? 'critical' : analysisB.overallStatus}>
                FoS {analysisB.combinedStress.result.factorOfSafety.toFixed(2)}x
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="text-[10px] font-mono font-semibold text-[#64748B] dark:text-[#94A3B8] block mb-1">
                  Candidate ⌀
                </label>
                <select
                  value={altDiameter}
                  onChange={(e) => setAltDiameter(Number(e.target.value))}
                  className="w-full bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#334155] rounded-[6px] px-2.5 py-1.5 text-xs text-[#172033] dark:text-white font-mono focus:outline-none focus:border-[#2563EB]"
                >
                  {diameterOptions.map((d) => (
                    <option key={d} value={d}>
                      ⌀{d} mm {d === designParams.diameter ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono font-semibold text-[#64748B] dark:text-[#94A3B8] block mb-1">
                  Candidate Alloy
                </label>
                <select
                  value={altMaterialId}
                  onChange={(e) => setAltMaterialId(e.target.value)}
                  className="w-full bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#334155] rounded-[6px] px-2.5 py-1.5 text-xs text-[#172033] dark:text-white font-mono focus:outline-none focus:border-[#2563EB]"
                >
                  {allMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.yieldStrength} MPa)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Delta Summary Bar */}
        <div className="px-3.5 py-2.5 rounded-[8px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F] flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 text-[#172033] dark:text-white font-semibold">
            <ArrowLeftRight size={13} className="text-[#2563EB]" />
            <span>Variance Summary (B vs A):</span>
          </div>
          <div className="flex items-center gap-5 text-xs font-mono tabular-nums text-[#475569] dark:text-[#94A3B8]">
            <div>
              Mass Delta:{' '}
              <span
                className={`font-bold ${
                  Number(weightDeltaPercent) <= 0
                    ? 'text-[#16A34A]'
                    : 'text-[#D97706]'
                }`}
              >
                {Number(weightDeltaPercent) > 0 ? `+${weightDeltaPercent}%` : `${weightDeltaPercent}%`}
              </span>
            </div>
            <div>
              Safety Factor Delta:{' '}
              <span
                className={`font-bold ${
                  Number(fosDelta) >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                }`}
              >
                {Number(fosDelta) > 0 ? `+${fosDelta}` : fosDelta}x
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Table */}
        <div className="rounded-[8px] border border-[#E2E8F0] dark:border-[#24344F] overflow-x-auto bg-white dark:bg-[#101A2B]">
          <table className="w-full text-left font-mono text-xs tabular-nums">
            <thead>
              <tr className="bg-[#F8FAFC] dark:bg-[#162236] border-b border-[#E2E8F0] dark:border-[#24344F] text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase">
                <th className="py-2.5 px-3 font-semibold">Mechanical Parameter</th>
                <th className="py-2.5 px-3 font-semibold">Configuration A</th>
                <th className="py-2.5 px-3 font-semibold text-[#2563EB]">Configuration B</th>
                <th className="py-2.5 px-3 font-semibold">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#24344F] text-[#334155] dark:text-[#CBD5E1]">
              <tr>
                <td className="py-2 px-3 text-[#172033] dark:text-white font-medium">Outer Diameter</td>
                <td className="py-2 px-3">⌀{designParams.diameter} mm</td>
                <td className="py-2 px-3 text-[#2563EB] font-bold">⌀{altDiameter} mm</td>
                <td className="py-2 px-3 text-[#64748B] dark:text-[#94A3B8]">
                  {(altDiameter - designParams.diameter) > 0 ? '+' : ''}
                  {(altDiameter - designParams.diameter).toFixed(2).replace(/\.00$/, '')} mm
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#172033] dark:text-white font-medium">Yield Strength (σ_y)</td>
                <td className="py-2 px-3">{selectedMaterial.yieldStrength} MPa</td>
                <td className="py-2 px-3 text-[#2563EB] font-semibold">{altMaterial.yieldStrength} MPa</td>
                <td className="py-2 px-3 text-[#64748B] dark:text-[#94A3B8]">
                  {altMaterial.yieldStrength - selectedMaterial.yieldStrength > 0
                    ? `+${altMaterial.yieldStrength - selectedMaterial.yieldStrength}`
                    : altMaterial.yieldStrength - selectedMaterial.yieldStrength}{' '}
                  MPa
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#172033] dark:text-white font-medium">Torsional Shear (τ)</td>
                <td className="py-2 px-3">{analysisA.torsion.result.shearStressMPa.toFixed(1)} MPa</td>
                <td className="py-2 px-3">{analysisB.torsion.result.shearStressMPa.toFixed(1)} MPa</td>
                <td className="py-2 px-3 text-[#64748B] dark:text-[#94A3B8]">
                  {(analysisB.torsion.result.shearStressMPa - analysisA.torsion.result.shearStressMPa).toFixed(1)} MPa
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#172033] dark:text-white font-medium">
                  {activeCriterion} Equivalent (σ_eq)
                </td>
                <td className="py-2 px-3">{analysisA.combinedStress.result.equivalentStressMPa.toFixed(1)} MPa</td>
                <td className="py-2 px-3">{analysisB.combinedStress.result.equivalentStressMPa.toFixed(1)} MPa</td>
                <td className="py-2 px-3 text-[#64748B] dark:text-[#94A3B8]">
                  {(
                    analysisB.combinedStress.result.equivalentStressMPa -
                    analysisA.combinedStress.result.equivalentStressMPa
                  ).toFixed(1)}{' '}
                  MPa
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#172033] dark:text-white font-medium">Factor of Safety (FoS)</td>
                <td className="py-2 px-3 font-bold text-[#172033] dark:text-white">
                  {analysisA.combinedStress.result.factorOfSafety.toFixed(2)}x
                </td>
                <td className="py-2 px-3 font-bold text-[#2563EB]">
                  {analysisB.combinedStress.result.factorOfSafety.toFixed(2)}x
                </td>
                <td className="py-2 px-3 font-bold text-[#64748B] dark:text-[#94A3B8]">
                  {Number(fosDelta) > 0 ? `+${fosDelta}` : fosDelta}x
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#172033] dark:text-white font-medium">Midspan Deflection (δ)</td>
                <td className="py-2 px-3">{analysisA.deflection.result.maxDeflectionMm.toFixed(4)} mm</td>
                <td className="py-2 px-3">{analysisB.deflection.result.maxDeflectionMm.toFixed(4)} mm</td>
                <td className="py-2 px-3 text-[#64748B] dark:text-[#94A3B8]">
                  {(
                    analysisB.deflection.result.maxDeflectionMm -
                    analysisA.deflection.result.maxDeflectionMm
                  ).toFixed(4)}{' '}
                  mm
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#172033] dark:text-white font-medium">Shaft Mass</td>
                <td className="py-2 px-3">{weightA.toFixed(2)} kg</td>
                <td className="py-2 px-3 text-[#2563EB] font-semibold">{weightB.toFixed(2)} kg</td>
                <td className="py-2 px-3 text-[#64748B] dark:text-[#94A3B8]">
                  {(weightB - weightA).toFixed(2)} kg ({weightDeltaPercent}%)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
