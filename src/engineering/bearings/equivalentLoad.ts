import type { BearingCatalogItem, EquivalentLoadResult } from './types';

/**
 * Standard ISO 281:2007 Deep-Groove Ball Bearing Factor Table
 * Column 1: Fa / C0
 * Column 2: limiting ratio e
 * Column 3: axial load factor Y (for Fa/Fr > e)
 */
const DGBB_ISO_281_TABLE = [
  { fa_c0: 0.014, e: 0.19, y: 2.30 },
  { fa_c0: 0.028, e: 0.22, y: 1.99 },
  { fa_c0: 0.056, e: 0.26, y: 1.71 },
  { fa_c0: 0.084, e: 0.28, y: 1.55 },
  { fa_c0: 0.110, e: 0.30, y: 1.45 },
  { fa_c0: 0.170, e: 0.34, y: 1.31 },
  { fa_c0: 0.280, e: 0.38, y: 1.15 },
  { fa_c0: 0.420, e: 0.42, y: 1.04 },
  { fa_c0: 0.560, e: 0.44, y: 1.00 }
];

/**
 * Linearly interpolates limiting factor e and axial factor Y for deep-groove ball bearings
 * based on the ratio Fa / C0 per ISO 281:2007 Table 3.
 */
export function interpolateDgbbFactors(faOverC0: number): { e: number; Y: number } {
  if (faOverC0 <= DGBB_ISO_281_TABLE[0].fa_c0) {
    return { e: DGBB_ISO_281_TABLE[0].e, Y: DGBB_ISO_281_TABLE[0].y };
  }
  const last = DGBB_ISO_281_TABLE[DGBB_ISO_281_TABLE.length - 1];
  if (faOverC0 >= last.fa_c0) {
    return { e: last.e, Y: last.y };
  }

  for (let i = 0; i < DGBB_ISO_281_TABLE.length - 1; i++) {
    const lower = DGBB_ISO_281_TABLE[i];
    const upper = DGBB_ISO_281_TABLE[i + 1];
    if (faOverC0 >= lower.fa_c0 && faOverC0 <= upper.fa_c0) {
      const t = (faOverC0 - lower.fa_c0) / (upper.fa_c0 - lower.fa_c0);
      const e = lower.e + t * (upper.e - lower.e);
      const Y = lower.y + t * (upper.y - lower.y);
      return {
        e: Number(e.toFixed(3)),
        Y: Number(Y.toFixed(2))
      };
    }
  }

  return { e: 0.25, Y: 1.7 };
}

/**
 * Calculates the ISO 281:2007 Equivalent Dynamic Bearing Load P:
 * P = X * Fr + Y * Fa
 *
 * Evaluates bearing-specific radial/axial factors (X, Y) based on limiting ratio e
 * and internal contact geometry.
 */
export function calculateEquivalentDynamicLoad(
  bearing: BearingCatalogItem,
  radialLoadN: number,
  axialLoadN: number
): EquivalentLoadResult {
  const Fr = Math.abs(radialLoadN);
  const Fa = Math.abs(axialLoadN);

  if (Fr === 0 && Fa === 0) {
    return {
      Fr: 0,
      Fa: 0,
      ratioFaFr: 0,
      e: 0,
      X: 1.0,
      Y: 0,
      P: 0,
      governingCondition: 'No load applied',
      isPureRadial: true
    };
  }

  const ratioFaFr = Fr > 0 ? Fa / Fr : Infinity;

  switch (bearing.type) {
    case 'deep_groove_ball': {
      const faC0Ratio = bearing.C0 > 0 ? Fa / bearing.C0 : 0;
      const { e, Y: interpolatedY } = interpolateDgbbFactors(faC0Ratio);

      if (Fa === 0 || ratioFaFr <= e) {
        return {
          Fr,
          Fa,
          ratioFaFr: Number(ratioFaFr.toFixed(4)),
          e,
          X: 1.0,
          Y: 0,
          P: Number(Fr.toFixed(2)),
          governingCondition: `Fa / Fr (${ratioFaFr.toFixed(3)}) <= e (${e.toFixed(3)}) → Pure radial equivalent load (P = Fr)`,
          isPureRadial: true
        };
      }

      // Fa / Fr > e
      const X = 0.56;
      const Y = interpolatedY;
      const P = X * Fr + Y * Fa;
      return {
        Fr,
        Fa,
        ratioFaFr: Number(ratioFaFr.toFixed(4)),
        e,
        X,
        Y,
        P: Number(P.toFixed(2)),
        governingCondition: `Fa / Fr (${ratioFaFr.toFixed(3)}) > e (${e.toFixed(3)}) → Combined load (P = 0.56·Fr + ${Y}·Fa, with Fa/C0 = ${faC0Ratio.toFixed(3)})`,
        isPureRadial: false
      };
    }

    case 'cylindrical_roller': {
      // Standard NU / N type cylindrical roller bearings take pure radial load
      const warning =
        Fa > 0
          ? 'Standard NU/N cylindrical roller bearings do not support axial thrust; axial reaction must be carried by an adjacent locating bearing or NJ/NUP flange.'
          : undefined;

      return {
        Fr,
        Fa,
        ratioFaFr: Number(ratioFaFr.toFixed(4)),
        e: 0,
        X: 1.0,
        Y: 0,
        P: Number(Fr.toFixed(2)),
        governingCondition: 'Cylindrical roller radial mode: P = Fr',
        isPureRadial: true,
        warning
      };
    }

    case 'angular_contact_ball': {
      // 40° contact angle (standard ISO single row)
      const e = bearing.e ?? 1.14;
      if (ratioFaFr <= e) {
        return {
          Fr,
          Fa,
          ratioFaFr: Number(ratioFaFr.toFixed(4)),
          e,
          X: 1.0,
          Y: 0,
          P: Number(Fr.toFixed(2)),
          governingCondition: `Fa / Fr (${ratioFaFr.toFixed(3)}) <= e (${e.toFixed(2)}) → Pure radial equivalent load (P = Fr)`,
          isPureRadial: true
        };
      }

      const X = 0.35;
      const Y = bearing.Y ?? 0.57;
      const P = X * Fr + Y * Fa;
      return {
        Fr,
        Fa,
        ratioFaFr: Number(ratioFaFr.toFixed(4)),
        e,
        X,
        Y,
        P: Number(P.toFixed(2)),
        governingCondition: `Fa / Fr (${ratioFaFr.toFixed(3)}) > e (${e.toFixed(2)}) → Combined angular contact load (P = 0.35·Fr + ${Y}·Fa)`,
        isPureRadial: false
      };
    }

    case 'tapered_roller': {
      const e = bearing.e ?? 0.37;
      const catalogY = bearing.Y ?? 1.6;

      if (ratioFaFr <= e) {
        return {
          Fr,
          Fa,
          ratioFaFr: Number(ratioFaFr.toFixed(4)),
          e,
          X: 1.0,
          Y: 0,
          P: Number(Fr.toFixed(2)),
          governingCondition: `Fa / Fr (${ratioFaFr.toFixed(3)}) <= e (${e.toFixed(2)}) → Pure radial equivalent load (P = Fr)`,
          isPureRadial: true
        };
      }

      const X = 0.40;
      const Y = catalogY;
      const P = X * Fr + Y * Fa;
      return {
        Fr,
        Fa,
        ratioFaFr: Number(ratioFaFr.toFixed(4)),
        e,
        X,
        Y,
        P: Number(P.toFixed(2)),
        governingCondition: `Fa / Fr (${ratioFaFr.toFixed(3)}) > e (${e.toFixed(2)}) → Combined tapered roller load (P = 0.40·Fr + ${Y}·Fa)`,
        isPureRadial: false
      };
    }

    default:
      return {
        Fr,
        Fa,
        ratioFaFr: Number(ratioFaFr.toFixed(4)),
        e: 0.25,
        X: 1.0,
        Y: 0,
        P: Number(Fr.toFixed(2)),
        governingCondition: 'Default pure radial: P = Fr',
        isPureRadial: true
      };
  }
}
