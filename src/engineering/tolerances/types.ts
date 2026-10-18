/**
 * ISO 286 Limits and Fits & Dimensional Engineering Data Models
 * Conforming to ISO 286-1:2010 and ISO 286-2:2010
 */

export interface DiameterStep {
  stepIndex: number;
  minMm: number; // exclusive (except for 0)
  maxMm: number; // inclusive
  label: string; // e.g. "Over 30 up to 50 mm"
}

export type ToleranceGrade =
  | 'IT5'
  | 'IT6'
  | 'IT7'
  | 'IT8'
  | 'IT9'
  | 'IT10'
  | 'IT11';

export type HoleClass =
  | 'H6'
  | 'H7'
  | 'H8'
  | 'H9'
  | 'H11'
  | 'JS7';

export type ShaftClass =
  | 'h6'
  | 'h7'
  | 'h8'
  | 'h9'
  | 'g6'
  | 'f7'
  | 'e8'
  | 'd11'
  | 'js6'
  | 'k6'
  | 'm6'
  | 'n6'
  | 'p6'
  | 'r6'
  | 's6';

export type FitType = 'clearance' | 'transition' | 'interference';

export interface ToleranceLimit {
  nominalMm: number;
  toleranceClass: string;
  upperDeviationUm: number; // ES for hole, es for shaft (µm)
  lowerDeviationUm: number; // EI for hole, ei for shaft (µm)
  upperDeviationMm: number;
  lowerDeviationMm: number;
  maxDimensionMm: number;
  minDimensionMm: number;
  toleranceGrade: ToleranceGrade;
  toleranceZoneUm: number; // IT value in µm
}

export interface FitCalculationResult {
  designation: string; // e.g. "45 H7/h6"
  nominalDiameterMm: number;
  diameterStep: DiameterStep;
  holeClass: string;
  shaftClass: string;
  holeLimits: ToleranceLimit;
  shaftLimits: ToleranceLimit;
  fitType: FitType;
  minClearanceMm: number;
  maxClearanceMm: number;
  minClearanceUm: number;
  maxClearanceUm: number;
  minInterferenceMm: number;
  maxInterferenceMm: number;
  minInterferenceUm: number;
  maxInterferenceUm: number;
  fitToleranceUm: number; // Hole IT + Shaft IT
  standardReference: string;
  verificationStatus: 'verified' | 'unsupported';
  functionalDescription: string;
  assemblyGuidance: string;
  warnings: string[];
  limitations: string[];
}

export interface StandardFitDefinition {
  designation: string; // e.g. "H7/h6"
  holeClass: HoleClass;
  shaftClass: ShaftClass;
  category: 'Clearance' | 'Transition' | 'Interference';
  name: string; // e.g. "Precision Sliding / Location Fit"
  typicalApplications: string; // e.g. "Spigots, keyed gears, removable couplings"
  assemblyMethod: string; // e.g. "Assembles freely by hand without mechanical force"
}

// ─── 1D Dimensional Stack-Up Types ─────────────────────────────────────

export type StackUpDirection = 1 | -1; // +1 increases assembly gap/length, -1 decreases

export interface StackUpComponent {
  id: string;
  name: string;
  nominalMm: number;
  upperTolMm: number; // e.g. +0.025
  lowerTolMm: number; // e.g. -0.010 or 0
  direction: StackUpDirection;
  description?: string;
}

export interface StackUpContributor {
  component: StackUpComponent;
  minMm: number;
  maxMm: number;
  toleranceRangeMm: number;
  worstCasePercent: number;
  rssVariancePercent: number;
}

export interface StackUpResult {
  nominalAssemblyMm: number;
  worstCaseMinMm: number;
  worstCaseMaxMm: number;
  worstCaseVariationMm: number;
  rssMinMm: number;
  rssMaxMm: number;
  rssVariationMm: number;
  contributors: StackUpContributor[];
  topDriver: StackUpContributor;
  assumptions: string[];
  disclaimer: string;
}
