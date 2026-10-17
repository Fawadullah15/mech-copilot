import type {
  TorsionCalculationInputs,
  TorsionResultData,
  EngineeringCalculationResult,
  CalculationStatus,
  TorqueUnit,
  StressUnit,
} from '../types/engineering';
import { toMeters, toNewtonMeters, toPascals, formatEngineeringValue } from '../units';
import { validateShaftInputs } from '../validation/inputValidation';

/**
 * Calculate torsional shear stress, polar moment of inertia, and minimum required
 * shaft diameter for a solid circular shaft under pure torque.
 *
 * Governing Equations:
 * Polar moment of inertia: J = π·d⁴ / 32
 * Polar section modulus: Z_p = J / (d/2) = π·d³ / 16
 * Torsional shear stress: τ = T·r / J = 16·T / (π·d³)
 * Allowable shear stress: τ_allow = S_y / (2·n)   (Tresca assumption for ductile metals)
 * Minimum required diameter: d_min = [ 16·T / (π·τ_allow) ]^(1/3)
 */
export function calculateShaftTorsion(
  inputs: TorsionCalculationInputs
): EngineeringCalculationResult<TorsionResultData> {
  const d_m = toMeters(inputs.diameter, 'mm');
  const T_Nm = toNewtonMeters(inputs.torque, 'N·m');

  const d_mm = d_m * 1000;
  const validation = validateShaftInputs({ diameterMm: d_mm, torqueNm: T_Nm });

  const warnings: string[] = [...validation.warnings];

  if (!validation.isValid) {
    return {
      calculationType: 'torsionalStress',
      name: 'Shaft Torsion (Shear Stress)',
      model: 'Solid Circular Shaft in Pure Torsion',
      formula: 'τ = 16T / (πd³)',
      inputs: {
        torque: inputs.torque,
        diameter: inputs.diameter,
      },
      normalizedInputsSI: {
        torqueNm: T_Nm,
        diameterM: d_m,
      },
      result: {
        polarMomentOfInertia: 0,
        polarMomentOfInertiaMm4: 0,
        polarSectionModulus: 0,
        polarSectionModulusMm3: 0,
        shearStressPa: 0,
        shearStressMPa: 0,
      },
      displayValue: 'Invalid Input',
      displayUnit: 'MPa',
      assumptions: [
        'Solid circular cross section',
        'Homogeneous and isotropic material',
        'Elastic regime (Hooke\'s Law)',
        'Pure torsion without initial residual stress',
      ],
      warnings: validation.errors,
      disclaimer: 'Engineering calculation — Simplified model — Engineer review required.',
      status: 'fail',
    };
  }

  // J = π·d⁴ / 32 (m⁴)
  const J_m4 = (Math.PI * Math.pow(d_m, 4)) / 32;
  const J_mm4 = J_m4 * 1e12;

  // Z_p = π·d³ / 16 (m³)
  const Zp_m3 = (Math.PI * Math.pow(d_m, 3)) / 16;
  const Zp_mm3 = Zp_m3 * 1e9;

  // τ = 16T / (πd³) (Pa)
  const tau_Pa = T_Nm / Zp_m3;
  const tau_MPa = tau_Pa / 1e6;

  let tau_allow_MPa: number | undefined;
  let d_min_mm: number | undefined;
  let stressRatio: number | undefined;
  let status: CalculationStatus = 'pass';

  if (inputs.yieldStrength !== undefined) {
    const Sy_Pa = toPascals(inputs.yieldStrength, 'MPa');
    const Sy_MPa = Sy_Pa / 1e6;
    const n = inputs.targetSafetyFactor ?? 2.0;

    // Allowable shear stress: τ_allow = Sy / (2·n)
    tau_allow_MPa = Sy_MPa / (2 * n);
    const tau_allow_Pa = tau_allow_MPa * 1e6;

    // Minimum diameter: d_min = [ 16T / (π·τ_allow) ]^(1/3) (meters)
    if (tau_allow_Pa > 0 && T_Nm > 0) {
      const d_min_m = Math.cbrt((16 * T_Nm) / (Math.PI * tau_allow_Pa));
      d_min_mm = d_min_m * 1000;
    } else {
      d_min_mm = 0;
    }

    stressRatio = tau_MPa / tau_allow_MPa;

    if (stressRatio > 1.0) {
      status = 'fail';
      warnings.push(`Shear stress (${tau_MPa.toFixed(1)} MPa) exceeds allowable shear limit (${tau_allow_MPa.toFixed(1)} MPa).`);
    } else if (stressRatio > 0.85) {
      status = 'warning';
      warnings.push(`Shear stress is within 15% of allowable limit (${tau_allow_MPa.toFixed(1)} MPa).`);
    }
  }

  return {
    calculationType: 'torsionalStress',
    name: 'Shaft Torsion (Shear Stress)',
    model: 'Solid Circular Shaft in Pure Torsion',
    formula: 'τ = 16T / (πd³)',
    inputs: {
      torque: inputs.torque,
      diameter: inputs.diameter,
      yieldStrength: inputs.yieldStrength,
      targetSafetyFactor: inputs.targetSafetyFactor,
    },
    normalizedInputsSI: {
      torqueNm: T_Nm,
      diameterM: d_m,
    },
    result: {
      polarMomentOfInertia: J_m4,
      polarMomentOfInertiaMm4: J_mm4,
      polarSectionModulus: Zp_m3,
      polarSectionModulusMm3: Zp_mm3,
      shearStressPa: tau_Pa,
      shearStressMPa: tau_MPa,
      allowableShearStressMPa: tau_allow_MPa,
      minRequiredDiameterMm: d_min_mm,
      stressRatio,
    },
    displayValue: formatEngineeringValue(tau_MPa, 1),
    displayUnit: 'MPa',
    assumptions: [
      'Solid circular cross-section',
      'Uniform diameter across assessed section',
      'Homogeneous, isotropic material within elastic limit',
      'No stress concentration (fillets or keyways assessed separately)',
    ],
    warnings,
    disclaimer: 'Engineering calculation — Simplified model — Engineer review required.',
    status,
  };
}

/**
 * Calculates the minimum solid circular shaft diameter required to safely transmit
 * a given torque under pure torsion without exceeding allowable shear stress.
 */
export function calculateRequiredTorsionDiameter(
  torque: number,
  torqueUnit: TorqueUnit = 'N·m',
  allowableShearStress?: number,
  yieldStrength?: number,
  safetyFactor: number = 2.0
): {
  requiredDiameterMm: number;
  polarSectionModulusRequiredMm3: number;
  allowableShearStressMPa: number;
  formula: string;
  disclaimer: string;
} {
  const T_Nm = toNewtonMeters({ value: torque, unit: torqueUnit });

  let tau_allow_MPa = allowableShearStress ?? 0;
  if (!tau_allow_MPa && yieldStrength) {
    tau_allow_MPa = yieldStrength / (2 * safetyFactor);
  }
  if (tau_allow_MPa <= 0) {
    tau_allow_MPa = 50; // Fallback safe default
  }

  const tau_allow_Pa = tau_allow_MPa * 1e6;

  // d_min = (16 * T / (pi * tau_allow))^(1/3)
  const d_min_m = Math.cbrt((16 * T_Nm) / (Math.PI * tau_allow_Pa));
  const d_min_mm = d_min_m * 1000;
  const Zp_required_m3 = T_Nm / tau_allow_Pa;

  return {
    requiredDiameterMm: Number(d_min_mm.toFixed(2)),
    polarSectionModulusRequiredMm3: Number((Zp_required_m3 * 1e9).toFixed(1)),
    allowableShearStressMPa: tau_allow_MPa,
    formula: 'd_min = [16·T / (π·τ_allow)]^(1/3)',
    disclaimer: 'Engineering calculation — Simplified model — Engineer review required.'
  };
}
