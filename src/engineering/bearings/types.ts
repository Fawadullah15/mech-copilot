/**
 * Engineering Bearing & Support Reactions Types
 * Conforms to ISO 281:2007 (Dynamic ratings & L10 life) and ISO 76:2006 (Static ratings).
 */

export type BearingType =
  | 'deep_groove_ball'
  | 'cylindrical_roller'
  | 'angular_contact_ball'
  | 'tapered_roller';

export type SupportArrangement = 'locating_floating' | 'cross_located';

export type LocatingSupportId = 'A' | 'B';

/**
 * Point transverse load applied to shaft.
 * x: axial station along shaft from left origin (mm)
 * Fy: vertical transverse force (N, positive upwards, negative downwards)
 * Fz: horizontal transverse force (N, orthogonal to vertical)
 * My: optional applied couple/moment about y axis (N·mm)
 * Mz: optional applied couple/moment about z axis (N·mm)
 */
export interface ShaftTransverseLoad {
  id: string;
  name: string;
  x: number; // mm
  Fy: number; // N
  Fz: number; // N
  My?: number; // N·mm
  Mz?: number; // N·mm
}

/**
 * Axial thrust load applied to shaft.
 * x: axial station along shaft (mm)
 * Fa: axial force in N (positive towards +x, negative towards -x)
 */
export interface ShaftAxialLoad {
  id: string;
  name: string;
  x: number; // mm
  Fa: number; // N
}

/**
 * Support bearing station location.
 */
export interface SupportStation {
  id: 'A' | 'B';
  name: string;
  x: number; // mm
}

/**
 * Computed reaction forces on a single bearing support.
 */
export interface SupportReaction {
  stationId: 'A' | 'B';
  name: string;
  x: number; // mm
  Ry: number; // N (vertical reaction force supporting shaft)
  Rz: number; // N (horizontal reaction force supporting shaft)
  Fr: number; // N (total resultant radial load on bearing = sqrt(Ry^2 + Rz^2))
  Fa: number; // N (allocated axial thrust load on this bearing)
}

/**
 * Complete reaction solver result with static equilibrium residuals.
 */
export interface ReactionSolverResult {
  reactions: {
    A: SupportReaction;
    B: SupportReaction;
  };
  appliedLoadsSummary: {
    totalFy: number; // N
    totalFz: number; // N
    totalFa: number; // N
    resultantTransverse: number; // N
    pointLoadCount: number;
  };
  equilibriumCheck: {
    sumFy: number; // N (should be near 0)
    sumFz: number; // N (should be near 0)
    sumFa: number; // N (should be near 0)
    sumMzAtA: number; // N·mm (should be near 0)
    sumMyAtA: number; // N·mm (should be near 0)
    maxForceResidual: number; // N
    maxMomentResidual: number; // N·mm
    isEquilibriumSatisfied: boolean;
  };
  span: number; // mm (xB - xA)
  shaftLength: number; // mm
  arrangement: SupportArrangement;
  locatingStation: LocatingSupportId;
}

/**
 * Standard bearing catalog specification.
 */
export interface BearingCatalogItem {
  id: string;
  designation: string;
  type: BearingType;
  typeName: string;
  d: number; // bore diameter (mm)
  D: number; // outer diameter (mm)
  B: number; // width (mm)
  C: number; // basic dynamic load rating (N)
  C0: number; // basic static load rating (N)
  limitingSpeedRpm: number;
  referenceSpeedRpm: number;
  e?: number; // limiting ratio Fa/Fr
  Y?: number; // dynamic axial load factor (Fa/Fr > e)
  Y0?: number; // static axial load factor
  massKg: number;
  standard: string;
  notes?: string;
}

/**
 * Equivalent dynamic load result per ISO 281:2007.
 */
export interface EquivalentLoadResult {
  Fr: number; // N
  Fa: number; // N
  ratioFaFr: number;
  e: number;
  X: number;
  Y: number;
  P: number; // N (Equivalent dynamic load = X*Fr + Y*Fa)
  governingCondition: string;
  isPureRadial: boolean;
  warning?: string;
}

/**
 * Basic dynamic rating life per ISO 281:2007.
 */
export interface L10RatingLifeResult {
  L10RevolutionsMillions: number; // 10^6 revolutions
  L10Hours: number; // operating hours at design RPM
  rpm: number;
  p: number; // 3 for ball bearings, 10/3 for roller bearings
  dynamicCapacityC: number; // N
  equivalentLoadP: number; // N
  status: 'adequate' | 'marginal' | 'inadequate';
  statusMessage: string;
  assumptions: string[];
  limitations: string[];
}

/**
 * Static rating safety check per ISO 76:2006.
 */
export interface StaticSafetyResult {
  P0: number; // N (Static equivalent load = X0*Fr + Y0*Fa)
  X0: number;
  Y0: number;
  C0: number; // N (Basic static load rating)
  s0: number; // Static safety factor = C0 / P0
  status: 'safe' | 'caution' | 'brinelling_risk';
  statusMessage: string;
  guidance: string;
}

/**
 * Evaluation for a specific bearing candidate installed at a support station.
 */
export interface BearingEvaluation {
  stationId: 'A' | 'B';
  reaction: SupportReaction;
  bearing: BearingCatalogItem;
  equivalentDynamicLoad: EquivalentLoadResult;
  dynamicLife: L10RatingLifeResult;
  staticSafety: StaticSafetyResult;
}

/**
 * Complete bearing subsystem analysis result for the shaft.
 */
export interface CompleteBearingAnalysis {
  shaftLength: number;
  shaftDiameter: number;
  rpm: number;
  reactions: ReactionSolverResult;
  stationA: BearingEvaluation;
  stationB: BearingEvaluation;
  overallStatus: 'pass' | 'warning' | 'fail';
  summary: string;
}
