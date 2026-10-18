import type { BearingCatalogItem, L10RatingLifeResult } from './types';

/**
 * Calculates basic dynamic L10 rating life in millions of revolutions
 * and operating hours per ISO 281:2007.
 *
 * L10 = (C / P)^p   [10^6 revolutions]
 * L10h = (10^6 / (60 * n)) * (C / P)^p   [hours]
 *
 * p = 3 for ball bearings
 * p = 10/3 for roller bearings
 */
export function calculateL10Life(
  bearing: BearingCatalogItem,
  equivalentLoadP: number,
  rpm: number
): L10RatingLifeResult {
  if (bearing.C <= 0) {
    throw new Error(`Dynamic load rating C must be positive, received: ${bearing.C} N`);
  }

  // Determine life exponent p
  const isRoller = bearing.type === 'cylindrical_roller' || bearing.type === 'tapered_roller';
  const p = isRoller ? 10 / 3 : 3;

  const P = Math.max(0, equivalentLoadP);

  // Unloaded / stationary edge case
  if (P === 0) {
    return {
      L10RevolutionsMillions: Infinity,
      L10Hours: Infinity,
      rpm,
      p,
      dynamicCapacityC: bearing.C,
      equivalentLoadP: 0,
      status: 'adequate',
      statusMessage: 'Bearing is unloaded; theoretical fatigue life is infinite.',
      assumptions: [
        'Purely unloaded condition (P = 0 N)',
        'Neglects minimum skid load requirements for rolling elements'
      ],
      limitations: [
        'Real rolling bearings require a minimum operating load (typically P_min > 0.01*C0 to 0.02*C) to prevent roller skidding and smearing.'
      ]
    };
  }

  const loadRatio = bearing.C / P;
  const L10Revs = Math.pow(loadRatio, p); // in 10^6 revolutions

  let L10Hours = 0;
  if (rpm > 0) {
    // L10h = (10^6 / (60 * n)) * (C / P)^p
    L10Hours = (1e6 / (60 * rpm)) * L10Revs;
  }

  // Status classification against standard industrial machinery benchmarks
  let status: 'adequate' | 'marginal' | 'inadequate' = 'adequate';
  let statusMessage = '';

  if (L10Hours >= 20000) {
    status = 'adequate';
    statusMessage = `L10h = ${Math.round(L10Hours).toLocaleString()} h exceeds general industrial continuous service target (≥ 20,000 h).`;
  } else if (L10Hours >= 5000) {
    status = 'marginal';
    statusMessage = `L10h = ${Math.round(L10Hours).toLocaleString()} h is marginal for continuous duty; suitable for intermittent or moderate service (5,000–20,000 h).`;
  } else {
    status = 'inadequate';
    statusMessage = `L10h = ${Math.round(L10Hours).toLocaleString()} h is below industrial minimum target (< 5,000 h); high risk of early contact fatigue spalling.`;
  }

  const assumptions = [
    'Basic ISO 281:2007 dynamic rating model based on 90% survival probability (10% failure rate).',
    'Standard elastohydrodynamic lubrication regime with clean mineral oil or grease (viscosity ratio κ ≥ 1.0, clean lubricant factor a_ISO = 1.0).',
    'Standard bearing steel quality per ISO 683-17 through-hardened or case-hardened alloy.',
    'Rigid housing seats and negligible shaft misalignment (slope θ < 2 to 10 arcmin).'
  ];

  const limitations = [
    'Basic L10 life does not incorporate ISO 16281:2025 modified reference rating life (which models internal clearance, profile crowning, and contact stress distribution).',
    'Operating temperatures above 120 °C require material hardness and dimensional stabilization de-rating.',
    'Environmental particulate ingress, water contamination, or severe vibration will significantly reduce real field life.'
  ];

  return {
    L10RevolutionsMillions: Number(L10Revs.toFixed(2)),
    L10Hours: Number(L10Hours.toFixed(1)),
    rpm,
    p: Number(p.toFixed(4)),
    dynamicCapacityC: bearing.C,
    equivalentLoadP: Number(P.toFixed(2)),
    status,
    statusMessage,
    assumptions,
    limitations
  };
}
