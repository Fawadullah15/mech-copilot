import type {
  SafetyFactorInputs,
  SafetyFactorResultData,
  EngineeringCalculationResult,
  CalculationStatus,
} from '../types/engineering';
import { formatEngineeringValue } from '../units';

/**
 * Reusable Factor of Safety and Design Margin Evaluation.
 *
 * Governing Equation:
 * FoS = S_allow / σ_applied = S_yield / σ_equivalent
 * Margin = ((FoS - FoS_target) / FoS_target) * 100%
 */
export function calculateFactorOfSafety(
  inputs: SafetyFactorInputs
): EngineeringCalculationResult<SafetyFactorResultData> {
  const {
    strengthMPa,
    appliedStressMPa,
    targetSafetyFactor,
    type = 'yield',
  } = inputs;

  const warnings: string[] = [];

  const FoS = appliedStressMPa > 0 ? strengthMPa / appliedStressMPa : 999;
  const marginPercent = ((FoS - targetSafetyFactor) / targetSafetyFactor) * 100;
  const allowableStressMPa = strengthMPa / targetSafetyFactor;

  let status: CalculationStatus = 'pass';
  if (FoS < targetSafetyFactor * 0.9) {
    status = 'fail';
    warnings.push(
      `Factor of safety (${FoS.toFixed(2)}) is below the project required target of ${targetSafetyFactor.toFixed(1)}.`
    );
  } else if (FoS < targetSafetyFactor) {
    status = 'warning';
    warnings.push(
      `Factor of safety (${FoS.toFixed(2)}) is within marginal threshold (< ${targetSafetyFactor.toFixed(1)}). Margin: ${marginPercent.toFixed(1)}%.`
    );
  }

  const sign = marginPercent >= 0 ? '+' : '';
  const displaySummary = `FoS = ${FoS.toFixed(2)} (Target: ${targetSafetyFactor.toFixed(1)}, Margin: ${sign}${marginPercent.toFixed(1)}%)`;

  return {
    calculationType: 'safetyFactor',
    name: `Factor of Safety (${type === 'yield' ? 'Yield Strength' : 'Fatigue Limit'})`,
    model: 'Allowable Stress Design (ASD) Ratio',
    formula: 'FoS = S_strength / σ_equivalent',
    inputs,
    normalizedInputsSI: {
      strengthPa: strengthMPa * 1e6,
      appliedStressPa: appliedStressMPa * 1e6,
    },
    result: {
      factorOfSafety: FoS,
      targetFactorOfSafety: targetSafetyFactor,
      marginPercent,
      allowableStressMPa,
      appliedStressMPa,
      type,
    },
    displayValue: displaySummary,
    displayUnit: '',
    assumptions: [
      'Linear elastic material behavior up to yield limit',
      'Deterministic applied peak static equivalent stress',
      'Uniform safety factor applied to yield strength',
    ],
    warnings,
    disclaimer: 'Engineering calculation — Simplified model — Engineer review required.',
    status,
  };
}
