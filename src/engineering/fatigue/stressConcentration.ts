/**
 * Stress Concentration Engine
 * Implements theoretical elastic stress concentration factors (Kt, Kts)
 * for stepped shafts and keyways conforming to Peterson (4th Ed., 2020) and Shigley (11th Ed., 2020).
 */

import {
  KeywayGeometry,
  LoadingMode,
  SteppedShaftFilletGeometry,
  StressConcentrationResult,
} from './types';

// Tabulated Peterson / Shigley Table A-15-9 coefficients for stepped shaft in bending: Kt = A * (r/d)^b
const STEPPED_SHAFT_BENDING_TABLE = [
  { D_over_d: 1.05, A: 0.94723, b: -0.27877 },
  { D_over_d: 1.10, A: 0.95880, b: -0.28269 },
  { D_over_d: 1.20, A: 0.97098, b: -0.21796 },
  { D_over_d: 1.30, A: 0.98565, b: -0.20846 },
  { D_over_d: 1.50, A: 0.93885, b: -0.25759 },
  { D_over_d: 2.00, A: 0.90880, b: -0.28598 },
  { D_over_d: 3.00, A: 0.89334, b: -0.30860 },
];

// Tabulated Peterson / Shigley Table A-15-8 coefficients for stepped shaft in torsion: Kts = A * (r/d)^b
const STEPPED_SHAFT_TORSION_TABLE = [
  { D_over_d: 1.05, A: 0.83425, b: -0.21621 },
  { D_over_d: 1.10, A: 0.83332, b: -0.23177 },
  { D_over_d: 1.20, A: 0.84634, b: -0.23974 },
  { D_over_d: 1.30, A: 0.85500, b: -0.24500 },
  { D_over_d: 1.50, A: 0.86900, b: -0.25200 },
  { D_over_d: 2.00, A: 0.89002, b: -0.24076 },
  { D_over_d: 3.00, A: 0.89700, b: -0.23800 },
];

/**
 * Helper to interpolate A and b coefficients for arbitrary D/d ratio.
 */
function interpolateCoefficients(
  table: Array<{ D_over_d: number; A: number; b: number }>,
  targetRatio: number
): { A: number; b: number } {
  if (targetRatio <= table[0].D_over_d) {
    return { A: table[0].A, b: table[0].b };
  }
  if (targetRatio >= table[table.length - 1].D_over_d) {
    return { A: table[table.length - 1].A, b: table[table.length - 1].b };
  }

  for (let i = 0; i < table.length - 1; i++) {
    const p1 = table[i];
    const p2 = table[i + 1];
    if (targetRatio >= p1.D_over_d && targetRatio <= p2.D_over_d) {
      const frac = (targetRatio - p1.D_over_d) / (p2.D_over_d - p1.D_over_d);
      return {
        A: p1.A + frac * (p2.A - p1.A),
        b: p1.b + frac * (p2.b - p1.b),
      };
    }
  }

  return { A: table[0].A, b: table[0].b };
}

/**
 * Calculates theoretical stress concentration factors for a round stepped shaft with a shoulder fillet.
 * Supports bending (Kt), torsion (Kts), and combined loading.
 * Valid domain: 1.01 <= D/d <= 3.00 and 0.02 <= r/d <= 0.30.
 */
export function calculateSteppedShaftStressConcentration(
  geom: SteppedShaftFilletGeometry,
  loadingMode: LoadingMode = 'bending'
): StressConcentrationResult {
  const { smallDiameterMm: d, largeDiameterMm: D, filletRadiusMm: r } = geom;

  const applicableRange = {
    dOverDMin: 1.01,
    dOverDMax: 3.00,
    rOverDMin: 0.02,
    rOverDMax: 0.30,
  };

  // Guard against non-positive dimensions
  if (d <= 0 || D <= 0 || r <= 0) {
    return {
      notchType: 'stepped_shoulder_fillet',
      loadingMode,
      kt: 1.0,
      kts: 1.0,
      isSupported: false,
      outOfRangeReason: `Geometric dimensions must be strictly positive (received d=${d}, D=${D}, r=${r}).`,
      applicableRange,
      rOverD: 0,
      DOverD: 0,
      sourceReference: "Peterson's Stress Concentration Factors (4th Ed.) / Shigley (11th Ed.)",
      method: 'analytical_fit',
      disclaimer: 'Invalid geometry parameters. Elastic concentration calculation aborted.',
    };
  }

  if (D < d) {
    return {
      notchType: 'stepped_shoulder_fillet',
      loadingMode,
      kt: 1.0,
      kts: 1.0,
      isSupported: false,
      outOfRangeReason: `Large diameter D (${D} mm) must be greater than or equal to small diameter d (${d} mm).`,
      applicableRange,
      rOverD: r / d,
      DOverD: D / d,
      sourceReference: "Peterson's Stress Concentration Factors (4th Ed.) / Shigley (11th Ed.)",
      method: 'analytical_fit',
      disclaimer: 'Inverted stepped shaft diameters; cannot evaluate shoulder fillet.',
    };
  }

  const DOverD = D / d;
  const rOverD = r / d;

  // Domain boundary validation
  let isSupported = true;
  let outOfRangeReason: string | undefined;

  if (DOverD < applicableRange.dOverDMin || DOverD > applicableRange.dOverDMax) {
    isSupported = false;
    outOfRangeReason = `Diameter ratio D/d = ${DOverD.toFixed(3)} is outside validated domain [${applicableRange.dOverDMin}, ${applicableRange.dOverDMax}].`;
  } else if (rOverD < applicableRange.rOverDMin || rOverD > applicableRange.rOverDMax) {
    isSupported = false;
    outOfRangeReason = `Fillet radius ratio r/d = ${rOverD.toFixed(3)} is outside validated domain [${applicableRange.rOverDMin}, ${applicableRange.rOverDMax}].`;
  }

  // Calculate Kt (bending)
  const coeffBending = interpolateCoefficients(STEPPED_SHAFT_BENDING_TABLE, DOverD);
  const ktRaw = coeffBending.A * Math.pow(rOverD, coeffBending.b);
  const kt = Math.max(1.0, Math.round(ktRaw * 1000) / 1000);

  // Calculate Kts (torsion)
  const coeffTorsion = interpolateCoefficients(STEPPED_SHAFT_TORSION_TABLE, DOverD);
  const ktsRaw = coeffTorsion.A * Math.pow(rOverD, coeffTorsion.b);
  const kts = Math.max(1.0, Math.round(ktsRaw * 1000) / 1000);

  return {
    notchType: 'stepped_shoulder_fillet',
    loadingMode,
    kt: isSupported ? kt : 1.0,
    kts: isSupported ? kts : 1.0,
    isSupported,
    outOfRangeReason,
    applicableRange,
    rOverD: Math.round(rOverD * 1000) / 1000,
    DOverD: Math.round(DOverD * 1000) / 1000,
    sourceReference: "Peterson's Stress Concentration Factors (4th Ed.) Tables 3.1 & 3.2; Shigley (11th Ed.) Tables A-15-8 & A-15-9",
    method: 'analytical_fit',
    disclaimer: isSupported
      ? 'Theoretical elastic stress concentration factor for linear elastic isotropic material under constant section discontinuity.'
      : 'Out-of-range geometry: extrapolation is prohibited per engineering standards.',
  };
}

/**
 * Calculates stress concentration factors for a keyed shaft (profile end-milled vs sled-runner keyways)
 * based on Peterson (Section 6.5) and Shigley (Table 7-1).
 */
export function calculateKeywayStressConcentration(
  geom: KeywayGeometry,
  loadingMode: LoadingMode = 'bending'
): StressConcentrationResult {
  const { shaftDiameterMm: d, filletRadiusMm: rk, keywayType } = geom;

  const applicableRange = {
    dOverDMin: 1.0,
    dOverDMax: 1.0,
    rOverDMin: 0.01,
    rOverDMax: 0.05,
  };

  if (d <= 0 || rk <= 0) {
    return {
      notchType: keywayType,
      loadingMode,
      kt: 1.0,
      kts: 1.0,
      isSupported: false,
      outOfRangeReason: 'Shaft diameter and keyway fillet radius must be strictly positive.',
      applicableRange,
      rOverD: 0,
      DOverD: 1.0,
      sourceReference: "Peterson's Stress Concentration Factors (4th Ed., Section 6.5) / Shigley (11th Ed., Table 7-1)",
      method: 'standard_constant',
      disclaimer: 'Invalid keyway geometry.',
    };
  }

  const rOverD = rk / d;
  let isSupported = true;
  let outOfRangeReason: string | undefined;

  if (rOverD < applicableRange.rOverDMin || rOverD > applicableRange.rOverDMax) {
    isSupported = false;
    outOfRangeReason = `Keyway corner fillet ratio r_k/d = ${rOverD.toFixed(4)} is outside recommended range [0.01, 0.05].`;
  }

  let kt = 2.14;
  let kts = 3.00;

  if (keywayType === 'sled_runner_keyway') {
    // Sled runner keyway has smooth gradual runout, lower Kt in bending
    kt = 1.70;
    kts = 2.40;
  } else {
    // Profile keyway (end-milled)
    // Adjust for corner radius if provided
    if (rOverD < 0.015) {
      kt = 2.80;
    } else if (rOverD > 0.03) {
      kt = 1.95;
    } else {
      kt = 2.14;
    }
    kts = 3.00;
  }

  return {
    notchType: keywayType,
    loadingMode,
    kt: isSupported ? kt : 1.0,
    kts: isSupported ? kts : 1.0,
    isSupported,
    outOfRangeReason,
    applicableRange,
    rOverD: Math.round(rOverD * 1000) / 1000,
    DOverD: 1.0,
    sourceReference: "Peterson's Stress Concentration Factors (4th Ed., Section 6.5) / Shigley (11th Ed., Table 7-1)",
    method: 'standard_constant',
    disclaimer:
      'Elastic stress concentration at keyway root fillet. Actual localized notch fatigue behavior must be evaluated using notch sensitivity factor q.',
  };
}
