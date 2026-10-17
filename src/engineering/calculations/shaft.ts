import {
  CompositeShaftAnalysisInputs,
  CompositeShaftAnalysisResult,
  CalculationStatus
} from '../types/engineering';
import { calculateShaftTorsion } from './torsion';
import { calculateShaftBending } from './bending';
import { calculateCombinedStress } from './combinedStress';
import { calculateShaftDeflection } from './deflection';
import { calculatePowerTransmission } from './power';
import { calculateFactorOfSafety } from './safetyFactor';

/**
 * Executes a full composite shaft analysis aggregating torsion, bending,
 * combined multiaxial stress state (Von Mises or Tresca), deflection,
 * power transmission, and design factor of safety.
 */
export function calculateFullShaftAnalysis(
  inputs: CompositeShaftAnalysisInputs
): CompositeShaftAnalysisResult {
  const criterion = inputs.criterion || 'Von Mises';

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
    elasticModulus: { value: inputs.elasticModulusGPa, unit: 'GPa' }
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

  let summary = '';
  if (overallStatus === 'pass') {
    summary = `Shaft design satisfies criteria under ${criterion} formulation. Equivalent stress: ${eqStress} MPa, FoS: ${fos} (target ${inputs.targetSafetyFactor}), midspan deflection: ${defl} mm.`;
  } else if (overallStatus === 'warning') {
    summary = `Shaft design exhibits marginal performance under ${criterion} formulation. FoS is ${fos} (target ${inputs.targetSafetyFactor}) or deflection (${defl} mm) is approaching limits. Review recommended.`;
  } else {
    summary = `Shaft design FAILS structural criteria under ${criterion} formulation! Equivalent stress (${eqStress} MPa) results in FoS ${fos} which violates safety threshold of ${inputs.targetSafetyFactor}.`;
  }

  return {
    torsion,
    bending,
    combinedStress,
    deflection,
    power,
    safetyFactor,
    overallStatus,
    summary
  };
}
