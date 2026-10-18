import type {
  StackUpComponent,
  StackUpContributor,
  StackUpResult,
} from './types';

/**
 * 1D Dimensional Tolerance Stack-Up Engine
 * Computes deterministic Worst-Case (Arithmetic) and Statistical (Root-Sum-Square) assemblies
 */
export function calculateToleranceStackUp(
  components: StackUpComponent[]
): StackUpResult {
  if (!components || components.length === 0) {
    throw new Error('Tolerance stack-up requires at least one dimensional component in the chain.');
  }

  // 1. Nominal Assembly Dimension: sum of (direction * nominal)
  let nominalAssemblyMm = 0;
  let worstCaseMaxMm = 0;
  let worstCaseMinMm = 0;
  let totalWorstCaseVariationMm = 0;
  let sumOfVarianceMm2 = 0;

  const contributors: StackUpContributor[] = [];

  for (const comp of components) {
    const dir = comp.direction === 1 ? 1 : -1;
    nominalAssemblyMm += dir * comp.nominalMm;

    // Component limits in absolute mm
    const maxVal = comp.nominalMm + comp.upperTolMm;
    const minVal = comp.nominalMm + comp.lowerTolMm;

    // Individual tolerance range
    const tolRange = Math.abs(comp.upperTolMm - comp.lowerTolMm);
    totalWorstCaseVariationMm += tolRange;
    sumOfVarianceMm2 += Math.pow(tolRange, 2);

    // In worst-case stack:
    // If direction is +1: adding dimension increases assembly gap -> max contributes to max, min contributes to min
    // If direction is -1: subtracting dimension reduces assembly gap -> min contributes to max, max contributes to min
    if (dir === 1) {
      worstCaseMaxMm += maxVal;
      worstCaseMinMm += minVal;
    } else {
      worstCaseMaxMm -= minVal;
      worstCaseMinMm -= maxVal;
    }

    contributors.push({
      component: comp,
      minMm: Number(minVal.toFixed(4)),
      maxMm: Number(maxVal.toFixed(4)),
      toleranceRangeMm: Number(tolRange.toFixed(4)),
      worstCasePercent: 0, // calculated in second pass
      rssVariancePercent: 0, // calculated in second pass
    });
  }

  // Second pass: compute percentage contributions
  for (const contrib of contributors) {
    contrib.worstCasePercent =
      totalWorstCaseVariationMm > 0
        ? Number(((contrib.toleranceRangeMm / totalWorstCaseVariationMm) * 100).toFixed(1))
        : 0;

    contrib.rssVariancePercent =
      sumOfVarianceMm2 > 0
        ? Number(((Math.pow(contrib.toleranceRangeMm, 2) / sumOfVarianceMm2) * 100).toFixed(1))
        : 0;
  }

  // Statistical Root-Sum-Square (RSS) Stack-Up:
  // Assumes independent, normally distributed component variations with +/- 3 sigma process spread (Cp >= 1.0)
  const rssVariationMm = Math.sqrt(sumOfVarianceMm2);
  const rssMaxMm = nominalAssemblyMm + rssVariationMm / 2;
  const rssMinMm = nominalAssemblyMm - rssVariationMm / 2;

  // Identify top tolerance driver
  const sortedByRange = [...contributors].sort(
    (a, b) => b.toleranceRangeMm - a.toleranceRangeMm
  );
  const topDriver = sortedByRange[0];

  const assumptions = [
    'One-dimensional linear stack-up along a single geometric vector axis',
    'Rigid body components without elastic deformation or thermal expansion during assembly',
    'Component tolerances are independent and uncorrelated',
    'Statistical RSS assumes normal distribution centered at nominal with +/- 3 sigma capability',
  ];

  const disclaimer =
    'Statistical RSS is a probabilistic estimate (predicting ~99.73% assembly yield under ideal manufacturing centering). It is NOT a guaranteed worst-case physical bound. For mission-critical zero-defect assemblies, the Worst-Case arithmetic limits must govern.';

  return {
    nominalAssemblyMm: Number(nominalAssemblyMm.toFixed(4)),
    worstCaseMinMm: Number(worstCaseMinMm.toFixed(4)),
    worstCaseMaxMm: Number(worstCaseMaxMm.toFixed(4)),
    worstCaseVariationMm: Number(totalWorstCaseVariationMm.toFixed(4)),
    rssMinMm: Number(rssMinMm.toFixed(4)),
    rssMaxMm: Number(rssMaxMm.toFixed(4)),
    rssVariationMm: Number(rssVariationMm.toFixed(4)),
    contributors,
    topDriver,
    assumptions,
    disclaimer,
  };
}
