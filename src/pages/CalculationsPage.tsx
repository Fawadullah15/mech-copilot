import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Activity,
  Scissors,
  Zap,
  ShieldCheck,
  Info,
  X,
  Scale,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import StandardsRegistryView from '../components/StandardsRegistryView';
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
  const { designParams, selectedMaterial, calculationsTab, setCalculationsTab } = useApp();
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
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-[#39866B]/15 text-[#39866B] border border-[#39866B]/30">
          <CheckCircle2 size={12} /> PASS
        </span>
      );
    }
    if (status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-[#C78B3B]/15 text-[#C78B3B] border border-[#C78B3B]/30">
          <AlertTriangle size={12} /> MARGINAL
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-[#C4515C]/15 text-[#C4515C] border border-[#C4515C]/30">
        <XCircle size={12} /> FAIL
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in font-sans bg-[#F2F4FA] dark:bg-[#111827] text-[#172033] dark:text-[#FFFFFF] space-y-6 max-w-7xl mx-auto">
      {/* CAD Station Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D9DFED] dark:border-[#28344E]">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-[#315EDE] mb-1 font-bold">
            Mechanics of Materials Kernel
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#172033] dark:text-[#FFFFFF] font-display">
            Engineering Calculations & Analytical Derivations
          </h1>
          <p className="text-xs text-[#64708A] font-medium mt-1">
            Live closed-form mechanical equations evaluated from active CAD telemetry.
          </p>
        </div>

        {/* View & Criterion Switcher */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          {/* Sub-view Tab Selector */}
          <div className="flex items-center bg-[#E9EDF7] dark:bg-[#1E2436] p-1 rounded-[8px] border border-[#D9DFED] dark:border-[#28344E]">
            <button
              onClick={() => setCalculationsTab('equations')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[6px] flex items-center gap-1.5 transition-colors ${
                calculationsTab === 'equations'
                  ? 'bg-[#315EDE] text-[#FFFFFF] shadow-blueGlow'
                  : 'text-[#64708A] hover:text-[#172033] dark:hover:text-[#FFFFFF]'
              }`}
            >
              <Activity size={13} />
              <span>Equations (5)</span>
            </button>
            <button
              onClick={() => setCalculationsTab('standards')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[6px] flex items-center gap-1.5 transition-colors ${
                calculationsTab === 'standards'
                  ? 'bg-[#315EDE] text-[#FFFFFF] shadow-blueGlow'
                  : 'text-[#64708A] hover:text-[#172033] dark:hover:text-[#FFFFFF]'
              }`}
            >
              <BookOpen size={13} />
              <span>Standards Registry (8)</span>
            </button>
          </div>

          {calculationsTab === 'equations' && (
            <div className="flex items-center gap-1 bg-[#E9EDF7] dark:bg-[#1E2436] p-1 rounded-[8px] border border-[#D9DFED] dark:border-[#28344E]">
              <span className="text-[11px] font-mono text-[#64708A] px-1 flex items-center gap-1">
                <Scale size={12} className="text-[#315EDE]" />
              </span>
              <button
                onClick={() => setCriterion('Von Mises')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-[6px] transition-colors ${
                  criterion === 'Von Mises'
                    ? 'bg-[#FFFFFF] dark:bg-[#172033] text-[#315EDE] shadow-xs'
                    : 'text-[#64708A] hover:text-[#172033] dark:hover:text-[#FFFFFF]'
                }`}
              >
                Von Mises
              </button>
              <button
                onClick={() => setCriterion('Tresca')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-[6px] transition-colors ${
                  criterion === 'Tresca'
                    ? 'bg-[#FFFFFF] dark:bg-[#172033] text-[#315EDE] shadow-xs'
                    : 'text-[#64708A] hover:text-[#172033] dark:hover:text-[#FFFFFF]'
                }`}
              >
                Tresca
              </button>
            </div>
          )}
        </div>
      </div>

      {calculationsTab === 'standards' ? (
        <StandardsRegistryView onSelectCalculationTab={() => setCalculationsTab('equations')} />
      ) : (
        <>
          {/* Grid of Engineering Calculation Cards */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Card 1: Shaft Torsion */}
            <div className="bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] border-l-4 border-l-[#315EDE] rounded-[10px] p-4 flex flex-col justify-between shadow-panel">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-[#E9EDF7] dark:bg-[#1E2436] rounded-[8px] text-[#315EDE]">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider">{torsion.name}</h2>
                      <div className="text-[11px] font-mono text-[#64708A]">{torsion.model}</div>
                    </div>
                  </div>
                  {renderStatusBadge(torsion.status)}
                </div>

                <div className="font-mono bg-[#F8FAFC] dark:bg-[#1A2234] p-3 rounded-[8px] mb-3 text-[#172033] dark:text-[#FFFFFF] border border-[#D9DFED] dark:border-[#28344E] text-xs">
                  <div className="text-[#64708A] text-[10px] uppercase font-bold mb-1">Governing Equation</div>
                  <div className="text-[#315EDE] font-bold text-xs">τ = 16T / (πd³)</div>
                  <div className="text-[#64708A] mt-1 text-[11px]">
                    = (16 × {T} N·m) / (π × ({d} mm)³)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#64708A] mb-3 bg-[#F8FAFC] dark:bg-[#1A2234] p-3 rounded-[8px] border border-[#D9DFED] dark:border-[#28344E]">
                  <div>Torque (T): <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{T} N·m</span></div>
                  <div>Diameter (d): <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{d} mm</span></div>
                  <div>Polar J: <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{(torsion.result.polarMomentOfInertiaMm4).toExponential(2)} mm⁴</span></div>
                  <div>Allowable τ: <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{torsion.result.allowableShearStressMPa?.toFixed(1)} MPa</span></div>
                </div>
              </div>

              <div className="flex justify-between items-end pt-3 border-t border-[#D9DFED] dark:border-[#28344E]">
                <button
                  onClick={() => setSelectedCalcForModal(torsion)}
                  className="text-xs font-semibold text-[#315EDE] hover:underline flex items-center gap-1 transition-colors"
                >
                  <Info size={12} /> Derivation Steps
                </button>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-[#64708A] uppercase font-bold">Torsional Shear (τ)</div>
                  <div className="text-xl font-bold font-mono text-[#172033] dark:text-[#FFFFFF]">
                    {torsion.result.shearStressMPa.toFixed(2)} <span className="text-xs text-[#64708A] font-normal">MPa</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Bending Stress */}
            <div className="bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] border-l-4 border-l-[#2446B8] rounded-[10px] p-4 flex flex-col justify-between shadow-panel">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-[#E9EDF7] dark:bg-[#1E2436] rounded-[8px] text-[#2446B8]">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider">{bending.name}</h2>
                      <div className="text-[11px] font-mono text-[#64708A]">{bending.model}</div>
                    </div>
                  </div>
                  {renderStatusBadge(bending.status)}
                </div>

                <div className="font-mono bg-[#F8FAFC] dark:bg-[#1A2234] p-3 rounded-[8px] mb-3 text-[#172033] dark:text-[#FFFFFF] border border-[#D9DFED] dark:border-[#28344E] text-xs">
                  <div className="text-[#64708A] text-[10px] uppercase font-bold mb-1">Governing Equation</div>
                  <div className="text-[#2446B8] font-bold text-xs">σ_b = 32M / (πd³)</div>
                  <div className="text-[#64708A] mt-1 text-[11px]">
                    where M = F·L / 4 = ({F} N × {L} mm) / 4 = {bending.result.bendingMomentNm.toFixed(1)} N·m
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#64708A] mb-3 bg-[#F8FAFC] dark:bg-[#1A2234] p-3 rounded-[8px] border border-[#D9DFED] dark:border-[#28344E]">
                  <div>Radial Load (F): <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{F} N</span></div>
                  <div>Span (L): <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{L} mm</span></div>
                  <div>Bending Moment (M): <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{bending.result.bendingMomentNm.toFixed(1)} N·m</span></div>
                  <div>Section Modulus (Z): <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{bending.result.sectionModulusMm3.toFixed(0)} mm³</span></div>
                </div>
              </div>

              <div className="flex justify-between items-end pt-3 border-t border-[#D9DFED] dark:border-[#28344E]">
                <button
                  onClick={() => setSelectedCalcForModal(bending)}
                  className="text-xs font-semibold text-[#2446B8] hover:underline flex items-center gap-1 transition-colors"
                >
                  <Info size={12} /> Derivation Steps
                </button>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-[#64708A] uppercase font-bold">Bending Stress (σ_b)</div>
                  <div className="text-xl font-bold font-mono text-[#172033] dark:text-[#FFFFFF]">
                    {bending.result.bendingStressMPa.toFixed(2)} <span className="text-xs text-[#64708A] font-normal">MPa</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Combined Multiaxial Stress */}
            <div className="bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] border-l-4 border-l-[#7653C9] rounded-[10px] p-4 flex flex-col justify-between xl:col-span-2 shadow-panel">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-[#EAE3FF] dark:bg-[#7653C9]/20 rounded-[8px] text-[#7653C9]">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider">{combined.name}</h2>
                      <div className="text-[11px] font-mono text-[#64708A]">{combined.model}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-[#7653C9] bg-[#EAE3FF] dark:bg-[#7653C9]/20 px-2.5 py-1 rounded-[4px] border border-[#7653C9]/30">
                      {criterion} Formulation
                    </span>
                    {renderStatusBadge(combined.status)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="font-mono bg-[#F8FAFC] dark:bg-[#1A2234] p-3 rounded-[8px] text-[#172033] dark:text-[#FFFFFF] border border-[#D9DFED] dark:border-[#28344E] text-xs">
                    <div className="text-[#64708A] text-[10px] uppercase font-bold mb-1">Multiaxial Yield Criterion</div>
                    <div className="text-[#7653C9] font-bold text-xs">
                      {criterion === 'Von Mises'
                        ? 'σ_vm = √(σ_b² + 3τ²)'
                        : 'σ_equiv = 2τ_max = √(σ_b² + 4τ²)'}
                    </div>
                    <div className="text-[#64708A] mt-1 text-[11px]">
                      = √(({bending.result.bendingStressMPa.toFixed(1)})² + {criterion === 'Von Mises' ? '3' : '4'} × ({torsion.result.shearStressMPa.toFixed(1)})²)
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#64708A] bg-[#F8FAFC] dark:bg-[#1A2234] p-3 rounded-[8px] border border-[#D9DFED] dark:border-[#28344E]">
                    <div>Principal σ₁: <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{combined.result.principalStress1MPa.toFixed(1)} MPa</span></div>
                    <div>Principal σ₂: <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{combined.result.principalStress2MPa.toFixed(1)} MPa</span></div>
                    <div>Max Shear (τ_max): <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{combined.result.maxShearStressMPa.toFixed(1)} MPa</span></div>
                    <div>Design FoS: <span className="text-[#39866B] font-bold">{combined.result.factorOfSafety.toFixed(2)}x</span></div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-end pt-3 border-t border-[#D9DFED] dark:border-[#28344E]">
                <button
                  onClick={() => setSelectedCalcForModal(combined)}
                  className="text-xs font-semibold text-[#7653C9] hover:underline flex items-center gap-1 transition-colors"
                >
                  <Info size={12} /> Mohr's Circle & Failure Envelope
                </button>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <div className="text-[10px] font-mono text-[#64708A] uppercase font-bold">Equivalent Stress</div>
                    <div className="text-xl font-bold font-mono text-[#172033] dark:text-[#FFFFFF]">
                      {combined.result.equivalentStressMPa.toFixed(1)} <span className="text-xs text-[#64708A] font-normal">MPa</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-[#64708A] uppercase font-bold">Factor of Safety</div>
                    <div className={`text-xl font-bold font-mono ${combined.result.factorOfSafety >= targetFoS ? 'text-[#39866B]' : 'text-[#C4515C]'}`}>
                      {combined.result.factorOfSafety.toFixed(2)}x <span className="text-xs text-[#64708A] font-normal">/ {targetFoS.toFixed(1)}x</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Shaft Deflection */}
            <div className="bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] border-l-4 border-l-[#C78B3B] rounded-[10px] p-4 flex flex-col justify-between shadow-panel">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-[#FFF7ED] dark:bg-[#C78B3B]/20 rounded-[8px] text-[#C78B3B]">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider">{deflection.name}</h2>
                      <div className="text-[11px] font-mono text-[#64708A]">{deflection.model}</div>
                    </div>
                  </div>
                  {renderStatusBadge(deflection.status)}
                </div>

                <div className="font-mono bg-[#F8FAFC] dark:bg-[#1A2234] p-3 rounded-[8px] mb-3 text-[#172033] dark:text-[#FFFFFF] border border-[#D9DFED] dark:border-[#28344E] text-xs">
                  <div className="text-[#64708A] text-[10px] uppercase font-bold mb-1">Governing Equation</div>
                  <div className="text-[#C78B3B] font-bold text-xs">δ_max = FL³ / (48EI)</div>
                  <div className="text-[#64708A] mt-1 text-[11px]">
                    where I = πd⁴ / 64 = {((Math.PI * Math.pow(d, 4)) / 64).toFixed(0)} mm⁴
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#64708A] mb-3 bg-[#F8FAFC] dark:bg-[#1A2234] p-3 rounded-[8px] border border-[#D9DFED] dark:border-[#28344E]">
                  <div>Elastic Modulus (E): <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{elasticModulus} GPa</span></div>
                  <div>Allowable Limit: <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{deflection.result.allowableDeflectionMm?.toFixed(3)} mm</span></div>
                  <div>Support Slope (θ): <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{(deflection.result.slopeAtSupportsRad * 1000).toFixed(2)} mrad</span></div>
                  <div>Slenderness (L/d): <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{(L / d).toFixed(1)}</span></div>
                </div>
              </div>

              <div className="flex justify-between items-end pt-3 border-t border-[#D9DFED] dark:border-[#28344E]">
                <button
                  onClick={() => setSelectedCalcForModal(deflection)}
                  className="text-xs font-semibold text-[#C78B3B] hover:underline flex items-center gap-1 transition-colors"
                >
                  <Info size={12} /> Derivation Steps
                </button>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-[#64708A] uppercase font-bold">Midspan Deflection (δ)</div>
                  <div className="text-xl font-bold font-mono text-[#172033] dark:text-[#FFFFFF]">
                    {deflection.result.maxDeflectionMm.toFixed(4)} <span className="text-xs text-[#64708A] font-normal">mm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5: Power Transmission */}
            <div className="bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] border-l-4 border-l-[#39866B] rounded-[10px] p-4 flex flex-col justify-between shadow-panel">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-[#F0FDF4] dark:bg-[#39866B]/20 rounded-[8px] text-[#39866B]">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider">{power.name}</h2>
                      <div className="text-[11px] font-mono text-[#64708A]">{power.model}</div>
                    </div>
                  </div>
                  {renderStatusBadge(power.status)}
                </div>

                <div className="font-mono bg-[#F8FAFC] dark:bg-[#1A2234] p-3 rounded-[8px] mb-3 text-[#172033] dark:text-[#FFFFFF] border border-[#D9DFED] dark:border-[#28344E] text-xs">
                  <div className="text-[#64708A] text-[10px] uppercase font-bold mb-1">Governing Equation</div>
                  <div className="text-[#39866B] font-bold text-xs">P = T · ω = T · (2πn / 60)</div>
                  <div className="text-[#64708A] mt-1 text-[11px]">
                    = {T} N·m × (2π × {n} RPM / 60)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#64708A] mb-3 bg-[#F8FAFC] dark:bg-[#1A2234] p-3 rounded-[8px] border border-[#D9DFED] dark:border-[#28344E]">
                  <div>Torque (T): <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{T} N·m</span></div>
                  <div>Speed (n): <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{n} RPM</span></div>
                  <div>Angular Vel (ω): <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{power.result.angularVelocityRadS.toFixed(2)} rad/s</span></div>
                  <div>Horsepower: <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{power.result.powerHp.toFixed(2)} hp</span></div>
                </div>
              </div>

              <div className="flex justify-between items-end pt-3 border-t border-[#D9DFED] dark:border-[#28344E]">
                <button
                  onClick={() => setSelectedCalcForModal(power)}
                  className="text-xs font-semibold text-[#39866B] hover:underline flex items-center gap-1 transition-colors"
                >
                  <Info size={12} /> Derivation Steps
                </button>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-[#64708A] uppercase font-bold">Transmitted Power (P)</div>
                  <div className="text-xl font-bold font-mono text-[#172033] dark:text-[#FFFFFF]">
                    {power.result.powerKW.toFixed(2)} <span className="text-xs text-[#64708A] font-normal">kW</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Standards Disclaimer */}
          <div className="px-4 py-3 bg-[#FFFFFF] dark:bg-[#172033] rounded-[8px] border border-[#D9DFED] dark:border-[#28344E] flex items-center justify-between text-xs text-[#64708A] font-mono shadow-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#315EDE] shrink-0" />
              <span>{torsion.disclaimer}</span>
            </div>
            <button
              onClick={() => setCalculationsTab('standards')}
              className="text-[#315EDE] hover:underline flex items-center gap-1 transition-colors cursor-pointer font-bold"
              title="Inspect verified equations and traceable engineering standards registry"
            >
              <span>Classical Solid Mechanics Core • Standards Registry (8) →</span>
            </button>
          </div>
        </>
      )}

      {/* Transparent Derivation Modal */}
      {selectedCalcForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-[#FFFFFF] dark:bg-[#172033] border border-[#D9DFED] dark:border-[#28344E] rounded-[12px] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-[#D9DFED] dark:border-[#28344E] flex items-center justify-between bg-[#F8FAFC] dark:bg-[#1E2436]">
              <div className="flex items-center gap-2">
                <Info className="text-[#315EDE] w-4 h-4" />
                <h3 className="text-xs font-bold text-[#172033] dark:text-[#FFFFFF] uppercase tracking-wider">
                  Mathematical Derivation: {selectedCalcForModal.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCalcForModal(null)}
                className="p-1.5 text-[#64708A] hover:text-[#172033] dark:hover:text-[#FFFFFF] rounded-[6px] hover:bg-[#E9EDF7] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
              {/* Formula */}
              <div className="bg-[#F8FAFC] dark:bg-[#1A2234] p-3.5 rounded-[8px] border border-[#D9DFED] dark:border-[#28344E]">
                <div className="text-[#64708A] text-[10px] uppercase font-bold tracking-wider mb-1">Physical Model</div>
                <div className="text-[#172033] dark:text-[#FFFFFF] font-bold mb-2">{selectedCalcForModal.model}</div>

                <div className="text-[#64708A] text-[10px] uppercase font-bold tracking-wider mb-1">Governing Equation</div>
                <div className="text-[#315EDE] text-xs bg-[#FFFFFF] dark:bg-[#172033] p-2.5 rounded-[6px] border border-[#D9DFED] dark:border-[#28344E] font-bold">
                  {selectedCalcForModal.formula}
                </div>
              </div>

              {/* SI Inputs */}
              <div>
                <h4 className="text-[#64708A] text-[10px] uppercase font-bold tracking-wider mb-1.5">Normalized SI Parameters</h4>
                <div className="grid grid-cols-2 gap-2 bg-[#F8FAFC] dark:bg-[#1A2234] p-3 rounded-[8px] border border-[#D9DFED] dark:border-[#28344E]">
                  {Object.entries(selectedCalcForModal.normalizedInputsSI).map(([key, val]) => (
                    <div key={key} className="flex justify-between border-b border-[#D9DFED] dark:border-[#28344E] pb-1 text-[11px]">
                      <span className="text-[#64708A]">{key}:</span>
                      <span className="text-[#172033] dark:text-[#FFFFFF] font-semibold">{Number(val).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assumptions */}
              <div>
                <h4 className="text-[#64708A] text-[10px] uppercase font-bold tracking-wider mb-1.5">Governing Engineering Assumptions</h4>
                <ul className="space-y-1 text-[#64708A] list-disc list-inside bg-[#F8FAFC] dark:bg-[#1A2234] p-3 rounded-[8px] border border-[#D9DFED] dark:border-[#28344E] text-[11px]">
                  {selectedCalcForModal.assumptions.map((asm, idx) => (
                    <li key={idx}>{asm}</li>
                  ))}
                </ul>
              </div>

              {/* Warnings */}
              {selectedCalcForModal.warnings.length > 0 && (
                <div>
                  <h4 className="text-[#C78B3B] text-[10px] uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1">
                    <AlertTriangle size={13} /> Engineering Advisory
                  </h4>
                  <ul className="space-y-1 text-[#C78B3B] list-disc list-inside bg-[#C78B3B]/10 border border-[#C78B3B]/30 p-3 rounded-[8px] text-[11px]">
                    {selectedCalcForModal.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-[#D9DFED] dark:border-[#28344E] bg-[#F8FAFC] dark:bg-[#1E2436] flex justify-end">
              <button
                onClick={() => setSelectedCalcForModal(null)}
                className="btn-secondary text-xs py-1.5 px-4 font-semibold"
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
