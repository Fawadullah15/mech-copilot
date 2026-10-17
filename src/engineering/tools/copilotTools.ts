import {
  LengthUnit,
  TorqueUnit,
  StressUnit,
  ForceUnit,
  YieldCriterion,
  EngineeringCalculationResult,
  TorsionResultData,
  BendingResultData,
  DeflectionResultData,
  PowerResultData,
  SafetyFactorResultData,
  CompositeShaftAnalysisResult
} from '../types/engineering';
import {
  calculateShaftTorsion,
  calculateRequiredTorsionDiameter
} from '../calculations/torsion';
import { calculateShaftBending } from '../calculations/bending';
import { calculateShaftDeflection } from '../calculations/deflection';
import { calculatePowerTransmission } from '../calculations/power';
import { calculateFactorOfSafety } from '../calculations/safetyFactor';
import { calculateFullShaftAnalysis } from '../calculations/shaft';

export interface ShaftStressToolInput {
  torque: number;
  torqueUnit?: TorqueUnit;
  diameter: number;
  diameterUnit?: LengthUnit;
  yieldStrength?: number;
  yieldStrengthUnit?: StressUnit;
  targetSafetyFactor?: number;
}

export interface RequiredDiameterToolInput {
  torque: number;
  torqueUnit?: TorqueUnit;
  allowableShearStress?: number;
  allowableShearStressUnit?: StressUnit;
  yieldStrength?: number;
  yieldStrengthUnit?: StressUnit;
  safetyFactor?: number;
}

export interface BendingStressToolInput {
  force?: number;
  forceUnit?: ForceUnit;
  length?: number;
  lengthUnit?: LengthUnit;
  bendingMoment?: number;
  bendingMomentUnit?: TorqueUnit;
  diameter: number;
  diameterUnit?: LengthUnit;
  allowableYieldStrength?: number;
  allowableYieldStrengthUnit?: StressUnit;
}

export interface PowerToolInput {
  torque: number;
  torqueUnit?: TorqueUnit;
  rpm: number;
}

export interface DeflectionToolInput {
  force: number;
  forceUnit?: ForceUnit;
  length: number;
  lengthUnit?: LengthUnit;
  diameter: number;
  diameterUnit?: LengthUnit;
  elasticModulus: number;
  elasticModulusUnit?: StressUnit;
}

export interface FactorOfSafetyToolInput {
  strengthMPa: number;
  appliedStressMPa: number;
  targetSafetyFactor: number;
  type?: 'yield' | 'fatigue';
}

export interface FullShaftAnalysisToolInput {
  torqueNm: number;
  radialForceN: number;
  diameterMm: number;
  lengthMm: number;
  rpm: number;
  yieldStrengthMPa: number;
  tensileStrengthMPa: number;
  elasticModulusGPa: number;
  targetSafetyFactor: number;
  operatingTempC?: number;
  criterion?: YieldCriterion;
}

/**
 * AI Copilot Tool: Calculate shaft torsional shear stress.
 */
export function calculateShaftStress(
  input: ShaftStressToolInput
): EngineeringCalculationResult<TorsionResultData> {
  return calculateShaftTorsion({
    torque: { value: input.torque, unit: input.torqueUnit || 'N·m' },
    diameter: { value: input.diameter, unit: input.diameterUnit || 'mm' },
    yieldStrength: input.yieldStrength
      ? { value: input.yieldStrength, unit: input.yieldStrengthUnit || 'MPa' }
      : undefined,
    targetSafetyFactor: input.targetSafetyFactor
  });
}

/**
 * AI Copilot Tool: Calculate required minimum shaft diameter for given torque and allowable stress.
 */
export function calculateRequiredShaftDiameter(
  input: RequiredDiameterToolInput
): {
  requiredDiameterMm: number;
  polarSectionModulusRequiredMm3: number;
  allowableShearStressMPa: number;
  formula: string;
  disclaimer: string;
} {
  return calculateRequiredTorsionDiameter(
    input.torque,
    input.torqueUnit || 'N·m',
    input.allowableShearStress,
    input.yieldStrength,
    input.safetyFactor || 2.0
  );
}

/**
 * AI Copilot Tool: Calculate bending stress on shaft.
 */
export function calculateBendingStress(
  input: BendingStressToolInput
): EngineeringCalculationResult<BendingResultData> {
  return calculateShaftBending({
    bendingMoment: input.bendingMoment !== undefined
      ? { value: input.bendingMoment, unit: input.bendingMomentUnit || 'N·m' }
      : undefined,
    force: input.force !== undefined
      ? { value: input.force, unit: input.forceUnit || 'N' }
      : undefined,
    length: input.length !== undefined
      ? { value: input.length, unit: input.lengthUnit || 'mm' }
      : undefined,
    diameter: { value: input.diameter, unit: input.diameterUnit || 'mm' },
    allowableYieldStrength: input.allowableYieldStrength !== undefined
      ? { value: input.allowableYieldStrength, unit: input.allowableYieldStrengthUnit || 'MPa' }
      : undefined
  });
}

/**
 * AI Copilot Tool: Calculate transmitted power from torque and rotational speed.
 */
export function calculatePower(
  input: PowerToolInput
): EngineeringCalculationResult<PowerResultData> {
  return calculatePowerTransmission({
    torque: { value: input.torque, unit: input.torqueUnit || 'N·m' },
    rpm: input.rpm
  });
}

/**
 * AI Copilot Tool: Calculate shaft centerline deflection.
 */
export function calculateDeflection(
  input: DeflectionToolInput
): EngineeringCalculationResult<DeflectionResultData> {
  return calculateShaftDeflection({
    force: { value: input.force, unit: input.forceUnit || 'N' },
    length: { value: input.length, unit: input.lengthUnit || 'mm' },
    diameter: { value: input.diameter, unit: input.diameterUnit || 'mm' },
    elasticModulus: { value: input.elasticModulus, unit: input.elasticModulusUnit || 'GPa' }
  });
}

/**
 * AI Copilot Tool: Calculate safety factor and margin of safety.
 */
export function calculateFactorOfSafetyTool(
  input: FactorOfSafetyToolInput
): EngineeringCalculationResult<SafetyFactorResultData> {
  return calculateFactorOfSafety({
    strengthMPa: input.strengthMPa,
    appliedStressMPa: input.appliedStressMPa,
    targetSafetyFactor: input.targetSafetyFactor,
    type: input.type || 'yield'
  });
}

/**
 * AI Copilot Tool: Run full unified shaft analysis.
 */
export function runFullShaftAnalysis(
  input: FullShaftAnalysisToolInput
): CompositeShaftAnalysisResult {
  return calculateFullShaftAnalysis({
    torqueNm: input.torqueNm,
    radialForceN: input.radialForceN,
    diameterMm: input.diameterMm,
    lengthMm: input.lengthMm,
    rpm: input.rpm,
    yieldStrengthMPa: input.yieldStrengthMPa,
    tensileStrengthMPa: input.tensileStrengthMPa,
    elasticModulusGPa: input.elasticModulusGPa,
    targetSafetyFactor: input.targetSafetyFactor,
    operatingTempC: input.operatingTempC || 20,
    criterion: input.criterion || 'Von Mises'
  });
}
