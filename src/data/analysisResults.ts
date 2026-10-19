import type {
  AnalysisResult,
  DesignParameters,
  StressDistributionPoint,
  FatigueCurvePoint,
} from '../types';
import { getMaterialById } from './materials';
import { calculateFullShaftAnalysis } from '../engineering';

/**
 * Compute analysis results from design parameters by delegating to the
 * dedicated engineering calculation layer.
 */
export function computeAnalysis(params: DesignParameters): AnalysisResult {
  const mat = getMaterialById(params.materialId);
  if (!mat) {
    return emptyResult();
  }

  // Execute full composite engineering analysis
  const fullAnalysis = calculateFullShaftAnalysis({
    torqueNm: params.torque,
    radialForceN: params.force,
    diameterMm: params.diameter,
    lengthMm: params.length,
    rpm: params.rpm,
    yieldStrengthMPa: mat.yieldStrength,
    tensileStrengthMPa: mat.tensileStrength,
    elasticModulusGPa: mat.elasticModulus,
    targetSafetyFactor: params.safetyFactor,
    operatingTempC: params.temperature,
    criterion: 'Von Mises'
  });

  const vonMisesStress = fullAnalysis.combinedStress.result.equivalentStressMPa;
  const shearStress = fullAnalysis.torsion.result.shearStressMPa;
  const bendingStress = fullAnalysis.bending.result.bendingStressMPa;
  const factorOfSafety = fullAnalysis.combinedStress.result.factorOfSafety;
  const maxDeflection = fullAnalysis.deflection.result.maxDeflectionMm;

  // Torque capacity at given safety factor: T_cap = (tau_allow * pi * d^3) / 16
  const tauAllow = mat.yieldStrength / (2 * params.safetyFactor);
  const d_m = params.diameter / 1000;
  const torqueCapacity = (tauAllow * 1e6 * Math.PI * Math.pow(d_m, 3)) / 16;

  // Fatigue life estimate (simplified Basquin S-N approach)
  const enduranceLimit = mat.tensileStrength * 0.5;
  const stressRatio = vonMisesStress / enduranceLimit;
  let fatigueLife: number;
  if (stressRatio < 1) {
    fatigueLife = 1e7;
  } else {
    fatigueLife = Math.pow(10, 7 - 3.5 * Math.log10(stressRatio));
  }

  let statusMessage = fullAnalysis.summary;
  if (fullAnalysis.overallStatus === 'pass') {
    statusMessage = 'Design meets all safety requirements. ' + fullAnalysis.summary;
  }

  return {
    vonMisesStress: Math.round(vonMisesStress * 10) / 10,
    yieldStrength: mat.yieldStrength,
    factorOfSafety: Math.round(factorOfSafety * 100) / 100,
    maxDeflection: Math.round(maxDeflection * 1000) / 1000,
    torqueCapacity: Math.round(torqueCapacity),
    fatigueLife: Math.round(fatigueLife),
    shearStress: Math.round(shearStress * 10) / 10,
    bendingStress: Math.round(bendingStress * 10) / 10,
    status: fullAnalysis.overallStatus,
    statusMessage,
  };
}

/**
 * Generate stress distribution along the shaft length.
 */
export function generateStressDistribution(
  params: DesignParameters
): StressDistributionPoint[] {
  const mat = getMaterialById(params.materialId);
  if (!mat) return [];

  const d = params.diameter / 1000;
  const L = params.length;
  const F = params.force;
  const T = params.torque;
  const points: StressDistributionPoint[] = [];
  const numPoints = 20;

  for (let i = 0; i <= numPoints; i++) {
    const x = (i / numPoints) * L;
    const xNorm = x / L;

    // Bending moment varies (simply supported beam, center load)
    const M =
      xNorm <= 0.5
        ? F * (x / 1000) * 0.5
        : F * ((L - x) / 1000) * 0.5;
    const I = (Math.PI * Math.pow(d, 4)) / 64;
    const bending = (M * (d / 2)) / I / 1e6;

    // Shear is constant along the shaft for pure torsion
    const shear = (16 * T) / (Math.PI * Math.pow(d, 3)) / 1e6;

    // Von Mises
    const vonMises = Math.sqrt(bending * bending + 3 * shear * shear);

    points.push({
      position: Math.round(x * 10) / 10,
      vonMises: Math.round(vonMises * 10) / 10,
      shear: Math.round(shear * 10) / 10,
      bending: Math.round(bending * 10) / 10,
    });
  }

  return points;
}

/**
 * Generate S-N fatigue curve data.
 */
export function generateFatigueCurve(
  params: DesignParameters
): FatigueCurvePoint[] {
  const mat = getMaterialById(params.materialId);
  if (!mat) return [];

  const Se = mat.tensileStrength * 0.5; // endurance limit
  const Su = mat.tensileStrength;
  const points: FatigueCurvePoint[] = [];

  // Generate points from 1e3 to 1e7 cycles
  for (let exp = 3; exp <= 7; exp += 0.25) {
    const N = Math.pow(10, exp);
    // Simplified S-N: S = a × N^b
    const a = 0.9 * Su;
    const b = -(1 / 3) * Math.log10((0.9 * Su) / Se);
    const S = a * Math.pow(N / 1000, -b / (7 - 3) * (exp - 3) > 0 ? b : 0);
    const stress = Se + (a - Se) * Math.exp(-(exp - 3) * 0.7);

    points.push({
      cycles: Math.round(N),
      stress: Math.round(Math.max(stress, Se) * 10) / 10,
    });
  }

  return points;
}

function emptyResult(): AnalysisResult {
  return {
    vonMisesStress: 0,
    yieldStrength: 0,
    factorOfSafety: 0,
    maxDeflection: 0,
    torqueCapacity: 0,
    fatigueLife: 0,
    shearStress: 0,
    bendingStress: 0,
    status: 'fail',
    statusMessage: 'Material not found.',
  };
}
