/**
 * Marin Fatigue Strength Modification Factors Engine
 * Evaluates ka, kb, kc, kd, ke to calculate the fully modified component endurance limit Se:
 * Se = ka * kb * kc * kd * ke * kf * S'e
 * Conforming to Shigley's Mechanical Engineering Design (11th Ed., 2020, Section 6-8).
 */

import { LoadingMode, MarinFactors, SurfaceFinish } from './types';

// Shigley Table 6-2 parameters for ka = a * Sut^b (with Sut in MPa)
const SURFACE_FINISH_TABLE: Record<SurfaceFinish, { a: number; b: number }> = {
  ground: { a: 1.58, b: -0.085 },
  machined: { a: 4.51, b: -0.265 },
  'hot-rolled': { a: 57.7, b: -0.718 },
  'as-forged': { a: 272.0, b: -0.995 },
};

// Shigley Table 6-5 Reliability factor ke
const RELIABILITY_TABLE: Record<number, number> = {
  50: 1.0,
  90: 0.897,
  95: 0.868,
  99: 0.814,
  99.9: 0.753,
  99.99: 0.702,
};

/**
 * Calculates Marin surface finish factor ka.
 */
export function calculateSurfaceFactor(surface: SurfaceFinish, sutMpa: number): number {
  const { a, b } = SURFACE_FINISH_TABLE[surface] || SURFACE_FINISH_TABLE.machined;
  const kaRaw = a * Math.pow(Math.max(200, sutMpa), b);
  return Math.max(0.1, Math.min(1.0, Math.round(kaRaw * 1000) / 1000));
}

/**
 * Calculates Marin size factor kb for round circular rotating shafts.
 */
export function calculateSizeFactor(diameterMm: number, mode: LoadingMode = 'bending'): number {
  if (mode === 'axial') {
    return 1.0; // Axial loading has no gradient size effect
  }

  const d = Math.max(1, diameterMm);

  if (d <= 2.79) {
    return 1.0;
  }
  if (d <= 51.0) {
    // Shigley Eq. (6-20)
    const kbRaw = 1.24 * Math.pow(d, -0.107);
    return Math.max(0.4, Math.min(1.0, Math.round(kbRaw * 1000) / 1000));
  }
  if (d <= 254.0) {
    const kbRaw = 1.51 * Math.pow(d, -0.157);
    return Math.max(0.3, Math.min(1.0, Math.round(kbRaw * 1000) / 1000));
  }

  // Large shafts > 254 mm (10 in)
  const kbRaw = 1.51 * Math.pow(254, -0.157);
  return Math.max(0.3, Math.round(kbRaw * 1000) / 1000);
}

/**
 * Calculates Marin loading factor kc.
 */
export function calculateLoadingFactor(mode: LoadingMode): number {
  switch (mode) {
    case 'bending':
      return 1.0;
    case 'axial':
      return 0.85;
    case 'torsion':
      return 0.59; // Distortion energy theory: Sse = 0.577 * Se ~ 0.59
    case 'combined':
      return 1.0; // When stresses are transformed into equivalent von Mises state
    default:
      return 1.0;
  }
}

/**
 * Calculates Marin temperature factor kd (for T <= 450 °C).
 */
export function calculateTemperatureFactor(tempC: number): { kd: number; warning?: string } {
  if (tempC <= 20) {
    return { kd: 1.0 };
  }

  if (tempC > 450) {
    return {
      kd: 0.5,
      warning: `Operating temperature ${tempC}°C exceeds 450°C. Creep and thermal fatigue dominate; high-temperature creep analysis is required.`,
    };
  }

  // Shigley Eq. (6-27) normalized polynomial for ST/SRT
  const T = tempC;
  const kdRaw =
    0.975 +
    0.432e-3 * T -
    0.115e-5 * Math.pow(T, 2) +
    0.104e-8 * Math.pow(T, 3) -
    0.595e-12 * Math.pow(T, 4);

  return {
    kd: Math.max(0.3, Math.min(1.02, Math.round(kdRaw * 1000) / 1000)),
  };
}

/**
 * Calculates Marin reliability factor ke from percentage reliability.
 */
export function calculateReliabilityFactor(reliabilityPercent: number): number {
  if (reliabilityPercent <= 50) return 1.0;
  if (reliabilityPercent >= 99.99) return 0.702;
  if (reliabilityPercent >= 99.9) return 0.753;
  if (reliabilityPercent >= 99.0) return 0.814;
  if (reliabilityPercent >= 95.0) return 0.868;
  if (reliabilityPercent >= 90.0) return 0.897;

  // Linear interpolation for intermediate reliabilities
  const p = reliabilityPercent;
  if (p < 90) return Math.round((1.0 - ((p - 50) / 40) * 0.103) * 1000) / 1000;
  if (p < 95) return Math.round((0.897 - ((p - 90) / 5) * 0.029) * 1000) / 1000;
  return Math.round((0.868 - ((p - 95) / 4) * 0.054) * 1000) / 1000;
}

export interface MarinFactorInputs {
  unmodifiedEnduranceLimitMpa: number;
  sutMpa: number;
  diameterMm: number;
  surfaceFinish?: SurfaceFinish;
  loadingMode?: LoadingMode;
  operatingTempC?: number;
  reliabilityPercent?: number;
}

/**
 * Computes all Marin factors and the fully modified endurance limit Se.
 */
export function calculateMarinFactors(inputs: MarinFactorInputs): MarinFactors {
  const {
    unmodifiedEnduranceLimitMpa: Sprime_e,
    sutMpa,
    diameterMm,
    surfaceFinish = 'machined',
    loadingMode = 'bending',
    operatingTempC = 20,
    reliabilityPercent = 90,
  } = inputs;

  const warnings: string[] = [];

  const ka = calculateSurfaceFactor(surfaceFinish, sutMpa);
  const kb = calculateSizeFactor(diameterMm, loadingMode);
  const kc = calculateLoadingFactor(loadingMode);
  const { kd, warning: tempWarning } = calculateTemperatureFactor(operatingTempC);
  if (tempWarning) warnings.push(tempWarning);

  const ke = calculateReliabilityFactor(reliabilityPercent);
  const kf = 1.0; // Miscellaneous factor (no severe corrosion or plating degradation assumed)

  if (diameterMm > 200) {
    warnings.push(`Shaft diameter ${diameterMm} mm is exceptionally large; significant size effect derating applied.`);
  }

  const modifiedEnduranceLimitMpa = Math.round(ka * kb * kc * kd * ke * kf * Sprime_e * 10) / 10;

  return {
    ka,
    kb,
    kc,
    kd,
    ke,
    kf,
    modifiedEnduranceLimitMpa,
    details: {
      surfaceFinish,
      diameterMm,
      loadingMode,
      operatingTempC,
      reliabilityPercent,
      formulaCitation: "Marin (1962); Shigley's Mechanical Engineering Design (11th Ed., 2020) Eq. 6-18",
      warnings,
    },
  };
}
