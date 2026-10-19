import React, { useState, useMemo } from 'react';
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Copy,
  Check,
  Layers,
  ArrowRight,
  Maximize2,
  Plus,
  Trash2,
  RotateCcw,
  Scale,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  calculateFit,
  parseFitDesignation,
  STANDARD_FITS,
  calculateToleranceStackUp,
  type FitCalculationResult,
  type StackUpComponent,
  type HoleClass,
  type ShaftClass,
} from '../engineering/tolerances';

export default function TolerancesPage() {
  const { designParams, sendCopilotMessage, setActivePage } = useApp();

  const [activeTab, setActiveTab] = useState<'fits' | 'stackup'>('fits');

  // ─── Fits Calculator State ──────────────────────────────────────────
  const [nominalDiameter, setNominalDiameter] = useState<number>(designParams.diameter || 45);
  const [selectedHoleClass, setSelectedHoleClass] = useState<string>('H7');
  const [selectedShaftClass, setSelectedShaftClass] = useState<string>('h6');
  const [copiedFit, setCopiedFit] = useState(false);

  // ─── Stack-Up Analyzer State ─────────────────────────────────────────
  const defaultComponents: StackUpComponent[] = [
    { id: '1', name: 'Housing Bore Cavity', nominalMm: 120.0, upperTolMm: 0.08, lowerTolMm: -0.04, direction: 1, description: 'Internal machined bearing span' },
    { id: '2', name: 'Deep Groove Ball Bearing (Left)', nominalMm: 18.0, upperTolMm: 0.0, lowerTolMm: -0.012, direction: -1, description: 'ISO 492 Normal width tolerance' },
    { id: '3', name: 'Deep Groove Ball Bearing (Right)', nominalMm: 18.0, upperTolMm: 0.0, lowerTolMm: -0.012, direction: -1, description: 'ISO 492 Normal width tolerance' },
    { id: '4', name: 'Spur Gear Hub Width', nominalMm: 75.0, upperTolMm: 0.0, lowerTolMm: -0.05, direction: -1, description: 'Precision ground hub shoulder' },
    { id: '5', name: 'Retaining Snap Ring Spacer', nominalMm: 8.0, upperTolMm: 0.02, lowerTolMm: -0.02, direction: -1, description: 'Precision shim spacer' },
  ];

  const [components, setComponents] = useState<StackUpComponent[]>(defaultComponents);
  const [copiedStackUp, setCopiedStackUp] = useState(false);

  // Compute ISO 286 Fit
  const fitResult: { data: FitCalculationResult | null; error: string | null } = useMemo(() => {
    try {
      if (nominalDiameter <= 0 || nominalDiameter > 500) {
        return { data: null, error: `Nominal diameter must be between 0.1 mm and 500.0 mm (Current: ${nominalDiameter} mm).` };
      }
      const res = calculateFit(nominalDiameter, selectedHoleClass, selectedShaftClass);
      return { data: res, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Error evaluating ISO 286 fit.' };
    }
  }, [nominalDiameter, selectedHoleClass, selectedShaftClass]);

  // Compute 1D Stack-Up
  const stackUpResult = useMemo(() => {
    try {
      if (components.length === 0) return null;
      return calculateToleranceStackUp(components);
    } catch {
      return null;
    }
  }, [components]);

  const handleSelectStandardFit = (fitStr: string) => {
    const parts = fitStr.split('/');
    if (parts.length === 2) {
      setSelectedHoleClass(parts[0]);
      setSelectedShaftClass(parts[1]);
    }
  };

  const copyFitCallout = () => {
    if (!fitResult.data) return;
    const f = fitResult.data;
    const text = `⌀${f.nominalDiameterMm} ${f.holeClass}/${f.shaftClass}\n` +
      `Hole ${f.holeClass}: ${f.holeLimits.minDimensionMm.toFixed(3)} to ${f.holeLimits.maxDimensionMm.toFixed(3)} mm (EI: ${f.holeLimits.lowerDeviationUm >= 0 ? '+' : ''}${f.holeLimits.lowerDeviationUm} µm, ES: +${f.holeLimits.upperDeviationUm} µm)\n` +
      `Shaft ${f.shaftClass}: ${f.shaftLimits.minDimensionMm.toFixed(3)} to ${f.shaftLimits.maxDimensionMm.toFixed(3)} mm (ei: ${f.shaftLimits.lowerDeviationUm >= 0 ? '+' : ''}${f.shaftLimits.lowerDeviationUm} µm, es: ${f.shaftLimits.upperDeviationUm >= 0 ? '+' : ''}${f.shaftLimits.upperDeviationUm} µm)\n` +
      `Fit Type: ${f.fitType.toUpperCase()} | Clearance: ${f.minClearanceUm} to ${f.maxClearanceUm} µm | Interference: ${f.minInterferenceUm} to ${f.maxInterferenceUm} µm\n` +
      `Standard: ISO 286-1:2010 / ISO 286-2:2010 @ 20°C`;
    navigator.clipboard.writeText(text);
    setCopiedFit(true);
    setTimeout(() => setCopiedFit(false), 2000);
  };

  const copyStackUpReport = () => {
    if (!stackUpResult) return;
    const s = stackUpResult;
    const text = `1D DIMENSIONAL TOLERANCE STACK-UP REPORT\n` +
      `Nominal Assembly Gap: ${s.nominalAssemblyMm.toFixed(3)} mm\n` +
      `Worst-Case Limits: ${s.worstCaseMinMm.toFixed(3)} mm to ${s.worstCaseMaxMm.toFixed(3)} mm (Total Var: ${s.worstCaseVariationMm.toFixed(3)} mm)\n` +
      `Statistical RSS (±3σ): ${s.rssMinMm.toFixed(3)} mm to ${s.rssMaxMm.toFixed(3)} mm (Estimated Var: ${s.rssVariationMm.toFixed(3)} mm)\n` +
      `Top Tolerance Driver: ${s.topDriver.component.name} (${s.topDriver.worstCasePercent}% of WC variation)\n` +
      `Components in Chain: ${s.contributors.length}`;
    navigator.clipboard.writeText(text);
    setCopiedStackUp(true);
    setTimeout(() => setCopiedStackUp(false), 2000);
  };

  const addComponent = () => {
    const newId = String(Date.now());
    setComponents((prev) => [
      ...prev,
      {
        id: newId,
        name: `Component ${prev.length + 1}`,
        nominalMm: 10.0,
        upperTolMm: 0.05,
        lowerTolMm: -0.05,
        direction: 1,
        description: 'Linear dimension',
      },
    ]);
  };

  const updateComponent = (id: string, field: keyof StackUpComponent, value: any) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const removeComponent = (id: string) => {
    if (components.length <= 1) return;
    setComponents((prev) => prev.filter((c) => c.id !== id));
  };

  const holeOptions = ['H6', 'H7', 'H8', 'H9', 'H11', 'JS7'];
  const shaftOptions = ['h6', 'h7', 'h8', 'h9', 'g6', 'f7', 'e8', 'd11', 'js6', 'k6', 'm6', 'n6', 'p6', 'r6', 's6'];

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in text-[#F0F1F2] max-w-7xl mx-auto flex flex-col bg-[#111315] font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#34393F]">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#64D6C5]">
              Manufacturing Tolerances & Fits Engine
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-[2px] text-[9px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck size={10} /> ISO 286-1 / ISO 286-2 Verified
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#F0F1F2]">
            Dimensional Engineering & Tolerance Stack-Up Workstation
          </h1>
          <p className="text-xs text-[#969DA5] font-mono mt-0.5">
            Deterministic cylindrical limits, hole-shaft fits, and 1D worst-case / statistical RSS assembly accumulation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-[3px] bg-[#191C1F] p-0.5 border border-[#34393F]">
            <button
              onClick={() => setActiveTab('fits')}
              className={`px-3 py-1 rounded-[2px] text-xs font-mono transition-colors flex items-center gap-1.5 ${
                activeTab === 'fits'
                  ? 'bg-[#22262A] text-[#64D6C5] font-bold border border-[#34393F]'
                  : 'text-[#969DA5] hover:text-[#F0F1F2]'
              }`}
            >
              <Sliders size={12} />
              ISO 286 Fits & Limits
            </button>
            <button
              onClick={() => setActiveTab('stackup')}
              className={`px-3 py-1 rounded-[2px] text-xs font-mono transition-colors flex items-center gap-1.5 ${
                activeTab === 'stackup'
                  ? 'bg-[#22262A] text-[#64D6C5] font-bold border border-[#34393F]'
                  : 'text-[#969DA5] hover:text-[#F0F1F2]'
              }`}
            >
              <Scale size={12} />
              1D Stack-Up Analyzer
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab 1: ISO 286 Fits & Limits */}
      {activeTab === 'fits' && (
        <div className="space-y-4">
          {/* Controls Bar: Nominal Size & Standard Fits Quick Select */}
          <div className="p-3 bg-[#191C1F] rounded-[4px] border border-[#34393F] space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="text-xs font-mono text-[#969DA5]">
                  <span>Nominal Diameter (⌀):</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0.1}
                    max={500}
                    step={0.5}
                    value={nominalDiameter}
                    onChange={(e) => setNominalDiameter(parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1 bg-[#14171A] border border-[#34393F] rounded-[3px] text-xs text-[#F0F1F2] font-mono focus:outline-none focus:border-[#64D6C5]"
                  />
                  <span className="text-xs font-mono text-[#6C737D]">mm</span>
                </div>

                {nominalDiameter !== designParams.diameter && (
                  <button
                    onClick={() => setNominalDiameter(designParams.diameter)}
                    className="text-[10px] font-mono text-[#64D6C5] bg-[#64D6C5]/10 hover:bg-[#64D6C5]/20 border border-[#64D6C5]/30 px-2 py-1 rounded-[2px] transition-colors"
                  >
                    Sync CAD ⌀{designParams.diameter} mm
                  </button>
                )}
              </div>

              {fitResult.data && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      sendCopilotMessage(
                        `Explain functional suitability and manufacturing requirements for fit ⌀${nominalDiameter} ${selectedHoleClass}/${selectedShaftClass} on current shaft design.`
                      )
                    }
                    className="bg-[#22262A] hover:bg-[#2E3339] text-[#F0F1F2] border border-[#34393F] font-mono text-xs py-1 px-2.5 rounded-[3px] flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles size={12} className="text-[#64D6C5]" />
                    <span>Ask Copilot</span>
                  </button>
                  <button
                    onClick={copyFitCallout}
                    className="bg-[#22262A] hover:bg-[#2E3339] text-[#64D6C5] border border-[#34393F] font-mono text-xs py-1 px-2.5 rounded-[3px] flex items-center gap-1.5 transition-colors"
                  >
                    {copiedFit ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedFit ? 'Copied' : 'Copy Callout'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Fit Pills */}
            <div className="space-y-1.5 pt-1 border-t border-[#2A2E35]">
              <span className="text-[10px] font-mono uppercase text-[#6C737D] block">
                Standard Machinery Fit Presets (ISO 286-1 Annex B):
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {STANDARD_FITS.map((sf) => {
                  const isCurrent =
                    sf.holeClass === selectedHoleClass && sf.shaftClass === selectedShaftClass;
                  return (
                    <button
                      key={sf.designation}
                      onClick={() => handleSelectStandardFit(sf.designation)}
                      className={`px-2 py-0.5 rounded-[2px] text-xs font-mono transition-colors shrink-0 flex items-center gap-1 border ${
                        isCurrent
                          ? 'bg-[#64D6C5]/20 text-[#64D6C5] border-[#64D6C5]'
                          : 'bg-[#14171A] hover:bg-[#22262A] text-[#969DA5] hover:text-[#F0F1F2] border-[#2A2E35]'
                      }`}
                    >
                      <span className="font-bold">{sf.designation}</span>
                      <span className="text-[10px] text-[#6C737D]">({sf.category[0]})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Class Dropdowns */}
            <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-[#2A2E35] text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[#969DA5]">Hole Class:</span>
                <select
                  value={selectedHoleClass}
                  onChange={(e) => setSelectedHoleClass(e.target.value)}
                  className="bg-[#14171A] border border-[#34393F] text-[#F0F1F2] rounded-[3px] px-2 py-1 text-xs font-mono focus:outline-none focus:border-[#64D6C5]"
                >
                  {holeOptions.map((h) => (
                    <option key={h} value={h}>
                      {h} (Hole Basis)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[#969DA5]">Shaft Class:</span>
                <select
                  value={selectedShaftClass}
                  onChange={(e) => setSelectedShaftClass(e.target.value)}
                  className="bg-[#14171A] border border-[#34393F] text-[#F0F1F2] rounded-[3px] px-2 py-1 text-xs font-mono focus:outline-none focus:border-[#64D6C5]"
                >
                  {shaftOptions.map((s) => (
                    <option key={s} value={s}>
                      {s} ({s.startsWith('h') || s.startsWith('g') || s.startsWith('f') || s.startsWith('e') || s.startsWith('d') ? 'Clearance' : s.startsWith('k') || s.startsWith('m') || s.startsWith('n') || s.startsWith('js') ? 'Transition' : 'Interference'})
                    </option>
                  ))}
                </select>
              </div>

              {fitResult.data && (
                <div className="text-[11px] text-[#6C737D]">
                  ISO Size Step: <span className="text-[#C2C8D0]">{fitResult.data.diameterStep.label}</span>
                </div>
              )}
            </div>
          </div>

          {/* Error Message if Out of Range */}
          {fitResult.error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-[4px] text-xs font-mono text-rose-400 flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>{fitResult.error}</span>
            </div>
          )}

          {/* Results Display */}
          {fitResult.data && (
            <div className="space-y-4">
              {/* Classification Banner & Core Limits Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Fit Classification Card */}
                <div className="p-3.5 bg-[#191C1F] rounded-[4px] border border-[#34393F] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[#6C737D]">Fit Type Classification</span>
                    <span
                      className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold uppercase border ${
                        fitResult.data.fitType === 'clearance'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : fitResult.data.fitType === 'transition'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      }`}
                    >
                      {fitResult.data.fitType} Fit
                    </span>
                  </div>

                  <div className="font-mono text-lg font-bold text-[#F0F1F2]">
                    ⌀{fitResult.data.nominalDiameterMm} {fitResult.data.holeClass}/{fitResult.data.shaftClass}
                  </div>

                  <div className="text-xs font-mono space-y-1 pt-1 border-t border-[#2A2E35]">
                    {fitResult.data.fitType === 'clearance' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-[#969DA5]">Min Clearance (C_min):</span>
                          <span className="text-emerald-400 font-bold">+{fitResult.data.minClearanceUm} µm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#969DA5]">Max Clearance (C_max):</span>
                          <span className="text-emerald-400 font-bold">+{fitResult.data.maxClearanceUm} µm</span>
                        </div>
                      </>
                    )}

                    {fitResult.data.fitType === 'interference' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-[#969DA5]">Min Interference (I_min):</span>
                          <span className="text-purple-300 font-bold">+{fitResult.data.minInterferenceUm} µm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#969DA5]">Max Interference (I_max):</span>
                          <span className="text-purple-300 font-bold">+{fitResult.data.maxInterferenceUm} µm</span>
                        </div>
                      </>
                    )}

                    {fitResult.data.fitType === 'transition' && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-[#969DA5]">Max Clearance:</span>
                          <span className="text-emerald-400 font-bold">+{fitResult.data.maxClearanceUm} µm</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#969DA5]">Max Interference:</span>
                          <span className="text-purple-300 font-bold">+{fitResult.data.maxInterferenceUm} µm</span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between text-[#6C737D] pt-0.5">
                      <span>Total Fit Tolerance Zone:</span>
                      <span>{fitResult.data.fitToleranceUm} µm</span>
                    </div>
                  </div>
                </div>

                {/* Hole Limits Card */}
                <div className="p-3.5 bg-[#191C1F] rounded-[4px] border border-[#34393F] space-y-2 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-[#6C737D]">Hole Component ({fitResult.data.holeClass})</span>
                    <span className="text-[10px] text-[#64D6C5] bg-[#14171A] px-1 rounded-[2px] border border-[#2A2E35]">
                      {fitResult.data.holeLimits.toleranceGrade} ({fitResult.data.holeLimits.toleranceZoneUm} µm)
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#969DA5]">Upper Deviation (ES):</span>
                      <span className="text-[#F0F1F2]">
                        {fitResult.data.holeLimits.upperDeviationUm >= 0 ? '+' : ''}
                        {fitResult.data.holeLimits.upperDeviationUm} µm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#969DA5]">Lower Deviation (EI):</span>
                      <span className="text-[#F0F1F2]">
                        {fitResult.data.holeLimits.lowerDeviationUm >= 0 ? '+' : ''}
                        {fitResult.data.holeLimits.lowerDeviationUm} µm
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#2A2E35]">
                      <span className="text-[#969DA5]">Max Hole (D_max):</span>
                      <span className="text-[#64D6C5] font-bold">
                        {fitResult.data.holeLimits.maxDimensionMm.toFixed(3)} mm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#969DA5]">Min Hole (D_min):</span>
                      <span className="text-[#64D6C5] font-bold">
                        {fitResult.data.holeLimits.minDimensionMm.toFixed(3)} mm
                      </span>
                    </div>
                  </div>
                </div>

                {/* Shaft Limits Card */}
                <div className="p-3.5 bg-[#191C1F] rounded-[4px] border border-[#34393F] space-y-2 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-[#6C737D]">Shaft Component ({fitResult.data.shaftClass})</span>
                    <span className="text-[10px] text-[#64D6C5] bg-[#14171A] px-1 rounded-[2px] border border-[#2A2E35]">
                      {fitResult.data.shaftLimits.toleranceGrade} ({fitResult.data.shaftLimits.toleranceZoneUm} µm)
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#969DA5]">Upper Deviation (es):</span>
                      <span className="text-[#F0F1F2]">
                        {fitResult.data.shaftLimits.upperDeviationUm >= 0 ? '+' : ''}
                        {fitResult.data.shaftLimits.upperDeviationUm} µm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#969DA5]">Lower Deviation (ei):</span>
                      <span className="text-[#F0F1F2]">
                        {fitResult.data.shaftLimits.lowerDeviationUm >= 0 ? '+' : ''}
                        {fitResult.data.shaftLimits.lowerDeviationUm} µm
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#2A2E35]">
                      <span className="text-[#969DA5]">Max Shaft (d_max):</span>
                      <span className="text-sky-300 font-bold">
                        {fitResult.data.shaftLimits.maxDimensionMm.toFixed(3)} mm
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#969DA5]">Min Shaft (d_min):</span>
                      <span className="text-sky-300 font-bold">
                        {fitResult.data.shaftLimits.minDimensionMm.toFixed(3)} mm
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Tolerance Band Visualization (SVG) */}
              <div className="p-4 bg-[#191C1F] rounded-[4px] border border-[#34393F] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">
                    Tolerance Zone Diagram (ISO 286 Graphical Representation)
                  </span>
                  <span className="text-[10px] font-mono text-[#6C737D]">
                    Zero Line = ⌀{fitResult.data.nominalDiameterMm}.000 mm
                  </span>
                </div>

                <div className="w-full bg-[#14171A] rounded-[3px] p-4 border border-[#2A2E35]">
                  <svg className="w-full h-36" viewBox="0 0 600 120">
                    {/* Background Grid Lines */}
                    <line x1="50" y1="60" x2="550" y2="60" stroke="#4A525D" strokeWidth="1.5" strokeDasharray="4 4" />
                    <text x="555" y="64" fill="#969DA5" fontSize="10" fontFamily="monospace">Zero Line (0 µm)</text>

                    {/* Scale Reference */}
                    <line x1="50" y1="20" x2="50" y2="100" stroke="#34393F" strokeWidth="1" />
                    <text x="35" y="25" fill="#6C737D" fontSize="9" fontFamily="monospace">+50</text>
                    <text x="40" y="63" fill="#6C737D" fontSize="9" fontFamily="monospace">0</text>
                    <text x="35" y="102" fill="#6C737D" fontSize="9" fontFamily="monospace">-50</text>

                    {/* Dynamic Scaling Factor: 50 um = 40 pixels */}
                    {(() => {
                      const scale = 0.8; // px per um
                      const zeroY = 60;

                      // Hole Box (Left Column, x=140 to 240)
                      const holeTopY = zeroY - fitResult.data.holeLimits.upperDeviationUm * scale;
                      const holeBottomY = zeroY - fitResult.data.holeLimits.lowerDeviationUm * scale;
                      const holeHeight = Math.max(holeBottomY - holeTopY, 4);

                      // Shaft Box (Right Column, x=340 to 440)
                      const shaftTopY = zeroY - fitResult.data.shaftLimits.upperDeviationUm * scale;
                      const shaftBottomY = zeroY - fitResult.data.shaftLimits.lowerDeviationUm * scale;
                      const shaftHeight = Math.max(shaftBottomY - shaftTopY, 4);

                      return (
                        <>
                          {/* Hole Zone */}
                          <rect
                            x="140"
                            y={holeTopY}
                            width="120"
                            height={holeHeight}
                            fill="#64D6C5"
                            fillOpacity="0.25"
                            stroke="#64D6C5"
                            strokeWidth="1.5"
                            rx="2"
                          />
                          <text x="200" y={holeTopY - 6} fill="#64D6C5" fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                            Hole {fitResult.data.holeClass} [+{fitResult.data.holeLimits.lowerDeviationUm}, +{fitResult.data.holeLimits.upperDeviationUm} µm]
                          </text>

                          {/* Shaft Zone */}
                          <rect
                            x="340"
                            y={shaftTopY}
                            width="120"
                            height={shaftHeight}
                            fill="#38BDF8"
                            fillOpacity="0.25"
                            stroke="#38BDF8"
                            strokeWidth="1.5"
                            rx="2"
                          />
                          <text x="400" y={shaftTopY - 6} fill="#38BDF8" fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                            Shaft {fitResult.data.shaftClass} [{fitResult.data.shaftLimits.lowerDeviationUm >= 0 ? '+' : ''}{fitResult.data.shaftLimits.lowerDeviationUm}, {fitResult.data.shaftLimits.upperDeviationUm >= 0 ? '+' : ''}{fitResult.data.shaftLimits.upperDeviationUm} µm]
                          </text>

                          {/* Fit Relation Dimension Line */}
                          {fitResult.data.fitType === 'clearance' && (
                            <line x1="280" y1={holeBottomY} x2="320" y2={shaftTopY} stroke="#34D399" strokeWidth="1" strokeDasharray="2 2" />
                          )}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              {/* Manufacturing & Assembly Decision Support */}
              <div className="p-4 bg-[#191C1F] rounded-[4px] border border-[#34393F] space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#F0F1F2] uppercase tracking-wider">
                    Manufacturing & Assembly Engineering Guidance
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-[#14171A] p-3 rounded-[3px] border border-[#2A2E35] space-y-1">
                    <span className="text-[10px] text-[#64D6C5] font-bold uppercase block">Functional Purpose</span>
                    <p className="text-[#C2C8D0] leading-relaxed text-[11px]">
                      {fitResult.data.functionalDescription}
                    </p>
                  </div>

                  <div className="bg-[#14171A] p-3 rounded-[3px] border border-[#2A2E35] space-y-1">
                    <span className="text-[10px] text-amber-400 font-bold uppercase block">Assembly Method</span>
                    <p className="text-[#C2C8D0] leading-relaxed text-[11px]">
                      {fitResult.data.assemblyGuidance}
                    </p>
                  </div>
                </div>

                {fitResult.data.warnings.length > 0 && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-[3px] text-xs font-mono text-amber-400 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle size={13} /> Engineering Warnings:
                    </div>
                    {fitResult.data.warnings.map((w, idx) => (
                      <div key={idx} className="text-[11px] pl-4">• {w}</div>
                    ))}
                  </div>
                )}

                <div className="text-[10px] font-mono text-[#6C737D] border-t border-[#2A2E35] pt-2">
                  <span>Standard Notes: </span>
                  {fitResult.data.limitations.join(' | ')}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Tab 2: 1D Tolerance Stack-Up Analyzer */}
      {activeTab === 'stackup' && (
        <div className="space-y-4">
          {/* Header Controls for Stack-Up */}
          <div className="p-3 bg-[#191C1F] rounded-[4px] border border-[#34393F] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
            <div>
              <span className="text-[#64D6C5] font-bold">1D Linear Tolerance Accumulation Chain:</span> Analyzes both Worst-Case arithmetic boundaries and Root-Sum-Square (RSS) statistical distributions.
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setComponents(defaultComponents)}
                className="bg-[#22262A] hover:bg-[#2E3339] text-[#969DA5] hover:text-[#F0F1F2] border border-[#34393F] px-2.5 py-1 rounded-[3px] flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={11} /> Reset Sample Chain
              </button>
              <button
                onClick={addComponent}
                className="bg-[#64D6C5] hover:bg-[#52c4b3] text-[#111315] font-semibold px-3 py-1 rounded-[3px] flex items-center gap-1 transition-colors shadow-sm"
              >
                <Plus size={12} /> Add Component
              </button>
              {stackUpResult && (
                <button
                  onClick={copyStackUpReport}
                  className="bg-[#22262A] hover:bg-[#2E3339] text-[#64D6C5] border border-[#34393F] px-2.5 py-1 rounded-[3px] flex items-center gap-1 transition-colors"
                >
                  {copiedStackUp ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedStackUp ? 'Copied' : 'Copy Report'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Results Summary Cards */}
          {stackUpResult && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Worst-Case Summary */}
              <div className="p-3.5 bg-[#191C1F] rounded-[4px] border border-[#34393F] space-y-2 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-[#6C737D]">Worst-Case (Arithmetic)</span>
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded-[2px] border border-amber-500/20 font-bold uppercase">
                    Guaranteed Bound
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#969DA5]">Nominal Gap:</span>
                    <span className="text-[#F0F1F2] font-bold">{stackUpResult.nominalAssemblyMm.toFixed(3)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#969DA5]">Assembly Minimum:</span>
                    <span className="text-[#F0F1F2] font-bold">{stackUpResult.worstCaseMinMm.toFixed(3)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#969DA5]">Assembly Maximum:</span>
                    <span className="text-[#F0F1F2] font-bold">{stackUpResult.worstCaseMaxMm.toFixed(3)} mm</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#2A2E35]">
                    <span className="text-[#969DA5]">Total Variation:</span>
                    <span className="text-amber-400 font-bold">{stackUpResult.worstCaseVariationMm.toFixed(3)} mm</span>
                  </div>
                </div>
              </div>

              {/* Statistical RSS Summary */}
              <div className="p-3.5 bg-[#191C1F] rounded-[4px] border border-[#34393F] space-y-2 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-[#6C737D]">Statistical RSS (±3σ)</span>
                  <span className="text-[10px] text-[#64D6C5] bg-[#64D6C5]/10 px-1.5 py-0.2 rounded-[2px] border border-[#64D6C5]/20 font-bold uppercase">
                    Probabilistic
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#969DA5]">Predicted Spread:</span>
                    <span className="text-[#64D6C5] font-bold">±{(stackUpResult.rssVariationMm / 2).toFixed(3)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#969DA5]">RSS Minimum:</span>
                    <span className="text-[#F0F1F2]">{stackUpResult.rssMinMm.toFixed(3)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#969DA5]">RSS Maximum:</span>
                    <span className="text-[#F0F1F2]">{stackUpResult.rssMaxMm.toFixed(3)} mm</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#2A2E35]">
                    <span className="text-[#969DA5]">Predicted Variation:</span>
                    <span className="text-[#64D6C5] font-bold">{stackUpResult.rssVariationMm.toFixed(3)} mm</span>
                  </div>
                </div>
              </div>

              {/* Top Driver & Optimization Notice */}
              <div className="p-3.5 bg-[#191C1F] rounded-[4px] border border-[#34393F] space-y-2 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-[#6C737D]">Governing Tolerance Driver</span>
                  <span className="text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded-[2px] border border-sky-500/20 font-bold uppercase">
                    Sensitivity
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div className="font-bold text-[#F0F1F2] truncate">
                    {stackUpResult.topDriver.component.name}
                  </div>
                  <div className="flex justify-between text-[#969DA5]">
                    <span>Tolerance Band:</span>
                    <span className="text-[#C2C8D0]">{stackUpResult.topDriver.toleranceRangeMm.toFixed(3)} mm</span>
                  </div>
                  <div className="flex justify-between text-[#969DA5]">
                    <span>Worst-Case Impact:</span>
                    <span className="text-amber-400 font-bold">{stackUpResult.topDriver.worstCasePercent}%</span>
                  </div>
                  <div className="flex justify-between text-[#969DA5]">
                    <span>RSS Variance Contribution:</span>
                    <span className="text-[#64D6C5] font-bold">{stackUpResult.topDriver.rssVariancePercent}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Component Chain Table */}
          <div className="bg-[#191C1F] rounded-[4px] border border-[#34393F] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead className="bg-[#22262A] border-b border-[#34393F] text-[10px] font-mono text-[#969DA5] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Vector</th>
                    <th className="py-2.5 px-3">Component / Description</th>
                    <th className="py-2.5 px-3">Nominal (mm)</th>
                    <th className="py-2.5 px-3">Upper Tol (+mm)</th>
                    <th className="py-2.5 px-3">Lower Tol (-mm)</th>
                    <th className="py-2.5 px-3">Limits (Min / Max)</th>
                    <th className="py-2.5 px-3">Range</th>
                    <th className="py-2.5 px-3">WC %</th>
                    <th className="py-2.5 px-3">RSS %</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2E35] font-mono text-xs">
                  {components.map((comp) => {
                    const contrib = stackUpResult?.contributors.find((c) => c.component.id === comp.id);
                    const isTopDriver = stackUpResult?.topDriver.component.id === comp.id;

                    return (
                      <tr key={comp.id} className={`hover:bg-[#22262A] ${isTopDriver ? 'bg-[#64D6C5]/5' : ''}`}>
                        <td className="py-2 px-3">
                          <button
                            onClick={() => updateComponent(comp.id, 'direction', comp.direction === 1 ? -1 : 1)}
                            className={`px-2 py-0.5 rounded-[2px] text-xs font-bold ${
                              comp.direction === 1
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {comp.direction === 1 ? '+ ADD' : '- SUB'}
                          </button>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={comp.name}
                            onChange={(e) => updateComponent(comp.id, 'name', e.target.value)}
                            className="bg-[#14171A] border border-[#34393F] text-[#F0F1F2] px-2 py-0.5 rounded-[2px] text-xs w-48 focus:outline-none focus:border-[#64D6C5]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step={0.1}
                            value={comp.nominalMm}
                            onChange={(e) => updateComponent(comp.id, 'nominalMm', parseFloat(e.target.value) || 0)}
                            className="bg-[#14171A] border border-[#34393F] text-[#F0F1F2] px-2 py-0.5 rounded-[2px] text-xs w-20 focus:outline-none focus:border-[#64D6C5]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step={0.005}
                            value={comp.upperTolMm}
                            onChange={(e) => updateComponent(comp.id, 'upperTolMm', parseFloat(e.target.value) || 0)}
                            className="bg-[#14171A] border border-[#34393F] text-emerald-400 px-2 py-0.5 rounded-[2px] text-xs w-20 focus:outline-none focus:border-[#64D6C5]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step={0.005}
                            value={comp.lowerTolMm}
                            onChange={(e) => updateComponent(comp.id, 'lowerTolMm', parseFloat(e.target.value) || 0)}
                            className="bg-[#14171A] border border-[#34393F] text-rose-400 px-2 py-0.5 rounded-[2px] text-xs w-20 focus:outline-none focus:border-[#64D6C5]"
                          />
                        </td>
                        <td className="py-2 px-3 text-[#C2C8D0] text-[11px]">
                          {contrib ? `${contrib.minMm.toFixed(3)} / ${contrib.maxMm.toFixed(3)}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-[#F0F1F2] font-bold">
                          {contrib ? `${contrib.toleranceRangeMm.toFixed(3)} mm` : '—'}
                        </td>
                        <td className="py-2 px-3 text-amber-400">
                          {contrib ? `${contrib.worstCasePercent}%` : '—'}
                        </td>
                        <td className="py-2 px-3 text-[#64D6C5]">
                          {contrib ? `${contrib.rssVariancePercent}%` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => removeComponent(comp.id)}
                            disabled={components.length <= 1}
                            className="text-[#6C737D] hover:text-rose-400 disabled:opacity-30 p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statistical Assumptions & Legal Disclaimer */}
          {stackUpResult && (
            <div className="p-3 bg-[#191C1F] rounded-[4px] border border-[#34393F] space-y-2 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-[#64D6C5] font-bold">
                <Info size={14} /> Statistical Stack-Up Engineering Assumptions:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#969DA5]">
                {stackUpResult.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
              <div className="text-[10px] text-amber-400/90 border-t border-[#2A2E35] pt-1.5">
                <span className="font-bold">Disclaimer: </span>
                {stackUpResult.disclaimer}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
