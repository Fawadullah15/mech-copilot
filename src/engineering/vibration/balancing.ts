import {
  RigidRotorBalancingInput,
  RigidRotorBalancingResult,
  BalanceQualityGrade
} from './types';

const GRADE_VALUES: Record<BalanceQualityGrade, number> = {
  'G0.4': 0.4,
  'G1': 1.0,
  'G2.5': 2.5,
  'G6.3': 6.3,
  'G16': 16.0,
  'G40': 40.0,
};

export function calculateRigidRotorBalancing(
  input: RigidRotorBalancingInput
): RigidRotorBalancingResult {
  const { rotorMassKg, serviceSpeedRpm, grade, correctionPlanes } = input;

  if (rotorMassKg <= 0) {
    throw new Error(`Rotor mass must be positive (received ${rotorMassKg} kg).`);
  }
  if (serviceSpeedRpm <= 0) {
    throw new Error(`Service speed must be positive (received ${serviceSpeedRpm} rpm).`);
  }

  const gradeValMmS = GRADE_VALUES[grade];
  if (!gradeValMmS) {
    throw new Error(`Unsupported balance quality grade: ${grade}.`);
  }

  // Angular velocity Omega [rad/s]
  const omega = (2 * Math.PI * serviceSpeedRpm) / 60;

  // Permissible specific unbalance: e_per = (G * 1000) / Omega [um or g*mm/kg]
  // Because G is in mm/s and Omega is in rad/s: G/Omega is in mm.
  // Converting to micrometers (um) or g*mm/kg gives: e_per = 1000 * G / Omega
  const e_per = (1000 * gradeValMmS) / omega;

  // Total permissible residual unbalance: U_per = e_per * M [g*mm]
  const U_per = e_per * rotorMassKg;

  // Plane allocation
  let planeAGMm = U_per;
  let planeBGMm: number | undefined;

  if (correctionPlanes === 'two') {
    const planeA = input.planeADistanceMm;
    const planeB = input.planeBDistanceMm;
    const cg = input.cgDistanceMm;

    if (planeA !== undefined && planeB !== undefined && cg !== undefined && planeB > planeA) {
      const bSpan = planeB - planeA;
      const cFromA = cg - planeA;
      const fracB = Math.max(0.2, Math.min(0.8, cFromA / bSpan));
      const fracA = 1 - fracB;
      planeAGMm = U_per * fracA;
      planeBGMm = U_per * fracB;
    } else {
      // Standard 50/50 symmetric split
      planeAGMm = U_per * 0.5;
      planeBGMm = U_per * 0.5;
    }
  }

  const assumptions = [
    'Rigid rotor behavior assumption per ISO 21940-11: service speed n is well below first lateral bending critical speed (typically n < 0.5 nc1)',
    `Balance quality grade ${grade} specifies product e_per * Omega = ${gradeValMmS} mm/s`,
    `Operational service speed Omega = ${omega.toFixed(2)} rad/s (${serviceSpeedRpm} rpm)`,
    correctionPlanes === 'two'
      ? (input.planeADistanceMm !== undefined && input.planeBDistanceMm !== undefined && input.cgDistanceMm !== undefined)
        ? 'Dynamic two-plane balancing with moment-equilibrium plane allocation based on plane spans and CG location'
        : 'Dynamic two-plane balancing with 50/50 symmetric split assumed by default (explicit plane distances/CG not provided)'
      : 'Static single-plane balancing (disc-type rotor where axial width b < 0.2 d)',
  ];

  const limitations = [
    'TOLERANCE CALCULATION ONLY: Computes permissible residual unbalance limits; does NOT replace physical balancing machine measurement, trial mass runs, or workshop balancing records.',
    'RIGID ROTOR BOUNDARY: Does not apply to flexible rotors operating through or above bending critical speeds. Flexible rotor balancing must conform to ISO 21940-12.',
    'BALANCING MACHINE CALIBRATION: Real residual unbalance must be measured on calibrated dynamic balancing machines compliant with ISO 21940-21.',
  ];

  return {
    grade,
    gradeValueMmS: gradeValMmS,
    serviceSpeedRpm,
    serviceSpeedRadS: Number(omega.toFixed(3)),
    rotorMassKg,
    permissibleSpecificUnbalanceUpm: Number(e_per.toFixed(3)),
    permissibleResidualUnbalanceGMm: Number(U_per.toFixed(2)),
    planeAllocation: {
      planes: correctionPlanes,
      planeAGMm: Number(planeAGMm.toFixed(2)),
      planeBGMm: planeBGMm !== undefined ? Number(planeBGMm.toFixed(2)) : undefined,
    },
    standardReference: 'ISO 21940-11:2016 (Amd 1:2022)',
    assumptions,
    limitations,
  };
}
