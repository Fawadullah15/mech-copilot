import type { DesignParameters, Material } from '../../types';

export type DrawingSheetSize = 'A4' | 'A3' | 'A2';
export type DrawingOrientation = 'landscape' | 'portrait';
export type ProjectionAngle = 'first-angle' | 'third-angle';
export type DrawingStatus = 'DRAFT' | 'PRELIMINARY' | 'APPROVED' | 'OBSOLETE';
export type DrawingViewType = 'front' | 'top' | 'side' | 'isometric' | 'section-a';

export interface SheetDimensions {
  widthMm: number;
  heightMm: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  marginMm: number;
}

export interface DrawingDimension {
  id: string;
  parameterKey?: keyof DesignParameters;
  label: string;
  nominalValue: number;
  unit: string;
  dimensionType: 'linear-length' | 'diameter' | 'radius' | 'chamfer' | 'angular';
  fitTolerance?: string; // e.g. "k5", "m5", "P9"
  upperDevMm?: number;
  lowerDevMm?: number;
  editable: boolean;
  view: DrawingViewType;
  // Canvas placement
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  textX: number;
  textY: number;
  orientation: 'horizontal' | 'vertical' | 'radial';
  witnessStart1?: { x: number; y: number };
  witnessStart2?: { x: number; y: number };
}

export interface DrawingTitleBlock {
  company: string;
  projectName: string;
  partName: string;
  drawingNumber: string;
  revision: string;
  units: string;
  scale: string;
  material: string;
  generalTolerances: string;
  surfaceFinishGeneral: string;
  projection: ProjectionAngle;
  author: string;
  checker: string;
  date: string;
  status: DrawingStatus;
  sheet: string;
}

export interface ManufacturingSpec {
  materialSpec: {
    name: string;
    standard: string;
    condition: string;
    hardness: string;
    yieldStrengthMPa: number;
    tensileStrengthMPa: number;
  };
  overallDimensions: {
    diameterMm: number;
    lengthMm: number;
    roughWeightKg: number;
    finishWeightKg: number;
  };
  bearingSeats: Array<{
    journal: 'Left (Locating Support)' | 'Right (Floating Support)';
    nominalDiaMm: number;
    fitClass: string;
    upperDevUm: number;
    lowerDevUm: number;
    surfaceFinishRa: number;
    widthMm: number;
  }>;
  gearSeat: {
    nominalDiaMm: number;
    fitClass: string;
    upperDevUm: number;
    lowerDevUm: number;
    surfaceFinishRa: number;
    widthMm: number;
  };
  keyway: {
    standard: string;
    form: string;
    widthMm: number;
    fitClass: string;
    depthMm: number;
    lengthMm: number;
    filletRadiusMm: number;
  };
  gdtRequirements: Array<{
    feature: string;
    characteristic: string;
    symbol: string;
    toleranceMm: number;
    datumRef: string;
    note: string;
  }>;
  processRouting: Array<{
    step: number;
    operation: string;
    machine: string;
    description: string;
  }>;
  generalNotes: string[];
}

export interface VerificationCheck {
  id: string;
  category:
    | 'GEOMETRY'
    | 'DIMENSIONS'
    | 'INPUTS'
    | 'MATERIAL'
    | 'CALCULATIONS'
    | 'SAFETY_FACTOR'
    | 'DRAWING'
    | 'TOLERANCES'
    | 'WARNINGS';
  title: string;
  status: 'Passed' | 'Warning' | 'Failed' | 'Not checked';
  evaluatedValue: string;
  requiredValue: string;
  message: string;
  standardReference: string;
  timestamp: string;
}

export interface DesignVerificationReport {
  overallStatus: 'Passed' | 'Warning' | 'Failed' | 'Not checked';
  totalChecks: number;
  passedCount: number;
  warningCount: number;
  failedCount: number;
  notCheckedCount: number;
  evaluatedAt: string;
  checks: VerificationCheck[];
  disclaimer: string;
}

export interface DrawingExportOptions {
  format: 'svg' | 'pdf' | 'png' | 'json';
  scale: number;
  includeTitleBlock: boolean;
  includeTolerances: boolean;
  includeAnnotations: boolean;
  watermarkDraft: boolean;
}
