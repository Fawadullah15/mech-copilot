import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid3X3,
  Play,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Layers,
  Crosshair,
  Maximize2,
  Sliders,
} from 'lucide-react';
import type { ComponentSelection } from '../types';
import {
  calculateShaftTorsion,
  calculateShaftBending,
  calculatePowerTransmission,
  calculateShaftDeflection,
  calculateCombinedStress,
} from '../engineering';

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
  } = useApp();

  // CAD View States
  const [viewState, setViewState] = useState<'Front' | 'Side' | 'Iso'>('Front');
  const [showGrid, setShowGrid] = useState(true);
  const [showCenterline, setShowCenterline] = useState(true);
  const [showTolerances, setShowTolerances] = useState(true);
  const [zoom, setZoom] = useState(1.0);
  const [mobileTab, setMobileTab] = useState<'cad' | 'params'>('cad');

  // SVG calculations based on parameters
  const lengthScale = 1.2;
  const diameterScale = 2.0;

  const shaftLength = designParams.length * lengthScale;
  const shaftDiameter = designParams.diameter * diameterScale;

  // Viewbox dimensions
  const svgWidth = Math.max(900, shaftLength + 360);
  const svgHeight = Math.max(520, shaftDiameter + 300);
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  const startX = centerX - shaftLength / 2;
  const endX = centerX + shaftLength / 2;

  // Gear properties
  const gearDiameter = Math.max(shaftDiameter * 2.4, 120);
  const gearX = centerX;

  // Bearing positions (support points at journals)
  const bearingWidth = 28;
  const bearingHeight = shaftDiameter + 24;
  const leftBearingX = startX + 30;
  const rightBearingX = endX - 30 - bearingWidth;

  // Live Engineering Calculations
  const torsionCalc = calculateShaftTorsion({
    torque: designParams.torque,
    diameter: designParams.diameter,
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
  const allowableDeflectionMm = designParams.length / 1000;

  const d_m = designParams.diameter / 1000;
  const l_m = designParams.length / 1000;
  const volume = (Math.PI / 4) * Math.pow(d_m, 2) * l_m;
  const weight = selectedMaterial.density * volume;
  const powerKW = powerCalc.result.powerKW;

  const isPass = combinedStressCalc.status === 'pass' && deflectionCalc.status === 'pass';
  const isWarning = combinedStressCalc.status === 'warning' || deflectionCalc.status === 'warning';

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.5));
  const handleResetZoom = () => setZoom(1.0);

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full w-full overflow-hidden bg-[#111315] font-sans">
      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex border-b border-[#34393F] bg-[#191C1F] shrink-0">
        <button
          onClick={() => setMobileTab('cad')}
          className={`flex-1 py-2 text-xs font-mono font-medium text-center border-b-2 transition-colors ${
            mobileTab === 'cad'
              ? 'border-[#64D6C5] text-[#64D6C5] bg-[#22262A]'
              : 'border-transparent text-[#969DA5]'
          }`}
        >
          CAD Drawing
        </button>
        <button
          onClick={() => setMobileTab('params')}
          className={`flex-1 py-2 text-xs font-mono font-medium text-center border-b-2 transition-colors ${
            mobileTab === 'params'
              ? 'border-[#64D6C5] text-[#64D6C5] bg-[#22262A]'
              : 'border-transparent text-[#969DA5]'
          }`}
        >
          Parameters & Specs
        </button>
      </div>

      {/* Main CAD Viewport Area (Left / Center Stage) */}
      <div
        className={`flex-1 flex flex-col relative overflow-hidden bg-[#111315] ${
          mobileTab === 'cad' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Technical View Control Bar (Docked at Top of Canvas) */}
        <div className="h-10 px-3 bg-[#191C1F]/90 backdrop-blur-xs border-b border-[#34393F] flex items-center justify-between shrink-0 z-10 select-none">
          {/* Left: View Presets & Display Toggles */}
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <div className="flex items-center bg-[#111315] border border-[#34393F] rounded-[3px] p-0.5">
              {(['Front', 'Side', 'Iso'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setViewState(view)}
                  className={`px-2 py-0.5 rounded-[2px] transition-colors ${
                    viewState === view
                      ? 'bg-[#22262A] text-[#64D6C5] font-bold'
                      : 'text-[#969DA5] hover:text-[#F0F1F2]'
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>

            <span className="text-[#34393F]">|</span>

            {/* Grid Toggle */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-1 rounded-[3px] transition-colors ${
                showGrid
                  ? 'bg-[#22262A] text-[#64D6C5] border border-[#34393F]'
                  : 'text-[#969DA5] hover:text-[#F0F1F2]'
              }`}
              title="Toggle Drafting Grid"
            >
              <Grid3X3 size={13} />
            </button>

            {/* Centerline Toggle */}
            <button
              onClick={() => setShowCenterline(!showCenterline)}
              className={`p-1 rounded-[3px] transition-colors ${
                showCenterline
                  ? 'bg-[#22262A] text-[#64D6C5] border border-[#34393F]'
                  : 'text-[#969DA5] hover:text-[#F0F1F2]'
              }`}
              title="Toggle ISO Centerline"
            >
              <Crosshair size={13} />
            </button>
          </div>

          {/* Right: Active Component Callout & Zoom Controls */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-[#969DA5] hidden lg:inline">
              ISO 1:1 Orthographic
            </span>

            <span className="text-[#34393F] hidden lg:inline">|</span>

            {/* Zoom Controls */}
            <div className="flex items-center bg-[#111315] border border-[#34393F] rounded-[3px]">
              <button
                onClick={handleZoomOut}
                className="p-1 text-[#969DA5] hover:text-[#F0F1F2] transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-1.5 py-0.5 text-[10px] text-[#F0F1F2] hover:text-[#64D6C5] transition-colors border-x border-[#34393F]"
                title="Reset View (100%)"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                className="p-1 text-[#969DA5] hover:text-[#F0F1F2] transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* SVG Drafting Canvas */}
        <div className="flex-1 w-full h-full relative flex items-center justify-center bg-[#111315] overflow-hidden select-none">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full"
            style={{
              backgroundImage: showGrid
                ? 'radial-gradient(circle, #22262A 1px, transparent 1px)'
                : 'none',
              backgroundSize: '24px 24px',
            }}
          >
            <defs>
              {/* Technical Drafting Arrow Markers */}
              <marker
                id="draft-arrow-start"
                markerWidth="8"
                markerHeight="8"
                refX="0"
                refY="2.5"
                orient="auto"
              >
                <polygon points="7 0, 0 2.5, 7 5" fill="#64D6C5" />
              </marker>
              <marker
                id="draft-arrow-end"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="2.5"
                orient="auto"
              >
                <polygon points="0 0, 7 2.5, 0 5" fill="#64D6C5" />
              </marker>

              {/* High-Precision Metallic Shading */}
              <linearGradient id="shaft-body-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2B3036" />
                <stop offset="35%" stopColor="#3E454E" />
                <stop offset="65%" stopColor="#2A2F35" />
                <stop offset="100%" stopColor="#191C1F" />
              </linearGradient>

              {/* Bearing Section Diagonal Hatch */}
              <pattern
                id="bearing-hatch"
                width="6"
                height="6"
                patternTransform="rotate(45 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line x1="0" y1="0" x2="0" y2="6" stroke="#64D6C5" strokeWidth="1" strokeOpacity="0.4" />
              </pattern>
            </defs>

            {/* Transform Group (Zoom & Scale) */}
            <g
              transform={`translate(${centerX}, ${centerY}) scale(${zoom}) translate(${-centerX}, ${-centerY})`}
              style={{
                transition: 'transform 0.15s ease-out',
                transformOrigin: `${centerX}px ${centerY}px`,
              }}
            >
              {/* ISO Standard Shaft Centerline */}
              {showCenterline && (
                <line
                  x1={startX - 80}
                  y1={centerY}
                  x2={endX + 80}
                  y2={centerY}
                  stroke="#5C646E"
                  strokeWidth="1"
                  strokeDasharray="14 4 3 4"
                />
              )}

              {/* Front View Presentation */}
              {viewState === 'Front' && (
                <g className="cad-front-view">
                  {/* Left Bearing Journal (Stepped Shoulder) */}
                  <rect
                    x={startX}
                    y={centerY - (shaftDiameter * 0.9) / 2}
                    width={50}
                    height={shaftDiameter * 0.9}
                    fill="url(#shaft-body-gradient)"
                    stroke="#34393F"
                    strokeWidth="1.2"
                  />

                  {/* Main Shaft Body */}
                  <rect
                    x={startX + 50}
                    y={centerY - shaftDiameter / 2}
                    width={shaftLength - 100}
                    height={shaftDiameter}
                    fill="url(#shaft-body-gradient)"
                    stroke="#34393F"
                    strokeWidth="1.5"
                    className="hover:stroke-[#64D6C5] transition-colors cursor-pointer"
                    onClick={() =>
                      setSelectedComponent({
                        id: 'shaft',
                        name: 'Power Transmission Main Span',
                        type: 'Rotary Shaft Cylinder',
                        material: selectedMaterial.name,
                        status: isPass ? 'pass' : 'warning',
                        specs: {
                          Diameter: `⌀${designParams.diameter} mm`,
                          Length: `${designParams.length} mm`,
                          Material: selectedMaterial.name,
                          'Von Mises': `${vonMisesStress.toFixed(1)} MPa`,
                        },
                        suggestedPrompt: `Check stress and deflection for ${designParams.diameter}mm shaft body`,
                      })
                    }
                  />

                  {/* Right Bearing Journal */}
                  <rect
                    x={endX - 50}
                    y={centerY - (shaftDiameter * 0.9) / 2}
                    width={50}
                    height={shaftDiameter * 0.9}
                    fill="url(#shaft-body-gradient)"
                    stroke="#34393F"
                    strokeWidth="1.2"
                  />

                  {/* Spur Gear Profile at Midspan */}
                  <g transform={`translate(${gearX - 16}, ${centerY - gearDiameter / 2})`}>
                    <rect
                      x="0"
                      y="0"
                      width="32"
                      height={gearDiameter}
                      fill="#22262A"
                      stroke="#64D6C5"
                      strokeWidth="1.5"
                    />
                    {/* Gear Teeth Indications */}
                    {Array.from({ length: 9 }).map((_, i) => (
                      <line
                        key={`gear-tooth-${i}`}
                        x1="-4"
                        y1={(gearDiameter / 8) * i}
                        x2="36"
                        y2={(gearDiameter / 8) * i}
                        stroke="#64D6C5"
                        strokeWidth="1"
                        strokeOpacity="0.6"
                      />
                    ))}
                    <text
                      x="16"
                      y={gearDiameter / 2 + 3}
                      fill="#64D6C5"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      GEAR
                    </text>
                  </g>

                  {/* Left Bearing Assembly (Support A) */}
                  <g transform={`translate(${leftBearingX}, ${centerY - bearingHeight / 2})`}>
                    <rect
                      x="0"
                      y="0"
                      width={bearingWidth}
                      height={bearingHeight}
                      fill="url(#bearing-hatch)"
                      stroke="#5C646E"
                      strokeWidth="1"
                    />
                    <line x1="0" y1="0" x2={bearingWidth} y2={bearingHeight} stroke="#5C646E" strokeWidth="1" />
                    <line x1={bearingWidth} y1="0" x2="0" y2={bearingHeight} stroke="#5C646E" strokeWidth="1" />
                  </g>

                  {/* Right Bearing Assembly (Support B) */}
                  <g transform={`translate(${rightBearingX}, ${centerY - bearingHeight / 2})`}>
                    <rect
                      x="0"
                      y="0"
                      width={bearingWidth}
                      height={bearingHeight}
                      fill="url(#bearing-hatch)"
                      stroke="#5C646E"
                      strokeWidth="1"
                    />
                    <line x1="0" y1="0" x2={bearingWidth} y2={bearingHeight} stroke="#5C646E" strokeWidth="1" />
                    <line x1={bearingWidth} y1="0" x2="0" y2={bearingHeight} stroke="#5C646E" strokeWidth="1" />
                  </g>

                  {/* Keyway Slot Callout on Shaft Surface */}
                  <rect
                    x={centerX - 35}
                    y={centerY - shaftDiameter / 2 + 2}
                    width="70"
                    height="5"
                    fill="#111315"
                    stroke="#E7B65C"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <text
                    x={centerX}
                    y={centerY - shaftDiameter / 2 - 6}
                    fill="#E7B65C"
                    fontSize="8"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    DIN 6885 KEYWAY (r≥2.5mm)
                  </text>

                  {/* Dimension Line: Shaft Diameter (Vertical Dimension) */}
                  <g className="dimension-diameter">
                    <line
                      x1={startX - 35}
                      y1={centerY - shaftDiameter / 2}
                      x2={startX}
                      y2={centerY - shaftDiameter / 2}
                      stroke="#5C646E"
                      strokeWidth="0.8"
                    />
                    <line
                      x1={startX - 35}
                      y1={centerY + shaftDiameter / 2}
                      x2={startX}
                      y2={centerY + shaftDiameter / 2}
                      stroke="#5C646E"
                      strokeWidth="0.8"
                    />
                    <line
                      x1={startX - 25}
                      y1={centerY - shaftDiameter / 2}
                      x2={startX - 25}
                      y2={centerY + shaftDiameter / 2}
                      stroke="#64D6C5"
                      strokeWidth="1"
                      markerStart="url(#draft-arrow-start)"
                      markerEnd="url(#draft-arrow-end)"
                    />
                    <text
                      x={startX - 32}
                      y={centerY + 3}
                      fill="#64D6C5"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      ⌀{designParams.diameter.toFixed(1)} mm
                    </text>
                  </g>

                  {/* Dimension Line: Shaft Span Length (Horizontal Dimension) */}
                  <g className="dimension-length">
                    <line
                      x1={startX}
                      y1={centerY + shaftDiameter / 2 + 20}
                      x2={startX}
                      y2={centerY + shaftDiameter / 2 + 55}
                      stroke="#5C646E"
                      strokeWidth="0.8"
                    />
                    <line
                      x1={endX}
                      y1={centerY + shaftDiameter / 2 + 20}
                      x2={endX}
                      y2={centerY + shaftDiameter / 2 + 55}
                      stroke="#5C646E"
                      strokeWidth="0.8"
                    />
                    <line
                      x1={startX}
                      y1={centerY + shaftDiameter / 2 + 45}
                      x2={endX}
                      y2={centerY + shaftDiameter / 2 + 45}
                      stroke="#64D6C5"
                      strokeWidth="1"
                      markerStart="url(#draft-arrow-start)"
                      markerEnd="url(#draft-arrow-end)"
                    />
                    <text
                      x={centerX}
                      y={centerY + shaftDiameter / 2 + 40}
                      fill="#64D6C5"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      SPAN L = {designParams.length.toFixed(1)} mm
                    </text>
                  </g>

                  {/* Radial Force Vector Arrow */}
                  <g transform={`translate(${gearX}, ${centerY - gearDiameter / 2 - 50})`}>
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="42"
                      stroke="#E16D72"
                      strokeWidth="2"
                      markerEnd="url(#draft-arrow-end)"
                    />
                    <text
                      x="8"
                      y="20"
                      fill="#E16D72"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      F = {designParams.force} N
                    </text>
                  </g>

                  {/* Torque Torsion Curved Indicator */}
                  <g transform={`translate(${endX + 35}, ${centerY})`}>
                    <path
                      d="M 0 -22 A 22 22 0 1 1 -20 10"
                      fill="none"
                      stroke="#64D6C5"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                      markerEnd="url(#draft-arrow-end)"
                    />
                    <text
                      x="0"
                      y="32"
                      fill="#64D6C5"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      T = {designParams.torque} N·m
                    </text>
                  </g>
                </g>
              )}

              {/* Side / Section View Presentation */}
              {viewState === 'Side' && (
                <g className="cad-side-view" transform={`translate(${centerX}, ${centerY})`}>
                  <circle r={shaftDiameter / 2} fill="url(#shaft-body-gradient)" stroke="#64D6C5" strokeWidth="2" />
                  <circle r={gearDiameter / 2} fill="none" stroke="#5C646E" strokeWidth="1" strokeDasharray="3 3" />
                  {/* Crosshair */}
                  <line x1={-shaftDiameter} y1="0" x2={shaftDiameter} y2="0" stroke="#5C646E" strokeWidth="0.8" />
                  <line x1="0" y1={-shaftDiameter} x2="0" y2={shaftDiameter} stroke="#5C646E" strokeWidth="0.8" />
                  {/* Keyway Cross Section */}
                  <rect
                    x={-4}
                    y={-shaftDiameter / 2}
                    width="8"
                    height="6"
                    fill="#111315"
                    stroke="#E7B65C"
                    strokeWidth="1"
                  />
                  <text x="0" y={shaftDiameter / 2 + 25} fill="#64D6C5" fontSize="10" fontFamily="monospace" textAnchor="middle">
                    SECTION A-A: ⌀{designParams.diameter} mm
                  </text>
                </g>
              )}

              {/* Isometric 3D Projection */}
              {viewState === 'Iso' && (
                <g className="cad-iso-view" transform={`translate(${centerX - 100}, ${centerY}) skewX(-20)`}>
                  <rect
                    x="0"
                    y={-shaftDiameter / 2}
                    width={shaftLength * 0.85}
                    height={shaftDiameter}
                    fill="url(#shaft-body-gradient)"
                    stroke="#64D6C5"
                    strokeWidth="1.5"
                  />
                  <ellipse
                    cx="0"
                    cy="0"
                    rx={15}
                    ry={shaftDiameter / 2}
                    fill="#22262A"
                    stroke="#64D6C5"
                    strokeWidth="1.2"
                  />
                  <ellipse
                    cx={shaftLength * 0.85}
                    cy="0"
                    rx={15}
                    ry={shaftDiameter / 2}
                    fill="#34393F"
                    stroke="#64D6C5"
                    strokeWidth="1.2"
                  />
                  <text
                    x={(shaftLength * 0.85) / 2}
                    y={shaftDiameter / 2 + 25}
                    fill="#969DA5"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    ISOMETRIC PROJECTION
                  </text>
                </g>
              )}
            </g>

            {/* ISO Engineering Title Block / Drawing Stamp (Bottom-Right) */}
            <g transform={`translate(${svgWidth - 260}, ${svgHeight - 85})`} className="cad-title-block select-none">
              <rect x="0" y="0" width="245" height="72" fill="#191C1F" stroke="#34393F" strokeWidth="1" />
              <line x1="0" y1="24" x2="245" y2="24" stroke="#34393F" strokeWidth="0.8" />
              <line x1="0" y1="48" x2="245" y2="48" stroke="#34393F" strokeWidth="0.8" />
              <line x1="145" y1="0" x2="145" y2="48" stroke="#34393F" strokeWidth="0.8" />

              <text x="8" y="16" fill="#F0F1F2" fontSize="9" fontFamily="monospace" fontWeight="bold">
                DWG: QA-ME-2026-001
              </text>
              <text x="152" y="16" fill="#969DA5" fontSize="8" fontFamily="monospace">
                REV: C (RC1)
              </text>

              <text x="8" y="40" fill="#64D6C5" fontSize="8" fontFamily="monospace">
                MAT: {selectedMaterial.name.toUpperCase()}
              </text>
              <text x="152" y="40" fill="#969DA5" fontSize="8" fontFamily="monospace">
                Sy: {selectedMaterial.yieldStrength} MPa
              </text>

              <text x="8" y="63" fill="#34D399" fontSize="8" fontFamily="monospace" fontWeight="bold">
                STATUS: {isPass ? 'COMPLIANT [PASS]' : 'WARNING [REVIEW]'}
              </text>
            </g>
          </svg>
        </div>

        {/* Integrated Precision Telemetry Strip (Docked at Bottom of Viewport) */}
        <div className="h-12 bg-[#191C1F] border-t border-[#34393F] px-4 flex items-center justify-between shrink-0 z-10 select-none overflow-x-auto">
          <div className="flex items-center gap-5 font-mono text-xs">
            {/* Von Mises Equivalent Stress */}
            <div className="flex flex-col">
              <span className="text-[10px] text-[#969DA5] uppercase">VON MISES STRESS</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-[#F0F1F2]">
                  {vonMisesStress.toFixed(1)}
                </span>
                <span className="text-[10px] text-[#969DA5]">MPa</span>
                <span className="text-[9px] text-[#636A73]">/ {selectedMaterial.yieldStrength}</span>
              </div>
            </div>

            <div className="w-[1px] h-6 bg-[#34393F]" />

            {/* Factor of Safety */}
            <div className="flex flex-col">
              <span className="text-[10px] text-[#969DA5] uppercase">FACTOR OF SAFETY</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-sm font-bold ${
                    fos >= designParams.safetyFactor
                      ? 'text-[#34D399]'
                      : fos >= designParams.safetyFactor * 0.9
                      ? 'text-[#E7B65C]'
                      : 'text-[#E16D72]'
                  }`}
                >
                  {fos.toFixed(2)}x
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded-[2px] text-[9px] font-bold ${
                    isPass
                      ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/30'
                      : isWarning
                      ? 'bg-[#E7B65C]/15 text-[#E7B65C] border border-[#E7B65C]/30'
                      : 'bg-[#E16D72]/15 text-[#E16D72] border border-[#E16D72]/30'
                  }`}
                >
                  {isPass ? 'PASS' : isWarning ? 'WARN' : 'FAIL'}
                </span>
              </div>
            </div>

            <div className="w-[1px] h-6 bg-[#34393F] hidden sm:block" />

            {/* Max Centerline Deflection */}
            <div className="hidden sm:flex flex-col">
              <span className="text-[10px] text-[#969DA5] uppercase">DEFLECTION (δ)</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-[#F0F1F2]">
                  {deflectionCalc.result.maxDeflectionMm.toFixed(3)}
                </span>
                <span className="text-[10px] text-[#969DA5]">mm</span>
                <span className="text-[9px] text-[#636A73]">
                  (Lim: {allowableDeflectionMm.toFixed(3)})
                </span>
              </div>
            </div>

            <div className="w-[1px] h-6 bg-[#34393F] hidden lg:block" />

            {/* Rotating Mass */}
            <div className="hidden lg:flex flex-col">
              <span className="text-[10px] text-[#969DA5] uppercase">SHAFT MASS</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-[#F0F1F2]">{weight.toFixed(2)}</span>
                <span className="text-[10px] text-[#969DA5]">kg</span>
              </div>
            </div>

            <div className="w-[1px] h-6 bg-[#34393F] hidden xl:block" />

            {/* Transmitted Power */}
            <div className="hidden xl:flex flex-col">
              <span className="text-[10px] text-[#969DA5] uppercase">POWER @ {designParams.rpm} RPM</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-[#F0F1F2]">{powerKW.toFixed(1)}</span>
                <span className="text-[10px] text-[#969DA5]">kW</span>
                <span className="text-[9px] text-[#636A73]">({(powerKW * 1.341).toFixed(1)} hp)</span>
              </div>
            </div>
          </div>

          {/* Quick Status Tag */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {isPass ? (
              <span className="flex items-center gap-1 text-[#34D399]">
                <CheckCircle2 size={13} />
                <span className="hidden sm:inline">Stress Envelope Satisfied</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#E7B65C]">
                <AlertTriangle size={13} />
                <span className="hidden sm:inline">Review Required</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contextual Engineering Properties Panel (Right Inspector) */}
      <div
        className={`w-full md:w-[310px] shrink-0 h-full bg-[#191C1F] border-l border-[#34393F] flex flex-col font-sans select-none z-20 ${
          mobileTab === 'params' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Panel Header */}
        <div className="h-10 px-3.5 border-b border-[#34393F] flex items-center justify-between shrink-0 bg-[#191C1F]">
          <div className="flex items-center gap-2">
            <Sliders size={13} className="text-[#64D6C5]" />
            <span className="text-xs font-mono font-bold tracking-wider text-[#F0F1F2]">
              PROPERTIES & LOADS
            </span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#22262A] text-[#969DA5] border border-[#34393F]">
            PARAMETRIC
          </span>
        </div>

        {/* Form Controls (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
          {/* Section 1: Shaft Geometry */}
          <div className="space-y-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#969DA5] font-semibold border-b border-[#25292E] pb-1">
              1. Geometry
            </div>

            {/* Diameter */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label-text mb-0">Shaft Diameter (⌀)</label>
                <span className="text-[10px] font-mono text-[#64D6C5]">
                  Zp = {(torsionCalc.result.polarSectionModulusMm3 || 0).toFixed(0)} mm³
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={designParams.diameter}
                  onChange={(e) => updateDesignParam('diameter', parseFloat(e.target.value) || 0)}
                  step="1"
                  min="5"
                  max="500"
                  className="input-field pr-10"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#636A73]">
                  mm
                </span>
              </div>
            </div>

            {/* Length */}
            <div>
              <label className="label-text">Span Length (L)</label>
              <div className="relative">
                <input
                  type="number"
                  value={designParams.length}
                  onChange={(e) => updateDesignParam('length', parseFloat(e.target.value) || 0)}
                  step="5"
                  min="50"
                  max="5000"
                  className="input-field pr-10"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#636A73]">
                  mm
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Applied Loads */}
          <div className="space-y-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#969DA5] font-semibold border-b border-[#25292E] pb-1">
              2. Applied Operating Loads
            </div>

            {/* Torque */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label-text mb-0">Transmitted Torque (T)</label>
                <span className="text-[10px] font-mono text-[#969DA5]">
                  τ = {shearStress.toFixed(1)} MPa
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={designParams.torque}
                  onChange={(e) => updateDesignParam('torque', parseFloat(e.target.value) || 0)}
                  step="10"
                  min="0"
                  className="input-field pr-12"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#636A73]">
                  N·m
                </span>
              </div>
            </div>

            {/* Radial Force */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label-text mb-0">Radial Transverse Load (F)</label>
                <span className="text-[10px] font-mono text-[#969DA5]">
                  M = {bendingCalc.result.bendingMomentNm.toFixed(0)} N·m
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={designParams.force}
                  onChange={(e) => updateDesignParam('force', parseFloat(e.target.value) || 0)}
                  step="100"
                  min="0"
                  className="input-field pr-10"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#636A73]">
                  N
                </span>
              </div>
            </div>

            {/* RPM */}
            <div>
              <label className="label-text">Rotational Speed (n)</label>
              <div className="relative">
                <input
                  type="number"
                  value={designParams.rpm}
                  onChange={(e) => updateDesignParam('rpm', parseFloat(e.target.value) || 0)}
                  step="50"
                  min="1"
                  className="input-field pr-12"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#636A73]">
                  RPM
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Material Specification */}
          <div className="space-y-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#969DA5] font-semibold border-b border-[#25292E] pb-1">
              3. Material Selection
            </div>

            <select
              value={selectedMaterial.id}
              onChange={(e) => selectMaterial(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#111315] border border-[#34393F] rounded-[4px] text-[#F0F1F2] text-xs font-mono focus:outline-none focus:border-[#64D6C5]"
            >
              {allMaterials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.yieldStrength} MPa)
                </option>
              ))}
            </select>

            {/* Material Quick Specs Strip */}
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] p-2 rounded-[3px] bg-[#111315] border border-[#25292E]">
              <div>
                <span className="text-[#636A73]">Yield Strength: </span>
                <span className="text-[#F0F1F2] font-semibold">{selectedMaterial.yieldStrength} MPa</span>
              </div>
              <div>
                <span className="text-[#636A73]">Modulus (E): </span>
                <span className="text-[#F0F1F2] font-semibold">{selectedMaterial.elasticModulus} GPa</span>
              </div>
              <div>
                <span className="text-[#636A73]">Density (ρ): </span>
                <span className="text-[#F0F1F2] font-semibold">{selectedMaterial.density} kg/m³</span>
              </div>
              <div>
                <span className="text-[#636A73]">Tensile (Su): </span>
                <span className="text-[#F0F1F2] font-semibold">{selectedMaterial.tensileStrength} MPa</span>
              </div>
            </div>
          </div>

          {/* Section 4: Operating Conditions */}
          <div className="space-y-2.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#969DA5] font-semibold border-b border-[#25292E] pb-1">
              4. Design Constraints
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label-text">Operating Temp</label>
                <div className="relative">
                  <input
                    type="number"
                    value={designParams.temperature}
                    onChange={(e) => updateDesignParam('temperature', parseFloat(e.target.value) || 0)}
                    step="5"
                    className="input-field pr-8"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-[#636A73]">
                    °C
                  </span>
                </div>
              </div>

              <div>
                <label className="label-text">Target FoS</label>
                <div className="relative">
                  <input
                    type="number"
                    value={designParams.safetyFactor}
                    onChange={(e) => updateDesignParam('safetyFactor', parseFloat(e.target.value) || 1)}
                    step="0.1"
                    min="1.0"
                    max="10"
                    className="input-field pr-6"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono text-[#636A73]">
                    x
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pinned Action Footer */}
        <div className="p-3 border-t border-[#34393F] bg-[#191C1F] shrink-0">
          <button
            onClick={runAnalysis}
            disabled={isAnalysisRunning}
            className="w-full btn-primary py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            {isAnalysisRunning ? (
              <>
                <Loader2 size={14} className="animate-spin text-[#111315]" />
                <span>SOLVING EQUATIONS...</span>
              </>
            ) : (
              <>
                <Play size={13} fill="currentColor" />
                <span>RUN FULL SIMULATION</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
