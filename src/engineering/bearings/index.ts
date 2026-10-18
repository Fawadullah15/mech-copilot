import type {
  BearingCatalogItem,
  BearingEvaluation,
  CompleteBearingAnalysis,
  LocatingSupportId,
  ShaftAxialLoad,
  ShaftTransverseLoad,
  SupportArrangement,
  SupportReaction
} from './types';
import { solveShaftReactions } from './reactions';
import { calculateEquivalentDynamicLoad } from './equivalentLoad';
import { calculateL10Life } from './ratingLife';
import { calculateStaticSafety } from './staticRating';

export * from './types';
export * from './reactions';
export * from './equivalentLoad';
export * from './ratingLife';
export * from './staticRating';
export * from './catalogData';

/**
 * Evaluates dynamic life and static safety for a candidate bearing under a calculated support reaction.
 */
export function evaluateBearingStation(
  stationId: 'A' | 'B',
  reaction: SupportReaction,
  bearing: BearingCatalogItem,
  rpm: number
): BearingEvaluation {
  const equivalentLoad = calculateEquivalentDynamicLoad(bearing, reaction.Fr, reaction.Fa);
  const dynamicLife = calculateL10Life(bearing, equivalentLoad.P, rpm);
  const staticSafety = calculateStaticSafety(bearing, reaction.Fr, reaction.Fa);

  return {
    stationId,
    reaction,
    bearing,
    equivalentDynamicLoad: equivalentLoad,
    dynamicLife,
    staticSafety
  };
}

export interface CompleteAnalysisInput {
  shaftLength: number; // mm
  shaftDiameter: number; // mm
  rpm: number;
  xA: number; // mm
  xB: number; // mm
  transverseLoads: ShaftTransverseLoad[];
  axialLoads?: ShaftAxialLoad[];
  arrangement?: SupportArrangement;
  locatingStation?: LocatingSupportId;
  bearingA: BearingCatalogItem;
  bearingB: BearingCatalogItem;
}

/**
 * Runs a complete deterministic bearing analysis:
 * 1. Solves 3D static equilibrium reaction forces with residual check.
 * 2. Allocates axial thrust according to locating/floating support arrangement.
 * 3. Calculates ISO 281 equivalent dynamic load P at both supports.
 * 4. Calculates ISO 281 basic dynamic rating life L10 (revolutions & operating hours).
 * 5. Calculates ISO 76 static safety factor s0.
 * 6. Synthesizes overall engineering assessment.
 */
export function runCompleteBearingAnalysis(
  input: CompleteAnalysisInput
): CompleteBearingAnalysis {
  const {
    shaftLength,
    shaftDiameter,
    rpm,
    xA,
    xB,
    transverseLoads,
    axialLoads = [],
    arrangement = 'locating_floating',
    locatingStation = 'A',
    bearingA,
    bearingB
  } = input;

  const reactions = solveShaftReactions({
    shaftLength,
    xA,
    xB,
    transverseLoads,
    axialLoads,
    arrangement,
    locatingStation
  });

  const evalA = evaluateBearingStation('A', reactions.reactions.A, bearingA, rpm);
  const evalB = evaluateBearingStation('B', reactions.reactions.B, bearingB, rpm);

  // Overall status evaluation:
  let overallStatus: 'pass' | 'warning' | 'fail' = 'pass';
  if (
    evalA.dynamicLife.status === 'inadequate' ||
    evalB.dynamicLife.status === 'inadequate' ||
    evalA.staticSafety.status === 'brinelling_risk' ||
    evalB.staticSafety.status === 'brinelling_risk'
  ) {
    overallStatus = 'fail';
  } else if (
    evalA.dynamicLife.status === 'marginal' ||
    evalB.dynamicLife.status === 'marginal' ||
    evalA.staticSafety.status === 'caution' ||
    evalB.staticSafety.status === 'caution'
  ) {
    overallStatus = 'warning';
  }

  const summary =
    overallStatus === 'pass'
      ? `Both bearing supports (A: ${bearingA.designation}, B: ${bearingB.designation}) satisfy ISO 281 dynamic L10 life (min ${Math.round(
          Math.min(evalA.dynamicLife.L10Hours, evalB.dynamicLife.L10Hours)
        ).toLocaleString()} h ≥ 20,000 h) and ISO 76 static safety (s0 ≥ 1.5).`
      : overallStatus === 'warning'
      ? `Bearing subsystem operates with marginal parameters. Lowest L10h is ${Math.round(
          Math.min(evalA.dynamicLife.L10Hours, evalB.dynamicLife.L10Hours)
        ).toLocaleString()} h or minimum static safety s0 is ${Math.min(
          evalA.staticSafety.s0,
          evalB.staticSafety.s0
        ).toFixed(2)}.`
      : `Bearing subsystem does not meet design requirements. A bearing has inadequate dynamic life (< 5,000 h) or risks static plastic brinelling (s0 < 1.0).`;

  return {
    shaftLength,
    shaftDiameter,
    rpm,
    reactions,
    stationA: evalA,
    stationB: evalB,
    overallStatus,
    summary
  };
}
