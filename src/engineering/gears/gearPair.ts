import type {
  GearPairInput,
  GearPairGeometry,
  CylindricalGearGeometry
} from './types';
import { calculateGearGeometry } from './geometry';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Involute function inv(alpha) = tan(alpha) - alpha (angles in radians)
 */
function inv(alphaRad: number): number {
  return Math.tan(alphaRad) - alphaRad;
}

/**
 * Solves inverse involute function inv(alpha) = val for alpha (in radians)
 * using Newton-Raphson iteration.
 */
function solveInv(val: number, initialGuess = 0.35): number {
  let alpha = initialGuess;
  for (let iter = 0; iter < 20; iter++) {
    const f = inv(alpha) - val;
    const df = Math.tan(alpha) * Math.tan(alpha); // d/dalpha(tan(alpha) - alpha) = tan^2(alpha)
    if (Math.abs(df) < 1e-12) break;
    const nextAlpha = alpha - f / df;
    if (Math.abs(nextAlpha - alpha) < 1e-9) {
      return nextAlpha;
    }
    alpha = nextAlpha;
  }
  return alpha;
}

/**
 * Calculates gear pair geometry, compatibility, center distance, and contact ratios
 * conforming to ISO 21771-1:2024.
 */
export function calculateGearPairGeometry(input: GearPairInput): GearPairGeometry {
  const { pinion: pinionInput, wheel: wheelInput, targetCenterDistanceMm } = input;
  const compatibilityErrors: string[] = [];
  const warnings: string[] = [];

  // Compute individual gear geometries
  const pinion: CylindricalGearGeometry = calculateGearGeometry(pinionInput);
  const wheel: CylindricalGearGeometry = calculateGearGeometry(wheelInput);

  // 1. Compatibility verification
  // Normal module match
  if (Math.abs(pinion.normalModuleMm - wheel.normalModuleMm) > 1e-5) {
    compatibilityErrors.push(
      `Module mismatch: Pinion normal module (${pinion.normalModuleMm} mm) does not equal Wheel normal module (${wheel.normalModuleMm} mm).`
    );
  }

  // Normal pressure angle match
  if (Math.abs(pinion.normalPressureAngleDeg - wheel.normalPressureAngleDeg) > 1e-3) {
    compatibilityErrors.push(
      `Pressure angle mismatch: Pinion alphan (${pinion.normalPressureAngleDeg}°) does not equal Wheel alphan (${wheel.normalPressureAngleDeg}°).`
    );
  }

  // Gear type and helix angle compatibility
  if (pinion.type !== wheel.type) {
    compatibilityErrors.push(
      `Gear type mismatch: Pinion is ${pinion.type} while Wheel is ${wheel.type}.`
    );
  }

  if (pinion.type === 'spur') {
    if (pinion.helixAngleDeg !== 0 || wheel.helixAngleDeg !== 0) {
      compatibilityErrors.push('Spur gear pair must have helixAngle = 0° for both gears.');
    }
  } else {
    // Helical pair
    if (Math.abs(pinion.helixAngleDeg - wheel.helixAngleDeg) > 1e-3) {
      compatibilityErrors.push(
        `Helix angle mismatch: Pinion beta (${pinion.helixAngleDeg}°) must equal Wheel beta (${wheel.helixAngleDeg}°).`
      );
    }
    // Opposite hand requirement for external parallel-axis engagement
    if (pinion.helixHand === wheel.helixHand) {
      compatibilityErrors.push(
        `Helical hand conflict: For external parallel-axis engagement, mating gears must have OPPOSITE hands (received both as '${pinion.helixHand}').`
      );
    }
    if (pinion.helixHand === 'none' || wheel.helixHand === 'none') {
      compatibilityErrors.push("Helical gears must have explicit hand ('left' or 'right').");
    }
  }

  const isPairCompatible = compatibilityErrors.length === 0;

  // 2. Reference center distance a = (d1 + d2) / 2
  const d1 = pinion.pitchDiameterMm;
  const d2 = wheel.pitchDiameterMm;
  const referenceCenterDistance = (d1 + d2) / 2;

  // 3. Gear ratio u = z2 / z1
  const gearRatio = Number((wheel.teeth / pinion.teeth).toFixed(4));

  // 4. Working center distance and working transverse pressure angle
  const x1 = pinion.profileShiftCoefficient;
  const x2 = wheel.profileShiftCoefficient;
  const sumX = x1 + x2;

  const alphaTRad = pinion.transversePressureAngleDeg * DEG_TO_RAD;
  let workingCenterDistance = referenceCenterDistance;
  let alphaWTRad = alphaTRad;

  if (Math.abs(sumX) > 1e-6) {
    // Non-zero sum of profile shifts modifies center distance and working pressure angle
    const alphaNRad = pinion.normalPressureAngleDeg * DEG_TO_RAD;
    const invAlphaWT =
      inv(alphaTRad) + (2 * sumX * Math.tan(alphaNRad)) / (pinion.teeth + wheel.teeth);
    alphaWTRad = solveInv(invAlphaWT, alphaTRad);
    workingCenterDistance =
      referenceCenterDistance * (Math.cos(alphaTRad) / Math.cos(alphaWTRad));
  }

  const workingTransversePressureAngleDeg = alphaWTRad * RAD_TO_DEG;
  const centerDistanceModification = workingCenterDistance - referenceCenterDistance;

  // Check target center distance constraint if user provided one
  if (targetCenterDistanceMm !== undefined && Number.isFinite(targetCenterDistanceMm)) {
    const cdDiff = Math.abs(targetCenterDistanceMm - workingCenterDistance);
    if (cdDiff > 0.05) {
      warnings.push(
        `Specified target center distance (${targetCenterDistanceMm.toFixed(
          2
        )} mm) deviates from kinematic working center distance (${workingCenterDistance.toFixed(
          2
        )} mm) by ${(cdDiff * 1000).toFixed(1)} μm. Profile shift adjustment required.`
      );
    }
  }

  // 5. Common face width bw = min(b1, b2)
  const commonFaceWidth = Math.min(pinion.faceWidthMm, wheel.faceWidthMm);
  if (pinion.faceWidthMm < wheel.faceWidthMm) {
    warnings.push(
      `Pinion face width (${pinion.faceWidthMm} mm) is narrower than wheel face width (${wheel.faceWidthMm} mm). Industrial practice recommends pinion face width 5-10 mm wider to accommodate axial assembly tolerance.`
    );
  }

  // 6. Contact ratio evaluation (ISO 21771-1:2024)
  // Length of path of contact:
  // galpha = 0.5 * [ sqrt(da1^2 - db1^2) + sqrt(da2^2 - db2^2) ] - aw * sin(alphawt)
  const da1 = pinion.tipDiameterMm;
  const db1 = pinion.baseDiameterMm;
  const da2 = wheel.tipDiameterMm;
  const db2 = wheel.baseDiameterMm;

  const term1 = da1 > db1 ? Math.sqrt(da1 * da1 - db1 * db1) : 0;
  const term2 = da2 > db2 ? Math.sqrt(da2 * da2 - db2 * db2) : 0;
  const gAlpha = 0.5 * (term1 + term2) - workingCenterDistance * Math.sin(alphaWTRad);

  // Transverse base pitch: pb = pt * cos(alphat) = pi * mt * cos(alphat)
  const pb = pinion.basePitchTransverseMm;

  // Profile contact ratio eps_alpha = galpha / pb
  const profileContactRatio = pb > 0 ? gAlpha / pb : 0;

  // Face contact ratio eps_beta = bw * sin(beta) / (pi * mn)
  const betaRad = pinion.helixAngleDeg * DEG_TO_RAD;
  const faceContactRatio =
    pinion.helixAngleDeg > 0
      ? (commonFaceWidth * Math.sin(betaRad)) / (Math.PI * pinion.normalModuleMm)
      : 0;

  // Total contact ratio eps_gamma = eps_alpha + eps_beta
  const totalContactRatio = profileContactRatio + faceContactRatio;

  // Diagnostics on contact ratio
  if (profileContactRatio < 1.0) {
    warnings.push(
      `CRITICAL: Profile contact ratio ε_α = ${profileContactRatio.toFixed(
        2
      )} < 1.0! Continuous conjugate gear action is lost; teeth will disconnect and impact.`
    );
  } else if (profileContactRatio < 1.2) {
    warnings.push(
      `Profile contact ratio ε_α = ${profileContactRatio.toFixed(
        2
      )} is low (< 1.2). Tooth load sharing is poor; increased noise and dynamic stress expected.`
    );
  }

  if (pinion.type === 'helical' && faceContactRatio < 1.0) {
    warnings.push(
      `Helical overlap ratio ε_β = ${faceContactRatio.toFixed(
        2
      )} < 1.0. Face width is insufficient to achieve continuous helical overlap benefits.`
    );
  }

  return {
    pinion,
    wheel,
    gearRatio,
    referenceCenterDistanceMm: Number(referenceCenterDistance.toFixed(3)),
    workingCenterDistanceMm: Number(workingCenterDistance.toFixed(3)),
    workingTransversePressureAngleDeg: Number(
      workingTransversePressureAngleDeg.toFixed(3)
    ),
    centerDistanceModificationMm: Number(centerDistanceModification.toFixed(3)),
    commonFaceWidthMm: Number(commonFaceWidth.toFixed(2)),
    pathOfContactLengthMm: Number(gAlpha.toFixed(3)),
    profileContactRatio: Number(profileContactRatio.toFixed(3)),
    faceContactRatio: Number(faceContactRatio.toFixed(3)),
    totalContactRatio: Number(totalContactRatio.toFixed(3)),
    isPairCompatible,
    compatibilityErrors,
    warnings,
    standardReference: 'ISO 21771-1:2024'
  };
}
