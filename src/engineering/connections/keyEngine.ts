import type {
  ParallelKeyInput,
  ParallelKeyResult,
  StandardKeyDimension
} from './types';

/**
 * Standard parallel key dimensions and keyway depths per DIN 6885-1:2021-11
 * (Drive type fastenings without taper action — Parallel keys, keyways, deep pattern).
 */
export const STANDARD_DIN_6885_KEYS: StandardKeyDimension[] = [
  { dMin: 10, dMax: 12, b: 4, h: 4, t1: 2.5, t2: 1.8 },
  { dMin: 12, dMax: 17, b: 5, h: 5, t1: 3.0, t2: 2.3 },
  { dMin: 17, dMax: 22, b: 6, h: 6, t1: 3.5, t2: 2.8 },
  { dMin: 22, dMax: 30, b: 8, h: 7, t1: 4.0, t2: 3.3 },
  { dMin: 30, dMax: 38, b: 10, h: 8, t1: 5.0, t2: 3.3 },
  { dMin: 38, dMax: 44, b: 12, h: 8, t1: 5.0, t2: 3.3 },
  { dMin: 44, dMax: 50, b: 14, h: 9, t1: 5.5, t2: 3.8 },
  { dMin: 50, dMax: 58, b: 16, h: 10, t1: 6.0, t2: 4.3 },
  { dMin: 58, dMax: 65, b: 18, h: 11, t1: 7.0, t2: 4.4 },
  { dMin: 65, dMax: 75, b: 20, h: 12, t1: 7.5, t2: 4.9 },
  { dMin: 75, dMax: 85, b: 22, h: 14, t1: 9.0, t2: 5.4 },
  { dMin: 85, dMax: 95, b: 25, h: 14, t1: 9.0, t2: 5.4 },
  { dMin: 95, dMax: 110, b: 28, h: 16, t1: 10.0, t2: 6.4 },
  { dMin: 110, dMax: 130, b: 32, h: 18, t1: 11.0, t2: 7.4 }
];

/**
 * Returns recommended standard key dimensions per DIN 6885-1 for a given shaft diameter.
 */
export function getRecommendedKeyDimensions(shaftDiameterMm: number): {
  dimensions: StandardKeyDimension;
  isProvisional: boolean;
} {
  const match = STANDARD_DIN_6885_KEYS.find(
    (k) => shaftDiameterMm > k.dMin && shaftDiameterMm <= k.dMax
  );
  if (match) {
    return { dimensions: match, isProvisional: false };
  }

  // Fallback estimation for out-of-range diameters
  const bEst = Math.max(2, Math.round(shaftDiameterMm * 0.25));
  const hEst = Math.max(2, Math.round(bEst * 0.8));
  return {
    dimensions: {
      dMin: shaftDiameterMm * 0.9,
      dMax: shaftDiameterMm * 1.1,
      b: bEst,
      h: hEst,
      t1: Number((hEst * 0.6).toFixed(1)),
      t2: Number((hEst * 0.4).toFixed(1))
    },
    isProvisional: true
  };
}

/**
 * Evaluates parallel-key shear stress, contact crushing pressure, and connection torque capacity.
 *
 * Formulations:
 * - Nominal tangential force: Ft = 2*T / d
 * - Effective length: Form A: Leff = L - b; Form B: Leff = L
 * - Key shear stress: τk = Ft / (b * Leff)
 * - Bearing pressure: pb = Ft / (heff * Leff), where heff = min(t1, h - t1)
 * - Allowable shear: τ_allow = 0.577 * Sy / n
 * - Allowable pressure: p_allow = 0.80 * min(Sy_key, Sy_shaft, Sy_hub) / n
 */
export function calculateParallelKey(input: ParallelKeyInput): ParallelKeyResult {
  const {
    shaftDiameter,
    keyWidth,
    keyHeight,
    keyLength,
    keyProfile = 'form_a_round_ends',
    torque,
    isReversingTorque = false,
    dynamicLoadFactor = 1.0,
    keyMaterial,
    shaftMaterial,
    hubMaterial,
    safetyFactor = 1.5
  } = input;

  // Validation
  if (!Number.isFinite(shaftDiameter) || shaftDiameter <= 0) {
    throw new Error(`Shaft diameter must be a positive finite number, received: ${shaftDiameter}`);
  }
  if (!Number.isFinite(keyWidth) || keyWidth <= 0) {
    throw new Error(`Key width b must be a positive number, received: ${keyWidth}`);
  }
  if (!Number.isFinite(keyHeight) || keyHeight <= 0) {
    throw new Error(`Key height h must be a positive number, received: ${keyHeight}`);
  }
  if (!Number.isFinite(keyLength) || keyLength <= 0) {
    throw new Error(`Key length L must be a positive number, received: ${keyLength}`);
  }
  if (keyWidth > shaftDiameter * 0.5) {
    throw new Error(`Key width (${keyWidth} mm) is excessively large for shaft diameter (${shaftDiameter} mm).`);
  }

  // Effective length Leff
  let effectiveLength = input.effectiveLength;
  if (!effectiveLength || effectiveLength <= 0) {
    if (keyProfile === 'form_a_round_ends') {
      // Form A has round ends of radius b/2 at both ends
      effectiveLength = Math.max(1, keyLength - keyWidth);
    } else {
      effectiveLength = keyLength;
    }
  }

  // Keyway depth and effective contact height heff
  const t1 = input.shaftKeywayDepth ?? Number((keyHeight * 0.6).toFixed(1));
  const t2 = input.hubKeywayDepth ?? Number((keyHeight - t1).toFixed(1));

  if (t1 <= 0 || t1 >= keyHeight) {
    throw new Error(`Shaft keyway depth t1 (${t1} mm) must be between 0 and key height h (${keyHeight} mm).`);
  }

  // Effective load-bearing contact height
  const effectiveContactHeight = Math.min(t1, keyHeight - t1);
  if (effectiveContactHeight <= 0) {
    throw new Error(`Effective contact height (${effectiveContactHeight} mm) must be positive.`);
  }

  // Torque and Tangential Force (T in N·m -> convert to N·mm)
  const absTorque = Math.abs(torque);
  const torqueNmm = absTorque * 1000;
  const KA = Math.max(1.0, dynamicLoadFactor);

  // Tangential force Ft = (2*T / d) * KA
  const tangentialForce = (2 * torqueNmm / shaftDiameter) * KA;

  // Areas
  const shearArea = keyWidth * effectiveLength; // mm²
  const bearingArea = effectiveContactHeight * effectiveLength; // mm²

  // Stresses (MPa = N/mm²)
  const shearStress = shearArea > 0 ? tangentialForce / shearArea : 0;
  const bearingPressure = bearingArea > 0 ? tangentialForce / bearingArea : 0;

  // Material Yield Strengths
  const SyKey = keyMaterial.yieldStrength;
  const SyShaft = shaftMaterial.yieldStrength;
  const SyHub = hubMaterial.yieldStrength;

  if (SyKey <= 0 || SyShaft <= 0 || SyHub <= 0) {
    throw new Error('Material yield strengths for key, shaft, and hub must be positive finite values.');
  }

  // Allowable shear stress (Von Mises shear yield Ssy = 0.577 * Sy_key)
  const defaultAllowableShear = (0.577 * SyKey) / safetyFactor;
  const allowableShearStress = input.allowableShearStress ?? defaultAllowableShear;

  // Allowable bearing pressure (governed by the weakest mating material)
  let governingMaterialForPressure = keyMaterial.name;
  let minSy = SyKey;

  if (SyShaft < minSy) {
    minSy = SyShaft;
    governingMaterialForPressure = shaftMaterial.name;
  }
  if (SyHub < minSy) {
    minSy = SyHub;
    governingMaterialForPressure = hubMaterial.name;
  }

  // Standard engineering practice (DIN 6885 / Roloff-Matek): p_allow = 0.80 * Sy_min / n
  let defaultAllowablePressure = (0.80 * minSy) / safetyFactor;
  if (isReversingTorque) {
    // Reversing torque de-rating (typically 40% reduction per DIN 6885)
    defaultAllowablePressure *= 0.60;
  }
  const allowableBearingPressure = input.allowableBearingPressure ?? defaultAllowablePressure;

  // Safety factors
  const shearSafetyFactor = shearStress > 0 ? allowableShearStress / shearStress : Infinity;
  const bearingSafetyFactor = bearingPressure > 0 ? allowableBearingPressure / bearingPressure : Infinity;

  // Torque capacities (N·m)
  // Tcap_shear = (allowableShear * shearArea * d / 2) / 1000 / KA
  const torqueCapacityShear = (allowableShearStress * shearArea * shaftDiameter / 2000) / KA;
  const torqueCapacityBearing = (allowableBearingPressure * bearingArea * shaftDiameter / 2000) / KA;
  const torqueCapacity = Math.min(torqueCapacityShear, torqueCapacityBearing);

  const connectionSafetyFactor = absTorque > 0 ? torqueCapacity / absTorque : Infinity;
  const governingMode: 'key_shear' | 'contact_pressure' =
    torqueCapacityShear <= torqueCapacityBearing ? 'key_shear' : 'contact_pressure';

  // Status classification
  let status: 'safe' | 'marginal' | 'fail' = 'safe';
  let statusMessage = '';

  if (connectionSafetyFactor >= 1.5) {
    status = 'safe';
    statusMessage = `Connection is safe. Safety factor n = ${connectionSafetyFactor.toFixed(2)} ≥ 1.50 (Governed by ${governingMode === 'key_shear' ? 'key shear' : 'flank contact pressure'}).`;
  } else if (connectionSafetyFactor >= 1.0) {
    status = 'marginal';
    statusMessage = `Connection is marginal. Safety factor n = ${connectionSafetyFactor.toFixed(2)} is between 1.00 and 1.50.`;
  } else {
    status = 'fail';
    statusMessage = `Connection capacity is exceeded (n = ${connectionSafetyFactor.toFixed(2)} < 1.00). ${
      governingMode === 'key_shear'
        ? `Key shear stress (${shearStress.toFixed(1)} MPa) exceeds allowable (${allowableShearStress.toFixed(1)} MPa).`
        : `Bearing contact pressure (${bearingPressure.toFixed(1)} MPa) exceeds allowable (${allowableBearingPressure.toFixed(1)} MPa) on ${governingMaterialForPressure}.`
    }`;
  }

  const reversingLoadWarning = isReversingTorque
    ? 'Reversing/alternating torque applied: Flank contact pressure de-rated by 40% per DIN 6885/Roloff-Matek guidelines to account for alternating shock and fretting risk. Verify notch fatigue at shaft keyway.'
    : undefined;

  const assumptions = [
    'Uniform contact force distribution along key effective load-bearing length Leff.',
    `Pure shear plane parallel to shaft axis at nominal radius d/2 (${(shaftDiameter / 2).toFixed(1)} mm).`,
    'Isotropic linear-elastic material behavior within permissible yield/contact limits.',
    'Clearance fit at top of key (radial gap) per DIN 6885 prevents vertical pre-stressing.'
  ];

  const limitations = [
    'Does not calculate stepped shaft or keyway fillet stress concentrations (Kt/Kts); refer to Stage 07 fatigue module for shaft notch life.',
    'For long keys (Leff/d > 1.5), shaft torsional twist induces non-uniform contact pressure peaks at key ends.',
    'Dynamic shock requires application factor KA > 1.0 to prevent localized plastic crushing.'
  ];

  return {
    shaftDiameter,
    keyWidth,
    keyHeight,
    keyLength,
    effectiveLength: Number(effectiveLength.toFixed(2)),
    effectiveContactHeight: Number(effectiveContactHeight.toFixed(2)),
    tangentialForce: Number(tangentialForce.toFixed(1)),
    shearArea: Number(shearArea.toFixed(1)),
    bearingArea: Number(bearingArea.toFixed(1)),
    shearStress: Number(shearStress.toFixed(2)),
    bearingPressure: Number(bearingPressure.toFixed(2)),
    allowableShearStress: Number(allowableShearStress.toFixed(2)),
    allowableBearingPressure: Number(allowableBearingPressure.toFixed(2)),
    governingMaterialForPressure,
    shearSafetyFactor: Number(shearSafetyFactor.toFixed(2)),
    bearingSafetyFactor: Number(bearingSafetyFactor.toFixed(2)),
    torqueCapacityShear: Number(torqueCapacityShear.toFixed(1)),
    torqueCapacityBearing: Number(torqueCapacityBearing.toFixed(1)),
    torqueCapacity: Number(torqueCapacity.toFixed(1)),
    connectionSafetyFactor: Number(connectionSafetyFactor.toFixed(2)),
    governingMode,
    status,
    statusMessage,
    reversingLoadWarning,
    assumptions,
    limitations,
    standardReference: 'DIN 6885-1:2021-11'
  };
}
