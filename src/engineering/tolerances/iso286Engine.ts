import type {
  DiameterStep,
  ToleranceGrade,
  ToleranceLimit,
  FitCalculationResult,
  FitType,
} from './types';
import {
  DIAMETER_STEPS,
  IT_TABLE_UM,
  SHAFT_FUNDAMENTAL_DEVIATIONS_UM,
  STANDARD_FITS,
  findDiameterStep,
} from './iso286Data';

/**
 * Standard reference and verification metadata
 */
export const ISO_286_METADATA = {
  standardCode: 'ISO 286-1:2010 / ISO 286-2:2010',
  title: 'Geometrical product specifications (GPS) — ISO code system for tolerances on linear sizes',
  referenceTemperatureC: 20,
  maxSupportedDiameterMm: 500,
  supportedITGrades: ['IT5', 'IT6', 'IT7', 'IT8', 'IT9', 'IT10', 'IT11'],
  supportedHoleClasses: ['H6', 'H7', 'H8', 'H9', 'H11', 'JS7'],
  supportedShaftClasses: ['h6', 'h7', 'h8', 'h9', 'g6', 'f7', 'e8', 'd11', 'js6', 'k6', 'm6', 'n6', 'p6', 'r6', 's6'],
};

/**
 * Parses fit designation string, e.g. "45 H7/h6", "⌀50 H7/g6", or "H7/k6"
 */
export function parseFitDesignation(
  text: string,
  defaultNominal?: number
): { nominalMm: number; holeClass: string; shaftClass: string } | null {
  const cleaned = text.trim().replace(/^⌀/, '');

  // Pattern 1: e.g. "45 H7/h6" or "45H7/h6"
  const withNominal = cleaned.match(/^([0-9.]+)\s*([A-Za-z0-9]+)\s*[\/]\s*([A-Za-z0-9]+)$/);
  if (withNominal) {
    const nominalMm = parseFloat(withNominal[1]);
    if (!isNaN(nominalMm) && nominalMm > 0) {
      return {
        nominalMm,
        holeClass: withNominal[2].toUpperCase(),
        shaftClass: withNominal[3].toLowerCase(),
      };
    }
  }

  // Pattern 2: e.g. "H7/h6" with defaultNominal
  const withoutNominal = cleaned.match(/^([A-Za-z0-9]+)\s*[\/]\s*([A-Za-z0-9]+)$/);
  if (withoutNominal && defaultNominal && defaultNominal > 0) {
    return {
      nominalMm: defaultNominal,
      holeClass: withoutNominal[1].toUpperCase(),
      shaftClass: withoutNominal[2].toLowerCase(),
    };
  }

  return null;
}

/**
 * Calculates limit deviations and dimensions for an ISO hole class
 */
export function calculateHoleLimits(
  nominalMm: number,
  holeClass: string
): ToleranceLimit {
  const normClass = holeClass.trim().toUpperCase();
  const step = findDiameterStep(nominalMm);
  if (!step) {
    throw new Error(
      `Nominal diameter ${nominalMm} mm is outside verified ISO 286 range (0 mm < D <= ${ISO_286_METADATA.maxSupportedDiameterMm} mm).`
    );
  }

  // Match class format, e.g. "H7" -> letter "H", grade 7
  const match = normClass.match(/^([A-Z]+)([0-9]+)$/);
  if (!match) {
    throw new Error(`Unsupported hole tolerance class designation: "${normClass}".`);
  }

  const letter = match[1];
  const gradeNum = parseInt(match[2], 10);
  const gradeKey = `IT${gradeNum}` as ToleranceGrade;

  const itRow = IT_TABLE_UM[gradeKey];
  if (!itRow) {
    throw new Error(
      `Unsupported tolerance grade IT${gradeNum} for hole. Supported grades: ${ISO_286_METADATA.supportedITGrades.join(', ')}.`
    );
  }

  const itValueUm = itRow[step.stepIndex];

  let upperDeviationUm: number;
  let lowerDeviationUm: number;

  if (letter === 'H') {
    // Basic Hole: EI = 0, ES = +IT
    lowerDeviationUm = 0;
    upperDeviationUm = itValueUm;
  } else if (letter === 'JS') {
    // Symmetrical tolerance: ES = +IT/2, EI = -IT/2
    upperDeviationUm = itValueUm / 2;
    lowerDeviationUm = -itValueUm / 2;
  } else {
    throw new Error(
      `Hole letter "${letter}" is not currently in the verified ISO 286 database. Supported hole letters: H, JS.`
    );
  }

  const upperDeviationMm = upperDeviationUm / 1000;
  const lowerDeviationMm = lowerDeviationUm / 1000;
  const maxDimensionMm = Number((nominalMm + upperDeviationMm).toFixed(4));
  const minDimensionMm = Number((nominalMm + lowerDeviationMm).toFixed(4));

  return {
    nominalMm,
    toleranceClass: normClass,
    upperDeviationUm,
    lowerDeviationUm,
    upperDeviationMm,
    lowerDeviationMm,
    maxDimensionMm,
    minDimensionMm,
    toleranceGrade: gradeKey,
    toleranceZoneUm: itValueUm,
  };
}

/**
 * Calculates limit deviations and dimensions for an ISO shaft class
 */
export function calculateShaftLimits(
  nominalMm: number,
  shaftClass: string
): ToleranceLimit {
  const normClass = shaftClass.trim().toLowerCase();
  const step = findDiameterStep(nominalMm);
  if (!step) {
    throw new Error(
      `Nominal diameter ${nominalMm} mm is outside verified ISO 286 range (0 mm < D <= ${ISO_286_METADATA.maxSupportedDiameterMm} mm).`
    );
  }

  // Match class format, e.g. "h6" -> letter "h", grade 6
  const match = normClass.match(/^([a-z]+)([0-9]+)$/);
  if (!match) {
    throw new Error(`Unsupported shaft tolerance class designation: "${normClass}".`);
  }

  const letter = match[1];
  const gradeNum = parseInt(match[2], 10);
  const gradeKey = `IT${gradeNum}` as ToleranceGrade;

  const itRow = IT_TABLE_UM[gradeKey];
  if (!itRow) {
    throw new Error(
      `Unsupported tolerance grade IT${gradeNum} for shaft. Supported grades: ${ISO_286_METADATA.supportedITGrades.join(', ')}.`
    );
  }

  const itValueUm = itRow[step.stepIndex];

  let upperDeviationUm: number;
  let lowerDeviationUm: number;

  if (letter === 'js') {
    // Symmetrical tolerance
    upperDeviationUm = itValueUm / 2;
    lowerDeviationUm = -itValueUm / 2;
  } else {
    const devRecord = SHAFT_FUNDAMENTAL_DEVIATIONS_UM[letter];
    if (!devRecord) {
      throw new Error(
        `Shaft fundamental deviation letter "${letter}" is not in the verified ISO 286 database. Supported shaft letters: h, g, f, e, d, js, k, m, n, p, r, s.`
      );
    }

    const fundDev = devRecord.values[step.stepIndex];
    if (devRecord.type === 'upper') {
      upperDeviationUm = fundDev;
      lowerDeviationUm = fundDev - itValueUm;
    } else {
      // type === 'lower'
      lowerDeviationUm = fundDev;
      upperDeviationUm = fundDev + itValueUm;
    }
  }

  const upperDeviationMm = upperDeviationUm / 1000;
  const lowerDeviationMm = lowerDeviationUm / 1000;
  const maxDimensionMm = Number((nominalMm + upperDeviationMm).toFixed(4));
  const minDimensionMm = Number((nominalMm + lowerDeviationMm).toFixed(4));

  return {
    nominalMm,
    toleranceClass: normClass,
    upperDeviationUm,
    lowerDeviationUm,
    upperDeviationMm,
    lowerDeviationMm,
    maxDimensionMm,
    minDimensionMm,
    toleranceGrade: gradeKey,
    toleranceZoneUm: itValueUm,
  };
}

/**
 * Calculates complete ISO 286 fit limits, clearances, interferences, and assembly guidance
 */
export function calculateFit(
  nominalMm: number,
  holeClass: string,
  shaftClass: string
): FitCalculationResult {
  const step = findDiameterStep(nominalMm);
  if (!step) {
    throw new Error(
      `Nominal size ${nominalMm} mm is out of range. Supported ISO range: 0 mm < D <= ${ISO_286_METADATA.maxSupportedDiameterMm} mm.`
    );
  }

  const holeLimits = calculateHoleLimits(nominalMm, holeClass);
  const shaftLimits = calculateShaftLimits(nominalMm, shaftClass);

  // Clearance and Interference in mm
  // Minimum clearance = D_min - d_max
  const minClearanceMm = Number((holeLimits.minDimensionMm - shaftLimits.maxDimensionMm).toFixed(4));
  // Maximum clearance = D_max - d_min
  const maxClearanceMm = Number((holeLimits.maxDimensionMm - shaftLimits.minDimensionMm).toFixed(4));

  // Minimum interference = d_min - D_max = -maxClearance
  const minInterferenceMm = Number((shaftLimits.minDimensionMm - holeLimits.maxDimensionMm).toFixed(4));
  // Maximum interference = d_max - D_min = -minClearance
  const maxInterferenceMm = Number((shaftLimits.maxDimensionMm - holeLimits.minDimensionMm).toFixed(4));

  const minClearanceUm = Math.round(minClearanceMm * 1000);
  const maxClearanceUm = Math.round(maxClearanceMm * 1000);
  const minInterferenceUm = Math.round(minInterferenceMm * 1000);
  const maxInterferenceUm = Math.round(maxInterferenceMm * 1000);

  // Fit classification rule:
  // If minClearance >= 0 -> Clearance fit (D_min >= d_max)
  // If minInterference >= 0 -> Interference fit (d_min >= D_max)
  // Else -> Transition fit (clearance and interference both possible)
  let fitType: FitType;
  if (minClearanceUm >= 0) {
    fitType = 'clearance';
  } else if (minInterferenceUm >= 0) {
    fitType = 'interference';
  } else {
    fitType = 'transition';
  }

  const designationKey = `${holeLimits.toleranceClass}/${shaftLimits.toleranceClass}`;
  const fullDesignation = `${nominalMm} ${designationKey}`;

  const standardFit = STANDARD_FITS.find(
    (f) =>
      f.holeClass.toUpperCase() === holeLimits.toleranceClass.toUpperCase() &&
      f.shaftClass.toLowerCase() === shaftLimits.toleranceClass.toLowerCase()
  );

  let functionalDescription = standardFit?.typicalApplications || '';
  let assemblyGuidance = standardFit?.assemblyMethod || '';

  if (!functionalDescription) {
    if (fitType === 'clearance') {
      functionalDescription = `Clearance fit (${minClearanceUm} µm to ${maxClearanceUm} µm). Allows relative motion or easy sliding assembly.`;
      assemblyGuidance = 'Assembles by hand with lubrication. Check operating temperature rise to ensure minimum running clearance is preserved.';
    } else if (fitType === 'interference') {
      functionalDescription = `Interference fit (${minInterferenceUm} µm to ${maxInterferenceUm} µm). Provides rigid, permanent keyless assembly.`;
      assemblyGuidance = 'Requires mechanical arbor/hydraulic press or thermal heating of the hub / cooling of the shaft.';
    } else {
      functionalDescription = `Transition fit (-${Math.abs(minClearanceUm)} µm interference to +${maxClearanceUm} µm clearance). Accurate location without noticeable play.`;
      assemblyGuidance = 'Assembles with light to moderate mallet tapping or light mechanical press. Disassembly possible without component damage.';
    }
  }

  const warnings: string[] = [];
  const limitations: string[] = [
    'Tolerances apply at standard reference temperature of 20°C per ISO 1',
    'Contact pressure, hub hoop stress, and push-off force require separate press-fit elastic analysis',
    'Surface roughness (Ra) must be significantly smaller than tolerance band to preserve intended fit',
  ];

  if (fitType === 'interference' && maxInterferenceUm > 100) {
    warnings.push(`Heavy interference (${maxInterferenceUm} µm): Verify hub tensile hoop stress to prevent ductile bursting or plastic yielding.`);
  }

  return {
    designation: fullDesignation,
    nominalDiameterMm: nominalMm,
    diameterStep: step,
    holeClass: holeLimits.toleranceClass,
    shaftClass: shaftLimits.toleranceClass,
    holeLimits,
    shaftLimits,
    fitType,
    minClearanceMm,
    maxClearanceMm,
    minClearanceUm,
    maxClearanceUm,
    minInterferenceMm,
    maxInterferenceMm,
    minInterferenceUm,
    maxInterferenceUm,
    fitToleranceUm: holeLimits.toleranceZoneUm + shaftLimits.toleranceZoneUm,
    standardReference: ISO_286_METADATA.standardCode,
    verificationStatus: 'verified',
    functionalDescription,
    assemblyGuidance,
    warnings,
    limitations,
  };
}
