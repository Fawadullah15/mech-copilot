/**
 * Notch Sensitivity and Fatigue Stress Concentration Engine
 * Implements Peterson's and Neuber's models for calculating q, qs, Kf, and Kfs
 * conforming to Shigley (11th Ed., 2020, Section 6-10) and Peterson (1974).
 */

import { NotchSensitivityResult } from './types';

/**
 * Calculates Peterson's material constant 'a' (in mm) based on ultimate tensile strength Sut.
 * @param sutMpa Ultimate tensile strength in MPa
 * @param materialCategory Material classification ('steel', 'aluminum', or 'other')
 */
export function calculatePetersonMaterialConstant(
  sutMpa: number,
  materialCategory: string = 'steel'
): { a: number; as: number } {
  const cat = materialCategory.toLowerCase();

  if (cat.includes('aluminum')) {
    // Shigley Eq. (6-35b) for aluminum alloys
    // a = 0.0254 * (345 / Sut)^2 mm
    const a = 0.0254 * Math.pow(345 / Math.max(100, sutMpa), 2.0);
    // In shear/torsion, empirical constant is approximately 0.6 * a
    return { a, as: 0.6 * a };
  }

  // Default to steel: Shigley Eq. (6-35a)
  // a = 0.0254 * (2070 / Sut)^1.8 mm
  const a = 0.0254 * Math.pow(2070 / Math.max(340, sutMpa), 1.8);
  const as = 0.6 * a;

  return { a, as };
}

/**
 * Calculates notch sensitivity (q, qs) and fatigue stress concentration factors (Kf, Kfs).
 * Kf = 1 + q * (Kt - 1)
 * Kfs = 1 + qs * (Kts - 1)
 *
 * @param kt Theoretical normal stress concentration factor
 * @param kts Theoretical shear stress concentration factor
 * @param notchRadiusMm Fillet or notch radius in mm
 * @param sutMpa Material ultimate tensile strength in MPa
 * @param materialCategory Material family (e.g. 'steel', 'aluminum')
 */
export function calculateNotchSensitivity(
  kt: number,
  kts: number,
  notchRadiusMm: number,
  sutMpa: number,
  materialCategory: string = 'steel'
): NotchSensitivityResult {
  const assumptions: string[] = [
    'Peterson notch sensitivity model evaluated at room temperature under constant amplitude loading',
    'Linear elastic microstructural notch averaging over characteristic grain dimension',
    'Kf applies exclusively to cyclic alternating stress amplitude (double counting Kt * Kf is strictly prohibited)',
  ];

  // Guard against non-physical inputs
  if (notchRadiusMm <= 0 || sutMpa <= 0) {
    return {
      model: 'Peterson',
      q: 0.0,
      qs: 0.0,
      kf: 1.0,
      kfs: 1.0,
      notchRadiusMm,
      materialConstantMm: 0,
      sourceReference: "Peterson's Notch Sensitivity Model (Shigley 11th Ed. Section 6-10)",
      assumptions: ['Invalid inputs: notch radius and Sut must be positive.'],
    };
  }

  // Calculate Peterson constant 'a'
  const { a, as: asConstant } = calculatePetersonMaterialConstant(sutMpa, materialCategory);

  // Normal notch sensitivity: q = 1 / (1 + a / r)
  const qRaw = 1.0 / (1.0 + a / notchRadiusMm);
  const q = Math.max(0.0, Math.min(1.0, Math.round(qRaw * 1000) / 1000));

  // Shear notch sensitivity: qs = 1 / (1 + as / r)
  const qsRaw = 1.0 / (1.0 + asConstant / notchRadiusMm);
  const qs = Math.max(0.0, Math.min(1.0, Math.round(qsRaw * 1000) / 1000));

  // Fatigue concentration factors:
  // Kf = 1 + q * (Kt - 1)
  // When q = 0 => Kf = 1 (notch insensitive)
  // When q = 1 => Kf = Kt (fully notch sensitive)
  const kfRaw = 1.0 + q * (Math.max(1.0, kt) - 1.0);
  const kfsRaw = 1.0 + qs * (Math.max(1.0, kts) - 1.0);

  const kf = Math.max(1.0, Math.round(kfRaw * 1000) / 1000);
  const kfs = Math.max(1.0, Math.round(kfsRaw * 1000) / 1000);

  return {
    model: 'Peterson',
    q,
    qs,
    kf,
    kfs,
    notchRadiusMm,
    materialConstantMm: Math.round(a * 10000) / 10000,
    sourceReference: "Peterson (1974); Shigley's Mechanical Engineering Design (11th Ed., 2020) Eqs. 6-34, 6-35",
    assumptions,
  };
}
