import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../design-system/ThemeContext';
import {
  Play,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Box,
  FileText,
  Activity,
  Sparkles,
  Save,
  Wrench,
  ShieldCheck,
  ArrowDownRight,
  Columns,
  ArrowUpRight,
  Sliders,
  Layers,
  History,
  BookOpen,
} from 'lucide-react';
import {
  calculateShaftTorsion,
  calculateShaftBending,
  calculatePowerTransmission,
  calculateShaftDeflection,
  calculateCombinedStress,
  solveMinimumShaftDiameterCombined,
  calculateFit,
  parseFitDesignation,
} from '../engineering';
import { STANDARDS_REGISTRY } from '../standards';
import { EngineeringViewport3D } from '../components/cad/EngineeringViewport3D';
import { EngineeringDrawingWorkspace } from '../components/drawing/EngineeringDrawingWorkspace';
import { ManufacturingInfoPanel } from '../components/drawing/ManufacturingInfoPanel';
import { DesignVerificationPanel } from '../components/drawing/DesignVerificationPanel';

type ViewTab = '3D View' | '2D Drawing' | 'Simulation' | 'Report';
type DockTab =
  | 'Analysis Results'
  | 'Stress Analysis'
  | 'Safety Check'
  | 'Manufacturing'
  | 'Simulation View'
  | 'Report';
type InspectorTab = 'Properties' | 'Materials' | 'Standards';

interface SpecFieldProps {
  label: string;
  unit: string;
  value: number;
  onChange: (val: number) => void;
  step?: number;
  min?: number;
  max?: number;
  invalid?: boolean;
}

function SpecField({ label, unit, value, onChange, step = 1, min, max, invalid = false }: SpecFieldProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-[12px] text-[#475569] dark:text-[#94A3B8] font-medium truncate min-w-0">
        {label}
      </label>
      <div
        className={`flex items-center rounded-[6px] border overflow-hidden bg-white dark:bg-[#1B2942] shrink-0 transition-colors ${
          invalid
            ? 'border-[#DC2626] ring-1 ring-[#DC2626]/20'
            : 'border-[#E2E8F0] dark:border-[#334155] focus-within:border-[#2563EB] focus-within:ring-1 focus-within:ring-[#2563EB]/20'
        }`}
      >
        <input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          min={min}
          max={max}
          className="w-[74px] px-2 py-1 text-[12px] font-mono tabular-nums text-[#172033] dark:text-white bg-transparent focus:outline-none text-right"
        />
        <span className="px-2 py-1 text-[10px] font-mono text-[#64748B] dark:text-[#94A3B8] bg-[#F8FAFC] dark:bg-[#101A2B] border-l border-[#E2E8F0] dark:border-[#334155] min-w-[38px] text-center">
          {unit}
        </span>
      </div>
    </div>
  );
}

const FIT_OPTIONS = ['H7/h6', 'H7/g6', 'H7/k6', 'H7/p6', 'H6/js5'] as const;

export default function DesignWorkspacePage() {
  const {
    designParams,
    updateDesignParam,
    selectedMaterial,
    allMaterials,
    selectMaterial,
    runAnalysis,
    isAnalysisRunning,
    selectedComponent,
    setSelectedComponent,
    setIsOptimizationModalOpen,
    setIsVersionHistoryOpen,
    activeProject,
    setActivePage,
    canvasMode,
    setCanvasMode,
    designVersions,
    saveDesignVersion,
    selectedFit,
    setSelectedFit,
  } = useApp();

  const { theme } = useTheme();
  const criterion = designParams.criterion || 'Von Mises';

  const [viewTab, setViewTab] = useState<ViewTab>('3D View');
  const [dockTab, setDockTab] = useState<DockTab>('Analysis Results');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('Properties');
  const [mobileTab, setMobileTab] = useState<'canvas' | 'inspector' | 'dock'>('canvas');
  const [snapshotSaving, setSnapshotSaving] = useState(false);

  // ─── Deterministic Engineering Physics Calculations ──────────────────────
  const safeDiameter = Math.max(designParams.diameter || 0.1, 0.1);
  const safeLength = Math.max(designParams.length || 1, 1);

  const torsionCalc = calculateShaftTorsion({
    torque: designParams.torque,
    diameter: safeDiameter,
    yieldStrength: selectedMaterial.yieldStrength,
    targetSafetyFactor: designParams.safetyFactor,
  });

  const bendingCalc = calculateShaftBending({
    force: designParams.force,
    length: safeLength,
    diameter: safeDiameter,
    allowableYieldStrength: selectedMaterial.yieldStrength,
  });

  const powerCalc = calculatePowerTransmission({
    torque: designParams.torque,
    rpm: designParams.rpm,
  });

  const deflectionCalc = calculateShaftDeflection({
    force: designParams.force,
    length: safeLength,
    diameter: safeDiameter,
    elasticModulus: selectedMaterial.elasticModulus,
    deflectionLimitRatio: designParams.deflectionLimitRatio,
  });

  const combinedStressCalc = calculateCombinedStress({
    bendingStressMPa: bendingCalc.result.bendingStressMPa,
    shearStressMPa: torsionCalc.result.shearStressMPa,
    yieldStrengthMPa: selectedMaterial.yieldStrength,
    criterion,
    targetSafetyFactor: designParams.safetyFactor,
  });

  const minDiameterSol = solveMinimumShaftDiameterCombined({
    torqueNm: designParams.torque,
    radialForceN: designParams.force,
    lengthMm: safeLength,
    yieldStrengthMPa: selectedMaterial.yieldStrength,
    targetSafetyFactor: designParams.safetyFactor,
    criterion,
    elasticModulusGPa: selectedMaterial.elasticModulus,
    deflectionLimitRatio: designParams.deflectionLimitRatio,
  });

  // Real ISO 286 fit evaluation for active shaft diameter
  const fitCalculation = useMemo(() => {
    try {
      const parsed = parseFitDesignation(selectedFit, Math.min(Math.max(safeDiameter, 1), 500));
      if (!parsed) return null;
      return calculateFit(parsed.nominalMm, parsed.holeClass, parsed.shaftClass);
    } catch {
      return null;
    }
  }, [selectedFit, safeDiameter]);

  const verifiedStandards = useMemo(
    () => STANDARDS_REGISTRY.filter((s) => s.verificationStatus === 'verified').slice(0, 8),
    []
  );

  const equivalentStress = combinedStressCalc.result.equivalentStressMPa;
  const allowableStressMPa = selectedMaterial.yieldStrength / Math.max(designParams.safetyFactor, 0.1);
  const fos = combinedStressCalc.result.factorOfSafety;
  const allowableDeflectionMm = deflectionCalc.result.allowableDeflectionMm || safeLength / 1000;
  const isUndersized = designParams.diameter < minDiameterSol.requiredDiameterMm;
  const hasInvalidInputs = designParams.diameter <= 0 || designParams.length <= 0 || designParams.safetyFactor <= 0;

  const isPass = !hasInvalidInputs && combinedStressCalc.status === 'pass' && deflectionCalc.status === 'pass' && !isUndersized;
  const isWarning = !hasInvalidInputs && (combinedStressCalc.status === 'warning' || deflectionCalc.status === 'warning') && !isUndersized;

  const d_m = safeDiameter / 1000;
  const l_m = safeLength / 1000;
  const volume = (Math.PI / 4) * Math.pow(d_m, 2) * l_m;
  const weight = selectedMaterial.density * volume;
  const powerKW = powerCalc.result.powerKW;

  const activeAnalysisResult = useMemo(
    () => ({
      shearStress: torsionCalc.result.shearStressMPa,
      bendingStress: bendingCalc.result.bendingStressMPa,
      vonMisesStress: combinedStressCalc.result.equivalentStressMPa,
      equivalentStress: combinedStressCalc.result.equivalentStressMPa,
      yieldStrength: selectedMaterial.yieldStrength,
      factorOfSafety: combinedStressCalc.result.factorOfSafety,
      maxDeflection: deflectionCalc.result.maxDeflectionMm,
      torqueCapacity: torsionCalc.result.polarSectionModulusMm3,
      fatigueLife: 1e6,
      status: isPass ? ('pass' as const) : isWarning ? ('warning' as const) : ('fail' as const),
      statusMessage: isPass ? 'Design compliant' : 'Check stress or deflection limits',
      isPass,
    }),
    [torsionCalc, bendingCalc, combinedStressCalc, selectedMaterial, deflectionCalc, isPass, isWarning]
  );

  const statusColor = hasInvalidInputs
    ? 'text-[#64748B]'
    : isPass
    ? 'text-[#16A34A]'
    : isWarning
    ? 'text-[#D97706]'
    : 'text-[#DC2626]';
  const statusRingStroke = hasInvalidInputs
    ? '#94A3B8'
    : isPass
    ? '#16A34A'
    : isWarning
    ? '#D97706'
    : '#DC2626';
  const statusBg = hasInvalidInputs
    ? 'bg-[#F8FAFC] dark:bg-[#162236] border-[#E2E8F0] dark:border-[#334155]'
    : isPass
    ? 'bg-[#F0FDF4] dark:bg-[#052E16]/30 border-[#BBF7D0] dark:border-[#16A34A]/40'
    : isWarning
    ? 'bg-[#FFFBEB] dark:bg-[#451A03]/30 border-[#FDE68A] dark:border-[#D97706]/40'
    : 'bg-[#FEF2F2] dark:bg-[#450A0A]/30 border-[#FECACA] dark:border-[#DC2626]/40';
  const statusText = hasInvalidInputs ? 'Invalid' : isPass ? 'Passed' : isWarning ? 'Warning' : 'Failed';

  const stressUtilizationPct = Math.min(Math.round((equivalentStress / Math.max(allowableStressMPa, 1)) * 100), 100);
  const deflectionUtilizationPct = Math.min(
    Math.round((deflectionCalc.result.maxDeflectionMm / Math.max(allowableDeflectionMm, 0.0001)) * 100),
    100
  );

  const StatusIcon = ({ size = 14 }: { size?: number }) => {
    if (hasInvalidInputs) return <AlertTriangle size={size} className="text-[#64748B]" />;
    if (isPass) return <CheckCircle2 size={size} className="text-[#16A34A]" />;
    if (isWarning) return <AlertTriangle size={size} className="text-[#D97706]" />;
    return <XCircle size={size} className="text-[#DC2626]" />;
  };

  const handleSaveSnapshot = async () => {
    if (!activeProject || snapshotSaving) return;
    setSnapshotSaving(true);
    try {
      await saveDesignVersion('Manual Checkpoint', `Saved at Ø${designParams.diameter} mm, ${selectedMaterial.name}`);
    } catch {
      // handled in context
    } finally {
      setSnapshotSaving(false);
    }
  };

  const effectiveCanvasTab: ViewTab = canvasMode === '2d' ? '2D Drawing' : viewTab;

  return (
    <div className="flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_304px] 2xl:grid-cols-[minmax(0,1fr)_332px] xl:grid-rows-[minmax(0,1fr)_auto] h-full w-full overflow-hidden bg-[#F5F7FB] dark:bg-[#0D1526] font-sans">
      {/* Mobile / Tablet Switcher */}
      <div className="xl:hidden flex border-b border-[#E2E8F0] dark:border-[#1E2D45] bg-white dark:bg-[#101A2B] shrink-0">
        {(['canvas', 'inspector', 'dock'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2 text-[11px] font-semibold transition-colors border-b-2 ${
              mobileTab === tab ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#64748B]'
            }`}
          >
            {tab === 'canvas' ? '3D Viewport' : tab === 'inspector' ? 'Properties' : 'Analysis'}
          </button>
        ))}
      </div>

      {/* ─── GRID CELL [1,1]: CAD VIEWPORT STAGE ────────────────────────────────── */}
      <section
        className={`flex-1 min-w-0 min-h-0 flex-col overflow-hidden bg-white dark:bg-[#101A2B] ${
          mobileTab === 'canvas' ? 'flex' : 'hidden xl:flex'
        }`}
      >
        {/* View Tabs Strip */}
        <div className="h-10 px-3 bg-white dark:bg-[#101A2B] border-b border-[#E2E8F0] dark:border-[#1E2D45] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-0.5 overflow-x-auto">
            {(['3D View', '2D Drawing', 'Simulation', 'Report'] as ViewTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setViewTab(tab);
                  if (tab === '2D Drawing') setCanvasMode('2d');
                  else if (tab === '3D View') setCanvasMode('3d');
                  else if (tab === 'Simulation') {
                    setCanvasMode('3d');
                    setDockTab('Stress Analysis');
                  } else if (tab === 'Report') {
                    setActivePage('reports');
                  }
                }}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-[5px] transition-colors whitespace-nowrap ${
                  effectiveCanvasTab === tab && canvasMode !== 'split'
                    ? 'text-[#2563EB] bg-[#EFF6FF] dark:bg-[#1B2942] font-semibold'
                    : 'text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#1B2942]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden 2xl:inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#F8FAFC] dark:bg-[#1B2942] border border-[#E2E8F0] dark:border-[#334155] text-[11px] font-mono text-[#64748B] tabular-nums">
              ⌀{designParams.diameter}×{designParams.length}mm · {selectedMaterial.name}
            </span>
            <button
              onClick={() => setCanvasMode(canvasMode === 'split' ? '3d' : 'split')}
              className={`flex items-center gap-1 px-2 py-1 rounded-[5px] border text-[11px] font-medium transition-colors ${
                canvasMode === 'split'
                  ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB] font-semibold'
                  : 'border-[#E2E8F0] dark:border-[#334155] text-[#64748B] hover:text-[#172033] dark:hover:text-white hover:bg-[#F8FAFC]'
              }`}
              title="Toggle Split View (3D CAD + 2D Drawing)"
            >
              <Columns size={12} />
              <span className="hidden md:inline">Split</span>
            </button>
          </div>
        </div>

        {/* 3D / 2D Viewport Canvas Body */}
        <div className="flex-1 min-h-0 min-w-0 flex flex-col lg:flex-row relative overflow-hidden">
          {(canvasMode === '3d' || canvasMode === 'split') && (
            <div
              className={`${
                canvasMode === 'split'
                  ? 'w-full lg:w-1/2 h-1/2 lg:h-full border-b lg:border-b-0 lg:border-r border-[#E2E8F0] dark:border-[#1E2D45]'
                  : 'w-full h-full'
              } min-w-0 min-h-0 flex flex-col`}
            >
              <EngineeringViewport3D
                designParams={designParams}
                selectedMaterial={selectedMaterial}
                selectedComponent={selectedComponent}
                onSelectComponent={setSelectedComponent}
                isPass={isPass}
                isWarning={isWarning}
                equivalentStress={equivalentStress}
                criterion={criterion}
                theme={theme}
                shadingModeOverride={viewTab === 'Simulation' ? 'stress' : null}
              />
            </div>
          )}

          {(canvasMode === '2d' || canvasMode === 'split') && (
            <div
              className={`${
                canvasMode === 'split' ? 'w-full lg:w-1/2 h-1/2 lg:h-full' : 'w-full h-full'
              } min-w-0 min-h-0 flex flex-col bg-[#F8FAFC] dark:bg-[#0D1526] overflow-hidden`}
            >
              <EngineeringDrawingWorkspace
                designParams={designParams}
                material={selectedMaterial}
                analysis={activeAnalysisResult}
                projectName={activeProject?.name || 'Workspace Session'}
                projectVersion={designVersions[0]?.version || 'v1.0'}
                onUpdateParameter={(key, val) => updateDesignParam(key, val)}
                className="w-full h-full"
              />
            </div>
          )}
        </div>
      </section>

      {/* ─── GRID CELL [1,2]: PROPERTIES INSPECTOR PANEL (316px / 332px) ─────────── */}
      <aside
        className={`w-full h-full min-h-0 bg-white dark:bg-[#101A2B] border-l border-[#E2E8F0] dark:border-[#1E2D45] flex-col overflow-hidden ${
          mobileTab === 'inspector' ? 'flex flex-1' : 'hidden xl:flex'
        }`}
      >
        {/* Inspector Tabs: Properties | Materials | Standards */}
        <div className="h-10 border-b border-[#E2E8F0] dark:border-[#1E2D45] px-4 flex items-center gap-5 shrink-0 bg-white dark:bg-[#101A2B]">
          {(['Properties', 'Materials', 'Standards'] as InspectorTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setInspectorTab(tab)}
              className={`h-full text-[12px] font-semibold transition-colors relative flex items-center ${
                inspectorTab === tab
                  ? 'text-[#2563EB]'
                  : 'text-[#64748B] hover:text-[#172033] dark:hover:text-white'
              }`}
            >
              {tab}
              {inspectorTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2563EB] rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {/* Scrollable Inspector Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* PROPERTIES TAB */}
          {inspectorTab === 'Properties' && (
            <div className="p-3.5 space-y-4">
              {/* Active Component Banner */}
              <div className="flex items-center gap-2.5 p-2.5 rounded-[8px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F]">
                <div className="w-9 h-9 rounded-[6px] bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-center text-[#2563EB] shrink-0">
                  <Box size={18} strokeWidth={1.6} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[12px] font-semibold text-[#172033] dark:text-white truncate">
                    {activeProject?.name || 'Shaft Assembly'}
                  </h3>
                  <p className="text-[11px] text-[#64748B] truncate">
                    {selectedComponent ? selectedComponent.name : 'Power Transmission Shaft'}
                  </p>
                </div>
              </div>

              {/* Geometry & Material */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#172033] dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Sliders size={12} className="text-[#2563EB]" />
                    Shaft Specifications
                  </span>
                  <span className="text-[10px] font-mono text-[#2563EB] tabular-nums">
                    min ⌀{minDiameterSol.requiredDiameterMm.toFixed(1)}mm
                  </span>
                </div>

                <SpecField
                  label="Diameter"
                  unit="mm"
                  value={designParams.diameter}
                  onChange={(v) => updateDesignParam('diameter', v)}
                  step={1}
                  min={5}
                  max={500}
                  invalid={designParams.diameter <= 0 || isUndersized}
                />

                {isUndersized && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#DC2626] bg-[#FEF2F2] dark:bg-[#450A0A]/30 border border-[#FECACA] dark:border-[#DC2626]/40 rounded-[6px] px-2.5 py-1.5">
                    <span>Below target yield/deflection min</span>
                    <button
                      type="button"
                      onClick={() => updateDesignParam('diameter', Math.ceil(minDiameterSol.requiredDiameterMm))}
                      className="font-bold underline shrink-0 ml-1"
                    >
                      Set ⌀{Math.ceil(minDiameterSol.requiredDiameterMm)}mm
                    </button>
                  </div>
                )}

                <SpecField
                  label="Span Length"
                  unit="mm"
                  value={designParams.length}
                  onChange={(v) => updateDesignParam('length', v)}
                  step={5}
                  min={50}
                  max={5000}
                  invalid={designParams.length <= 0}
                />

                {/* Material Select */}
                <div>
                  <label className="text-[11px] text-[#64748B] font-medium block mb-1">Material Alloy</label>
                  <select
                    value={selectedMaterial.id}
                    onChange={(e) => selectMaterial(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1B2942] border border-[#E2E8F0] dark:border-[#334155] rounded-[6px] text-[#172033] dark:text-white text-[12px] font-mono focus:outline-none focus:border-[#2563EB]"
                  >
                    {allMaterials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.yieldStrength} MPa)
                      </option>
                    ))}
                  </select>
                  <div className="mt-1.5 grid grid-cols-3 gap-1 text-[10px] font-mono tabular-nums p-1.5 rounded-[6px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F] text-[#64748B]">
                    <div>Sy: <strong className="text-[#172033] dark:text-white">{selectedMaterial.yieldStrength}</strong></div>
                    <div>E: <strong className="text-[#172033] dark:text-white">{selectedMaterial.elasticModulus}GPa</strong></div>
                    <div>ρ: <strong className="text-[#172033] dark:text-white">{selectedMaterial.density}</strong></div>
                  </div>
                </div>

                {/* ISO 286 Shaft/Hub Fit */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-[#64748B] font-medium">Hub Fit (ISO 286)</label>
                    {fitCalculation && (
                      <span className="text-[10px] font-mono uppercase text-[#2563EB] font-semibold">
                        {fitCalculation.fitType}
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedFit}
                    onChange={(e) => setSelectedFit(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1B2942] border border-[#E2E8F0] dark:border-[#334155] rounded-[6px] text-[#172033] dark:text-white text-[12px] font-mono focus:outline-none focus:border-[#2563EB]"
                  >
                    {FIT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f} (ISO 286)
                      </option>
                    ))}
                  </select>
                  {fitCalculation && (
                    <div className="mt-1 text-[10px] font-mono text-[#64748B] tabular-nums px-1">
                      {fitCalculation.fitType === 'clearance'
                        ? `Clearance: +${fitCalculation.minClearanceUm} to +${fitCalculation.maxClearanceUm} µm`
                        : fitCalculation.fitType === 'interference'
                        ? `Interference: ${fitCalculation.minInterferenceUm} to ${fitCalculation.maxInterferenceUm} µm`
                        : `Range: ${fitCalculation.minClearanceUm} to +${fitCalculation.maxClearanceUm} µm`}
                    </div>
                  )}
                </div>
              </div>

              {/* Load Conditions */}
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E2D45] space-y-2.5">
                <span className="text-[11px] font-bold text-[#172033] dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Activity size={12} className="text-[#2563EB]" />
                  Load Conditions
                </span>

                <SpecField
                  label="Torque"
                  unit="N·m"
                  value={designParams.torque}
                  onChange={(v) => updateDesignParam('torque', Math.max(0, v))}
                  step={10}
                  min={0}
                />
                <SpecField
                  label="Speed"
                  unit="RPM"
                  value={designParams.rpm}
                  onChange={(v) => updateDesignParam('rpm', Math.max(0, v))}
                  step={50}
                  min={0}
                />
                <SpecField
                  label="Radial Force"
                  unit="N"
                  value={designParams.force}
                  onChange={(v) => updateDesignParam('force', Math.max(0, v))}
                  step={100}
                  min={0}
                />
                <SpecField
                  label="Operating Temp"
                  unit="°C"
                  value={designParams.temperature}
                  onChange={(v) => updateDesignParam('temperature', v)}
                  step={5}
                />
              </div>

              {/* Safety & Design Criteria */}
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E2D45] space-y-2.5">
                <span className="text-[11px] font-bold text-[#172033] dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-[#2563EB]" />
                  Safety & Design
                </span>

                <SpecField
                  label="Target FoS"
                  unit="×"
                  value={designParams.safetyFactor}
                  onChange={(v) => updateDesignParam('safetyFactor', v)}
                  step={0.1}
                  min={1}
                  max={10}
                  invalid={designParams.safetyFactor <= 0}
                />

                <div>
                  <label className="text-[11px] text-[#64748B] font-medium block mb-1">Failure Criterion</label>
                  <select
                    value={criterion}
                    onChange={(e) => updateDesignParam('criterion', e.target.value as 'Von Mises' | 'Tresca')}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1B2942] border border-[#E2E8F0] dark:border-[#334155] rounded-[6px] text-[#172033] dark:text-white text-[12px] font-mono focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="Von Mises">Von Mises (Distortion Energy)</option>
                    <option value="Tresca">Tresca (Max Shear Stress)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#64748B] font-medium block mb-1">Stiffness Limit</label>
                  <select
                    value={designParams.deflectionLimitRatio || 1000}
                    onChange={(e) => updateDesignParam('deflectionLimitRatio', parseFloat(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-[#1B2942] border border-[#E2E8F0] dark:border-[#334155] rounded-[6px] text-[#172033] dark:text-white text-[12px] font-mono focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value={500}>L / 500 (General Machinery)</option>
                    <option value={1000}>L / 1000 (Standard Industrial)</option>
                    <option value={1500}>L / 1500 (Precision Gear Spindles)</option>
                  </select>
                </div>
              </div>

              {/* Live Results Summary Box */}
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E2D45]">
                <div className={`p-2.5 rounded-[8px] border ${statusBg} space-y-1.5`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#172033] dark:text-white flex items-center gap-1.5">
                      <StatusIcon size={13} />
                      Results Summary
                    </span>
                    <span className={`text-[11px] font-bold ${statusColor}`}>{statusText}</span>
                  </div>
                  <div className="space-y-1 text-[11px] font-mono tabular-nums">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Max Stress:</span>
                      <strong className="text-[#172033] dark:text-white">{equivalentStress.toFixed(1)} MPa</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Actual FoS:</span>
                      <strong className={statusColor}>{fos.toFixed(2)}×</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Deflection:</span>
                      <strong className="text-[#172033] dark:text-white">
                        {deflectionCalc.result.maxDeflectionMm.toFixed(3)} mm
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MATERIALS TAB */}
          {inspectorTab === 'Materials' && (
            <div className="p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#172033] dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Layers size={12} className="text-[#2563EB]" />
                  Verified Alloy Library
                </span>
                <button
                  onClick={() => setActivePage('materials')}
                  className="text-[11px] font-semibold text-[#2563EB] hover:underline"
                >
                  Compare All →
                </button>
              </div>

              <div className="space-y-2">
                {allMaterials.map((mat) => {
                  const isActive = mat.id === selectedMaterial.id;
                  return (
                    <button
                      key={mat.id}
                      type="button"
                      onClick={() => selectMaterial(mat.id)}
                      className={`w-full text-left p-2.5 rounded-[8px] border transition-colors ${
                        isActive
                          ? 'bg-[#EFF6FF] dark:bg-[#1B2942] border-[#2563EB] shadow-xs'
                          : 'bg-[#F8FAFC] dark:bg-[#162236] border-[#E2E8F0] dark:border-[#24344F] hover:border-[#94A3B8]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-[12px] font-semibold truncate ${isActive ? 'text-[#2563EB]' : 'text-[#172033] dark:text-white'}`}>
                          {mat.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#334155] text-[#64748B] shrink-0">
                          {mat.costCategory}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-[#64748B] tabular-nums">
                        <span>Sy {mat.yieldStrength} MPa</span>
                        <span>E {mat.elasticModulus} GPa</span>
                        <span>{mat.density} kg/m³</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STANDARDS TAB */}
          {inspectorTab === 'Standards' && (
            <div className="p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#172033] dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <BookOpen size={12} className="text-[#2563EB]" />
                  Verified Kernel Standards
                </span>
                <span className="text-[10px] font-mono text-[#16A34A] font-semibold">
                  {verifiedStandards.length} Active
                </span>
              </div>

              <div className="space-y-2">
                {verifiedStandards.map((std) => (
                  <div
                    key={std.id}
                    className="p-2.5 rounded-[8px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F] space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono font-bold text-[#2563EB]">{std.code}</span>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]">
                        {std.organization}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#172033] dark:text-[#E2E8F0] font-medium leading-snug">
                      {std.title}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setActivePage('calculations')}
                className="w-full py-2 px-3 rounded-[6px] bg-white dark:bg-[#1B2942] border border-[#E2E8F0] dark:border-[#334155] text-[12px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF] transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Open Standards Registry</span>
                <ArrowUpRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Fixed Inspector Footer Actions */}
        <div className="p-3 border-t border-[#E2E8F0] dark:border-[#1E2D45] bg-white dark:bg-[#101A2B] shrink-0 space-y-2">
          <button
            onClick={() => runAnalysis()}
            disabled={isAnalysisRunning}
            className="w-full py-2 px-4 rounded-[6px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-[12px] flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-60"
          >
            {isAnalysisRunning ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Running Solver...</span>
              </>
            ) : (
              <>
                <Play size={12} fill="currentColor" />
                <span>Run Analysis</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsOptimizationModalOpen(true)}
              className="py-1.5 px-2.5 rounded-[6px] bg-[#F8FAFC] dark:bg-[#1B2942] border border-[#E2E8F0] dark:border-[#334155] text-[11px] font-semibold text-[#334155] dark:text-[#CBD5E1] hover:bg-[#EFF6FF] hover:text-[#2563EB] hover:border-[#BFDBFE] transition-colors flex items-center justify-center gap-1"
            >
              <Sparkles size={12} className="text-[#2563EB]" />
              <span>AI Optimize</span>
            </button>
            <button
              onClick={handleSaveSnapshot}
              disabled={!activeProject || snapshotSaving}
              className="py-1.5 px-2.5 rounded-[6px] bg-[#F8FAFC] dark:bg-[#1B2942] border border-[#E2E8F0] dark:border-[#334155] text-[11px] font-semibold text-[#334155] dark:text-[#CBD5E1] hover:bg-[#EFF6FF] hover:text-[#2563EB] hover:border-[#BFDBFE] transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
              title="Save Version Checkpoint"
            >
              {snapshotSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              <span>Checkpoint</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ─── GRID CELL [2, 1..2]: BOTTOM ANALYSIS WORKSPACE DOCK ───────────────── */}
      <section
        className={`xl:col-span-2 shrink-0 border-t border-[#E2E8F0] dark:border-[#1E2D45] bg-white dark:bg-[#101A2B] ${
          mobileTab === 'dock' ? 'flex flex-col flex-1 overflow-y-auto' : 'hidden xl:block'
        }`}
      >
        {/* Dock Tab Header */}
        <div className="h-9 px-3 border-b border-[#E2E8F0] dark:border-[#1E2D45] flex items-center justify-between gap-2 bg-[#F8FAFC] dark:bg-[#0D1526]">
          <div className="flex items-center gap-1 overflow-x-auto">
            {(
              [
                'Analysis Results',
                'Stress Analysis',
                'Safety Check',
                'Manufacturing',
                'Simulation View',
                'Report',
              ] as DockTab[]
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setDockTab(tab)}
                className={`px-2.5 py-1 rounded-[5px] text-[11px] font-semibold transition-colors flex items-center gap-1 whitespace-nowrap ${
                  dockTab === tab
                    ? 'bg-white dark:bg-[#101A2B] text-[#2563EB] shadow-xs border border-[#E2E8F0] dark:border-[#334155]'
                    : 'text-[#64748B] hover:text-[#172033] dark:hover:text-white'
                }`}
              >
                {tab === 'Analysis Results' && <Activity size={11} className="text-[#2563EB]" />}
                {tab === 'Safety Check' && <ShieldCheck size={11} className="text-[#16A34A]" />}
                {tab === 'Manufacturing' && <Wrench size={11} className="text-[#7C3AED]" />}
                {tab === 'Simulation View' && <Box size={11} />}
                {tab === 'Report' && <FileText size={11} />}
                <span>{tab}</span>
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-[#64748B] shrink-0">
            <span>DIN 743 / ISO 281</span>
            <span className="text-[#CBD5E1] dark:text-[#334155]">|</span>
            <span className="px-1.5 py-0.5 rounded-[4px] bg-[#EFF6FF] dark:bg-[#1B2942] text-[#2563EB] font-semibold">
              {criterion.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Dock Body */}
        <div className="p-3">
          {/* TAB: ANALYSIS RESULTS (4 KPI Cards + Project Actions) */}
          {dockTab === 'Analysis Results' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* KPI 1: Factor of Safety Donut Gauge */}
              <div className="p-3 rounded-[8px] border border-[#E2E8F0] dark:border-[#24344F] bg-[#F8FAFC] dark:bg-[#162236] flex items-center gap-3">
                <div className="relative w-14 h-14 shrink-0">
                  <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
                    <circle
                      cx="28"
                      cy="28"
                      r="22"
                      fill="none"
                      stroke="#E2E8F0"
                      strokeWidth="5"
                      className="dark:stroke-[#24344F]"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r="22"
                      fill="none"
                      stroke={statusRingStroke}
                      strokeWidth="5"
                      strokeDasharray={2 * Math.PI * 22}
                      strokeDashoffset={
                        2 * Math.PI * 22 * (1 - Math.min(fos / Math.max(designParams.safetyFactor * 2, 1), 1))
                      }
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center px-1">
                    <span
                      className={`font-bold font-mono tabular-nums ${statusColor} ${
                        fos >= 100 ? 'text-[10px]' : fos >= 10 ? 'text-[12px]' : 'text-[13px]'
                      }`}
                      title={hasInvalidInputs ? 'Invalid inputs' : `Factor of Safety: ${fos.toFixed(2)}×`}
                    >
                      {hasInvalidInputs ? '—' : fos > 999 ? '999+' : fos >= 100 ? fos.toFixed(0) : fos.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-[#64748B] block">Factor of Safety</span>
                  <span className={`text-[12px] font-bold ${statusColor}`}>{statusText}</span>
                  <span className="text-[10px] text-[#64748B] block font-mono tabular-nums truncate">
                    Target ≥ {designParams.safetyFactor.toFixed(1)}×
                  </span>
                </div>
              </div>

              {/* KPI 2: Max Equivalent Stress */}
              <div className="p-3 rounded-[8px] border border-[#E2E8F0] dark:border-[#24344F] bg-[#F8FAFC] dark:bg-[#162236] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#64748B]">Max Stress ({criterion})</span>
                  <Activity size={13} className="text-[#2563EB]" />
                </div>
                <div className="my-0.5 tabular-nums">
                  <span className="text-[20px] font-bold font-mono text-[#172033] dark:text-white">
                    {hasInvalidInputs ? '—' : equivalentStress.toFixed(1)}
                  </span>
                  <span className="text-[11px] text-[#64748B] ml-1 font-mono">MPa</span>
                </div>
                <div className="space-y-1">
                  <div className="w-full h-1.5 rounded-full bg-[#E2E8F0] dark:bg-[#24344F] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stressUtilizationPct > 100 ? 'bg-[#DC2626]' : stressUtilizationPct > 85 ? 'bg-[#D97706]' : 'bg-[#2563EB]'}`}
                      style={{ width: `${stressUtilizationPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[#64748B] tabular-nums block truncate">
                    Allowable: {allowableStressMPa.toFixed(1)} MPa · Sy: {selectedMaterial.yieldStrength}
                  </span>
                </div>
              </div>

              {/* KPI 3: Max Deflection */}
              <div className="p-3 rounded-[8px] border border-[#E2E8F0] dark:border-[#24344F] bg-[#F8FAFC] dark:bg-[#162236] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#64748B]">Max Deflection</span>
                  <ArrowDownRight size={13} className="text-[#7C3AED]" />
                </div>
                <div className="my-0.5 tabular-nums">
                  <span className="text-[20px] font-bold font-mono text-[#172033] dark:text-white">
                    {hasInvalidInputs ? '—' : deflectionCalc.result.maxDeflectionMm.toFixed(3)}
                  </span>
                  <span className="text-[11px] text-[#64748B] ml-1 font-mono">mm</span>
                </div>
                <div className="space-y-1">
                  <div className="w-full h-1.5 rounded-full bg-[#E2E8F0] dark:bg-[#24344F] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${deflectionUtilizationPct >= 100 ? 'bg-[#DC2626]' : deflectionUtilizationPct > 80 ? 'bg-[#D97706]' : 'bg-[#16A34A]'}`}
                      style={{ width: `${deflectionUtilizationPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[#64748B] tabular-nums block truncate">
                    Limit: {allowableDeflectionMm.toFixed(2)} mm (L/{designParams.deflectionLimitRatio || 1000})
                  </span>
                </div>
              </div>

              {/* KPI 4: Verification Status & Quick Actions */}
              <div className={`p-3 rounded-[8px] border ${statusBg} flex flex-col justify-between`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#64748B]">Result Status</span>
                  <StatusIcon size={14} />
                </div>
                <div className="flex items-baseline justify-between gap-2 my-0.5">
                  <span className={`text-[18px] font-bold ${statusColor}`}>{statusText}</span>
                  <span className="text-[10px] font-mono text-[#64748B] tabular-nums">{powerKW.toFixed(1)} kW</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <button
                    onClick={() => runAnalysis({ navigateToAnalysis: true })}
                    className="flex-1 py-1 px-2 rounded-[5px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors"
                    title="Open Stress & S-N Charts"
                  >
                    <ArrowUpRight size={11} />
                    <span>Charts</span>
                  </button>
                  <button
                    onClick={() => setActivePage('reports')}
                    className="py-1 px-2 rounded-[5px] bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#334155] text-[#172033] dark:text-white text-[10px] font-semibold flex items-center gap-1 hover:border-[#2563EB] transition-colors"
                    title="View Engineering Report"
                  >
                    <FileText size={11} />
                    <span>Report</span>
                  </button>
                  <button
                    onClick={() => setIsVersionHistoryOpen(true)}
                    className="py-1 px-2 rounded-[5px] bg-white dark:bg-[#101A2B] border border-[#E2E8F0] dark:border-[#334155] text-[#172033] dark:text-white text-[10px] font-semibold flex items-center gap-1 hover:border-[#2563EB] transition-colors"
                    title="View Revision History"
                  >
                    <History size={11} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: STRESS ANALYSIS */}
          {dockTab === 'Stress Analysis' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-[12px] font-mono tabular-nums">
              <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F]">
                <span className="text-[#64748B] block text-[10px] mb-1">TORSIONAL SHEAR (τ)</span>
                <span className="text-[17px] font-bold text-[#172033] dark:text-white">
                  {torsionCalc.result.shearStressMPa.toFixed(1)}
                </span>
                <span className="text-[10px] text-[#64748B] ml-1">MPa</span>
              </div>
              <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F]">
                <span className="text-[#64748B] block text-[10px] mb-1">BENDING STRESS (σb)</span>
                <span className="text-[17px] font-bold text-[#172033] dark:text-white">
                  {bendingCalc.result.bendingStressMPa.toFixed(1)}
                </span>
                <span className="text-[10px] text-[#64748B] ml-1">MPa</span>
              </div>
              <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F]">
                <span className="text-[#64748B] block text-[10px] mb-1">{criterion.toUpperCase()} EQUIV.</span>
                <span className="text-[17px] font-bold text-[#2563EB]">{equivalentStress.toFixed(1)}</span>
                <span className="text-[10px] text-[#64748B] ml-1">MPa</span>
              </div>
              <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F]">
                <span className="text-[#64748B] block text-[10px] mb-1">POWER TRANSMITTED</span>
                <span className="text-[17px] font-bold text-[#172033] dark:text-white">{powerKW.toFixed(1)}</span>
                <span className="text-[10px] text-[#64748B] ml-1">kW</span>
              </div>
            </div>
          )}

          {/* TAB: SAFETY CHECK */}
          {dockTab === 'Safety Check' && (
            <div className="h-[144px] overflow-y-auto pr-1">
              <DesignVerificationPanel
                designParams={designParams}
                material={selectedMaterial}
                analysis={activeAnalysisResult}
                onRevalidate={() => runAnalysis()}
              />
            </div>
          )}

          {/* TAB: MANUFACTURING */}
          {dockTab === 'Manufacturing' && (
            <div className="h-[144px] overflow-y-auto pr-1">
              <ManufacturingInfoPanel designParams={designParams} material={selectedMaterial} />
            </div>
          )}

          {/* TAB: SIMULATION VIEW METRICS */}
          {dockTab === 'Simulation View' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-[12px] font-mono tabular-nums">
              <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F]">
                <span className="text-[#64748B] block text-[10px] mb-1">ROTATING MASS</span>
                <span className="text-[17px] font-bold text-[#172033] dark:text-white">{weight.toFixed(2)}</span>
                <span className="text-[10px] text-[#64748B] ml-1">kg</span>
              </div>
              <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F]">
                <span className="text-[#64748B] block text-[10px] mb-1">POLAR MODULUS Zp</span>
                <span className="text-[17px] font-bold text-[#172033] dark:text-white">
                  {(torsionCalc.result.polarSectionModulusMm3 || 0).toFixed(0)}
                </span>
                <span className="text-[10px] text-[#64748B] ml-1">mm³</span>
              </div>
              <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F]">
                <span className="text-[#64748B] block text-[10px] mb-1">MIN REQ. DIAMETER</span>
                <span className="text-[17px] font-bold text-[#172033] dark:text-white">
                  {minDiameterSol.requiredDiameterMm.toFixed(1)}
                </span>
                <span className="text-[10px] text-[#64748B] ml-1">mm</span>
              </div>
              <div className="p-3 rounded-[8px] bg-[#F8FAFC] dark:bg-[#162236] border border-[#E2E8F0] dark:border-[#24344F]">
                <span className="text-[#64748B] block text-[10px] mb-1">ACTIVE FIT BOUNDS</span>
                <span className="text-[14px] font-bold text-[#2563EB] truncate block">
                  {fitCalculation ? `${fitCalculation.holeClass}/${fitCalculation.shaftClass}` : selectedFit}
                </span>
                <span className="text-[10px] text-[#64748B] block truncate">
                  {fitCalculation ? fitCalculation.fitType : 'ISO 286'}
                </span>
              </div>
            </div>
          )}

          {/* TAB: REPORT */}
          {dockTab === 'Report' && (
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-[8px] border ${statusBg}`}>
              <div className="flex items-center gap-3">
                <StatusIcon size={20} />
                <div>
                  <h4 className="text-[13px] font-bold text-[#172033] dark:text-white">
                    Engineering Verification Summary — {statusText}
                  </h4>
                  <p className="text-[11px] text-[#64748B]">
                    {activeProject?.name || 'Active Design'}: FoS {fos.toFixed(2)}× · σeq {equivalentStress.toFixed(1)} MPa · δ {deflectionCalc.result.maxDeflectionMm.toFixed(3)} mm
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActivePage('reports')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-semibold transition-colors shrink-0"
              >
                <FileText size={13} />
                <span>Open Report & PDF Export</span>
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
