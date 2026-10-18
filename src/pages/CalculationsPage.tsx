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
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30">
          <CheckCircle2 size={11} /> PASS
        </span>
      );
    }
    if (status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] bg-[#E7B65C]/15 text-[#E7B65C] border border-[#E7B65C]/30">
          <AlertTriangle size={11} /> MARGINAL
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] bg-[#E16D72]/15 text-[#E16D72] border border-[#E16D72]/30">
        <XCircle size={11} /> FAIL
      </span>
    );
  };

  return (
    <div className="p-5 lg:p-6 h-full overflow-y-auto animate-fade-in font-sans bg-[#111315] space-y-5">
      {/* CAD Station Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#34393F]">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[#64D6C5] mb-0.5">
            Mechanics of Materials Kernel
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#F0F1F2]">
            Engineering Calculations & Analytical Derivations
          </h1>
          <p className="text-xs text-[#969DA5] font-mono mt-0.5">
            Live closed-form mechanical equations evaluated from active CAD telemetry.
          </p>
        </div>

        {/* View & Criterion Switcher */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          {/* Sub-view Tab Selector */}
          <div className="flex items-center bg-[#191C1F] p-1 rounded-[4px] border border-[#34393F]">
            <button
              onClick={() => setCalculationsTab('equations')}
              className={`px-3 py-1 text-xs font-mono rounded-[3px] flex items-center gap-1.5 transition-colors ${
                calculationsTab === 'equations'
                  ? 'bg-[#22262A] text-[#64D6C5] font-bold border border-[#34393F]'
                  : 'text-[#969DA5] hover:text-[#F0F1F2]'
              }`}
            >
              <Activity size={12} />
              <span>Equations (5)</span>
            </button>
            <button
              onClick={() => setCalculationsTab('standards')}
              className={`px-3 py-1 text-xs font-mono rounded-[3px] flex items-center gap-1.5 transition-colors ${
                calculationsTab === 'standards'
                  ? 'bg-[#22262A] text-[#64D6C5] font-bold border border-[#34393F]'
                  : 'text-[#969DA5] hover:text-[#F0F1F2]'
              }`}
            >
              <BookOpen size={12} />
              <span>Standards Registry (8)</span>
            </button>
          </div>

          {calculationsTab === 'equations' && (
            <div className="flex items-center gap-1.5 bg-[#191C1F] p-1 rounded-[4px] border border-[#34393F]">
              <span className="text-[10px] font-mono text-[#969DA5] px-1.5 flex items-center gap-1">
                <Scale size={11} className="text-[#64D6C5]" />
              </span>
              <button
                onClick={() => setCriterion('Von Mises')}
                className={`px-2 py-1 text-[11px] font-mono rounded-[3px] transition-colors ${
                  criterion === 'Von Mises'
                    ? 'bg-[#22262A] text-[#64D6C5] font-bold border border-[#34393F]'
                    : 'text-[#969DA5] hover:text-[#F0F1F2]'
                }`}
              >
                Von Mises
              </button>
              <button
                onClick={() => setCriterion('Tresca')}
                className={`px-2 py-1 text-[11px] font-mono rounded-[3px] transition-colors ${
                  criterion === 'Tresca'
                    ? 'bg-[#22262A] text-[#64D6C5] font-bold border border-[#34393F]'
                    : 'text-[#969DA5] hover:text-[#F0F1F2]'
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Card 1: Shaft Torsion */}
        <div className="bg-[#191C1F] border border-[#34393F] border-l-2 border-l-[#64D6C5] rounded-[4px] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#22262A] rounded-[3px] text-[#64D6C5] border border-[#34393F]">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">{torsion.name}</h2>
                  <div className="text-[10px] font-mono text-[#969DA5]">{torsion.model}</div>
                </div>
              </div>
              {renderStatusBadge(torsion.status)}
            </div>

            <div className="font-mono bg-[#14171A] p-2.5 rounded-[3px] mb-3 text-gray-300 border border-[#2A2E35] text-xs">
              <div className="text-[#969DA5] text-[10px] mb-0.5">Governing Equation</div>
              <div className="text-[#64D6C5] font-bold text-xs">τ = 16T / (πd³)</div>
              <div className="text-[#969DA5] mt-1 text-[11px]">
                = (16 × {T} N·m) / (π × ({d} mm)³)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-[#969DA5] mb-3 bg-[#14171A] p-2.5 rounded-[3px] border border-[#2A2E35]">
              <div>Torque (T): <span className="text-[#F0F1F2] font-semibold">{T} N·m</span></div>
              <div>Diameter (d): <span className="text-[#F0F1F2] font-semibold">{d} mm</span></div>
              <div>Polar J: <span className="text-[#F0F1F2] font-semibold">{(torsion.result.polarMomentOfInertiaMm4).toExponential(2)} mm⁴</span></div>
              <div>Allowable τ: <span className="text-[#F0F1F2] font-semibold">{torsion.result.allowableShearStressMPa?.toFixed(1)} MPa</span></div>
            </div>
          </div>

          <div className="flex justify-between items-end pt-2.5 border-t border-[#2A2E35]">
            <button
              onClick={() => setSelectedCalcForModal(torsion)}
              className="text-[11px] font-mono text-[#64D6C5] hover:underline flex items-center gap-1 transition-colors"
            >
              <Info size={11} /> Derivation Steps
            </button>
            <div className="text-right">
              <div className="text-[10px] font-mono text-[#969DA5]">Torsional Shear (τ)</div>
              <div className="text-xl font-bold font-mono text-[#F0F1F2]">
                {torsion.result.shearStressMPa.toFixed(2)} <span className="text-[10px] text-[#969DA5] font-normal">MPa</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Bending Stress */}
        <div className="bg-[#191C1F] border border-[#34393F] border-l-2 border-l-sky-400 rounded-[4px] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#22262A] rounded-[3px] text-sky-400 border border-[#34393F]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">{bending.name}</h2>
                  <div className="text-[10px] font-mono text-[#969DA5]">{bending.model}</div>
                </div>
              </div>
              {renderStatusBadge(bending.status)}
            </div>

            <div className="font-mono bg-[#14171A] p-2.5 rounded-[3px] mb-3 text-gray-300 border border-[#2A2E35] text-xs">
              <div className="text-[#969DA5] text-[10px] mb-0.5">Governing Equation</div>
              <div className="text-sky-300 font-bold text-xs">σ_b = 32M / (πd³)</div>
              <div className="text-[#969DA5] mt-1 text-[11px]">
                where M = F·L / 4 = ({F} N × {L} mm) / 4 = {bending.result.bendingMomentNm.toFixed(1)} N·m
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-[#969DA5] mb-3 bg-[#14171A] p-2.5 rounded-[3px] border border-[#2A2E35]">
              <div>Radial Load (F): <span className="text-[#F0F1F2] font-semibold">{F} N</span></div>
              <div>Span (L): <span className="text-[#F0F1F2] font-semibold">{L} mm</span></div>
              <div>Bending Moment (M): <span className="text-[#F0F1F2] font-semibold">{bending.result.bendingMomentNm.toFixed(1)} N·m</span></div>
              <div>Section Modulus (Z): <span className="text-[#F0F1F2] font-semibold">{bending.result.sectionModulusMm3.toFixed(0)} mm³</span></div>
            </div>
          </div>

          <div className="flex justify-between items-end pt-2.5 border-t border-[#2A2E35]">
            <button
              onClick={() => setSelectedCalcForModal(bending)}
              className="text-[11px] font-mono text-sky-400 hover:underline flex items-center gap-1 transition-colors"
            >
              <Info size={11} /> Derivation Steps
            </button>
            <div className="text-right">
              <div className="text-[10px] font-mono text-[#969DA5]">Bending Stress (σ_b)</div>
              <div className="text-xl font-bold font-mono text-[#F0F1F2]">
                {bending.result.bendingStressMPa.toFixed(2)} <span className="text-[10px] text-[#969DA5] font-normal">MPa</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Combined Multiaxial Stress */}
        <div className="bg-[#191C1F] border border-[#34393F] border-l-2 border-l-purple-400 rounded-[4px] p-4 flex flex-col justify-between xl:col-span-2">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#22262A] rounded-[3px] text-purple-400 border border-[#34393F]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">{combined.name}</h2>
                  <div className="text-[10px] font-mono text-[#969DA5]">{combined.model}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#969DA5] bg-[#22262A] px-2 py-0.5 rounded-[2px] border border-[#34393F]">
                  {criterion} Formulation
                </span>
                {renderStatusBadge(combined.status)}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div className="font-mono bg-[#14171A] p-2.5 rounded-[3px] text-gray-300 border border-[#2A2E35] text-xs">
                <div className="text-[#969DA5] text-[10px] mb-0.5">Multiaxial Yield Criterion</div>
                <div className="text-purple-300 font-bold text-xs">
                  {criterion === 'Von Mises'
                    ? 'σ_vm = √(σ_b² + 3τ²)'
                    : 'σ_equiv = 2τ_max = √(σ_b² + 4τ²)'}
                </div>
                <div className="text-[#969DA5] mt-1 text-[11px]">
                  = √(({bending.result.bendingStressMPa.toFixed(1)})² + {criterion === 'Von Mises' ? '3' : '4'} × ({torsion.result.shearStressMPa.toFixed(1)})²)
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-[#969DA5] bg-[#14171A] p-2.5 rounded-[3px] border border-[#2A2E35]">
                <div>Principal σ₁: <span className="text-[#F0F1F2] font-semibold">{combined.result.principalStress1MPa.toFixed(1)} MPa</span></div>
                <div>Principal σ₂: <span className="text-[#F0F1F2] font-semibold">{combined.result.principalStress2MPa.toFixed(1)} MPa</span></div>
                <div>Max Shear (τ_max): <span className="text-[#F0F1F2] font-semibold">{combined.result.maxShearStressMPa.toFixed(1)} MPa</span></div>
                <div>Design FoS: <span className="text-[#64D6C5] font-bold">{combined.result.factorOfSafety.toFixed(2)}x</span></div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end pt-2.5 border-t border-[#2A2E35]">
            <button
              onClick={() => setSelectedCalcForModal(combined)}
              className="text-[11px] font-mono text-purple-400 hover:underline flex items-center gap-1 transition-colors"
            >
              <Info size={11} /> Mohr's Circle & Failure Envelope
            </button>
            <div className="flex items-center gap-6 text-right">
              <div>
                <div className="text-[10px] font-mono text-[#969DA5]">Equivalent Stress</div>
                <div className="text-xl font-bold font-mono text-[#F0F1F2]">
                  {combined.result.equivalentStressMPa.toFixed(1)} <span className="text-[10px] text-[#969DA5] font-normal">MPa</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-[#969DA5]">Factor of Safety</div>
                <div className={`text-xl font-bold font-mono ${combined.result.factorOfSafety >= targetFoS ? 'text-[#34D399]' : 'text-[#E16D72]'}`}>
                  {combined.result.factorOfSafety.toFixed(2)}x <span className="text-[10px] text-[#969DA5] font-normal">/ {targetFoS.toFixed(1)}x</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Shaft Deflection */}
        <div className="bg-[#191C1F] border border-[#34393F] border-l-2 border-l-[#E7B65C] rounded-[4px] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#22262A] rounded-[3px] text-[#E7B65C] border border-[#34393F]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">{deflection.name}</h2>
                  <div className="text-[10px] font-mono text-[#969DA5]">{deflection.model}</div>
                </div>
              </div>
              {renderStatusBadge(deflection.status)}
            </div>

            <div className="font-mono bg-[#14171A] p-2.5 rounded-[3px] mb-3 text-gray-300 border border-[#2A2E35] text-xs">
              <div className="text-[#969DA5] text-[10px] mb-0.5">Governing Equation</div>
              <div className="text-[#E7B65C] font-bold text-xs">δ_max = FL³ / (48EI)</div>
              <div className="text-[#969DA5] mt-1 text-[11px]">
                where I = πd⁴ / 64 = {((Math.PI * Math.pow(d, 4)) / 64).toFixed(0)} mm⁴
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-[#969DA5] mb-3 bg-[#14171A] p-2.5 rounded-[3px] border border-[#2A2E35]">
              <div>Elastic Modulus (E): <span className="text-[#F0F1F2] font-semibold">{elasticModulus} GPa</span></div>
              <div>Allowable Limit: <span className="text-[#F0F1F2] font-semibold">{deflection.result.allowableDeflectionMm?.toFixed(3)} mm</span></div>
              <div>Support Slope (θ): <span className="text-[#F0F1F2] font-semibold">{(deflection.result.slopeAtSupportsRad * 1000).toFixed(2)} mrad</span></div>
              <div>Slenderness (L/d): <span className="text-[#F0F1F2] font-semibold">{(L / d).toFixed(1)}</span></div>
            </div>
          </div>

          <div className="flex justify-between items-end pt-2.5 border-t border-[#2A2E35]">
            <button
              onClick={() => setSelectedCalcForModal(deflection)}
              className="text-[11px] font-mono text-[#E7B65C] hover:underline flex items-center gap-1 transition-colors"
            >
              <Info size={11} /> Derivation Steps
            </button>
            <div className="text-right">
              <div className="text-[10px] font-mono text-[#969DA5]">Midspan Deflection (δ)</div>
              <div className="text-xl font-bold font-mono text-[#F0F1F2]">
                {deflection.result.maxDeflectionMm.toFixed(4)} <span className="text-[10px] text-[#969DA5] font-normal">mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 5: Power Transmission */}
        <div className="bg-[#191C1F] border border-[#34393F] border-l-2 border-l-[#34D399] rounded-[4px] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#22262A] rounded-[3px] text-[#34D399] border border-[#34393F]">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">{power.name}</h2>
                  <div className="text-[10px] font-mono text-[#969DA5]">{power.model}</div>
                </div>
              </div>
              {renderStatusBadge(power.status)}
            </div>

            <div className="font-mono bg-[#14171A] p-2.5 rounded-[3px] mb-3 text-gray-300 border border-[#2A2E35] text-xs">
              <div className="text-[#969DA5] text-[10px] mb-0.5">Governing Equation</div>
              <div className="text-[#34D399] font-bold text-xs">P = T · ω = T · (2πn / 60)</div>
              <div className="text-[#969DA5] mt-1 text-[11px]">
                = {T} N·m × (2π × {n} RPM / 60)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-[#969DA5] mb-3 bg-[#14171A] p-2.5 rounded-[3px] border border-[#2A2E35]">
              <div>Torque (T): <span className="text-[#F0F1F2] font-semibold">{T} N·m</span></div>
              <div>Speed (n): <span className="text-[#F0F1F2] font-semibold">{n} RPM</span></div>
              <div>Angular Vel (ω): <span className="text-[#F0F1F2] font-semibold">{power.result.angularVelocityRadS.toFixed(2)} rad/s</span></div>
              <div>Horsepower: <span className="text-[#F0F1F2] font-semibold">{power.result.powerHp.toFixed(2)} hp</span></div>
            </div>
          </div>

          <div className="flex justify-between items-end pt-2.5 border-t border-[#2A2E35]">
            <button
              onClick={() => setSelectedCalcForModal(power)}
              className="text-[11px] font-mono text-[#34D399] hover:underline flex items-center gap-1 transition-colors"
            >
              <Info size={11} /> Derivation Steps
            </button>
            <div className="text-right">
              <div className="text-[10px] font-mono text-[#969DA5]">Transmitted Power (P)</div>
              <div className="text-xl font-bold font-mono text-[#F0F1F2]">
                {power.result.powerKW.toFixed(2)} <span className="text-[10px] text-[#969DA5] font-normal">kW</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Standards Disclaimer */}
      <div className="px-3 py-2 bg-[#14171A] rounded-[3px] border border-[#2A2E35] flex items-center justify-between text-[10px] text-[#969DA5] font-mono">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-[#64D6C5] shrink-0" />
          <span>{torsion.disclaimer}</span>
        </div>
        <button
          onClick={() => setCalculationsTab('standards')}
          className="text-[#64D6C5] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
          title="Inspect verified equations and traceable engineering standards registry"
        >
          <span>Classical Solid Mechanics Core • Standards Registry (8) →</span>
        </button>
      </div>
    </>
  )}

      {/* Transparent Derivation Modal */}
      {selectedCalcForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 py-2.5 border-b border-[#34393F] flex items-center justify-between bg-[#22262A]">
              <div className="flex items-center gap-2">
                <Info className="text-[#64D6C5] w-4 h-4" />
                <h3 className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">
                  Mathematical Derivation: {selectedCalcForModal.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCalcForModal(null)}
                className="p-1 text-[#969DA5] hover:text-white rounded-[3px] hover:bg-[#2E3339] transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto space-y-3.5 text-xs font-mono">
              {/* Formula */}
              <div className="bg-[#14171A] p-3 rounded-[3px] border border-[#2A2E35]">
                <div className="text-[#969DA5] text-[10px] uppercase tracking-wider mb-0.5">Physical Model</div>
                <div className="text-[#F0F1F2] font-semibold mb-2">{selectedCalcForModal.model}</div>

                <div className="text-[#969DA5] text-[10px] uppercase tracking-wider mb-0.5">Governing Equation</div>
                <div className="text-[#64D6C5] text-xs bg-[#22262A] p-2 rounded-[2px] border border-[#34393F]">
                  {selectedCalcForModal.formula}
                </div>
              </div>

              {/* SI Inputs */}
              <div>
                <h4 className="text-[#969DA5] text-[10px] uppercase tracking-wider mb-1.5">Normalized SI Parameters</h4>
                <div className="grid grid-cols-2 gap-1.5 bg-[#14171A] p-2.5 rounded-[3px] border border-[#2A2E35]">
                  {Object.entries(selectedCalcForModal.normalizedInputsSI).map(([key, val]) => (
                    <div key={key} className="flex justify-between border-b border-[#2A2E35] pb-0.5 text-[11px]">
                      <span className="text-[#969DA5]">{key}:</span>
                      <span className="text-[#F0F1F2] font-semibold">{Number(val).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assumptions */}
              <div>
                <h4 className="text-[#969DA5] text-[10px] uppercase tracking-wider mb-1.5">Governing Engineering Assumptions</h4>
                <ul className="space-y-0.5 text-[#969DA5] list-disc list-inside bg-[#14171A] p-2.5 rounded-[3px] border border-[#2A2E35] text-[11px]">
                  {selectedCalcForModal.assumptions.map((asm, idx) => (
                    <li key={idx}>{asm}</li>
                  ))}
                </ul>
              </div>

              {/* Warnings */}
              {selectedCalcForModal.warnings.length > 0 && (
                <div>
                  <h4 className="text-[#E7B65C] text-[10px] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <AlertTriangle size={12} /> Engineering Advisory
                  </h4>
                  <ul className="space-y-0.5 text-[#E7B65C] list-disc list-inside bg-[#E7B65C]/10 border border-[#E7B65C]/30 p-2.5 rounded-[3px] text-[11px]">
                    {selectedCalcForModal.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2 border-t border-[#34393F] bg-[#22262A] flex justify-end">
              <button
                onClick={() => setSelectedCalcForModal(null)}
                className="bg-[#14171A] hover:bg-[#2A2E35] text-[#F0F1F2] border border-[#34393F] text-xs font-mono py-1 px-3 rounded-[3px] transition-colors"
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
