/**
 * Cylindrical Involute Gear Geometry, Kinematics & Mesh Forces Types
 * Conforming to ISO 21771-1:2024 and ISO 53:1998
 */

export type GearType = 'spur' | 'helical';

export type HelixHand = 'left' | 'right' | 'none';

export type RotationDirection = 'CW' | 'CCW';

export type RackProfileStandard = 'iso_53_standard' | 'custom';

export interface RackProfileDefinition {
  standard: RackProfileStandard;
  name: string;
  addendumCoefficient: number; // ha* (typically 1.0)
  dedendumCoefficient: number; // hf* (typically 1.25)
  bottomClearanceCoefficient: number; // c* = hf* - ha* (typically 0.25)
  standardReference: string;
}

export const ISO_53_BASIC_RACK: RackProfileDefinition = {
  standard: 'iso_53_standard',
  name: 'ISO 53 Standard Basic Rack Tooth Profile',
  addendumCoefficient: 1.0,
  dedendumCoefficient: 1.25,
  bottomClearanceCoefficient: 0.25,
  standardReference: 'ISO 53:1998'
};

export interface CylindricalGearInput {
  id: string;
  name?: string;
  type: GearType;
  teeth: number; // z (integer >= 6)
  normalModule: number; // mn in mm (> 0)
  normalPressureAngleDeg: number; // alphan in deg (typically 20 deg, 14.5 to 25 deg)
  helixAngleDeg: number; // beta in deg (>= 0, 0 for spur)
  helixHand: HelixHand; // 'left' | 'right' | 'none'
  faceWidth: number; // b in mm (> 0)
  profileShiftCoefficient?: number; // x (default 0)
  rackProfile?: RackProfileDefinition;
  shaftId?: string;
  axialStationMm?: number; // Mounting location x on shaft
  materialId?: string;
  rotationDirection?: RotationDirection;
}

export interface CylindricalGearGeometry {
  input: CylindricalGearInput;
  type: GearType;
  teeth: number;
  normalModuleMm: number; // mn
  transverseModuleMm: number; // mt = mn / cos(beta)
  normalPressureAngleDeg: number; // alphan
  transversePressureAngleDeg: number; // alphat = atan(tan(alphan) / cos(beta))
  helixAngleDeg: number; // beta
  helixHand: HelixHand;
  faceWidthMm: number; // b
  profileShiftCoefficient: number; // x

  // Standard diameters (in mm)
  pitchDiameterMm: number; // d = mt * z
  baseDiameterMm: number; // db = d * cos(alphat)
  tipDiameterMm: number; // da = d + 2 * ha
  rootDiameterMm: number; // df = d - 2 * hf

  // Tooth proportions (in mm)
  addendumMm: number; // ha = (ha* + x) * mn
  dedendumMm: number; // hf = (hf* - x) * mn
  toothDepthMm: number; // h = ha + hf
  bottomClearanceMm: number; // c = c* * mn

  // Pitches (in mm)
  circularPitchNormalMm: number; // pn = pi * mn
  circularPitchTransverseMm: number; // pt = pi * mt
  basePitchTransverseMm: number; // pb = pt * cos(alphat)
  axialPitchMm: number | null; // px = pt / tan(beta) = pi * mn / sin(beta)

  // Tooth thickness on pitch circle
  referenceToothThicknessMm: number; // s = mt * (pi/2 + 2 * x * tan(alphan))

  // Undercut & Interference evaluation
  virtualToothCount: number; // zv = z / cos^3(beta)
  minimumTeethWithoutUndercut: number; // zmin = 2 * ha* / sin^2(alphat)
  hasUndercut: boolean;
  minProfileShiftForUndercut: number; // xmin to avoid undercut

  warnings: string[];
  standardReference: string;
}

export interface GearPairInput {
  pinion: CylindricalGearInput;
  wheel: CylindricalGearInput;
  targetCenterDistanceMm?: number;
}

export interface GearPairGeometry {
  pinion: CylindricalGearGeometry;
  wheel: CylindricalGearGeometry;
  gearRatio: number; // u = z2 / z1 (speed reduction ratio >= 1.0)
  referenceCenterDistanceMm: number; // a = (d1 + d2) / 2
  workingCenterDistanceMm: number; // aw
  workingTransversePressureAngleDeg: number; // alphawt
  centerDistanceModificationMm: number; // aw - a
  commonFaceWidthMm: number; // bw = min(b1, b2)

  // Contact ratio evaluation (ISO 21771-1:2024)
  pathOfContactLengthMm: number; // galpha
  profileContactRatio: number; // eps_alpha = galpha / pb
  faceContactRatio: number; // eps_beta = bw * sin(beta) / (pi * mn)
  totalContactRatio: number; // eps_gamma = eps_alpha + eps_beta

  isPairCompatible: boolean;
  compatibilityErrors: string[];
  warnings: string[];
  standardReference: string;
}

export interface GearKinematicsInput {
  pinionSpeedRpm: number; // n1
  transmittedPowerKw?: number; // P in kW
  pinionTorqueNm?: number; // T1 in N·m (either power or torque required)
  pinionToothCount: number; // z1
  wheelToothCount: number; // z2
  efficiency?: number; // eta (default 0.98)
  pinionRotationDirection?: RotationDirection; // default CW
}

export interface GearKinematicsResult {
  gearRatio: number; // i = z2 / z1
  pinionSpeedRpm: number; // n1
  wheelSpeedRpm: number; // n2 (signed, negative for external mesh opposite rotation)
  wheelSpeedMagnitudeRpm: number; // |n2|
  pinionAngularVelocityRadS: number; // omega1
  wheelAngularVelocityRadS: number; // omega2
  pinionTorqueNm: number; // T1
  wheelTorqueNm: number; // T2 = T1 * i * eta
  inputPowerKw: number; // Pin
  outputPowerKw: number; // Pout = Pin * eta
  powerLossKw: number; // Ploss = Pin * (1 - eta)
  efficiency: number; // eta
  pitchLineVelocityMs: number; // v = pi * d1 * n1 / 60000
  pinionRotation: RotationDirection;
  wheelRotation: RotationDirection;
}

export interface MeshForcesInput {
  pinionTorqueNm: number; // T1 in N·m
  pinionPitchDiameterMm: number; // d1 in mm
  normalPressureAngleDeg: number; // alphan in deg
  transversePressureAngleDeg: number; // alphat in deg
  helixAngleDeg: number; // beta in deg
  pinionHelixHand: HelixHand;
  pinionRotationDirection: RotationDirection;
  meshOrientationAngleDeg?: number; // theta_mesh around shaft (90 deg = wheel at +y)
  isPinionDriver?: boolean; // default true
}

export interface Force3D {
  Fx: number; // Axial force along shaft axis (+x)
  Fy: number; // Vertical radial force (+y upward)
  Fz: number; // Horizontal transverse force (+z)
}

export interface Moment3D {
  Mx: number; // Torsional moment about shaft axis (N·m)
  My: number; // Bending moment about y-axis (N·m)
  Mz: number; // Bending moment about z-axis (N·m)
}

export interface MeshForcesResult {
  // Scalar components (N)
  tangentialForceN: number; // Ft = 2000 * T / d1
  radialForceN: number; // Fr = Ft * tan(alphat)
  axialForceN: number; // Fa = Ft * tan(beta)
  normalForceN: number; // Fn = Ft / (cos(alphan) * cos(beta))

  // Global vectors acting on Pinion
  pinionForceGlobalN: Force3D;
  pinionOverturningMomentGlobalNm: Moment3D;

  // Global vectors acting on Mating Wheel (Newton's 3rd Law: equal and opposite)
  wheelForceGlobalN: Force3D;
  wheelOverturningMomentGlobalNm: Moment3D;

  isEquilibriumEnforced: boolean;
  meshOrientationAngleDeg: number;
  coordinateConvention: string;
  assumptions: string[];
  warnings: string[];
  standardReference: string;
}

export interface GearShaftIntegrationInput {
  shaftLengthMm: number;
  bearingStationAMm: number; // xA
  bearingStationBMm: number; // xB
  gearStationMm: number; // xGear
  meshForces: MeshForcesResult;
  targetGear: 'pinion' | 'wheel';
  supportArrangement?: 'locating_floating' | 'cross_located';
  locatingStation?: 'A' | 'B';
  bearingTypeA?: string;
  bearingTypeB?: string;
  dynamicCapacityA?: number; // C in N
  dynamicCapacityB?: number; // C in N
  shaftRpm?: number;
  desiredHours?: number;
}

export interface GearShaftIntegrationResult {
  shaftLengthMm: number;
  gearStationMm: number;
  stationAMm: number;
  stationBMm: number;
  appliedTransverseLoad: {
    Fy: number;
    Fz: number;
    MyNm: number;
    MzNm: number;
  };
  appliedAxialLoad: {
    Fa: number;
  };
  reactionA: {
    Ry: number;
    Rz: number;
    radialResultantN: number;
    axialLoadN: number;
  };
  reactionB: {
    Ry: number;
    Rz: number;
    radialResultantN: number;
    axialLoadN: number;
  };
  residuals: {
    forceY: number;
    forceZ: number;
    axialForce: number;
    momentZ: number;
    momentY: number;
    isEquilibriumSatisfied: boolean;
  };
  bearingLifeA?: {
    equivalentDynamicLoadN: number;
    l10RevolutionsMillions: number;
    l10Hours: number;
  };
  bearingLifeB?: {
    equivalentDynamicLoadN: number;
    l10RevolutionsMillions: number;
    l10Hours: number;
  };
  warnings: string[];
}
