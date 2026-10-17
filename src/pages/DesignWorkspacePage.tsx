import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ZoomIn,
  ZoomOut,
  Rotate3D,
  RotateCcw,
  Grid3X3,
  Play,
  Loader2,
  Split,
  Layers,
  Sparkles,
  Tag,
  Maximize2,
  Edit3,
  ShieldAlert,
  Gauge,
  Sliders,
  Info,
  X,
  Calculator,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  FolderTree,
  Crosshair,
  Ruler,
  Compass,
  ArrowUpRight,
  Cpu,
} from 'lucide-react';
import type { ComponentSelection } from '../types';
import {
  calculateShaftTorsion,
  calculateShaftBending,
  calculatePowerTransmission,
  calculateShaftDeflection,
  calculateCombinedStress,
} from '../engineering';
import EngineeringStatusSymbol from '../components/brand/EngineeringStatusSymbol';

export default function DesignWorkspacePage() {
  const {
    designParams,
    updateDesignParam,
    selectedMaterial,
    allMaterials,
    runAnalysis,
    isAnalysisRunning,
    selectedComponent,
    setSelectedComponent,
    engineeringWarnings,
    setIsOptimizationModalOpen,
    setIsProblemModalOpen,
    setIsWarningsDrawerOpen,
    sendCopilotMessage,
  } = useApp();

  // CAD View States
  const [viewState, setViewState] = useState<'Front' | 'Side' | 'Iso'>('Front');
  const [showGrid, setShowGrid] = useState(true);
  const [showCrosshairs, setShowCrosshairs] = useState(true);
  const [showTolerances, setShowTolerances] = useState(true);
  const [zoom, setZoom] = useState(1.0);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isSectionView, setIsSectionView] = useState(false);
  const [isExplodedView, setIsExplodedView] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [isTreeCollapsed, setIsTreeCollapsed] = useState(true);
  const [mobileTab, setMobileTab] = useState<'cad' | 'params'>('cad');

  // Inline Dimension Editing modal
  const [editingDim, setEditingDim] = useState<'diameter' | 'length' | null>(null);
  const [editDimValue, setEditDimValue] = useState<number>(designParams.diameter);

  // SVG calculations based on parameters
  const lengthScale = 1.2;
  const diameterScale = 2.0;

  const shaftLength = designParams.length * lengthScale;
  const shaftDiameter = designParams.diameter * diameterScale;

  // Viewbox calculations
  const svgWidth = Math.max(920, shaftLength + 400);
  const svgHeight = Math.max(680, shaftDiameter + 380);
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  const startX = centerX - shaftLength / 2;
  const endX = centerX + shaftLength / 2;

  // Gear properties
  const gearDiameter = Math.max(shaftDiameter * 2.5, 130);
  const numTeeth = 16;
  const gearX = centerX;

  // Exploded offsets
  const explodeDist = isExplodedView ? 85 : 0;
  const leftBearingX = startX - explodeDist;
  const rightBearingX = endX + explodeDist;
  const gearExplodeY = isExplodedView ? centerY - 55 : centerY;

  // Centralized engineering calculation engine evaluations
  const torsionCalc = calculateShaftTorsion({
    torque: designParams.torque,
    diameter: designParams.diameter,
    yieldStrength: selectedMaterial.yieldStrength,
    targetSafetyFactor: designParams.safetyFactor,
  });
  const bendingCalc = calculateShaftBending({
    force: designParams.force,
    length: designParams.length,
    diameter: designParams.diameter,
  });

  const powerCalc = calculatePowerTransmission({
    torque: designParams.torque,
    rpm: designParams.rpm,
  });
  const deflectionCalc = calculateShaftDeflection({
    force: designParams.force,
    length: designParams.length,
    diameter: designParams.diameter,
    elasticModulus: selectedMaterial.elasticModulus,
  });
  const combinedStressCalc = calculateCombinedStress({
    bendingStressMPa: bendingCalc.result.bendingStressMPa,
    shearStressMPa: torsionCalc.result.shearStressMPa,
    yieldStrengthMPa: selectedMaterial.yieldStrength,
    targetSafetyFactor: designParams.safetyFactor,
  });

  const shearStress = torsionCalc.result.shearStressMPa;
  const vonMisesStress = combinedStressCalc.result.equivalentStressMPa;
  const fos = combinedStressCalc.result.factorOfSafety;

  const d_m = designParams.diameter / 1000;
  const l_m = designParams.length / 1000;
  const volume = (Math.PI / 4) * Math.pow(d_m, 2) * l_m;
  const weight = selectedMaterial.density * volume;
  const powerKW = powerCalc.result.powerKW;

  // Component metadata map for selection
  const getComponentData = (id: ComponentSelection['id']): ComponentSelection => {
    switch (id) {
      case 'bearing-left':
        return {
          id: 'bearing-left',
          name: 'Deep Groove Ball Bearing (Support A)',
          type: 'Deep Groove Ball Bearing (ISO 6209)',
          material: 'AISI 52100 Chrome Steel',
          status: 'review',
          specs: {
            Bore: `⌀${designParams.diameter} mm`,
            'Dynamic Load C': '33.2 kN',
            'L10 Life': '28,500 hrs',
            Fit: 'k5 / H7 transition',
          },
          suggestedPrompt: 'Analyze bearing dynamic load and L10 life rating',
        };
      case 'bearing-right':
        return {
          id: 'bearing-right',
          name: 'Deep Groove Ball Bearing (Support B)',
          type: 'Deep Groove Ball Bearing (ISO 6209)',
          material: 'AISI 52100 Chrome Steel',
          status: 'pass',
          specs: {
            Bore: `⌀${designParams.diameter} mm`,
            'Dynamic Load C': '33.2 kN',
            'L10 Life': '34,200 hrs',
            Arrangement: 'Axially floating housing',
          },
          suggestedPrompt: 'Verify right bearing thermal expansion clearance',
        };
      case 'gear':
        return {
          id: 'gear',
          name: 'Power Transmission Spur Pinion',
          type: 'External Involute Spur Gear',
          material: 'Case-Hardened AISI 4140 (58 HRC)',
          status: 'pass',
          specs: {
            Module: '3.0 mm',
            Teeth: '16T',
            'Pitch ⌀': '48 mm',
            'Face Width': '32 mm',
            'Pressure Angle': '20°',
          },
          suggestedPrompt: 'Calculate gear tooth bending stress per AGMA 2001',
        };
      case 'keyway':
        return {
          id: 'keyway',
          name: 'Parallel Drive Keyway Slot',
          type: 'DIN 6885-1 Form A',
          material: 'C45+C Cold Drawn Steel',
          status: 'warning',
          specs: {
            Dimensions: '14 × 9 × 45 mm',
            'Fillet Radius': '0.6 mm',
            'Stress Conc. Kt': '2.1',
          },
          suggestedPrompt: 'Evaluate keyway shear and hub contact pressure',
        };
      case 'shaft':
      default:
        return {
          id: 'shaft',
          name: 'Main Stepped Transmission Shaft',
          type: 'Solid Stepped Shaft',
          material: selectedMaterial.name,
          status: 'pass',
          specs: {
            Diameter: `⌀${designParams.diameter} mm`,
            Length: `${designParams.length} mm`,
            Torque: `${designParams.torque} Nm`,
            RPM: `${designParams.rpm}`,
            'Yield Strength': `${selectedMaterial.yieldStrength} MPa`,
          },
          suggestedPrompt: 'Check shaft torsional fatigue reserve and safety factor',
        };
    }
  };

  const handleSelectComponent = (id: ComponentSelection['id']) => {
    const comp = getComponentData(id);
    setSelectedComponent(comp);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))));
  const handleRotateLeft = () => setRotationAngle((a) => (a - 15) % 360);
  const handleRotateRight = () => setRotationAngle((a) => (a + 15) % 360);
  const handleResetCamera = () => {
    setZoom(1.0);
    setRotationAngle(0);
    setIsExplodedView(false);
    setIsSectionView(false);
    setSelectedComponent(null);
  };

  const saveDimensionEdit = () => {
    if (editingDim === 'diameter') {
      updateDesignParam('diameter', Math.max(5, editDimValue));
    } else if (editingDim === 'length') {
      updateDesignParam('length', Math.max(20, editDimValue));
    }
    setEditingDim(null);
  };

  const generateGearPath = (cx: number, cy: number, r: number, teeth: number) => {
    let path = '';
    const innerR = r * 0.8;
    for (let i = 0; i < teeth; i++) {
      const angle1 = (i * 2 * Math.PI) / teeth;
      const angle2 = ((i + 0.4) * 2 * Math.PI) / teeth;
      const angle3 = ((i + 0.6) * 2 * Math.PI) / teeth;
      const angle4 = ((i + 1) * 2 * Math.PI) / teeth;

      const x1 = cx + innerR * Math.cos(angle1);
      const y1 = cy + innerR * Math.sin(angle1);
      const x2 = cx + r * Math.cos(angle2);
      const y2 = cy + r * Math.sin(angle2);
      const x3 = cx + r * Math.cos(angle3);
      const y3 = cy + r * Math.sin(angle3);
      const x4 = cx + innerR * Math.cos(angle4);
      const y4 = cy + innerR * Math.sin(angle4);

      if (i === 0) path += `M ${x1} ${y1} `;
      else path += `L ${x1} ${y1} `;
      path += `L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} `;
    }
    path += 'Z';
    return path;
  };

  const componentsList: { id: ComponentSelection['id']; name: string; tag: string; type: string }[] = [
    { id: 'shaft', name: 'Main Shaft', tag: `⌀${designParams.diameter} × ${designParams.length}mm`, type: 'Primary Rotor' },
    { id: 'gear', name: 'Spur Pinion', tag: 'm=3.0, 16T', type: 'Transmission' },
    { id: 'bearing-left', name: 'Support Bearing A', tag: 'ISO 6209 Deep Groove', type: 'Constraint' },
    { id: 'bearing-right', name: 'Support Bearing B', tag: 'Floating End', type: 'Constraint' },
    { id: 'keyway', name: 'Drive Keyway', tag: 'DIN 6885-1', type: 'Coupling' },
  ];

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-navy-950 font-sans relative">
      {/* Dimension Quick Edit Popover */}
      {editingDim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="bg-navy-900 border border-navy-700 p-5 rounded-xl shadow-2xl w-80 space-y-4 animate-fade-in">
            <h4 className="text-sm font-bold text-gray-100 flex items-center gap-2">
              <Edit3 size={16} className="text-accent" />
              Edit {editingDim === 'diameter' ? 'Shaft Diameter' : 'Shaft Length'}
            </h4>
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Enter value in millimeters (mm):
              </label>
              <input
                type="number"
                value={editDimValue}
                onChange={(e) => setEditDimValue(Number(e.target.value))}
                autoFocus
                className="input-field text-base font-mono py-2"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveDimensionEdit();
                  if (e.key === 'Escape') setEditingDim(null);
                }}
              />
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button onClick={() => setEditingDim(null)} className="btn-ghost py-1.5 px-3">
                Cancel
              </button>
              <button onClick={saveDimensionEdit} className="btn-primary py-1.5 px-4">
                Save & Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Segmented View Selector */}
      <div className="md:hidden flex border-b border-navy-800 bg-navy-900 px-3 py-1.5 gap-2 shrink-0 z-20">
        <button
          onClick={() => setMobileTab('cad')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold text-center transition-colors ${
            mobileTab === 'cad' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white bg-navy-950'
          }`}
        >
          CAD Visualization
        </button>
        <button
          onClick={() => setMobileTab('params')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold text-center transition-colors ${
            mobileTab === 'params' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white bg-navy-950'
          }`}
        >
          Parameters (⌀{designParams.diameter}mm)
        </button>
      </div>

      <div className="flex flex-1 h-full overflow-hidden relative">
        {/* Left Collapsible Component Tree */}
        <aside
          className={`hidden sm:flex border-r border-navy-800 bg-navy-900/60 backdrop-blur-sm transition-all duration-200 flex-col shrink-0 z-10 ${
            isTreeCollapsed ? 'w-11' : 'w-64'
          }`}
        >
        <div className="h-12 border-b border-navy-800 px-3 flex items-center justify-between">
          {!isTreeCollapsed && (
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
              <FolderTree size={14} className="text-accent" />
              <span>Assembly Tree</span>
            </div>
          )}
          <button
            onClick={() => setIsTreeCollapsed(!isTreeCollapsed)}
            className="p-1 rounded hover:bg-navy-800 text-gray-400 hover:text-white transition-colors ml-auto"
            title={isTreeCollapsed ? 'Expand Assembly Tree' : 'Collapse Assembly Tree'}
          >
            <ChevronRight
              size={14}
              className={`transform transition-transform ${isTreeCollapsed ? '' : 'rotate-180'}`}
            />
          </button>
        </div>

        {!isTreeCollapsed ? (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="text-[10px] uppercase font-mono text-gray-400 px-2 py-1 font-semibold">
              Components ({componentsList.length})
            </div>
            {componentsList.map((comp) => {
              const isSelected = selectedComponent?.id === comp.id;
              return (
                <button
                  key={comp.id}
                  onClick={() => handleSelectComponent(comp.id)}
                  className={`w-full text-left p-2 rounded-lg border transition-all flex flex-col gap-0.5 ${
                    isSelected
                      ? 'bg-accent/15 border-accent/40 text-accent-light shadow-sm'
                      : 'border-transparent hover:bg-navy-800/80 text-gray-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="truncate">{comp.name}</span>
                    <span className="text-[10px] font-mono text-gray-400">{comp.type}</span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 truncate">{comp.tag}</span>
                </button>
              );
            })}

            {selectedComponent && (
              <div className="mt-3 p-2.5 rounded-lg bg-navy-950 border border-navy-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-gray-200">
                  <span>Inspection Specs</span>
                  <button
                    onClick={() => setSelectedComponent(null)}
                    className="text-gray-500 hover:text-gray-300"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="space-y-1 font-mono text-[10px]">
                  {Object.entries(selectedComponent.specs).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-gray-400">
                      <span>{k}:</span>
                      <span className="text-gray-200 font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
                {selectedComponent.suggestedPrompt && (
                  <button
                    onClick={() => sendCopilotMessage(selectedComponent.suggestedPrompt!)}
                    className="w-full mt-1 px-2 py-1 rounded bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent-light text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                  >
                    <Sparkles size={11} />
                    <span>Ask Copilot about {selectedComponent.name.split(' ')[0]}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center py-3 space-y-2">
            <button
              onClick={() => setIsTreeCollapsed(false)}
              className="p-1.5 rounded-lg hover:bg-navy-800 text-gray-400 hover:text-accent"
              title="Show Components"
            >
              <FolderTree size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* Main CAD Viewport Area */}
      <div className={`flex-1 flex flex-col relative overflow-hidden ${mobileTab === 'cad' ? 'flex' : 'hidden md:flex'}`}>
        {/* Top Control Overlay inside workspace */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
          {/* Material & Part Info Chip */}
          <div className="glass-dock px-3.5 py-2 rounded-xl border border-navy-700/80 shadow-lg pointer-events-auto flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-accent" />
              <div>
                <span className="text-gray-400 block text-[9px] uppercase font-mono">Alloy Spec</span>
                <span className="text-accent font-semibold">{selectedMaterial.name}</span>
              </div>
            </div>
            <div className="w-px h-6 bg-navy-800"></div>
            <div>
              <span className="text-gray-400 block text-[9px] uppercase font-mono">Yield Limit</span>
              <span className="text-gray-200 font-mono font-semibold">{selectedMaterial.yieldStrength} MPa</span>
            </div>
            <div className="w-px h-6 bg-navy-800"></div>
            <div>
              <span className="text-gray-400 block text-[9px] uppercase font-mono">Active Target</span>
              <span className="text-cyan-400 font-medium truncate max-w-[130px] block">
                {selectedComponent ? selectedComponent.name : 'Shaft Assembly'}
              </span>
            </div>
          </div>

          {/* Quick AI & Optimization Shortcuts */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {engineeringWarnings.length > 0 && (
              <button
                onClick={() => setIsWarningsDrawerOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <ShieldAlert size={13} />
                <span>{engineeringWarnings.length} Warnings</span>
              </button>
            )}

            <button
              onClick={() => setIsOptimizationModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Gauge size={13} />
              <span>Optimize</span>
            </button>

            <button
              onClick={() => setIsProblemModalOpen(true)}
              className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-lg shadow-sm shadow-accent/20"
            >
              <Sparkles size={13} />
              <span>Ask Copilot</span>
            </button>
          </div>
        </div>

        {/* SVG Drawing Canvas */}
        <div className="flex-1 w-full h-full relative flex items-center justify-center bg-navy-950 overflow-hidden select-none">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className={`w-full h-full cursor-grab active:cursor-grabbing ${
              showGrid
                ? 'bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]'
                : ''
            }`}
            style={{ minHeight: '460px' }}
            onWheel={(e) => {
              e.preventDefault();
              if (e.deltaY < 0) handleZoomIn();
              else handleZoomOut();
            }}
          >
            <defs>
              <marker
                id="cad-arrow-start"
                markerWidth="8"
                markerHeight="8"
                refX="0"
                refY="2.5"
                orient="auto"
              >
                <polygon points="7 0, 0 2.5, 7 5" fill="#38bdf8" />
              </marker>
              <marker id="cad-arrow-end" markerWidth="8" markerHeight="8" refX="7" refY="2.5" orient="auto">
                <polygon points="0 0, 7 2.5, 0 5" fill="#38bdf8" />
              </marker>

              <linearGradient id="shaft-metallic-v2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="35%" stopColor="#475569" />
                <stop offset="65%" stopColor="#334155" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>

              {/* Technical 45° Hatching for Section View */}
              <pattern id="section-hatch-cad" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.5" />
              </pattern>
            </defs>

            {/* Precision Grid Crosshairs & Axis Rules */}
            {showCrosshairs && (
              <g className="cad-crosshairs opacity-30">
                <line x1="0" y1={centerY} x2={svgWidth} y2={centerY} stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="6,6" />
                <line x1={centerX} y1="0" x2={centerX} y2={svgHeight} stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="6,6" />
                {/* Millimeter Ticks */}
                {Array.from({ length: 11 }).map((_, i) => {
                  const x = centerX - 250 + i * 50;
                  return (
                    <line key={`xtick-${i}`} x1={x} y1={centerY - 4} x2={x} y2={centerY + 4} stroke="#94a3b8" strokeWidth="1" />
                  );
                })}
              </g>
            )}

            {/* CAD 3D Coordinate Triad */}
            <g className="coordinate-triad" transform={`translate(55, ${svgHeight - 75})`}>
              <line x1="0" y1="0" x2="35" y2="0" stroke="#ef4444" strokeWidth="2" />
              <text x="40" y="4" fill="#ef4444" fontSize="11" fontWeight="bold" fontFamily="monospace">
                X
              </text>
              <line x1="0" y1="0" x2="0" y2="-35" stroke="#22c55e" strokeWidth="2" />
              <text x="-4" y="-40" fill="#22c55e" fontSize="11" fontWeight="bold" fontFamily="monospace">
                Y
              </text>
              <line x1="0" y1="0" x2="-22" y2="20" stroke="#3b82f6" strokeWidth="2" />
              <text x="-32" y="26" fill="#3b82f6" fontSize="11" fontWeight="bold" fontFamily="monospace">
                Z
              </text>
              <circle cx="0" cy="0" r="2.5" fill="#9ca3af" />
            </g>

            {/* Transform Group (Zoom, Rotation) */}
            <g
              transform={`translate(${centerX}, ${centerY}) scale(${zoom}) rotate(${rotationAngle}) translate(${-centerX}, ${-centerY})`}
              style={{
                transition: 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
                transformOrigin: `${centerX}px ${centerY}px`,
              }}
            >
              {/* Assembly Centerline */}
              <line
                x1={startX - 120 - explodeDist}
                y1={centerY}
                x2={endX + 120 + explodeDist}
                y2={centerY}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="14,4,3,4"
              />

              {/* Exploded assembly guide dashed lines */}
              {isExplodedView && (
                <g className="exploded-guides stroke-accent/40" strokeDasharray="3,3" strokeWidth="1">
                  <line x1={startX} y1={centerY} x2={leftBearingX} y2={centerY} />
                  <line x1={endX} y1={centerY} x2={rightBearingX} y2={centerY} />
                  <line x1={gearX} y1={centerY} x2={gearX} y2={gearExplodeY} />
                </g>
              )}

              {/* View 1: Iso 3D View */}
              {viewState === 'Iso' ? (
                <g className="animate-fade-in">
                  {/* Left Bearing Iso */}
                  <g
                    onClick={() => handleSelectComponent('bearing-left')}
                    onMouseEnter={() => setHoveredPart('Bearing A')}
                    onMouseLeave={() => setHoveredPart(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={leftBearingX - 16}
                      y={centerY - shaftDiameter / 2 - 14}
                      width="32"
                      height={shaftDiameter + 28}
                      fill={selectedComponent?.id === 'bearing-left' ? '#1e3a8a' : '#0f172a'}
                      stroke={selectedComponent?.id === 'bearing-left' ? '#38bdf8' : '#60a5fa'}
                      strokeWidth={selectedComponent?.id === 'bearing-left' ? 2.5 : 1.5}
                      rx="3"
                    />
                    <ellipse
                      cx={leftBearingX}
                      cy={centerY}
                      rx="12"
                      ry={shaftDiameter / 2 + 10}
                      fill="none"
                      stroke="#93c5fd"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />
                  </g>

                  {/* Main Shaft 3D Cylinder representation */}
                  <g
                    onClick={() => handleSelectComponent('shaft')}
                    onMouseEnter={() => setHoveredPart('Shaft Body')}
                    onMouseLeave={() => setHoveredPart(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={startX}
                      y={centerY - shaftDiameter / 2}
                      width={shaftLength}
                      height={shaftDiameter}
                      fill={isSectionView ? 'url(#section-hatch-cad)' : 'url(#shaft-metallic-v2)'}
                      stroke={selectedComponent?.id === 'shaft' ? '#38bdf8' : '#64748b'}
                      strokeWidth={selectedComponent?.id === 'shaft' ? 2.5 : 1.5}
                      rx="2"
                    />
                    <ellipse
                      cx={startX}
                      cy={centerY}
                      rx="12"
                      ry={shaftDiameter / 2}
                      fill="#1e293b"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                    />
                    <ellipse
                      cx={endX}
                      cy={centerY}
                      rx="12"
                      ry={shaftDiameter / 2}
                      fill="#334155"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                    />
                  </g>

                  {/* Spur Gear Pinion (Mounted) */}
                  <g
                    onClick={() => handleSelectComponent('gear')}
                    onMouseEnter={() => setHoveredPart('Spur Pinion')}
                    onMouseLeave={() => setHoveredPart(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={gearX - 22}
                      y={gearExplodeY - gearDiameter / 2}
                      width="44"
                      height={gearDiameter}
                      fill={selectedComponent?.id === 'gear' ? '#083344' : '#0b1329'}
                      stroke={selectedComponent?.id === 'gear' ? '#38bdf8' : '#06b6d4'}
                      strokeWidth={selectedComponent?.id === 'gear' ? 2.5 : 2}
                      rx="3"
                    />
                    {Array.from({ length: 8 }).map((_, i) => (
                      <line
                        key={i}
                        x1={gearX - 22}
                        y1={gearExplodeY - gearDiameter / 2 + (i * gearDiameter) / 7}
                        x2={gearX + 22}
                        y2={gearExplodeY - gearDiameter / 2 + (i * gearDiameter) / 7}
                        stroke="#06b6d4"
                        strokeWidth="1"
                        strokeOpacity="0.4"
                      />
                    ))}
                  </g>

                  {/* Right Bearing Iso */}
                  <g
                    onClick={() => handleSelectComponent('bearing-right')}
                    onMouseEnter={() => setHoveredPart('Bearing B')}
                    onMouseLeave={() => setHoveredPart(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={rightBearingX - 16}
                      y={centerY - shaftDiameter / 2 - 14}
                      width="32"
                      height={shaftDiameter + 28}
                      fill={selectedComponent?.id === 'bearing-right' ? '#1e3a8a' : '#0f172a'}
                      stroke={selectedComponent?.id === 'bearing-right' ? '#38bdf8' : '#60a5fa'}
                      strokeWidth={selectedComponent?.id === 'bearing-right' ? 2.5 : 1.5}
                      rx="3"
                    />
                    <ellipse
                      cx={rightBearingX}
                      cy={centerY}
                      rx="12"
                      ry={shaftDiameter / 2 + 10}
                      fill="none"
                      stroke="#93c5fd"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />
                  </g>
                </g>
              ) : viewState === 'Front' ? (
                /* View 2: Front Orthographic Technical CAD View */
                <g className="animate-fade-in">
                  {/* Left Bearing (Support A) */}
                  <g
                    onClick={() => handleSelectComponent('bearing-left')}
                    onMouseEnter={() => setHoveredPart('Bearing A')}
                    onMouseLeave={() => setHoveredPart(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={leftBearingX - 16}
                      y={centerY - shaftDiameter / 2 - 14}
                      width="32"
                      height={shaftDiameter + 28}
                      fill={selectedComponent?.id === 'bearing-left' ? '#1e3a8a' : '#0f172a'}
                      stroke={selectedComponent?.id === 'bearing-left' ? '#38bdf8' : '#60a5fa'}
                      strokeWidth={selectedComponent?.id === 'bearing-left' ? 2.5 : 1.5}
                      rx="2"
                    />
                    <circle cx={leftBearingX} cy={centerY - shaftDiameter / 2 - 6} r="4" fill="#93c5fd" />
                    <circle cx={leftBearingX} cy={centerY + shaftDiameter / 2 + 6} r="4" fill="#93c5fd" />
                  </g>

                  {/* Shaft Body */}
                  <g
                    onClick={() => handleSelectComponent('shaft')}
                    onMouseEnter={() => setHoveredPart('Shaft Body')}
                    onMouseLeave={() => setHoveredPart(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={startX}
                      y={centerY - shaftDiameter / 2}
                      width={shaftLength}
                      height={shaftDiameter}
                      fill={isSectionView ? 'url(#section-hatch-cad)' : 'url(#shaft-metallic-v2)'}
                      stroke={selectedComponent?.id === 'shaft' ? '#38bdf8' : '#94a3b8'}
                      strokeWidth={selectedComponent?.id === 'shaft' ? 2.5 : 1.5}
                    />

                    {/* Keyway Slot */}
                    <rect
                      x={gearX - 25}
                      y={centerY - shaftDiameter / 2}
                      width="50"
                      height="8"
                      fill="#f59e0b"
                      fillOpacity={selectedComponent?.id === 'keyway' ? '0.6' : '0.3'}
                      stroke="#f59e0b"
                      strokeWidth="1.2"
                      strokeDasharray="4,2"
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectComponent('keyway');
                      }}
                    />
                  </g>

                  {/* Gear Profile (Front projection) */}
                  <g
                    onClick={() => handleSelectComponent('gear')}
                    onMouseEnter={() => setHoveredPart('Spur Pinion')}
                    onMouseLeave={() => setHoveredPart(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={gearX - 22}
                      y={gearExplodeY - gearDiameter / 2}
                      width="44"
                      height={gearDiameter}
                      fill={selectedComponent?.id === 'gear' ? '#083344' : '#0b1329'}
                      stroke={selectedComponent?.id === 'gear' ? '#38bdf8' : '#06b6d4'}
                      strokeWidth={selectedComponent?.id === 'gear' ? 2.5 : 2}
                      rx="3"
                    />
                  </g>

                  {/* Right Bearing (Support B) */}
                  <g
                    onClick={() => handleSelectComponent('bearing-right')}
                    onMouseEnter={() => setHoveredPart('Bearing B')}
                    onMouseLeave={() => setHoveredPart(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={rightBearingX - 16}
                      y={centerY - shaftDiameter / 2 - 14}
                      width="32"
                      height={shaftDiameter + 28}
                      fill={selectedComponent?.id === 'bearing-right' ? '#1e3a8a' : '#0f172a'}
                      stroke={selectedComponent?.id === 'bearing-right' ? '#38bdf8' : '#60a5fa'}
                      strokeWidth={selectedComponent?.id === 'bearing-right' ? 2.5 : 1.5}
                      rx="2"
                    />
                    <circle cx={rightBearingX} cy={centerY - shaftDiameter / 2 - 6} r="4" fill="#93c5fd" />
                    <circle cx={rightBearingX} cy={centerY + shaftDiameter / 2 + 6} r="4" fill="#93c5fd" />
                  </g>

                  {/* Length Dimension Line (Clickable to Edit) */}
                  <g
                    className="dimension-length cursor-pointer group"
                    onClick={() => {
                      setEditingDim('length');
                      setEditDimValue(designParams.length);
                    }}
                  >
                    <line
                      x1={startX}
                      y1={centerY + shaftDiameter / 2 + 18}
                      x2={startX}
                      y2={centerY + shaftDiameter / 2 + 75}
                      stroke="#475569"
                      strokeWidth="1"
                      strokeDasharray="4,2"
                    />
                    <line
                      x1={endX}
                      y1={centerY + shaftDiameter / 2 + 18}
                      x2={endX}
                      y2={centerY + shaftDiameter / 2 + 75}
                      stroke="#475569"
                      strokeWidth="1"
                      strokeDasharray="4,2"
                    />
                    <line
                      x1={startX}
                      y1={centerY + shaftDiameter / 2 + 60}
                      x2={endX}
                      y2={centerY + shaftDiameter / 2 + 60}
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      markerStart="url(#cad-arrow-start)"
                      markerEnd="url(#cad-arrow-end)"
                    />
                    <rect
                      x={centerX - 60}
                      y={centerY + shaftDiameter / 2 + 48}
                      width="120"
                      height="24"
                      rx="4"
                      fill="#060911"
                      stroke="#38bdf8"
                      strokeWidth="1"
                      className="group-hover:stroke-cyan-400 transition-colors"
                    />
                    <text
                      x={centerX}
                      y={centerY + shaftDiameter / 2 + 64}
                      fill="#f8fafc"
                      fontSize="12"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="select-none font-bold"
                    >
                      {designParams.length} mm {showTolerances && <tspan fill="#94a3b8" fontSize="10">±0.2</tspan>} ✎
                    </text>
                  </g>

                  {/* Diameter Dimension Line (Clickable to Edit) */}
                  <g
                    className="dimension-diameter cursor-pointer group"
                    onClick={() => {
                      setEditingDim('diameter');
                      setEditDimValue(designParams.diameter);
                    }}
                  >
                    <line
                      x1={startX - 18}
                      y1={centerY - shaftDiameter / 2}
                      x2={startX - 95}
                      y2={centerY - shaftDiameter / 2}
                      stroke="#475569"
                      strokeWidth="1"
                      strokeDasharray="4,2"
                    />
                    <line
                      x1={startX - 18}
                      y1={centerY + shaftDiameter / 2}
                      x2={startX - 95}
                      y2={centerY + shaftDiameter / 2}
                      stroke="#475569"
                      strokeWidth="1"
                      strokeDasharray="4,2"
                    />
                    <line
                      x1={startX - 80}
                      y1={centerY - shaftDiameter / 2}
                      x2={startX - 80}
                      y2={centerY + shaftDiameter / 2}
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      markerStart="url(#cad-arrow-start)"
                      markerEnd="url(#cad-arrow-end)"
                    />
                    <rect
                      x={startX - 125}
                      y={centerY - 12}
                      width="90"
                      height="24"
                      rx="4"
                      fill="#060911"
                      stroke="#38bdf8"
                      strokeWidth="1"
                      className="group-hover:stroke-cyan-400 transition-colors"
                    />
                    <text
                      x={startX - 80}
                      y={centerY + 4}
                      fill="#f8fafc"
                      fontSize="12"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="select-none font-bold"
                    >
                      ⌀{designParams.diameter} {showTolerances && <tspan fill="#94a3b8" fontSize="10">h7</tspan>} ✎
                    </text>
                  </g>

                  {/* Component Callout Labels */}
                  {showLabels && (
                    <g className="component-labels text-xs font-mono">
                      <line
                        x1={leftBearingX}
                        y1={centerY - shaftDiameter / 2 - 20}
                        x2={leftBearingX - 35}
                        y2={centerY - shaftDiameter / 2 - 60}
                        stroke="#60a5fa"
                        strokeWidth="1.2"
                      />
                      <text
                        x={leftBearingX - 40}
                        y={centerY - shaftDiameter / 2 - 65}
                        fill="#93c5fd"
                        fontSize="11"
                        textAnchor="end"
                      >
                        Bearing 6209 (A)
                      </text>

                      <line
                        x1={gearX}
                        y1={gearExplodeY - gearDiameter / 2}
                        x2={gearX + 50}
                        y2={gearExplodeY - gearDiameter / 2 - 40}
                        stroke="#06b6d4"
                        strokeWidth="1.2"
                      />
                      <text
                        x={gearX + 55}
                        y={gearExplodeY - gearDiameter / 2 - 45}
                        fill="#22d3ee"
                        fontSize="11"
                      >
                        Spur Pinion (m=3, 16T)
                      </text>

                      <line
                        x1={rightBearingX}
                        y1={centerY - shaftDiameter / 2 - 20}
                        x2={rightBearingX + 35}
                        y2={centerY - shaftDiameter / 2 - 60}
                        stroke="#60a5fa"
                        strokeWidth="1.2"
                      />
                      <text
                        x={rightBearingX + 40}
                        y={centerY - shaftDiameter / 2 - 65}
                        fill="#93c5fd"
                        fontSize="11"
                      >
                        Bearing 6209 (B)
                      </text>
                    </g>
                  )}
                </g>
              ) : (
                /* View 3: Side Cross-Section View */
                <g className="animate-fade-in">
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={shaftDiameter / 2}
                    fill="#1e293b"
                    stroke="#475569"
                    strokeWidth="2"
                  />
                  <path
                    d={generateGearPath(centerX, centerY, gearDiameter / 2, numTeeth)}
                    fill={selectedComponent?.id === 'gear' ? '#083344' : '#0b1329'}
                    stroke={selectedComponent?.id === 'gear' ? '#38bdf8' : '#06b6d4'}
                    strokeWidth="2"
                  />
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={(gearDiameter / 2) * 0.4}
                    fill="none"
                    stroke="#334155"
                    strokeWidth="1"
                    strokeDasharray="6,4"
                  />
                  <circle
                    cx={centerX}
                    cy={centerY}
                    r={shaftDiameter / 2}
                    fill="#334155"
                    stroke="#475569"
                    strokeWidth="2"
                  />
                  {/* Keyway slot end view */}
                  <rect
                    x={centerX - 7}
                    y={centerY - shaftDiameter / 2}
                    width="14"
                    height="8"
                    fill="#f59e0b"
                    stroke="#fbbf24"
                    strokeWidth="1"
                  />
                  <circle cx={centerX} cy={centerY} r="2.5" fill="#38bdf8" />
                </g>
              )}
            </g>
          </svg>
        </div>

        {/* Hover Part Pill */}
        {hoveredPart && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 px-3 py-1 bg-navy-900/90 border border-navy-700 rounded-lg text-xs font-mono text-gray-200 pointer-events-none shadow-lg animate-fade-in z-20">
            Selected: <strong className="text-cyan-400">{hoveredPart}</strong> — Click to focus in inspector
          </div>
        )}

        {/* Floating CAD Dock */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 glass-dock flex items-center space-x-1 px-3 py-1.5 rounded-full border border-navy-800 shadow-2xl z-20">
          <button
            onClick={handleZoomOut}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-navy-800 rounded-full transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut size={15} />
          </button>
          <button
            onClick={handleResetCamera}
            className="text-xs font-mono text-gray-300 hover:text-white px-2 py-0.5 rounded hover:bg-navy-800/80 transition-colors select-none min-w-[2.8rem] text-center"
            title="Reset Camera Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-navy-800 rounded-full transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn size={15} />
          </button>

          <div className="w-px h-4 bg-navy-800 mx-1"></div>

          {/* View presets */}
          {(['Front', 'Side', 'Iso'] as const).map((view) => (
            <button
              key={view}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                viewState === view
                  ? 'bg-accent text-white font-semibold'
                  : 'text-gray-400 hover:text-white hover:bg-navy-800'
              }`}
              onClick={() => {
                setViewState(view);
                setRotationAngle(0);
              }}
            >
              {view === 'Iso' ? '3D Iso' : view}
            </button>
          ))}

          <div className="w-px h-4 bg-navy-800 mx-1"></div>

          {/* Section and Exploded Views */}
          <button
            onClick={() => setIsSectionView(!isSectionView)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1 transition-colors ${
              isSectionView
                ? 'bg-cyan-500 text-navy-950 font-bold'
                : 'text-gray-400 hover:text-white hover:bg-navy-800'
            }`}
            title="Toggle Technical Section Cut (S)"
          >
            <Split size={13} />
            <span>Cut</span>
          </button>

          <button
            onClick={() => setIsExplodedView(!isExplodedView)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full flex items-center gap-1 transition-colors ${
              isExplodedView
                ? 'bg-cyan-500 text-navy-950 font-bold'
                : 'text-gray-400 hover:text-white hover:bg-navy-800'
            }`}
            title="Toggle Exploded Assembly View (E)"
          >
            <Layers size={13} />
            <span>Explode</span>
          </button>

          <div className="w-px h-4 bg-navy-800 mx-1"></div>

          {/* Crosshairs, Labels & Grid */}
          <button
            onClick={() => setShowCrosshairs(!showCrosshairs)}
            className={`p-1.5 rounded-full transition-colors ${
              showCrosshairs ? 'text-accent bg-navy-800' : 'text-gray-400 hover:text-white hover:bg-navy-800'
            }`}
            title="Toggle Axis Crosshairs"
          >
            <Crosshair size={15} />
          </button>
          <button
            onClick={() => setShowTolerances(!showTolerances)}
            className={`p-1.5 rounded-full transition-colors ${
              showTolerances ? 'text-accent bg-navy-800' : 'text-gray-400 hover:text-white hover:bg-navy-800'
            }`}
            title="Toggle Tolerance Annotations"
          >
            <Ruler size={15} />
          </button>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-full transition-colors ${
              showGrid ? 'text-accent bg-navy-800' : 'text-gray-400 hover:text-white hover:bg-navy-800'
            }`}
            title="Toggle Canvas Grid"
          >
            <Grid3X3 size={15} />
          </button>
          <button
            onClick={handleResetCamera}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-navy-800 rounded-full transition-colors"
            title="Reset All Viewport Controls"
          >
            <Maximize2 size={15} />
          </button>
        </div>

        {/* Bottom Engineering Telemetry Strip */}
        <div className="h-14 border-t border-navy-800 bg-navy-900/90 px-4 flex items-center justify-between text-xs font-mono shrink-0 z-20">
          <div className="flex items-center gap-6 overflow-x-auto py-1">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-[11px]">Von Mises:</span>
              <span className={`font-bold ${vonMisesStress < selectedMaterial.yieldStrength ? 'text-emerald-400' : 'text-red-400'}`}>
                {vonMisesStress.toFixed(1)} MPa
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-[11px]">Safety Factor:</span>
              <span className={`font-bold ${fos >= designParams.safetyFactor ? 'text-emerald-400' : 'text-amber-400'}`}>
                {fos.toFixed(2)}x
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-[11px]">Max Deflection:</span>
              <span className="text-gray-200 font-bold">
                {deflectionCalc.result.maxDeflectionMm.toFixed(3)} mm
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-[11px]">Power Transmitted:</span>
              <span className="text-cyan-400 font-bold">{powerKW.toFixed(1)} kW</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 text-[11px]">Assembly Mass:</span>
              <span className="text-gray-200 font-bold">{weight.toFixed(2)} kg</span>
            </div>
          </div>

          <button
            onClick={() => setIsCalcModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-850 hover:bg-navy-800 border border-navy-700 text-xs font-sans text-accent hover:text-accent-light transition-colors shrink-0 ml-2"
            title="Inspect transparent calculation derivations"
          >
            <Calculator size={13} />
            <span>Math Derivation</span>
          </button>
        </div>
      </div>

      {/* Right Panel: Design Parameters */}
      <aside className={`w-full md:w-80 bg-navy-900 border-l border-navy-800 flex-col h-full overflow-hidden shrink-0 z-20 shadow-2xl ${mobileTab === 'params' ? 'flex' : 'hidden md:flex'}`}>
        <div className="p-4 border-b border-navy-800 bg-navy-950 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider font-mono">Parameters</h2>
            <p className="text-xs text-gray-400">Loading envelope & geometry</p>
          </div>
          <button
            onClick={() => setIsProblemModalOpen(true)}
            className="p-1.5 text-accent hover:text-accent-light hover:bg-navy-850 rounded-lg transition-colors text-xs flex items-center gap-1"
            title="Describe problem to Copilot"
          >
            <Sparkles size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Material Selection */}
          <div className="space-y-1.5">
            <label className="label-text flex items-center justify-between">
              <span>Material Alloy</span>
              <span className="text-[10px] text-gray-400 font-mono">σ_y = {selectedMaterial.yieldStrength} MPa</span>
            </label>
            <select
              className="input-field w-full text-xs font-medium"
              value={designParams.materialId}
              onChange={(e) => updateDesignParam('materialId', e.target.value)}
            >
              {allMaterials.map((mat) => (
                <option key={mat.id} value={mat.id}>
                  {mat.name} ({mat.yieldStrength} MPa)
                </option>
              ))}
            </select>
          </div>

          {/* Geometry Group */}
          <div className="p-3 rounded-xl bg-navy-950/60 border border-navy-800/80 space-y-3">
            <div className="text-[10px] uppercase font-mono text-gray-400 font-semibold tracking-wider">
              Shaft Dimensions
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="label-text">Diameter (mm)</label>
                <input
                  type="number"
                  className="input-field w-full font-mono text-xs"
                  value={designParams.diameter}
                  onChange={(e) => updateDesignParam('diameter', Number(e.target.value))}
                  min={5}
                />
              </div>
              <div className="space-y-1">
                <label className="label-text">Length (mm)</label>
                <input
                  type="number"
                  className="input-field w-full font-mono text-xs"
                  value={designParams.length}
                  onChange={(e) => updateDesignParam('length', Number(e.target.value))}
                  min={20}
                />
              </div>
            </div>
          </div>

          {/* Loading Group */}
          <div className="p-3 rounded-xl bg-navy-950/60 border border-navy-800/80 space-y-3">
            <div className="text-[10px] uppercase font-mono text-gray-400 font-semibold tracking-wider">
              Operating Loads
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="label-text">Torque (Nm)</label>
                <input
                  type="number"
                  className="input-field w-full font-mono text-xs"
                  value={designParams.torque}
                  onChange={(e) => updateDesignParam('torque', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="label-text">Radial Load (N)</label>
                <input
                  type="number"
                  className="input-field w-full font-mono text-xs"
                  value={designParams.force}
                  onChange={(e) => updateDesignParam('force', Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="label-text">Speed (RPM)</label>
                <input
                  type="number"
                  className="input-field w-full font-mono text-xs"
                  value={designParams.rpm}
                  onChange={(e) => updateDesignParam('rpm', Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="label-text">Temp (°C)</label>
                <input
                  type="number"
                  className="input-field w-full font-mono text-xs"
                  value={designParams.temperature}
                  onChange={(e) => updateDesignParam('temperature', Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Safety Factor Slider */}
          <div className="p-3 rounded-xl bg-navy-950/60 border border-navy-800/80 space-y-2">
            <div className="flex justify-between items-center">
              <label className="label-text">Target Safety Factor</label>
              <span className="text-xs font-mono font-bold text-accent">
                {designParams.safetyFactor.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={1.1}
              max={4.0}
              step={0.1}
              value={designParams.safetyFactor}
              onChange={(e) => updateDesignParam('safetyFactor', Number(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400 font-mono">
              <span>1.1 (Min)</span>
              <span>2.0 (Std)</span>
              <span>4.0 (Critical)</span>
            </div>
          </div>

          {/* Quick AI Action Chips */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] uppercase font-mono text-gray-400">Suggested AI Checks</span>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => sendCopilotMessage('Suggest optimal diameter for 2.0 safety factor and minimum weight')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg bg-navy-850 hover:bg-navy-800 border border-navy-700/80 text-[11px] text-gray-300 hover:text-white flex items-center justify-between transition-colors group"
              >
                <span>Optimize shaft diameter for FoS 2.0</span>
                <ArrowUpRight size={12} className="text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <button
                onClick={() => sendCopilotMessage('Recommend a higher strength material to reduce mass')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg bg-navy-850 hover:bg-navy-800 border border-navy-700/80 text-[11px] text-gray-300 hover:text-white flex items-center justify-between transition-colors group"
              >
                <span>Recommend lighter alloy</span>
                <ArrowUpRight size={12} className="text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>

          {/* Run Analysis CTA */}
          <div className="pt-2">
            <button
              className="btn-primary w-full flex items-center justify-center py-2.5 text-xs font-bold shadow-lg shadow-accent/20"
              onClick={runAnalysis}
              disabled={isAnalysisRunning}
            >
              {isAnalysisRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Finite Math Simulation...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" fill="currentColor" />
                  Run Full Simulation
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </div>

      {/* Transparent Calculation Inspection Modal */}
      {isCalcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-navy-900 border border-navy-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-navy-700 flex items-center justify-between bg-navy-950">
              <div className="flex items-center gap-2">
                <Calculator className="text-accent w-5 h-5" />
                <h3 className="text-base font-semibold text-gray-100">
                  Engineering Calculation Derivation & Verification
                </h3>
              </div>
              <button
                onClick={() => setIsCalcModalOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded hover:bg-navy-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Active Inputs */}
              <div className="bg-navy-950 p-3.5 rounded-lg border border-navy-700">
                <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-2 font-semibold">Active Design Inputs</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-gray-300">
                  <div>⌀ Diameter: <span className="text-accent-light">{designParams.diameter} mm</span></div>
                  <div>Span Length: <span className="text-accent-light">{designParams.length} mm</span></div>
                  <div>Torque: <span className="text-accent-light">{designParams.torque} N·m</span></div>
                  <div>Radial Load: <span className="text-accent-light">{designParams.force} N</span></div>
                  <div>Speed: <span className="text-accent-light">{designParams.rpm} RPM</span></div>
                  <div>Material: <span className="text-accent-light">{selectedMaterial.name}</span></div>
                </div>
              </div>

              {/* Torsional Shear Stress */}
              <div className="bg-navy-950/80 p-4 rounded-lg border border-navy-700">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-gray-200">1. Torsional Shear Stress (τ)</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${torsionCalc.status === 'pass' ? 'bg-status-pass/20 text-status-pass' : 'bg-status-fail/20 text-status-fail'}`}>
                    {torsionCalc.status.toUpperCase()}
                  </span>
                </div>
                <div className="font-mono text-accent-light bg-navy-900 p-2 rounded border border-navy-800 mb-2">
                  τ = 16T / (πd³) = (16 × {designParams.torque}) / (π × {designParams.diameter}³) = {torsionCalc.result.shearStressMPa.toFixed(2)} MPa
                </div>
                <div className="text-gray-400 text-[11px]">
                  Polar Section Modulus Z_p = {torsionCalc.result.polarSectionModulusMm3.toFixed(0)} mm³, Allowable Limit τ_allow = {torsionCalc.result.allowableShearStressMPa?.toFixed(1)} MPa.
                </div>
              </div>

              {/* Centerline Deflection */}
              <div className="bg-navy-950/80 p-4 rounded-lg border border-navy-700">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-gray-200">2. Centerline Deflection (δ)</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${deflectionCalc.status === 'pass' ? 'bg-status-pass/20 text-status-pass' : 'bg-amber-500/20 text-amber-300'}`}>
                    {deflectionCalc.status.toUpperCase()}
                  </span>
                </div>
                <div className="font-mono text-amber-300 bg-navy-900 p-2 rounded border border-navy-800 mb-2">
                  δ = F·L³ / (48·E·I) = {deflectionCalc.result.maxDeflectionMm.toFixed(4)} mm
                </div>
                <div className="text-gray-400 text-[11px]">
                  Model: {deflectionCalc.model}. Allowable limit (L/1000): {deflectionCalc.result.allowableDeflectionMm?.toFixed(3)} mm.
                </div>
              </div>

              {/* Power Transmission */}
              <div className="bg-navy-950/80 p-4 rounded-lg border border-navy-700">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-gray-200">3. Power Transmission</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-status-pass/20 text-status-pass">
                    PASS
                  </span>
                </div>
                <div className="font-mono text-status-pass bg-navy-900 p-2 rounded border border-navy-800 mb-2">
                  P = T·ω = {designParams.torque} N·m × (2π × {designParams.rpm} / 60) = {powerCalc.result.powerKW.toFixed(2)} kW ({powerCalc.result.powerHp.toFixed(1)} hp)
                </div>
              </div>

              {/* Assumptions & Disclaimers */}
              <div className="p-3 bg-navy-950 rounded-lg border border-navy-700 text-gray-400 text-[11px] space-y-1">
                <div className="font-semibold text-gray-300 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-accent" />
                  Engineering Disclaimer
                </div>
                <p>{torsionCalc.disclaimer}</p>
                <p className="text-gray-500">Formulations assume solid circular section, isotropic elasticity, and ideal support bearings.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-navy-700 bg-navy-950 flex justify-end">
              <button
                onClick={() => setIsCalcModalOpen(false)}
                className="btn-secondary text-xs px-4 py-1.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
