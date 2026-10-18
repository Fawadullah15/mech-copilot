import type {
  DiameterStep,
  ToleranceGrade,
  StandardFitDefinition,
} from './types';

/**
 * Standard Nominal Diameter Steps (Up to 500 mm) per ISO 286-1:2010 Table 1
 */
export const DIAMETER_STEPS: DiameterStep[] = [
  { stepIndex: 0, minMm: 0, maxMm: 3, label: 'Up to 3 mm' },
  { stepIndex: 1, minMm: 3, maxMm: 6, label: 'Over 3 up to 6 mm' },
  { stepIndex: 2, minMm: 6, maxMm: 10, label: 'Over 6 up to 10 mm' },
  { stepIndex: 3, minMm: 10, maxMm: 18, label: 'Over 10 up to 18 mm' },
  { stepIndex: 4, minMm: 18, maxMm: 30, label: 'Over 18 up to 30 mm' },
  { stepIndex: 5, minMm: 30, maxMm: 50, label: 'Over 30 up to 50 mm' },
  { stepIndex: 6, minMm: 50, maxMm: 80, label: 'Over 50 up to 80 mm' },
  { stepIndex: 7, minMm: 80, maxMm: 120, label: 'Over 80 up to 120 mm' },
  { stepIndex: 8, minMm: 120, maxMm: 180, label: 'Over 120 up to 180 mm' },
  { stepIndex: 9, minMm: 180, maxMm: 250, label: 'Over 180 up to 250 mm' },
  { stepIndex: 10, minMm: 250, maxMm: 315, label: 'Over 250 up to 315 mm' },
  { stepIndex: 11, minMm: 315, maxMm: 400, label: 'Over 315 up to 400 mm' },
  { stepIndex: 12, minMm: 400, maxMm: 500, label: 'Over 400 up to 500 mm' },
];

/**
 * Standard Tolerance Grades (IT values in micrometers, µm)
 * Conforming to ISO 286-1:2010 Table 1
 * Rows correspond to DIAMETER_STEPS 0 through 12
 */
export const IT_TABLE_UM: Record<ToleranceGrade, number[]> = {
  IT5: [4, 5, 6, 8, 9, 11, 13, 15, 18, 20, 23, 25, 27],
  IT6: [6, 8, 9, 11, 13, 16, 19, 22, 25, 29, 32, 36, 40],
  IT7: [10, 12, 15, 18, 21, 25, 30, 35, 40, 46, 52, 57, 63],
  IT8: [14, 18, 22, 27, 33, 39, 46, 54, 63, 72, 81, 89, 97],
  IT9: [25, 30, 36, 43, 52, 62, 74, 87, 100, 115, 130, 140, 155],
  IT10: [40, 48, 58, 70, 84, 100, 120, 140, 160, 185, 210, 230, 250],
  IT11: [60, 75, 90, 110, 130, 160, 190, 220, 250, 290, 320, 360, 400],
};

/**
 * Fundamental Deviations for Shafts (values in micrometers, µm)
 * Conforming to ISO 286-1:2010 Table 2 & Table 3
 * Rows correspond to DIAMETER_STEPS 0 through 12
 */
export const SHAFT_FUNDAMENTAL_DEVIATIONS_UM: Record<
  string,
  { type: 'upper' | 'lower'; values: number[] }
> = {
  // Upper deviation es (negative for clearance shafts)
  g: {
    type: 'upper',
    values: [-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18, -20],
  },
  f: {
    type: 'upper',
    values: [-6, -10, -13, -16, -20, -25, -30, -36, -43, -50, -56, -62, -68],
  },
  e: {
    type: 'upper',
    values: [-14, -20, -25, -32, -40, -50, -60, -72, -85, -100, -110, -125, -135],
  },
  d: {
    type: 'upper',
    values: [-20, -30, -40, -50, -65, -80, -100, -120, -145, -170, -190, -210, -230],
  },
  h: {
    type: 'upper',
    values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },

  // Lower deviation ei (positive for transition and interference shafts)
  k: {
    type: 'lower',
    // k4 - k7 values
    values: [0, 1, 1, 2, 2, 2, 2, 3, 3, 4, 4, 4, 5],
  },
  m: {
    type: 'lower',
    values: [2, 4, 6, 7, 8, 9, 11, 13, 15, 17, 20, 21, 23],
  },
  n: {
    type: 'lower',
    values: [4, 8, 10, 12, 15, 17, 20, 23, 27, 31, 34, 37, 40],
  },
  p: {
    type: 'lower',
    values: [6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68],
  },
  r: {
    type: 'lower',
    values: [10, 15, 19, 23, 28, 34, 41, 48, 56, 66, 74, 82, 92],
  },
  s: {
    type: 'lower',
    values: [14, 19, 23, 28, 35, 43, 53, 63, 75, 90, 102, 114, 128],
  },
};

/**
 * Standard Fit Definitions & Machinery Design Guidance
 * Sourced from ISO 286-1 Annex B & Shigley's Mechanical Engineering Design
 */
export const STANDARD_FITS: StandardFitDefinition[] = [
  {
    designation: 'H7/h6',
    holeClass: 'H7',
    shaftClass: 'h6',
    category: 'Clearance',
    name: 'Precision Sliding / Spigot Location Fit',
    typicalApplications: 'Precision gear alignment, removable shaft spigots, easily assembled sliding couplings.',
    assemblyMethod: 'Assembles freely by hand at room temperature without mechanical pressure or heating.',
  },
  {
    designation: 'H7/g6',
    holeClass: 'H7',
    shaftClass: 'g6',
    category: 'Clearance',
    name: 'Precision Running Fit with Lubrication',
    typicalApplications: 'Idler gears, slide valves, precision spindle bearings, linkage pins requiring smooth rotation.',
    assemblyMethod: 'Slides easily by hand with film of machine oil. Non-binding rotation.',
  },
  {
    designation: 'H7/f7',
    holeClass: 'H7',
    shaftClass: 'f7',
    category: 'Clearance',
    name: 'Close Running Fit for General Machinery',
    typicalApplications: 'Sleeve bushings, grease-lubricated journal bearings, transmission shafts under moderate speed.',
    assemblyMethod: 'Free assembly with perceptible clearance to retain lubricant under operational temperature rise.',
  },
  {
    designation: 'H8/f7',
    holeClass: 'H8',
    shaftClass: 'f7',
    category: 'Clearance',
    name: 'Normal Commercial Running Fit',
    typicalApplications: 'Pump shafts, heavy gearboxes, industrial machinery where wider tolerance reduces manufacturing cost.',
    assemblyMethod: 'Free assembly by hand. Accommodates slight shaft runout.',
  },
  {
    designation: 'H8/e8',
    holeClass: 'H8',
    shaftClass: 'e8',
    category: 'Clearance',
    name: 'Loose Running Fit / Thermal Expansion Allowance',
    typicalApplications: 'Long spans, high-temperature furnace conveyors, multi-bearing drive shafts prone to thermal growth.',
    assemblyMethod: 'Very free assembly. Significant radial play to prevent thermal seizure.',
  },
  {
    designation: 'H11/d11',
    holeClass: 'H11',
    shaftClass: 'd11',
    category: 'Clearance',
    name: 'Loose Commercial Fit for Agricultural / Structural Parts',
    typicalApplications: 'Pivots, latches, agricultural link pins, rough fabricated machinery parts.',
    assemblyMethod: 'Large clearance assembly without precision machining.',
  },
  {
    designation: 'H7/js6',
    holeClass: 'H7',
    shaftClass: 'js6',
    category: 'Transition',
    name: 'Symmetrical Precision Locating Fit',
    typicalApplications: 'Dowel pins, precision locating sleeves, removable pulleys requiring zero average clearance.',
    assemblyMethod: 'Assembles with light finger pressure or very light tapping with a mallet.',
  },
  {
    designation: 'H7/k6',
    holeClass: 'H7',
    shaftClass: 'k6',
    category: 'Transition',
    name: 'Keyed Transmission Fit (No Play)',
    typicalApplications: 'Keyed spur and helical gears, timing belt pulleys, shaft couplings under reversing torque.',
    assemblyMethod: 'Requires firm tapping with soft-face mallet or arbor press. Disassembly possible without damage.',
  },
  {
    designation: 'H7/m6',
    holeClass: 'H7',
    shaftClass: 'm6',
    category: 'Transition',
    name: 'Snug Drive Fit / Rolling Bearing Inner Ring',
    typicalApplications: 'Ball and roller bearing inner rings on rotating shafts under light to moderate loads, rigid pulleys.',
    assemblyMethod: 'Requires steady mechanical arbor press or warm oil bath (60°C–80°C) for mounting.',
  },
  {
    designation: 'H7/n6',
    holeClass: 'H7',
    shaftClass: 'n6',
    category: 'Transition',
    name: 'Tight Assembly Fit for Heavy Vibratory Service',
    typicalApplications: 'Couplings and heavy gears subject to high shock loads and vibration without fretting.',
    assemblyMethod: 'Requires mechanical or hydraulic press. Semi-permanent assembly.',
  },
  {
    designation: 'H7/p6',
    holeClass: 'H7',
    shaftClass: 'p6',
    category: 'Interference',
    name: 'Light Press Fit / Permanent Keyless Location',
    typicalApplications: 'Shaft sleeves, valve seat rings, permanent gears, bearing rings under heavy radial load.',
    assemblyMethod: 'Assembled with hydraulic press or heating hub to 100°C–120°C. Definite continuous interference.',
  },
  {
    designation: 'H7/r6',
    holeClass: 'H7',
    shaftClass: 'r6',
    category: 'Interference',
    name: 'Medium Press Fit for Steel and Cast Iron Hubs',
    typicalApplications: 'Permanent gear rims, heavy crane wheels, transmission couplings carrying moderate torsional shear.',
    assemblyMethod: 'Requires induction heating (150°C–180°C) or substantial hydraulic force with anti-galling lubricant.',
  },
  {
    designation: 'H7/s6',
    holeClass: 'H7',
    shaftClass: 's6',
    category: 'Interference',
    name: 'Heavy Permanent Shrink Fit',
    typicalApplications: 'Heavy locomotive wheels, keyless torque-transmitting hubs, high-torque turbine rotors.',
    assemblyMethod: 'Strict thermal shrink-fit assembly (heating hub to 250°C+ and/or liquid nitrogen freezing of shaft).',
  },
];

/**
 * Locate nominal diameter step per ISO 286-1
 * Boundary rule: minMm < nominalMm <= maxMm (except 0 which is nominalMm > 0)
 */
export function findDiameterStep(nominalMm: number): DiameterStep | null {
  if (nominalMm <= 0 || nominalMm > 500) {
    return null;
  }
  for (const step of DIAMETER_STEPS) {
    if (nominalMm > step.minMm && nominalMm <= step.maxMm) {
      return step;
    }
  }
  return null;
}
