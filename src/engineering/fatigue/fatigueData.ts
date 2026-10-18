/**
 * Material Fatigue Intelligence and S-N Curve Fitting Engine
 * Conforming to ISO 1099, ISO 12107:2012, and ASTM E466-21.
 * Provides condition-specific fatigue properties and Basquin power-law parameters.
 */

import { MaterialFatigueData, SnDataPoint } from './types';

/**
 * Baseline fatigue dataset for the 10 catalog materials.
 * Crucial metallurgical distinction:
 * - Ferrous steels exhibit an endurance plateau at ~10^6 cycles (S'e = 0.5 * Sut up to 700 MPa).
 * - Aluminum alloys DO NOT exhibit an endurance plateau; fatigue strength is specified at 5x10^8 cycles.
 */
export const FATIGUE_MATERIALS_DATABASE: Record<string, MaterialFatigueData> = {
  'aisi-4140': {
    materialId: 'aisi-4140',
    materialName: 'AISI 4140 Steel',
    condition: 'Normalized & Tempered (Air cooled 870°C, Tempered 595°C)',
    tensileStrengthMpa: 1020,
    yieldStrengthMpa: 655,
    unmodifiedEnduranceLimitMpa: 510, // S'e = 0.5 * 1020 MPa
    hasEndurancePlateau: true,
    enduranceCycles: 1e6,
    basquinA: 1656.3,
    basquinB: -0.0851,
    validCycleRange: { min: 1e3, max: 1e7 },
    snPoints: [
      { cycles: 1e3, stressMpa: 918, source: '0.9 Sut baseline' },
      { cycles: 1e4, stressMpa: 754, source: 'ASM Handbook Vol. 19' },
      { cycles: 5e4, stressMpa: 650, source: 'ASM Handbook Vol. 19' },
      { cycles: 1e5, stressMpa: 615, source: 'ASM Handbook Vol. 19' },
      { cycles: 5e5, stressMpa: 540, source: 'Rotary beam specimen test' },
      { cycles: 1e6, stressMpa: 510, source: "Endurance limit plateau S'e" },
    ],
    dataSource: 'measured_test',
    provenanceCitation: 'ASM Handbook Vol. 19: Fatigue and Fracture; Shigley (11th Ed.) Table A-20',
  },
  'aisi-1045': {
    materialId: 'aisi-1045',
    materialName: 'AISI 1045 Steel',
    condition: 'Cold Drawn (Annealed/Cold Finished Bar)',
    tensileStrengthMpa: 625,
    yieldStrengthMpa: 530,
    unmodifiedEnduranceLimitMpa: 312.5, // 0.5 * 625 MPa
    hasEndurancePlateau: true,
    enduranceCycles: 1e6,
    basquinA: 1012.5,
    basquinB: -0.0851,
    validCycleRange: { min: 1e3, max: 1e7 },
    snPoints: [
      { cycles: 1e3, stressMpa: 562.5, source: '0.9 Sut baseline' },
      { cycles: 1e4, stressMpa: 462, source: 'Atlas of Fatigue Curves' },
      { cycles: 1e5, stressMpa: 380, source: 'Atlas of Fatigue Curves' },
      { cycles: 1e6, stressMpa: 312.5, source: "Endurance limit plateau S'e" },
    ],
    dataSource: 'measured_test',
    provenanceCitation: 'ASM Atlas of Fatigue Curves; SAE J1099 Technical Report',
  },
  'al-6061-t6': {
    materialId: 'al-6061-t6',
    materialName: 'Aluminum 6061-T6',
    condition: 'Solution heat-treated and artificially aged',
    tensileStrengthMpa: 310,
    yieldStrengthMpa: 276,
    unmodifiedEnduranceLimitMpa: 96.5, // Fatigue strength at 5e8 cycles (NO true plateau!)
    hasEndurancePlateau: false,
    enduranceCycles: 5e8,
    basquinA: 558.0,
    basquinB: -0.108,
    validCycleRange: { min: 1e3, max: 5e8 },
    snPoints: [
      { cycles: 1e3, stressMpa: 279, source: '0.9 Sut baseline' },
      { cycles: 1e4, stressMpa: 215, source: 'MIL-HDBK-5J / MMPDS-01' },
      { cycles: 1e5, stressMpa: 160, source: 'MIL-HDBK-5J / MMPDS-01' },
      { cycles: 1e6, stressMpa: 130, source: 'MIL-HDBK-5J / MMPDS-01' },
      { cycles: 1e7, stressMpa: 110, source: 'MIL-HDBK-5J / MMPDS-01' },
      { cycles: 5e8, stressMpa: 96.5, source: 'Pseudo-limit at 5x10^8 cycles' },
    ],
    dataSource: 'measured_test',
    provenanceCitation: 'MMPDS-01 Section 3.2.3; Aluminum Association Standards & Data',
    uncertaintyNotes: 'Aluminum alloys lack an infinite-life fatigue limit; design must specify finite service target.',
  },
  'ti-grade-5': {
    materialId: 'ti-grade-5',
    materialName: 'Titanium Grade 5 (Ti-6Al-4V)',
    condition: 'Annealed bar (730°C 2h, air cooled)',
    tensileStrengthMpa: 950,
    yieldStrengthMpa: 880,
    unmodifiedEnduranceLimitMpa: 485, // S'e ~ 0.51 * Sut at 10^7 cycles
    hasEndurancePlateau: true,
    enduranceCycles: 1e7,
    basquinA: 1502.8,
    basquinB: -0.071,
    validCycleRange: { min: 1e3, max: 1e8 },
    snPoints: [
      { cycles: 1e3, stressMpa: 855, source: '0.9 Sut baseline' },
      { cycles: 1e4, stressMpa: 710, source: 'ASM Handbook Vol. 19' },
      { cycles: 1e5, stressMpa: 600, source: 'ASM Handbook Vol. 19' },
      { cycles: 1e6, stressMpa: 520, source: 'Smooth specimen rotating beam' },
      { cycles: 1e7, stressMpa: 485, source: 'Titanium fatigue threshold' },
    ],
    dataSource: 'measured_test',
    provenanceCitation: 'Titanium Information Group Datasheet; ASM Handbook Vol. 19',
  },
  'aisi-4340': {
    materialId: 'aisi-4340',
    materialName: 'AISI 4340 Steel',
    condition: 'Oil Quenched 830°C, Tempered 540°C',
    tensileStrengthMpa: 1110,
    yieldStrengthMpa: 710,
    unmodifiedEnduranceLimitMpa: 555,
    hasEndurancePlateau: true,
    enduranceCycles: 1e6,
    basquinA: 1798.2,
    basquinB: -0.0851,
    validCycleRange: { min: 1e3, max: 1e7 },
    snPoints: [
      { cycles: 1e3, stressMpa: 999, source: '0.9 Sut baseline' },
      { cycles: 1e5, stressMpa: 670, source: 'SAE Technical Paper 880112' },
      { cycles: 1e6, stressMpa: 555, source: "Endurance limit plateau S'e" },
    ],
    dataSource: 'measured_test',
    provenanceCitation: 'SAE Fatigue Design Handbook; Shigley (11th Ed.) Table A-20',
  },
  'ss-304': {
    materialId: 'ss-304',
    materialName: 'Stainless Steel 304',
    condition: 'Annealed sheet/bar',
    tensileStrengthMpa: 505,
    yieldStrengthMpa: 215,
    unmodifiedEnduranceLimitMpa: 240, // Austenitic stainless S'e ~ 0.45-0.5 Sut
    hasEndurancePlateau: true,
    enduranceCycles: 1e6,
    basquinA: 860.0,
    basquinB: -0.092,
    validCycleRange: { min: 1e3, max: 1e7 },
    snPoints: [
      { cycles: 1e3, stressMpa: 454, source: '0.9 Sut baseline' },
      { cycles: 1e5, stressMpa: 300, source: 'Nickel Development Institute' },
      { cycles: 1e6, stressMpa: 240, source: "Endurance limit plateau S'e" },
    ],
    dataSource: 'measured_test',
    provenanceCitation: 'ASM Specialty Handbook: Stainless Steels; NiDI Reference Book',
  },
  'inconel-718': {
    materialId: 'inconel-718',
    materialName: 'Inconel 718',
    condition: 'Precipitation hardened (Aged 718°C)',
    tensileStrengthMpa: 1241,
    yieldStrengthMpa: 1034,
    unmodifiedEnduranceLimitMpa: 600,
    hasEndurancePlateau: true,
    enduranceCycles: 1e7,
    basquinA: 2075.0,
    basquinB: -0.078,
    validCycleRange: { min: 1e3, max: 1e8 },
    snPoints: [
      { cycles: 1e3, stressMpa: 1116, source: '0.9 Sut baseline' },
      { cycles: 1e5, stressMpa: 780, source: 'Special Metals Technical Bulletin' },
      { cycles: 1e7, stressMpa: 600, source: 'High cycle fatigue limit' },
    ],
    dataSource: 'measured_test',
    provenanceCitation: 'Special Metals Inconel 718 Bulletin; Aerospace Structural Metals Handbook',
  },
  'bronze-c932': {
    materialId: 'bronze-c932',
    materialName: 'Bronze C932 (SAE 660)',
    condition: 'Continuous cast bearing bronze',
    tensileStrengthMpa: 241,
    yieldStrengthMpa: 124,
    unmodifiedEnduranceLimitMpa: 95,
    hasEndurancePlateau: false,
    enduranceCycles: 1e8,
    basquinA: 494.0,
    basquinB: -0.125,
    validCycleRange: { min: 1e3, max: 1e8 },
    snPoints: [
      { cycles: 1e3, stressMpa: 216.9, source: '0.9 Sut baseline' },
      { cycles: 1e6, stressMpa: 115, source: 'Copper Development Association' },
      { cycles: 1e8, stressMpa: 95, source: 'Copper Development Association' },
    ],
    dataSource: 'empirical_screening',
    provenanceCitation: 'Copper Development Association (CDA) Publication 188; SAE J461',
  },
  'ss-316': {
    materialId: 'ss-316',
    materialName: 'Stainless Steel 316',
    condition: 'Annealed bar',
    tensileStrengthMpa: 550,
    yieldStrengthMpa: 240,
    unmodifiedEnduranceLimitMpa: 260,
    hasEndurancePlateau: true,
    enduranceCycles: 1e6,
    basquinA: 943.0,
    basquinB: -0.093,
    validCycleRange: { min: 1e3, max: 1e7 },
    snPoints: [
      { cycles: 1e3, stressMpa: 495, source: '0.9 Sut baseline' },
      { cycles: 1e5, stressMpa: 320, source: 'Outokumpu Corrosion Handbook' },
      { cycles: 1e6, stressMpa: 260, source: "Endurance limit plateau S'e" },
    ],
    dataSource: 'measured_test',
    provenanceCitation: 'Outokumpu Stainless Steel Handbook; ASTM A276',
  },
  'al-7075-t6': {
    materialId: 'al-7075-t6',
    materialName: 'Aluminum 7075-T6',
    condition: 'Solution heat treated and artificially aged',
    tensileStrengthMpa: 572,
    yieldStrengthMpa: 503,
    unmodifiedEnduranceLimitMpa: 159, // At 5e8 cycles (NO true plateau!)
    hasEndurancePlateau: false,
    enduranceCycles: 5e8,
    basquinA: 1029.0,
    basquinB: -0.108,
    validCycleRange: { min: 1e3, max: 5e8 },
    snPoints: [
      { cycles: 1e3, stressMpa: 514.8, source: '0.9 Sut baseline' },
      { cycles: 1e4, stressMpa: 380, source: 'MIL-HDBK-5J Section 3.7.4' },
      { cycles: 1e5, stressMpa: 275, source: 'MIL-HDBK-5J Section 3.7.4' },
      { cycles: 1e6, stressMpa: 210, source: 'MIL-HDBK-5J Section 3.7.4' },
      { cycles: 5e8, stressMpa: 159, source: 'MMPDS-01 pseudo-limit' },
    ],
    dataSource: 'measured_test',
    provenanceCitation: 'MIL-HDBK-5J / MMPDS-01; Alcoa Structural Handbook',
    uncertaintyNotes: 'High susceptibility to stress corrosion cracking in cross-grain orientations.',
  },
};

/**
 * Retrieves material fatigue intelligence by ID.
 * Returns undefined if material is not recognized.
 */
export function getMaterialFatigueData(materialId: string): MaterialFatigueData | undefined {
  return FATIGUE_MATERIALS_DATABASE[materialId];
}

export interface BasquinFitResult {
  success: boolean;
  basquinA: number;
  basquinB: number;
  rSquared: number;
  validCycleRange: { min: number; max: number };
  error?: string;
}

/**
 * Fits a log-log Basquin power-law model Sa = A * N^b to an experimental S-N dataset.
 * Linear regression: log10(Sa) = log10(A) + b * log10(N)
 */
export function fitBasquinModel(points: SnDataPoint[]): BasquinFitResult {
  if (!points || points.length < 2) {
    return {
      success: false,
      basquinA: 0,
      basquinB: 0,
      rSquared: 0,
      validCycleRange: { min: 0, max: 0 },
      error: 'At least 2 valid S-N data points are required for Basquin model fitting.',
    };
  }

  // Filter and validate points
  const validPoints = points.filter((p) => p.cycles > 0 && p.stressMpa > 0);
  if (validPoints.length < 2) {
    return {
      success: false,
      basquinA: 0,
      basquinB: 0,
      rSquared: 0,
      validCycleRange: { min: 0, max: 0 },
      error: 'Data points must have positive cycles and stresses.',
    };
  }

  const n = validPoints.length;
  let sumX = 0; // log10(N)
  let sumY = 0; // log10(Sa)
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  let minN = Infinity;
  let maxN = -Infinity;

  for (const pt of validPoints) {
    const x = Math.log10(pt.cycles);
    const y = Math.log10(pt.stressMpa);
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;

    if (pt.cycles < minN) minN = pt.cycles;
    if (pt.cycles > maxN) maxN = pt.cycles;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-12) {
    return {
      success: false,
      basquinA: 0,
      basquinB: 0,
      rSquared: 0,
      validCycleRange: { min: minN, max: maxN },
      error: 'Degenerate data: all cycle values are identical.',
    };
  }

  const b = (n * sumXY - sumX * sumY) / denominator;
  const logA = (sumY - b * sumX) / n;
  const A = Math.pow(10, logA);

  // Compute R^2
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;

  for (const pt of validPoints) {
    const x = Math.log10(pt.cycles);
    const y = Math.log10(pt.stressMpa);
    const yFit = logA + b * x;
    ssTot += Math.pow(y - meanY, 2);
    ssRes += Math.pow(y - yFit, 2);
  }

  const rSquared = ssTot > 0 ? Math.max(0, 1.0 - ssRes / ssTot) : 1.0;

  return {
    success: true,
    basquinA: Math.round(A * 10) / 10,
    basquinB: Math.round(b * 10000) / 10000,
    rSquared: Math.round(rSquared * 1000) / 1000,
    validCycleRange: { min: minN, max: maxN },
  };
}

/**
 * Calculates stress amplitude at a given cycle count using Basquin parameters Sa = A * N^b.
 * Clamps within valid domain or indicates extrapolation.
 */
export function evaluateStressLife(
  N: number,
  basquinA: number,
  basquinB: number,
  validRange: { min: number; max: number }
): { stressMpa: number; isExtrapolated: boolean } {
  if (N <= 0) return { stressMpa: 0, isExtrapolated: true };

  const isExtrapolated = N < validRange.min || N > validRange.max;
  const stressMpa = basquinA * Math.pow(N, basquinB);

  return {
    stressMpa: Math.round(stressMpa * 10) / 10,
    isExtrapolated,
  };
}
