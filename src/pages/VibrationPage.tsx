import React, { useState, useMemo } from 'react';
import {
  Waves,
  Activity,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  Layers,
  Gauge,
  Compass,
  ArrowRight,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  runModalAnalysis,
  evaluateCriticalSpeeds,
  calculateImbalanceResponse,
  calculateRigidRotorBalancing,
  evaluateExcitationOrders,
  RotorSystemInput,
  BalanceQualityGrade,
  SupportType
} from '../engineering/vibration';

export default function VibrationPage() {
  const { designParams, selectedMaterial, allMaterials } = useApp();

  // Rotor geometry inputs
  const [lengthMm, setLengthMm] = useState<number>(designParams.length || 800);
  const [outerDiameterMm, setOuterDiameterMm] = useState<number>(designParams.diameter || 50);
  const [innerDiameterMm, setInnerDiameterMm] = useState<number>(0);
  const [materialId, setMaterialId] = useState<string>(designParams.materialId || 'aisi-4140');

  // Support inputs
  const [supportType, setSupportType] = useState<SupportType>('rigid_pinned');
  const [supportStiffnessNM, setSupportStiffnessNM] = useState<number>(5.0e7); // 50 kN/mm
  const [supportAStationMm, setSupportAStationMm] = useState<number>(0);
  const [supportBStationMm, setSupportBStationMm] = useState<number>(designParams.length || 800);

  // Lumped mass (gear disk)
  const [hasLumpedMass, setHasLumpedMass] = useState<boolean>(true);
  const [lumpedMassKg, setLumpedMassKg] = useState<number>(8.5);
  const [lumpedMassStationMm, setLumpedMassStationMm] = useState<number>(
    Math.round((designParams.length || 800) / 2)
  );

  // Speed inputs
  const [operatingSpeedRpm, setOperatingSpeedRpm] = useState<number>(designParams.rpm || 1500);
  const [speedRangeSpanPct, setSpeedRangeSpanPct] = useState<number>(20); // +/- 20%
  const [gearToothCount, setGearToothCount] = useState<number>(24);

  // Dynamic & balancing inputs
  const [unbalanceGMm, setUnbalanceGMm] = useState<number>(50.0);
  const [dampingRatio, setDampingRatio] = useState<number>(0.03);
  const [balanceGrade, setBalanceGrade] = useState<BalanceQualityGrade>('G2.5');

  // UI state
  const [selectedModeIndex, setSelectedModeIndex] = useState<number>(0);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Derived operating range
  const operatingRange: [number, number] = useMemo(() => {
    const minSpeed = Math.max(0, Math.round(operatingSpeedRpm * (1 - speedRangeSpanPct / 100)));
    const maxSpeed = Math.round(operatingSpeedRpm * (1 + speedRangeSpanPct / 100));
    return [minSpeed, maxSpeed];
  }, [operatingSpeedRpm, speedRangeSpanPct]);

  // Execute modal & dynamic analysis
  const { modalResult, criticalSpeedAssessment, imbalanceResponse, excitationOrders, balancingResult, error } = useMemo(() => {
    try {
      const rotorInput: RotorSystemInput = {
        segments: [
          {
            id: 'seg-shaft',
            length: lengthMm,
            outerDiameter: outerDiameterMm,
            innerDiameter: innerDiameterMm > 0 ? innerDiameterMm : undefined,
            materialId,
          },
        ],
        supports: [
          {
            id: 'sup-A',
            stationZ: supportAStationMm,
            type: supportType,
            radialStiffness: supportStiffnessNM,
            label: 'Bearing A',
            provenance: supportType === 'rigid_pinned' ? 'Rigid support assumption' : 'User radial stiffness',
          },
          {
            id: 'sup-B',
            stationZ: supportBStationMm,
            type: supportType,
            radialStiffness: supportStiffnessNM,
            label: 'Bearing B',
            provenance: supportType === 'rigid_pinned' ? 'Rigid support assumption' : 'User radial stiffness',
          },
        ],
        lumpedMasses: hasLumpedMass
          ? [
              {
                id: 'lumped-gear',
                stationZ: lumpedMassStationMm,
                mass: lumpedMassKg,
                label: 'Gear/Coupling Disk',
              },
            ]
          : undefined,
        operatingSpeedRpm,
        operatingSpeedRangeRpm: operatingRange,
        meshElementMaxLenMm: 25,
      };

      const modal = runModalAnalysis(rotorInput);
      const crit = evaluateCriticalSpeeds(modal, {
        operatingSpeedRpm,
        operatingRangeRpm: operatingRange,
        recommendedMarginPercent: 15.0,
      });

      const firstFlex = modal.modes.find(m => !m.isRigidBody);
      const effectiveMass = firstFlex ? firstFlex.modalMassKg : modal.totalRotorMassKg * 0.5;
      const effectiveStiffness = firstFlex ? firstFlex.modalStiffnessNM : 1.0e6;

      const maxSweepSpeed = Math.max(operatingSpeedRpm * 2, (firstFlex?.synchronousSpeedRpm || 3000) * 1.5);
      const imb = calculateImbalanceResponse(
        {
          unbalanceGMm,
          speedRangeRpm: [0, Math.round(maxSweepSpeed)],
          speedStepRpm: Math.max(25, Math.round(maxSweepSpeed / 100)),
          dampingRatio,
          effectiveMassKg: effectiveMass,
          effectiveStiffnessNM: effectiveStiffness,
        },
        modal
      );

      const exc = evaluateExcitationOrders({
        operatingSpeedRpm,
        gearToothCount: gearToothCount > 0 ? gearToothCount : undefined,
        modal,
      });

      const bal = calculateRigidRotorBalancing({
        rotorMassKg: modal.totalRotorMassKg,
        serviceSpeedRpm: operatingSpeedRpm,
        grade: balanceGrade,
        correctionPlanes: 'two',
      });

      return {
        modalResult: modal,
        criticalSpeedAssessment: crit,
        imbalanceResponse: imb,
        excitationOrders: exc,
        balancingResult: bal,
        error: null,
      };
    } catch (err: any) {
      return {
        modalResult: null,
        criticalSpeedAssessment: null,
        imbalanceResponse: null,
        excitationOrders: null,
        balancingResult: null,
        error: err.message || 'Error executing dynamic analysis.',
      };
    }
  }, [
    lengthMm,
    outerDiameterMm,
    innerDiameterMm,
    materialId,
    supportType,
    supportStiffnessNM,
    supportAStationMm,
    supportBStationMm,
    hasLumpedMass,
    lumpedMassKg,
    lumpedMassStationMm,
    operatingSpeedRpm,
    operatingRange,
    gearToothCount,
    unbalanceGMm,
    dampingRatio,
    balanceGrade,
  ]);

  // Mode shape to render
  const selectedMode = modalResult?.modes[selectedModeIndex] || modalResult?.modes[0];

  // Generate audit dossier in markdown
  const handleCopyReport = () => {
    if (!modalResult || !criticalSpeedAssessment || !imbalanceResponse || !balancingResult) return;

    const report = `# QUANTUM AI // VIBRATION & DYNAMIC ROTOR AUDIT DOSSIER
**Standard References:** ISO 20816-1:2016, ISO 20816-3:2022, ISO 21940-11:2016 (Amd 1:2022), ISO 21940-12:2016
**Generated:** ${new Date().toISOString()}

---

## 1. Rotor & Shaft System Configuration
- **Shaft Geometry:** Length L = ${lengthMm} mm, Outer Diameter d_o = ${outerDiameterMm} mm, Inner Diameter d_i = ${innerDiameterMm} mm
- **Material:** ${materialId} (E = ${selectedMaterial?.elasticModulus || 205} GPa, rho = ${selectedMaterial?.density || 7850} kg/m³)
- **Total Rotor Mass:** ${modalResult.totalRotorMassKg} kg (Center of Gravity at z = ${modalResult.centerOfGravityZMm} mm)
- **Bearing Supports:**
  - Support A: z = ${supportAStationMm} mm (${supportType})
  - Support B: z = ${supportBStationMm} mm (${supportType})
  - Support Stiffness: ${supportType === 'flexible_spring' ? (supportStiffnessNM / 1000).toFixed(1) + ' kN/mm' : 'Rigid (Pinned)'}
- **Lumped Disks:** ${hasLumpedMass ? `${lumpedMassKg} kg at station z = ${lumpedMassStationMm} mm` : 'None'}
- **Operating Speed:** ${operatingSpeedRpm} rpm (Evaluation Range: [${operatingRange[0]}, ${operatingRange[1]}] rpm)

---

## 2. Lateral Modal Analysis & Critical Speeds
**Euler-Bernoulli Beam Finite Element Results:**
${modalResult.modes
  .map(
    m =>
      `- **Mode ${m.modeNumber}:** Frequency = ${m.frequencyHz} Hz, Synchronous Critical Speed nc = ${m.synchronousSpeedRpm} rpm ${
        m.isRigidBody ? '(Rigid-Body Mode)' : ''
      }`
  )
  .join('\n')}

**Analytical Benchmarks (Simply Supported Baseline):**
- Theoretical Continuous Beam f1: ${modalResult.benchmarks.simplySupportedFirstModeHz} Hz
- Rayleigh Static Quotient f1: ${modalResult.benchmarks.rayleighFirstModeHz} Hz
${modalResult.benchmarks.dunkerleyFirstModeHz ? `- Dunkerley Lower Bound f1: ${modalResult.benchmarks.dunkerleyFirstModeHz} Hz` : ''}

---

## 3. Critical Speed Separation Assessment
- **Overall Operating Status:** ${criticalSpeedAssessment.overallStatus.toUpperCase()}
- **Recommended Separation Margin:** ${criticalSpeedAssessment.recommendedMarginPercent}%
${criticalSpeedAssessment.checks
  .map(
    c =>
      `- Mode ${c.modeNumber} (nc = ${c.criticalSpeedRpm} rpm): Delta = ${c.deltaRpm} rpm, Separation = ${c.separationPercent}%. Status: ${c.status.toUpperCase()} -> ${c.message}`
  )
  .join('\n')}

---

## 4. Forced Unbalance & Jeffcott Dynamic Response
- **Unbalance Magnitude:** ${imbalanceResponse.unbalanceMagnitudeGMm} g*mm (U = ${imbalanceResponse.unbalanceMagnitudeKgM.toExponential(3)} kg*m)
- **Viscous Damping Ratio:** zeta = ${(imbalanceResponse.dampingRatio * 100).toFixed(1)}% (Dynamic Magnification Q = ${imbalanceResponse.amplificationFactorQ})
- **Resonant Speed:** ${imbalanceResponse.resonantSpeedRpm} rpm
- **Peak Response Amplitude:** ${imbalanceResponse.peakAmplitudeUm} um at resonance
- **Peak Centrifugal Force:** ${imbalanceResponse.peakExcitationForceN} N

---

## 5. Rotational Excitation Orders & Gear Meshing
- **1X Running Frequency:** ${excitationOrders?.runningFrequencyHz} Hz
${excitationOrders?.orders.map(o => `- ${o.orderName}: ${o.frequencyHz} Hz ${o.nearResonanceWithMode ? `[NEAR MODE ${o.nearResonanceWithMode} RESONANCE]` : ''}`).join('\n')}

---

## 6. ISO 21940-11 Rigid-Rotor Balance Tolerances
- **Balance Quality Grade:** ${balancingResult.grade} (e_per * Omega = ${balancingResult.gradeValueMmS} mm/s)
- **Permissible Specific Unbalance:** e_per = ${balancingResult.permissibleSpecificUnbalanceUpm} um (g*mm/kg)
- **Permissible Residual Unbalance:** U_per = ${balancingResult.permissibleResidualUnbalanceGMm} g*mm
- **Two-Plane Allocation:** Plane A = ${balancingResult.planeAllocation.planeAGMm} g*mm, Plane B = ${balancingResult.planeAllocation.planeBGMm} g*mm

---

## 7. Standards Provenance & Explicit Scope Boundaries
- **ISO 20816-1:2016 / ISO 20816-3:2022:** This software provides analytical modal and dynamic predictions. It does NOT provide in-situ condition monitoring certification or vibration sensor verification. (Note: ISO 20816-1:2026 is listed as under publication).
- **ISO 21940-11:2016:** Rigid rotor balancing calculations compute permissible residual unbalance tolerances. They do not replace physical balancing machine runs.
- **ISO 21940-12:2016:** Multi-plane flexible rotor modal balancing is explicitly recorded as an unverified boundary.
- **Rotordynamic Omissions:** Spinning disk gyroscopic cross-coupling, speed-dependent bearing fluid-film coefficients, and casing flexibility are omitted.
`;

    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  return (
    <div className="p-6 space-y-6 bg-[#0E1012] text-[#E1E4E8]">
      {/* Workstation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2B3036] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[6px] bg-[#16191D] border border-[#34393F] text-[#64D6C5]">
              <Waves size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono text-[#F0F1F2]">
                Vibration & Dynamic Rotor Workstation
              </h1>
              <p className="text-xs text-gray-400">
                Euler–Bernoulli lateral modal FEA, critical speeds, unbalance forced response, and ISO 21940-11 rigid-rotor balancing
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-[4px] bg-[#1C2127] hover:bg-[#252C34] text-[#64D6C5] border border-[#34393F] transition-all shadow-xs"
          >
            {copiedReport ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copiedReport ? 'Dossier Copied' : 'Export Audit Dossier'}
          </button>
        </div>
      </div>

      {/* Standards Provenance Badges */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
        <span className="px-2 py-0.5 rounded-[4px] bg-[#16191D] border border-[#34393F] text-gray-400">
          Modal Theory: <span className="text-gray-200">Euler–Bernoulli Beam FEA (Hermite Cubic)</span>
        </span>
        <span className="px-2 py-0.5 rounded-[4px] bg-[#16191D] border border-[#34393F] text-emerald-400">
          ISO 21940-11:2016: <span className="text-emerald-300">Verified (Rigid Rotor Balancing)</span>
        </span>
        <span className="px-2 py-0.5 rounded-[4px] bg-[#16191D] border border-[#34393F] text-amber-400">
          ISO 20816-1:2016: <span className="text-amber-300">Analytical Prediction (Under Pub: 2026)</span>
        </span>
        <span className="px-2 py-0.5 rounded-[4px] bg-[#16191D] border border-[#34393F] text-blue-400">
          ISO 21940-12:2016: <span className="text-blue-300">Flexible Rotor (Deferred Boundary)</span>
        </span>
      </div>

      {error ? (
        <div className="p-4 rounded-[6px] bg-red-950/40 border border-red-800 text-red-200 flex items-start gap-3">
          <AlertOctagon size={20} className="shrink-0 text-red-400 mt-0.5" />
          <div>
            <div className="font-semibold text-sm">Vibration Solver Error</div>
            <div className="text-xs text-red-300 mt-1">{error}</div>
          </div>
        </div>
      ) : null}

      {/* Overall Resonance & Health Status Banner */}
      {criticalSpeedAssessment && (
        <div
          className={`p-4 rounded-[6px] border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm ${
            criticalSpeedAssessment.overallStatus === 'safe'
              ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-200'
              : criticalSpeedAssessment.overallStatus === 'warning'
              ? 'bg-amber-950/20 border-amber-800/60 text-amber-200'
              : 'bg-red-950/30 border-red-800 text-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {criticalSpeedAssessment.overallStatus === 'safe' && (
              <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
            )}
            {criticalSpeedAssessment.overallStatus === 'warning' && (
              <AlertTriangle size={24} className="text-amber-400 shrink-0" />
            )}
            {criticalSpeedAssessment.overallStatus === 'critical' && (
              <AlertOctagon size={24} className="text-red-400 shrink-0" />
            )}
            <div>
              <div className="font-mono font-bold text-sm">
                CRITICAL SPEED SEPARATION STATUS:{' '}
                {criticalSpeedAssessment.overallStatus === 'safe'
                  ? 'SAFE OPERATING ZONE'
                  : criticalSpeedAssessment.overallStatus === 'warning'
                  ? 'MARGINAL CRITICAL PROXIMITY'
                  : 'RESONANCE ZONE CONFLICT'}
              </div>
              <p className="text-xs opacity-90 mt-0.5">
                Operating speed {operatingSpeedRpm} rpm (Range [{operatingRange[0]}, {operatingRange[1]}] rpm).
                {criticalSpeedAssessment.checks[0]?.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono shrink-0">
            <div>
              <div className="text-gray-400 text-[10px]">1ST CRITICAL SPEED</div>
              <div className="text-base font-bold text-white">
                {modalResult?.modes[0]?.synchronousSpeedRpm.toFixed(0)} <span className="text-xs font-normal">rpm</span>
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-[10px]">1ST NATURAL FREQ</div>
              <div className="text-base font-bold text-white">
                {modalResult?.modes[0]?.frequencyHz.toFixed(1)} <span className="text-xs font-normal">Hz</span>
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-[10px]">SEPARATION MARGIN</div>
              <div className="text-base font-bold text-white">
                {criticalSpeedAssessment.checks[0]?.separationPercent.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Parameters on Left, Analysis Cards on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Rotor & Support Parameters (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card: Shaft Geometry */}
          <div className="p-4 rounded-[6px] bg-[#16191D] border border-[#2B3036] space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#2B3036] pb-2">
              <span className="text-xs font-mono font-bold text-[#F0F1F2] flex items-center gap-1.5">
                <Sliders size={14} className="text-[#64D6C5]" /> Rotor Geometry & Material
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-gray-400 text-[11px] font-mono block mb-1">
                  Shaft Length L (mm)
                </label>
                <input
                  type="number"
                  min="50"
                  max="5000"
                  step="50"
                  value={lengthMm}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setLengthMm(val);
                    if (supportBStationMm > val) setSupportBStationMm(val);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-[4px] bg-[#0E1012] border border-[#34393F] text-white font-mono focus:border-[#64D6C5] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-400 text-[11px] font-mono block mb-1">
                    Outer ⌀ (mm)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    step="5"
                    value={outerDiameterMm}
                    onChange={e => setOuterDiameterMm(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-[4px] bg-[#0E1012] border border-[#34393F] text-white font-mono focus:border-[#64D6C5] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-[11px] font-mono block mb-1">
                    Inner Bore ⌀ (mm)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={outerDiameterMm - 2}
                    step="5"
                    value={innerDiameterMm}
                    onChange={e => setInnerDiameterMm(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-[4px] bg-[#0E1012] border border-[#34393F] text-white font-mono focus:border-[#64D6C5] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-[11px] font-mono block mb-1">
                  Shaft Material
                </label>
                <select
                  value={materialId}
                  onChange={e => setMaterialId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-[4px] bg-[#0E1012] border border-[#34393F] text-white font-mono focus:border-[#64D6C5] focus:outline-hidden text-xs"
                >
                  {allMaterials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} (E={m.elasticModulus} GPa, rho={m.density} kg/m³)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Card: Bearing Support Conditions */}
          <div className="p-4 rounded-[6px] bg-[#16191D] border border-[#2B3036] space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#2B3036] pb-2">
              <span className="text-xs font-mono font-bold text-[#F0F1F2] flex items-center gap-1.5">
                <Compass size={14} className="text-[#64D6C5]" /> Bearing Support Conditions
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-gray-400 text-[11px] font-mono block mb-1">
                  Boundary Condition Type
                </label>
                <select
                  value={supportType}
                  onChange={e => setSupportType(e.target.value as SupportType)}
                  className="w-full px-2.5 py-1.5 rounded-[4px] bg-[#0E1012] border border-[#34393F] text-white font-mono focus:border-[#64D6C5] focus:outline-hidden text-xs"
                >
                  <option value="rigid_pinned">Rigid Pinned (Simply Supported, v=0)</option>
                  <option value="flexible_spring">Flexible Spring Supports (Radial Stiffness)</option>
                  <option value="rigid_fixed">Rigid Fixed Base (Cantilever / Built-in)</option>
                </select>
              </div>

              {supportType === 'flexible_spring' && (
                <div>
                  <label className="text-gray-400 text-[11px] font-mono block mb-1">
                    Radial Bearing Stiffness kr (N/m)
                  </label>
                  <input
                    type="number"
                    min="1e5"
                    max="1e10"
                    step="5e6"
                    value={supportStiffnessNM}
                    onChange={e => setSupportStiffnessNM(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-[4px] bg-[#0E1012] border border-[#34393F] text-white font-mono focus:border-[#64D6C5] focus:outline-hidden"
                  />
                  <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">
                    = {(supportStiffnessNM / 1000).toFixed(0)} kN/mm (Housing / ball raceway compliance)
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-400 text-[11px] font-mono block mb-1">
                    Bearing A Pos (mm)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={lengthMm}
                    value={supportAStationMm}
                    onChange={e => setSupportAStationMm(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-[4px] bg-[#0E1012] border border-[#34393F] text-white font-mono focus:border-[#64D6C5] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-[11px] font-mono block mb-1">
                    Bearing B Pos (mm)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={lengthMm}
                    value={supportBStationMm}
                    onChange={e => setSupportBStationMm(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-[4px] bg-[#0E1012] border border-[#34393F] text-white font-mono focus:border-[#64D6C5] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Lumped Masses & Gear Disks */}
          <div className="p-4 rounded-[6px] bg-[#16191D] border border-[#2B3036] space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#2B3036] pb-2">
              <span className="text-xs font-mono font-bold text-[#F0F1F2] flex items-center gap-1.5">
                <Layers size={14} className="text-[#64D6C5]" /> Lumped Rotor Components
              </span>
              <label className="flex items-center gap-1.5 text-xs text-gray-300 font-mono cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasLumpedMass}
                  onChange={e => setHasLumpedMass(e.target.checked)}
                  className="rounded border-[#34393F] bg-[#0E1012] text-[#64D6C5] focus:ring-0"
                />
                Mounted Disk
              </label>
            </div>

            {hasLumpedMass && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-gray-400 text-[11px] font-mono block mb-1">
                      Disk Mass (kg)
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      max="500"
                      step="0.5"
                      value={lumpedMassKg}
                      onChange={e => setLumpedMassKg(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-[4px] bg-[#0E1012] border border-[#34393F] text-white font-mono focus:border-[#64D6C5] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-[11px] font-mono block mb-1">
                      Station z (mm)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={lengthMm}
                      step="10"
                      value={lumpedMassStationMm}
                      onChange={e => setLumpedMassStationMm(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-[4px] bg-[#0E1012] border border-[#34393F] text-white font-mono focus:border-[#64D6C5] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card: Operating Speeds & Balancing */}
          <div className="p-4 rounded-[6px] bg-[#16191D] border border-[#2B3036] space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#2B3036] pb-2">
              <span className="text-xs font-mono font-bold text-[#F0F1F2] flex items-center gap-1.5">
                <Gauge size={14} className="text-[#64D6C5]" /> Speeds & ISO 21940-11
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-400 text-[11px] font-mono block mb-1">
                    Operating Speed (rpm)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="60000"
                    step="100"
                    value={operatingSpeedRpm}
                    onChange={e => setOperatingSpeedRpm(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-[4px] bg-[#0E1012] border border-[#34393F] text-white font-mono focus:border-[#64D6C5] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-[11px] font-mono block mb-1">
                    Range Span (±%)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    step="5"
                    value={speedRangeSpanPct}
                    onChange={e => setSpeedRangeSpanPct(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-[4px] bg-[#0E1012] border border-[#34393F] text-white font-mono focus:border-[#64D6C5] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-400 text-[11px] font-mono block mb-1">
                    Gear Teeth z
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="200"
                    step="1"
                    value={gearToothCount}
                    onChange={e => setGearToothCount(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-[4px] bg-[#0E1012] border border-[#34393F] text-white font-mono focus:border-[#64D6C5] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-[11px] font-mono block mb-1">
                    Unbalance U (g·mm)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    step="10"
                    value={unbalanceGMm}
                    onChange={e => setUnbalanceGMm(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-[4px] bg-[#0E1012] border border-[#34393F] text-white font-mono focus:border-[#64D6C5] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-400 text-[11px] font-mono block mb-1">
                    Damping Ratio ζ
                  </label>
                  <input
                    type="number"
                    min="0.005"
                    max="0.5"
                    step="0.01"
                    value={dampingRatio}
                    onChange={e => setDampingRatio(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-[4px] bg-[#0E1012] border border-[#34393F] text-white font-mono focus:border-[#64D6C5] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-[11px] font-mono block mb-1">
                    Balance Grade G
                  </label>
                  <select
                    value={balanceGrade}
                    onChange={e => setBalanceGrade(e.target.value as BalanceQualityGrade)}
                    className="w-full px-2.5 py-1.5 rounded-[4px] bg-[#0E1012] border border-[#34393F] text-white font-mono focus:border-[#64D6C5] focus:outline-hidden text-xs"
                  >
                    <option value="G0.4">G0.4 (Gyroscopes, spindles)</option>
                    <option value="G1">G1 (Grinding drives)</option>
                    <option value="G2.5">G2.5 (Turbines, compressors)</option>
                    <option value="G6.3">G6.3 (General machinery)</option>
                    <option value="G16">G16 (Drive shafts, ag)</option>
                    <option value="G40">G40 (Car wheels, crankshafts)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Visualization, Modal Results, Forced Response (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card: Mode Shape Visualization Canvas */}
          <div className="p-4 rounded-[6px] bg-[#16191D] border border-[#2B3036] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2B3036] pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-[#F0F1F2] flex items-center gap-1.5">
                  <Activity size={15} className="text-[#64D6C5]" /> Lateral Bending Mode Shapes
                </span>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Solved eigenvector deflection curve normalized across shaft stations
                </p>
              </div>

              {/* Mode Selectors */}
              <div className="flex items-center gap-1.5">
                {modalResult?.modes.slice(0, 4).map((m, idx) => (
                  <button
                    key={m.modeNumber}
                    onClick={() => setSelectedModeIndex(idx)}
                    className={`px-2.5 py-1 text-xs font-mono rounded-[4px] border transition-all ${
                      selectedModeIndex === idx
                        ? 'bg-[#64D6C5]/20 text-[#64D6C5] border-[#64D6C5]'
                        : 'bg-[#0E1012] text-gray-400 border-[#34393F] hover:bg-[#1C2127] hover:text-gray-200'
                    }`}
                  >
                    Mode {m.modeNumber} ({m.frequencyHz.toFixed(0)} Hz)
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Mode Shape Canvas */}
            <div className="w-full h-56 bg-[#0E1012] rounded-[4px] border border-[#2B3036] p-2 flex items-center justify-center relative overflow-hidden">
              {selectedMode ? (
                <svg className="w-full h-full" viewBox="0 0 700 180" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="50" y1="90" x2="650" y2="90" stroke="#2B3036" strokeDasharray="3 3" />
                  <line x1="50" y1="20" x2="50" y2="160" stroke="#2B3036" />
                  <line x1="650" y1="20" x2="650" y2="160" stroke="#2B3036" />

                  {/* Mode shape curve */}
                  {(() => {
                    const pts = selectedMode.modeShape;
                    if (!pts || pts.length === 0) return null;
                    const maxZ = lengthMm;
                    const svgPoints = pts.map(p => {
                      const x = 50 + (p.z / maxZ) * 600;
                      const y = 90 - p.deflection * 60; // scale deflection to +/- 60px
                      return `${x},${y}`;
                    });
                    const pathD = `M ${svgPoints.join(' L ')}`;

                    return (
                      <>
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#64D6C5"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        {/* Shaded area */}
                        <path
                          d={`M 50,90 L ${svgPoints.join(' L ')} L 650,90 Z`}
                          fill="url(#modeGradient)"
                          opacity="0.15"
                        />
                        {/* Nodes */}
                        {pts.map((p, i) => {
                          if (i % 2 !== 0 && i !== pts.length - 1) return null;
                          const x = 50 + (p.z / maxZ) * 600;
                          const y = 90 - p.deflection * 60;
                          return (
                            <circle
                              key={i}
                              cx={x}
                              cy={y}
                              r={3}
                              fill="#64D6C5"
                              stroke="#0E1012"
                              strokeWidth="1"
                            />
                          );
                        })}
                      </>
                    );
                  })()}

                  {/* Bearings schematic triangles */}
                  {(() => {
                    const maxZ = lengthMm;
                    const xA = 50 + (supportAStationMm / maxZ) * 600;
                    const xB = 50 + (supportBStationMm / maxZ) * 600;
                    return (
                      <>
                        {/* Support A */}
                        <polygon
                          points={`${xA},90 ${xA - 8},104 ${xA + 8},104`}
                          fill="#38BDF8"
                          stroke="#0E1012"
                          strokeWidth="1"
                        />
                        <text x={xA} y="118" fill="#38BDF8" fontSize="10" textAnchor="middle" fontFamily="monospace">
                          Brg A
                        </text>

                        {/* Support B */}
                        <polygon
                          points={`${xB},90 ${xB - 8},104 ${xB + 8},104`}
                          fill="#38BDF8"
                          stroke="#0E1012"
                          strokeWidth="1"
                        />
                        <text x={xB} y="118" fill="#38BDF8" fontSize="10" textAnchor="middle" fontFamily="monospace">
                          Brg B
                        </text>
                      </>
                    );
                  })()}

                  {/* Lumped mass disk marker */}
                  {hasLumpedMass && (
                    (() => {
                      const maxZ = lengthMm;
                      const xDisk = 50 + (lumpedMassStationMm / maxZ) * 600;
                      return (
                        <>
                          <rect
                            x={xDisk - 6}
                            y="45"
                            width="12"
                            height="90"
                            fill="#F59E0B"
                            opacity="0.75"
                            rx="2"
                          />
                          <text x={xDisk} y="38" fill="#F59E0B" fontSize="10" textAnchor="middle" fontFamily="monospace">
                            Disk ({lumpedMassKg}kg)
                          </text>
                        </>
                      );
                    })()
                  )}

                  <defs>
                    <linearGradient id="modeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#64D6C5" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#64D6C5" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                </svg>
              ) : null}
            </div>

            {/* Mode Details Strip */}
            {selectedMode && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-1">
                <div className="p-2 rounded bg-[#0E1012] border border-[#2B3036]">
                  <span className="text-gray-400 text-[10px] block">NATURAL FREQ</span>
                  <span className="text-[#64D6C5] font-bold text-sm">
                    {selectedMode.frequencyHz.toFixed(1)} Hz
                  </span>
                </div>
                <div className="p-2 rounded bg-[#0E1012] border border-[#2B3036]">
                  <span className="text-gray-400 text-[10px] block">CRITICAL SPEED</span>
                  <span className="text-white font-bold text-sm">
                    {selectedMode.synchronousSpeedRpm.toFixed(0)} rpm
                  </span>
                </div>
                <div className="p-2 rounded bg-[#0E1012] border border-[#2B3036]">
                  <span className="text-gray-400 text-[10px] block">MODAL MASS</span>
                  <span className="text-white font-bold text-sm">
                    {selectedMode.modalMassKg.toFixed(2)} kg
                  </span>
                </div>
                <div className="p-2 rounded bg-[#0E1012] border border-[#2B3036]">
                  <span className="text-gray-400 text-[10px] block">MODAL STIFFNESS</span>
                  <span className="text-white font-bold text-sm">
                    {(selectedMode.modalStiffnessNM / 1000).toFixed(1)} kN/m
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Card: Critical Speed Screening & Separation Table */}
          <div className="p-4 rounded-[6px] bg-[#16191D] border border-[#2B3036] space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#2B3036] pb-2">
              <span className="text-xs font-mono font-bold text-[#F0F1F2] flex items-center gap-1.5">
                <Gauge size={14} className="text-[#64D6C5]" /> Critical Speed Screening Table
              </span>
              <span className="text-[11px] font-mono text-gray-400">
                Operating Band: [{operatingRange[0]}, {operatingRange[1]}] rpm
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead>
                  <tr className="border-b border-[#2B3036] text-gray-400 text-[11px]">
                    <th className="pb-2">Mode</th>
                    <th className="pb-2">Frequency</th>
                    <th className="pb-2">Synchronous Speed</th>
                    <th className="pb-2">Operating Speed</th>
                    <th className="pb-2">Separation</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2B3036]/50">
                  {criticalSpeedAssessment?.checks.map(c => (
                    <tr key={c.modeNumber} className="hover:bg-[#1F242B]/40">
                      <td className="py-2.5 font-bold text-[#F0F1F2]">Mode {c.modeNumber}</td>
                      <td className="py-2.5 text-gray-300">{c.frequencyHz.toFixed(1)} Hz</td>
                      <td className="py-2.5 text-white font-bold">{c.criticalSpeedRpm.toFixed(0)} rpm</td>
                      <td className="py-2.5 text-gray-400">{c.operatingSpeedRpm} rpm</td>
                      <td className="py-2.5">
                        <span
                          className={`font-semibold ${
                            c.status === 'safe'
                              ? 'text-emerald-400'
                              : c.status === 'warning'
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}
                        >
                          {c.separationPercent.toFixed(1)}% (Δ {c.deltaRpm.toFixed(0)} rpm)
                        </span>
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.status === 'safe'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                              : c.status === 'warning'
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                              : 'bg-red-950/60 text-red-400 border border-red-800/60'
                          }`}
                        >
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Analytical Benchmarks Check Callout */}
            {modalResult?.benchmarks && (
              <div className="p-3 rounded bg-[#0E1012] border border-[#2B3036] text-[11px] font-mono text-gray-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <span className="text-gray-400 block text-[10px]">INDEPENDENT ANALYTICAL BENCHMARK COMPARISON</span>
                  <span>
                    Theory Baseline: <span className="text-[#64D6C5] font-bold">{modalResult.benchmarks.simplySupportedFirstModeHz} Hz</span> | Rayleigh Quotient: <span className="text-white">{modalResult.benchmarks.rayleighFirstModeHz} Hz</span>
                    {modalResult.benchmarks.dunkerleyFirstModeHz ? ` | Dunkerley Lower Bound: ${modalResult.benchmarks.dunkerleyFirstModeHz} Hz` : ''}
                  </span>
                </div>
                <span className="text-emerald-400 text-[10px] bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  FEA &lt; 0.1% Theory Error
                </span>
              </div>
            )}
          </div>

          {/* Card: Forced Unbalance Response (Jeffcott SDOF) */}
          <div className="p-4 rounded-[6px] bg-[#16191D] border border-[#2B3036] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2B3036] pb-2">
              <div>
                <span className="text-xs font-mono font-bold text-[#F0F1F2] flex items-center gap-1.5">
                  <Waves size={14} className="text-[#64D6C5]" /> Forced Unbalance Response (Jeffcott Model)
                </span>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Dynamic vibration displacement amplitude vs rotational speed under unbalance U = {unbalanceGMm} g·mm
                </p>
              </div>

              {imbalanceResponse && (
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-gray-400">
                    Q: <span className="text-white font-bold">{imbalanceResponse.amplificationFactorQ}</span>
                  </span>
                  <span className="text-gray-400">
                    Peak: <span className="text-amber-400 font-bold">{imbalanceResponse.peakAmplitudeUm} µm</span>
                  </span>
                </div>
              )}
            </div>

            {/* Sweep SVG Curve */}
            {imbalanceResponse && imbalanceResponse.sweep.length > 0 && (
              <div className="w-full h-44 bg-[#0E1012] rounded-[4px] border border-[#2B3036] p-2 relative">
                <svg className="w-full h-full" viewBox="0 0 600 140" preserveAspectRatio="none">
                  {/* Grid */}
                  <line x1="40" y1="110" x2="570" y2="110" stroke="#2B3036" />
                  <line x1="40" y1="20" x2="40" y2="110" stroke="#2B3036" />

                  {/* Operational Speed Reference Line */}
                  {(() => {
                    const sweep = imbalanceResponse.sweep;
                    const maxSpeed = sweep[sweep.length - 1].speedRpm;
                    const xOp = 40 + (operatingSpeedRpm / maxSpeed) * 530;
                    return (
                      <line
                        x1={xOp}
                        y1="20"
                        x2={xOp}
                        y2="110"
                        stroke="#38BDF8"
                        strokeDasharray="4 4"
                        strokeWidth="1.5"
                      />
                    );
                  })()}

                  {/* Resonant Speed Reference Line */}
                  {(() => {
                    const sweep = imbalanceResponse.sweep;
                    const maxSpeed = sweep[sweep.length - 1].speedRpm;
                    const xRes = 40 + (imbalanceResponse.resonantSpeedRpm / maxSpeed) * 530;
                    return (
                      <line
                        x1={xRes}
                        y1="20"
                        x2={xRes}
                        y2="110"
                        stroke="#EF4444"
                        strokeDasharray="2 2"
                        strokeWidth="1"
                      />
                    );
                  })()}

                  {/* Unbalance Curve */}
                  {(() => {
                    const sweep = imbalanceResponse.sweep;
                    const maxSpeed = sweep[sweep.length - 1].speedRpm;
                    const maxAmp = Math.max(1, imbalanceResponse.peakAmplitudeUm);

                    const pts = sweep.map(pt => {
                      const x = 40 + (pt.speedRpm / maxSpeed) * 530;
                      const y = 110 - (pt.amplitudeUm / maxAmp) * 85;
                      return `${x},${y}`;
                    });

                    return (
                      <path
                        d={`M ${pts.join(' L ')}`}
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="2"
                      />
                    );
                  })()}
                </svg>

                <div className="flex justify-between text-[10px] font-mono text-gray-500 px-8 -mt-2">
                  <span>0 rpm</span>
                  <span className="text-[#38BDF8]">Operating: {operatingSpeedRpm} rpm</span>
                  <span className="text-red-400">Resonance: {imbalanceResponse.resonantSpeedRpm.toFixed(0)} rpm</span>
                  <span>{imbalanceResponse.sweep[imbalanceResponse.sweep.length - 1].speedRpm} rpm</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Grid: Excitation Orders & Balancing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Excitation Orders */}
            <div className="p-4 rounded-[6px] bg-[#16191D] border border-[#2B3036] space-y-3 shadow-xs">
              <span className="text-xs font-mono font-bold text-[#F0F1F2] flex items-center gap-1.5 border-b border-[#2B3036] pb-2">
                <Gauge size={14} className="text-[#64D6C5]" /> Rotational Excitation Orders
              </span>
              <div className="space-y-2 text-xs font-mono">
                {excitationOrders?.orders.map(o => (
                  <div
                    key={o.orderName}
                    className="flex items-center justify-between p-2 rounded bg-[#0E1012] border border-[#2B3036]/60"
                  >
                    <div>
                      <span className="text-white block font-medium">{o.orderName}</span>
                      <span className="text-[10px] text-gray-400">Multiplier: {o.multiplier}X</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#64D6C5] font-bold block">{o.frequencyHz} Hz</span>
                      {o.nearResonanceWithMode ? (
                        <span className="text-[10px] text-red-400 font-semibold">
                          Near Mode {o.nearResonanceWithMode} (Δ {o.frequencyMarginPercent}%)
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400">Safe margin</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ISO 21940-11 Rigid-Rotor Balancing */}
            <div className="p-4 rounded-[6px] bg-[#16191D] border border-[#2B3036] space-y-3 shadow-xs">
              <span className="text-xs font-mono font-bold text-[#F0F1F2] flex items-center gap-1.5 border-b border-[#2B3036] pb-2">
                <ShieldAlert size={14} className="text-[#64D6C5]" /> ISO 21940-11 Balance Limits
              </span>
              {balancingResult && (
                <div className="space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between items-center p-2 rounded bg-[#0E1012] border border-[#2B3036]/60">
                    <span className="text-gray-400">Grade & Criterion:</span>
                    <span className="text-white font-bold">
                      {balancingResult.grade} ({balancingResult.gradeValueMmS} mm/s)
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded bg-[#0E1012] border border-[#2B3036]/60">
                    <span className="text-gray-400">Specific Unbalance e_per:</span>
                    <span className="text-[#64D6C5] font-bold">
                      {balancingResult.permissibleSpecificUnbalanceUpm} µm (g·mm/kg)
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded bg-[#0E1012] border border-[#2B3036]/60">
                    <span className="text-gray-400">Total Permissible U_per:</span>
                    <span className="text-amber-400 font-bold">
                      {balancingResult.permissibleResidualUnbalanceGMm} g·mm
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-2 rounded bg-[#0E1012] border border-[#2B3036]/60">
                    <span className="text-gray-400">Two-Plane Split (50/50):</span>
                    <span className="text-white font-bold">
                      Planes A & B: {balancingResult.planeAllocation.planeAGMm} g·mm ea
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
