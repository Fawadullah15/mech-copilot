/**
 * Data contracts and type definitions for Stage 11 Vibration, Critical Speeds & Dynamic Analysis.
 * Governing Standards: ISO 20816-1:2016, ISO 20816-3:2022, ISO 21940-11:2016 (Amd 1:2022), ISO 21940-12:2016.
 */

export type SupportType = 'rigid_pinned' | 'rigid_fixed' | 'flexible_spring' | 'free';

export interface ShaftSegmentInput {
  id: string;
  length: number;              // mm
  outerDiameter: number;       // mm
  innerDiameter?: number;      // mm (0 for solid shaft)
  materialId: string;
  elasticModulus?: number;     // GPa (overrides material lookup if provided)
  density?: number;            // kg/m³ (overrides material lookup if provided)
  poissonsRatio?: number;
}

export interface LumpedMassInput {
  id: string;
  stationZ: number;            // mm along shaft from left end (z = 0)
  mass: number;                // kg
  diametralInertia?: number;   // kg·m² (optional rotordynamic tilt inertia)
  polarInertia?: number;       // kg·m² (optional polar spin inertia)
  label: string;               // e.g. 'Pinion Gear', 'Flywheel', 'Coupling'
}

export interface BearingSupportInput {
  id: string;
  stationZ: number;            // mm along shaft
  type: SupportType;
  radialStiffness: number;     // N/m (applied if type === 'flexible_spring')
  radialDamping?: number;      // N·s/m (viscous damping)
  label: string;               // e.g. 'Bearing A (Drive end)', 'Bearing B (Non-drive)'
  provenance?: string;         // e.g. 'Manufacturer bearing housing specification', 'Rigid assumption'
}

export interface RotorSystemInput {
  segments: ShaftSegmentInput[];
  supports: BearingSupportInput[];
  lumpedMasses?: LumpedMassInput[];
  operatingSpeedRpm: number;
  operatingSpeedRangeRpm?: [number, number]; // [min, max] rpm
  meshElementMaxLenMm?: number; // default 20 mm for fine Euler-Bernoulli mesh
}

export interface ModeShapePoint {
  z: number;                   // mm from left shaft end
  deflection: number;          // normalized displacement [-1, 1]
  slope: number;               // normalized rotation (rad)
}

export interface NaturalModeResult {
  modeNumber: number;          // 1-indexed (1, 2, 3...)
  angularFrequencyRadS: number;// omega (rad/s)
  frequencyHz: number;         // f = omega / (2*pi) (Hz)
  synchronousSpeedRpm: number; // nc = 60 * f (rpm)
  isRigidBody: boolean;        // true if omega near 0 (< 0.1 rad/s)
  modalMassKg: number;         // phi^T * M * phi
  modalStiffnessNM: number;    // phi^T * K * phi
  rayleighFrequencyHz?: number;// Rayleigh quotient frequency check
  modeShape: ModeShapePoint[]; // Discretized mode shape along shaft
}

export interface AnalyticalBenchmarks {
  simplySupportedFirstModeHz: number; // Closed-form continuous beam: (pi/2 / L^2) * sqrt(EI / rho*A)
  rayleighFirstModeHz: number;        // Rayleigh static deflection quotient
  dunkerleyFirstModeHz?: number;      // Dunkerley lower-bound approximation (shaft + lumped mass)
}

export interface ModalAnalysisResult {
  modes: NaturalModeResult[];
  benchmarks: AnalyticalBenchmarks;
  solverDiagnostics: {
    totalElements: number;
    totalNodes: number;
    totalDof: number;
    constrainedDof: number;
    activeDof: number;
    jacobiSweeps: number;
    maxResidual: number;
    matrixConditionOk: boolean;
  };
  totalRotorMassKg: number;
  totalLengthMm: number;
  centerOfGravityZMm: number;
}

export interface CriticalSpeedCheck {
  modeNumber: number;
  criticalSpeedRpm: number;
  frequencyHz: number;
  operatingSpeedRpm: number;
  deltaRpm: number;            // abs(operatingSpeedRpm - criticalSpeedRpm)
  separationPercent: number;   // deltaRpm / criticalSpeedRpm * 100
  status: 'safe' | 'warning' | 'critical';
  crossesOperatingRange: boolean;
  message: string;
}

export interface CriticalSpeedAssessment {
  checks: CriticalSpeedCheck[];
  operatingSpeedRpm: number;
  operatingRangeRpm: [number, number];
  recommendedMarginPercent: number; // e.g. 15% or 20%
  overallStatus: 'safe' | 'warning' | 'critical';
  assumptions: string[];
  omissionsAndWarnings: string[];
}

export interface ImbalanceResponseInput {
  unbalanceGMm: number;        // g·mm (or kg·m * 1e6)
  stationZ?: number;           // mm along shaft where unbalance acts
  speedRangeRpm: [number, number]; // [start, stop] rpm
  speedStepRpm?: number;       // default e.g. 50 rpm
  dampingRatio?: number;       // modal damping ratio zeta (default 0.03 = 3%)
  effectiveStiffnessNM?: number;
  effectiveMassKg?: number;
}

export interface ImbalanceSweepPoint {
  speedRpm: number;
  frequencyHz: number;
  angularVelocityRadS: number;
  excitationForceN: number;    // Fu = U * Omega^2
  amplitudeUm: number;         // displacement amplitude in micrometers (µm)
  amplitudeMm: number;         // displacement amplitude in mm
  phaseDeg: number;            // phase lag angle in degrees
}

export interface ImbalanceResponseResult {
  unbalanceMagnitudeGMm: number;
  unbalanceMagnitudeKgM: number;
  dampingRatio: number;
  amplificationFactorQ: number; // Q = 1 / (2 * zeta)
  resonantSpeedRpm: number;
  peakAmplitudeUm: number;
  peakExcitationForceN: number;
  sweep: ImbalanceSweepPoint[];
  governingEquation: string;
  assumptions: string[];
  limitations: string[];
}

export interface ExcitationOrder {
  orderName: string;           // '1X (Running Speed)', '2X (Double)', 'Gear Mesh'
  multiplier: number;          // 1, 2, 3... or gear tooth count z
  frequencyHz: number;         // order * n / 60
  speedRpm: number;
  nearResonanceWithMode?: number; // mode number if within 10% of fn
  frequencyMarginPercent?: number;
}

export interface ExcitationOrdersResult {
  operatingSpeedRpm: number;
  runningFrequencyHz: number;  // 1X
  orders: ExcitationOrder[];
  gearMeshFrequencyHz?: number;
  gearToothCount?: number;
}

export type BalanceQualityGrade = 'G0.4' | 'G1' | 'G2.5' | 'G6.3' | 'G16' | 'G40';

export interface RigidRotorBalancingInput {
  rotorMassKg: number;
  serviceSpeedRpm: number;
  grade: BalanceQualityGrade;
  correctionPlanes: 'single' | 'two';
  planeADistanceMm?: number;   // from left reference
  planeBDistanceMm?: number;   // from left reference
  cgDistanceMm?: number;       // center of gravity position
}

export interface RigidRotorBalancingResult {
  grade: BalanceQualityGrade;
  gradeValueMmS: number;       // e.g. 2.5 mm/s
  serviceSpeedRpm: number;
  serviceSpeedRadS: number;
  rotorMassKg: number;
  permissibleSpecificUnbalanceUpm: number; // e_per [um or g*mm/kg]
  permissibleResidualUnbalanceGMm: number; // U_per [g*mm]
  planeAllocation: {
    planes: 'single' | 'two';
    planeAGMm: number;
    planeBGMm?: number;
  };
  standardReference: string;   // 'ISO 21940-11:2016 (Amd 1:2022)'
  assumptions: string[];
  limitations: string[];
}
