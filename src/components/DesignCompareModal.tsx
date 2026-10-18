import React, { useState } from 'react';
import { Scale, Check, ArrowLeftRight } from 'lucide-react';
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
  } = useApp();

  const [altDiameter, setAltDiameter] = useState<number>(
    designParams.diameter === 45 ? 50 : 45
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
      title="Design Comparison & Variance Matrix"
      subtitle="Side-by-side mechanical trade-off evaluation between working baseline and candidate"
      icon={<Scale size={16} />}
      maxWidth="4xl"
      footer={
        <div className="flex items-center justify-between w-full font-mono text-xs">
          <div className="text-[#969DA5]">
            Comparing <span className="text-[#F0F1F2] font-semibold">Config A (Active)</span> with{' '}
            <span className="text-[#64D6C5] font-semibold">Config B (Candidate)</span>
          </div>
          <div className="flex gap-2">
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
        <div className="grid grid-cols-2 gap-3">
          {/* Config A Header */}
          <div className="p-3.5 rounded-[4px] bg-[#14171A] border border-[#2A2E35]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-[2px] bg-[#22262A] text-[#969DA5] border border-[#34393F]">
                Config A (Working Model)
              </span>
              <Badge variant={analysisA.overallStatus === 'fail' ? 'critical' : analysisA.overallStatus}>
                FoS {analysisA.combinedStress.result.factorOfSafety.toFixed(2)}x
              </Badge>
            </div>
            <div className="text-sm font-mono font-bold text-[#F0F1F2] mb-0.5">
              ⌀{designParams.diameter} mm • {selectedMaterial.name}
            </div>
            <div className="text-[#969DA5] font-mono text-[11px]">
              Active project baseline under {designParams.torque} N·m load.
            </div>
          </div>

          {/* Config B Controls */}
          <div className="p-3.5 rounded-[4px] bg-[#14171A] border border-[#64D6C5]/40 relative">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-[2px] bg-[#64D6C5]/15 text-[#64D6C5] border border-[#64D6C5]/30">
                Config B (Candidate)
              </span>
              <Badge variant={analysisB.overallStatus === 'fail' ? 'critical' : analysisB.overallStatus}>
                FoS {analysisB.combinedStress.result.factorOfSafety.toFixed(2)}x
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="text-[10px] font-mono text-[#969DA5] block mb-0.5">Candidate ⌀</label>
                <select
                  value={altDiameter}
                  onChange={(e) => setAltDiameter(Number(e.target.value))}
                  className="w-full bg-[#191C1F] border border-[#34393F] rounded-[3px] px-2 py-1 text-xs text-[#F0F1F2] font-mono focus:outline-none focus:border-[#64D6C5]"
                >
                  {[38, 40, 42, 44, 45, 48, 50, 55].map((d) => (
                    <option key={d} value={d}>
                      ⌀{d} mm {d === 45 ? '(Baseline)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#969DA5] block mb-0.5">Candidate Alloy</label>
                <select
                  value={altMaterialId}
                  onChange={(e) => setAltMaterialId(e.target.value)}
                  className="w-full bg-[#191C1F] border border-[#34393F] rounded-[3px] px-2 py-1 text-xs text-[#F0F1F2] font-mono focus:outline-none focus:border-[#64D6C5]"
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
        <div className="p-2.5 rounded-[4px] bg-[#14171A] border border-[#2A2E35] flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-1.5 text-[#C2C8D0]">
            <ArrowLeftRight size={13} className="text-[#64D6C5]" />
            <span>Variance Summary (B vs A):</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              Mass Delta:{' '}
              <span className={`font-bold ${Number(weightDeltaPercent) < 0 ? 'text-[#34D399]' : 'text-[#E7B65C]'}`}>
                {Number(weightDeltaPercent) > 0 ? `+${weightDeltaPercent}%` : `${weightDeltaPercent}%`}
              </span>
            </div>
            <div>
              Safety Factor Delta:{' '}
              <span className={`font-bold ${Number(fosDelta) >= 0 ? 'text-[#34D399]' : 'text-[#E16D72]'}`}>
                {Number(fosDelta) > 0 ? `+${fosDelta}` : fosDelta}x
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Table */}
        <div className="rounded-[4px] border border-[#34393F] overflow-hidden bg-[#14171A]">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="bg-[#22262A] border-b border-[#34393F] text-[10px] text-[#969DA5] uppercase">
                <th className="py-2 px-3">Mechanical Parameter</th>
                <th className="py-2 px-3">Configuration A</th>
                <th className="py-2 px-3">Configuration B</th>
                <th className="py-2 px-3">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2E35] text-[#C2C8D0]">
              <tr>
                <td className="py-2 px-3 text-[#F0F1F2]">Outer Diameter</td>
                <td className="py-2 px-3">⌀{designParams.diameter} mm</td>
                <td className="py-2 px-3 text-[#64D6C5] font-bold">⌀{altDiameter} mm</td>
                <td className="py-2 px-3 text-[#969DA5]">{altDiameter - designParams.diameter} mm</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#F0F1F2]">Yield Strength (σ_y)</td>
                <td className="py-2 px-3">{selectedMaterial.yieldStrength} MPa</td>
                <td className="py-2 px-3 text-[#64D6C5]">{altMaterial.yieldStrength} MPa</td>
                <td className="py-2 px-3 text-[#969DA5]">
                  {altMaterial.yieldStrength - selectedMaterial.yieldStrength > 0 ? `+${altMaterial.yieldStrength - selectedMaterial.yieldStrength}` : altMaterial.yieldStrength - selectedMaterial.yieldStrength} MPa
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#F0F1F2]">Torsional Shear (τ)</td>
                <td className="py-2 px-3">{analysisA.torsion.result.shearStressMPa.toFixed(1)} MPa</td>
                <td className="py-2 px-3">{analysisB.torsion.result.shearStressMPa.toFixed(1)} MPa</td>
                <td className="py-2 px-3 text-[#969DA5]">
                  {(analysisB.torsion.result.shearStressMPa - analysisA.torsion.result.shearStressMPa).toFixed(1)} MPa
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#F0F1F2]">Von Mises Equivalent (σ_vm)</td>
                <td className="py-2 px-3">{analysisA.combinedStress.result.equivalentStressMPa.toFixed(1)} MPa</td>
                <td className="py-2 px-3">{analysisB.combinedStress.result.equivalentStressMPa.toFixed(1)} MPa</td>
                <td className="py-2 px-3 text-[#969DA5]">
                  {(analysisB.combinedStress.result.equivalentStressMPa - analysisA.combinedStress.result.equivalentStressMPa).toFixed(1)} MPa
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#F0F1F2]">Factor of Safety (FoS)</td>
                <td className="py-2 px-3 font-bold">{analysisA.combinedStress.result.factorOfSafety.toFixed(2)}x</td>
                <td className="py-2 px-3 font-bold text-[#64D6C5]">{analysisB.combinedStress.result.factorOfSafety.toFixed(2)}x</td>
                <td className="py-2 px-3 font-bold text-[#969DA5]">{Number(fosDelta) > 0 ? `+${fosDelta}` : fosDelta}x</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#F0F1F2]">Midspan Deflection (δ)</td>
                <td className="py-2 px-3">{analysisA.deflection.result.maxDeflectionMm.toFixed(4)} mm</td>
                <td className="py-2 px-3">{analysisB.deflection.result.maxDeflectionMm.toFixed(4)} mm</td>
                <td className="py-2 px-3 text-[#969DA5]">
                  {(analysisB.deflection.result.maxDeflectionMm - analysisA.deflection.result.maxDeflectionMm).toFixed(4)} mm
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-[#F0F1F2]">Shaft Mass</td>
                <td className="py-2 px-3">{weightA.toFixed(2)} kg</td>
                <td className="py-2 px-3 text-[#64D6C5]">{weightB.toFixed(2)} kg</td>
                <td className="py-2 px-3 text-[#969DA5]">{(weightB - weightA).toFixed(2)} kg ({weightDeltaPercent}%)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
