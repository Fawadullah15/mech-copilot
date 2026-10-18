import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileDown,
  RotateCcw,
  Info,
  ShieldCheck,
  TrendingDown,
  Sliders,
  Layers,
  ArrowRight,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { useApp } from '../context/AppContext';
import {
  LoadingMode,
  MeanStressCriterion,
  NotchType,
  SurfaceFinish,
  SteppedShaftFilletGeometry,
  KeywayGeometry,
  SnDataPoint,
} from '../engineering/fatigue/types';
import {
  calculateSteppedShaftStressConcentration,
  calculateKeywayStressConcentration,
} from '../engineering/fatigue/stressConcentration';
import { calculateNotchSensitivity } from '../engineering/fatigue/notchSensitivity';
import {
  FATIGUE_MATERIALS_DATABASE,
  fitBasquinModel,
} from '../engineering/fatigue/fatigueData';
import { calculateMarinFactors } from '../engineering/fatigue/marinFactors';
import { evaluateFatigueLife } from '../engineering/fatigue/fatigueEvaluation';

export default function FatiguePage() {
  const { designParams, activeProject, allMaterials } = useApp();

  // Active material fatigue data
  const currentMaterial = useMemo(() => {
    return (
      FATIGUE_MATERIALS_DATABASE[designParams.materialId] ||
      FATIGUE_MATERIALS_DATABASE['aisi-4140']
    );
  }, [designParams.materialId]);

  // Notch & Discontinuity Configuration
  const [notchType, setNotchType] = useState<NotchType>('stepped_shoulder_fillet');
  const [loadingMode, setLoadingMode] = useState<LoadingMode>('bending');

  // Stepped shaft geometry state (initialized from active shaft dimensions)
  const [smallDiameterMm, setSmallDiameterMm] = useState<number>(designParams.diameter || 45);
  const [largeDiameterMm, setLargeDiameterMm] = useState<number>(
    Math.round(designParams.diameter * 1.25 * 10) / 10 || 56
  );
  const [filletRadiusMm, setFilletRadiusMm] = useState<number>(2.5);

  // Keyway geometry state
  const [keywayCornerRadiusMm, setKeywayCornerRadiusMm] = useState<number>(1.0);
  const [keywayDepthMm, setKeywayDepthMm] = useState<number>(5.0);

  // Marin factors configuration
  const [surfaceFinish, setSurfaceFinish] = useState<SurfaceFinish>('machined');
  const [reliabilityPercent, setReliabilityPercent] = useState<number>(90);
  const [operatingTempC, setOperatingTempC] = useState<number>(designParams.temperature || 20);

  // Mean-stress criterion
  const [criterion, setCriterion] = useState<MeanStressCriterion>('goodman');

  // Cyclic loading state: alternating and mean bending moment / torques
  const [bendingMomentMinNm, setBendingMomentMinNm] = useState<number>(
    -Math.round((designParams.force * (designParams.length / 1000)) / 4) || -200
  );
  const [bendingMomentMaxNm, setBendingMomentMaxNm] = useState<number>(
    Math.round((designParams.force * (designParams.length / 1000)) / 4) || 200
  );

  // Custom S-N dataset support
  const [customPoints, setCustomPoints] = useState<SnDataPoint[]>([]);
  const [isUsingCustomCurve, setIsUsingCustomCurve] = useState<boolean>(false);
  const [newPointCycles, setNewPointCycles] = useState<number>(1e4);
  const [newPointStress, setNewPointStress] = useState<number>(400);

  // 1. Calculate Stress Concentrations
  const stressConcResult = useMemo(() => {
    if (notchType === 'stepped_shoulder_fillet') {
      const geom: SteppedShaftFilletGeometry = {
        smallDiameterMm,
        largeDiameterMm,
        filletRadiusMm,
        dProvenance: 'imported',
        DProvenance: 'user-entered',
        rProvenance: 'user-entered',
      };
      return calculateSteppedShaftStressConcentration(geom, loadingMode);
    } else {
      const geom: KeywayGeometry = {
        shaftDiameterMm: smallDiameterMm,
        keywayWidthMm: Math.round(smallDiameterMm / 4),
        keywayDepthMm: keywayDepthMm,
        filletRadiusMm: keywayCornerRadiusMm,
        keywayType: notchType as 'profile_keyway' | 'sled_runner_keyway',
        provenance: 'calculated',
      };
      return calculateKeywayStressConcentration(geom, loadingMode);
    }
  }, [
    notchType,
    loadingMode,
    smallDiameterMm,
    largeDiameterMm,
    filletRadiusMm,
    keywayCornerRadiusMm,
    keywayDepthMm,
  ]);

  // 2. Calculate Notch Sensitivity & Fatigue Concentration Factors
  const notchSensResult = useMemo(() => {
    const effectiveRadius =
      notchType === 'stepped_shoulder_fillet' ? filletRadiusMm : keywayCornerRadiusMm;
    return calculateNotchSensitivity(
      stressConcResult.kt,
      stressConcResult.kts,
      effectiveRadius,
      currentMaterial.tensileStrengthMpa,
      currentMaterial.materialName
    );
  }, [stressConcResult, filletRadiusMm, keywayCornerRadiusMm, currentMaterial]);

  // 3. Calculate Marin Factors & Fully Modified Endurance Limit Se
  const marinResult = useMemo(() => {
    return calculateMarinFactors({
      unmodifiedEnduranceLimitMpa: currentMaterial.unmodifiedEnduranceLimitMpa,
      sutMpa: currentMaterial.tensileStrengthMpa,
      diameterMm: smallDiameterMm,
      surfaceFinish,
      loadingMode,
      operatingTempC,
      reliabilityPercent,
    });
  }, [
    currentMaterial,
    smallDiameterMm,
    surfaceFinish,
    loadingMode,
    operatingTempC,
    reliabilityPercent,
  ]);

  // 4. Calculate Nominal Alternating and Mean Stresses
  // For solid circular shaft: sigma = 32 * M / (pi * d^3)
  const dMeters = smallDiameterMm / 1000;
  const sectionModulusZ = (Math.PI * Math.pow(dMeters, 3)) / 32;

  const maxNominalStressMpa = useMemo(() => {
    return (bendingMomentMaxNm / sectionModulusZ) / 1e6;
  }, [bendingMomentMaxNm, sectionModulusZ]);

  const minNominalStressMpa = useMemo(() => {
    return (bendingMomentMinNm / sectionModulusZ) / 1e6;
  }, [bendingMomentMinNm, sectionModulusZ]);

  const nominalAltStress = (maxNominalStressMpa - minNominalStressMpa) / 2;
  const nominalMeanStress = (maxNominalStressMpa + minNominalStressMpa) / 2;

  // 5. Evaluate Fatigue Life & Safety Factor
  const activeMaterialModel = useMemo(() => {
    if (isUsingCustomCurve && customPoints.length >= 2) {
      const fit = fitBasquinModel(customPoints);
      if (fit.success) {
        return {
          ...currentMaterial,
          basquinA: fit.basquinA,
          basquinB: fit.basquinB,
          validCycleRange: fit.validCycleRange,
        };
      }
    }
    return currentMaterial;
  }, [currentMaterial, isUsingCustomCurve, customPoints]);

  const fatigueEvalResult = useMemo(() => {
    return evaluateFatigueLife({
      nominalAlternatingStressMpa: Math.abs(nominalAltStress),
      nominalMeanStressMpa: nominalMeanStress,
      kf: notchSensResult.kf,
      modifiedEnduranceLimitMpa: marinResult.modifiedEnduranceLimitMpa,
      material: activeMaterialModel,
      criterion,
      rpm: designParams.rpm,
    });
  }, [
    nominalAltStress,
    nominalMeanStress,
    notchSensResult.kf,
    marinResult.modifiedEnduranceLimitMpa,
    activeMaterialModel,
    criterion,
    designParams.rpm,
  ]);

  // 6. Generate S-N Curve Plot Data
  const snChartData = useMemo(() => {
    const data: Array<{
      logN: number;
      cycles: number;
      specimenStress: number;
      componentStress: number;
    }> = [];

    const cycleSteps = [
      1e3, 2e3, 5e3, 1e4, 2e4, 5e4, 1e5, 2e5, 5e5, 1e6, 2e6, 5e6, 1e7,
    ];

    const Se_component = marinResult.modifiedEnduranceLimitMpa;
    const Se_specimen = currentMaterial.unmodifiedEnduranceLimitMpa;

    for (const N of cycleSteps) {
      // Specimen curve
      let sSpecimen = currentMaterial.basquinA * Math.pow(N, currentMaterial.basquinB);
      if (currentMaterial.hasEndurancePlateau && N >= currentMaterial.enduranceCycles) {
        sSpecimen = Se_specimen;
      }

      // Component curve (derated by Marin factors and Kf)
      let sComponent = sSpecimen * (Se_component / Math.max(1, Se_specimen));
      if (currentMaterial.hasEndurancePlateau && N >= currentMaterial.enduranceCycles) {
        sComponent = Se_component;
      }

      data.push({
        logN: Math.log10(N),
        cycles: N,
        specimenStress: Math.round(sSpecimen * 10) / 10,
        componentStress: Math.round(sComponent * 10) / 10,
      });
    }

    return data;
  }, [currentMaterial, marinResult]);

  // Operating point for plot
  const operatingPoint = useMemo(() => {
    const stress = fatigueEvalResult.equivalentReversedStressMpa;
    const cycles =
      typeof fatigueEvalResult.estimatedCycles === 'number'
        ? fatigueEvalResult.estimatedCycles
        : 1e7;
    return {
      logN: Math.log10(Math.max(1e3, Math.min(1e7, cycles))),
      stress,
    };
  }, [fatigueEvalResult]);

  // Reset to active design defaults
  const handleResetDefaults = () => {
    setSmallDiameterMm(designParams.diameter || 45);
    setLargeDiameterMm(Math.round(designParams.diameter * 1.25 * 10) / 10 || 56);
    setFilletRadiusMm(2.5);
    setSurfaceFinish('machined');
    setReliabilityPercent(90);
    setOperatingTempC(designParams.temperature || 20);
    setCriterion('goodman');
  };

  // Add custom point
  const handleAddCustomPoint = () => {
    if (newPointCycles > 0 && newPointStress > 0) {
      setCustomPoints((prev) => [
        ...prev,
        { cycles: newPointCycles, stressMpa: newPointStress, source: 'User Entered' },
      ]);
    }
  };

  // Export JSON Report
  const handleExportJson = () => {
    const report = {
      project: activeProject.name,
      timestamp: new Date().toISOString(),
      geometry: {
        notchType,
        loadingMode,
        smallDiameterMm,
        largeDiameterMm,
        filletRadiusMm,
        rOverD: stressConcResult.rOverD,
        DOverD: stressConcResult.DOverD,
      },
      stressConcentration: {
        kt: stressConcResult.kt,
        kts: stressConcResult.kts,
        isSupported: stressConcResult.isSupported,
        source: stressConcResult.sourceReference,
      },
      notchSensitivity: {
        model: notchSensResult.model,
        q: notchSensResult.q,
        qs: notchSensResult.qs,
        kf: notchSensResult.kf,
        kfs: notchSensResult.kfs,
      },
      material: {
        id: currentMaterial.materialId,
        name: currentMaterial.materialName,
        sut: currentMaterial.tensileStrengthMpa,
        sy: currentMaterial.yieldStrengthMpa,
        unmodifiedEnduranceLimit: currentMaterial.unmodifiedEnduranceLimitMpa,
        hasEndurancePlateau: currentMaterial.hasEndurancePlateau,
      },
      marinFactors: {
        ka: marinResult.ka,
        kb: marinResult.kb,
        kc: marinResult.kc,
        kd: marinResult.kd,
        ke: marinResult.ke,
        modifiedEnduranceLimit: marinResult.modifiedEnduranceLimitMpa,
      },
      cyclicLoading: {
        bendingMomentMinNm,
        bendingMomentMaxNm,
        nominalAlternatingStressMpa: fatigueEvalResult.nominalAlternatingStressMpa,
        nominalMeanStressMpa: fatigueEvalResult.nominalMeanStressMpa,
        peakAlternatingStressMpa: fatigueEvalResult.peakAlternatingStressMpa,
        peakMeanStressMpa: fatigueEvalResult.peakMeanStressMpa,
        stressRatioR: fatigueEvalResult.stressRatioR,
      },
      evaluation: {
        criterion: fatigueEvalResult.criterion,
        fatigueSafetyFactor: fatigueEvalResult.fatigueSafetyFactor,
        staticYieldSafetyFactor: fatigueEvalResult.staticYieldSafetyFactor,
        isInfiniteLife: fatigueEvalResult.isInfiniteLife,
        estimatedCycles: fatigueEvalResult.estimatedCycles,
        estimatedHours: fatigueEvalResult.estimatedHours,
        equivalentReversedStressMpa: fatigueEvalResult.equivalentReversedStressMpa,
        warnings: fatigueEvalResult.warnings,
        assumptions: fatigueEvalResult.assumptions,
      },
      disclaimer:
        'Calculations represent constant-amplitude high-cycle stress-life estimates. Certified component life requires empirical multi-axial fatigue qualification testing.',
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fatigue_Report_${activeProject.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-navy-950 p-6 text-gray-100">
      {/* Header Banner */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-navy-800 pb-5 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/15 p-2 text-accent">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Dynamic Fatigue Life & S–N Curve Workstation
              </h1>
              <p className="text-sm text-gray-400">
                Stress Concentrations (Kt, Kts), Peterson Notch Sensitivity (q), Marin Modifiers & Mean-Stress Criteria (Shigley Ch. 6)
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mean Stress Criterion Switcher */}
          <div className="flex items-center rounded-lg border border-navy-700 bg-navy-900 p-1 text-xs font-semibold">
            <button
              onClick={() => setCriterion('goodman')}
              className={`rounded-md px-2.5 py-1.5 transition-colors ${
                criterion === 'goodman'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Goodman
            </button>
            <button
              onClick={() => setCriterion('gerber')}
              className={`rounded-md px-2.5 py-1.5 transition-colors ${
                criterion === 'gerber'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Gerber
            </button>
            <button
              onClick={() => setCriterion('soderberg')}
              className={`rounded-md px-2.5 py-1.5 transition-colors ${
                criterion === 'soderberg'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Soderberg
            </button>
            <button
              onClick={() => setCriterion('asme_elliptic')}
              className={`rounded-md px-2.5 py-1.5 transition-colors ${
                criterion === 'asme_elliptic'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ASME
            </button>
          </div>

          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 rounded-lg border border-navy-700 bg-navy-900 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
          >
            <RotateCcw size={14} />
            Reset Defaults
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 transition-colors shadow-sm"
          >
            <FileDown size={14} />
            Export Report (JSON)
          </button>
        </div>
      </div>

      {/* Main Grid: 12 Cols */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Geometry, Notch & Marin Modifiers (5 Cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Discontinuity Geometry & Schematic Panel */}
          <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-5 backdrop-blur-xs">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Sliders className="text-accent" size={18} />
                Shaft Discontinuity & Notch Model
              </h2>
              <span className="rounded bg-navy-800 px-2 py-0.5 text-xs font-mono text-cyan-400">
                {notchType === 'stepped_shoulder_fillet' ? 'Shoulder Fillet' : 'Keyway Slot'}
              </span>
            </div>

            {/* Technical Notch Schematic */}
            <div className="mb-4 rounded-lg border border-navy-700 bg-navy-950 p-4 flex flex-col items-center">
              <svg viewBox="0 0 360 140" className="w-full h-32 stroke-cyan-400 fill-none">
                {/* Centerline */}
                <line x1="20" y1="70" x2="340" y2="70" stroke="#4b5563" strokeDasharray="6 4" strokeWidth="1" />
                
                {/* Stepped Shaft Profile */}
                <path
                  d="M 30,30 L 160,30 Q 170,30 170,45 L 170,45 Q 170,55 180,55 L 330,55 L 330,85 L 180,85 Q 170,85 170,95 L 170,95 Q 170,110 160,110 L 30,110 Z"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  fill="#0f172a"
                />

                {/* Notch Root Red Highlight */}
                <circle cx="173" cy="52" r="5" fill="#ef4444" stroke="#f87171" strokeWidth="1.5" />
                <circle cx="173" cy="88" r="5" fill="#ef4444" stroke="#f87171" strokeWidth="1.5" />

                {/* Dimension Arrows */}
                {/* Large Diameter D */}
                <line x1="20" y1="30" x2="20" y2="110" stroke="#94a3b8" strokeWidth="1" />
                <text x="10" y="74" fill="#94a3b8" fontSize="10" fontFamily="monospace" textAnchor="end">
                  ⌀D={largeDiameterMm}
                </text>

                {/* Small Diameter d */}
                <line x1="338" y1="55" x2="338" y2="85" stroke="#94a3b8" strokeWidth="1" />
                <text x="345" y="74" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                  ⌀d={smallDiameterMm}
                </text>

                {/* Fillet Radius Callout */}
                <text x="180" y="38" fill="#ef4444" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  r = {filletRadiusMm} mm
                </text>
              </svg>
              <span className="mt-1 text-[10px] text-gray-500 font-mono">
                Schematic Drawing (Linear Elastic Notched Boundary — Not an FEA Mesh)
              </span>
            </div>

            {/* Geometry Inputs */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-gray-400">Discontinuity Family</label>
                  <select
                    value={notchType}
                    onChange={(e) => setNotchType(e.target.value as NotchType)}
                    className="w-full rounded-lg border border-navy-700 bg-navy-950 px-2.5 py-1.5 text-white"
                  >
                    <option value="stepped_shoulder_fillet">Stepped Shoulder Fillet</option>
                    <option value="profile_keyway">Profile Keyway (End-Milled)</option>
                    <option value="sled_runner_keyway">Sled-Runner Keyway</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-gray-400">Primary Cyclic Load</label>
                  <select
                    value={loadingMode}
                    onChange={(e) => setLoadingMode(e.target.value as LoadingMode)}
                    className="w-full rounded-lg border border-navy-700 bg-navy-950 px-2.5 py-1.5 text-white"
                  >
                    <option value="bending">Rotating Bending</option>
                    <option value="torsion">Torsional Shear</option>
                    <option value="axial">Axial Push-Pull</option>
                  </select>
                </div>
              </div>

              {notchType === 'stepped_shoulder_fillet' ? (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block mb-1 text-gray-400">Small Dia (d, mm)</label>
                    <input
                      type="number"
                      value={smallDiameterMm}
                      onChange={(e) => setSmallDiameterMm(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-navy-700 bg-navy-950 px-2.5 py-1.5 font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-400">Large Dia (D, mm)</label>
                    <input
                      type="number"
                      value={largeDiameterMm}
                      onChange={(e) => setLargeDiameterMm(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-navy-700 bg-navy-950 px-2.5 py-1.5 font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-400">Fillet Radius (r, mm)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={filletRadiusMm}
                      onChange={(e) => setFilletRadiusMm(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-navy-700 bg-navy-950 px-2.5 py-1.5 font-mono text-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 text-gray-400">Shaft Diameter (d, mm)</label>
                    <input
                      type="number"
                      value={smallDiameterMm}
                      onChange={(e) => setSmallDiameterMm(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-navy-700 bg-navy-950 px-2.5 py-1.5 font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-400">Corner Fillet (rk, mm)</label>
                    <input
                      type="number"
                      step="0.2"
                      value={keywayCornerRadiusMm}
                      onChange={(e) => setKeywayCornerRadiusMm(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-navy-700 bg-navy-950 px-2.5 py-1.5 font-mono text-white"
                    />
                  </div>
                </div>
              )}

              {/* Concentration Factors Results Grid */}
              <div className="mt-4 grid grid-cols-2 gap-2.5 pt-2">
                <div className="rounded-lg border border-navy-800 bg-navy-950 p-2.5">
                  <div className="text-[11px] text-gray-400">Elastic Factor (Kt)</div>
                  <div className="text-xl font-bold font-mono text-white">
                    {stressConcResult.isSupported ? stressConcResult.kt : 'Out of Domain'}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    D/d={stressConcResult.DOverD}, r/d={stressConcResult.rOverD}
                  </div>
                </div>

                <div className="rounded-lg border border-navy-800 bg-navy-950 p-2.5">
                  <div className="text-[11px] text-gray-400">Notch Sensitivity (q)</div>
                  <div className="text-xl font-bold font-mono text-accent">
                    {notchSensResult.q}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    Peterson a={notchSensResult.materialConstantMm} mm
                  </div>
                </div>

                <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-2.5">
                  <div className="text-[11px] text-cyan-300">Fatigue Factor (Kf)</div>
                  <div className="text-2xl font-bold font-mono text-cyan-400">
                    {notchSensResult.kf}
                  </div>
                  <div className="text-[10px] text-cyan-500/80 font-mono">
                    Kf = 1 + q(Kt - 1)
                  </div>
                </div>

                <div className="rounded-lg border border-navy-800 bg-navy-950 p-2.5">
                  <div className="text-[11px] text-gray-400">Torsion Fatigue (Kfs)</div>
                  <div className="text-xl font-bold font-mono text-white">
                    {notchSensResult.kfs}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">
                    qs = {notchSensResult.qs}
                  </div>
                </div>
              </div>

              {!stressConcResult.isSupported && (
                <div className="flex items-start gap-2 rounded-lg bg-red-950/40 border border-red-500/40 p-2.5 text-xs text-red-300">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{stressConcResult.outOfRangeReason}</span>
                </div>
              )}
            </div>
          </div>

          {/* Marin Endurance Modification Factors Panel */}
          <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-5 backdrop-blur-xs">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="text-emerald-400" size={18} />
                Marin Modifiers & Endurance Limit (Se)
              </h2>
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-mono font-semibold text-emerald-400 border border-emerald-500/30">
                Se = {marinResult.modifiedEnduranceLimitMpa} MPa
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-gray-400">Surface Finish</label>
                  <select
                    value={surfaceFinish}
                    onChange={(e) => setSurfaceFinish(e.target.value as SurfaceFinish)}
                    className="w-full rounded-lg border border-navy-700 bg-navy-950 px-2.5 py-1.5 text-white"
                  >
                    <option value="ground">Ground (Fine Precision)</option>
                    <option value="machined">Machined / Cold-Drawn</option>
                    <option value="hot-rolled">Hot-Rolled</option>
                    <option value="as-forged">As-Forged</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-gray-400">Target Reliability (%)</label>
                  <select
                    value={reliabilityPercent}
                    onChange={(e) => setReliabilityPercent(parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-navy-700 bg-navy-950 px-2.5 py-1.5 text-white font-mono"
                  >
                    <option value="50">50% (Standard Mean, ke=1.000)</option>
                    <option value="90">90% (ke=0.897)</option>
                    <option value="95">95% (ke=0.868)</option>
                    <option value="99">99% (ke=0.814)</option>
                    <option value="99.9">99.9% (ke=0.753)</option>
                  </select>
                </div>
              </div>

              {/* Factors Breakdown Grid */}
              <div className="grid grid-cols-5 gap-2 text-center pt-2">
                <div className="rounded-lg bg-navy-950 p-2 border border-navy-800">
                  <div className="text-[10px] text-gray-400">ka (Surf)</div>
                  <div className="font-mono font-bold text-sm text-cyan-400">{marinResult.ka}</div>
                </div>
                <div className="rounded-lg bg-navy-950 p-2 border border-navy-800">
                  <div className="text-[10px] text-gray-400">kb (Size)</div>
                  <div className="font-mono font-bold text-sm text-cyan-400">{marinResult.kb}</div>
                </div>
                <div className="rounded-lg bg-navy-950 p-2 border border-navy-800">
                  <div className="text-[10px] text-gray-400">kc (Load)</div>
                  <div className="font-mono font-bold text-sm text-cyan-400">{marinResult.kc}</div>
                </div>
                <div className="rounded-lg bg-navy-950 p-2 border border-navy-800">
                  <div className="text-[10px] text-gray-400">kd (Temp)</div>
                  <div className="font-mono font-bold text-sm text-cyan-400">{marinResult.kd}</div>
                </div>
                <div className="rounded-lg bg-navy-950 p-2 border border-navy-800">
                  <div className="text-[10px] text-gray-400">ke (Rel)</div>
                  <div className="font-mono font-bold text-sm text-cyan-400">{marinResult.ke}</div>
                </div>
              </div>

              <p className="text-[11px] text-gray-400">
                Unmodified Rotary Beam Limit: <span className="font-mono text-gray-200">S'e = {currentMaterial.unmodifiedEnduranceLimitMpa} MPa</span>. Fully modified component endurance limit: <span className="font-mono text-emerald-400 font-semibold">{marinResult.modifiedEnduranceLimitMpa} MPa</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: S-N Plot, Cyclic Stresses & Life Evaluation (7 Cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Interactive S-N Fatigue Curve Chart */}
          <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-5 backdrop-blur-xs">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <TrendingDown className="text-accent" size={18} />
                  S–N Stress-Life Curve (Log-Log)
                </h2>
                <p className="text-xs text-gray-400">
                  {currentMaterial.materialName} ({currentMaterial.condition})
                </p>
              </div>
              <div className="flex items-center gap-2">
                {currentMaterial.hasEndurancePlateau ? (
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                    Endurance Plateau @ 10⁶ cycles
                  </span>
                ) : (
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/20">
                    No Plateau (Alloy Threshold @ 5×10⁸)
                  </span>
                )}
              </div>
            </div>

            {/* Recharts Plot */}
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={snChartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid stroke="#243049" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="logN"
                    type="number"
                    domain={[3, 7]}
                    ticks={[3, 4, 5, 6, 7]}
                    tickFormatter={(val) => `10^${val}`}
                    stroke="#6b7280"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    label={{ value: 'Cycles to Failure (N)', position: 'insideBottom', offset: -10, fill: '#9ca3af', fontSize: 11 }}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    stroke="#6b7280"
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    label={{ value: 'Stress Amplitude Sa (MPa)', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 8, fontSize: 12 }}
                    formatter={(val: any, name: string) => [`${val} MPa`, name === 'specimenStress' ? 'Specimen S-N' : 'Component S-N (Derated)']}
                    labelFormatter={(val) => `N = 10^${val} cycles`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                  <ReferenceLine
                    y={marinResult.modifiedEnduranceLimitMpa}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    label={{ value: `Se = ${marinResult.modifiedEnduranceLimitMpa} MPa`, fill: '#10b981', fontSize: 10, position: 'top' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="specimenStress"
                    stroke="#64748b"
                    strokeDasharray="3 3"
                    name="Specimen S-N"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="componentStress"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    name="Component S-N (with Marin & Kf)"
                    dot={{ r: 3, fill: '#38bdf8' }}
                  />
                  {/* Operating Design Point Marker */}
                  <ReferenceDot
                    x={operatingPoint.logN}
                    y={operatingPoint.stress}
                    r={6}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <p className="mt-2 text-center text-[11px] text-gray-500 font-mono">
              Operating Point (Red Dot): Equivalent Reversed Stress = {fatigueEvalResult.equivalentReversedStressMpa} MPa
            </p>
          </div>

          {/* Cyclic Loading Inputs & Results Panel */}
          <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-5 backdrop-blur-xs">
            <h2 className="mb-3 text-base font-semibold text-white flex items-center gap-2">
              <Activity className="text-cyan-400" size={18} />
              Cyclic Stress & Safety Margins ({criterion.toUpperCase()})
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block mb-1 text-gray-400">Min Bending Moment (Nm)</label>
                <input
                  type="number"
                  value={bendingMomentMinNm}
                  onChange={(e) => setBendingMomentMinNm(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-navy-700 bg-navy-950 px-2.5 py-1.5 font-mono text-white"
                />
              </div>
              <div>
                <label className="block mb-1 text-gray-400">Max Bending Moment (Nm)</label>
                <input
                  type="number"
                  value={bendingMomentMaxNm}
                  onChange={(e) => setBendingMomentMaxNm(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-navy-700 bg-navy-950 px-2.5 py-1.5 font-mono text-white"
                />
              </div>
            </div>

            {/* Results Grid */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-navy-800 bg-navy-950 p-3">
                <div className="text-[11px] text-gray-400">Fatigue Safety Factor (nf)</div>
                <div
                  className={`text-2xl font-bold font-mono ${
                    fatigueEvalResult.fatigueSafetyFactor >= 1.5
                      ? 'text-emerald-400'
                      : fatigueEvalResult.fatigueSafetyFactor >= 1.0
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {fatigueEvalResult.fatigueSafetyFactor >= 100
                    ? '> 100'
                    : fatigueEvalResult.fatigueSafetyFactor}
                </div>
                <div className="text-[10px] text-gray-500 font-mono">
                  {fatigueEvalResult.criterion} criterion
                </div>
              </div>

              <div className="rounded-lg border border-navy-800 bg-navy-950 p-3">
                <div className="text-[11px] text-gray-400">Static Yield Margin (ny)</div>
                <div className="text-2xl font-bold font-mono text-white">
                  {fatigueEvalResult.staticYieldSafetyFactor >= 100
                    ? '> 100'
                    : fatigueEvalResult.staticYieldSafetyFactor}
                </div>
                <div className="text-[10px] text-gray-500 font-mono">
                  Sy / sigma_max
                </div>
              </div>

              <div className="rounded-lg border border-navy-800 bg-navy-950 p-3">
                <div className="text-[11px] text-gray-400">Estimated Life</div>
                <div className="text-xl font-bold font-mono text-cyan-400">
                  {fatigueEvalResult.isInfiniteLife
                    ? 'Infinite (>10⁶)'
                    : typeof fatigueEvalResult.estimatedCycles === 'number'
                    ? `${fatigueEvalResult.estimatedCycles.toLocaleString()} cycles`
                    : fatigueEvalResult.estimatedCycles}
                </div>
                {fatigueEvalResult.estimatedHours && (
                  <div className="text-[10px] text-cyan-300/80 font-mono">
                    {fatigueEvalResult.estimatedHours === 'infinite'
                      ? 'Infinite service hours'
                      : `~${fatigueEvalResult.estimatedHours} hours @ ${designParams.rpm} RPM`}
                  </div>
                )}
              </div>
            </div>

            {/* Warnings & Diagnostics */}
            {fatigueEvalResult.warnings.length > 0 && (
              <div className="mt-4 space-y-1 rounded-lg border border-amber-500/30 bg-amber-950/40 p-3 text-xs text-amber-300">
                <div className="flex items-center gap-1.5 font-semibold text-amber-400">
                  <AlertTriangle size={15} />
                  <span>Engineering Design Warnings:</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                  {fatigueEvalResult.warnings.map((warn, i) => (
                    <li key={i}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
