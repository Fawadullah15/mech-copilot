/**
 * Cyclic Loading, Mean-Stress Correction & Fatigue Life Evaluation Engine
 * Implements Modified Goodman, Gerber, Soderberg, and ASME Elliptic criteria,
 * and Basquin finite life estimation conforming to Shigley (11th Ed., Chapter 6).
 */

import {
  FatigueEvaluationResult,
  MaterialFatigueData,
  MeanStressCriterion,
} from './types';

export interface FatigueEvaluationInputs {
  nominalAlternatingStressMpa: number; // sigma_a0
  nominalMeanStressMpa: number;        // sigma_m0
  kf: number;                         // Normal fatigue concentration factor
  modifiedEnduranceLimitMpa: number;  // Se
  material: MaterialFatigueData;
  criterion?: MeanStressCriterion;
  rpm?: number;
}

/**
 * Evaluates constant-amplitude cyclic fatigue life and safety factor.
 */
export function evaluateFatigueLife(inputs: FatigueEvaluationInputs): FatigueEvaluationResult {
  const {
    nominalAlternatingStressMpa,
    nominalMeanStressMpa,
    kf,
    modifiedEnduranceLimitMpa: Se,
    material,
    criterion = 'goodman',
    rpm,
  } = inputs;

  const Sut = material.tensileStrengthMpa;
  const Sy = material.yieldStrengthMpa;

  const warnings: string[] = [];
  const assumptions: string[] = [
    'Constant-amplitude uniaxial/equivalent cyclic stress with linear elastic response',
    'Fatigue stress concentration factor Kf applied to alternating stress component',
    'Compressive mean stresses assumed non-damaging (effective sigma_m = 0 when sigma_m <= 0)',
  ];

  // Apply Kf to nominal alternating stress
  const peakAlt = Math.max(0, kf * nominalAlternatingStressMpa);

  // Unrelaxed maximum stress for first-cycle static yield check (Langer line)
  const unrelaxedMaxStress = nominalMeanStressMpa + peakAlt;
  const staticYieldSafetyFactor =
    unrelaxedMaxStress > 0 ? Math.round((Sy / unrelaxedMaxStress) * 100) / 100 : Infinity;

  // Peak mean stress treatment: In ductile metals with yield relief, cyclic mean stress is bounded
  let peakMean = nominalMeanStressMpa;
  if (unrelaxedMaxStress > Sy && nominalMeanStressMpa > 0) {
    peakMean = Math.max(0, Sy - peakAlt);
    assumptions.push('Local notch root yielding relieves peak mean stress to Sy - sigma_a per Dowling rule.');
  }

  // Stress ratio R and amplitude ratio A
  const maxStress = peakMean + peakAlt;
  const minStress = peakMean - peakAlt;
  const stressRatioR = maxStress !== 0 ? Math.round((minStress / maxStress) * 1000) / 1000 : 0;
  const amplitudeRatioA = peakMean !== 0 ? Math.round((peakAlt / peakMean) * 1000) / 1000 : Infinity;

  if (staticYieldSafetyFactor < 1.0) {
    warnings.push(
      `First-cycle static yield failure predicted (ny = ${staticYieldSafetyFactor} < 1.0). Component will undergo gross plastic deformation before cyclic fatigue life is reached.`
    );
  }

  // 2. Fatigue Factor of Safety nf under Selected Criterion
  let fatigueSafetyFactor = 1.0;
  let equivalentReversedStressMpa = peakAlt;

  if (peakAlt === 0) {
    fatigueSafetyFactor = Infinity;
    equivalentReversedStressMpa = 0;
  } else if (peakMean <= 0) {
    // Compressive mean stress does not promote fatigue crack growth
    fatigueSafetyFactor = Math.round((Se / peakAlt) * 100) / 100;
    equivalentReversedStressMpa = peakAlt;
  } else {
    // Tensile mean stress > 0
    switch (criterion) {
      case 'goodman': {
        // Goodman: sigma_a / Se + sigma_m / Sut = 1 / nf
        const denom = peakAlt / Se + peakMean / Sut;
        fatigueSafetyFactor = denom > 0 ? Math.round((1.0 / denom) * 100) / 100 : 0;
        equivalentReversedStressMpa = peakAlt / Math.max(0.01, 1.0 - peakMean / Sut);
        break;
      }
      case 'gerber': {
        // Gerber: sigma_a / Se + (sigma_m / Sut)^2 * nf = 1 / nf
        const term1 = 0.5 * Math.pow(Sut / peakMean, 2) * (peakAlt / Se);
        const term2 = Math.sqrt(1 + Math.pow((2 * peakMean * Se) / (Sut * peakAlt), 2));
        const nfRaw = term1 * (-1 + term2);
        fatigueSafetyFactor = Math.max(0, Math.round(nfRaw * 100) / 100);
        equivalentReversedStressMpa = peakAlt / Math.max(0.01, 1.0 - Math.pow(peakMean / Sut, 2));
        break;
      }
      case 'soderberg': {
        // Soderberg: sigma_a / Se + sigma_m / Sy = 1 / nf (Conservative, guards against yield)
        const denom = peakAlt / Se + peakMean / Sy;
        fatigueSafetyFactor = denom > 0 ? Math.round((1.0 / denom) * 100) / 100 : 0;
        equivalentReversedStressMpa = peakAlt / Math.max(0.01, 1.0 - peakMean / Sy);
        break;
      }
      case 'asme_elliptic': {
        // ASME Elliptic: (sigma_a / Se)^2 + (sigma_m / Sy)^2 = 1 / nf^2
        const sumSq = Math.pow(peakAlt / Se, 2) + Math.pow(peakMean / Sy, 2);
        fatigueSafetyFactor = sumSq > 0 ? Math.round((1.0 / Math.sqrt(sumSq)) * 100) / 100 : 0;
        equivalentReversedStressMpa = Math.sqrt(
          Math.pow(peakAlt, 2) + Math.pow((Se / Sy) * peakMean, 2)
        );
        break;
      }
    }
  }

  equivalentReversedStressMpa = Math.round(equivalentReversedStressMpa * 10) / 10;

  // 3. Life in Cycles Estimation (Basquin Model)
  const isInfiniteLife = material.hasEndurancePlateau && fatigueSafetyFactor >= 1.0 && equivalentReversedStressMpa <= Se;

  let estimatedCycles: number | 'infinite' | 'lcf_out_of_domain' = 'infinite';
  let estimatedHours: number | 'infinite' | undefined;

  if (isInfiniteLife) {
    estimatedCycles = 'infinite';
    estimatedHours = 'infinite';
  } else {
    // Finite life estimation via Basquin power law: Sa = A * N^b => N = (Sa / A)^(1/b)
    const A = material.basquinA;
    const b = material.basquinB;

    if (b !== 0 && A > 0 && equivalentReversedStressMpa > 0) {
      const nRaw = Math.pow(equivalentReversedStressMpa / A, 1.0 / b);
      if (nRaw < 1000) {
        estimatedCycles = 'lcf_out_of_domain';
        warnings.push(
          `Estimated life is in the Low-Cycle Fatigue (LCF) regime (N < 10^3 cycles). Elastic stress-life S-N curves are not valid; plastic strain-life (Coeffin-Manson) formulation required.`
        );
      } else {
        estimatedCycles = Math.round(nRaw);
        if (rpm && rpm > 0) {
          // Assuming 1 shaft rotation = 1 cyclic stress reversal in rotating bending
          estimatedHours = Math.round((estimatedCycles / (60 * rpm)) * 10) / 10;
        }
      }
    } else {
      estimatedCycles = 'infinite';
      estimatedHours = 'infinite';
    }
  }

  // Determine governing mode
  let governingFailureMode: 'fatigue' | 'static_yield' | 'infinite_life' = 'infinite_life';
  if (staticYieldSafetyFactor < 1.0) {
    governingFailureMode = 'static_yield';
  } else if (!isInfiniteLife) {
    governingFailureMode = 'fatigue';
  }

  return {
    nominalAlternatingStressMpa: Math.round(nominalAlternatingStressMpa * 10) / 10,
    nominalMeanStressMpa: Math.round(nominalMeanStressMpa * 10) / 10,
    peakAlternatingStressMpa: Math.round(peakAlt * 10) / 10,
    peakMeanStressMpa: Math.round(peakMean * 10) / 10,
    stressRatioR,
    amplitudeRatioA,
    modifiedEnduranceLimitMpa: Se,
    criterion,
    fatigueSafetyFactor,
    staticYieldSafetyFactor,
    isInfiniteLife,
    estimatedCycles,
    estimatedHours,
    governingFailureMode,
    equivalentReversedStressMpa,
    warnings,
    assumptions,
    modelValidityDomain:
      'High-cycle fatigue (10^3 <= N <= 10^7 cycles) under constant amplitude elastic loading.',
  };
}
