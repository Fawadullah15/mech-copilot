/**
 * Shaft–Hub Connections Types & Data Models
 * Conforms to DIN 6885-1:2021-11 (Parallel Keys), DIN 7190-1:2017-02 (Interference Fits),
 * and ISO 286 (Limits & Fits integration).
 */

import type { Material } from '../../types';

export type KeyProfileType = 'form_a_round_ends' | 'form_b_square_ends' | 'custom';

export interface ParallelKeyInput {
  shaftDiameter: number; // mm (d)
  keyWidth: number; // mm (b)
  keyHeight: number; // mm (h)
  keyLength: number; // mm (L)
  keyProfile?: KeyProfileType; // default form_a_round_ends
  effectiveLength?: number; // mm (if explicitly specified)
  shaftKeywayDepth?: number; // mm (t1, default per DIN 6885-1 or ~0.6*h)
  hubKeywayDepth?: number; // mm (t2, default per DIN 6885-1 or ~0.4*h)
  torque: number; // N·m (transmitted torque)
  axialForce?: number; // N (directly applied axial thrust)
  isReversingTorque?: boolean;
  dynamicLoadFactor?: number; // KA, application factor (1.0 = uniform, 1.25 = light shock, 1.5 = moderate shock)
  keyMaterial: Material | { name: string; yieldStrength: number; shearStrength?: number };
  shaftMaterial: Material | { name: string; yieldStrength: number };
  hubMaterial: Material | { name: string; yieldStrength: number };
  allowableShearStress?: number; // MPa (manual override)
  allowableBearingPressure?: number; // MPa (manual override)
  safetyFactor?: number; // default 1.5
}

export interface ParallelKeyResult {
  shaftDiameter: number; // mm
  keyWidth: number; // mm (b)
  keyHeight: number; // mm (h)
  keyLength: number; // mm (L)
  effectiveLength: number; // mm (Leff)
  effectiveContactHeight: number; // mm (heff)
  tangentialForce: number; // N (Ft = 2T / d)
  shearArea: number; // mm² (As = b * Leff)
  bearingArea: number; // mm² (Ab = heff * Leff)
  shearStress: number; // MPa (τk = Ft / As)
  bearingPressure: number; // MPa (pb = Ft / Ab)
  allowableShearStress: number; // MPa
  allowableBearingPressure: number; // MPa
  governingMaterialForPressure: string;
  shearSafetyFactor: number;
  bearingSafetyFactor: number;
  torqueCapacityShear: number; // N·m
  torqueCapacityBearing: number; // N·m
  torqueCapacity: number; // N·m (min of shear & bearing)
  connectionSafetyFactor: number; // Tcap / T
  governingMode: 'key_shear' | 'contact_pressure';
  status: 'safe' | 'marginal' | 'fail';
  statusMessage: string;
  reversingLoadWarning?: string;
  assumptions: string[];
  limitations: string[];
  standardReference: string;
}

export interface InterferenceFitInput {
  shaftNominalDiameter: number; // mm (d)
  hubNominalBore: number; // mm (d)
  fitDesignation?: string; // e.g. "H7/p6", "H7/s6", "H7/r6"
  shaftMaxDiameter: number; // mm
  shaftMinDiameter: number; // mm
  hubMaxBore: number; // mm
  hubMinBore: number; // mm
  hubOuterDiameter: number; // mm (Do)
  shaftInnerDiameter?: number; // mm (di, 0 for solid shaft)
  fitLength: number; // mm (L)
  frictionCoefficient: number; // μ (e.g. 0.12 - 0.18)
  frictionSource?: string;
  transmittedTorque: number; // N·m
  axialForce?: number; // N
  simultaneousLoading?: boolean;
  shaftMaterial: Material | { name: string; elasticModulus: number; poissonsRatio: number; yieldStrength: number; thermalExpansion?: number };
  hubMaterial: Material | { name: string; elasticModulus: number; poissonsRatio: number; yieldStrength: number; thermalExpansion?: number };
  surfaceSmoothingCorrectionUm?: number; // μm (smoothing loss G)
}

export interface InterferenceFitResult {
  shaftNominalDiameter: number; // mm
  hubOuterDiameter: number; // mm
  shaftInnerDiameter: number; // mm
  fitLength: number; // mm
  frictionCoefficient: number;
  frictionSource: string;
  diametralInterference: {
    minUm: number;
    maxUm: number;
    nominalUm: number;
    effectiveMinUm: number;
    effectiveMaxUm: number;
    isTransitionOrClearance: boolean;
  };
  contactPressure: {
    minMpa: number;
    maxMpa: number;
    nominalMpa: number;
  };
  stresses: {
    hubHoopStressMaxMpa: number; // tensile at inner bore
    hubRadialStressMaxMpa: number; // compressive (-p)
    hubVonMisesMaxMpa: number;
    hubYieldSafetyFactor: number;
    shaftVonMisesMaxMpa: number;
    shaftYieldSafetyFactor: number;
    hubYieldStrengthMpa: number;
    shaftYieldStrengthMpa: number;
  };
  capacity: {
    minTorqueCapacityNm: number;
    maxTorqueCapacityNm: number;
    minAxialCapacityN: number;
    maxAxialCapacityN: number;
    torqueMargin: number;
    axialMargin: number;
    combinedTractionN?: number;
    combinedMargin?: number;
  };
  status: 'safe' | 'caution' | 'fail' | 'clearance_risk';
  statusMessage: string;
  warnings: string[];
  assumptions: string[];
  limitations: string[];
  standardReference: string;
}

export interface ThermalAssemblyInput {
  nominalDiameter: number; // mm (d)
  maxShaftDiameter: number; // mm
  minHubBore: number; // mm
  shaftThermalExpansion: number; // 10^-6 / K
  hubThermalExpansion: number; // 10^-6 / K
  referenceTemperatureC?: number; // default 20 °C
  targetAssemblyClearanceUm?: number; // μm (handling clearance, e.g. 0.001*d)
  hubHeatingTempC?: number; // °C (user test value)
  shaftCoolingTempC?: number; // °C (user test value)
  maxAllowableHubTempC?: number; // °C (e.g. 250 - 300 °C)
  minAllowableShaftTempC?: number; // °C (e.g. -80 °C or -196 °C)
}

export interface ThermalAssemblyResult {
  initialMaxInterferenceUm: number; // μm
  targetAssemblyClearanceUm: number; // μm
  totalExpansionRequiredUm: number; // μm
  calculatedHubTempForAssemblyC: number; // °C (if shaft remains at 20°C)
  calculatedShaftTempForAssemblyC: number; // °C (if hub remains at 20°C)
  hubExpansionAtInputTempUm?: number;
  shaftContractionAtInputTempUm?: number;
  resultingClearanceAtInputTempsUm?: number;
  isHubTempSafe: boolean;
  isShaftTempSafe: boolean;
  status: 'feasible' | 'elevated_temp_warning' | 'infeasible';
  statusMessage: string;
  guidance: string;
  warnings: string[];
  assumptions: string[];
  limitations: string[];
}

export interface StandardKeyDimension {
  dMin: number;
  dMax: number;
  b: number;
  h: number;
  t1: number;
  t2: number;
}
