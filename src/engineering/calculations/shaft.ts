import {
  CompositeShaftAnalysisInputs,
  CompositeShaftAnalysisResult,
  CalculationStatus,
  YieldCriterion,
  SolveMinimumDiameterInputs,
  CombinedDiameterSolution
} from '../types/engineering';
import { calculateShaftTorsion } from './torsion';
import { calculateShaftBending } from './bending';
import { calculateCombinedStress } from './combinedStress';
import { calculateShaftDeflection } from './deflection';
import { calculatePowerTransmission } from './power';
import { calculateFactorOfSafety } from './safetyFactor';

/**
 * Numerically solves for the minimum required solid circular shaft diameter
 * under combined bending and torsional loading using a bounded bisection solver.
 *
 * Governing Equations:
 * Bending normal stress:       σ_b(d) = 32·M / (π·d³)
 * Torsional shear stress:      τ(d)   = 16·T / (π·d³)
 * Von Mises equivalent stress: σ_vm(d)   = √(σ_b² + 3·τ²)
 * Tresca equivalent stress:    σ_tr(d)   = √(σ_b² + 4·τ²)
 * Allowable yield stress:      σ_allow   = S_y / n_target
 *
 * Bisection searches for root f(d) = σ_equiv(d) - σ_allow = 0 within [0.5 mm, 2000 mm].
 * Also evaluates pure torsion minimum and flexural deflection-governed diameter when inputs allow.
 */
export function solveMinimumShaftDiameterCombined(
  inputs: SolveMinimumDiameterInputs
): CombinedDiameterSolution {
  const n = inputs.targetSafetyFactor && inputs.targetSafetyFactor > 0 ? inputs.targetSafetyFactor : 2.0;
  const criterion: YieldCriterion = inputs.criterion || 'Von Mises';
  const Sy_MPa = inputs.yieldStrengthMPa > 0 ? inputs.yieldStrengthMPa : 250;
  const Sy_Pa = Sy_MPa * 1e6;
  const sigmaAllow_Pa = Sy_Pa / n;
  const allowableStressMPa = Sy_MPa / n;

  // Determine peak bending moment M (N·m) under simply-supported midspan load
  let M_Nm = 0;
  if (inputs.bendingMomentNm !== undefined && inputs.bendingMomentNm >= 0) {
    M_Nm = inputs.bendingMomentNm;
  } else if (inputs.radialForceN !== undefined && inputs.lengthMm !== undefined && inputs.radialForceN >= 0 && inputs.lengthMm >= 0) {
    // M_max = F * L / 4 (simply-supported midspan concentrated point load)
    M_Nm = (inputs.radialForceN * (inputs.lengthMm / 1000)) / 4;
  }

  const T_Nm = Math.max(0, inputs.torqueNm || 0);

  // 1. Torsion-only minimum diameter (Tresca convention: tau_allow = Sy / (2*n))
  let d_torsion_mm = 0;
  if (T_Nm > 0 && Sy_Pa > 0) {
    const tauAllow_Pa = Sy_Pa / (2 * n);
    const d_torsion_m = Math.cbrt((16 * T_Nm) / (Math.PI * tauAllow_Pa));
    d_torsion_mm = Number((d_torsion_m * 1000).toFixed(2));
  }

  // 2. Combined stress bisection solver
  let d_combined_mm = 0;
  let iterations = 0;
  let toleranceAchievedMm = 0;

  if (M_Nm === 0 && T_Nm === 0) {
    d_combined_mm = 0;
  } else {
    // Objective function: f(d) = sigma_equiv(d) - sigma_allow
    const evalStressDiff = (d_m: number): number => {
      if (d_m <= 0) return Infinity;
      const sigma_b_Pa = (32 * M_Nm) / (Math.PI * Math.pow(d_m, 3));
      const tau_Pa = (16 * T_Nm) / (Math.PI * Math.pow(d_m, 3));
      const sigma_equiv_Pa = criterion === 'Tresca'
        ? Math.sqrt(Math.pow(sigma_b_Pa, 2) + 4 * Math.pow(tau_Pa, 2))
        : Math.sqrt(Math.pow(sigma_b_Pa, 2) + 3 * Math.pow(tau_Pa, 2));
      return sigma_equiv_Pa - sigmaAllow_Pa;
    };

    // Bracket boundaries
    let d_low = 0.0005; // 0.5 mm
    let d_high = 2.0;   // 2000 mm

    // Ensure d_high is large enough such that f(d_high) <= 0
    while (evalStressDiff(d_high) > 0 && d_high < 20.0) {
      d_high *= 2.0;
    }

    const toleranceM = 1e-8; // 0.00001 mm precision
    const maxIterations = 100;

    while (d_high - d_low > toleranceM && iterations < maxIterations) {
      const d_mid = (d_low + d_high) / 2;
      const diff = evalStressDiff(d_mid);
      if (diff > 0) {
        // Stress too high -> diameter too small
        d_low = d_mid;
      } else {
        // Stress below allowable -> diameter large enough
        d_high = d_mid;
      }
      iterations++;
    }

    toleranceAchievedMm = (d_high - d_low) * 1000;
    d_combined_mm = Number((d_high * 1000).toFixed(2));
  }

  // 3. Deflection-governed diameter check (if stiffness properties provided)
  let d_defl_mm: number | undefined;
  if (
    inputs.elasticModulusGPa &&
    inputs.elasticModulusGPa > 0 &&
    inputs.radialForceN &&
    inputs.radialForceN > 0 &&
    inputs.lengthMm &&
    inputs.lengthMm > 0
  ) {
    const E_Pa = inputs.elasticModulusGPa * 1e9;
    const L_m = inputs.lengthMm / 1000;
    const F_N = inputs.radialForceN;
    const ratio = inputs.deflectionLimitRatio && inputs.deflectionLimitRatio > 0 ? inputs.deflectionLimitRatio : 1000;
    // delta = 4*F*L^3 / (3*pi*E*d^4) <= L / ratio => d^4 >= 4*F*L^2*ratio / (3*pi*E)
    const d4 = (4 * F_N * Math.pow(L_m, 2) * ratio) / (3 * Math.PI * E_Pa);
    if (d4 > 0) {
      d_defl_mm = Number((Math.pow(d4, 0.25) * 1000).toFixed(2));
    }
  }

  // 4. Determine governing constraint
  let requiredDiameterMm = d_combined_mm;
  let governingConstraint: 'torsion_stress' | 'combined_stress' | 'deflection_stiffness' = 'combined_stress';

  if (d_defl_mm !== undefined && d_defl_mm > requiredDiameterMm) {
    requiredDiameterMm = d_defl_mm;
    governingConstraint = 'deflection_stiffness';
  } else if (M_Nm === 0 && T_Nm > 0) {
    governingConstraint = 'torsion_stress';
  } else {
    governingConstraint = 'combined_stress';
  }

  const formulaStr = criterion === 'Tresca'
    ? 'd_min = [ (32·n / (π·Sy)) · √(M² + T²) ]^(1/3)  [Solved via Bounded Bisection]'
    : 'd_min = [ (16·n / (π·Sy)) · √(4M² + 3T²) ]^(1/3)  [Solved via Bounded Bisection]';

  return {
    requiredDiameterMm,
    torsionOnlyDiameterMm: d_torsion_mm,
    combinedStressDiameterMm: d_combined_mm,
    deflectionGovernedDiameterMm: d_defl_mm,
    governingConstraint,
    criterion,
    bisectionIterations: iterations,
    achievedToleranceMm: Number(toleranceAchievedMm.toFixed(6)),
    allowableStressMPa: Number(allowableStressMPa.toFixed(2)),
    peakBendingMomentNm: Number(M_Nm.toFixed(2)),
    formula: formulaStr,
    assumptions: [
      'Bounded bisection root-finding on linear-elastic plane stress state',
      `Yield criterion: ${criterion} (${criterion === 'Tresca' ? 'Maximum Shear Stress Theory' : 'Distortion Energy Theory'})`,
      'Simply-supported span on two boundary supports; peak moment M_max = FL/4 applies to central point load',
      'Solid circular cross section with uniform properties throughout span'
    ]
  };
}

/**
 * Executes a full composite shaft analysis aggregating torsion, bending,
 * combined multiaxial stress state (Von Mises or Tresca), deflection,
 * power transmission, and design factor of safety.
 */
export function calculateFullShaftAnalysis(
  inputs: CompositeShaftAnalysisInputs
): CompositeShaftAnalysisResult {
  const criterion: YieldCriterion = inputs.criterion || 'Von Mises';

  // 1. Torsion
  const torsion = calculateShaftTorsion({
    torque: { value: inputs.torqueNm, unit: 'N·m' },
    diameter: { value: inputs.diameterMm, unit: 'mm' },
    yieldStrength: { value: inputs.yieldStrengthMPa, unit: 'MPa' },
    targetSafetyFactor: inputs.targetSafetyFactor
  });

  // 2. Bending
  const bending = calculateShaftBending({
    force: { value: inputs.radialForceN, unit: 'N' },
    length: { value: inputs.lengthMm, unit: 'mm' },
    diameter: { value: inputs.diameterMm, unit: 'mm' },
    allowableYieldStrength: { value: inputs.yieldStrengthMPa, unit: 'MPa' }
  });

  // 3. Combined Multiaxial Stress
  const combinedStress = calculateCombinedStress({
    bendingStressMPa: bending.result.bendingStressMPa,
    shearStressMPa: torsion.result.shearStressMPa,
    yieldStrengthMPa: inputs.yieldStrengthMPa,
    criterion,
    targetSafetyFactor: inputs.targetSafetyFactor
  });

  // 4. Deflection
  const deflection = calculateShaftDeflection({
    force: { value: inputs.radialForceN, unit: 'N' },
    length: { value: inputs.lengthMm, unit: 'mm' },
    diameter: { value: inputs.diameterMm, unit: 'mm' },
    elasticModulus: { value: inputs.elasticModulusGPa, unit: 'GPa' },
    deflectionLimitRatio: inputs.deflectionLimitRatio
  });

  // 5. Power Transmission
  const power = calculatePowerTransmission({
    torque: { value: inputs.torqueNm, unit: 'N·m' },
    rpm: inputs.rpm
  });

  // 6. Factor of Safety against Yield
  const safetyFactor = calculateFactorOfSafety({
    strengthMPa: inputs.yieldStrengthMPa,
    appliedStressMPa: combinedStress.result.equivalentStressMPa,
    targetSafetyFactor: inputs.targetSafetyFactor,
    type: 'yield'
  });

  // 7. Combined Minimum Required Diameter via Bounded Bisection
  const sizingSolution = solveMinimumShaftDiameterCombined({
    torqueNm: inputs.torqueNm,
    radialForceN: inputs.radialForceN,
    lengthMm: inputs.lengthMm,
    yieldStrengthMPa: inputs.yieldStrengthMPa,
    targetSafetyFactor: inputs.targetSafetyFactor,
    criterion,
    elasticModulusGPa: inputs.elasticModulusGPa,
    deflectionLimitRatio: inputs.deflectionLimitRatio
  });

  // Determine aggregate overall status
  const statuses: CalculationStatus[] = [
    torsion.status,
    bending.status,
    combinedStress.status,
    deflection.status,
    safetyFactor.status
  ];

  let overallStatus: CalculationStatus = 'pass';
  if (statuses.includes('fail')) {
    overallStatus = 'fail';
  } else if (statuses.includes('warning')) {
    overallStatus = 'warning';
  }

  // Generate engineering summary
  const eqStress = combinedStress.result.equivalentStressMPa.toFixed(1);
  const fos = combinedStress.result.factorOfSafety.toFixed(2);
  const defl = deflection.result.maxDeflectionMm.toFixed(3);
  const reqD = sizingSolution.requiredDiameterMm.toFixed(1);
  const constraintLabel = sizingSolution.governingConstraint.replace('_', ' ');

  let summary = '';
  if (overallStatus === 'pass') {
    summary = `Shaft design satisfies structural criteria under ${criterion} formulation. Equivalent stress: ${eqStress} MPa, FoS: ${fos} (target ${inputs.targetSafetyFactor}), midspan deflection: ${defl} mm. Minimum required diameter: ${reqD} mm (${constraintLabel} governed).`;
  } else if (overallStatus === 'warning') {
    summary = `Shaft design exhibits marginal performance under ${criterion} formulation. FoS is ${fos} (target ${inputs.targetSafetyFactor}) or deflection (${defl} mm) is approaching limits. Minimum required diameter: ${reqD} mm.`;
  } else {
    summary = `Shaft design FAILS structural criteria under ${criterion} formulation! Equivalent stress (${eqStress} MPa) results in FoS ${fos} which violates safety threshold of ${inputs.targetSafetyFactor}. Minimum required diameter: ${reqD} mm.`;
  }

  return {
    torsion,
    bending,
    combinedStress,
    deflection,
    power,
    safetyFactor,
    overallStatus,
    summary,
    minRequiredDiameterMm: sizingSolution.requiredDiameterMm,
    torsionOnlyMinDiameterMm: sizingSolution.torsionOnlyDiameterMm,
    combinedStressDiameterMm: sizingSolution.combinedStressDiameterMm,
    deflectionGovernedDiameterMm: sizingSolution.deflectionGovernedDiameterMm,
    governingConstraint: sizingSolution.governingConstraint,
    bisectionIterations: sizingSolution.bisectionIterations
  };
}
