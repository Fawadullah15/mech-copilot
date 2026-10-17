import type {
  CombinedStressInputs,
  CombinedStressResultData,
  EngineeringCalculationResult,
  YieldCriterion,
  CalculationStatus,
} from '../types/engineering';
import { formatEngineeringValue } from '../units';

/**
 * Calculate combined bending and torsional stress state on a rotating shaft element.
 *
 * Supported Criteria:
 * 1. Von Mises (Distortion Energy Theory):
 *    σ_vm = √(σ_b² + 3·τ²)
 * 2. Tresca (Maximum Shear Stress Theory):
 *    τ_max = √((σ_b/2)² + τ²)
 *    σ_equiv = 2·τ_max = √(σ_b² + 4·τ²)
 *
 * Principal Stresses (Mohr's Circle):
 * σ_1,2 = (σ_b / 2) ± √((σ_b / 2)² + τ²)
 */
export function calculateCombinedStress(
  inputs: CombinedStressInputs
): EngineeringCalculationResult<CombinedStressResultData> {
  const {
    bendingStressMPa: sigma,
    shearStressMPa: tau,
    yieldStrengthMPa: Sy,
    criterion = 'Von Mises',
    targetSafetyFactor = 2.0,
  } = inputs;

  const warnings: string[] = [];

  // Mohr's Circle calculations:
  const center = sigma / 2;
  const radius = Math.sqrt(Math.pow(sigma / 2, 2) + Math.pow(tau, 2));

  const sigma1 = center + radius;
  const sigma2 = center - radius;
  const tauMax = radius;

  // Equivalent Stress by explicit Criterion:
  let equivStressMPa: number;
  let formulaStr: string;

  if (criterion === 'Tresca') {
    // Tresca equivalent stress = 2 * tau_max = √(σ² + 4τ²)
    equivStressMPa = 2 * tauMax;
    formulaStr = 'σ_equiv(Tresca) = 2·τ_max = √(σ_b² + 4·τ²)';
  } else {
    // Von Mises = √(σ² + 3τ²)
    equivStressMPa = Math.sqrt(Math.pow(sigma, 2) + 3 * Math.pow(tau, 2));
    formulaStr = 'σ_vm(Von Mises) = √(σ_b² + 3·τ²)';
  }

  // Factor of safety against yield
  const FoS = equivStressMPa > 0 ? Sy / equivStressMPa : 999;
  const marginPercent = ((FoS - targetSafetyFactor) / targetSafetyFactor) * 100;

  let status: CalculationStatus = 'pass';
  if (FoS < targetSafetyFactor * 0.9) {
    status = 'fail';
    warnings.push(
      `Factor of Safety (${FoS.toFixed(2)}) is below the target requirement of ${targetSafetyFactor.toFixed(1)} under ${criterion} criterion.`
    );
  } else if (FoS < targetSafetyFactor) {
    status = 'warning';
    warnings.push(
      `Factor of Safety (${FoS.toFixed(2)}) is marginally below target (${targetSafetyFactor.toFixed(1)}). Margin: ${marginPercent.toFixed(1)}%.`
    );
  }

  const allowableStressMPa = Sy / targetSafetyFactor;

  return {
    calculationType: 'combinedStress',
    name: `Combined Stress Analysis (${criterion} Criterion)`,
    model: `${criterion} Multiaxial Yield Failure Theory`,
    formula: formulaStr,
    inputs: {
      bendingStressMPa: sigma,
      shearStressMPa: tau,
      yieldStrengthMPa: Sy,
      criterion,
      targetSafetyFactor,
    },
    normalizedInputsSI: {
      bendingStressPa: sigma * 1e6,
      shearStressPa: tau * 1e6,
      yieldStrengthPa: Sy * 1e6,
    },
    result: {
      criterion,
      bendingStressMPa: sigma,
      shearStressMPa: tau,
      principalStress1MPa: sigma1,
      principalStress2MPa: sigma2,
      maxShearStressMPa: tauMax,
      equivalentStressMPa: equivStressMPa,
      allowableStressMPa,
      factorOfSafety: FoS,
      marginPercent,
    },
    displayValue: formatEngineeringValue(equivStressMPa, 1),
    displayUnit: 'MPa',
    assumptions: [
      `Multiaxial yield evaluated using explicit ${criterion} criterion`,
      'Plane stress state on shaft outer surface (critical stress point)',
      'Ductile material behavior under static/quasi-static equivalent loading',
      'No residual stresses from prior manufacturing or welding',
    ],
    warnings,
    disclaimer: 'Engineering calculation — Simplified model — Engineer review required.',
    status,
  };
}
