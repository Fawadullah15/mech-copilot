import type {
  BendingCalculationInputs,
  BendingResultData,
  EngineeringCalculationResult,
  CalculationStatus,
} from '../types/engineering';
import { toMeters, toNewtonMeters, toPascals, toNewtons, formatEngineeringValue } from '../units';
import { validateShaftInputs } from '../validation/inputValidation';

/**
 * Calculate bending stress and area moment of inertia for a solid circular shaft.
 *
 * Governing Equations:
 * Area moment of inertia: I = π·d⁴ / 64
 * Elastic section modulus: Z = I / (d/2) = π·d³ / 32
 * Bending moment (central point load, simply supported): M = F·L / 4
 * Bending normal stress: σ = M / Z = 32·M / (π·d³)
 */
export function calculateShaftBending(
  inputs: BendingCalculationInputs
): EngineeringCalculationResult<BendingResultData> {
  const d_m = toMeters(inputs.diameter, 'mm');
  const d_mm = d_m * 1000;

  // Determine bending moment M (Nm)
  let M_Nm = 0;
  if (inputs.bendingMoment !== undefined) {
    M_Nm = toNewtonMeters(inputs.bendingMoment, 'N·m');
  } else if (inputs.force !== undefined && inputs.length !== undefined) {
    const F_N = toNewtons(inputs.force, 'N');
    const L_m = toMeters(inputs.length, 'mm');
    M_Nm = (F_N * L_m) / 4;
  }

  const validation = validateShaftInputs({ diameterMm: d_mm, torqueNm: M_Nm });
  const warnings: string[] = [...validation.warnings];

  if (!validation.isValid) {
    return {
      calculationType: 'bendingStress',
      name: 'Shaft Bending Stress',
      model: 'Simply Supported Shaft, Transverse Loading',
      formula: 'σ_b = 32M / (πd³)',
      inputs,
      normalizedInputsSI: {
        diameterM: d_m,
        bendingMomentNm: M_Nm,
      },
      result: {
        bendingMomentNm: 0,
        areaMomentOfInertiaM4: 0,
        areaMomentOfInertiaMm4: 0,
        sectionModulusM3: 0,
        sectionModulusMm3: 0,
        bendingStressPa: 0,
        bendingStressMPa: 0,
      },
      displayValue: 'Invalid Input',
      displayUnit: 'MPa',
      assumptions: ['Solid circular section', 'Elastic Euler-Bernoulli beam theory'],
      warnings: validation.errors,
      disclaimer: 'Engineering calculation — Simplified model — Engineer review required.',
      status: 'fail',
    };
  }

  // I = π·d⁴ / 64 (m⁴)
  const I_m4 = (Math.PI * Math.pow(d_m, 4)) / 64;
  const I_mm4 = I_m4 * 1e12;

  // Z = π·d³ / 32 (m³)
  const Z_m3 = (Math.PI * Math.pow(d_m, 3)) / 32;
  const Z_mm3 = Z_m3 * 1e9;

  // σ = M / Z = 32M / (πd³) (Pa)
  const sigma_Pa = M_Nm / Z_m3;
  const sigma_MPa = sigma_Pa / 1e6;

  let allowStressMPa: number | undefined;
  let status: CalculationStatus = 'pass';

  if (inputs.allowableYieldStrength !== undefined) {
    allowStressMPa = toPascals(inputs.allowableYieldStrength, 'MPa') / 1e6;
    if (sigma_MPa > allowStressMPa) {
      status = 'fail';
      warnings.push(`Bending stress (${sigma_MPa.toFixed(1)} MPa) exceeds allowable yield limit (${allowStressMPa.toFixed(1)} MPa).`);
    } else if (sigma_MPa > allowStressMPa * 0.85) {
      status = 'warning';
      warnings.push(`Bending stress is within 15% of allowable yield limit.`);
    }
  }

  return {
    calculationType: 'bendingStress',
    name: 'Shaft Bending Stress',
    model: 'Euler-Bernoulli Beam (Solid Circular Section)',
    formula: 'σ_b = 32M / (πd³)',
    inputs,
    normalizedInputsSI: {
      diameterM: d_m,
      bendingMomentNm: M_Nm,
    },
    result: {
      bendingMomentNm: M_Nm,
      areaMomentOfInertiaM4: I_m4,
      areaMomentOfInertiaMm4: I_mm4,
      sectionModulusM3: Z_m3,
      sectionModulusMm3: Z_mm3,
      bendingStressPa: sigma_Pa,
      bendingStressMPa: sigma_MPa,
      allowableStressMPa: allowStressMPa,
    },
    displayValue: formatEngineeringValue(sigma_MPa, 1),
    displayUnit: 'MPa',
    assumptions: [
      'Solid circular shaft of constant diameter',
      'Small deflections, plane sections remain plane',
      'Material behaves elastically in tension and compression',
      'Central point load on simply supported bearings',
    ],
    warnings,
    disclaimer: 'Engineering calculation — Simplified model — Engineer review required.',
    status,
  };
}
