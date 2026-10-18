import type { Material, DesignParameters } from '../../types';

export type ConstraintType =
  | 'yield_stress'
  | 'deflection'
  | 'bearing_slope'
  | 'torsional_twist'
  | 'temperature'
  | 'slenderness';

export interface ConstraintResult {
  type: ConstraintType;
  name: string;
  governingStandardOrRule: string;
  status: 'pass' | 'warning' | 'fail';
  actualValue: number;
  allowableValue: number;
  unit: string;
  utilizationRatio: number;
  message: string;
  remedy?: string;
}

export interface MaterialSuitabilityEvaluation {
  material: Material;
  overallStatus: 'pass' | 'warning' | 'fail';
  suitabilityScore: number; // 0 - 100 ranking score
  massKg: number;
  specificStrength: number; // Yield / (density/1000) in kN·m/kg
  torsionalTwistDegPerMeter: number;
  centerDeflectionMm: number;
  bearingSlopeRad: number;
  vonMisesStressMPa: number;
  factorOfSafety: number;
  relativeWeightVsBaselinePercent: number; // relative to active material (%)
  governingConstraint: ConstraintResult;
  allConstraints: ConstraintResult[];
  recommendationSummary: string;
  tradeoffInsight: string;
}

export interface ConstraintEvaluationInputs {
  material: Material;
  params: DesignParameters;
  targetSafetyFactor?: number;
  baselineMaterial?: Material;
}
