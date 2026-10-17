import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Activity,
  Beaker,
  Scissors,
  Zap,
  ShieldCheck,
  ChevronRight,
  Info,
  X,
  Scale,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import {
  calculateShaftTorsion,
  calculateShaftBending,
  calculateCombinedStress,
  calculateShaftDeflection,
  calculatePowerTransmission,
  YieldCriterion,
  EngineeringCalculationResult,
} from '../engineering';

export default function CalculationsPage() {
  const { designParams, selectedMaterial } = useApp();
  const [criterion, setCriterion] = useState<YieldCriterion>('Von Mises');
  const [selectedCalcForModal, setSelectedCalcForModal] = useState<EngineeringCalculationResult<any> | null>(null);

  const { diameter: d, length: L, torque: T, force: F, rpm: n, safetyFactor: targetFoS } = designParams;
  const yieldStrength = selectedMaterial.yieldStrength; // MPa
  const elasticModulus = selectedMaterial.elasticModulus; // GPa

  // 1. Torsion
  const torsion = calculateShaftTorsion({
    torque: { value: T, unit: 'N·m' },
    diameter: { value: d, unit: 'mm' },
    yieldStrength: { value: yieldStrength, unit: 'MPa' },
    targetSafetyFactor: targetFoS,
  });

  // 2. Bending
  const bending = calculateShaftBending({
    force: { value: F, unit: 'N' },
    length: { value: L, unit: 'mm' },
    diameter: { value: d, unit: 'mm' },
    allowableYieldStrength: { value: yieldStrength, unit: 'MPa' },
  });

  // 3. Combined Multiaxial Stress
  const combined = calculateCombinedStress({
    bendingStressMPa: bending.result.bendingStressMPa,
    shearStressMPa: torsion.result.shearStressMPa,
    yieldStrengthMPa: yieldStrength,
    criterion,
    targetSafetyFactor: targetFoS,
  });

  // 4. Deflection
  const deflection = calculateShaftDeflection({
    force: { value: F, unit: 'N' },
    length: { value: L, unit: 'mm' },
    diameter: { value: d, unit: 'mm' },
    elasticModulus: { value: elasticModulus, unit: 'GPa' },
  });

  // 5. Power Transmission
  const power = calculatePowerTransmission({
    torque: { value: T, unit: 'N·m' },
    rpm: n,
  });

  const renderStatusBadge = (status: 'pass' | 'warning' | 'fail') => {
    if (status === 'pass') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-status-pass/20 text-status-pass border border-status-pass/30">
          <CheckCircle2 size={12} /> PASS
        </span>
      );
    }
    if (status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <AlertTriangle size={12} /> MARGINAL
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-status-fail/20 text-status-fail border border-status-fail/30">
        <XCircle size={12} /> FAIL
      </span>
    );
  };

  return (
    <div className="p-6 h-full overflow-y-auto animate-fade-in font-sans">
      {/* Header with Title & Criterion Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 mb-1">Engineering Calculations</h1>
          <p className="text-gray-400 text-sm">
            Live analytical formulas evaluated by the dedicated engineering calculation engine.
          </p>
        </div>

        {/* Failure Criterion Switcher */}
        <div className="flex items-center gap-2 bg-navy-800 p-1 rounded-lg border border-navy-700">
          <span className="text-xs text-gray-400 px-2 font-medium flex items-center gap-1">
            <Scale size={13} className="text-accent" /> Criterion:
          </span>
          <button
            onClick={() => setCriterion('Von Mises')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              criterion === 'Von Mises'
                ? 'bg-accent text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Von Mises (Distortion Energy)
          </button>
          <button
            onClick={() => setCriterion('Tresca')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              criterion === 'Tresca'
                ? 'bg-accent text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Tresca (Max Shear)
          </button>
        </div>
      </div>

      {/* Grid of 5 Engineering Calculation Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Card 1: Shaft Torsion */}
        <div className="card bg-navy-800 border-l-4 border-l-accent relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-navy-700 rounded-lg text-accent">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-100">{torsion.name}</h2>
                  <div className="text-[11px] text-gray-400">{torsion.model}</div>
                </div>
              </div>
              {renderStatusBadge(torsion.status)}
            </div>

            <div className="font-mono bg-navy-950 p-3.5 rounded-lg mb-4 text-gray-300 border border-navy-700 text-xs">
              <div className="text-gray-500 mb-1">Governing Formula</div>
              <div className="text-accent-light font-bold text-sm">τ = 16T / (πd³)</div>
              <div className="text-gray-400 mt-2 font-mono">
                = (16 × {T} N·m) / (π × ({d} mm)³)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-4 bg-navy-900/50 p-2.5 rounded border border-navy-700/50">
              <div>Torque (T): <span className="text-gray-200 font-mono font-medium">{T} N·m</span></div>
              <div>Diameter (d): <span className="text-gray-200 font-mono font-medium">{d} mm</span></div>
              <div>Polar Inertia (J): <span className="text-gray-200 font-mono font-medium">{(torsion.result.polarMomentOfInertiaMm4).toExponential(2)} mm⁴</span></div>
              <div>Allowable Shear (τ_allow): <span className="text-gray-200 font-mono font-medium">{torsion.result.allowableShearStressMPa?.toFixed(1)} MPa</span></div>
            </div>
          </div>

          <div className="flex justify-between items-end pt-3 border-t border-navy-700/60">
            <button
              onClick={() => setSelectedCalcForModal(torsion)}
              className="text-xs text-accent hover:text-accent-light flex items-center gap-1 transition-colors"
            >
              <Info size={13} /> View Calculation Derivation
            </button>
            <div className="text-right">
              <div className="text-[11px] text-gray-400">Shear Stress (τ)</div>
              <div className="text-2xl font-bold font-mono text-gray-100">
                {torsion.result.shearStressMPa.toFixed(2)} <span className="text-xs text-gray-400 font-normal">MPa</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Bending Stress */}
        <div className="card bg-navy-800 border-l-4 border-l-cyan relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-navy-700 rounded-lg text-cyan">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-100">{bending.name}</h2>
                  <div className="text-[11px] text-gray-400">{bending.model}</div>
                </div>
              </div>
              {renderStatusBadge(bending.status)}
            </div>

            <div className="font-mono bg-navy-950 p-3.5 rounded-lg mb-4 text-gray-300 border border-navy-700 text-xs">
              <div className="text-gray-500 mb-1">Governing Formula</div>
              <div className="text-cyan font-bold text-sm">σ_b = 32M / (πd³)</div>
              <div className="text-gray-400 mt-2 font-mono">
                where M = F·L / 4 = ({F} N × {L} mm) / 4 = {bending.result.bendingMomentNm.toFixed(1)} N·m
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-4 bg-navy-900/50 p-2.5 rounded border border-navy-700/50">
              <div>Radial Force (F): <span className="text-gray-200 font-mono font-medium">{F} N</span></div>
              <div>Span (L): <span className="text-gray-200 font-mono font-medium">{L} mm</span></div>
              <div>Bending Moment (M): <span className="text-gray-200 font-mono font-medium">{bending.result.bendingMomentNm.toFixed(1)} N·m</span></div>
              <div>Section Modulus (Z): <span className="text-gray-200 font-mono font-medium">{bending.result.sectionModulusMm3.toFixed(0)} mm³</span></div>
            </div>
          </div>

          <div className="flex justify-between items-end pt-3 border-t border-navy-700/60">
            <button
              onClick={() => setSelectedCalcForModal(bending)}
              className="text-xs text-cyan hover:text-cyan/80 flex items-center gap-1 transition-colors"
            >
              <Info size={13} /> View Calculation Derivation
            </button>
            <div className="text-right">
              <div className="text-[11px] text-gray-400">Bending Stress (σ_b)</div>
              <div className="text-2xl font-bold font-mono text-gray-100">
                {bending.result.bendingStressMPa.toFixed(2)} <span className="text-xs text-gray-400 font-normal">MPa</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Combined Multiaxial Stress */}
        <div className="card bg-navy-800 border-l-4 border-l-purple-400 relative overflow-hidden flex flex-col justify-between xl:col-span-2">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-navy-700 rounded-lg text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-100">{combined.name}</h2>
                  <div className="text-[11px] text-gray-400">{combined.model}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400 bg-navy-900 px-2 py-0.5 rounded border border-navy-700">
                  {criterion} Formulation
                </span>
                {renderStatusBadge(combined.status)}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="font-mono bg-navy-950 p-3.5 rounded-lg text-gray-300 border border-navy-700 text-xs">
                <div className="text-gray-500 mb-1">Multiaxial Yield Formulation</div>
                <div className="text-purple-300 font-bold text-sm">
                  {criterion === 'Von Mises'
                    ? 'σ_vm = √(σ_b² + 3τ²)'
                    : 'σ_equiv = 2τ_max = √(σ_b² + 4τ²)'}
                </div>
                <div className="text-gray-400 mt-2 font-mono text-[11px]">
                  = √(({bending.result.bendingStressMPa.toFixed(1)})² + {criterion === 'Von Mises' ? '3' : '4'} × ({torsion.result.shearStressMPa.toFixed(1)})²)
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 bg-navy-900/50 p-3.5 rounded-lg border border-navy-700/50">
                <div>Principal σ₁: <span className="text-gray-200 font-mono font-medium">{combined.result.principalStress1MPa.toFixed(1)} MPa</span></div>
                <div>Principal σ₂: <span className="text-gray-200 font-mono font-medium">{combined.result.principalStress2MPa.toFixed(1)} MPa</span></div>
                <div>Max Shear (τ_max): <span className="text-gray-200 font-mono font-medium">{combined.result.maxShearStressMPa.toFixed(1)} MPa</span></div>
                <div>Design FoS: <span className="text-accent-light font-mono font-bold">{combined.result.factorOfSafety.toFixed(2)}</span></div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end pt-3 border-t border-navy-700/60">
            <button
              onClick={() => setSelectedCalcForModal(combined)}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              <Info size={13} /> View Mohr's Circle & Yield Envelope
            </button>
            <div className="flex items-center gap-6 text-right">
              <div>
                <div className="text-[11px] text-gray-400">Equivalent Stress</div>
                <div className="text-2xl font-bold font-mono text-gray-100">
                  {combined.result.equivalentStressMPa.toFixed(1)} <span className="text-xs text-gray-400 font-normal">MPa</span>
                </div>
              </div>
              <div>
                <div className="text-[11px] text-gray-400">Factor of Safety</div>
                <div className={`text-2xl font-bold font-mono ${combined.result.factorOfSafety >= targetFoS ? 'text-status-pass' : 'text-status-fail'}`}>
                  {combined.result.factorOfSafety.toFixed(2)} <span className="text-xs text-gray-400 font-normal">/ {targetFoS.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Shaft Deflection */}
        <div className="card bg-navy-800 border-l-4 border-l-status-warning relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-navy-700 rounded-lg text-amber-400">
                  <Beaker className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-100">{deflection.name}</h2>
                  <div className="text-[11px] text-gray-400">{deflection.model}</div>
                </div>
              </div>
              {renderStatusBadge(deflection.status)}
            </div>

            <div className="font-mono bg-navy-950 p-3.5 rounded-lg mb-4 text-gray-300 border border-navy-700 text-xs">
              <div className="text-gray-500 mb-1">Governing Formula</div>
              <div className="text-amber-400 font-bold text-sm">δ_max = FL³ / (48EI)</div>
              <div className="text-gray-400 mt-2 font-mono">
                where I = πd⁴ / 64 = {((Math.PI * Math.pow(d, 4)) / 64).toFixed(0)} mm⁴
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-4 bg-navy-900/50 p-2.5 rounded border border-navy-700/50">
              <div>Elastic Modulus (E): <span className="text-gray-200 font-mono font-medium">{elasticModulus} GPa</span></div>
              <div>Allowable Limit (L/1000): <span className="text-gray-200 font-mono font-medium">{deflection.result.allowableDeflectionMm?.toFixed(3)} mm</span></div>
              <div>Slope at Supports (θ): <span className="text-gray-200 font-mono font-medium">{(deflection.result.slopeAtSupportsRad * 1000).toFixed(2)} mrad</span></div>
              <div>Span/Diameter (L/d): <span className="text-gray-200 font-mono font-medium">{(L / d).toFixed(1)}</span></div>
            </div>
          </div>

          <div className="flex justify-between items-end pt-3 border-t border-navy-700/60">
            <button
              onClick={() => setSelectedCalcForModal(deflection)}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              <Info size={13} /> View Deflection Derivation
            </button>
            <div className="text-right">
              <div className="text-[11px] text-gray-400">Max Deflection (δ)</div>
              <div className="text-2xl font-bold font-mono text-gray-100">
                {deflection.result.maxDeflectionMm.toFixed(4)} <span className="text-xs text-gray-400 font-normal">mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 5: Power Transmission */}
        <div className="card bg-navy-800 border-l-4 border-l-status-pass relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-navy-700 rounded-lg text-status-pass">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-100">{power.name}</h2>
                  <div className="text-[11px] text-gray-400">{power.model}</div>
                </div>
              </div>
              {renderStatusBadge(power.status)}
            </div>

            <div className="font-mono bg-navy-950 p-3.5 rounded-lg mb-4 text-gray-300 border border-navy-700 text-xs">
              <div className="text-gray-500 mb-1">Governing Formula</div>
              <div className="text-status-pass font-bold text-sm">P = T · ω = T · (2πn / 60)</div>
              <div className="text-gray-400 mt-2 font-mono">
                = {T} N·m × (2π × {n} RPM / 60)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-4 bg-navy-900/50 p-2.5 rounded border border-navy-700/50">
              <div>Torque (T): <span className="text-gray-200 font-mono font-medium">{T} N·m</span></div>
              <div>Rotational Speed (n): <span className="text-gray-200 font-mono font-medium">{n} RPM</span></div>
              <div>Angular Velocity (ω): <span className="text-gray-200 font-mono font-medium">{power.result.angularVelocityRadS.toFixed(2)} rad/s</span></div>
              <div>Imperial Power: <span className="text-gray-200 font-mono font-medium">{power.result.powerHp.toFixed(2)} hp</span></div>
            </div>
          </div>

          <div className="flex justify-between items-end pt-3 border-t border-navy-700/60">
            <button
              onClick={() => setSelectedCalcForModal(power)}
              className="text-xs text-status-pass hover:text-status-pass/80 flex items-center gap-1 transition-colors"
            >
              <Info size={13} /> View Power Derivation
            </button>
            <div className="text-right">
              <div className="text-[11px] text-gray-400">Transmitted Power (P)</div>
              <div className="text-2xl font-bold font-mono text-gray-100">
                {power.result.powerKW.toFixed(2)} <span className="text-xs text-gray-400 font-normal">kW</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Disclaimer Banner */}
      <div className="p-4 bg-navy-900/80 rounded-xl border border-navy-700 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-accent" />
          <span>{torsion.disclaimer}</span>
        </div>
        <span className="font-mono text-gray-500">ISO 10816 / ASME B106.1M Compliant Core</span>
      </div>

      {/* Transparent Calculation Inspection Modal */}
      {selectedCalcForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-navy-900 border border-navy-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-navy-700 flex items-center justify-between bg-navy-950">
              <div className="flex items-center gap-2">
                <Info className="text-accent w-5 h-5" />
                <h3 className="text-base font-semibold text-gray-100">
                  Calculation Derivation: {selectedCalcForModal.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCalcForModal(null)}
                className="p-1 text-gray-400 hover:text-white rounded hover:bg-navy-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Model & Formula */}
              <div className="bg-navy-950 p-4 rounded-lg border border-navy-700">
                <div className="text-gray-400 text-[11px] uppercase tracking-wider mb-1">Physical Model</div>
                <div className="text-gray-200 font-semibold mb-3">{selectedCalcForModal.model}</div>

                <div className="text-gray-400 text-[11px] uppercase tracking-wider mb-1">Governing Formula</div>
                <div className="font-mono text-accent-light text-sm bg-navy-900 p-2.5 rounded border border-navy-800">
                  {selectedCalcForModal.formula}
                </div>
              </div>

              {/* Normalized SI Inputs */}
              <div>
                <h4 className="text-gray-300 font-semibold mb-2">Normalized SI Base Parameters</h4>
                <div className="grid grid-cols-2 gap-2 font-mono bg-navy-800/80 p-3 rounded-lg border border-navy-700">
                  {Object.entries(selectedCalcForModal.normalizedInputsSI).map(([key, val]) => (
                    <div key={key} className="flex justify-between border-b border-navy-700/50 pb-1">
                      <span className="text-gray-400">{key}:</span>
                      <span className="text-gray-200">{Number(val).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Engineering Assumptions */}
              <div>
                <h4 className="text-gray-300 font-semibold mb-2">Governing Engineering Assumptions</h4>
                <ul className="space-y-1 text-gray-400 list-disc list-inside bg-navy-800/40 p-3 rounded-lg border border-navy-700/50">
                  {selectedCalcForModal.assumptions.map((asm, idx) => (
                    <li key={idx}>{asm}</li>
                  ))}
                </ul>
              </div>

              {/* Warnings / Notices */}
              {selectedCalcForModal.warnings.length > 0 && (
                <div>
                  <h4 className="text-amber-400 font-semibold mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Engineering Warnings
                  </h4>
                  <ul className="space-y-1 text-amber-300/90 list-disc list-inside bg-amber-950/20 border border-amber-900/40 p-3 rounded-lg">
                    {selectedCalcForModal.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Safety Disclaimer */}
              <div className="p-3 bg-navy-950 rounded-lg border border-navy-700 text-gray-400 text-[11px] flex items-center gap-2">
                <ShieldCheck size={14} className="text-accent shrink-0" />
                <span>{selectedCalcForModal.disclaimer}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-navy-700 bg-navy-950 flex justify-end">
              <button
                onClick={() => setSelectedCalcForModal(null)}
                className="btn-secondary text-xs px-4 py-1.5"
              >
                Close Derivation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
