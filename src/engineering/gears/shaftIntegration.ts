import type {
  GearShaftIntegrationInput,
  GearShaftIntegrationResult
} from './types';
import { solveShaftReactions } from '../bearings/reactions';
import type { ShaftTransverseLoad, ShaftAxialLoad } from '../bearings/types';

/**
 * Transfers calculated 3D gear mesh forces into the shaft coordinate frame
 * and solves bearing support reactions and equilibrium residuals using the
 * Stage 08 bearing reaction engine.
 */
export function integrateGearWithShaft(
  input: GearShaftIntegrationInput
): GearShaftIntegrationResult {
  const {
    shaftLengthMm,
    bearingStationAMm,
    bearingStationBMm,
    gearStationMm,
    meshForces,
    targetGear,
    supportArrangement = 'locating_floating',
    locatingStation = 'A',
    dynamicCapacityA,
    dynamicCapacityB,
    shaftRpm = 1500
  } = input;

  const warnings: string[] = [];

  // Validation
  if (gearStationMm < 0 || gearStationMm > shaftLengthMm) {
    throw new Error(
      `Gear mounting station x = ${gearStationMm} mm is outside shaft span [0, ${shaftLengthMm}] mm.`
    );
  }
  if (bearingStationAMm < 0 || bearingStationAMm >= bearingStationBMm) {
    throw new Error(
      `Bearing station A (${bearingStationAMm} mm) must be strictly less than station B (${bearingStationBMm} mm).`
    );
  }
  if (bearingStationBMm > shaftLengthMm) {
    throw new Error(
      `Bearing station B (${bearingStationBMm} mm) is outside shaft span [0, ${shaftLengthMm}] mm.`
    );
  }

  // Check overhung gear mount
  const isOverhung =
    gearStationMm < bearingStationAMm || gearStationMm > bearingStationBMm;
  if (isOverhung) {
    warnings.push(
      `Gear is mounted at an overhung station (x = ${gearStationMm} mm, span: [${bearingStationAMm}, ${bearingStationBMm}] mm). Overhung mounting amplifies bending moment and shaft slope at the mesh.`
    );
  }

  // Extract force and moment components for the designated gear
  const isPinion = targetGear === 'pinion';
  const forceGlobal = isPinion ? meshForces.pinionForceGlobalN : meshForces.wheelForceGlobalN;
  const momentGlobal = isPinion
    ? meshForces.pinionOverturningMomentGlobalNm
    : meshForces.wheelOverturningMomentGlobalNm;

  // Transverse point load at gear station:
  // Note: solver expects My and Mz in N·mm
  const transverseLoad: ShaftTransverseLoad = {
    id: `gear-mesh-${targetGear}`,
    name: `${targetGear === 'pinion' ? 'Pinion' : 'Wheel'} Mesh Force`,
    x: gearStationMm,
    Fy: forceGlobal.Fy,
    Fz: forceGlobal.Fz,
    My: momentGlobal.My * 1000, // N·m to N·mm
    Mz: momentGlobal.Mz * 1000 // N·m to N·mm
  };

  // Axial load at gear station:
  const axialLoads: ShaftAxialLoad[] = [];
  if (Math.abs(forceGlobal.Fx) > 1e-4) {
    axialLoads.push({
      id: `gear-thrust-${targetGear}`,
      name: `${targetGear === 'pinion' ? 'Pinion' : 'Wheel'} Axial Thrust`,
      x: gearStationMm,
      Fa: forceGlobal.Fx
    });
  }

  // Execute Stage 08 3D equilibrium solver
  const reactions = solveShaftReactions({
    shaftLength: shaftLengthMm,
    xA: bearingStationAMm,
    xB: bearingStationBMm,
    transverseLoads: [transverseLoad],
    axialLoads,
    arrangement: supportArrangement,
    locatingStation
  });

  // Calculate basic dynamic rating life if dynamic capacities are supplied
  let bearingLifeA;
  let bearingLifeB;

  if (dynamicCapacityA && dynamicCapacityA > 0 && shaftRpm > 0) {
    // Equivalent load approx: P = X*Fr + Y*Fa (for radial ball bearing, P = Fr if Fa = 0)
    const FrA = reactions.reactions.A.Fr;
    const FaA = reactions.reactions.A.Fa;
    const PA = Math.max(FrA, 0.56 * FrA + 1.4 * FaA);
    const lifeRevMillionsA = Math.pow(dynamicCapacityA / Math.max(1, PA), 3);
    const lifeHoursA = (1e6 / (60 * shaftRpm)) * lifeRevMillionsA;
    bearingLifeA = {
      equivalentDynamicLoadN: Number(PA.toFixed(2)),
      l10RevolutionsMillions: Number(lifeRevMillionsA.toFixed(2)),
      l10Hours: Number(lifeHoursA.toFixed(1))
    };
  }

  if (dynamicCapacityB && dynamicCapacityB > 0 && shaftRpm > 0) {
    const FrB = reactions.reactions.B.Fr;
    const FaB = reactions.reactions.B.Fa;
    const PB = Math.max(FrB, 0.56 * FrB + 1.4 * FaB);
    const lifeRevMillionsB = Math.pow(dynamicCapacityB / Math.max(1, PB), 3);
    const lifeHoursB = (1e6 / (60 * shaftRpm)) * lifeRevMillionsB;
    bearingLifeB = {
      equivalentDynamicLoadN: Number(PB.toFixed(2)),
      l10RevolutionsMillions: Number(lifeRevMillionsB.toFixed(2)),
      l10Hours: Number(lifeHoursB.toFixed(1))
    };
  }

  return {
    shaftLengthMm,
    gearStationMm,
    stationAMm: bearingStationAMm,
    stationBMm: bearingStationBMm,
    appliedTransverseLoad: {
      Fy: Number(forceGlobal.Fy.toFixed(2)),
      Fz: Number(forceGlobal.Fz.toFixed(2)),
      MyNm: Number(momentGlobal.My.toFixed(3)),
      MzNm: Number(momentGlobal.Mz.toFixed(3))
    },
    appliedAxialLoad: {
      Fa: Number(forceGlobal.Fx.toFixed(2))
    },
    reactionA: {
      Ry: Number(reactions.reactions.A.Ry.toFixed(2)),
      Rz: Number(reactions.reactions.A.Rz.toFixed(2)),
      radialResultantN: Number(reactions.reactions.A.Fr.toFixed(2)),
      axialLoadN: Number(reactions.reactions.A.Fa.toFixed(2))
    },
    reactionB: {
      Ry: Number(reactions.reactions.B.Ry.toFixed(2)),
      Rz: Number(reactions.reactions.B.Rz.toFixed(2)),
      radialResultantN: Number(reactions.reactions.B.Fr.toFixed(2)),
      axialLoadN: Number(reactions.reactions.B.Fa.toFixed(2))
    },
    residuals: {
      forceY: Number(reactions.equilibriumCheck.sumFy),
      forceZ: Number(reactions.equilibriumCheck.sumFz),
      axialForce: Number(reactions.equilibriumCheck.sumFa),
      momentZ: Number(reactions.equilibriumCheck.sumMzAtA),
      momentY: Number(reactions.equilibriumCheck.sumMyAtA),
      isEquilibriumSatisfied: reactions.equilibriumCheck.isEquilibriumSatisfied
    },
    bearingLifeA,
    bearingLifeB,
    warnings
  };
}
