import {
  DeflectionInputs,
  DeflectionResultData,
  EngineeringCalculationResult,
  CalculationStatus
} from '../types/engineering';
import {
  normalizeForceToN,
  normalizeLengthToM,
  normalizeStressToPa
} from '../units';
import { validateShaftInputs } from '../validation/inputValidation';

export const DEFLECTION_DISCLAIMER =
  'Engineering calculation — Simplified model — Engineer review required';

export const DEFLECTION_ASSUMPTIONS = [
  'Simply supported at ends (ideal pin/roller supports)',
  'Central concentrated point load at midspan (x = L / 2)',
  'Uniform circular cross-section along the entire span',
  'Linear elastic, isotropic, homogeneous material behavior',
  'Small deflection theory (Euler-Bernoulli beam formulation, shear deformation neglected)'
];

/**
 * Calculates shaft deflection under a central transverse point load.
 * Model: "Simply supported beam, central point load"
 *
 * Formula:
 *   I = (pi * d^4) / 64
 *   delta_max = (F * L^3) / (48 * E * I)
 *   theta_supports = (F * L^2) / (16 * E * I)
 */
export function calculateShaftDeflection(
  inputs: DeflectionInputs
): EngineeringCalculationResult<DeflectionResultData, DeflectionInputs> {
  const forceN = normalizeForceToN(inputs.force);
  const lengthM = normalizeLengthToM(inputs.length);
  const diameterM = normalizeLengthToM(inputs.diameter);
  const elasticModulusPa = normalizeStressToPa(inputs.elasticModulus, 'GPa');

  const warnings: string[] = [];

  const val = validateShaftInputs({
    diameterMm: diameterM * 1000,
    lengthMm: lengthM * 1000,
    forceN
  });
  if (!val.isValid) {
    warnings.push(...val.errors);
  }

  if (elasticModulusPa <= 0) {
    warnings.push('Elastic modulus must be strictly positive.');
  }

  // Moment of inertia I = pi * d^4 / 64
  const I_m4 = (Math.PI * Math.pow(diameterM, 4)) / 64;

  let maxDeflectionM = 0;
  let slopeRad = 0;

  if (I_m4 > 0 && elasticModulusPa > 0) {
    maxDeflectionM = (forceN * Math.pow(lengthM, 3)) / (48 * elasticModulusPa * I_m4);
    slopeRad = (forceN * Math.pow(lengthM, 2)) / (16 * elasticModulusPa * I_m4);
  }

  const maxDeflectionMm = maxDeflectionM * 1000;
  const lengthMm = lengthM * 1000;

  // Engineering guideline: allowable deflection for rotating shafts typically L/1000 to L/2000 (especially for gears)
  // or ~0.1 - 0.25 mm for bearing life
  const allowableDeflectionMm = lengthMm / 1000;

  let status: CalculationStatus = 'pass';
  if (maxDeflectionMm > allowableDeflectionMm * 1.5 || maxDeflectionMm > 0.5) {
    status = 'fail';
    warnings.push(`Deflection (${maxDeflectionMm.toFixed(4)} mm) exceeds maximum allowable limit (${allowableDeflectionMm.toFixed(4)} mm).`);
  } else if (maxDeflectionMm > allowableDeflectionMm || maxDeflectionMm > 0.2) {
    status = 'warning';
    warnings.push(`Deflection (${maxDeflectionMm.toFixed(4)} mm) is approaching allowable limit for precision components (${allowableDeflectionMm.toFixed(4)} mm).`);
  }

  return {
    calculationType: 'deflection',
    name: 'Shaft Centerline Deflection',
    model: 'Simply supported beam, central point load',
    formula: 'delta_max = (F * L^3) / (48 * E * I) where I = (pi * d^4) / 64',
    inputs,
    normalizedInputsSI: {
      forceN,
      lengthM,
      diameterM,
      elasticModulusPa
    },
    result: {
      areaMomentOfInertiaM4: I_m4,
      maxDeflectionM,
      maxDeflectionMm,
      allowableDeflectionMm,
      slopeAtSupportsRad: slopeRad
    },
    displayValue: maxDeflectionMm.toFixed(4),
    displayUnit: 'mm',
    assumptions: DEFLECTION_ASSUMPTIONS,
    warnings,
    disclaimer: DEFLECTION_DISCLAIMER,
    status
  };
}
