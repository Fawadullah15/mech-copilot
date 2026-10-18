import type {
  ShaftTransverseLoad,
  ShaftAxialLoad,
  SupportArrangement,
  LocatingSupportId,
  ReactionSolverResult,
  SupportReaction
} from './types';

export interface ReactionSolverOptions {
  shaftLength: number; // mm
  xA: number; // mm (Station A position)
  xB: number; // mm (Station B position)
  transverseLoads: ShaftTransverseLoad[];
  axialLoads?: ShaftAxialLoad[];
  arrangement?: SupportArrangement;
  locatingStation?: LocatingSupportId;
}

const EQUILIBRIUM_TOLERANCE = 1e-5; // N or N·mm

/**
 * Solves 3D static equilibrium reactions for a simply supported shaft
 * carrying point loads in orthogonal radial planes (y, z) and axial thrust.
 *
 * Enforces:
 *   sum Fy = 0
 *   sum Fz = 0
 *   sum Mz@A = 0
 *   sum My@A = 0
 *   Axial allocation per locating/floating or cross-located arrangement.
 */
export function solveShaftReactions(options: ReactionSolverOptions): ReactionSolverResult {
  const {
    shaftLength,
    xA,
    xB,
    transverseLoads,
    axialLoads = [],
    arrangement = 'locating_floating',
    locatingStation = 'A'
  } = options;

  // Validation
  if (!Number.isFinite(shaftLength) || shaftLength <= 0) {
    throw new Error(`Shaft length must be a positive finite number, received: ${shaftLength}`);
  }
  if (!Number.isFinite(xA) || !Number.isFinite(xB)) {
    throw new Error(`Bearing station positions xA and xB must be finite numbers.`);
  }
  if (xA < 0 || xA > shaftLength) {
    throw new Error(`Station A position xA (${xA} mm) is outside the shaft length [0, ${shaftLength}] mm.`);
  }
  if (xB < 0 || xB > shaftLength) {
    throw new Error(`Station B position xB (${xB} mm) is outside the shaft length [0, ${shaftLength}] mm.`);
  }
  const span = xB - xA;
  if (span <= 1e-4) {
    throw new Error(`Bearing support span must be positive (xB > xA). Received xA = ${xA} mm, xB = ${xB} mm (span: ${span} mm).`);
  }

  // Calculate totals and moments about Station A
  let totalAppliedFy = 0;
  let totalAppliedFz = 0;
  let momentZAboutA = 0; // Moment in xy plane due to Fy and applied Mz
  let momentYAboutA = 0; // Moment in xz plane due to Fz and applied My

  for (const load of transverseLoads) {
    if (!Number.isFinite(load.x) || !Number.isFinite(load.Fy) || !Number.isFinite(load.Fz)) {
      throw new Error(`Invalid load properties for load "${load.name || load.id}": x, Fy, and Fz must be finite numbers.`);
    }
    const dx = load.x - xA;
    totalAppliedFy += load.Fy;
    totalAppliedFz += load.Fz;

    const Mz = Number.isFinite(load.Mz) ? (load.Mz as number) : 0;
    const My = Number.isFinite(load.My) ? (load.My as number) : 0;

    momentZAboutA += load.Fy * dx + Mz;
    momentYAboutA += load.Fz * dx - My;
  }

  // Reaction components at Station B:
  // sum Mz@A = 0 => RyB * span + momentZAboutA = 0 => RyB = -momentZAboutA / span
  const RyB = -momentZAboutA / span;

  // sum My@A = 0 => RzB * span + momentYAboutA = 0 => RzB = -momentYAboutA / span
  const RzB = -momentYAboutA / span;

  // Reaction components at Station A from force equilibrium:
  // sum Fy = 0 => RyA + RyB + totalAppliedFy = 0 => RyA = -totalAppliedFy - RyB
  const RyA = -totalAppliedFy - RyB;

  // sum Fz = 0 => RzA + RzB + totalAppliedFz = 0 => RzA = -totalAppliedFz - RzB
  const RzA = -totalAppliedFz - RzB;

  // Resultant radial reactions on the bearings:
  // Radial bearing force Fr is the magnitude of the reaction vector
  const FrA = Math.sqrt(RyA * RyA + RzA * RzA);
  const FrB = Math.sqrt(RyB * RyB + RzB * RzB);

  // Axial load allocation:
  let totalAppliedFa = 0;
  for (const ax of axialLoads) {
    if (!Number.isFinite(ax.Fa)) {
      throw new Error(`Invalid axial load Fa for "${ax.name || ax.id}": must be a finite number.`);
    }
    totalAppliedFa += ax.Fa;
  }
  const netAxialMagnitude = Math.abs(totalAppliedFa);

  let FaA = 0;
  let FaB = 0;

  if (arrangement === 'locating_floating') {
    if (locatingStation === 'A') {
      FaA = netAxialMagnitude;
      FaB = 0;
    } else {
      FaA = 0;
      FaB = netAxialMagnitude;
    }
  } else {
    // Cross-located arrangement:
    // Directional thrust is carried by the bearing opposing the axial thrust vector.
    // If totalAppliedFa >= 0 (+x thrust), Bearing A resists thrust in positive direction;
    // if negative, Bearing B resists.
    if (totalAppliedFa >= 0) {
      FaA = netAxialMagnitude;
      FaB = 0;
    } else {
      FaA = 0;
      FaB = netAxialMagnitude;
    }
  }

  // Equilibrium check residuals
  const sumFy = RyA + RyB + totalAppliedFy;
  const sumFz = RzA + RzB + totalAppliedFz;
  const sumMzAtA = RyB * span + momentZAboutA;
  const sumMyAtA = RzB * span + momentYAboutA;
  const sumFa = (FaA + FaB) - netAxialMagnitude;

  const maxForceResidual = Math.max(Math.abs(sumFy), Math.abs(sumFz));
  const maxMomentResidual = Math.max(Math.abs(sumMzAtA), Math.abs(sumMyAtA));
  const isEquilibriumSatisfied =
    maxForceResidual <= EQUILIBRIUM_TOLERANCE &&
    maxMomentResidual <= EQUILIBRIUM_TOLERANCE &&
    Math.abs(sumFa) <= EQUILIBRIUM_TOLERANCE;

  const reactionA: SupportReaction = {
    stationId: 'A',
    name: 'Bearing Support A',
    x: xA,
    Ry: Number(RyA.toFixed(4)),
    Rz: Number(RzA.toFixed(4)),
    Fr: Number(FrA.toFixed(4)),
    Fa: Number(FaA.toFixed(4))
  };

  const reactionB: SupportReaction = {
    stationId: 'B',
    name: 'Bearing Support B',
    x: xB,
    Ry: Number(RyB.toFixed(4)),
    Rz: Number(RzB.toFixed(4)),
    Fr: Number(FrB.toFixed(4)),
    Fa: Number(FaB.toFixed(4))
  };

  const resultantTransverse = Math.sqrt(
    totalAppliedFy * totalAppliedFy + totalAppliedFz * totalAppliedFz
  );

  return {
    reactions: {
      A: reactionA,
      B: reactionB
    },
    appliedLoadsSummary: {
      totalFy: Number(totalAppliedFy.toFixed(4)),
      totalFz: Number(totalAppliedFz.toFixed(4)),
      totalFa: Number(totalAppliedFa.toFixed(4)),
      resultantTransverse: Number(resultantTransverse.toFixed(4)),
      pointLoadCount: transverseLoads.length
    },
    equilibriumCheck: {
      sumFy: Number(sumFy.toExponential(4)),
      sumFz: Number(sumFz.toExponential(4)),
      sumFa: Number(sumFa.toExponential(4)),
      sumMzAtA: Number(sumMzAtA.toExponential(4)),
      sumMyAtA: Number(sumMyAtA.toExponential(4)),
      maxForceResidual: Number(maxForceResidual.toExponential(4)),
      maxMomentResidual: Number(maxMomentResidual.toExponential(4)),
      isEquilibriumSatisfied
    },
    span,
    shaftLength,
    arrangement,
    locatingStation
  };
}
