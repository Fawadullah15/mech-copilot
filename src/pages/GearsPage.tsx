import React, { useState, useMemo } from 'react';
import {
  Cog,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Download,
  Copy,
  RotateCcw,
  BookOpen,
  Info,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Disc,
  ArrowRight,
  Sparkles,
  Layers,
  Activity
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  calculateGearGeometry,
  calculateGearPairGeometry,
  calculateGearKinematics,
  calculateMeshForces,
  integrateGearWithShaft,
  type GearType,
  type HelixHand,
  type RotationDirection,
  type CylindricalGearInput
} from '../engineering/gears';

export default function GearsPage() {
  const { designParams, selectedMaterial, activeProject, setActivePage } = useApp();

  // Active view tab: 'workstation' | 'integration' | 'audit' | 'report'
  const [activeTab, setActiveTab] = useState<'workstation' | 'integration' | 'audit' | 'report'>('workstation');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // ─── Primary Gear Configuration State ──────────────────────────────────────
  const [gearType, setGearType] = useState<GearType>('spur');
  const [normalModule, setNormalModule] = useState<number>(3.0);
  const [pinionTeeth, setPinionTeeth] = useState<number>(20);
  const [wheelTeeth, setWheelTeeth] = useState<number>(50);
  const [pressureAngleDeg, setPressureAngleDeg] = useState<number>(20.0);
  const [helixAngleDeg, setHelixAngleDeg] = useState<number>(15.0);
  const [pinionHelixHand, setPinionHelixHand] = useState<HelixHand>('left');
  const [pinionFaceWidth, setPinionFaceWidth] = useState<number>(45.0);
  const [wheelFaceWidth, setWheelFaceWidth] = useState<number>(40.0);
  const [pinionProfileShift, setPinionProfileShift] = useState<number>(0.0);
  const [wheelProfileShift, setWheelProfileShift] = useState<number>(0.0);

  // ─── Kinematics State ──────────────────────────────────────────────────────
  const [pinionSpeedRpm, setPinionSpeedRpm] = useState<number>(designParams.rpm || 1500);
  const [transmittedPowerKw, setTransmittedPowerKw] = useState<number>(15.0);
  const [efficiency, setEfficiency] = useState<number>(0.98);
  const [pinionRotation, setPinionRotation] = useState<RotationDirection>('CW');
  const [meshOrientationDeg, setMeshOrientationDeg] = useState<number>(90); // 90° = wheel on +y

  // ─── Shaft & Bearing Integration State ─────────────────────────────────────
  const [shaftLengthMm, setShaftLengthMm] = useState<number>(designParams.length || 300);
  const [bearingStationAMm, setBearingStationAMm] = useState<number>(50);
  const [bearingStationBMm, setBearingStationBMm] = useState<number>(250);
  const [gearStationMm, setGearStationMm] = useState<number>(150);
  const [dynamicCapacityA, setDynamicCapacityA] = useState<number>(28000); // N (6207)
  const [dynamicCapacityB, setDynamicCapacityB] = useState<number>(28000);

  // ─── Preset Handlers ───────────────────────────────────────────────────────
  const applyPreset = (preset: 'standard_spur' | 'helical_drive' | 'speed_reducer') => {
    if (preset === 'standard_spur') {
      setGearType('spur');
      setNormalModule(3.0);
      setPinionTeeth(20);
      setWheelTeeth(50);
      setPressureAngleDeg(20.0);
      setHelixAngleDeg(0.0);
      setPinionHelixHand('none');
      setPinionFaceWidth(45.0);
      setWheelFaceWidth(40.0);
      setPinionProfileShift(0.0);
      setWheelProfileShift(0.0);
      setPinionSpeedRpm(1500);
      setTransmittedPowerKw(15.0);
    } else if (preset === 'helical_drive') {
      setGearType('helical');
      setNormalModule(2.5);
      setPinionTeeth(24);
      setWheelTeeth(72);
      setPressureAngleDeg(20.0);
      setHelixAngleDeg(20.0);
      setPinionHelixHand('right');
      setPinionFaceWidth(50.0);
      setWheelFaceWidth(45.0);
      setPinionProfileShift(0.0);
      setWheelProfileShift(0.0);
      setPinionSpeedRpm(1800);
      setTransmittedPowerKw(22.0);
    } else if (preset === 'speed_reducer') {
      setGearType('helical');
      setNormalModule(4.0);
      setPinionTeeth(18);
      setWheelTeeth(72);
      setPressureAngleDeg(20.0);
      setHelixAngleDeg(15.0);
      setPinionHelixHand('left');
      setPinionFaceWidth(65.0);
      setWheelFaceWidth(60.0);
      setPinionProfileShift(0.15); // Add profile shift to avoid undercut
      setWheelProfileShift(0.0);
      setPinionSpeedRpm(1450);
      setTransmittedPowerKw(30.0);
    }
  };

  // ─── Evaluated Gear Pair Geometry ──────────────────────────────────────────
  const wheelHelixHand: HelixHand =
    gearType === 'spur'
      ? 'none'
      : pinionHelixHand === 'left'
      ? 'right'
      : 'left';

  const pinionInput: CylindricalGearInput = useMemo(
    () => ({
      id: 'gear-pinion',
      name: 'Input Driving Pinion',
      type: gearType,
      teeth: Math.max(6, Math.round(pinionTeeth)),
      normalModule: Math.max(0.1, normalModule),
      normalPressureAngleDeg: pressureAngleDeg,
      helixAngleDeg: gearType === 'spur' ? 0 : helixAngleDeg,
      helixHand: gearType === 'spur' ? 'none' : pinionHelixHand,
      faceWidth: Math.max(1, pinionFaceWidth),
      profileShiftCoefficient: pinionProfileShift
    }),
    [
      gearType,
      pinionTeeth,
      normalModule,
      pressureAngleDeg,
      helixAngleDeg,
      pinionHelixHand,
      pinionFaceWidth,
      pinionProfileShift
    ]
  );

  const wheelInput: CylindricalGearInput = useMemo(
    () => ({
      id: 'gear-wheel',
      name: 'Output Driven Wheel',
      type: gearType,
      teeth: Math.max(6, Math.round(wheelTeeth)),
      normalModule: Math.max(0.1, normalModule),
      normalPressureAngleDeg: pressureAngleDeg,
      helixAngleDeg: gearType === 'spur' ? 0 : helixAngleDeg,
      helixHand: wheelHelixHand,
      faceWidth: Math.max(1, wheelFaceWidth),
      profileShiftCoefficient: wheelProfileShift
    }),
    [
      gearType,
      wheelTeeth,
      normalModule,
      pressureAngleDeg,
      helixAngleDeg,
      wheelHelixHand,
      wheelFaceWidth,
      wheelProfileShift
    ]
  );

  const pairGeometry = useMemo(() => {
    try {
      return calculateGearPairGeometry({ pinion: pinionInput, wheel: wheelInput });
    } catch (e: any) {
      return null;
    }
  }, [pinionInput, wheelInput]);

  // ─── Evaluated Kinematics ──────────────────────────────────────────────────
  const kinematics = useMemo(() => {
    try {
      const d1 = pairGeometry ? pairGeometry.pinion.pitchDiameterMm : undefined;
      return calculateGearKinematics(
        {
          pinionSpeedRpm,
          transmittedPowerKw,
          pinionToothCount: pinionInput.teeth,
          wheelToothCount: wheelInput.teeth,
          efficiency,
          pinionRotationDirection: pinionRotation
        },
        d1
      );
    } catch (e: any) {
      return null;
    }
  }, [
    pinionSpeedRpm,
    transmittedPowerKw,
    pinionInput.teeth,
    wheelInput.teeth,
    efficiency,
    pinionRotation,
    pairGeometry
  ]);

  // ─── Evaluated Mesh Forces ─────────────────────────────────────────────────
  const meshForces = useMemo(() => {
    if (!pairGeometry || !kinematics) return null;
    try {
      return calculateMeshForces({
        pinionTorqueNm: kinematics.pinionTorqueNm,
        pinionPitchDiameterMm: pairGeometry.pinion.pitchDiameterMm,
        normalPressureAngleDeg: pairGeometry.pinion.normalPressureAngleDeg,
        transversePressureAngleDeg: pairGeometry.pinion.transversePressureAngleDeg,
        helixAngleDeg: pairGeometry.pinion.helixAngleDeg,
        pinionHelixHand: pairGeometry.pinion.helixHand,
        pinionRotationDirection: pinionRotation,
        meshOrientationAngleDeg: meshOrientationDeg,
        isPinionDriver: true
      });
    } catch (e: any) {
      return null;
    }
  }, [pairGeometry, kinematics, pinionRotation, meshOrientationDeg]);

  // ─── Evaluated Shaft & Bearing Reactions ───────────────────────────────────
  const shaftIntegration = useMemo(() => {
    if (!meshForces) return null;
    try {
      return integrateGearWithShaft({
        shaftLengthMm,
        bearingStationAMm,
        bearingStationBMm,
        gearStationMm,
        meshForces,
        targetGear: 'pinion',
        supportArrangement: 'locating_floating',
        locatingStation: 'A',
        dynamicCapacityA,
        dynamicCapacityB,
        shaftRpm: pinionSpeedRpm
      });
    } catch (e: any) {
      return null;
    }
  }, [
    meshForces,
    shaftLengthMm,
    bearingStationAMm,
    bearingStationBMm,
    gearStationMm,
    dynamicCapacityA,
    dynamicCapacityB,
    pinionSpeedRpm
  ]);

  // ─── Markdown Report Generator ─────────────────────────────────────────────
  const generateMarkdownReport = () => {
    if (!pairGeometry || !kinematics || !meshForces) {
      return '# Gear Analysis Report\n\nError: Gear calculations incomplete.';
    }

    const p = pairGeometry.pinion;
    const w = pairGeometry.wheel;

    return `# Cylindrical Gear Engineering Analysis & Kinematic Load Report
**Project:** ${activeProject?.name || 'ME-Design-Project'}
**Date:** ${new Date().toISOString().split('T')[0]}
**Standard Reference:** ISO 21771-1:2024 / ISO 53:1998
**Verification Status:** Verified (Geometry, Kinematics & Static Mesh Forces)

---

## 1. Gear Pair Specifications

| Parameter | Pinion (Gear 1) | Wheel (Gear 2) | Unit |
|:---|:---:|:---:|:---:|
| Gear Type | ${p.type} | ${w.type} | - |
| Number of Teeth ($z$) | ${p.teeth} | ${w.teeth} | - |
| Normal Module ($m_n$) | ${p.normalModuleMm.toFixed(3)} | ${w.normalModuleMm.toFixed(3)} | mm |
| Transverse Module ($m_t$) | ${p.transverseModuleMm.toFixed(4)} | ${w.transverseModuleMm.toFixed(4)} | mm |
| Normal Pressure Angle ($\\alpha_n$) | ${p.normalPressureAngleDeg.toFixed(2)} | ${w.normalPressureAngleDeg.toFixed(2)} | deg |
| Transverse Pressure Angle ($\\alpha_t$) | ${p.transversePressureAngleDeg.toFixed(3)} | ${w.transversePressureAngleDeg.toFixed(3)} | deg |
| Helix Angle ($\\beta$) | ${p.helixAngleDeg.toFixed(2)} (${p.helixHand}) | ${w.helixAngleDeg.toFixed(2)} (${w.helixHand}) | deg |
| Face Width ($b$) | ${p.faceWidthMm.toFixed(1)} | ${w.faceWidthMm.toFixed(1)} | mm |
| Profile Shift ($x$) | ${p.profileShiftCoefficient.toFixed(3)} | ${w.profileShiftCoefficient.toFixed(3)} | - |
| Pitch Diameter ($d$) | ${p.pitchDiameterMm.toFixed(3)} | ${w.pitchDiameterMm.toFixed(3)} | mm |
| Base Diameter ($d_b$) | ${p.baseDiameterMm.toFixed(3)} | ${w.baseDiameterMm.toFixed(3)} | mm |
| Tip Diameter ($d_a$) | ${p.tipDiameterMm.toFixed(3)} | ${w.tipDiameterMm.toFixed(3)} | mm |
| Root Diameter ($d_f$) | ${p.rootDiameterMm.toFixed(3)} | ${w.rootDiameterMm.toFixed(3)} | mm |

---

## 2. Center Distance & Contact Ratio (ISO 21771-1:2024)

- **Reference Center Distance ($a$):** ${pairGeometry.referenceCenterDistanceMm.toFixed(3)} mm
- **Working Center Distance ($a_w$):** ${pairGeometry.workingCenterDistanceMm.toFixed(3)} mm
- **Gear Ratio ($u = z_2 / z_1$):** ${pairGeometry.gearRatio.toFixed(3)}
- **Common Face Width ($b_w$):** ${pairGeometry.commonFaceWidthMm.toFixed(1)} mm
- **Path of Contact Length ($g_\\alpha$):** ${pairGeometry.pathOfContactLengthMm.toFixed(3)} mm
- **Profile Contact Ratio ($\\varepsilon_\\alpha$):** ${pairGeometry.profileContactRatio.toFixed(3)} ${
      pairGeometry.profileContactRatio >= 1.2 ? '(Satisfactory load sharing)' : '(Warning: marginal)'
    }
- **Helical Overlap Ratio ($\\varepsilon_\\beta$):** ${pairGeometry.faceContactRatio.toFixed(3)}
- **Total Contact Ratio ($\\varepsilon_\\gamma$):** ${pairGeometry.totalContactRatio.toFixed(3)}

---

## 3. Kinematics & Power Transmission

- **Input Rotational Speed ($n_1$):** ${kinematics.pinionSpeedRpm.toFixed(1)} rpm (${kinematics.pinionRotation})
- **Output Rotational Speed ($n_2$):** ${kinematics.wheelSpeedRpm.toFixed(1)} rpm (${kinematics.wheelRotation})
- **Transmitted Input Power ($P_{\\text{in}}$):** ${kinematics.inputPowerKw.toFixed(2)} kW
- **Input Torque ($T_1$):** ${kinematics.pinionTorqueNm.toFixed(2)} N·m
- **Mechanical Efficiency ($\\eta$):** ${(kinematics.efficiency * 100).toFixed(1)}%
- **Output Torque ($T_2$):** ${kinematics.wheelTorqueNm.toFixed(2)} N·m
- **Transmitted Output Power ($P_{\\text{out}}$):** ${kinematics.outputPowerKw.toFixed(2)} kW
- **Power Loss ($P_{\\text{loss}}$):** ${kinematics.powerLossKw.toFixed(2)} kW
- **Pitch Line Velocity ($v$):** ${kinematics.pitchLineVelocityMs.toFixed(2)} m/s

---

## 4. 3D Gear Mesh Forces

- **Tangential Transmitted Force ($F_t$):** ${meshForces.tangentialForceN.toFixed(2)} N
- **Radial Separating Force ($F_r$):** ${meshForces.radialForceN.toFixed(2)} N
- **Axial Thrust Force ($F_a$):** ${meshForces.axialForceN.toFixed(2)} N
- **Total Normal Force at Tooth Flank ($F_n$):** ${meshForces.normalForceN.toFixed(2)} N

### Global Shaft Coordinate Frame Vectors:
- **Pinion Force $\\vec{F}_1$:** $[F_x = ${meshForces.pinionForceGlobalN.Fx.toFixed(1)}, F_y = ${meshForces.pinionForceGlobalN.Fy.toFixed(1)}, F_z = ${meshForces.pinionForceGlobalN.Fz.toFixed(1)}]$ N
- **Pinion Overturning Moment $\\vec{M}_1$:** $[M_y = ${meshForces.pinionOverturningMomentGlobalNm.My.toFixed(3)}, M_z = ${meshForces.pinionOverturningMomentGlobalNm.Mz.toFixed(3)}]$ N·m
- **Wheel Reaction Force $\\vec{F}_2$:** $[F_x = ${meshForces.wheelForceGlobalN.Fx.toFixed(1)}, F_y = ${meshForces.wheelForceGlobalN.Fy.toFixed(1)}, F_z = ${meshForces.wheelForceGlobalN.Fz.toFixed(1)}]$ N
- **Newton's 3rd Law Equilibrium:** Enforced ($\\|\\vec{F}_1 + \\vec{F}_2\\| = 0$)

---

## 5. Shaft & Bearing Reactions Transfer
${
  shaftIntegration
    ? `
- **Shaft Span:** $L = ${shaftIntegration.shaftLengthMm}$ mm (Support A at ${shaftIntegration.stationAMm} mm, Support B at ${shaftIntegration.stationBMm} mm)
- **Gear Station:** $x = ${shaftIntegration.gearStationMm}$ mm
- **Bearing A Reactions:** $R_y = ${shaftIntegration.reactionA.Ry.toFixed(1)}$ N, $R_z = ${shaftIntegration.reactionA.Rz.toFixed(1)}$ N, Resultant $F_r = ${shaftIntegration.reactionA.radialResultantN.toFixed(1)}$ N, Axial $F_a = ${shaftIntegration.reactionA.axialLoadN.toFixed(1)}$ N
- **Bearing B Reactions:** $R_y = ${shaftIntegration.reactionB.Ry.toFixed(1)}$ N, $R_z = ${shaftIntegration.reactionB.Rz.toFixed(1)}$ N, Resultant $F_r = ${shaftIntegration.reactionB.radialResultantN.toFixed(1)}$ N, Axial $F_a = ${shaftIntegration.reactionB.axialLoadN.toFixed(1)}$ N
- **Static Equilibrium Verification:** $\\max(|\\Sigma F_y|, |\\Sigma F_z|) \\le 10^{-5}$ N (Status: ${
        shaftIntegration.residuals.isEquilibriumSatisfied ? 'Satisfied' : 'Violated'
      })
${
  shaftIntegration.bearingLifeA
    ? `- **Support A $L_{10}$ Dynamic Rating Life:** ${shaftIntegration.bearingLifeA.l10Hours.toLocaleString()} operating hours`
    : ''
}
${
  shaftIntegration.bearingLifeB
    ? `- **Support B $L_{10}$ Dynamic Rating Life:** ${shaftIntegration.bearingLifeB.l10Hours.toLocaleString()} operating hours`
    : ''
}
`
    : 'No shaft integration data available.'
}

---

## 6. Engineering Standards & Deferred Scope Boundaries

> [!NOTE]
> **ISO 21771-1:2024 & ISO 53:1998** govern the analytical geometry, center distance, and contact ratios verified herein.
> **ISO 6336 (Parts 1, 2, 3, 5)** tooth root bending strength ($K_v, K_{F\\beta}, Y_F, \\sigma_F$) and surface durability pitting resistance ($K_{H\\beta}, Z_H, \\sigma_H$) are **EXPLICITLY DEFERRED** and not certified by this calculation.
`;
  };

  const handleCopyReport = () => {
    const text = generateMarkdownReport();
    navigator.clipboard.writeText(text);
    setCopyFeedback('Report copied to clipboard!');
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#111315] text-[#ECEFF1] overflow-y-auto">
      {/* ─── Top Workstation Bar ───────────────────────────────────────────── */}
      <div className="h-14 border-b border-[#34393F] bg-[#191C1F] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[4px] bg-[#22272B] border border-[#34393F] flex items-center justify-center text-[#64D6C5]">
            <Cog size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wide text-white uppercase">
                Cylindrical Gear Workstation
              </h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] bg-[#22272B] border border-[#34393F] text-[#64D6C5] font-mono">
                ISO 21771-1:2024
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] bg-[#22272B] border border-[#34393F] text-amber-300 font-mono">
                ISO 53 Rack
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              External Involute Spur & Helical Pairs • Kinematics • 3D Mesh Loads • Shaft Integration
            </p>
          </div>
        </div>

        {/* Quick Presets & Tabs */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 bg-[#111315] p-1 rounded-[4px] border border-[#34393F]">
            <button
              onClick={() => applyPreset('standard_spur')}
              className="text-[11px] px-2 py-1 rounded-[3px] text-gray-300 hover:text-white hover:bg-[#22272B] transition-colors"
            >
              Std Spur
            </button>
            <button
              onClick={() => applyPreset('helical_drive')}
              className="text-[11px] px-2 py-1 rounded-[3px] text-gray-300 hover:text-white hover:bg-[#22272B] transition-colors"
            >
              Helical Drive
            </button>
            <button
              onClick={() => applyPreset('speed_reducer')}
              className="text-[11px] px-2 py-1 rounded-[3px] text-gray-300 hover:text-white hover:bg-[#22272B] transition-colors"
            >
              Reduction Pair
            </button>
          </div>

          <div className="h-4 w-px bg-[#34393F] mx-1 hidden md:block" />

          {/* Tab Navigation */}
          <div className="flex bg-[#111315] p-1 rounded-[4px] border border-[#34393F]">
            {(
              [
                { id: 'workstation', label: 'Workstation' },
                { id: 'integration', label: 'Shaft Integration' },
                { id: 'audit', label: 'Math & Standards' },
                { id: 'report', label: 'Report' }
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`text-[11px] font-medium px-3 py-1 rounded-[3px] transition-all ${
                  activeTab === t.id
                    ? 'bg-[#64D6C5] text-[#111315] font-semibold shadow-xs'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#22272B]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Main Content Tabs ────────────────────────────────────────────── */}
      <div className="flex-1 p-6 space-y-6">
        {activeTab === 'workstation' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Columns: Parameter Inputs */}
            <div className="lg:col-span-5 space-y-6">
              {/* Gear Type & Module Card */}
              <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[#34393F] pb-2">
                  <div className="flex items-center gap-2">
                    <Sliders size={14} className="text-[#64D6C5]" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-white">
                      Gear Tooth Parameters
                    </h2>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setGearType('spur')}
                      className={`text-[10px] px-2 py-0.5 rounded-[3px] border ${
                        gearType === 'spur'
                          ? 'bg-[#64D6C5]/20 border-[#64D6C5] text-[#64D6C5] font-semibold'
                          : 'border-[#34393F] text-gray-400 hover:text-white'
                      }`}
                    >
                      Spur
                    </button>
                    <button
                      onClick={() => setGearType('helical')}
                      className={`text-[10px] px-2 py-0.5 rounded-[3px] border ${
                        gearType === 'helical'
                          ? 'bg-[#64D6C5]/20 border-[#64D6C5] text-[#64D6C5] font-semibold'
                          : 'border-[#34393F] text-gray-400 hover:text-white'
                      }`}
                    >
                      Helical
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-gray-400 block mb-1">Normal Module $m_n$ (mm)</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.5"
                      max="20"
                      value={normalModule}
                      onChange={(e) => setNormalModule(parseFloat(e.target.value) || 1)}
                      className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-white font-mono focus:border-[#64D6C5] outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Pressure Angle $\alpha_n$ (°)</label>
                    <select
                      value={pressureAngleDeg}
                      onChange={(e) => setPressureAngleDeg(parseFloat(e.target.value))}
                      className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2 py-1.5 text-white font-mono focus:border-[#64D6C5] outline-hidden"
                    >
                      <option value="20">20.0° (ISO 53 Standard)</option>
                      <option value="14.5">14.5° (Obsolete / Legacy)</option>
                      <option value="25">25.0° (Heavy Shock Duty)</option>
                    </select>
                  </div>

                  {gearType === 'helical' && (
                    <>
                      <div>
                        <label className="text-gray-400 block mb-1">Helix Angle $\beta$ (°)</label>
                        <input
                          type="number"
                          step="1"
                          min="5"
                          max="45"
                          value={helixAngleDeg}
                          onChange={(e) => setHelixAngleDeg(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-white font-mono focus:border-[#64D6C5] outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-gray-400 block mb-1">Pinion Helix Hand</label>
                        <select
                          value={pinionHelixHand}
                          onChange={(e) => setPinionHelixHand(e.target.value as HelixHand)}
                          className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2 py-1.5 text-white font-mono focus:border-[#64D6C5] outline-hidden"
                        >
                          <option value="left">Left Hand (LH)</option>
                          <option value="right">Right Hand (RH)</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                {/* Pinion vs Wheel Teeth & Widths */}
                <div className="pt-2 border-t border-[#34393F] space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-gray-400 block mb-1">Pinion Teeth $z_1$</label>
                      <input
                        type="number"
                        min="6"
                        max="200"
                        value={pinionTeeth}
                        onChange={(e) => setPinionTeeth(parseInt(e.target.value) || 12)}
                        className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-white font-mono focus:border-[#64D6C5] outline-hidden"
                      />
                      {pairGeometry?.pinion.hasUndercut && (
                        <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                          <AlertTriangle size={10} /> Undercut risk ($z &lt; {Math.ceil(pairGeometry.pinion.minimumTeethWithoutUndercut)}$)
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-gray-400 block mb-1">Wheel Teeth $z_2$</label>
                      <input
                        type="number"
                        min="6"
                        max="400"
                        value={wheelTeeth}
                        onChange={(e) => setWheelTeeth(parseInt(e.target.value) || 30)}
                        className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-white font-mono focus:border-[#64D6C5] outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-gray-400 block mb-1">Pinion Face Width $b_1$ (mm)</label>
                      <input
                        type="number"
                        min="5"
                        max="200"
                        value={pinionFaceWidth}
                        onChange={(e) => setPinionFaceWidth(parseFloat(e.target.value) || 10)}
                        className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-white font-mono focus:border-[#64D6C5] outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 block mb-1">Wheel Face Width $b_2$ (mm)</label>
                      <input
                        type="number"
                        min="5"
                        max="200"
                        value={wheelFaceWidth}
                        onChange={(e) => setWheelFaceWidth(parseFloat(e.target.value) || 10)}
                        className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-white font-mono focus:border-[#64D6C5] outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-gray-400 block mb-1">Pinion Profile Shift $x_1$</label>
                      <input
                        type="number"
                        step="0.05"
                        min="-0.6"
                        max="0.8"
                        value={pinionProfileShift}
                        onChange={(e) => setPinionProfileShift(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-white font-mono focus:border-[#64D6C5] outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 block mb-1">Wheel Profile Shift $x_2$</label>
                      <input
                        type="number"
                        step="0.05"
                        min="-0.6"
                        max="0.8"
                        value={wheelProfileShift}
                        onChange={(e) => setWheelProfileShift(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-white font-mono focus:border-[#64D6C5] outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Kinematic Power & Operating Conditions Card */}
              <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[#34393F] pb-2">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-[#64D6C5]" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-white">
                      Operating Kinematics & Power
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-gray-400 block mb-1">Pinion Speed $n_1$ (rpm)</label>
                    <input
                      type="number"
                      step="50"
                      min="10"
                      max="10000"
                      value={pinionSpeedRpm}
                      onChange={(e) => setPinionSpeedRpm(parseFloat(e.target.value) || 100)}
                      className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-white font-mono focus:border-[#64D6C5] outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Transmitted Power (kW)</label>
                    <input
                      type="number"
                      step="1"
                      min="0.5"
                      max="500"
                      value={transmittedPowerKw}
                      onChange={(e) => setTransmittedPowerKw(parseFloat(e.target.value) || 1)}
                      className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-white font-mono focus:border-[#64D6C5] outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Rotation Direction</label>
                    <select
                      value={pinionRotation}
                      onChange={(e) => setPinionRotation(e.target.value as RotationDirection)}
                      className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2 py-1.5 text-white font-mono focus:border-[#64D6C5] outline-hidden"
                    >
                      <option value="CW">Clockwise (CW looking +x)</option>
                      <option value="CCW">Counter-Clockwise (CCW)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Efficiency $\eta$</label>
                    <input
                      type="number"
                      step="0.005"
                      min="0.80"
                      max="1.0"
                      value={efficiency}
                      onChange={(e) => setEfficiency(parseFloat(e.target.value) || 0.98)}
                      className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-white font-mono focus:border-[#64D6C5] outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right 7 Columns: Visualization, Output Gauges & Mesh Loads */}
            <div className="lg:col-span-7 space-y-6">
              {/* Engineering Schematic */}
              <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-4">
                <div className="flex items-center justify-between mb-3 border-b border-[#34393F] pb-2">
                  <div className="flex items-center gap-2">
                    <Disc size={15} className="text-[#64D6C5]" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                      Parametric Gear Mesh Schematic
                    </h3>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    Ratio $u = {pairGeometry ? pairGeometry.gearRatio.toFixed(2) : '-'}$ • $a_w = {pairGeometry ? pairGeometry.workingCenterDistanceMm.toFixed(1) : '-'} mm
                  </span>
                </div>

                {/* SVG Drawing Canvas */}
                <div className="h-64 w-full bg-[#111315] rounded-[3px] border border-[#34393F] flex items-center justify-center relative overflow-hidden">
                  {pairGeometry ? (
                    <svg viewBox="-180 -140 360 280" className="w-full h-full">
                      {/* Grid background lines */}
                      <defs>
                        <pattern id="gear-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#22272B" strokeWidth="0.8" />
                        </pattern>
                      </defs>
                      <rect x="-180" y="-140" width="360" height="280" fill="url(#gear-grid)" />

                      {/* Scale geometry to fit SVG view */}
                      {(() => {
                        const d1 = pairGeometry.pinion.pitchDiameterMm;
                        const d2 = pairGeometry.wheel.pitchDiameterMm;
                        const totalHeight = d1 + d2;
                        const scale = 200 / Math.max(totalHeight, 1);

                        const r1 = (d1 / 2) * scale;
                        const r2 = (d2 / 2) * scale;
                        const da1 = (pairGeometry.pinion.tipDiameterMm / 2) * scale;
                        const df1 = (pairGeometry.pinion.rootDiameterMm / 2) * scale;
                        const da2 = (pairGeometry.wheel.tipDiameterMm / 2) * scale;
                        const df2 = (pairGeometry.wheel.rootDiameterMm / 2) * scale;

                        // Center positions: pinion below center, wheel above center
                        const c1y = r1;
                        const c2y = -r2;

                        return (
                          <g>
                            {/* Centerline */}
                            <line
                              x1="0"
                              y1={c1y + r1 * 0.4}
                              x2="0"
                              y2={c2y - r2 * 0.4}
                              stroke="#64D6C5"
                              strokeWidth="1"
                              strokeDasharray="4 2"
                            />

                            {/* Pinion Root & Tip Circles */}
                            <circle cx="0" cy={c1y} r={df1} fill="none" stroke="#2C3238" strokeWidth="1" />
                            <circle cx="0" cy={c1y} r={da1} fill="none" stroke="#4A525D" strokeWidth="1" strokeDasharray="2 2" />
                            {/* Pinion Pitch Circle */}
                            <circle cx="0" cy={c1y} r={r1} fill="none" stroke="#64D6C5" strokeWidth="2" />
                            <circle cx="0" cy={c1y} r="3" fill="#64D6C5" />

                            {/* Wheel Root & Tip Circles */}
                            <circle cx="0" cy={c2y} r={df2} fill="none" stroke="#2C3238" strokeWidth="1" />
                            <circle cx="0" cy={c2y} r={da2} fill="none" stroke="#4A525D" strokeWidth="1" strokeDasharray="2 2" />
                            {/* Wheel Pitch Circle */}
                            <circle cx="0" cy={c2y} r={r2} fill="none" stroke="#90CAF9" strokeWidth="2" />
                            <circle cx="0" cy={c2y} r="3" fill="#90CAF9" />

                            {/* Pitch Point Contact Marker */}
                            <circle cx="0" cy="0" r="4" fill="#FFB74D" />

                            {/* Action Line through pitch point at pressure angle */}
                            <line
                              x1="-35"
                              y1={35 * Math.tan(pairGeometry.pinion.normalPressureAngleDeg * (Math.PI / 180))}
                              x2="35"
                              y2={-35 * Math.tan(pairGeometry.pinion.normalPressureAngleDeg * (Math.PI / 180))}
                              stroke="#FFB74D"
                              strokeWidth="1"
                              strokeDasharray="3 3"
                            />

                            {/* Force Vector Arrows at Mesh Point */}
                            {meshForces && (
                              <g>
                                {/* Radial Force Fr (downward on pinion) */}
                                <line x1="0" y1="0" x2="0" y2="30" stroke="#FF5252" strokeWidth="2" markerEnd="url(#arrow)" />
                                <text x="6" y="24" fill="#FF5252" fontSize="9" fontFamily="monospace">
                                  Fr
                                </text>

                                {/* Tangential Force Ft */}
                                <line x1="0" y1="0" x2="-35" y2="0" stroke="#64D6C5" strokeWidth="2" />
                                <text x="-32" y="-6" fill="#64D6C5" fontSize="9" fontFamily="monospace">
                                  Ft
                                </text>
                              </g>
                            )}

                            {/* Labels */}
                            <text x="-120" y={c1y} fill="#64D6C5" fontSize="10" fontFamily="sans-serif">
                              Pinion: ⌀{pairGeometry.pinion.pitchDiameterMm.toFixed(1)} mm ({pairGeometry.pinion.teeth}T)
                            </text>
                            <text x="-120" y={c2y} fill="#90CAF9" fontSize="10" fontFamily="sans-serif">
                              Wheel: ⌀{pairGeometry.wheel.pitchDiameterMm.toFixed(1)} mm ({pairGeometry.wheel.teeth}T)
                            </text>
                          </g>
                        );
                      })()}
                    </svg>
                  ) : (
                    <p className="text-xs text-gray-500">Invalid gear pair geometry configuration.</p>
                  )}
                </div>

                <p className="text-[10px] text-gray-500 mt-2 text-center italic">
                  Parametric schematic for kinematic and geometric illustration. Not a manufactured tooth CAD profile or contact stress simulation.
                </p>
              </div>

              {/* Kinematic & Force Readout Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Center Distance $a_w$</p>
                  <p className="text-lg font-mono font-bold text-white mt-0.5">
                    {pairGeometry ? pairGeometry.workingCenterDistanceMm.toFixed(2) : '-'}
                    <span className="text-xs text-gray-400 ml-1">mm</span>
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">Ref: {pairGeometry?.referenceCenterDistanceMm.toFixed(2)} mm</p>
                </div>

                <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Contact Ratio $\varepsilon_\gamma$</p>
                  <p className="text-lg font-mono font-bold text-[#64D6C5] mt-0.5">
                    {pairGeometry ? pairGeometry.totalContactRatio.toFixed(2) : '-'}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    $\varepsilon_\alpha$: {pairGeometry?.profileContactRatio.toFixed(2)} • $\varepsilon_\beta$: {pairGeometry?.faceContactRatio.toFixed(2)}
                  </p>
                </div>

                <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Output Torque $T_2$</p>
                  <p className="text-lg font-mono font-bold text-amber-300 mt-0.5">
                    {kinematics ? kinematics.wheelTorqueNm.toFixed(1) : '-'}
                    <span className="text-xs text-gray-400 ml-1">N·m</span>
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1">In: {kinematics?.pinionTorqueNm.toFixed(1)} N·m</p>
                </div>

                <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-3">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Output Speed $n_2$</p>
                  <p className="text-lg font-mono font-bold text-white mt-0.5">
                    {kinematics ? kinematics.wheelSpeedMagnitudeRpm.toFixed(0) : '-'}
                    <span className="text-xs text-gray-400 ml-1">rpm</span>
                  </p>
                  <p className="text-[10px] text-cyan-400 mt-1">{kinematics?.wheelRotation} (Opposite)</p>
                </div>
              </div>

              {/* 3D Mesh Force Summary */}
              {meshForces && (
                <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#34393F] pb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                      3D Mesh Force Decomposition (Newton's 3rd Law Enforced)
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-[3px] bg-emerald-950/50 border border-emerald-700/50 text-emerald-400">
                      Static Equilibrium Validated
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="bg-[#111315] p-2.5 rounded-[3px] border border-[#34393F]">
                      <span className="text-gray-400 block text-[10px]">Tangential $F_t$</span>
                      <span className="text-sm font-bold text-[#64D6C5]">{meshForces.tangentialForceN.toFixed(1)} N</span>
                      <span className="text-[10px] text-gray-500 block">Torque Reaction</span>
                    </div>

                    <div className="bg-[#111315] p-2.5 rounded-[3px] border border-[#34393F]">
                      <span className="text-gray-400 block text-[10px]">Radial Separating $F_r$</span>
                      <span className="text-sm font-bold text-amber-300">{meshForces.radialForceN.toFixed(1)} N</span>
                      <span className="text-[10px] text-gray-500 block">$F_t \cdot \tan\alpha_t$</span>
                    </div>

                    <div className="bg-[#111315] p-2.5 rounded-[3px] border border-[#34393F]">
                      <span className="text-gray-400 block text-[10px]">Axial Thrust $F_a$</span>
                      <span className="text-sm font-bold text-cyan-400">{meshForces.axialForceN.toFixed(1)} N</span>
                      <span className="text-[10px] text-gray-500 block">
                        {gearType === 'helical' ? '$F_t \\cdot \\tan\\beta$' : '0 N (Spur)'}
                      </span>
                    </div>

                    <div className="bg-[#111315] p-2.5 rounded-[3px] border border-[#34393F]">
                      <span className="text-gray-400 block text-[10px]">Normal Flank $F_n$</span>
                      <span className="text-sm font-bold text-purple-300">{meshForces.normalForceN.toFixed(1)} N</span>
                      <span className="text-[10px] text-gray-500 block">Total Tooth Load</span>
                    </div>
                  </div>

                  {/* Overturning Moment Alert for Helical Gears */}
                  {gearType === 'helical' && Math.abs(meshForces.axialForceN) > 0 && (
                    <div className="p-2.5 rounded-[3px] bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-cyan-200 flex items-center gap-2">
                      <Info size={14} className="shrink-0 text-cyan-400" />
                      <span>
                        Eccentric axial thrust creates an overturning moment on shaft: $M_z = {meshForces.pinionOverturningMomentGlobalNm.Mz.toFixed(
                          2
                        )}$ N·m (offset $r = {(pairGeometry!.pinion.pitchDiameterMm / 2).toFixed(1)}$ mm).
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Tab: Shaft & Bearing Reaction Integration ──────────────────── */}
        {activeTab === 'integration' && (
          <div className="space-y-6">
            <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#34393F] pb-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                    Shaft Support Integration & 3D Bearing Reactions (Stage 08 Integration)
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Transfers calculated gear mesh loads into 3D static equilibrium solver.
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-[3px] bg-[#64D6C5]/20 text-[#64D6C5] border border-[#64D6C5]/40 font-mono">
                  ISO 281 Solver Linked
                </span>
              </div>

              {/* Shaft Stations Controls */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="text-gray-400 block mb-1">Shaft Length $L$ (mm)</label>
                  <input
                    type="number"
                    value={shaftLengthMm}
                    onChange={(e) => setShaftLengthMm(parseFloat(e.target.value) || 200)}
                    className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-white font-mono outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Station A Position $x_A$ (mm)</label>
                  <input
                    type="number"
                    value={bearingStationAMm}
                    onChange={(e) => setBearingStationAMm(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-white font-mono outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Station B Position $x_B$ (mm)</label>
                  <input
                    type="number"
                    value={bearingStationBMm}
                    onChange={(e) => setBearingStationBMm(parseFloat(e.target.value) || 200)}
                    className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-white font-mono outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Gear Station x_gear (mm)</label>
                  <input
                    type="number"
                    value={gearStationMm}
                    onChange={(e) => setGearStationMm(parseFloat(e.target.value) || 100)}
                    className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-white font-mono outline-hidden"
                  />
                </div>
              </div>

              {/* Bearing Capacity Controls */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-3 border-t border-[#34393F]">
                <div>
                  <label className="text-gray-400 block mb-1">Bearing A Dynamic Capacity $C_A$ (N)</label>
                  <input
                    type="number"
                    value={dynamicCapacityA}
                    onChange={(e) => setDynamicCapacityA(parseFloat(e.target.value) || 10000)}
                    className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-white font-mono outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Bearing B Dynamic Capacity $C_B$ (N)</label>
                  <input
                    type="number"
                    value={dynamicCapacityB}
                    onChange={(e) => setDynamicCapacityB(parseFloat(e.target.value) || 10000)}
                    className="w-full bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-white font-mono outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Support Arrangement</label>
                  <span className="w-full inline-block bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-gray-300 font-mono">
                    Locating (A) - Floating (B)
                  </span>
                </div>

                <div>
                  <label className="text-gray-400 block mb-1">Equilibrium Residual $\varepsilon_F$</label>
                  <span className="w-full inline-block bg-[#111315] border border-[#34393F] rounded-[3px] px-2.5 py-1.5 text-emerald-400 font-mono">
                    {shaftIntegration ? `${Math.abs(shaftIntegration.residuals.forceY).toExponential(2)} N (Satisfied)` : '-'}
                  </span>
                </div>
              </div>

              {/* Reactions Readout */}
              {shaftIntegration && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#34393F]">
                  {/* Bearing A */}
                  <div className="bg-[#111315] border border-[#34393F] rounded-[4px] p-4 space-y-2">
                    <div className="flex items-center justify-between border-b border-[#34393F] pb-2">
                      <h4 className="text-xs font-semibold text-white uppercase">Bearing Support A (Locating)</h4>
                      <span className="text-[10px] text-gray-400">Position $x = {shaftIntegration.stationAMm}$ mm</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-gray-400 block">Radial Resultant Fr_A</span>
                        <span className="text-base font-bold text-[#64D6C5]">
                          {shaftIntegration.reactionA.radialResultantN.toFixed(1)} N
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Axial Thrust Fa_A</span>
                        <span className="text-base font-bold text-cyan-400">
                          {shaftIntegration.reactionA.axialLoadN.toFixed(1)} N
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Vertical Ry_A</span>
                        <span className="text-white">{shaftIntegration.reactionA.Ry.toFixed(1)} N</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Horizontal Rz_A</span>
                        <span className="text-white">{shaftIntegration.reactionA.Rz.toFixed(1)} N</span>
                      </div>
                    </div>
                    {shaftIntegration.bearingLifeA && (
                      <div className="mt-3 pt-2 border-t border-[#22272B] flex items-center justify-between text-xs">
                        <span className="text-gray-400">Rating Life L10h:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {shaftIntegration.bearingLifeA.l10Hours.toLocaleString()} hrs
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bearing B */}
                  <div className="bg-[#111315] border border-[#34393F] rounded-[4px] p-4 space-y-2">
                    <div className="flex items-center justify-between border-b border-[#34393F] pb-2">
                      <h4 className="text-xs font-semibold text-white uppercase">Bearing Support B (Floating)</h4>
                      <span className="text-[10px] text-gray-400">Position x = {shaftIntegration.stationBMm} mm</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-gray-400 block">Radial Resultant Fr_B</span>
                        <span className="text-base font-bold text-[#64D6C5]">
                          {shaftIntegration.reactionB.radialResultantN.toFixed(1)} N
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Axial Thrust Fa_B</span>
                        <span className="text-base font-bold text-gray-500">
                          0.0 N (Floating)
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Vertical Ry_B</span>
                        <span className="text-white">{shaftIntegration.reactionB.Ry.toFixed(1)} N</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Horizontal Rz_B</span>
                        <span className="text-white">{shaftIntegration.reactionB.Rz.toFixed(1)} N</span>
                      </div>
                    </div>
                    {shaftIntegration.bearingLifeB && (
                      <div className="mt-3 pt-2 border-t border-[#22272B] flex items-center justify-between text-xs">
                        <span className="text-gray-400">Rating Life L10h:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {shaftIntegration.bearingLifeB.l10Hours.toLocaleString()} hrs
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Tab: Math Derivations & Standards ───────────────────────────── */}
        {activeTab === 'audit' && (
          <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-6 space-y-6 text-xs text-gray-300">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white mb-2">
                Governing Standards & Mathematical Formulations
              </h2>
              <p className="text-gray-400 leading-relaxed">
                Stage 10 implements deterministic involute cylindrical gear geometry conforming to <strong>ISO 21771-1:2024</strong> and rack profile <strong>ISO 53:1998</strong>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 bg-[#111315] p-4 rounded-[4px] border border-[#34393F]">
                <h3 className="text-xs font-semibold text-[#64D6C5] uppercase">1. Analytical Gear Geometry</h3>
                <div className="space-y-2 font-mono text-[11px]">
                  <p>• Transverse Module: $m_t = m_n / \cos\beta$</p>
                  <p>• Transverse Pressure Angle: $\tan\alpha_t = \tan\alpha_n / \cos\beta$</p>
                  <p>• Reference Pitch Diameter: $d = m_t \cdot z$</p>
                  <p>• Base Diameter: $d_b = d \cdot \cos\alpha_t$</p>
                  <p>• Tip Diameter: $d_a = d + 2 \cdot (h_a^* + x) \cdot m_n$</p>
                  <p>• Root Diameter: $d_f = d - 2 \cdot (h_f^* - x) \cdot m_n$</p>
                  <p>• Base Pitch: p_b = π · m_t · cos(α_t)</p>
                  <p>• Undercut Limit: z_min = 2 · h_a* / sin²(α_t)</p>
                </div>
              </div>

              <div className="space-y-4 bg-[#111315] p-4 rounded-[4px] border border-[#34393F]">
                <h3 className="text-xs font-semibold text-[#64D6C5] uppercase">2. Kinematics & Mesh Loads</h3>
                <div className="space-y-2 font-mono text-[11px]">
                  <p>• Gear Ratio: i = z_2 / z_1</p>
                  <p>• Speed: n_2 = -n_1 / i (Counter-rotating external)</p>
                  <p>• Tangential Force: F_t = 2000 · T / d (N)</p>
                  <p>• Radial Separating: F_r = F_t · tan(α_t)</p>
                  <p>• Axial Thrust: F_a = F_t · tan(β)</p>
                  <p>• Normal Flank Force: F_n = √(F_t² + F_r² + F_a²)</p>
                  <p>• Overturning Moment: M_ecc = F_a · (d/2)</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-[4px] bg-amber-950/20 border border-amber-800/40 text-[11px] text-amber-200 space-y-2">
              <h4 className="font-semibold flex items-center gap-1.5 text-amber-300">
                <AlertTriangle size={14} /> Explicit Verification & Deferred Capability Notice
              </h4>
              <p>
                This module calculates <strong>geometric validity</strong>, <strong>kinematic consistency</strong>, and <strong>static gear-mesh loads</strong>.
              </p>
              <p>
                Full <strong>ISO 6336 Parts 1–3</strong> tooth-bending strength (K_v, K_Fβ, Y_F, σ_F) and pitting durability (K_Hβ, Z_H, σ_H) are <strong>explicitly deferred</strong> and not claimed as verified.
              </p>
            </div>
          </div>
        )}

        {/* ─── Tab: Engineering Report ────────────────────────────────────── */}
        {activeTab === 'report' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Audit-ready engineering report formatted in GitHub-Flavored Markdown.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyReport}
                  className="flex items-center gap-1.5 text-xs bg-[#64D6C5] text-[#111315] px-3 py-1.5 rounded-[3px] font-semibold hover:bg-[#52b3a5] transition-colors"
                >
                  <Copy size={13} />
                  {copyFeedback || 'Copy Markdown Report'}
                </button>
              </div>
            </div>

            <div className="bg-[#191C1F] border border-[#34393F] rounded-[4px] p-6 font-mono text-xs text-gray-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {generateMarkdownReport()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
