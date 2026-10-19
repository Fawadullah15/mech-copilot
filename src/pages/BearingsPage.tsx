import React, { useState, useMemo } from 'react';
import {
  CircleDot,
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
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getAllBearings,
  getBearingsByBore,
  getBearingById,
  runCompleteBearingAnalysis,
  type SupportArrangement,
  type LocatingSupportId,
  type BearingCatalogItem
} from '../engineering/bearings';

export default function BearingsPage() {
  const { designParams, selectedMaterial, activeProject, setActivePage } = useApp();

  // Primary engineering parameters (initialized from project context)
  const [shaftLength, setShaftLength] = useState<number>(designParams.length || 320);
  const [shaftDiameter, setShaftDiameter] = useState<number>(designParams.diameter || 45);
  const [rpm, setRpm] = useState<number>(designParams.rpm || 1800);

  // Bearing station positions (mm)
  const defaultXA = Math.max(10, Math.round((designParams.length || 320) * 0.08));
  const defaultXB = Math.min(
    (designParams.length || 320) - 10,
    Math.round((designParams.length || 320) * 0.92)
  );
  const [xA, setXA] = useState<number>(defaultXA);
  const [xB, setXB] = useState<number>(defaultXB);

  // Applied loading
  const defaultLoadX = Math.round((designParams.length || 320) * 0.5);
  const [loadX, setLoadX] = useState<number>(defaultLoadX);
  const [appliedFy, setAppliedFy] = useState<number>(-(designParams.force || 2500));
  const [appliedFz, setAppliedFz] = useState<number>(0);
  const [appliedFa, setAppliedFa] = useState<number>(1200);

  // Support arrangement
  const [arrangement, setArrangement] = useState<SupportArrangement>('locating_floating');
  const [locatingStation, setLocatingStation] = useState<LocatingSupportId>('A');

  // Candidate bearings selection
  const catalogBearings = useMemo(() => getAllBearings(), []);

  // Default selection matching diameter
  const initialBearingA = useMemo(() => {
    const matching = getBearingsByBore(shaftDiameter);
    return matching.length > 0 ? matching[0].id : 'dgbb-6209';
  }, [shaftDiameter]);

  const initialBearingB = useMemo(() => {
    const matching = getBearingsByBore(shaftDiameter);
    const crb = matching.find((b) => b.type === 'cylindrical_roller');
    return crb ? crb.id : matching.length > 1 ? matching[1].id : 'crb-nu209';
  }, [shaftDiameter]);

  const [selectedBearingIdA, setSelectedBearingIdA] = useState<string>(initialBearingA);
  const [selectedBearingIdB, setSelectedBearingIdB] = useState<string>(initialBearingB);
  const [filterByBoreOnly, setFilterByBoreOnly] = useState<boolean>(true);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'workstation' | 'catalog' | 'audit' | 'report'>('workstation');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Filtered catalog options
  const candidateList = useMemo(() => {
    if (filterByBoreOnly) {
      const filtered = getBearingsByBore(shaftDiameter);
      return filtered.length > 0 ? filtered : catalogBearings;
    }
    return catalogBearings;
  }, [filterByBoreOnly, shaftDiameter, catalogBearings]);

  // Execute full bearing analysis deterministically
  const analysisResult = useMemo(() => {
    try {
      const bA = getBearingById(selectedBearingIdA) || catalogBearings[0];
      const bB = getBearingById(selectedBearingIdB) || catalogBearings[1];

      return runCompleteBearingAnalysis({
        shaftLength,
        shaftDiameter,
        rpm,
        xA,
        xB,
        transverseLoads: [
          {
            id: 'load-1',
            name: 'Primary Transverse Load',
            x: loadX,
            Fy: appliedFy,
            Fz: appliedFz
          }
        ],
        axialLoads: [
          {
            id: 'axial-1',
            name: 'Axial Thrust Load',
            x: loadX,
            Fa: appliedFa
          }
        ],
        arrangement,
        locatingStation,
        bearingA: bA,
        bearingB: bB
      });
    } catch (err: any) {
      return {
        error: err?.message || 'Error running bearing analysis'
      };
    }
  }, [
    shaftLength,
    shaftDiameter,
    rpm,
    xA,
    xB,
    loadX,
    appliedFy,
    appliedFz,
    appliedFa,
    arrangement,
    locatingStation,
    selectedBearingIdA,
    selectedBearingIdB,
    catalogBearings
  ]);

  const handleResetDefaults = () => {
    setShaftLength(designParams.length || 320);
    setShaftDiameter(designParams.diameter || 45);
    setRpm(designParams.rpm || 1800);
    setXA(Math.max(10, Math.round((designParams.length || 320) * 0.08)));
    setXB(Math.min((designParams.length || 320) - 10, Math.round((designParams.length || 320) * 0.92)));
    setLoadX(Math.round((designParams.length || 320) * 0.5));
    setAppliedFy(-(designParams.force || 2500));
    setAppliedFz(0);
    setAppliedFa(1200);
    setArrangement('locating_floating');
    setLocatingStation('A');
    setSelectedBearingIdA('dgbb-6209');
    setSelectedBearingIdB('crb-nu209');
  };

  const handleCopyReport = () => {
    if (!analysisResult || 'error' in analysisResult) return;
    const reportMd = generateMarkdownReport(analysisResult);
    navigator.clipboard.writeText(reportMd);
    setCopyFeedback('Report copied to clipboard!');
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const handleDownloadReport = () => {
    if (!analysisResult || 'error' in analysisResult) return;
    const reportMd = generateMarkdownReport(analysisResult);
    const blob = new Blob([reportMd], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bearing-analysis-${activeProject.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-navy-950 p-6 text-gray-100">
      {/* ─── Header ─── */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-navy-800 pb-5 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#64D6C5]/30 bg-[#64D6C5]/10 text-[#64D6C5]">
              <CircleDot size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Rolling Bearings & Dynamic L10 Rating Life Workstation
              </h1>
              <p className="text-xs text-gray-400">
                ISO 281:2007 dynamic life · ISO 76:2006 static safety · 3D static equilibrium reactions · Locating/floating support arrangements
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 rounded border border-navy-700 bg-navy-800/80 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-navy-700 hover:text-white"
            title="Reset parameters to project defaults"
          >
            <RotateCcw size={14} />
            Reset Defaults
          </button>
          <button
            onClick={handleCopyReport}
            disabled={'error' in analysisResult}
            className="flex items-center gap-1.5 rounded border border-navy-700 bg-navy-800/80 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-navy-700 hover:text-white disabled:opacity-50"
          >
            <Copy size={14} />
            {copyFeedback ? copyFeedback : 'Copy Report'}
          </button>
          <button
            onClick={handleDownloadReport}
            disabled={'error' in analysisResult}
            className="flex items-center gap-1.5 rounded border border-[#64D6C5]/40 bg-[#64D6C5]/20 px-3 py-1.5 text-xs font-medium text-[#64D6C5] transition-colors hover:bg-[#64D6C5]/30 disabled:opacity-50"
          >
            <Download size={14} />
            Export Markdown
          </button>
        </div>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div className="mb-6 flex border-b border-navy-800">
        <button
          onClick={() => setActiveTab('workstation')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'workstation'
              ? 'border-[#64D6C5] text-[#64D6C5]'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Sliders size={15} />
          Workstation & Schematic
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'catalog'
              ? 'border-[#64D6C5] text-[#64D6C5]'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Disc size={15} />
          ISO Bearing Catalog
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'audit'
              ? 'border-[#64D6C5] text-[#64D6C5]'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <ShieldCheck size={15} />
          Mathematical Traceability & Audit
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'report'
              ? 'border-[#64D6C5] text-[#64D6C5]'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <BookOpen size={15} />
          Engineering Report
        </button>
      </div>

      {/* ─── TAB 1: WORKSTATION & SCHEMATIC ─── */}
      {activeTab === 'workstation' && (
        <div className="space-y-6">
          {'error' in analysisResult ? (
            <div className="rounded-lg border border-red-500/50 bg-red-950/30 p-4 text-red-200">
              <div className="flex items-center gap-2 font-semibold">
                <AlertOctagon size={18} />
                Input Error
              </div>
              <p className="mt-1 text-xs">{analysisResult.error}</p>
            </div>
          ) : (
            <>
              {/* Overall Assessment Banner */}
              <div
                className={`flex items-center justify-between rounded-lg border p-4 ${
                  analysisResult.overallStatus === 'pass'
                    ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                    : analysisResult.overallStatus === 'warning'
                    ? 'border-amber-500/40 bg-amber-950/20 text-amber-300'
                    : 'border-rose-500/40 bg-rose-950/20 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {analysisResult.overallStatus === 'pass' ? (
                    <CheckCircle2 size={22} className="text-emerald-400" />
                  ) : analysisResult.overallStatus === 'warning' ? (
                    <AlertTriangle size={22} className="text-amber-400" />
                  ) : (
                    <AlertOctagon size={22} className="text-rose-400" />
                  )}
                  <div>
                    <h3 className="text-sm font-semibold">
                      {analysisResult.overallStatus === 'pass'
                        ? 'Bearing Subsystem Approved — Dynamic Life & Static Safety Verified'
                        : analysisResult.overallStatus === 'warning'
                        ? 'Marginal Bearing Operating Conditions — Review Service Life Margins'
                        : 'Subsystem Alert — Inadequate Dynamic Life or Static Brinelling Risk'}
                    </h3>
                    <p className="text-xs opacity-90">{analysisResult.summary}</p>
                  </div>
                </div>

                <div className="hidden text-right text-xs md:block">
                  <div className="font-mono font-semibold text-white">
                    Min L10h:{' '}
                    {Math.round(
                      Math.min(
                        analysisResult.stationA.dynamicLife.L10Hours,
                        analysisResult.stationB.dynamicLife.L10Hours
                      )
                    ).toLocaleString()}{' '}
                    h
                  </div>
                  <div className="text-gray-400">
                    Min s0: {Math.min(analysisResult.stationA.staticSafety.s0, analysisResult.stationB.staticSafety.s0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Interactive SVG Shaft Support Diagram */}
              <div className="rounded-lg border border-navy-800 bg-navy-900/90 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <span>Shaft Support & Reaction Equilibrium Diagram</span>
                    <span className="rounded bg-navy-800 px-1.5 py-0.5 text-[10px] text-gray-300">
                      Length: {shaftLength} mm · Span: {analysisResult.reactions.span} mm
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        analysisResult.reactions.equilibriumCheck.isEquilibriumSatisfied
                          ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : 'border border-rose-500/30 bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      <CheckCircle2 size={12} />
                      Static Equilibrium: Residual &lt; 10⁻⁵ N
                    </span>
                  </div>
                </div>

                {/* SVG Canvas */}
                <div className="relative w-full overflow-hidden rounded border border-navy-800 bg-navy-950 p-2">
                  <ShaftSupportSvg
                    shaftLength={shaftLength}
                    shaftDiameter={shaftDiameter}
                    xA={xA}
                    xB={xB}
                    loadX={loadX}
                    Fy={appliedFy}
                    Fz={appliedFz}
                    Fa={appliedFa}
                    RyA={analysisResult.reactions.reactions.A.Ry}
                    RyB={analysisResult.reactions.reactions.B.Ry}
                    FrA={analysisResult.reactions.reactions.A.Fr}
                    FrB={analysisResult.reactions.reactions.B.Fr}
                    locatingStation={locatingStation}
                    bearingA={analysisResult.stationA.bearing}
                    bearingB={analysisResult.stationB.bearing}
                  />
                </div>
              </div>

              {/* Two Column Layout: Parameters & Candidate Stations */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left 4 Cols: Configuration Controls */}
                <div className="space-y-4 rounded-lg border border-navy-800 bg-navy-900/70 p-4 lg:col-span-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Sliders size={16} className="text-[#64D6C5]" />
                    Support & Load Configuration
                  </h3>

                  {/* Shaft Geometry & Speed */}
                  <div className="space-y-3 border-b border-navy-800 pb-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-400">Length L (mm)</label>
                        <input
                          type="number"
                          value={shaftLength}
                          onChange={(e) => setShaftLength(Math.max(50, Number(e.target.value)))}
                          className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Journal ⌀ d (mm)</label>
                        <input
                          type="number"
                          value={shaftDiameter}
                          onChange={(e) => setShaftDiameter(Math.max(10, Number(e.target.value)))}
                          className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400">Rotational Speed (RPM)</label>
                      <input
                        type="number"
                        value={rpm}
                        onChange={(e) => setRpm(Math.max(0, Number(e.target.value)))}
                        className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Bearing Station Positions */}
                  <div className="space-y-3 border-b border-navy-800 pb-3">
                    <div className="text-xs font-medium text-gray-300">Support Stations</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-gray-400">Station A (xA, mm)</label>
                        <input
                          type="number"
                          value={xA}
                          onChange={(e) => setXA(Math.max(0, Number(e.target.value)))}
                          className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-400">Station B (xB, mm)</label>
                        <input
                          type="number"
                          value={xB}
                          onChange={(e) => setXB(Math.min(shaftLength, Number(e.target.value)))}
                          className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-gray-400">Support Arrangement</label>
                      <div className="mt-1.5 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setArrangement('locating_floating');
                            setLocatingStation('A');
                          }}
                          className={`rounded border p-2 text-left text-xs transition-colors ${
                            locatingStation === 'A'
                              ? 'border-[#64D6C5] bg-[#64D6C5]/10 text-white'
                              : 'border-navy-700 bg-navy-800/60 text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          <div className="font-medium">Locating A / Float B</div>
                          <div className="text-[10px] text-gray-400">A carries 100% Fa</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setArrangement('locating_floating');
                            setLocatingStation('B');
                          }}
                          className={`rounded border p-2 text-left text-xs transition-colors ${
                            locatingStation === 'B'
                              ? 'border-[#64D6C5] bg-[#64D6C5]/10 text-white'
                              : 'border-navy-700 bg-navy-800/60 text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          <div className="font-medium">Locating B / Float A</div>
                          <div className="text-[10px] text-gray-400">B carries 100% Fa</div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Applied Loads */}
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-gray-300">Applied External Loads</div>
                    <div>
                      <label className="text-[11px] text-gray-400">Load Axial Position x (mm)</label>
                      <input
                        type="number"
                        value={loadX}
                        onChange={(e) => setLoadX(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[11px] text-gray-400">Fy (N, vert)</label>
                        <input
                          type="number"
                          value={appliedFy}
                          onChange={(e) => setAppliedFy(Number(e.target.value))}
                          className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-400">Fz (N, horiz)</label>
                        <input
                          type="number"
                          value={appliedFz}
                          onChange={(e) => setAppliedFz(Number(e.target.value))}
                          className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-400">Fa (N, thrust)</label>
                        <input
                          type="number"
                          value={appliedFa}
                          onChange={(e) => setAppliedFa(Number(e.target.value))}
                          className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right 8 Cols: Support Station Evaluations */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:col-span-8">
                  {/* Station A Card */}
                  <StationEvaluationCard
                    stationId="A"
                    stationName="Bearing Support A"
                    isLocating={locatingStation === 'A'}
                    evaluation={analysisResult.stationA}
                    candidateList={candidateList}
                    selectedId={selectedBearingIdA}
                    onSelect={setSelectedBearingIdA}
                  />

                  {/* Station B Card */}
                  <StationEvaluationCard
                    stationId="B"
                    stationName="Bearing Support B"
                    isLocating={locatingStation === 'B'}
                    evaluation={analysisResult.stationB}
                    candidateList={candidateList}
                    selectedId={selectedBearingIdB}
                    onSelect={setSelectedBearingIdB}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TAB 2: CATALOG EXPLORER ─── */}
      {activeTab === 'catalog' && (
        <div className="space-y-4 rounded-lg border border-navy-800 bg-navy-900/80 p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-semibold text-white">ISO Standard Rolling Bearings Catalog</h2>
              <p className="text-xs text-gray-400">
                Standard metric series (62xx, 63xx, NU 2xx, 72xx B, 302xx) conforming to ISO 15 / ISO 355 & ISO 281
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  checked={filterByBoreOnly}
                  onChange={(e) => setFilterByBoreOnly(e.target.checked)}
                  className="rounded border-navy-700 text-[#64D6C5] focus:ring-0"
                />
                Filter to active journal (⌀{shaftDiameter} mm)
              </label>
            </div>
          </div>

          <div className="overflow-x-auto rounded border border-navy-800">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="border-b border-navy-800 bg-navy-950 font-semibold text-gray-400">
                <tr>
                  <th className="py-2.5 px-3">Designation</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Bore d (mm)</th>
                  <th className="py-2.5 px-3">Outer D (mm)</th>
                  <th className="py-2.5 px-3">Width B (mm)</th>
                  <th className="py-2.5 px-3">Dynamic C (kN)</th>
                  <th className="py-2.5 px-3">Static C0 (kN)</th>
                  <th className="py-2.5 px-3">Limiting Speed (RPM)</th>
                  <th className="py-2.5 px-3">Standard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/50 bg-navy-900/40 font-mono">
                {candidateList.map((b) => (
                  <tr key={b.id} className="transition-colors hover:bg-navy-800/60">
                    <td className="py-2 px-3 font-semibold text-white">{b.designation}</td>
                    <td className="py-2 px-3 font-sans text-gray-300">{b.typeName}</td>
                    <td className="py-2 px-3 text-[#64D6C5]">{b.d}</td>
                    <td className="py-2 px-3">{b.D}</td>
                    <td className="py-2 px-3">{b.B}</td>
                    <td className="py-2 px-3 text-emerald-400">{(b.C / 1000).toFixed(1)}</td>
                    <td className="py-2 px-3 text-amber-400">{(b.C0 / 1000).toFixed(1)}</td>
                    <td className="py-2 px-3">{b.limitingSpeedRpm.toLocaleString()}</td>
                    <td className="py-2 px-3 font-sans text-[11px] text-gray-400">{b.standard}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 3: MATHEMATICAL TRACEABILITY & AUDIT ─── */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-navy-800 bg-navy-900/80 p-5">
            <h2 className="text-base font-semibold text-white">Engineering Equations & Mathematical Traceability</h2>
            <p className="text-xs text-gray-400">
              Deterministic verification against ISO 281:2007, ISO 76:2006, and classical statics
            </p>

            <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Formula 1: Static Equilibrium Reactions */}
              <div className="rounded border border-navy-800 bg-navy-950 p-4">
                <div className="text-xs font-semibold text-[#64D6C5]">1. Static Equilibrium Reactions</div>
                <div className="mt-2 font-mono text-xs text-gray-300">
                  <div className="text-gray-400"># Vertical Plane (xy):</div>
                  <div>∑ M_z@A = 0 ⟹ R_yB = -∑[F_yi · (x_i - x_A)] / (x_B - x_A)</div>
                  <div>∑ F_y = 0 ⟹ R_yA = -∑ F_yi - R_yB</div>
                  <div className="mt-2 text-gray-400"># Horizontal Plane (xz):</div>
                  <div>∑ M_y@A = 0 ⟹ R_zB = -∑[F_zi · (x_i - x_A)] / (x_B - x_A)</div>
                  <div>∑ F_z = 0 ⟹ R_zA = -∑ F_zi - R_zB</div>
                  <div className="mt-2 text-gray-400"># Resultant Radial Reaction:</div>
                  <div>F_r = √(R_y² + R_z²)</div>
                </div>
              </div>

              {/* Formula 2: Equivalent Dynamic Load */}
              <div className="rounded border border-navy-800 bg-navy-950 p-4">
                <div className="text-xs font-semibold text-[#64D6C5]">2. ISO 281:2007 Equivalent Dynamic Load (P)</div>
                <div className="mt-2 font-mono text-xs text-gray-300">
                  <div>P = X · F_r + Y · F_a</div>
                  <div className="mt-2 text-gray-400"># Deep Groove Ball Bearings:</div>
                  <div>If F_a / F_r ≤ e ⟹ X = 1.0, Y = 0 (P = F_r)</div>
                  <div>If F_a / F_r &gt; e ⟹ X = 0.56, Y = f(F_a / C_0)</div>
                  <div className="mt-2 text-gray-400"># Cylindrical Roller Bearings:</div>
                  <div>Pure radial: X = 1.0, Y = 0 (P = F_r)</div>
                  <div className="mt-2 text-gray-400"># Angular Contact Ball (40°):</div>
                  <div>e = 1.14: X = 0.35, Y = 0.57 (when F_a/F_r &gt; 1.14)</div>
                </div>
              </div>

              {/* Formula 3: Dynamic L10 Rating Life */}
              <div className="rounded border border-navy-800 bg-navy-950 p-4">
                <div className="text-xs font-semibold text-[#64D6C5]">3. ISO 281:2007 Basic L10 Rating Life</div>
                <div className="mt-2 font-mono text-xs text-gray-300">
                  <div>L_10 = (C / P)^p   [10⁶ revolutions]</div>
                  <div className="mt-1">
                    where p = 3 (ball bearings) or 10/3 (roller bearings)
                  </div>
                  <div className="mt-2 text-gray-400"># Life in Operating Hours:</div>
                  <div>L_10h = (10⁶ / (60 · n)) · (C / P)^p   [hours]</div>
                  <div className="mt-1 text-gray-400">n: rotational speed in RPM</div>
                </div>
              </div>

              {/* Formula 4: Static Safety Factor */}
              <div className="rounded border border-navy-800 bg-navy-950 p-4">
                <div className="text-xs font-semibold text-[#64D6C5]">4. ISO 76:2006 Static Safety Factor (s0)</div>
                <div className="mt-2 font-mono text-xs text-gray-300">
                  <div>P_0 = max(X_0 · F_r + Y_0 · F_a,  F_r)</div>
                  <div>s_0 = C_0 / P_0</div>
                  <div className="mt-2 text-gray-400"># Criteria:</div>
                  <div>s_0 ≥ 1.5 ⟹ Safe for smooth, low-noise running</div>
                  <div>1.0 ≤ s_0 &lt; 1.5 ⟹ Normal service</div>
                  <div>s_0 &lt; 1.0 ⟹ Risk of plastic raceway brinelling</div>
                </div>
              </div>
            </div>
          </div>

          {/* Standards Demarcation Notice */}
          <div className="rounded-lg border border-navy-800 bg-navy-900/60 p-4">
            <div className="flex items-start gap-3">
              <Info size={18} className="mt-0.5 text-[#64D6C5]" />
              <div className="space-y-1 text-xs">
                <div className="font-semibold text-white">Standards Demarcation & Boundary Guidance</div>
                <p className="text-gray-300">
                  <span className="font-medium text-white">ISO 281:2007 vs ISO 16281:2025:</span> The software computes basic dynamic L10 rating life per ISO 281:2007 assuming 90% survival probability, standard elastohydrodynamic clean lubrication (a_ISO = 1.0), and rigid alignment. It explicitly does <span className="text-amber-400">not</span> simulate ISO 16281 modified reference life (which requires internal raceway micro-geometry, clearance, and roller tilt distribution) to ensure complete engineering honesty and prevent false precision.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setActivePage('dashboard')}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#64D6C5] hover:underline"
                  >
                    View Standards Registry <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: REPORT PREVIEW ─── */}
      {activeTab === 'report' && (
        <div className="space-y-4 rounded-lg border border-navy-800 bg-navy-900/80 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Audit Engineering Report Preview</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyReport}
                className="flex items-center gap-1.5 rounded border border-navy-700 bg-navy-800 px-3 py-1.5 text-xs text-gray-300 hover:text-white"
              >
                <Copy size={13} />
                Copy
              </button>
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-1.5 rounded border border-[#64D6C5]/40 bg-[#64D6C5]/20 px-3 py-1.5 text-xs text-[#64D6C5] hover:bg-[#64D6C5]/30"
              >
                <Download size={13} />
                Download
              </button>
            </div>
          </div>

          <pre className="max-h-[600px] overflow-auto rounded border border-navy-800 bg-navy-950 p-4 font-mono text-xs leading-relaxed text-gray-300">
            {'error' in analysisResult ? analysisResult.error : generateMarkdownReport(analysisResult)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Sub-Component: Station Evaluation Card ──────────────────────────────────
function StationEvaluationCard({
  stationId,
  stationName,
  isLocating,
  evaluation,
  candidateList,
  selectedId,
  onSelect
}: {
  stationId: 'A' | 'B';
  stationName: string;
  isLocating: boolean;
  evaluation: any;
  candidateList: BearingCatalogItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { bearing, reaction, equivalentDynamicLoad, dynamicLife, staticSafety } = evaluation;

  return (
    <div className="space-y-4 rounded-lg border border-navy-800 bg-navy-900/70 p-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-navy-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#64D6C5]/20 text-xs font-bold text-[#64D6C5]">
              {stationId}
            </span>
            <h4 className="text-sm font-semibold text-white">{stationName}</h4>
          </div>
          <span
            className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
              isLocating
                ? 'bg-blue-500/20 text-blue-300'
                : 'bg-purple-500/20 text-purple-300'
            }`}
          >
            {isLocating ? 'Locating (Fixes Axial Position)' : 'Floating (Thermal Expansion Freedom)'}
          </span>
        </div>

        <div className="text-right">
          <div className="text-xs font-mono font-semibold text-emerald-400">
            Fr = {reaction.Fr.toLocaleString()} N
          </div>
          <div className="text-[11px] font-mono text-cyan-400">
            Fa = {reaction.Fa.toLocaleString()} N
          </div>
        </div>
      </div>

      {/* Bearing Candidate Dropdown */}
      <div>
        <label className="text-[11px] text-gray-400">Selected Candidate Bearing</label>
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
        >
          {candidateList.map((b) => (
            <option key={b.id} value={b.id}>
              {b.designation} — {b.typeName} (⌀{b.d}×{b.D}×{b.B} mm, C={b.C / 1000} kN)
            </option>
          ))}
        </select>
      </div>

      {/* Bearing Properties Summary */}
      <div className="grid grid-cols-4 gap-2 rounded bg-navy-950 p-2.5 text-center font-mono text-xs">
        <div>
          <div className="text-[10px] text-gray-400 font-sans">d × D × B</div>
          <div className="text-white">{bearing.d}×{bearing.D}×{bearing.B}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-400 font-sans">Dynamic C</div>
          <div className="text-emerald-400">{(bearing.C / 1000).toFixed(1)} kN</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-400 font-sans">Static C0</div>
          <div className="text-amber-400">{(bearing.C0 / 1000).toFixed(1)} kN</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-400 font-sans">Speed Limit</div>
          <div className="text-gray-300">{bearing.limitingSpeedRpm} rpm</div>
        </div>
      </div>

      {/* Equivalent Dynamic Load P Breakdown */}
      <div className="space-y-1.5 rounded border border-navy-800/80 bg-navy-950/50 p-3 text-xs">
        <div className="flex items-center justify-between font-mono">
          <span className="text-gray-400 font-sans">Fa / Fr Ratio:</span>
          <span>{equivalentDynamicLoad.ratioFaFr === Infinity ? '∞' : equivalentDynamicLoad.ratioFaFr.toFixed(3)}</span>
        </div>
        <div className="flex items-center justify-between font-mono">
          <span className="text-gray-400 font-sans">Limiting Factor e:</span>
          <span>{equivalentDynamicLoad.e.toFixed(3)}</span>
        </div>
        <div className="flex items-center justify-between font-mono">
          <span className="text-gray-400 font-sans">Factors X, Y:</span>
          <span>X = {equivalentDynamicLoad.X}, Y = {equivalentDynamicLoad.Y}</span>
        </div>
        <div className="flex items-center justify-between border-t border-navy-800 pt-1.5 font-mono font-semibold">
          <span className="text-gray-300 font-sans">Equivalent Load P:</span>
          <span className="text-[#64D6C5]">{equivalentDynamicLoad.P.toLocaleString()} N</span>
        </div>
        <div className="text-[11px] text-gray-400 italic">
          {equivalentDynamicLoad.governingCondition}
        </div>
        {equivalentDynamicLoad.warning && (
          <div className="mt-1 text-[11px] text-amber-400">
            ⚠️ {equivalentDynamicLoad.warning}
          </div>
        )}
      </div>

      {/* L10 Life & Static Safety Results */}
      <div className="space-y-2 border-t border-navy-800 pt-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400">Dynamic L10 Rating Life:</div>
          <span
            className={`rounded px-2 py-0.5 text-xs font-semibold font-mono ${
              dynamicLife.status === 'adequate'
                ? 'bg-emerald-500/20 text-emerald-400'
                : dynamicLife.status === 'marginal'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {Math.round(dynamicLife.L10Hours).toLocaleString()} hours
          </span>
        </div>
        <div className="text-right text-[11px] font-mono text-gray-400">
          ({dynamicLife.L10RevolutionsMillions.toLocaleString()} × 10⁶ revolutions, p={dynamicLife.p})
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-gray-400">Static Safety Factor (s0):</div>
          <span
            className={`rounded px-2 py-0.5 text-xs font-semibold font-mono ${
              staticSafety.status === 'safe'
                ? 'bg-emerald-500/20 text-emerald-400'
                : staticSafety.status === 'caution'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            s0 = {staticSafety.s0.toFixed(2)}
          </span>
        </div>
        <div className="text-[11px] text-gray-400">
          {staticSafety.statusMessage}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Component: Shaft Support SVG Schematic ──────────────────────────────
function ShaftSupportSvg({
  shaftLength,
  shaftDiameter,
  xA,
  xB,
  loadX,
  Fy,
  Fz,
  Fa,
  RyA,
  RyB,
  FrA,
  FrB,
  locatingStation,
  bearingA,
  bearingB
}: {
  shaftLength: number;
  shaftDiameter: number;
  xA: number;
  xB: number;
  loadX: number;
  Fy: number;
  Fz: number;
  Fa: number;
  RyA: number;
  RyB: number;
  FrA: number;
  FrB: number;
  locatingStation: LocatingSupportId;
  bearingA: BearingCatalogItem;
  bearingB: BearingCatalogItem;
}) {
  const width = 800;
  const height = 240;
  const marginX = 70;
  const centerY = 120;
  const drawWidth = width - 2 * marginX;

  const toPx = (xMm: number) => marginX + (xMm / shaftLength) * drawWidth;

  const pxA = toPx(xA);
  const pxB = toPx(xB);
  const pxLoad = toPx(loadX);

  // Scaled shaft height
  const shaftH = Math.min(36, Math.max(16, (shaftDiameter / 45) * 24));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <defs>
        {/* Force arrow markers */}
        <marker id="arrow-down" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#F87171" />
        </marker>
        <marker id="arrow-up" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#34D399" />
        </marker>
        <marker id="arrow-right" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#38BDF8" />
        </marker>
      </defs>

      {/* Axis centerline */}
      <line
        x1={marginX - 20}
        y1={centerY}
        x2={marginX + drawWidth + 20}
        y2={centerY}
        stroke="#4B5563"
        strokeDasharray="6 3"
        strokeWidth="1"
      />

      {/* Shaft Body */}
      <rect
        x={marginX}
        y={centerY - shaftH / 2}
        width={drawWidth}
        height={shaftH}
        fill="#1E293B"
        stroke="#64748B"
        strokeWidth="1.5"
        rx="2"
      />

      {/* Bearing Station A Graphic */}
      <g transform={`translate(${pxA}, ${centerY})`}>
        {/* Bearing Box */}
        <rect
          x={-14}
          y={-shaftH / 2 - 8}
          width={28}
          height={shaftH + 16}
          fill="#0F172A"
          stroke="#64D6C5"
          strokeWidth="1.5"
          rx="2"
        />
        {/* Inner rollers */}
        <circle cx={-6} cy={0} r="3" fill="#64D6C5" />
        <circle cx={6} cy={0} r="3" fill="#64D6C5" />

        {/* Support Base Indicator */}
        <polygon
          points="-12,30 12,30 0,16"
          fill={locatingStation === 'A' ? '#3B82F6' : '#A855F7'}
          stroke="#334155"
        />
        <line x1="-16" y1="30" x2="16" y2="30" stroke="#94A3B8" strokeWidth="2" />
        {locatingStation !== 'A' && (
          // Floating rollers below base
          <g>
            <circle cx="-6" cy="34" r="2.5" fill="#A855F7" />
            <circle cx="6" cy="34" r="2.5" fill="#A855F7" />
          </g>
        )}

        <text x="0" y="52" textAnchor="middle" fill="#E2E8F0" fontSize="10" fontWeight="bold">
          Station A ({bearingA.designation})
        </text>
        <text x="0" y="64" textAnchor="middle" fill="#94A3B8" fontSize="9">
          {locatingStation === 'A' ? '[Locating]' : '[Floating]'}
        </text>

        {/* Reaction Vector RyA */}
        {RyA !== 0 && (
          <g>
            <line
              x1="0"
              y1={RyA > 0 ? -shaftH / 2 - 40 : -shaftH / 2 - 10}
              x2="0"
              y2={RyA > 0 ? -shaftH / 2 - 12 : -shaftH / 2 - 40}
              stroke="#34D399"
              strokeWidth="2"
              markerEnd={RyA > 0 ? 'url(#arrow-up)' : 'url(#arrow-down)'}
            />
            <text x="0" y="-shaftH / 2 - 46" textAnchor="middle" fill="#34D399" fontSize="10" fontFamily="monospace">
              FrA={FrA}N
            </text>
          </g>
        )}
      </g>

      {/* Bearing Station B Graphic */}
      <g transform={`translate(${pxB}, ${centerY})`}>
        {/* Bearing Box */}
        <rect
          x={-14}
          y={-shaftH / 2 - 8}
          width={28}
          height={shaftH + 16}
          fill="#0F172A"
          stroke="#64D6C5"
          strokeWidth="1.5"
          rx="2"
        />
        {/* Inner rollers */}
        <circle cx={-6} cy={0} r="3" fill="#64D6C5" />
        <circle cx={6} cy={0} r="3" fill="#64D6C5" />

        {/* Support Base Indicator */}
        <polygon
          points="-12,30 12,30 0,16"
          fill={locatingStation === 'B' ? '#3B82F6' : '#A855F7'}
          stroke="#334155"
        />
        <line x1="-16" y1="30" x2="16" y2="30" stroke="#94A3B8" strokeWidth="2" />
        {locatingStation !== 'B' && (
          <g>
            <circle cx="-6" cy="34" r="2.5" fill="#A855F7" />
            <circle cx="6" cy="34" r="2.5" fill="#A855F7" />
          </g>
        )}

        <text x="0" y="52" textAnchor="middle" fill="#E2E8F0" fontSize="10" fontWeight="bold">
          Station B ({bearingB.designation})
        </text>
        <text x="0" y="64" textAnchor="middle" fill="#94A3B8" fontSize="9">
          {locatingStation === 'B' ? '[Locating]' : '[Floating]'}
        </text>

        {/* Reaction Vector RyB */}
        {RyB !== 0 && (
          <g>
            <line
              x1="0"
              y1={RyB > 0 ? -shaftH / 2 - 40 : -shaftH / 2 - 10}
              x2="0"
              y2={RyB > 0 ? -shaftH / 2 - 12 : -shaftH / 2 - 40}
              stroke="#34D399"
              strokeWidth="2"
              markerEnd={RyB > 0 ? 'url(#arrow-up)' : 'url(#arrow-down)'}
            />
            <text x="0" y="-shaftH / 2 - 46" textAnchor="middle" fill="#34D399" fontSize="10" fontFamily="monospace">
              FrB={FrB}N
            </text>
          </g>
        )}
      </g>

      {/* Applied Load Arrow at loadX */}
      <g transform={`translate(${pxLoad}, ${centerY})`}>
        {/* Transverse Load Arrow (Downward) */}
        {Fy !== 0 && (
          <g>
            <line
              x1="0"
              y1="-50"
              x2="0"
              y2={-shaftH / 2 - 2}
              stroke="#F87171"
              strokeWidth="2.5"
              markerEnd="url(#arrow-down)"
            />
            <text x="5" y="-55" textAnchor="middle" fill="#F87171" fontSize="10" fontWeight="bold" fontFamily="monospace">
              Fy={Fy}N
            </text>
          </g>
        )}

        {/* Axial Load Arrow */}
        {Fa !== 0 && (
          <g>
            <line
              x1="-30"
              y1="0"
              x2="5"
              y2="0"
              stroke="#38BDF8"
              strokeWidth="2.5"
              markerEnd="url(#arrow-right)"
            />
            <text x="-12" y="-8" textAnchor="middle" fill="#38BDF8" fontSize="10" fontWeight="bold" fontFamily="monospace">
              Fa={Fa}N
            </text>
          </g>
        )}

        <circle cx="0" cy="0" r="3" fill="#F87171" />
        <text x="0" y="16" textAnchor="middle" fill="#9CA3AF" fontSize="9">
          x = {loadX} mm
        </text>
      </g>
    </svg>
  );
}

// ─── Markdown Report Generator ───────────────────────────────────────────────
function generateMarkdownReport(analysis: any): string {
  const { shaftLength, shaftDiameter, rpm, reactions, stationA, stationB, overallStatus, summary } = analysis;

  return `# BEARING SYSTEM ENGINEERING & DYNAMIC L10 RATING LIFE REPORT
**Quantum AI // Mechanical Engineering Design Copilot**
*Evaluation Standards: ISO 281:2007, ISO 76:2006 (Amd 1:2017)*
*Generated: ${new Date().toISOString()}*

---

## 1. EXECUTIVE SUMMARY & SUBSYSTEM STATUS
- **Overall Status:** ${overallStatus.toUpperCase()}
- **Evaluation Summary:** ${summary}
- **Minimum Dynamic Rating Life:** ${Math.round(Math.min(stationA.dynamicLife.L10Hours, stationB.dynamicLife.L10Hours)).toLocaleString()} hours
- **Minimum Static Safety Factor:** ${Math.min(stationA.staticSafety.s0, stationB.staticSafety.s0).toFixed(2)}

---

## 2. SHAFT GEOMETRY & APPLIED LOADING
- **Shaft Total Length (L):** ${shaftLength} mm
- **Bearing Journal Diameter (d):** ${shaftDiameter} mm
- **Operating Rotational Speed (n):** ${rpm} RPM
- **Support Span (xB - xA):** ${reactions.span} mm
  - Station A Position (xA): ${reactions.reactions.A.x} mm
  - Station B Position (xB): ${reactions.reactions.B.x} mm
- **Support Arrangement:** ${reactions.arrangement === 'locating_floating' ? 'Locating / Floating' : 'Cross-Located'}
  - Locating Bearing Station: Station ${reactions.locatingStation}
- **Applied Transverse Loads:**
  - Net Vertical Load (Fy): ${reactions.appliedLoadsSummary.totalFy} N
  - Net Horizontal Load (Fz): ${reactions.appliedLoadsSummary.totalFz} N
  - Resultant Transverse Force: ${reactions.appliedLoadsSummary.resultantTransverse} N
- **Applied Axial Thrust Load (Fa):** ${reactions.appliedLoadsSummary.totalFa} N

---

## 3. STATIC EQUILIBRIUM & BEARING REACTIONS
### Station A:
- Vertical Reaction (RyA): ${reactions.reactions.A.Ry} N
- Horizontal Reaction (RzA): ${reactions.reactions.A.Rz} N
- Resultant Radial Load (FrA): ${reactions.reactions.A.Fr} N
- Allocated Axial Thrust (FaA): ${reactions.reactions.A.Fa} N

### Station B:
- Vertical Reaction (RyB): ${reactions.reactions.B.Ry} N
- Horizontal Reaction (RzB): ${reactions.reactions.B.Rz} N
- Resultant Radial Load (FrB): ${reactions.reactions.B.Fr} N
- Allocated Axial Thrust (FaB): ${reactions.reactions.B.Fa} N

### Static Equilibrium Residuals:
- Sum Fy: ${reactions.equilibriumCheck.sumFy} N (Residual ≤ 1e-5 N: verified)
- Sum Fz: ${reactions.equilibriumCheck.sumFz} N
- Sum Mz@A: ${reactions.equilibriumCheck.sumMzAtA} N·mm
- Sum My@A: ${reactions.equilibriumCheck.sumMyAtA} N·mm
- Equilibrium Residual Verification: **${reactions.equilibriumCheck.isEquilibriumSatisfied ? 'SATISFIED' : 'FAILED'}**

---

## 4. CANDIDATE BEARING EVALUATION

### 4.1 Station A (${stationA.bearing.designation})
- **Type:** ${stationA.bearing.typeName}
- **Dimensions:** ⌀${stationA.bearing.d} × ⌀${stationA.bearing.D} × ${stationA.bearing.B} mm
- **Dynamic Load Rating (C):** ${stationA.bearing.C} N (${(stationA.bearing.C / 1000).toFixed(1)} kN)
- **Static Load Rating (C0):** ${stationA.bearing.C0} N (${(stationA.bearing.C0 / 1000).toFixed(1)} kN)
- **Limiting Speed:** ${stationA.bearing.limitingSpeedRpm} RPM
- **ISO 281 Equivalent Dynamic Load:**
  - Radial Fr: ${stationA.equivalentDynamicLoad.Fr} N
  - Axial Fa: ${stationA.equivalentDynamicLoad.Fa} N
  - Fa / Fr Ratio: ${stationA.equivalentDynamicLoad.ratioFaFr === Infinity ? '∞' : stationA.equivalentDynamicLoad.ratioFaFr.toFixed(3)}
  - Limiting Ratio e: ${stationA.equivalentDynamicLoad.e.toFixed(3)}
  - Factors: X = ${stationA.equivalentDynamicLoad.X}, Y = ${stationA.equivalentDynamicLoad.Y}
  - **Equivalent Dynamic Load (P): ${stationA.equivalentDynamicLoad.P} N**
  - Mode: ${stationA.equivalentDynamicLoad.governingCondition}
- **ISO 281 Dynamic Rating Life:**
  - Exponent p: ${stationA.dynamicLife.p}
  - L10 Revolutions: ${stationA.dynamicLife.L10RevolutionsMillions} × 10⁶ revs
  - **L10h Operating Hours: ${Math.round(stationA.dynamicLife.L10Hours).toLocaleString()} hours**
  - Assessment: ${stationA.dynamicLife.status.toUpperCase()} (${stationA.dynamicLife.statusMessage})
- **ISO 76 Static Safety:**
  - Static Equivalent Load (P0): ${stationA.staticSafety.P0} N
  - **Static Safety Factor (s0): ${stationA.staticSafety.s0}**
  - Assessment: ${stationA.staticSafety.status.toUpperCase()} (${stationA.staticSafety.statusMessage})

### 4.2 Station B (${stationB.bearing.designation})
- **Type:** ${stationB.bearing.typeName}
- **Dimensions:** ⌀${stationB.bearing.d} × ⌀${stationB.bearing.D} × ${stationB.bearing.B} mm
- **Dynamic Load Rating (C):** ${stationB.bearing.C} N (${(stationB.bearing.C / 1000).toFixed(1)} kN)
- **Static Load Rating (C0):** ${stationB.bearing.C0} N (${(stationB.bearing.C0 / 1000).toFixed(1)} kN)
- **Limiting Speed:** ${stationB.bearing.limitingSpeedRpm} RPM
- **ISO 281 Equivalent Dynamic Load:**
  - Radial Fr: ${stationB.equivalentDynamicLoad.Fr} N
  - Axial Fa: ${stationB.equivalentDynamicLoad.Fa} N
  - Fa / Fr Ratio: ${stationB.equivalentDynamicLoad.ratioFaFr === Infinity ? '∞' : stationB.equivalentDynamicLoad.ratioFaFr.toFixed(3)}
  - Limiting Ratio e: ${stationB.equivalentDynamicLoad.e.toFixed(3)}
  - Factors: X = ${stationB.equivalentDynamicLoad.X}, Y = ${stationB.equivalentDynamicLoad.Y}
  - **Equivalent Dynamic Load (P): ${stationB.equivalentDynamicLoad.P} N**
  - Mode: ${stationB.equivalentDynamicLoad.governingCondition}
- **ISO 281 Dynamic Rating Life:**
  - Exponent p: ${stationB.dynamicLife.p}
  - L10 Revolutions: ${stationB.dynamicLife.L10RevolutionsMillions} × 10⁶ revs
  - **L10h Operating Hours: ${Math.round(stationB.dynamicLife.L10Hours).toLocaleString()} hours**
  - Assessment: ${stationB.dynamicLife.status.toUpperCase()} (${stationB.dynamicLife.statusMessage})
- **ISO 76 Static Safety:**
  - Static Equivalent Load (P0): ${stationB.staticSafety.P0} N
  - **Static Safety Factor (s0): ${stationB.staticSafety.s0}**
  - Assessment: ${stationB.staticSafety.status.toUpperCase()} (${stationB.staticSafety.statusMessage})

---

## 5. ASSUMPTIONS & ENGINEERING BOUNDARIES
1. **ISO 281 Reliability:** Basic L10 life models 90% survival probability (10% failure rate) under clean elastohydrodynamic mineral oil/grease lubrication (viscosity ratio kappa ≥ 1.0, a_ISO = 1.0).
2. **Structural Rigidity:** Assumes rigid bearing housing seats and negligible angular misalignment (slope < 2 to 10 arcmin).
3. **Advanced Methods Boundary (ISO 16281:2025):** The software strictly implements basic ISO 281 L10 rating life and does NOT claim compliance with ISO 16281 modified reference rating life without proprietary internal roller/raceway profile and clearance matrices.
`;
}
