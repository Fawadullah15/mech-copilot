import type {
  CylindricalGearInput,
  CylindricalGearGeometry,
  RackProfileDefinition
} from './types';
import { ISO_53_BASIC_RACK } from './types';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Calculates cylindrical involute gear analytical geometry conforming to
 * ISO 21771-1:2024 and ISO 53:1998.
 */
export function calculateGearGeometry(input: CylindricalGearInput): CylindricalGearGeometry {
  const {
    id,
    type,
    teeth,
    normalModule,
    normalPressureAngleDeg,
    helixAngleDeg,
    helixHand,
    faceWidth,
    profileShiftCoefficient = 0,
    rackProfile = ISO_53_BASIC_RACK
  } = input;

  const warnings: string[] = [];

  // Validation
  if (!Number.isInteger(teeth) || teeth < 6) {
    throw new Error(
      `Gear "${id}": Tooth count z must be an integer >= 6, received: ${teeth}`
    );
  }
  if (!Number.isFinite(normalModule) || normalModule <= 0) {
    throw new Error(
      `Gear "${id}": Normal module mn must be a positive number, received: ${normalModule}`
    );
  }
  if (
    !Number.isFinite(normalPressureAngleDeg) ||
    normalPressureAngleDeg <= 5 ||
    normalPressureAngleDeg >= 45
  ) {
    throw new Error(
      `Gear "${id}": Normal pressure angle alphan must be between 5° and 45°, received: ${normalPressureAngleDeg}°`
    );
  }
  if (!Number.isFinite(helixAngleDeg) || helixAngleDeg < 0 || helixAngleDeg >= 60) {
    throw new Error(
      `Gear "${id}": Helix angle beta must be between 0° and 60°, received: ${helixAngleDeg}°`
    );
  }
  if (!Number.isFinite(faceWidth) || faceWidth <= 0) {
    throw new Error(
      `Gear "${id}": Face width b must be positive, received: ${faceWidth}`
    );
  }

  // Type and hand compatibility
  let normalizedHand = helixHand;
  if (type === 'spur') {
    if (helixAngleDeg !== 0) {
      throw new Error(
        `Gear "${id}": Spur gear must have helixAngle = 0°, received: ${helixAngleDeg}°`
      );
    }
    normalizedHand = 'none';
  } else {
    // Helical
    if (helixAngleDeg === 0) {
      throw new Error(
        `Gear "${id}": Helical gear must have helixAngle > 0°. For 0° use type: 'spur'.`
      );
    }
    if (helixHand !== 'left' && helixHand !== 'right') {
      throw new Error(
        `Gear "${id}": Helical gear with beta = ${helixAngleDeg}° must specify helixHand as 'left' or 'right'.`
      );
    }
  }

  // Angles in radians
  const alphaNRad = normalPressureAngleDeg * DEG_TO_RAD;
  const betaRad = helixAngleDeg * DEG_TO_RAD;
  const cosBeta = Math.cos(betaRad);

  // Transverse module mt = mn / cos(beta)
  const transverseModule = normalModule / cosBeta;

  // Transverse pressure angle tan(alphat) = tan(alphan) / cos(beta)
  const tanAlphaT = Math.tan(alphaNRad) / cosBeta;
  const alphaTRad = Math.atan(tanAlphaT);
  const transversePressureAngleDeg = alphaTRad * RAD_TO_DEG;

  // Reference Pitch Diameter d = mt * z = mn * z / cos(beta)
  const pitchDiameter = transverseModule * teeth;

  // Base Diameter db = d * cos(alphat)
  const baseDiameter = pitchDiameter * Math.cos(alphaTRad);

  // Addendum ha = (ha* + x) * mn
  const haStar = rackProfile.addendumCoefficient;
  const hfStar = rackProfile.dedendumCoefficient;
  const cStar = rackProfile.bottomClearanceCoefficient;

  const addendum = (haStar + profileShiftCoefficient) * normalModule;
  const dedendum = (hfStar - profileShiftCoefficient) * normalModule;
  const toothDepth = addendum + dedendum;
  const bottomClearance = cStar * normalModule;

  // Tip Diameter da = d + 2 * ha
  const tipDiameter = pitchDiameter + 2 * addendum;

  // Root Diameter df = d - 2 * hf
  const rootDiameter = pitchDiameter - 2 * dedendum;

  // Pitches
  const circularPitchNormal = Math.PI * normalModule;
  const circularPitchTransverse = Math.PI * transverseModule;
  const basePitchTransverse = circularPitchTransverse * Math.cos(alphaTRad);
  const axialPitch =
    helixAngleDeg > 0 ? (Math.PI * normalModule) / Math.sin(betaRad) : null;

  // Reference Tooth Thickness on pitch cylinder: s = mt * (pi/2 + 2 * x * tan(alphan))
  const referenceToothThickness =
    transverseModule * (Math.PI / 2 + 2 * profileShiftCoefficient * Math.tan(alphaNRad));

  // Undercut & Interference evaluation (ISO 21771-1)
  // For spur: zmin = 2 * ha* / sin^2(alphat)
  // For helical: virtual tooth count zv = z / cos^3(beta); undercut if zv < 2 * ha* / sin^2(alphan)
  const sinAlphaT = Math.sin(alphaTRad);
  const sinAlphaN = Math.sin(alphaNRad);
  const zminSpur = (2 * haStar) / (sinAlphaT * sinAlphaT);
  const virtualToothCount = teeth / (cosBeta * cosBeta * cosBeta);
  const zminHelical = (2 * haStar) / (sinAlphaN * sinAlphaN);

  const minimumTeethWithoutUndercut = Number(zminSpur.toFixed(2));
  const effectiveZ = type === 'spur' ? teeth : virtualToothCount;
  const limitZ = type === 'spur' ? zminSpur : zminHelical;

  // Undercut limit with profile shift: xmin = ha* * (limitZ - z) / limitZ
  const minProfileShiftForUndercut =
    effectiveZ < limitZ ? Number((haStar * (1 - effectiveZ / limitZ)).toFixed(3)) : 0;
  const hasUndercut = profileShiftCoefficient < minProfileShiftForUndercut;

  if (hasUndercut) {
    warnings.push(
      `Gear "${id}" exhibits tooth undercut risk: z = ${teeth} is below minimum threshold (z_min = ${Math.ceil(
        limitZ
      )}). Profile shift x = ${profileShiftCoefficient.toFixed(
        2
      )} is insufficient (recommended x >= ${minProfileShiftForUndercut.toFixed(2)}).`
    );
  }

  // Tooth pointing warning: tip diameter too close to base or thin tip
  if (tipDiameter <= baseDiameter) {
    warnings.push(
      `Gear "${id}" has tip diameter (${tipDiameter.toFixed(2)} mm) <= base diameter (${baseDiameter.toFixed(
        2
      )} mm). Tooth profile is severely pointed or unviable.`
    );
  }

  // Face width recommendations (typical b / mn between 6 and 25)
  const faceWidthRatio = faceWidth / normalModule;
  if (faceWidthRatio < 4) {
    warnings.push(
      `Gear "${id}" face width ratio b/mn (${faceWidthRatio.toFixed(
        1
      )}) is low (< 4). Tooth bending fatigue risk is elevated.`
    );
  } else if (faceWidthRatio > 35) {
    warnings.push(
      `Gear "${id}" face width ratio b/mn (${faceWidthRatio.toFixed(
        1
      )}) is high (> 35). Shaft deflection may induce severe end load concentration.`
    );
  }

  return {
    input,
    type,
    teeth,
    normalModuleMm: Number(normalModule.toFixed(4)),
    transverseModuleMm: Number(transverseModule.toFixed(4)),
    normalPressureAngleDeg: Number(normalPressureAngleDeg.toFixed(4)),
    transversePressureAngleDeg: Number(transversePressureAngleDeg.toFixed(4)),
    helixAngleDeg: Number(helixAngleDeg.toFixed(4)),
    helixHand: normalizedHand,
    faceWidthMm: Number(faceWidth.toFixed(2)),
    profileShiftCoefficient: Number(profileShiftCoefficient.toFixed(4)),
    pitchDiameterMm: Number(pitchDiameter.toFixed(3)),
    baseDiameterMm: Number(baseDiameter.toFixed(3)),
    tipDiameterMm: Number(tipDiameter.toFixed(3)),
    rootDiameterMm: Number(rootDiameter.toFixed(3)),
    addendumMm: Number(addendum.toFixed(3)),
    dedendumMm: Number(dedendum.toFixed(3)),
    toothDepthMm: Number(toothDepth.toFixed(3)),
    bottomClearanceMm: Number(bottomClearance.toFixed(3)),
    circularPitchNormalMm: Number(circularPitchNormal.toFixed(4)),
    circularPitchTransverseMm: Number(circularPitchTransverse.toFixed(4)),
    basePitchTransverseMm: Number(basePitchTransverse.toFixed(4)),
    axialPitchMm: axialPitch !== null ? Number(axialPitch.toFixed(4)) : null,
    referenceToothThicknessMm: Number(referenceToothThickness.toFixed(4)),
    virtualToothCount: Number(virtualToothCount.toFixed(2)),
    minimumTeethWithoutUndercut,
    hasUndercut,
    minProfileShiftForUndercut,
    warnings,
    standardReference: 'ISO 21771-1:2024 / ISO 53:1998'
  };
}
