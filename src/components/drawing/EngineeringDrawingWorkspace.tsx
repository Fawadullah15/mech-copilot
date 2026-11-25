import React, { useState, useRef, useMemo } from 'react';
import type { DesignParameters, Material, AnalysisResult } from '../../types';
import type {
  DrawingSheetSize,
  DrawingOrientation,
  ProjectionAngle,
  DrawingStatus,
  DrawingDimension,
  DrawingTitleBlock,
} from '../../engineering/drawing/types';
import { computeDrawingLayout } from '../../engineering/drawing/drawingGeometry';
import { generateDrawingDimensions } from '../../engineering/drawing/dimensionGenerator';
import { generateManufacturingSpec } from '../../engineering/drawing/manufacturingSpecs';
import { runDesignVerification } from '../../engineering/drawing/drawingVerification';
import { getProjectionSymbolSvg } from '../../engineering/drawing/sheetStandards';
import {
  exportSvgDrawing,
  exportPngDrawing,
  printDrawingSheet,
  exportManufacturingReportJson,
} from '../../engineering/drawing/exportDrawing';
import { DimensionEditorModal } from './DimensionEditorModal';

interface EngineeringDrawingWorkspaceProps {
  designParams: DesignParameters;
  material: Material;
  analysis?: AnalysisResult | null;
  projectName?: string;
  projectVersion?: string;
  onUpdateParameter?: (key: keyof DesignParameters, value: number) => void;
  className?: string;
}

export const EngineeringDrawingWorkspace: React.FC<EngineeringDrawingWorkspaceProps> = ({
  designParams,
  material,
  analysis,
  projectName = 'Helical Gearbox Main Shaft',
  projectVersion = 'v1.0',
  onUpdateParameter,
  className = '',
}) => {
  // Drawing configuration state
  const [sheetSize, setSheetSize] = useState<DrawingSheetSize>('A3');
  const [orientation, setOrientation] = useState<DrawingOrientation>('landscape');
  const [projection, setProjection] = useState<ProjectionAngle>('first-angle');
  const [drawingStatus, setDrawingStatus] = useState<DrawingStatus>('DRAFT');

  // Layer toggles
  const [showHiddenEdges, setShowHiddenEdges] = useState(true);
  const [showCenterlines, setShowCenterlines] = useState(true);
  const [showHatching, setShowHatching] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);

  // Zoom & Pan state
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Dimension editing state
  const [selectedDimension, setSelectedDimension] = useState<DrawingDimension | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Compute Layout & Dimensions mathematically derived from model parameters
  const layout = useMemo(() => {
    return computeDrawingLayout(designParams, sheetSize, orientation, projection);
  }, [designParams, sheetSize, orientation, projection]);

  const dimensions = useMemo(() => {
    return generateDrawingDimensions(layout, designParams);
  }, [layout, designParams]);

  const verification = useMemo(() => {
    return runDesignVerification(designParams, material, analysis, {
      sheetSize,
      orientation,
      isDraft: drawingStatus === 'DRAFT',
    });
  }, [designParams, material, analysis, sheetSize, orientation, drawingStatus]);

  const titleBlock: DrawingTitleBlock = {
    company: 'MECHANICAL COPILOT ATELIER',
    projectName,
    partName: 'POWER TRANSMISSION STEPPED SHAFT',
    drawingNumber: 'MC-DWG-74301-A',
    revision: projectVersion,
    units: 'MILLIMETERS (mm)',
    scale: layout.scaleLabel,
    material: material.name,
    generalTolerances: 'ISO 2768-mK',
    surfaceFinishGeneral: 'Ra 3.2 µm',
    projection,
    author: 'Principal CAD Engineer',
    checker: 'Automated FEA Validator',
    date: new Date().toISOString().split('T')[0],
    status: drawingStatus,
    sheet: '1 OF 1',
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && (e.altKey || e.shiftKey || (e.target as HTMLElement).tagName === 'svg')) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Dimension click handler
  const handleDimensionClick = (dim: DrawingDimension) => {
    setSelectedDimension(dim);
    setIsEditorOpen(true);
  };

  const handleSaveDimension = (key: keyof DesignParameters, val: number) => {
    if (onUpdateParameter) {
      onUpdateParameter(key, val);
    }
  };

  // Zoom helpers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(3.0, z * 1.25));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.4, z / 1.25));
  const handleResetZoom = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Export handlers
  const handleExportSvg = () => {
    if (svgRef.current) {
      exportSvgDrawing(svgRef.current, `${projectName.replace(/\s+/g, '_')}_drawing.svg`);
    }
    setShowExportMenu(false);
  };

  const handleExportPng = async () => {
    if (svgRef.current) {
      await exportPngDrawing(svgRef.current, `${projectName.replace(/\s+/g, '_')}_drawing.png`);
    }
    setShowExportMenu(false);
  };

  const handleExportJson = () => {
    const spec = generateManufacturingSpec(designParams, material);
    exportManufacturingReportJson(spec, verification, titleBlock, `${projectName.replace(/\s+/g, '_')}_spec_audit.json`);
    setShowExportMenu(false);
  };

  const handlePrint = () => {
    printDrawingSheet();
    setShowExportMenu(false);
  };

  // Shortcut geometric constants
  const { model, frontView, topView, sideView, isometricView } = layout;
  const s = frontView.scale;
  const mainR = model.mainRadius * s;
  const jR = model.journalRadius * s;
  const jLen = model.journalLength * s;
  const mainLen = model.mainLength * s;
  const totLen = model.totalLength * s;
  const gearR = model.gearRadius * s;
  const gearW = model.gearWidth * s;
  const bOuterR = model.bearingOuterDia * 0.5 * s;
  const bW = model.bearingWidth * s;
  const chamf = model.chamferSize * s;

  const fLeftX = frontView.originX;
  const fRightX = frontView.originX + totLen;
  const fCenterY = frontView.originY;

  return (
    <div className={`relative flex flex-col h-full bg-[#EAEEF6] dark:bg-[#0B0F17] overflow-hidden ${className}`}>
      {/* Top Workspace Controls Toolbar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-white dark:bg-[#111827] border-b border-[#D9DFED] dark:border-white/10 shadow-sm z-20">
        {/* Left: Sheet Standard & Projection */}
        <div className="flex items-center space-x-2">
          {/* Sheet Size */}
          <div className="flex items-center rounded-lg border border-[#D9DFED] dark:border-white/10 p-0.5 bg-[#F8FAFC] dark:bg-[#151D2E] text-xs">
            {(['A4', 'A3', 'A2'] as const).map((sz) => (
              <button
                key={sz}
                onClick={() => setSheetSize(sz)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  sheetSize === sz
                    ? 'bg-[#315EDE] text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>

          {/* Orientation */}
          <button
            onClick={() => setOrientation((o) => (o === 'landscape' ? 'portrait' : 'landscape'))}
            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[#D9DFED] dark:border-white/10 bg-[#F8FAFC] dark:bg-[#151D2E] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
            title="Toggle sheet orientation"
          >
            {orientation === 'landscape' ? 'Landscape' : 'Portrait'}
          </button>

          {/* Projection Standard */}
          <button
            onClick={() => setProjection((p) => (p === 'first-angle' ? 'third-angle' : 'first-angle'))}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-[#D9DFED] dark:border-white/10 bg-[#F8FAFC] dark:bg-[#151D2E] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
            title="Toggle between First Angle (ISO) and Third Angle (ASME) projection"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#7653C9]" />
            <span>{projection === 'first-angle' ? '1st Angle (ISO)' : '3rd Angle (ASME)'}</span>
          </button>

          {/* Drawing Status */}
          <select
            value={drawingStatus}
            onChange={(e) => setDrawingStatus(e.target.value as DrawingStatus)}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-[#D9DFED] dark:border-white/10 bg-[#F8FAFC] dark:bg-[#151D2E] text-gray-800 dark:text-gray-200 focus:outline-none"
          >
            <option value="DRAFT">DRAFT (Pre-Release)</option>
            <option value="PRELIMINARY">PRELIMINARY (Review)</option>
            <option value="APPROVED">APPROVED (Release)</option>
            <option value="OBSOLETE">OBSOLETE</option>
          </select>
        </div>

        {/* Center: Layers & View Visibility */}
        <div className="hidden lg:flex items-center space-x-1.5 text-xs text-gray-600 dark:text-gray-400">
          <label className="flex items-center space-x-1 cursor-pointer hover:text-gray-900 dark:hover:text-white px-2 py-1 rounded bg-gray-50 dark:bg-white/5">
            <input
              type="checkbox"
              checked={showHiddenEdges}
              onChange={(e) => setShowHiddenEdges(e.target.checked)}
              className="rounded text-[#315EDE] focus:ring-0 w-3.5 h-3.5"
            />
            <span>Hidden Edges</span>
          </label>
          <label className="flex items-center space-x-1 cursor-pointer hover:text-gray-900 dark:hover:text-white px-2 py-1 rounded bg-gray-50 dark:bg-white/5">
            <input
              type="checkbox"
              checked={showCenterlines}
              onChange={(e) => setShowCenterlines(e.target.checked)}
              className="rounded text-[#315EDE] focus:ring-0 w-3.5 h-3.5"
            />
            <span>Centerlines</span>
          </label>
          <label className="flex items-center space-x-1 cursor-pointer hover:text-gray-900 dark:hover:text-white px-2 py-1 rounded bg-gray-50 dark:bg-white/5">
            <input
              type="checkbox"
              checked={showHatching}
              onChange={(e) => setShowHatching(e.target.checked)}
              className="rounded text-[#315EDE] focus:ring-0 w-3.5 h-3.5"
            />
            <span>Hatching</span>
          </label>
          <label className="flex items-center space-x-1 cursor-pointer hover:text-gray-900 dark:hover:text-white px-2 py-1 rounded bg-gray-50 dark:bg-white/5">
            <input
              type="checkbox"
              checked={showDimensions}
              onChange={(e) => setShowDimensions(e.target.checked)}
              className="rounded text-[#315EDE] focus:ring-0 w-3.5 h-3.5"
            />
            <span>Dimensions</span>
          </label>
        </div>

        {/* Right: Zoom & Export Controls */}
        <div className="flex items-center space-x-2">
          {/* Zoom buttons */}
          <div className="flex items-center rounded-lg border border-[#D9DFED] dark:border-white/10 bg-[#F8FAFC] dark:bg-[#151D2E] text-xs">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              title="Zoom out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="px-2 font-mono text-[11px] text-gray-500 font-medium">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              title="Zoom in"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 text-[11px] font-semibold text-[#315EDE] hover:bg-blue-50 dark:hover:bg-blue-900/20 border-l border-[#D9DFED] dark:border-white/10"
              title="Reset fit"
            >
              Fit
            </button>
          </div>

          {/* Quick Edit Dimension Button */}
          <button
            onClick={() => {
              const diaDim = dimensions.find((d) => d.parameterKey === 'diameter') || dimensions[0];
              setSelectedDimension(diaDim);
              setIsEditorOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-[#151D2E] text-[#315EDE] border border-[#315EDE]/40 hover:bg-[#315EDE]/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit Dimensions</span>
          </button>

          {/* Export Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#315EDE] text-white hover:bg-[#254ab8] shadow-sm transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export Drawing</span>
              <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white dark:bg-[#111827] border border-[#D9DFED] dark:border-white/10 shadow-xl py-1.5 z-30 animate-fade-in text-xs">
                <button
                  onClick={handleExportSvg}
                  className="w-full text-left px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center space-x-2 text-gray-700 dark:text-gray-300"
                >
                  <svg className="w-4 h-4 text-[#315EDE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span>Export Scalable Vector (SVG)</span>
                </button>
                <button
                  onClick={handleExportPng}
                  className="w-full text-left px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center space-x-2 text-gray-700 dark:text-gray-300"
                >
                  <svg className="w-4 h-4 text-[#7653C9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Export PNG Hi-Res Preview</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="w-full text-left px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center space-x-2 text-gray-700 dark:text-gray-300"
                >
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print Drawing / Save PDF</span>
                </button>
                <div className="border-t border-gray-100 dark:border-white/10 my-1" />
                <button
                  onClick={handleExportJson}
                  className="w-full text-left px-3.5 py-2 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center space-x-2 text-gray-700 dark:text-gray-300"
                >
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Export Spec & Audit JSON</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Pan/Zoom Canvas Area */}
      <div
        className="relative flex-1 overflow-hidden cursor-crosshair select-none flex items-center justify-center p-4"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out',
          }}
          className="shadow-2xl rounded-sm bg-white"
        >
          {/* High Precision SVG Technical Drawing Sheet */}
          <svg
            ref={svgRef}
            viewBox={`0 0 ${layout.sheet.viewBoxWidth} ${layout.sheet.viewBoxHeight}`}
            width={layout.sheet.viewBoxWidth * 0.55}
            height={layout.sheet.viewBoxHeight * 0.55}
            className="block text-[#111827] font-sans"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <defs>
              {/* CAD Arrow Marker */}
              <marker
                id="cad-arrow"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#315EDE" />
              </marker>

              {/* 45 Degree Cross Hatch Pattern for Section A-A */}
              <pattern
                id="cad-section-hatch"
                patternUnits="userSpaceOnUse"
                width="8"
                height="8"
                patternTransform="rotate(45)"
              >
                <line x1="0" y1="0" x2="0" y2="8" stroke="#1E293B" strokeWidth="0.8" opacity="0.65" />
              </pattern>
            </defs>

            {/* 1. Sheet Borders (ISO 5457) */}
            {/* Outer Sheet Edge */}
            <rect
              x="0"
              y="0"
              width={layout.sheet.viewBoxWidth}
              height={layout.sheet.viewBoxHeight}
              fill="#FFFFFF"
              stroke="#94A3B8"
              strokeWidth="1"
            />
            {/* Inner Margin Border (10mm Margin = 40px) */}
            <rect
              x={layout.sheet.marginMm * 4}
              y={layout.sheet.marginMm * 4}
              width={layout.sheet.viewBoxWidth - layout.sheet.marginMm * 8}
              height={layout.sheet.viewBoxHeight - layout.sheet.marginMm * 8}
              fill="none"
              stroke="#0F172A"
              strokeWidth="2"
            />

            {/* 2. DRAFT Watermark if unreleased */}
            {drawingStatus === 'DRAFT' && (
              <text
                x={layout.sheet.viewBoxWidth / 2}
                y={layout.sheet.viewBoxHeight / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="84"
                fontWeight="900"
                fill="#EF4444"
                opacity="0.06"
                transform={`rotate(-28, ${layout.sheet.viewBoxWidth / 2}, ${layout.sheet.viewBoxHeight / 2})`}
                letterSpacing="16"
              >
                DRAFT — PRE-RELEASE
              </text>
            )}

            {/* ============================================================== */}
            {/* VIEW 1: FRONT ELEVATION VIEW                                   */}
            {/* ============================================================== */}
            <g id="front-elevation-view">
              <text
                x={fLeftX}
                y={fCenterY - gearR - 75}
                fontSize="12"
                fontWeight="700"
                fill="#0F172A"
                letterSpacing="1"
              >
                FRONT VIEW (ELEVATION)
              </text>

              {/* Centerline (ISO Long-dash/Short-dash) */}
              {showCenterlines && (
                <line
                  x1={fLeftX - 35}
                  y1={fCenterY}
                  x2={fRightX + 35}
                  y2={fCenterY}
                  stroke="#64748B"
                  strokeWidth="0.9"
                  strokeDasharray="24, 4, 3, 4"
                />
              )}

              {/* Left Stepped Journal Shoulder */}
              <rect
                x={fLeftX}
                y={fCenterY - jR}
                width={jLen}
                height={jR * 2}
                fill="#F8FAFC"
                stroke="#0F172A"
                strokeWidth="1.6"
              />
              {/* Left Chamfer (1.5 x 45°) */}
              <line
                x1={fLeftX}
                y1={fCenterY - jR + chamf}
                x2={fLeftX + chamf}
                y2={fCenterY - jR}
                stroke="#0F172A"
                strokeWidth="1.4"
              />
              <line
                x1={fLeftX}
                y1={fCenterY + jR - chamf}
                x2={fLeftX + chamf}
                y2={fCenterY + jR}
                stroke="#0F172A"
                strokeWidth="1.4"
              />

              {/* Main Shaft Body Cylinder */}
              <rect
                x={fLeftX + jLen}
                y={fCenterY - mainR}
                width={mainLen}
                height={mainR * 2}
                fill="#FFFFFF"
                stroke="#0F172A"
                strokeWidth="1.8"
              />

              {/* Right Stepped Journal Shoulder */}
              <rect
                x={fRightX - jLen}
                y={fCenterY - jR}
                width={jLen}
                height={jR * 2}
                fill="#F8FAFC"
                stroke="#0F172A"
                strokeWidth="1.6"
              />
              {/* Right Chamfer */}
              <line
                x1={fRightX}
                y1={fCenterY - jR + chamf}
                x2={fRightX - chamf}
                y2={fCenterY - jR}
                stroke="#0F172A"
                strokeWidth="1.4"
              />
              <line
                x1={fRightX}
                y1={fCenterY + jR - chamf}
                x2={fRightX - chamf}
                y2={fCenterY + jR}
                stroke="#0F172A"
                strokeWidth="1.4"
              />

              {/* Midspan Spur Gear Hub */}
              <g transform={`translate(${frontView.cx}, ${fCenterY})`}>
                <rect
                  x={-gearW / 2}
                  y={-gearR}
                  width={gearW}
                  height={gearR * 2}
                  fill="#F1F5F9"
                  stroke="#0F172A"
                  strokeWidth="1.6"
                />
                {/* Lightening Hub Recess */}
                <rect
                  x={-gearW / 2 + 3}
                  y={-gearR * 0.74}
                  width={gearW - 6}
                  height={gearR * 1.48}
                  fill="none"
                  stroke="#475569"
                  strokeWidth="0.8"
                  strokeDasharray="4, 2"
                />
                {/* Gear Pitch Circle Indicator */}
                <line
                  x1={-gearW / 2 - 8}
                  y1={-gearR * 0.88}
                  x2={gearW / 2 + 8}
                  y2={-gearR * 0.88}
                  stroke="#64748B"
                  strokeWidth="0.9"
                  strokeDasharray="16, 3, 2, 3"
                />
                <line
                  x1={-gearW / 2 - 8}
                  y1={gearR * 0.88}
                  x2={gearW / 2 + 8}
                  y2={gearR * 0.88}
                  stroke="#64748B"
                  strokeWidth="0.9"
                  strokeDasharray="16, 3, 2, 3"
                />
              </g>

              {/* Mounted Ball Bearings (Left & Right) */}
              {/* Left Bearing */}
              <g transform={`translate(${fLeftX + jLen * 0.5}, ${fCenterY})`}>
                <rect
                  x={-bW / 2}
                  y={-bOuterR}
                  width={bW}
                  height={bOuterR * 2}
                  fill="#F8FAFC"
                  stroke="#475569"
                  strokeWidth="1.2"
                />
                <line x1={-bW / 2} y1={-bOuterR} x2={bW / 2} y2={bOuterR} stroke="#94A3B8" strokeWidth="0.6" />
                <line x1={-bW / 2} y1={bOuterR} x2={bW / 2} y2={-bOuterR} stroke="#94A3B8" strokeWidth="0.6" />
                <text x="0" y={bOuterR + 14} fontSize="9" textAnchor="middle" fill="#64748B" fontFamily="monospace">
                  SUPPORT A (k5)
                </text>
              </g>

              {/* Right Bearing */}
              <g transform={`translate(${fRightX - jLen * 0.5}, ${fCenterY})`}>
                <rect
                  x={-bW / 2}
                  y={-bOuterR}
                  width={bW}
                  height={bOuterR * 2}
                  fill="#F8FAFC"
                  stroke="#475569"
                  strokeWidth="1.2"
                />
                <line x1={-bW / 2} y1={-bOuterR} x2={bW / 2} y2={bOuterR} stroke="#94A3B8" strokeWidth="0.6" />
                <line x1={-bW / 2} y1={bOuterR} x2={bW / 2} y2={-bOuterR} stroke="#94A3B8" strokeWidth="0.6" />
                <text x="0" y={bOuterR + 14} fontSize="9" textAnchor="middle" fill="#64748B" fontFamily="monospace">
                  SUPPORT B (k5)
                </text>
              </g>

              {/* Keyway Slot (Hidden Edges - Dashed) */}
              {showHiddenEdges && (
                <g>
                  <rect
                    x={frontView.cx - (model.keywayLength * s) / 2}
                    y={fCenterY - mainR}
                    width={model.keywayLength * s}
                    height={model.keywayDepth * s}
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="1.2"
                    strokeDasharray="5, 3"
                  />
                  <line
                    x1={frontView.cx - (model.keywayLength * s) / 2}
                    y1={fCenterY - mainR + model.keywayDepth * s}
                    x2={frontView.cx + (model.keywayLength * s) / 2}
                    y2={fCenterY - mainR + model.keywayDepth * s}
                    stroke="#D97706"
                    strokeWidth="1.2"
                    strokeDasharray="5, 3"
                  />
                </g>
              )}

              {/* Section Cutting Plane A - A */}
              <g id="section-cutting-plane">
                <line
                  x1={frontView.cx}
                  y1={fCenterY - gearR - 35}
                  x2={frontView.cx}
                  y2={fCenterY + gearR + 35}
                  stroke="#0F172A"
                  strokeWidth="2.5"
                  strokeDasharray="20, 6, 4, 6"
                />
                {/* Top Arrow & Label */}
                <polygon
                  points={`${frontView.cx},${fCenterY - gearR - 35} ${frontView.cx + 12},${fCenterY - gearR - 42} ${frontView.cx + 12},${fCenterY - gearR - 28}`}
                  fill="#0F172A"
                />
                <text
                  x={frontView.cx + 18}
                  y={fCenterY - gearR - 30}
                  fontSize="14"
                  fontWeight="900"
                  fill="#0F172A"
                >
                  A
                </text>
                {/* Bottom Arrow & Label */}
                <polygon
                  points={`${frontView.cx},${fCenterY + gearR + 35} ${frontView.cx + 12},${fCenterY + gearR + 28} ${frontView.cx + 12},${fCenterY + gearR + 42}`}
                  fill="#0F172A"
                />
                <text
                  x={frontView.cx + 18}
                  y={fCenterY + gearR + 40}
                  fontSize="14"
                  fontWeight="900"
                  fill="#0F172A"
                >
                  A
                </text>
              </g>

              {/* Surface Finish Symbols (Ra 0.8, Ra 1.6) */}
              <g transform={`translate(${fLeftX + jLen * 0.2}, ${fCenterY - jR - 8})`}>
                <polyline points="0,0 4,-10 10,-10" fill="none" stroke="#0F172A" strokeWidth="1" />
                <text x="6" y="-13" fontSize="8" fontWeight="600" fill="#0F172A" fontFamily="monospace">
                  Ra 0.8
                </text>
              </g>
              <g transform={`translate(${fRightX - jLen * 0.8}, ${fCenterY - jR - 8})`}>
                <polyline points="0,0 4,-10 10,-10" fill="none" stroke="#0F172A" strokeWidth="1" />
                <text x="6" y="-13" fontSize="8" fontWeight="600" fill="#0F172A" fontFamily="monospace">
                  Ra 0.8
                </text>
              </g>
            </g>

            {/* ============================================================== */}
            {/* VIEW 2: TOP PLAN VIEW (Orthographically Aligned)               */}
            {/* ============================================================== */}
            <g id="top-plan-view">
              <text
                x={topView.originX}
                y={topView.originY - gearR - 20}
                fontSize="12"
                fontWeight="700"
                fill="#0F172A"
                letterSpacing="1"
              >
                TOP VIEW (PLAN)
              </text>

              {/* Centerline */}
              {showCenterlines && (
                <line
                  x1={topView.originX - 35}
                  y1={topView.originY}
                  x2={topView.originX + totLen + 35}
                  y2={topView.originY}
                  stroke="#64748B"
                  strokeWidth="0.9"
                  strokeDasharray="24, 4, 3, 4"
                />
              )}

              {/* Top View Stepped Cylinders */}
              <rect
                x={topView.originX}
                y={topView.originY - jR}
                width={jLen}
                height={jR * 2}
                fill="#F8FAFC"
                stroke="#0F172A"
                strokeWidth="1.5"
              />
              <rect
                x={topView.originX + jLen}
                y={topView.originY - mainR}
                width={mainLen}
                height={mainR * 2}
                fill="#FFFFFF"
                stroke="#0F172A"
                strokeWidth="1.6"
              />
              <rect
                x={topView.originX + totLen - jLen}
                y={topView.originY - jR}
                width={jLen}
                height={jR * 2}
                fill="#F8FAFC"
                stroke="#0F172A"
                strokeWidth="1.5"
              />

              {/* Top Gear Profile */}
              <rect
                x={topView.cx - gearW / 2}
                y={topView.originY - gearR}
                width={gearW}
                height={gearR * 2}
                fill="#F1F5F9"
                stroke="#0F172A"
                strokeWidth="1.6"
              />

              {/* DIN 6885-1 Form A Keyway Slot with Semicircular Rounded Ends */}
              {(() => {
                const kwL = model.keywayLength * s;
                const kwW = model.keywayWidth * s;
                const kwR = kwW / 2;
                const kwX1 = topView.cx - kwL / 2 + kwR;
                const kwX2 = topView.cx + kwL / 2 - kwR;
                const kwY = topView.originY;

                return (
                  <path
                    d={`
                      M ${kwX1} ${kwY - kwR}
                      L ${kwX2} ${kwY - kwR}
                      A ${kwR} ${kwR} 0 0 1 ${kwX2} ${kwY + kwR}
                      L ${kwX1} ${kwY + kwR}
                      A ${kwR} ${kwR} 0 0 1 ${kwX1} ${kwY - kwR}
                      Z
                    `}
                    fill="#FEF3C7"
                    stroke="#D97706"
                    strokeWidth="1.5"
                  />
                );
              })()}
              <text
                x={topView.cx}
                y={topView.originY + 22}
                fontSize="9"
                textAnchor="middle"
                fill="#B45309"
                fontFamily="monospace"
                fontWeight="600"
              >
                DIN 6885-1 Form A Keyway
              </text>
            </g>

            {/* ============================================================== */}
            {/* VIEW 3: SECTION A-A CROSS-SECTION (Side View Alignment)        */}
            {/* ============================================================== */}
            <g id="section-a-view">
              <text
                x={sideView.cx}
                y={sideView.cy - gearR - 45}
                fontSize="12"
                fontWeight="700"
                textAnchor="middle"
                fill="#0F172A"
                letterSpacing="1"
              >
                SECTION A - A
              </text>
              <text
                x={sideView.cx}
                y={sideView.cy - gearR - 32}
                fontSize="9"
                textAnchor="middle"
                fill="#64748B"
                fontFamily="monospace"
              >
                SCALE {layout.scaleLabel}
              </text>

              {/* Section Centerlines */}
              {showCenterlines && (
                <>
                  <line
                    x1={sideView.cx - gearR - 25}
                    y1={sideView.cy}
                    x2={sideView.cx + gearR + 25}
                    y2={sideView.cy}
                    stroke="#64748B"
                    strokeWidth="0.9"
                    strokeDasharray="20, 3, 2, 3"
                  />
                  <line
                    x1={sideView.cx}
                    y1={sideView.cy - gearR - 25}
                    x2={sideView.cx}
                    y2={sideView.cy + gearR + 25}
                    stroke="#64748B"
                    strokeWidth="0.9"
                    strokeDasharray="20, 3, 2, 3"
                  />
                </>
              )}

              {/* Outer Gear Outline (Tip circle) */}
              <circle
                cx={sideView.cx}
                cy={sideView.cy}
                r={gearR}
                fill="none"
                stroke="#0F172A"
                strokeWidth="1.4"
              />
              {/* Gear Pitch Circle */}
              <circle
                cx={sideView.cx}
                cy={sideView.cy}
                r={gearR * 0.88}
                fill="none"
                stroke="#64748B"
                strokeWidth="0.9"
                strokeDasharray="16, 3, 2, 3"
              />
              {/* Gear Root Circle */}
              <circle
                cx={sideView.cx}
                cy={sideView.cy}
                r={gearR * 0.76}
                fill="none"
                stroke="#94A3B8"
                strokeWidth="0.7"
              />

              {/* Shaft Cross-Section with Keyway Cutout & Hatching */}
              {(() => {
                const kwW = model.keywayWidth * s;
                const kwD = model.keywayDepth * s;
                const topCutY = sideView.cy - mainR;

                return (
                  <g>
                    {/* Hatched Shaft Body with Keyway Slot Recessed at 12 o'clock */}
                    <path
                      d={`
                        M ${sideView.cx - kwW / 2} ${topCutY}
                        L ${sideView.cx - kwW / 2} ${topCutY + kwD}
                        L ${sideView.cx + kwW / 2} ${topCutY + kwD}
                        L ${sideView.cx + kwW / 2} ${topCutY}
                        A ${mainR} ${mainR} 0 1 1 ${sideView.cx - kwW / 2} ${topCutY}
                        Z
                      `}
                      fill={showHatching ? 'url(#cad-section-hatch)' : '#FFFFFF'}
                      stroke="#0F172A"
                      strokeWidth="1.8"
                    />
                  </g>
                );
              })()}
            </g>

            {/* ============================================================== */}
            {/* VIEW 4: ISOMETRIC REFERENCE VIEW (Upper Right)                 */}
            {/* ============================================================== */}
            <g id="isometric-reference-view" transform={`translate(${isometricView.cx}, ${isometricView.cy})`}>
              <rect
                x="-120"
                y="-90"
                width="240"
                height="180"
                fill="#F8FAFC"
                stroke="#CBD5E1"
                strokeWidth="0.8"
                rx="6"
              />
              <text x="-110" y="-72" fontSize="10" fontWeight="700" fill="#0F172A">
                ISOMETRIC REFERENCE VIEW
              </text>
              <text x="-110" y="-58" fontSize="8" fill="#64748B" fontFamily="monospace">
                SOLIDWORKS 3D MODEL
              </text>

              {/* Axonometric Wireframe Projection of Stepped Shaft */}
              <g transform="scale(0.85)">
                {/* Main Cylindrical Body (30 deg axonometric) */}
                <ellipse cx="0" cy="0" rx="36" ry="18" fill="#E2E8F0" stroke="#0F172A" strokeWidth="1.5" />
                <path d="M -36,0 L -75,22 A 36 18 0 0 0 -3,40 L 36,18 A 36 18 0 0 1 -36,0" fill="#CBD5E1" stroke="#0F172A" strokeWidth="1.5" />
                <ellipse cx="-39" cy="22" rx="36" ry="18" fill="#F1F5F9" stroke="#0F172A" strokeWidth="1.5" />

                {/* Left Journal */}
                <path d="M -69,22 L -95,37 A 30 15 0 0 0 -35,52 L -9,37" fill="#94A3B8" stroke="#0F172A" strokeWidth="1.2" />
                <ellipse cx="-65" cy="37" rx="30" ry="15" fill="#E2E8F0" stroke="#0F172A" strokeWidth="1.2" />

                {/* Right Journal */}
                <path d="M 28,0 L 60,-18 A 30 15 0 0 0 0,-33 L -32,-15" fill="#94A3B8" stroke="#0F172A" strokeWidth="1.2" />
                <ellipse cx="30" cy="-18" rx="30" ry="15" fill="#E2E8F0" stroke="#0F172A" strokeWidth="1.2" />

                {/* Midspan Gear Hub 3D */}
                <ellipse cx="-20" cy="11" rx="55" ry="28" fill="#CBD5E1" stroke="#315EDE" strokeWidth="1.8" />
                <ellipse cx="-20" cy="11" rx="42" ry="21" fill="#F8FAFC" stroke="#475569" strokeWidth="0.8" />
              </g>
            </g>

            {/* ============================================================== */}
            {/* DIMENSIONS & EXTENSION LINES (Derived strictly from model)     */}
            {/* ============================================================== */}
            {showDimensions && (
              <g id="dimension-layer">
                {dimensions.map((dim) => {
                  const isHoverable = dim.editable;
                  const labelStr =
                    dim.dimensionType === 'diameter'
                      ? `⌀ ${dim.nominalValue.toFixed(2)}${dim.fitTolerance ? ` ${dim.fitTolerance}` : ''} mm`
                      : dim.dimensionType === 'radius'
                      ? `R ${dim.nominalValue.toFixed(1)} mm`
                      : dim.dimensionType === 'chamfer'
                      ? `${dim.nominalValue} × 45°`
                      : `${dim.nominalValue.toFixed(2)}${dim.fitTolerance ? ` ${dim.fitTolerance}` : ''} mm`;

                  return (
                    <g
                      key={dim.id}
                      onClick={() => isHoverable && handleDimensionClick(dim)}
                      className={isHoverable ? 'cursor-pointer group' : ''}
                    >
                      {/* Witness Extension Lines */}
                      {dim.witnessStart1 && (
                        <line
                          x1={dim.witnessStart1.x}
                          y1={dim.witnessStart1.y}
                          x2={dim.x1}
                          y2={dim.y1 > dim.witnessStart1.y ? dim.y1 + 10 : dim.y1 - 10}
                          stroke="#64748B"
                          strokeWidth="0.8"
                        />
                      )}
                      {dim.witnessStart2 && (
                        <line
                          x1={dim.witnessStart2.x}
                          y1={dim.witnessStart2.y}
                          x2={dim.x2}
                          y2={dim.y2 > dim.witnessStart2.y ? dim.y2 + 10 : dim.y2 - 10}
                          stroke="#64748B"
                          strokeWidth="0.8"
                        />
                      )}

                      {/* Main Dimension Line */}
                      <line
                        x1={dim.x1}
                        y1={dim.y1}
                        x2={dim.x2}
                        y2={dim.y2}
                        stroke={dim.editable ? '#315EDE' : '#1E293B'}
                        strokeWidth={dim.editable ? '1.5' : '1'}
                        markerStart="url(#cad-arrow)"
                        markerEnd="url(#cad-arrow)"
                        className="transition-colors group-hover:stroke-blue-700"
                      />

                      {/* Dimension Text Label */}
                      <g transform={`translate(${dim.textX}, ${dim.textY})`}>
                        {dim.editable && (
                          <rect
                            x={-labelStr.length * 4 - 8}
                            y="-14"
                            width={labelStr.length * 8 + 16}
                            height="18"
                            fill="#EFF6FF"
                            stroke="#315EDE"
                            strokeWidth="1"
                            rx="3"
                            className="transition-all group-hover:fill-blue-100"
                          />
                        )}
                        <text
                          x="0"
                          y="0"
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight={dim.editable ? '700' : '600'}
                          fontFamily="monospace"
                          fill={dim.editable ? '#1D4ED8' : '#0F172A'}
                        >
                          {labelStr}
                        </text>
                        {dim.editable && (
                          <text
                            x="0"
                            y="11"
                            textAnchor="middle"
                            fontSize="7"
                            fontWeight="bold"
                            fill="#315EDE"
                            fontFamily="sans-serif"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            CLICK TO EDIT
                          </text>
                        )}
                      </g>
                    </g>
                  );
                })}
              </g>
            )}

            {/* ============================================================== */}
            {/* TITLE BLOCK (ISO 7200 / DIN 6771 Standard Layout)              */}
            {/* Positioned bottom right inside sheet margins                   */}
            {/* ============================================================== */}
            {(() => {
              const tbW = 480;
              const tbH = 140;
              const tbX = layout.sheet.viewBoxWidth - layout.sheet.marginMm * 4 - tbW;
              const tbY = layout.sheet.viewBoxHeight - layout.sheet.marginMm * 4 - tbH;

              return (
                <g id="title-block" transform={`translate(${tbX}, ${tbY})`}>
                  {/* Outer Frame */}
                  <rect x="0" y="0" width={tbW} height={tbH} fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />

                  {/* Horizontal dividers */}
                  <line x1="0" y1="36" x2={tbW} y2="36" stroke="#0F172A" strokeWidth="1.2" />
                  <line x1="0" y1="72" x2={tbW} y2="72" stroke="#0F172A" strokeWidth="1.2" />
                  <line x1="0" y1="105" x2={tbW} y2="105" stroke="#0F172A" strokeWidth="1" />

                  {/* Vertical dividers */}
                  <line x1="240" y1="0" x2="240" y2="72" stroke="#0F172A" strokeWidth="1" />
                  <line x1="360" y1="0" x2="360" y2="36" stroke="#0F172A" strokeWidth="1" />
                  <line x1="160" y1="72" x2="160" y2="140" stroke="#0F172A" strokeWidth="1" />
                  <line x1="320" y1="72" x2="320" y2="140" stroke="#0F172A" strokeWidth="1" />
                  <line x1="400" y1="105" x2="400" y2="140" stroke="#0F172A" strokeWidth="1" />

                  {/* Field 1: Company / Atelier */}
                  <text x="10" y="16" fontSize="9" fontWeight="bold" fill="#315EDE" letterSpacing="1">
                    MECHANICAL COPILOT INDUSTRIAL ATELIER
                  </text>
                  <text x="10" y="28" fontSize="8" fill="#64748B">
                    ISO 9001 / EN 9100 Precision Engineering Studio
                  </text>

                  {/* Field 2: Part Name */}
                  <text x="10" y="48" fontSize="8" fill="#64748B">PART DESCRIPTION</text>
                  <text x="10" y="62" fontSize="11" fontWeight="bold" fill="#0F172A">
                    {titleBlock.partName}
                  </text>

                  {/* Field 3: Project Name & Drawing No. */}
                  <text x="250" y="16" fontSize="8" fill="#64748B">DRAWING NO.</text>
                  <text x="250" y="30" fontSize="11" fontWeight="bold" fontFamily="monospace" fill="#0F172A">
                    {titleBlock.drawingNumber}
                  </text>

                  <text x="370" y="16" fontSize="8" fill="#64748B">REVISION</text>
                  <text x="370" y="30" fontSize="12" fontWeight="900" fontFamily="monospace" fill="#315EDE">
                    {titleBlock.revision}
                  </text>

                  {/* Field 4: Material & Tolerances */}
                  <text x="250" y="48" fontSize="8" fill="#64748B">MATERIAL SPECIFICATION</text>
                  <text x="250" y="62" fontSize="10" fontWeight="bold" fill="#0F172A">
                    {titleBlock.material}
                  </text>

                  {/* Field 5: Projection Symbol */}
                  <text x="10" y="84" fontSize="8" fill="#64748B">PROJECTION STANDARD</text>
                  <g dangerouslySetInnerHTML={{ __html: getProjectionSymbolSvg(projection, 80, 110) }} />

                  {/* Field 6: Scale & Units */}
                  <text x="170" y="84" fontSize="8" fill="#64748B">SCALE</text>
                  <text x="170" y="98" fontSize="12" fontWeight="bold" fontFamily="monospace" fill="#0F172A">
                    {titleBlock.scale}
                  </text>

                  <text x="240" y="84" fontSize="8" fill="#64748B">UNITS</text>
                  <text x="240" y="98" fontSize="11" fontWeight="bold" fill="#0F172A">
                    {titleBlock.units}
                  </text>

                  <text x="170" y="117" fontSize="8" fill="#64748B">GENERAL TOLERANCES</text>
                  <text x="170" y="131" fontSize="9" fontWeight="bold" fill="#0F172A">
                    {titleBlock.generalTolerances}
                  </text>

                  {/* Field 7: Author & Date */}
                  <text x="330" y="84" fontSize="8" fill="#64748B">ENGINEERING AUTHOR</text>
                  <text x="330" y="98" fontSize="9" fontWeight="600" fill="#0F172A">
                    {titleBlock.author}
                  </text>

                  <text x="330" y="117" fontSize="8" fill="#64748B">DATE</text>
                  <text x="330" y="131" fontSize="9" fontFamily="monospace" fill="#0F172A">
                    {titleBlock.date}
                  </text>

                  <text x="410" y="117" fontSize="8" fill="#64748B">STATUS</text>
                  <text
                    x="410"
                    y="131"
                    fontSize="10"
                    fontWeight="900"
                    fill={drawingStatus === 'APPROVED' ? '#16A34A' : '#DC2626'}
                  >
                    {titleBlock.status}
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* Floating Bottom View / Navigation pill */}
      <div className="absolute bottom-4 left-6 z-20 flex items-center space-x-2 bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#D9DFED] dark:border-white/10 shadow-lg text-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold text-gray-700 dark:text-gray-300">
          Geometric Associativity:
        </span>
        <span className="text-gray-500 dark:text-gray-400 font-mono">
          Front, Top, Section A-A & 3D Model Synced
        </span>
      </div>

      {/* Dimension Editor Modal */}
      <DimensionEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        dimension={selectedDimension}
        designParams={designParams}
        onSaveDimension={handleSaveDimension}
      />
    </div>
  );
};
