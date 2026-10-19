import React, { useState, useMemo } from 'react';
import {
  Link2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Download,
  Copy,
  RotateCcw,
  BookOpen,
  Info,
  Sliders,
  Flame,
  Snowflake,
  ShieldCheck,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  calculateParallelKey,
  getRecommendedKeyDimensions,
  calculateInterferenceFit,
  calculateThermalAssembly,
  type KeyProfileType
} from '../engineering/connections';
import { calculateFit } from '../engineering/tolerances';
import { materials } from '../data/materials';

export default function ConnectionsPage() {
  const { designParams, selectedMaterial, activeProject, setActivePage } = useApp();

  // Primary mode: 'key' | 'interference_fit'
  const [connectionType, setConnectionType] = useState<'key' | 'interference_fit'>('key');
  const [activeTab, setActiveTab] = useState<'workstation' | 'thermal' | 'audit' | 'report'>('workstation');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // ─── Parallel Key State ────────────────────────────────────────────────────
  const defaultShaftDiameter = designParams.diameter || 45;
  const recommendedKey = useMemo(
    () => getRecommendedKeyDimensions(defaultShaftDiameter).dimensions,
    [defaultShaftDiameter]
  );

  const [keyShaftDiameter, setKeyShaftDiameter] = useState<number>(defaultShaftDiameter);
  const [keyWidth, setKeyWidth] = useState<number>(recommendedKey.b);
  const [keyHeight, setKeyHeight] = useState<number>(recommendedKey.h);
  const [keyLength, setKeyLength] = useState<number>(Math.max(20, Math.round(defaultShaftDiameter * 1.25)));
  const [keyProfile, setKeyProfile] = useState<KeyProfileType>('form_a_round_ends');
  const [shaftKeywayDepth, setShaftKeywayDepth] = useState<number>(recommendedKey.t1);
  const [hubKeywayDepth, setHubKeywayDepth] = useState<number>(recommendedKey.t2);
  const [keyTorque, setKeyTorque] = useState<number>(designParams.torque || 400);
  const [isReversingTorque, setIsReversingTorque] = useState<boolean>(false);
  const [dynamicLoadFactor, setDynamicLoadFactor] = useState<number>(1.0);
  const [keySafetyFactor, setKeySafetyFactor] = useState<number>(1.5);

  const [keyMaterialId, setKeyMaterialId] = useState<string>('c45e');
  const [hubMaterialId, setHubMaterialId] = useState<string>('aisi-1045');

  // Materials resolution
  const keyMaterialObj = useMemo(() => {
    if (keyMaterialId === 'c45e') {
      return { name: 'C45E Key Steel (DIN 6880)', yieldStrength: 450, shearStrength: 260 };
    }
    const found = materials.find((m) => m.id === keyMaterialId);
    return found ? { name: found.name, yieldStrength: found.yieldStrength } : { name: 'C45E Key Steel', yieldStrength: 450 };
  }, [keyMaterialId]);

  const shaftMaterialObj = useMemo(() => {
    return { name: selectedMaterial.name, yieldStrength: selectedMaterial.yieldStrength };
  }, [selectedMaterial]);

  const hubMaterialObj = useMemo(() => {
    const found = materials.find((m) => m.id === hubMaterialId);
    return found ? { name: found.name, yieldStrength: found.yieldStrength } : { name: 'AISI 1045 Hub', yieldStrength: 530 };
  }, [hubMaterialId]);

  // Execute Parallel Key Calculation
  const keyResult = useMemo(() => {
    try {
      return calculateParallelKey({
        shaftDiameter: keyShaftDiameter,
        keyWidth,
        keyHeight,
        keyLength,
        keyProfile,
        shaftKeywayDepth,
        hubKeywayDepth,
        torque: keyTorque,
        isReversingTorque,
        dynamicLoadFactor,
        keyMaterial: keyMaterialObj,
        shaftMaterial: shaftMaterialObj,
        hubMaterial: hubMaterialObj,
        safetyFactor: keySafetyFactor
      });
    } catch (err: any) {
      return { error: err?.message || 'Error evaluating parallel key' };
    }
  }, [
    keyShaftDiameter,
    keyWidth,
    keyHeight,
    keyLength,
    keyProfile,
    shaftKeywayDepth,
    hubKeywayDepth,
    keyTorque,
    isReversingTorque,
    dynamicLoadFactor,
    keySafetyFactor,
    keyMaterialObj,
    shaftMaterialObj,
    hubMaterialObj
  ]);

  // ─── Interference Fit State ────────────────────────────────────────────────
  const [fitNominalDiameter, setFitNominalDiameter] = useState<number>(designParams.diameter || 50);
  const [fitOuterDiameter, setFitOuterDiameter] = useState<number>(Math.round((designParams.diameter || 50) * 2));
  const [fitInnerDiameter, setFitInnerDiameter] = useState<number>(0);
  const [fitLength, setFitLength] = useState<number>(Math.round(designParams.diameter || 50));
  const [fitPreset, setFitPreset] = useState<string>('H7/p6');
  const [frictionCoeff, setFrictionCoeff] = useState<number>(0.14);
  const [fitTorque, setFitTorque] = useState<number>(designParams.torque || 400);
  const [fitAxialForce, setFitAxialForce] = useState<number>(0);
  const [simultaneousLoading, setSimultaneousLoading] = useState<boolean>(false);
  const [fitHubMaterialId, setFitHubMaterialId] = useState<string>('aisi-1045');

  // Derive tolerance limits from ISO 286 preset or custom
  const fitToleranceLimits = useMemo(() => {
    try {
      const parts = fitPreset.split('/');
      if (parts.length === 2) {
        const res = calculateFit(fitNominalDiameter, parts[0], parts[1]);
        return {
          shaftMax: res.shaftLimits.maxDimensionMm,
          shaftMin: res.shaftLimits.minDimensionMm,
          hubMax: res.holeLimits.maxDimensionMm,
          hubMin: res.holeLimits.minDimensionMm,
          presetValid: true
        };
      }
    } catch {
      // Fallback custom limits
    }
    return {
      shaftMax: fitNominalDiameter + 0.045,
      shaftMin: fitNominalDiameter + 0.025,
      hubMax: fitNominalDiameter + 0.025,
      hubMin: fitNominalDiameter,
      presetValid: false
    };
  }, [fitNominalDiameter, fitPreset]);

  const fitShaftMaterialObj = useMemo(() => {
    return {
      name: selectedMaterial.name,
      elasticModulus: selectedMaterial.elasticModulus,
      poissonsRatio: selectedMaterial.poissonsRatio,
      yieldStrength: selectedMaterial.yieldStrength,
      thermalExpansion: selectedMaterial.thermalExpansion
    };
  }, [selectedMaterial]);

  const fitHubMaterialObj = useMemo(() => {
    const found = materials.find((m) => m.id === fitHubMaterialId);
    return found
      ? {
          name: found.name,
          elasticModulus: found.elasticModulus,
          poissonsRatio: found.poissonsRatio,
          yieldStrength: found.yieldStrength,
          thermalExpansion: found.thermalExpansion
        }
      : {
          name: 'AISI 1045 Hub',
          elasticModulus: 205,
          poissonsRatio: 0.29,
          yieldStrength: 530,
          thermalExpansion: 11.5
        };
  }, [fitHubMaterialId]);

  // Execute Interference Fit Calculation
  const fitResult = useMemo(() => {
    try {
      return calculateInterferenceFit({
        shaftNominalDiameter: fitNominalDiameter,
        hubNominalBore: fitNominalDiameter,
        shaftMaxDiameter: fitToleranceLimits.shaftMax,
        shaftMinDiameter: fitToleranceLimits.shaftMin,
        hubMaxBore: fitToleranceLimits.hubMax,
        hubMinBore: fitToleranceLimits.hubMin,
        hubOuterDiameter: fitOuterDiameter,
        shaftInnerDiameter: fitInnerDiameter,
        fitLength,
        frictionCoefficient: frictionCoeff,
        transmittedTorque: fitTorque,
        axialForce: fitAxialForce,
        simultaneousLoading,
        shaftMaterial: fitShaftMaterialObj,
        hubMaterial: fitHubMaterialObj
      });
    } catch (err: any) {
      return { error: err?.message || 'Error evaluating interference fit' };
    }
  }, [
    fitNominalDiameter,
    fitToleranceLimits,
    fitOuterDiameter,
    fitInnerDiameter,
    fitLength,
    frictionCoeff,
    fitTorque,
    fitAxialForce,
    simultaneousLoading,
    fitShaftMaterialObj,
    fitHubMaterialObj
  ]);

  // ─── Thermal Assembly State ────────────────────────────────────────────────
  const [thermalHubTemp, setThermalHubTemp] = useState<number>(180);
  const [thermalShaftTemp, setThermalShaftTemp] = useState<number>(20);

  const thermalResult = useMemo(() => {
    try {
      return calculateThermalAssembly({
        nominalDiameter: fitNominalDiameter,
        maxShaftDiameter: fitToleranceLimits.shaftMax,
        minHubBore: fitToleranceLimits.hubMin,
        shaftThermalExpansion: fitShaftMaterialObj.thermalExpansion ?? 12.0,
        hubThermalExpansion: fitHubMaterialObj.thermalExpansion ?? 11.5,
        referenceTemperatureC: 20,
        hubHeatingTempC: thermalHubTemp,
        shaftCoolingTempC: thermalShaftTemp
      });
    } catch (err: any) {
      return { error: err?.message || 'Error evaluating thermal assembly' };
    }
  }, [fitNominalDiameter, fitToleranceLimits, fitShaftMaterialObj, fitHubMaterialObj, thermalHubTemp, thermalShaftTemp]);

  const handleApplyRecommendedKey = () => {
    const rec = getRecommendedKeyDimensions(keyShaftDiameter).dimensions;
    setKeyWidth(rec.b);
    setKeyHeight(rec.h);
    setShaftKeywayDepth(rec.t1);
    setHubKeywayDepth(rec.t2);
    setKeyLength(Math.max(20, Math.round(keyShaftDiameter * 1.25)));
  };

  const handleCopyReport = () => {
    const reportMd = generateConnectionsReport(connectionType, keyResult, fitResult, thermalResult);
    navigator.clipboard.writeText(reportMd);
    setCopyFeedback('Report copied to clipboard!');
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  const handleDownloadReport = () => {
    const reportMd = generateConnectionsReport(connectionType, keyResult, fitResult, thermalResult);
    const blob = new Blob([reportMd], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `connections-analysis-${activeProject.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
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
              <Link2 size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Shaft–Hub Connections, Key Strength & Interference Fits
              </h1>
              <p className="text-xs text-gray-400">
                DIN 6885-1 parallel keys · DIN 7190-1 elastic press fits · ISO 286 tolerance limits · Lamé contact stress & thermal assembly
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Connection Type Switcher */}
          <div className="flex rounded border border-navy-700 bg-navy-900 p-0.5">
            <button
              onClick={() => setConnectionType('key')}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                connectionType === 'key' ? 'bg-[#64D6C5] text-navy-950 font-bold' : 'text-gray-300 hover:text-white'
              }`}
            >
              Parallel Key (DIN 6885)
            </button>
            <button
              onClick={() => setConnectionType('interference_fit')}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                connectionType === 'interference_fit' ? 'bg-[#64D6C5] text-navy-950 font-bold' : 'text-gray-300 hover:text-white'
              }`}
            >
              Interference Fit (DIN 7190)
            </button>
          </div>

          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 rounded border border-navy-700 bg-navy-800/80 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-navy-700 hover:text-white"
          >
            <Copy size={14} />
            {copyFeedback ? copyFeedback : 'Copy Report'}
          </button>
          <button
            onClick={handleDownloadReport}
            className="flex items-center gap-1.5 rounded border border-[#64D6C5]/40 bg-[#64D6C5]/20 px-3 py-1.5 text-xs font-medium text-[#64D6C5] transition-colors hover:bg-[#64D6C5]/30"
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
            activeTab === 'workstation' ? 'border-[#64D6C5] text-[#64D6C5]' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Sliders size={15} />
          {connectionType === 'key' ? 'Key Connection Analysis' : 'Interference Fit Analysis'}
        </button>
        {connectionType === 'interference_fit' && (
          <button
            onClick={() => setActiveTab('thermal')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === 'thermal' ? 'border-[#64D6C5] text-[#64D6C5]' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Flame size={15} />
            Thermal Assembly & Clearance
          </button>
        )}
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'audit' ? 'border-[#64D6C5] text-[#64D6C5]' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <ShieldCheck size={15} />
          Equations & Audit Derivation
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'report' ? 'border-[#64D6C5] text-[#64D6C5]' : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <BookOpen size={15} />
          Engineering Report
        </button>
      </div>

      {/* ─── TAB 1: WORKSTATION ─── */}
      {activeTab === 'workstation' && (
        <div className="space-y-6">
          {connectionType === 'key' ? (
            /* ─── PARALLEL KEY WORKSTATION ─── */
            <>
              {'error' in keyResult ? (
                <div className="rounded-lg border border-red-500/50 bg-red-950/30 p-4 text-red-200">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertOctagon size={18} />
                    Input Error
                  </div>
                  <p className="mt-1 text-xs">{keyResult.error}</p>
                </div>
              ) : (
                <>
                  {/* Status Banner */}
                  <div
                    className={`flex items-center justify-between rounded-lg border p-4 ${
                      keyResult.status === 'safe'
                        ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                        : keyResult.status === 'marginal'
                        ? 'border-amber-500/40 bg-amber-950/20 text-amber-300'
                        : 'border-rose-500/40 bg-rose-950/20 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {keyResult.status === 'safe' ? (
                        <CheckCircle2 size={22} className="text-emerald-400" />
                      ) : keyResult.status === 'marginal' ? (
                        <AlertTriangle size={22} className="text-amber-400" />
                      ) : (
                        <AlertOctagon size={22} className="text-rose-400" />
                      )}
                      <div>
                        <h3 className="text-sm font-semibold">
                          {keyResult.status === 'safe'
                            ? 'Parallel Key Connection Approved'
                            : keyResult.status === 'marginal'
                            ? 'Marginal Key Connection Safety Factor'
                            : 'Key Connection Capacity Exceeded'}
                        </h3>
                        <p className="text-xs opacity-90">{keyResult.statusMessage}</p>
                      </div>
                    </div>

                    <div className="hidden text-right text-xs md:block">
                      <div className="font-mono font-semibold text-white">
                        Safety Factor: n = {keyResult.connectionSafetyFactor.toFixed(2)}
                      </div>
                      <div className="text-gray-400">
                        Torque Capacity: {keyResult.torqueCapacity} N·m (Demand: {Math.abs(keyTorque)} N·m)
                      </div>
                    </div>
                  </div>

                  {/* Warning banner for reversing torque */}
                  {keyResult.reversingLoadWarning && (
                    <div className="rounded border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="mt-0.5 text-amber-400 shrink-0" />
                        <div>{keyResult.reversingLoadWarning}</div>
                      </div>
                    </div>
                  )}

                  {/* Two-Column Grid: Form Inputs & Live Evaluation */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Left: Input Parameters (5 Cols) */}
                    <div className="space-y-4 rounded-lg border border-navy-800 bg-navy-900/70 p-4 lg:col-span-5">
                      <div className="flex items-center justify-between border-b border-navy-800 pb-3">
                        <h3 className="text-sm font-semibold text-white">Key & Keyway Dimensions</h3>
                        <button
                          onClick={handleApplyRecommendedKey}
                          className="flex items-center gap-1 rounded bg-[#64D6C5]/10 border border-[#64D6C5]/30 px-2 py-1 text-[11px] font-medium text-[#64D6C5] hover:bg-[#64D6C5]/20"
                          title="Apply standard DIN 6885-1 dimensions matching shaft diameter"
                        >
                          <Sparkles size={12} />
                          DIN 6885 Standard
                        </button>
                      </div>

                      {/* Dimensions Form */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400">Shaft ⌀ d (mm)</label>
                          <input
                            type="number"
                            value={keyShaftDiameter}
                            onChange={(e) => setKeyShaftDiameter(Math.max(5, Number(e.target.value)))}
                            className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Key Width b (mm)</label>
                          <input
                            type="number"
                            value={keyWidth}
                            onChange={(e) => setKeyWidth(Math.max(1, Number(e.target.value)))}
                            className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400">Key Height h (mm)</label>
                          <input
                            type="number"
                            value={keyHeight}
                            onChange={(e) => setKeyHeight(Math.max(1, Number(e.target.value)))}
                            className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Total Length L (mm)</label>
                          <input
                            type="number"
                            value={keyLength}
                            onChange={(e) => setKeyLength(Math.max(5, Number(e.target.value)))}
                            className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400">Shaft Keyway Depth t1 (mm)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={shaftKeywayDepth}
                            onChange={(e) => setShaftKeywayDepth(Math.max(0.1, Number(e.target.value)))}
                            className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Hub Keyway Depth t2 (mm)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={hubKeywayDepth}
                            onChange={(e) => setHubKeywayDepth(Math.max(0.1, Number(e.target.value)))}
                            className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-gray-400">Key End Profile</label>
                        <select
                          value={keyProfile}
                          onChange={(e) => setKeyProfile(e.target.value as KeyProfileType)}
                          className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                        >
                          <option value="form_a_round_ends">Form A (Round ends: Leff = L - b)</option>
                          <option value="form_b_square_ends">Form B (Square ends: Leff = L)</option>
                        </select>
                      </div>

                      {/* Loading & Operating Conditions */}
                      <div className="border-t border-navy-800 pt-3 space-y-3">
                        <h4 className="text-xs font-semibold text-gray-300">Loading & Operating Duty</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-400">Transmitted Torque (N·m)</label>
                            <input
                              type="number"
                              value={keyTorque}
                              onChange={(e) => setKeyTorque(Number(e.target.value))}
                              className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Application Factor KA</label>
                            <input
                              type="number"
                              step="0.05"
                              value={dynamicLoadFactor}
                              onChange={(e) => setDynamicLoadFactor(Math.max(1.0, Number(e.target.value)))}
                              className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            id="reversing-torque"
                            checked={isReversingTorque}
                            onChange={(e) => setIsReversingTorque(e.target.checked)}
                            className="rounded border-navy-700 text-[#64D6C5] focus:ring-0"
                          />
                          <label htmlFor="reversing-torque" className="text-xs text-gray-300">
                            Reversing / Alternating Torque Direction (40% de-rating)
                          </label>
                        </div>
                      </div>

                      {/* Materials Selection */}
                      <div className="border-t border-navy-800 pt-3 space-y-3">
                        <h4 className="text-xs font-semibold text-gray-300">Component Materials</h4>
                        <div>
                          <label className="text-[11px] text-gray-400">Key Material</label>
                          <select
                            value={keyMaterialId}
                            onChange={(e) => setKeyMaterialId(e.target.value)}
                            className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                          >
                            <option value="c45e">C45E Steel Key Stock (Sy = 450 MPa)</option>
                            {materials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} (Sy = {m.yieldStrength} MPa)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] text-gray-400">Hub Material</label>
                          <select
                            value={hubMaterialId}
                            onChange={(e) => setHubMaterialId(e.target.value)}
                            className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                          >
                            {materials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} (Sy = {m.yieldStrength} MPa)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Right: Results & Diagrams (7 Cols) */}
                    <div className="space-y-4 lg:col-span-7">
                      {/* Metric Cards */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded border border-navy-800 bg-navy-900/60 p-3">
                          <div className="text-[10px] text-gray-400">Tangential Force (Ft)</div>
                          <div className="text-base font-mono font-bold text-white">
                            {keyResult.tangentialForce.toLocaleString()} N
                          </div>
                          <div className="text-[10px] text-gray-400">2·T / d</div>
                        </div>

                        <div className="rounded border border-navy-800 bg-navy-900/60 p-3">
                          <div className="text-[10px] text-gray-400">Effective Length</div>
                          <div className="text-base font-mono font-bold text-[#64D6C5]">
                            {keyResult.effectiveLength} mm
                          </div>
                          <div className="text-[10px] text-gray-400">L - b ({keyResult.keyLength - keyResult.keyWidth})</div>
                        </div>

                        <div className="rounded border border-navy-800 bg-navy-900/60 p-3">
                          <div className="text-[10px] text-gray-400">Key Shear Stress</div>
                          <div className="text-base font-mono font-bold text-emerald-400">
                            {keyResult.shearStress} MPa
                          </div>
                          <div className="text-[10px] text-gray-400">Allow: {keyResult.allowableShearStress} MPa</div>
                        </div>

                        <div className="rounded border border-navy-800 bg-navy-900/60 p-3">
                          <div className="text-[10px] text-gray-400">Flank Pressure</div>
                          <div className="text-base font-mono font-bold text-amber-400">
                            {keyResult.bearingPressure} MPa
                          </div>
                          <div className="text-[10px] text-gray-400">Allow: {keyResult.allowableBearingPressure} MPa</div>
                        </div>
                      </div>

                      {/* Detailed Stress & Capacity Breakdown Card */}
                      <div className="rounded-lg border border-navy-800 bg-navy-900/80 p-4 space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Strength & Torque Transmission Verification
                        </h4>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-navy-800 pb-2">
                            <span className="text-gray-300">Shear Stress Safety Margin:</span>
                            <span className="font-mono font-semibold text-emerald-400">
                              n_shear = {keyResult.shearSafetyFactor}
                            </span>
                          </div>

                          <div className="flex items-center justify-between border-b border-navy-800 pb-2">
                            <span className="text-gray-300">
                              Flank Crushing Margin (on {keyResult.governingMaterialForPressure}):
                            </span>
                            <span className="font-mono font-semibold text-amber-400">
                              n_bearing = {keyResult.bearingSafetyFactor}
                            </span>
                          </div>

                          <div className="flex items-center justify-between border-b border-navy-800 pb-2">
                            <span className="text-gray-300">Torque Capacity Limit:</span>
                            <span className="font-mono font-semibold text-white">
                              {keyResult.torqueCapacity} N·m (Governed by {keyResult.governingMode === 'key_shear' ? 'Key Shear' : 'Flank Contact Pressure'})
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-gray-300">Overall Connection Margin:</span>
                            <span
                              className={`rounded px-2 py-0.5 font-mono font-bold ${
                                keyResult.connectionSafetyFactor >= 1.5
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : keyResult.connectionSafetyFactor >= 1.0
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              n = {keyResult.connectionSafetyFactor}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Schematic Visual Cross-Section (SVG) */}
                      <div className="rounded-lg border border-navy-800 bg-navy-900/90 p-4">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Cross-Sectional Schematic (DIN 6885-1 Form A)
                        </div>
                        <div className="flex justify-center bg-navy-950 p-3 rounded">
                          <KeywayCrossSectionSvg
                            d={keyShaftDiameter}
                            b={keyWidth}
                            h={keyHeight}
                            t1={shaftKeywayDepth}
                            t2={hubKeywayDepth}
                            Ft={keyResult.tangentialForce}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            /* ─── CYLINDRICAL INTERFERENCE FIT WORKSTATION ─── */
            <>
              {'error' in fitResult ? (
                <div className="rounded-lg border border-red-500/50 bg-red-950/30 p-4 text-red-200">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertOctagon size={18} />
                    Input Error
                  </div>
                  <p className="mt-1 text-xs">{fitResult.error}</p>
                </div>
              ) : (
                <>
                  {/* Status Banner */}
                  <div
                    className={`flex items-center justify-between rounded-lg border p-4 ${
                      fitResult.status === 'safe'
                        ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                        : fitResult.status === 'caution'
                        ? 'border-amber-500/40 bg-amber-950/20 text-amber-300'
                        : 'border-rose-500/40 bg-rose-950/20 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {fitResult.status === 'safe' ? (
                        <CheckCircle2 size={22} className="text-emerald-400" />
                      ) : fitResult.status === 'caution' ? (
                        <AlertTriangle size={22} className="text-amber-400" />
                      ) : (
                        <AlertOctagon size={22} className="text-rose-400" />
                      )}
                      <div>
                        <h3 className="text-sm font-semibold">
                          {fitResult.status === 'safe'
                            ? 'Interference Fit Verified — Capacity & Stresses Approved'
                            : fitResult.status === 'caution'
                            ? 'Marginal Interference Fit'
                            : 'Interference Fit Unacceptable'}
                        </h3>
                        <p className="text-xs opacity-90">{fitResult.statusMessage}</p>
                      </div>
                    </div>

                    <div className="hidden text-right text-xs md:block">
                      <div className="font-mono font-semibold text-white">
                        Min Torque Capacity: {fitResult.capacity.minTorqueCapacityNm} N·m
                      </div>
                      <div className="text-gray-400">
                        Hub Yield Safety: s_yield = {fitResult.stresses.hubYieldSafetyFactor.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Two-Column Grid: Fit Inputs & Live Mechanical Output */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Left: Fit Parameters (5 Cols) */}
                    <div className="space-y-4 rounded-lg border border-navy-800 bg-navy-900/70 p-4 lg:col-span-5">
                      <h3 className="border-b border-navy-800 pb-3 text-sm font-semibold text-white">
                        Fit Geometry & Tolerance Preset
                      </h3>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400">Nominal ⌀ d (mm)</label>
                          <input
                            type="number"
                            value={fitNominalDiameter}
                            onChange={(e) => setFitNominalDiameter(Math.max(10, Number(e.target.value)))}
                            className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Hub Outer ⌀ Do (mm)</label>
                          <input
                            type="number"
                            value={fitOuterDiameter}
                            onChange={(e) => setFitOuterDiameter(Math.max(fitNominalDiameter + 5, Number(e.target.value)))}
                            className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400">Fit Contact Length L (mm)</label>
                          <input
                            type="number"
                            value={fitLength}
                            onChange={(e) => setFitLength(Math.max(5, Number(e.target.value)))}
                            className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">ISO 286 Fit Preset</label>
                          <select
                            value={fitPreset}
                            onChange={(e) => setFitPreset(e.target.value)}
                            className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                          >
                            <option value="H7/p6">H7/p6 (Medium Press Fit)</option>
                            <option value="H7/r6">H7/r6 (Heavy Drive / Shrink Fit)</option>
                            <option value="H7/s6">H7/s6 (Permanent Shrink Fit)</option>
                            <option value="H7/k6">H7/k6 (Transition Fit — Demo)</option>
                          </select>
                        </div>
                      </div>

                      {/* Display Resolved Tolerance Limits */}
                      <div className="rounded bg-navy-950 p-2.5 text-xs font-mono">
                        <div className="flex justify-between text-gray-400 text-[11px] font-sans">
                          <span>Shaft: ⌀{fitToleranceLimits.shaftMin.toFixed(3)} to ⌀{fitToleranceLimits.shaftMax.toFixed(3)} mm</span>
                        </div>
                        <div className="flex justify-between text-gray-400 text-[11px] font-sans">
                          <span>Hub Bore: ⌀{fitToleranceLimits.hubMin.toFixed(3)} to ⌀{fitToleranceLimits.hubMax.toFixed(3)} mm</span>
                        </div>
                        <div className="mt-1 flex justify-between border-t border-navy-800 pt-1 text-[#64D6C5]">
                          <span>Interference: {fitResult.diametralInterference.minUm} to {fitResult.diametralInterference.maxUm} μm</span>
                        </div>
                      </div>

                      {/* Friction & Loading */}
                      <div className="border-t border-navy-800 pt-3 space-y-3">
                        <h4 className="text-xs font-semibold text-gray-300">Friction & Transmitted Demands</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-400">Friction Coeff μ</label>
                            <input
                              type="number"
                              step="0.01"
                              value={frictionCoeff}
                              onChange={(e) => setFrictionCoeff(Math.max(0.01, Number(e.target.value)))}
                              className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400">Torque Demand T (N·m)</label>
                            <input
                              type="number"
                              value={fitTorque}
                              onChange={(e) => setFitTorque(Number(e.target.value))}
                              className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-400">Axial Demand Fa (N)</label>
                            <input
                              type="number"
                              value={fitAxialForce}
                              onChange={(e) => setFitAxialForce(Number(e.target.value))}
                              className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center pt-4">
                            <label className="flex items-center gap-2 text-xs text-gray-300">
                              <input
                                type="checkbox"
                                checked={simultaneousLoading}
                                onChange={(e) => setSimultaneousLoading(e.target.checked)}
                                className="rounded border-navy-700 text-[#64D6C5] focus:ring-0"
                              />
                              Simultaneous Loading
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Materials */}
                      <div className="border-t border-navy-800 pt-3 space-y-3">
                        <h4 className="text-xs font-semibold text-gray-300">Hub Material</h4>
                        <select
                          value={fitHubMaterialId}
                          onChange={(e) => setFitHubMaterialId(e.target.value)}
                          className="w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                        >
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} (E={m.elasticModulus} GPa, Sy={m.yieldStrength} MPa)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Right: Pressure & Stress Results (7 Cols) */}
                    <div className="space-y-4 lg:col-span-7">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded border border-navy-800 bg-navy-900/60 p-3">
                          <div className="text-[10px] text-gray-400">Min Contact Pressure</div>
                          <div className="text-base font-mono font-bold text-cyan-400">
                            {fitResult.contactPressure.minMpa} MPa
                          </div>
                          <div className="text-[10px] text-gray-400">at min interference</div>
                        </div>

                        <div className="rounded border border-navy-800 bg-navy-900/60 p-3">
                          <div className="text-[10px] text-gray-400">Max Contact Pressure</div>
                          <div className="text-base font-mono font-bold text-white">
                            {fitResult.contactPressure.maxMpa} MPa
                          </div>
                          <div className="text-[10px] text-gray-400">at max interference</div>
                        </div>

                        <div className="rounded border border-navy-800 bg-navy-900/60 p-3">
                          <div className="text-[10px] text-gray-400">Min Torque Capacity</div>
                          <div className="text-base font-mono font-bold text-emerald-400">
                            {fitResult.capacity.minTorqueCapacityNm} N·m
                          </div>
                          <div className="text-[10px] text-gray-400">Margin: n={fitResult.capacity.torqueMargin}</div>
                        </div>

                        <div className="rounded border border-navy-800 bg-navy-900/60 p-3">
                          <div className="text-[10px] text-gray-400">Hub Hoop Stress</div>
                          <div className="text-base font-mono font-bold text-amber-400">
                            {fitResult.stresses.hubHoopStressMaxMpa} MPa
                          </div>
                          <div className="text-[10px] text-gray-400">Sy: {fitResult.stresses.hubYieldStrengthMpa} MPa</div>
                        </div>
                      </div>

                      {/* Stress Audit Card */}
                      <div className="rounded-lg border border-navy-800 bg-navy-900/80 p-4 space-y-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Lamé Elastic Stress Evaluation
                        </h4>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-navy-800 pb-2">
                            <span className="text-gray-300">Hub Bore Von Mises Equivalent Stress:</span>
                            <span className="font-mono font-semibold text-white">
                              {fitResult.stresses.hubVonMisesMaxMpa} MPa (Yield: {fitResult.stresses.hubYieldStrengthMpa} MPa)
                            </span>
                          </div>

                          <div className="flex items-center justify-between border-b border-navy-800 pb-2">
                            <span className="text-gray-300">Hub Yield Safety Factor:</span>
                            <span
                              className={`font-mono font-bold ${
                                fitResult.stresses.hubYieldSafetyFactor >= 1.5
                                  ? 'text-emerald-400'
                                  : fitResult.stresses.hubYieldSafetyFactor >= 1.0
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              s_yield = {fitResult.stresses.hubYieldSafetyFactor}
                            </span>
                          </div>

                          <div className="flex items-center justify-between border-b border-navy-800 pb-2">
                            <span className="text-gray-300">Min Axial Friction Retention:</span>
                            <span className="font-mono font-semibold text-white">
                              {(fitResult.capacity.minAxialCapacityN / 1000).toFixed(1)} kN
                            </span>
                          </div>

                          {fitResult.capacity.combinedMargin !== undefined && (
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-gray-300">Simultaneous Combined Loading Margin:</span>
                              <span
                                className={`font-mono font-bold ${
                                  fitResult.capacity.combinedMargin >= 1.5
                                    ? 'text-emerald-400'
                                    : fitResult.capacity.combinedMargin >= 1.0
                                    ? 'text-amber-400'
                                    : 'text-rose-400'
                                }`}
                              >
                                n_comb = {fitResult.capacity.combinedMargin}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Warnings if any */}
                      {fitResult.warnings.length > 0 && (
                        <div className="rounded border border-amber-500/40 bg-amber-950/20 p-3 text-xs text-amber-200 space-y-1">
                          {fitResult.warnings.map((w, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <AlertTriangle size={14} className="mt-0.5 text-amber-400 shrink-0" />
                              <span>{w}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── TAB 2: THERMAL ASSEMBLY ─── */}
      {activeTab === 'thermal' && (
        <div className="space-y-6">
          {'error' in thermalResult ? (
            <div className="rounded-lg border border-red-500/50 bg-red-950/30 p-4 text-red-200">
              <div className="flex items-center gap-2 font-semibold">
                <AlertOctagon size={18} />
                Input Error
              </div>
              <p className="mt-1 text-xs">{thermalResult.error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left: Thermal Parameters */}
              <div className="space-y-4 rounded-lg border border-navy-800 bg-navy-900/70 p-4 lg:col-span-5">
                <h3 className="border-b border-navy-800 pb-3 text-sm font-semibold text-white">
                  Thermal Shrink-Fit Requirements
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Initial Max Interference:</span>
                    <span className="font-mono text-white">{thermalResult.initialMaxInterferenceUm} μm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Target Assembly Clearance:</span>
                    <span className="font-mono text-[#64D6C5]">{thermalResult.targetAssemblyClearanceUm} μm</span>
                  </div>
                  <div className="flex justify-between border-t border-navy-800 pt-1 font-semibold">
                    <span className="text-gray-300">Total Dilation Required:</span>
                    <span className="font-mono text-white">{thermalResult.totalExpansionRequiredUm} μm</span>
                  </div>
                </div>

                <div className="border-t border-navy-800 pt-3 space-y-3">
                  <h4 className="text-xs font-semibold text-gray-300">Trial Assembly Temperatures</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400">Hub Heating Temp (°C)</label>
                      <input
                        type="number"
                        value={thermalHubTemp}
                        onChange={(e) => setThermalHubTemp(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Shaft Cooling Temp (°C)</label>
                      <input
                        type="number"
                        value={thermalShaftTemp}
                        onChange={(e) => setThermalShaftTemp(Number(e.target.value))}
                        className="mt-1 w-full rounded border border-navy-700 bg-navy-800 px-2.5 py-1.5 text-xs text-white focus:border-[#64D6C5] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Thermal Results */}
              <div className="space-y-4 lg:col-span-7">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded border border-navy-800 bg-navy-900/60 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                      <Flame size={16} />
                      Sole-Heating Assembly
                    </div>
                    <div className="mt-2 text-2xl font-mono font-bold text-white">
                      {Math.round(thermalResult.calculatedHubTempForAssemblyC)} °C
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      Required hub temperature if shaft remains at 20 °C
                    </div>
                  </div>

                  <div className="rounded border border-navy-800 bg-navy-900/60 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
                      <Snowflake size={16} />
                      Sole-Cooling Assembly
                    </div>
                    <div className="mt-2 text-2xl font-mono font-bold text-white">
                      {Math.round(thermalResult.calculatedShaftTempForAssemblyC)} °C
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      Required shaft temperature if hub remains at 20 °C
                    </div>
                  </div>
                </div>

                {thermalResult.resultingClearanceAtInputTempsUm !== undefined && (
                  <div className="rounded-lg border border-navy-800 bg-navy-900/80 p-4 space-y-2">
                    <h4 className="text-xs font-semibold text-gray-300">
                      Clearance at Specified Temperatures ({thermalHubTemp} °C Hub / {thermalShaftTemp} °C Shaft)
                    </h4>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Resulting Assembly Clearance:</span>
                      <span className="font-mono font-bold text-[#64D6C5] text-sm">
                        {thermalResult.resultingClearanceAtInputTempsUm} μm
                      </span>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-navy-800 bg-navy-900/60 p-4 text-xs text-gray-300 space-y-2">
                  <div className="font-semibold text-white">Assembly Guidance & Process Control</div>
                  <p>{thermalResult.guidance}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: AUDIT & DERIVATION ─── */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-navy-800 bg-navy-900/80 p-5">
            <h2 className="text-base font-semibold text-white">Mathematical Traceability & Standard Derivations</h2>
            <p className="text-xs text-gray-400">
              Formulas conforming to DIN 6885-1:2021-11, DIN 7190-1:2017-02, and Lamé thick-walled cylinder theory
            </p>

            <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded border border-navy-800 bg-navy-950 p-4">
                <div className="text-xs font-semibold text-[#64D6C5]">1. Parallel Key Mechanics (DIN 6885-1)</div>
                <div className="mt-2 font-mono text-xs text-gray-300 space-y-1">
                  <div>F_t = (2 · T / d) · K_A</div>
                  <div>L_eff = L - b (Form A round ends)</div>
                  <div>τ_k = F_t / (b · L_eff)</div>
                  <div>p_b = F_t / (h_eff · L_eff)</div>
                  <div>T_cap = min(τ_allow · b, p_allow · h_eff) · d · L_eff / 2</div>
                </div>
              </div>

              <div className="rounded border border-navy-800 bg-navy-950 p-4">
                <div className="text-xs font-semibold text-[#64D6C5]">2. Interference Fit Elasticity (Lamé / DIN 7190-1)</div>
                <div className="mt-2 font-mono text-xs text-gray-300 space-y-1">
                  <div>q = d / D_o</div>
                  <div>C_h = (1/E_h) · [(1+q²)/(1-q²) + ν_h]</div>
                  <div>C_s = (1 - ν_s) / E_s (solid shaft)</div>
                  <div>p = δ / [d · (C_h + C_s)]</div>
                  <div>σ_t,hub = p · (1+q²)/(1-q²)</div>
                </div>
              </div>

              <div className="rounded border border-navy-800 bg-navy-950 p-4">
                <div className="text-xs font-semibold text-[#64D6C5]">3. Friction Torque & Axial Capacity</div>
                <div className="mt-2 font-mono text-xs text-gray-300 space-y-1">
                  <div>F_axial,cap = μ · p_min · π · d · L</div>
                  <div>T_cap = μ · p_min · π · d² · L / 2</div>
                  <div>F_res = √(F_t² + F_a²) (simultaneous)</div>
                  <div>n_comb = F_friction / F_res</div>
                </div>
              </div>

              <div className="rounded border border-navy-800 bg-navy-950 p-4">
                <div className="text-xs font-semibold text-[#64D6C5]">4. Thermal Assembly Dilation</div>
                <div className="mt-2 font-mono text-xs text-gray-300 space-y-1">
                  <div>Δd = d · α · ΔT</div>
                  <div>ΔT_hub = (δ_max + Δd_req) / (d · α_h)</div>
                  <div>T_hub = 20 + ΔT_hub</div>
                  <div>Safe heating limit: T_hub ≤ 250 °C</div>
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
            <h2 className="text-base font-semibold text-white">Shaft–Hub Connection Engineering Report Preview</h2>
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
            {generateConnectionsReport(connectionType, keyResult, fitResult, thermalResult)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── SVG Cross-Section Component ─────────────────────────────────────────────
function KeywayCrossSectionSvg({
  d,
  b,
  h,
  t1,
  t2,
  Ft
}: {
  d: number;
  b: number;
  h: number;
  t1: number;
  t2: number;
  Ft: number;
}) {
  const width = 360;
  const height = 240;
  const cx = width / 2;
  const cy = height / 2;
  const rShaft = 65; // px representation of d
  const scale = (2 * rShaft) / d;

  const bPx = b * scale;
  const hPx = h * scale;
  const t1Px = t1 * scale;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[400px] h-auto">
      <defs>
        <marker id="key-force" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#38BDF8" />
        </marker>
      </defs>

      {/* Hub outer ring representation */}
      <circle cx={cx} cy={cy} r={rShaft + 35} fill="#0F172A" stroke="#334155" strokeWidth="2" />

      {/* Shaft circle */}
      <circle cx={cx} cy={cy} r={rShaft} fill="#1E293B" stroke="#64748B" strokeWidth="2" />

      {/* Keyway cutout & Key body */}
      <rect
        x={cx - bPx / 2}
        y={cy - rShaft - (hPx - t1Px)}
        width={bPx}
        height={hPx}
        fill="#334155"
        stroke="#64D6C5"
        strokeWidth="1.5"
        rx="1"
      />

      {/* Shear plane line (dashed at shaft circumference) */}
      <line
        x1={cx - bPx / 2 - 10}
        y1={cy - rShaft}
        x2={cx + bPx / 2 + 10}
        y2={cy - rShaft}
        stroke="#F87171"
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />

      {/* Tangential force arrow */}
      <line
        x1={cx - bPx / 2 - 40}
        y1={cy - rShaft - (hPx - t1Px) / 2}
        x2={cx - bPx / 2 - 5}
        y2={cy - rShaft - (hPx - t1Px) / 2}
        stroke="#38BDF8"
        strokeWidth="2.5"
        markerEnd="url(#key-force)"
      />
      <text
        x={cx - bPx / 2 - 45}
        y={cy - rShaft - (hPx - t1Px) / 2 - 6}
        fill="#38BDF8"
        fontSize="10"
        fontWeight="bold"
        fontFamily="monospace"
        textAnchor="end"
      >
        Ft={Math.round(Ft)}N
      </text>

      {/* Labels */}
      <text x={cx} y={cy + 15} textAnchor="middle" fill="#94A3B8" fontSize="11" fontWeight="bold">
        Shaft ⌀{d} mm
      </text>
      <text x={cx} y={cy - rShaft - hPx - 8} textAnchor="middle" fill="#64D6C5" fontSize="10" fontWeight="bold">
        Key {b}×{h} (t1={t1}, t2={t2})
      </text>
    </svg>
  );
}

// ─── Markdown Report Generator ───────────────────────────────────────────────
function generateConnectionsReport(
  type: 'key' | 'interference_fit',
  keyRes: any,
  fitRes: any,
  thermalRes: any
): string {
  if (type === 'key') {
    if ('error' in keyRes) return `# ERROR\n${keyRes.error}`;
    return `# PARALLEL KEY CONNECTION ENGINEERING REPORT
**Quantum AI // Mechanical Engineering Design Copilot**
*Standard: DIN 6885-1:2021-11*
*Generated: ${new Date().toISOString()}*

---

## 1. CONNECTION SUMMARY
- **Overall Status:** ${keyRes.status.toUpperCase()}
- **Safety Factor:** n = ${keyRes.connectionSafetyFactor}
- **Governing Mode:** ${keyRes.governingMode === 'key_shear' ? 'Key Shear' : 'Flank Contact Crushing Pressure'}
- **Torque Capacity:** ${keyRes.torqueCapacity} N·m (Demand: ${(keyRes.tangentialForce * keyRes.shaftDiameter / 2000).toFixed(1)} N·m)

---

## 2. GEOMETRY & MATERIALS
- **Shaft Diameter (d):** ${keyRes.shaftDiameter} mm
- **Key Cross-Section (b × h):** ${keyRes.keyWidth} × ${keyRes.keyHeight} mm
- **Total Key Length (L):** ${keyRes.keyLength} mm
- **Effective Bearing Length (Leff):** ${keyRes.effectiveLength} mm
- **Effective Flank Height (heff):** ${keyRes.effectiveContactHeight} mm
- **Governing Weakest Material:** ${keyRes.governingMaterialForPressure}

---

## 3. STRESSES & CAPACITIES
- **Tangential Force (Ft):** ${keyRes.tangentialForce} N
- **Key Shear Stress (τk):** ${keyRes.shearStress} MPa (Allowable: ${keyRes.allowableShearStress} MPa, n = ${keyRes.shearSafetyFactor})
- **Flank Contact Pressure (pb):** ${keyRes.bearingPressure} MPa (Allowable: ${keyRes.allowableBearingPressure} MPa, n = ${keyRes.bearingSafetyFactor})
- **Torque Capacity (Shear):** ${keyRes.torqueCapacityShear} N·m
- **Torque Capacity (Flank Pressure):** ${keyRes.torqueCapacityBearing} N·m
`;
  } else {
    if ('error' in fitRes) return `# ERROR\n${fitRes.error}`;
    return `# CYLINDRICAL INTERFERENCE FIT & THERMAL ASSEMBLY REPORT
**Quantum AI // Mechanical Engineering Design Copilot**
*Standards: DIN 7190-1:2017-02, ISO 286*
*Generated: ${new Date().toISOString()}*

---

## 1. FIT SUMMARY
- **Overall Status:** ${fitRes.status.toUpperCase()}
- **Evaluation:** ${fitRes.statusMessage}
- **Min Interference:** ${fitRes.diametralInterference.minUm} μm
- **Max Interference:** ${fitRes.diametralInterference.maxUm} μm
- **Min Contact Pressure:** ${fitRes.contactPressure.minMpa} MPa
- **Max Contact Pressure:** ${fitRes.contactPressure.maxMpa} MPa

---

## 2. TRANSMISSION CAPACITIES & MARGINS
- **Friction Coefficient:** μ = ${fitRes.frictionCoefficient} (${fitRes.frictionSource})
- **Guaranteed Torque Capacity:** ${fitRes.capacity.minTorqueCapacityNm} N·m (Margin: n = ${fitRes.capacity.torqueMargin})
- **Guaranteed Axial Capacity:** ${(fitRes.capacity.minAxialCapacityN / 1000).toFixed(1)} kN (Margin: n = ${fitRes.capacity.axialMargin})

---

## 3. STRESSES & HUB YIELD SAFETY
- **Max Hub Hoop Tensile Stress:** ${fitRes.stresses.hubHoopStressMaxMpa} MPa
- **Max Hub Von Mises Stress:** ${fitRes.stresses.hubVonMisesMaxMpa} MPa (Yield: ${fitRes.stresses.hubYieldStrengthMpa} MPa)
- **Hub Yield Safety Factor:** s_yield = ${fitRes.stresses.hubYieldSafetyFactor}

---

## 4. THERMAL ASSEMBLY REQUIREMENTS
- **Required Hub Heating Temperature:** ${Math.round(thermalRes.calculatedHubTempForAssemblyC)} °C (at 20 °C shaft)
- **Assembly Clearance:** ${thermalRes.targetAssemblyClearanceUm} μm
- **Process Guidance:** ${thermalRes.guidance}
`;
  }
}
