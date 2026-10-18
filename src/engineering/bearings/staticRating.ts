import type { BearingCatalogItem, StaticSafetyResult } from './types';

/**
 * Calculates static equivalent load P0 and static safety factor s0
 * per ISO 76:2006 (incorporating Amendment 1:2017).
 *
 * P0 = max(X0 * Fr + Y0 * Fa, Fr)
 * s0 = C0 / P0
 */
export function calculateStaticSafety(
  bearing: BearingCatalogItem,
  radialLoadN: number,
  axialLoadN: number
): StaticSafetyResult {
  const Fr = Math.abs(radialLoadN);
  const Fa = Math.abs(axialLoadN);

  if (bearing.C0 <= 0) {
    throw new Error(`Static load rating C0 must be positive, received: ${bearing.C0} N`);
  }

  let X0 = 1.0;
  let Y0 = 0;

  switch (bearing.type) {
    case 'deep_groove_ball':
      X0 = 0.60;
      Y0 = 0.50;
      break;

    case 'cylindrical_roller':
      X0 = 1.0;
      Y0 = 0;
      break;

    case 'angular_contact_ball':
      // 40° contact angle
      X0 = 0.50;
      Y0 = 0.26;
      break;

    case 'tapered_roller':
      X0 = 0.50;
      Y0 = bearing.Y0 ?? 0.88;
      break;

    default:
      X0 = 0.60;
      Y0 = 0.50;
      break;
  }

  // ISO 76 rule: P0 shall not be taken as less than Fr
  const computedP0 = X0 * Fr + Y0 * Fa;
  const P0 = Math.max(computedP0, Fr);

  if (P0 <= 0) {
    return {
      P0: 0,
      X0,
      Y0,
      C0: bearing.C0,
      s0: Infinity,
      status: 'safe',
      statusMessage: 'Bearing is statically unloaded (P0 = 0 N).',
      guidance: 'No static brinelling risk under zero load.'
    };
  }

  const s0 = bearing.C0 / P0;

  let status: 'safe' | 'caution' | 'brinelling_risk' = 'safe';
  let statusMessage = '';
  let guidance = '';

  if (s0 >= 1.5) {
    status = 'safe';
    statusMessage = `Static safety factor s0 = ${s0.toFixed(2)} exceeds 1.5.`;
    guidance = 'High static safety margin; raceways remain free from permanent plastic indentations, suitable for smooth and low-noise service.';
  } else if (s0 >= 1.0) {
    status = 'caution';
    statusMessage = `Static safety factor s0 = ${s0.toFixed(2)} is between 1.0 and 1.5.`;
    guidance = 'Adequate for normal rotational operation without extreme shock; verify peak dynamic impact loads do not exceed C0.';
  } else {
    status = 'brinelling_risk';
    statusMessage = `Static safety factor s0 = ${s0.toFixed(2)} is less than 1.0 (P0 > C0).`;
    guidance = 'CRITICAL: Static equivalent load exceeds basic static rating C0. Permanent plastic indentation of raceways (brinelling) will cause severe vibration, noise, and premature spalling.';
  }

  return {
    P0: Number(P0.toFixed(2)),
    X0,
    Y0,
    C0: bearing.C0,
    s0: Number(s0.toFixed(2)),
    status,
    statusMessage,
    guidance
  };
}
