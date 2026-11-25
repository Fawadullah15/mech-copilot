// ─── Supported Engineering Units ──────────────────────────────────
export type LengthUnit = 'mm' | 'm' | 'inch';
export type TorqueUnit = 'N·m' | 'N·mm' | 'lb-ft';
export type StressUnit = 'Pa' | 'MPa' | 'GPa' | 'psi';
export type ForceUnit = 'N' | 'kN' | 'lbf';
export type PowerUnit = 'W' | 'kW' | 'hp';
export type AngleUnit = 'rad' | 'deg';

// ─── Failure / Yield Criteria ─────────────────────────────────────
export type YieldCriterion = 'Tresca' | 'Von Mises';

// ─── Calculation Status ───────────────────────────────────────────
export type CalculationStatus = 'pass' | 'warning' | 'fail';

// ─── Standard Engineering Result Data Contract ─────────────────────
export interface EngineeringCalculationResult<TResult, TInputs = unknown> {
  calculationType: string;
  name: string;
  model: string;
  formula: string;
  inputs: TInputs;
  normalizedInputsSI: Record<string, number>;
  result: TResult;
  displayValue: string;
  displayUnit: string;
  assumptions: string[];
  warnings: string[];
  disclaimer: string;
  status: CalculationStatus;
}

// ─── Input Types ──────────────────────────────────────────────────
export interface ValueWithUnit<U extends string> {
  value: number;
  unit: U;
}

export interface TorsionCalculationInputs {
  torque: ValueWithUnit<TorqueUnit> | number; // default N·m if number
  diameter: ValueWithUnit<LengthUnit> | number; // default mm if number
  yieldStrength?: ValueWithUnit<StressUnit> | number; // default MPa if number
  targetSafetyFactor?: number;
}

export interface TorsionResultData {
  polarMomentOfInertia: number; // m^4
  polarMomentOfInertiaMm4: number; // mm^4
  polarSectionModulus: number; // m^3
  polarSectionModulusMm3: number; // mm^3
  shearStressPa: number; // Pa
  shearStressMPa: number; // MPa
  allowableShearStressMPa?: number; // MPa
  minRequiredDiameterMm?: number; // mm
  stressRatio?: number;
}

export interface BendingCalculationInputs {
  bendingMoment?: ValueWithUnit<TorqueUnit> | number; // N·m
  force?: ValueWithUnit<ForceUnit> | number; // N (if computing from central point load)
  length?: ValueWithUnit<LengthUnit> | number; // mm (if computing from central point load)
  diameter: ValueWithUnit<LengthUnit> | number; // mm
  allowableYieldStrength?: ValueWithUnit<StressUnit> | number; // MPa
}

export interface BendingResultData {
  bendingMomentNm: number;
  areaMomentOfInertiaM4: number;
  areaMomentOfInertiaMm4: number;
  sectionModulusM3: number;
  sectionModulusMm3: number;
  bendingStressPa: number;
  bendingStressMPa: number;
  allowableStressMPa?: number;
}

export interface CombinedStressInputs {
  bendingStressMPa: number;
  shearStressMPa: number;
  yieldStrengthMPa: number;
  criterion?: YieldCriterion;
  targetSafetyFactor?: number;
}

export interface CombinedStressResultData {
  criterion: YieldCriterion;
  bendingStressMPa: number;
  shearStressMPa: number;
  principalStress1MPa: number;
  principalStress2MPa: number;
  maxShearStressMPa: number;
  equivalentStressMPa: number;
  allowableStressMPa: number;
  factorOfSafety: number;
  marginPercent: number;
}

export interface SafetyFactorInputs {
  strengthMPa: number;
  appliedStressMPa: number;
  targetSafetyFactor: number;
  type?: 'yield' | 'fatigue';
}

export interface SafetyFactorResultData {
  factorOfSafety: number;
  targetFactorOfSafety: number;
  marginPercent: number;
  allowableStressMPa: number;
  appliedStressMPa: number;
  type: 'yield' | 'fatigue';
}

export interface PowerInputs {
  torque: ValueWithUnit<TorqueUnit> | number; // N·m
  rpm: number; // rev/min
}

export interface PowerResultData {
  angularVelocityRadS: number;
  powerWatts: number;
  powerKW: number;
  powerHp: number;
}

export interface DeflectionInputs {
  force: ValueWithUnit<ForceUnit> | number; // N
  length: ValueWithUnit<LengthUnit> | number; // mm
  diameter: ValueWithUnit<LengthUnit> | number; // mm
  elasticModulus: ValueWithUnit<StressUnit> | number; // GPa
  loadModel?: string;
  deflectionLimitRatio?: number; // Configurable ratio, default 1000 for L/1000
}

export interface DeflectionResultData {
  areaMomentOfInertiaM4: number;
  maxDeflectionM: number;
  maxDeflectionMm: number;
  allowableDeflectionMm?: number;
  slopeAtSupportsRad: number;
  deflectionLimitRatio?: number;
  deflectionCriterionDescription?: string;
}

export interface CompositeShaftAnalysisInputs {
  torqueNm: number;
  radialForceN: number;
  diameterMm: number;
  lengthMm: number;
  rpm: number;
  yieldStrengthMPa: number;
  tensileStrengthMPa: number;
  elasticModulusGPa: number;
  targetSafetyFactor: number;
  operatingTempC: number;
  criterion?: YieldCriterion;
  deflectionLimitRatio?: number;
}

export interface CompositeShaftAnalysisResult {
  torsion: EngineeringCalculationResult<TorsionResultData>;
  bending: EngineeringCalculationResult<BendingResultData>;
  combinedStress: EngineeringCalculationResult<CombinedStressResultData>;
  deflection: EngineeringCalculationResult<DeflectionResultData>;
  power: EngineeringCalculationResult<PowerResultData>;
  safetyFactor: EngineeringCalculationResult<SafetyFactorResultData>;
  overallStatus: CalculationStatus;
  summary: string;
  minRequiredDiameterMm?: number;
  torsionOnlyMinDiameterMm?: number;
  combinedStressDiameterMm?: number;
  deflectionGovernedDiameterMm?: number;
  governingConstraint?: 'torsion_stress' | 'combined_stress' | 'deflection_stiffness';
  bisectionIterations?: number;
}

export interface SolveMinimumDiameterInputs {
  torqueNm: number;
  radialForceN?: number;
  lengthMm?: number;
  bendingMomentNm?: number;
  yieldStrengthMPa: number;
  targetSafetyFactor?: number;
  criterion?: YieldCriterion;
  elasticModulusGPa?: number;
  deflectionLimitRatio?: number;
}

export interface CombinedDiameterSolution {
  requiredDiameterMm: number;
  torsionOnlyDiameterMm: number;
  combinedStressDiameterMm: number;
  deflectionGovernedDiameterMm?: number;
  governingConstraint: 'torsion_stress' | 'combined_stress' | 'deflection_stiffness';
  criterion: YieldCriterion;
  bisectionIterations: number;
  achievedToleranceMm: number;
  allowableStressMPa: number;
  peakBendingMomentNm: number;
  formula: string;
  assumptions: string[];
}
