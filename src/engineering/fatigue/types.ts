/**
 * Fatigue, Stress Concentrations & S-N Curve Types
 * Conforming to Shigley (11th Ed.), Peterson (4th Ed.), ISO 1099, ISO 12107, and ASTM E466.
 */

export type LoadingMode = 'bending' | 'torsion' | 'axial' | 'combined';

export type NotchType = 'stepped_shoulder_fillet' | 'profile_keyway' | 'sled_runner_keyway';

export type ParameterProvenance = 'imported' | 'user-entered' | 'calculated' | 'assumed';

export type MeanStressCriterion = 'goodman' | 'gerber' | 'soderberg' | 'asme_elliptic';

export type SurfaceFinish = 'ground' | 'machined' | 'hot-rolled' | 'as-forged';

export interface SteppedShaftFilletGeometry {
  smallDiameterMm: number; // d
  largeDiameterMm: number; // D
  filletRadiusMm: number;   // r
  dProvenance: ParameterProvenance;
  DProvenance: ParameterProvenance;
  rProvenance: ParameterProvenance;
}

export interface KeywayGeometry {
  shaftDiameterMm: number; // d
  keywayWidthMm: number;   // b
  keywayDepthMm: number;   // t
  filletRadiusMm: number;  // r_k (corner fillet)
  keywayType: 'profile_keyway' | 'sled_runner_keyway';
  provenance: ParameterProvenance;
}

export interface StressConcentrationResult {
  notchType: NotchType;
  loadingMode: LoadingMode;
  kt: number;   // Normal theoretical elastic stress concentration factor
  kts: number;  // Shear theoretical elastic stress concentration factor
  isSupported: boolean;
  outOfRangeReason?: string;
  applicableRange: {
    dOverDMin: number;
    dOverDMax: number;
    rOverDMin: number;
    rOverDMax: number;
  };
  rOverD: number;
  DOverD: number;
  sourceReference: string;
  method: 'analytical_fit' | 'interpolated' | 'standard_constant';
  disclaimer: string;
}

export interface NotchSensitivityResult {
  model: 'Peterson' | 'Neuber';
  q: number;   // Bending / Normal notch sensitivity (0 <= q <= 1)
  qs: number;  // Shear notch sensitivity (0 <= qs <= 1)
  kf: number;  // Normal fatigue stress concentration factor: 1 + q(Kt - 1)
  kfs: number; // Shear fatigue stress concentration factor: 1 + qs(Kts - 1)
  notchRadiusMm: number;
  materialConstantMm: number; // Peterson 'a' or Neuber sqrt(rho*)
  sourceReference: string;
  assumptions: string[];
}

export interface SnDataPoint {
  cycles: number;
  stressMpa: number;
  source?: string;
}

export interface MaterialFatigueData {
  materialId: string;
  materialName: string;
  condition: string;
  tensileStrengthMpa: number; // Sut
  yieldStrengthMpa: number;   // Sy
  unmodifiedEnduranceLimitMpa: number; // S'e (rotary beam test specimen)
  hasEndurancePlateau: boolean;        // True for ferrous steels, false for aluminum
  enduranceCycles: number;             // e.g. 1e6 for steel, 5e8 for aluminum
  basquinA: number;                    // Sa = A * N^b
  basquinB: number;                    // Log-log slope
  validCycleRange: {
    min: number; // typically 1e3
    max: number; // 1e7 for steel, 5e8 for aluminum
  };
  snPoints: SnDataPoint[];
  dataSource: 'measured_test' | 'fitted_experimental' | 'empirical_screening' | 'user_imported';
  provenanceCitation: string;
  uncertaintyNotes?: string;
}

export interface MarinFactors {
  ka: number; // Surface finish factor
  kb: number; // Size factor
  kc: number; // Loading factor (1.0 bending, 0.85 axial, 0.59 torsion)
  kd: number; // Temperature factor
  ke: number; // Reliability factor
  kf: number; // Miscellaneous effects factor (default 1.0)
  modifiedEnduranceLimitMpa: number; // Se = ka * kb * kc * kd * ke * kf * S'e
  details: {
    surfaceFinish: SurfaceFinish;
    diameterMm: number;
    loadingMode: LoadingMode;
    operatingTempC: number;
    reliabilityPercent: number;
    formulaCitation: string;
    warnings: string[];
  };
}

export interface CyclicLoadingInput {
  maxBendingMomentNm?: number;
  minBendingMomentNm?: number;
  maxTorqueNm?: number;
  minTorqueNm?: number;
  maxStressMpa?: number;
  minStressMpa?: number;
  alternatingStressMpa?: number;
  meanStressMpa?: number;
  rpm?: number;
}

export interface FatigueEvaluationResult {
  nominalAlternatingStressMpa: number;
  nominalMeanStressMpa: number;
  peakAlternatingStressMpa: number; // Kf * sigma_a
  peakMeanStressMpa: number;        // Kfm * sigma_m
  stressRatioR: number;            // sigma_min / sigma_max
  amplitudeRatioA: number;         // sigma_a / sigma_m
  modifiedEnduranceLimitMpa: number;
  criterion: MeanStressCriterion;
  fatigueSafetyFactor: number;     // nf
  staticYieldSafetyFactor: number; // ny = Sy / sigma_max
  isInfiniteLife: boolean;
  estimatedCycles: number | 'infinite' | 'lcf_out_of_domain';
  estimatedHours?: number | 'infinite';
  governingFailureMode: 'fatigue' | 'static_yield' | 'infinite_life';
  equivalentReversedStressMpa: number;
  warnings: string[];
  assumptions: string[];
  modelValidityDomain: string;
}
