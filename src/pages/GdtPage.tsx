import React, { useState, useMemo } from 'react';
import {
  Compass,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileDown,
  UploadCloud,
  RotateCcw,
  Plus,
  Trash2,
  Info,
  ShieldCheck,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  CadFeature,
  DatumDefinition,
  FeatureControlFrame,
  GeometricCharacteristic,
  MaterialModifier,
  StandardSystem,
  ToleranceZoneShape,
} from '../engineering/gdt/types';
import {
  extractCadFeaturesFromDesign,
  getDefaultDatums,
  getDefaultFeatureControlFrames,
  importCadFile,
} from '../engineering/gdt/cadAdapter';
import {
  CHARACTERISTIC_METADATA,
  formatFeatureControlFrameString,
  validateAllFeatureControlFrames,
  validateFeatureControlFrame,
} from '../engineering/gdt/validator';

export default function GdtPage() {
  const { designParams, activeProject } = useApp();

  // Extract CAD features dynamically from current project design parameters
  const cadFeatures = useMemo(() => {
    return extractCadFeaturesFromDesign(designParams);
  }, [designParams]);

  // Default datums for current CAD features
  const defaultDatums = useMemo(() => {
    return getDefaultDatums(cadFeatures);
  }, [cadFeatures]);

  const [datums, setDatums] = useState<DatumDefinition[]>(defaultDatums);
  const [standardSystem, setStandardSystem] = useState<StandardSystem>('ISO_GPS');
  const [fcfs, setFcfs] = useState<FeatureControlFrame[]>(() =>
    getDefaultFeatureControlFrames(cadFeatures, defaultDatums, 'ISO_GPS')
  );

  // New FCF form state
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>('feat-shaft-body');
  const [selectedCharacteristic, setSelectedCharacteristic] = useState<GeometricCharacteristic>('circular_runout');
  const [toleranceValue, setToleranceValue] = useState<number>(0.03);
  const [zoneShape, setZoneShape] = useState<ToleranceZoneShape>('circular');
  const [materialModifier, setMaterialModifier] = useState<MaterialModifier>('RFS');
  const [primaryDatum, setPrimaryDatum] = useState<string>('');
  const [secondaryDatum, setSecondaryDatum] = useState<string>('');
  const [tertiaryDatum, setTertiaryDatum] = useState<string>('');
  const [compoundAxis, setCompoundAxis] = useState<string>('A-B');
  const [useCompound, setUseCompound] = useState<boolean>(true);
  const [fcfDescription, setFcfDescription] = useState<string>('');

  // CAD Import modal / error notification
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Update characteristic handler: automatically suggest sensible defaults
  const handleCharacteristicChange = (char: GeometricCharacteristic) => {
    setSelectedCharacteristic(char);
    const meta = CHARACTERISTIC_METADATA[char];
    if (meta.category === 'form') {
      setUseCompound(false);
      setPrimaryDatum('');
      setSecondaryDatum('');
      setTertiaryDatum('');
      setCompoundAxis('');
    } else if (meta.id === 'circular_runout') {
      setUseCompound(true);
      setCompoundAxis('A-B');
      setZoneShape('circular');
      setMaterialModifier('RFS');
    } else if (meta.allowsCylindricalZone && selectedFeatureId !== 'feat-gear-shoulder') {
      setZoneShape('cylindrical');
    } else {
      setZoneShape('planar');
    }
  };

  // Build live preview FCF
  const livePreviewFcf: FeatureControlFrame = useMemo(() => {
    return {
      id: 'preview',
      featureId: selectedFeatureId,
      characteristic: selectedCharacteristic,
      toleranceValueMm: toleranceValue,
      zoneShape,
      materialModifier,
      datumReferences: useCompound
        ? { compoundAxis: compoundAxis.trim() || undefined }
        : {
            primary: primaryDatum ? { datumLabel: primaryDatum, modifier: 'RFS' } : undefined,
            secondary: secondaryDatum ? { datumLabel: secondaryDatum, modifier: 'RFS' } : undefined,
            tertiary: tertiaryDatum ? { datumLabel: tertiaryDatum, modifier: 'RFS' } : undefined,
          },
      standardSystem,
      description: fcfDescription,
    };
  }, [
    selectedFeatureId,
    selectedCharacteristic,
    toleranceValue,
    zoneShape,
    materialModifier,
    useCompound,
    compoundAxis,
    primaryDatum,
    secondaryDatum,
    tertiaryDatum,
    standardSystem,
    fcfDescription,
  ]);

  const liveValidation = useMemo(() => {
    return validateFeatureControlFrame(livePreviewFcf, cadFeatures, datums);
  }, [livePreviewFcf, cadFeatures, datums]);

  // Validation results for all active FCFs
  const validationResults = useMemo(() => {
    return validateAllFeatureControlFrames(fcfs, cadFeatures, datums);
  }, [fcfs, cadFeatures, datums]);

  // Add FCF handler
  const handleAddFcf = () => {
    const newFcf: FeatureControlFrame = {
      ...livePreviewFcf,
      id: `fcf-${Date.now()}`,
    };
    setFcfs((prev) => [...prev, newFcf]);
  };

  // Delete FCF
  const handleDeleteFcf = (id: string) => {
    setFcfs((prev) => prev.filter((f) => f.id !== id));
  };

  // Reset to default
  const handleResetDefaults = () => {
    setDatums(defaultDatums);
    setFcfs(getDefaultFeatureControlFrames(cadFeatures, defaultDatums, standardSystem));
    setImportStatus({
      type: 'info',
      message: 'Reset GD&T controls to standard shaft defaults.',
    });
  };

  // Export report
  const handleExportJson = () => {
    const payload = {
      exportTimestamp: new Date().toISOString(),
      project: activeProject.name,
      standardSystem,
      cadFeatures,
      datums,
      featureControlFrames: fcfs.map((fcf) => ({
        ...fcf,
        callout: formatFeatureControlFrameString(fcf),
      })),
      validationSummary: {
        totalFrames: fcfs.length,
        validFrames: validationResults.filter((r) => r.isValid).length,
        disclaimer:
          'Geometric definition syntax validated. Physical CMM conformance cannot be verified without physical inspection metrology data.',
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GDT_Callouts_${activeProject.name.replace(/\s+/g, '_')}_${standardSystem}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle CAD file upload simulation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = importCadFile({ name: file.name, content });
      if (result.success && result.features) {
        setImportStatus({
          type: 'success',
          message: `Successfully imported ${result.features.length} CAD features from "${file.name}".`,
        });
      } else {
        setImportStatus({
          type: 'error',
          message: result.error || 'Failed to import CAD file.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex-1 overflow-y-auto bg-navy-950 p-6 text-gray-100">
      {/* Page Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 border-b border-navy-800 pb-5 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/15 p-2 text-accent">
              <Compass size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                GD&T & CAD Geometric Controls
              </h1>
              <p className="text-sm text-gray-400">
                Feature Control Frames, Datum Reference Frames & CAD Surface Controls (ISO 1101:2017 & ASME Y14.5-2018)
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Standard System Switcher */}
          <div className="flex items-center rounded-lg border border-navy-700 bg-navy-900 p-1 text-xs font-semibold">
            <button
              onClick={() => setStandardSystem('ISO_GPS')}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                standardSystem === 'ISO_GPS'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ISO 1101 (GPS)
            </button>
            <button
              onClick={() => setStandardSystem('ASME_Y14_5')}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                standardSystem === 'ASME_Y14_5'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ASME Y14.5-2018
            </button>
          </div>

          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 rounded-lg border border-navy-700 bg-navy-900 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
            title="Reset to standard shaft defaults"
          >
            <RotateCcw size={14} />
            Reset Defaults
          </button>

          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-navy-700 bg-navy-900 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-gray-500 hover:text-white transition-colors">
            <UploadCloud size={14} />
            Import CAD / Test B-Rep
            <input
              type="file"
              accept=".step,.stp,.iges,.igs,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 transition-colors shadow-sm"
          >
            <FileDown size={14} />
            Export Callouts (JSON)
          </button>
        </div>
      </div>

      {/* Import Notification Banner */}
      {importStatus && (
        <div
          className={`mb-6 flex items-start justify-between rounded-lg border p-4 text-sm ${
            importStatus.type === 'error'
              ? 'border-red-500/50 bg-red-950/40 text-red-200'
              : importStatus.type === 'success'
              ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200'
              : 'border-blue-500/50 bg-blue-950/40 text-blue-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {importStatus.type === 'error' ? (
              <XCircle className="mt-0.5 shrink-0 text-red-400" size={18} />
            ) : importStatus.type === 'success' ? (
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-400" size={18} />
            ) : (
              <Info className="mt-0.5 shrink-0 text-blue-400" size={18} />
            )}
            <div>
              <p className="font-semibold">
                {importStatus.type === 'error'
                  ? 'CAD Format Diagnostic'
                  : importStatus.type === 'success'
                  ? 'Import Success'
                  : 'Notice'}
              </p>
              <p className="mt-1 text-xs opacity-90 leading-relaxed">
                {importStatus.message}
              </p>
            </div>
          </div>
          <button
            onClick={() => setImportStatus(null)}
            className="text-xs opacity-60 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Grid Layout: 2 Columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: CAD Geometry & Datums (5 Cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* CAD Geometry Features Panel */}
          <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-5 backdrop-blur-xs">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="text-accent" size={18} />
                <h2 className="text-base font-semibold text-white">
                  CAD Geometry Features
                </h2>
              </div>
              <span className="rounded bg-navy-800 px-2 py-0.5 text-xs font-mono text-gray-300">
                {cadFeatures.length} Features
              </span>
            </div>
            <p className="mb-4 text-xs text-gray-400">
              Normalized functional geometry generated from shaft design parameters (
              <span className="font-mono text-gray-200">⌀{designParams.diameter} mm × {designParams.length} mm</span>
            ).
            </p>

            <div className="space-y-3">
              {cadFeatures.map((feat) => {
                const assignedDatum = datums.find((d) => d.featureId === feat.id);
                return (
                  <div
                    key={feat.id}
                    onClick={() => setSelectedFeatureId(feat.id)}
                    className={`cursor-pointer rounded-lg border p-3 transition-all ${
                      selectedFeatureId === feat.id
                        ? 'border-accent bg-accent/10 shadow-xs'
                        : 'border-navy-800 bg-navy-950/60 hover:border-navy-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-white">
                          {feat.name}
                        </span>
                        {assignedDatum && (
                          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/40">
                            Datum {assignedDatum.label}
                          </span>
                        )}
                      </div>
                      <span className="rounded bg-navy-800 px-1.5 py-0.5 text-[10px] font-mono text-gray-400 uppercase">
                        {feat.type}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-xs font-mono text-gray-300">
                      <div>
                        <span className="text-gray-500">Nominal: </span>
                        {feat.type === 'cylinder' ? '⌀' : ''}
                        {feat.nominalDimensionMm} mm
                      </div>
                      {feat.lengthMm && (
                        <div>
                          <span className="text-gray-500">Length: </span>
                          {feat.lengthMm} mm
                        </div>
                      )}
                      {feat.sizeToleranceMm && (
                        <div>
                          <span className="text-gray-500">Tol: </span>
                          <span className="text-emerald-400">
                            {feat.sizeToleranceMm.upper >= 0 ? '+' : ''}
                            {feat.sizeToleranceMm.upper} / {feat.sizeToleranceMm.lower}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400">
                      {feat.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Datum Reference Frame Definition */}
          <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-5 backdrop-blur-xs">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-cyan-400" size={18} />
                <h2 className="text-base font-semibold text-white">
                  Datum Reference Frame (ISO 5459:2011)
                </h2>
              </div>
            </div>
            <p className="mb-4 text-xs text-gray-400">
              Rotational and translational coordinate constraints derived from precision bearing seats and locating shoulders.
            </p>

            <div className="space-y-2.5">
              {datums.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-navy-800 bg-navy-950/80 p-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/20 font-bold font-mono text-accent text-sm border border-accent/40">
                      {d.label}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{d.description}</p>
                      <p className="text-[11px] text-gray-400">
                        Feature: <span className="font-mono text-gray-300">{d.featureId}</span> ({d.featureType})
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {d.degreesOfFreedomConstrained.map((dof) => (
                      <span
                        key={dof}
                        className="rounded bg-navy-800 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 border border-navy-700"
                      >
                        {dof}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <div className="rounded-lg border border-dashed border-navy-700 bg-navy-900/40 p-2.5 text-xs text-gray-400 flex items-center justify-between">
                <span className="font-mono font-medium text-cyan-400">Common Axis A-B</span>
                <span className="text-[11px] text-gray-400">Coaxial bearing centerline (Tx, Ty, Rx, Ry constrained)</span>
              </div>
            </div>
          </div>

          {/* Standard Comparison Callout */}
          <div className="rounded-xl border border-navy-800 bg-navy-900/40 p-4 text-xs text-gray-300">
            <h3 className="font-semibold text-white flex items-center gap-1.5 mb-2">
              <Info size={14} className="text-accent" />
              Standard System Boundary Note
            </h3>
            {standardSystem === 'ISO_GPS' ? (
              <p className="text-gray-400 leading-relaxed">
                <strong className="text-gray-200">ISO 1101 / ISO 8015:</strong> Governed by the{' '}
                <em>Independency Principle</em>. Linear dimensions and geometric tolerances operate independently by default.
                Form limits do not constrain size variation unless the envelope requirement (Ⓔ) is explicitly invoked.
              </p>
            ) : (
              <p className="text-gray-400 leading-relaxed">
                <strong className="text-gray-200">ASME Y14.5-2018:</strong> Governed by{' '}
                <em>Rule #1 (Taylor Principle / Envelope Requirement)</em>. Surface boundaries are constrained by size limits at Maximum Material Condition (MMC) by default unless exempted.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: FCF Visualizer, Builder, and Active Callouts (7 Cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Interactive Feature Control Frame Visualizer & Builder */}
          <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-5 backdrop-blur-xs">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Compass className="text-accent" size={18} />
                Feature Control Frame Visualizer & Builder
              </h2>
              <span className="rounded bg-accent/20 px-2 py-0.5 text-xs font-mono text-accent font-semibold border border-accent/30">
                {standardSystem}
              </span>
            </div>

            {/* Visual Drawing Callout Box Preview */}
            <div className="mb-6 rounded-lg border border-navy-700 bg-navy-950 p-6 flex flex-col items-center justify-center">
              <span className="mb-2 text-[11px] font-mono tracking-wider text-gray-400 uppercase">
                Drawing Annotation Callout
              </span>
              <div className="inline-flex items-center overflow-hidden rounded-md border-2 border-white/80 bg-navy-900/90 shadow-lg text-lg font-mono font-bold tracking-wider">
                {/* Symbol Compartment */}
                <div className="flex h-14 w-14 items-center justify-center border-r-2 border-white/80 bg-navy-800/80 text-2xl text-accent">
                  {CHARACTERISTIC_METADATA[selectedCharacteristic]?.symbol || '?'}
                </div>
                {/* Tolerance Zone Compartment */}
                <div className="flex h-14 min-w-[120px] items-center justify-center px-4 border-r-2 border-white/80 text-white">
                  {zoneShape === 'cylindrical' && <span className="mr-0.5 text-cyan-400">⌀</span>}
                  <span>{toleranceValue}</span>
                  {materialModifier !== 'RFS' && (
                    <span className="ml-1.5 rounded-full border border-white/80 px-1 py-0 text-xs font-bold text-amber-300">
                      {materialModifier === 'MMC' ? 'M' : 'L'}
                    </span>
                  )}
                </div>
                {/* Datum Compartments */}
                {useCompound ? (
                  <div className="flex h-14 min-w-[70px] items-center justify-center px-4 font-bold text-cyan-300">
                    {compoundAxis || '—'}
                  </div>
                ) : (
                  <>
                    {primaryDatum && (
                      <div className="flex h-14 min-w-[50px] items-center justify-center border-r-2 border-white/80 px-3 text-cyan-300">
                        {primaryDatum}
                      </div>
                    )}
                    {secondaryDatum && (
                      <div className="flex h-14 min-w-[50px] items-center justify-center border-r-2 border-white/80 px-3 text-cyan-300">
                        {secondaryDatum}
                      </div>
                    )}
                    {tertiaryDatum && (
                      <div className="flex h-14 min-w-[50px] items-center justify-center px-3 text-cyan-300">
                        {tertiaryDatum}
                      </div>
                    )}
                    {!primaryDatum && !secondaryDatum && !tertiaryDatum && (
                      <div className="flex h-14 min-w-[50px] items-center justify-center px-3 text-gray-600 text-xs font-normal italic">
                        No Datums
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Formatted Text String */}
              <p className="mt-3 font-mono text-sm text-cyan-400">
                {liveValidation.formattedFcfString}
              </p>

              {/* Live Validation Banner */}
              <div className="mt-4 w-full">
                {liveValidation.isValid ? (
                  <div className="flex items-center gap-2 rounded-md bg-emerald-950/60 border border-emerald-500/40 px-3 py-2 text-xs text-emerald-300">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <span>
                      Syntactically valid per {CHARACTERISTIC_METADATA[selectedCharacteristic]?.isoStandard} and {CHARACTERISTIC_METADATA[selectedCharacteristic]?.asmeStandard}.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5 rounded-md bg-red-950/60 border border-red-500/40 p-3 text-xs text-red-300">
                    <div className="flex items-center gap-1.5 font-semibold text-red-400">
                      <XCircle size={16} />
                      <span>GD&T Rule Violations:</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      {liveValidation.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {liveValidation.warnings.length > 0 && (
                  <div className="mt-2 space-y-1 rounded-md bg-amber-950/40 border border-amber-500/30 p-2.5 text-xs text-amber-300">
                    <div className="flex items-center gap-1 font-semibold text-amber-400">
                      <AlertTriangle size={14} />
                      <span>Engineering Advisory:</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                      {liveValidation.warnings.map((warn, i) => (
                        <li key={i}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Builder Form Controls */}
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Feature Selector */}
                <div>
                  <label className="block mb-1 text-gray-400 font-medium">Target CAD Feature</label>
                  <select
                    value={selectedFeatureId}
                    onChange={(e) => setSelectedFeatureId(e.target.value)}
                    className="w-full rounded-lg border border-navy-700 bg-navy-950 px-3 py-2 text-white focus:border-accent focus:outline-hidden"
                  >
                    {cadFeatures.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Characteristic Selector */}
                <div>
                  <label className="block mb-1 text-gray-400 font-medium">Geometric Characteristic</label>
                  <select
                    value={selectedCharacteristic}
                    onChange={(e) => handleCharacteristicChange(e.target.value as GeometricCharacteristic)}
                    className="w-full rounded-lg border border-navy-700 bg-navy-950 px-3 py-2 text-white focus:border-accent focus:outline-hidden font-mono"
                  >
                    {Object.values(CHARACTERISTIC_METADATA).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.symbol} {m.name} ({m.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tolerance Value */}
                <div>
                  <label className="block mb-1 text-gray-400 font-medium">Tolerance Value (t, mm)</label>
                  <input
                    type="number"
                    step="0.005"
                    min="0.001"
                    max="1.0"
                    value={toleranceValue}
                    onChange={(e) => setToleranceValue(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-navy-700 bg-navy-950 px-3 py-2 font-mono text-white focus:border-accent focus:outline-hidden"
                  />
                </div>

                {/* Zone Shape */}
                <div>
                  <label className="block mb-1 text-gray-400 font-medium">Tolerance Zone Shape</label>
                  <select
                    value={zoneShape}
                    onChange={(e) => setZoneShape(e.target.value as ToleranceZoneShape)}
                    className="w-full rounded-lg border border-navy-700 bg-navy-950 px-3 py-2 text-white focus:border-accent focus:outline-hidden"
                  >
                    <option value="cylindrical">Cylindrical (⌀)</option>
                    <option value="planar">Planar (Between parallel planes)</option>
                    <option value="circular">Circular / Radial (Runout)</option>
                  </select>
                </div>

                {/* Material Modifier */}
                <div>
                  <label className="block mb-1 text-gray-400 font-medium">Material Modifier</label>
                  <select
                    value={materialModifier}
                    onChange={(e) => setMaterialModifier(e.target.value as MaterialModifier)}
                    className="w-full rounded-lg border border-navy-700 bg-navy-950 px-3 py-2 text-white focus:border-accent focus:outline-hidden"
                  >
                    <option value="RFS">Regardless of Feature Size (RFS)</option>
                    <option value="MMC">Maximum Material Condition (MMC Ⓜ)</option>
                    <option value="LMC">Least Material Condition (LMC Ⓛ)</option>
                  </select>
                </div>

                {/* Datum Mode Toggle */}
                <div>
                  <label className="block mb-1 text-gray-400 font-medium">Datum Reference Mode</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setUseCompound(true)}
                      className={`flex-1 rounded-md py-2 border text-center transition-colors ${
                        useCompound
                          ? 'border-accent bg-accent/20 text-white font-medium'
                          : 'border-navy-700 bg-navy-950 text-gray-400 hover:text-white'
                      }`}
                    >
                      Compound Axis (A-B)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseCompound(false)}
                      className={`flex-1 rounded-md py-2 border text-center transition-colors ${
                        !useCompound
                          ? 'border-accent bg-accent/20 text-white font-medium'
                          : 'border-navy-700 bg-navy-950 text-gray-400 hover:text-white'
                      }`}
                    >
                      Discrete (A, B, C)
                    </button>
                  </div>
                </div>
              </div>

              {/* Datum Inputs */}
              {useCompound ? (
                <div>
                  <label className="block mb-1 text-gray-400 font-medium">Compound Datum Axis</label>
                  <input
                    type="text"
                    value={compoundAxis}
                    onChange={(e) => setCompoundAxis(e.target.value)}
                    placeholder="e.g. A-B"
                    className="w-full rounded-lg border border-navy-700 bg-navy-950 px-3 py-2 font-mono text-white focus:border-accent focus:outline-hidden"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block mb-1 text-gray-400 font-medium">Primary</label>
                    <input
                      type="text"
                      value={primaryDatum}
                      onChange={(e) => setPrimaryDatum(e.target.value.toUpperCase())}
                      placeholder="e.g. A"
                      className="w-full rounded-lg border border-navy-700 bg-navy-950 px-3 py-2 font-mono text-white focus:border-accent focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-400 font-medium">Secondary</label>
                    <input
                      type="text"
                      value={secondaryDatum}
                      onChange={(e) => setSecondaryDatum(e.target.value.toUpperCase())}
                      placeholder="e.g. B"
                      className="w-full rounded-lg border border-navy-700 bg-navy-950 px-3 py-2 font-mono text-white focus:border-accent focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-gray-400 font-medium">Tertiary</label>
                    <input
                      type="text"
                      value={tertiaryDatum}
                      onChange={(e) => setTertiaryDatum(e.target.value.toUpperCase())}
                      placeholder="e.g. C"
                      className="w-full rounded-lg border border-navy-700 bg-navy-950 px-3 py-2 font-mono text-white focus:border-accent focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Callout Description */}
              <div>
                <label className="block mb-1 text-gray-400 font-medium">Functional Description</label>
                <input
                  type="text"
                  value={fcfDescription}
                  onChange={(e) => setFcfDescription(e.target.value)}
                  placeholder="e.g. Radial runout to eliminate centrifugal vibration at 1800 RPM"
                  className="w-full rounded-lg border border-navy-700 bg-navy-950 px-3 py-2 text-white focus:border-accent focus:outline-hidden"
                />
              </div>

              {/* Add FCF Button */}
              <button
                type="button"
                onClick={handleAddFcf}
                disabled={!liveValidation.isValid}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 font-medium text-white shadow-sm hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                <Plus size={16} />
                Add Feature Control Frame to Drawing
              </button>
            </div>
          </div>

          {/* Active Drawing Feature Control Frames Table */}
          <div className="rounded-xl border border-navy-800 bg-navy-900/60 p-5 backdrop-blur-xs">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Active Feature Control Frames ({fcfs.length})
                </h2>
                <p className="text-xs text-gray-400">
                  Drawing annotations applied to this shaft assembly
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 text-xs font-mono text-emerald-400">
                  <CheckCircle2 size={12} />
                  {validationResults.filter((r) => r.isValid).length} Valid
                </span>
                {validationResults.some((r) => !r.isValid) && (
                  <span className="flex items-center gap-1 rounded bg-red-950/60 border border-red-500/30 px-2 py-0.5 text-xs font-mono text-red-400">
                    <XCircle size={12} />
                    {validationResults.filter((r) => !r.isValid).length} Errors
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {fcfs.map((fcf) => {
                const result = validationResults.find((r) => r.fcfId === fcf.id);
                const feat = cadFeatures.find((f) => f.id === fcf.featureId);
                const calloutStr = formatFeatureControlFrameString(fcf);

                return (
                  <div
                    key={fcf.id}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-navy-800 bg-navy-950/80 p-4 transition-colors hover:border-navy-700 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Callout Visual Pill */}
                        <div className="rounded-md border border-cyan-500/40 bg-navy-900 px-2.5 py-1 font-mono font-bold text-sm text-cyan-300">
                          {calloutStr}
                        </div>
                        {result?.isValid ? (
                          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                            Valid
                          </span>
                        ) : (
                          <span className="rounded bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-400 border border-red-500/20">
                            Invalid
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-300">
                        <span className="text-gray-500">Feature: </span>
                        <span className="font-medium text-white">{feat?.name || fcf.featureId}</span>
                      </div>

                      {fcf.description && (
                        <p className="text-[11px] text-gray-400 italic">
                          {fcf.description}
                        </p>
                      )}

                      {/* Display any validation error inline */}
                      {result && !result.isValid && (
                        <div className="mt-1 text-[11px] text-red-400">
                          {result.errors.join('; ')}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteFcf(fcf.id)}
                      className="self-end sm:self-center rounded p-1.5 text-gray-400 hover:bg-red-950/50 hover:text-red-300 transition-colors"
                      title="Delete Callout"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Metrology & Physical CMM Disclaimer */}
            <div className="mt-6 rounded-lg border border-blue-900/40 bg-blue-950/20 p-4 text-xs text-blue-200">
              <div className="flex items-center gap-2 font-semibold text-blue-300 mb-1">
                <ShieldCheck size={16} />
                <span>Physical CMM Conformance Disclaimer</span>
              </div>
              <p className="text-[11px] leading-relaxed text-blue-200/80">
                Geometric definition syntax, datum reference frames, and modifier rules are verified deterministically
                against standard specifications ({standardSystem}). Physical manufactured part conformance cannot be
                evaluated without physical coordinate measuring machine (CMM) inspection data, optical surface profilometry,
                or dial test indicator metrology reports.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
