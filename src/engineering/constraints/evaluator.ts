import type { Material, DesignParameters } from '../../types';
import type {
  ConstraintResult,
  ConstraintType,
  MaterialSuitabilityEvaluation,
  ConstraintEvaluationInputs,
} from './types';

/**
 * Standard Machinery Design Limits
 * Sourced from Shigley's Mechanical Engineering Design & Machinery's Handbook
 */
export const DESIGN_LIMITS = {
  /** Maximum allowable angular deflection at deep groove ball bearing seats (rad) */
  MAX_BEARING_SLOPE_RAD: 0.001,
  /** Critical angular misalignment threshold leading to premature bearing spalling (rad) */
  CRITICAL_BEARING_SLOPE_RAD: 0.002,
  /** Recommended maximum torsional twist for commercial line and transmission shafting (deg/m) */
  MAX_TORSIONAL_TWIST_DEG_PER_M: 1.0,
  /** Critical torsional twist threshold (deg/m) */
  CRITICAL_TORSIONAL_TWIST_DEG_PER_M: 1.5,
  /** Standard allowable flexural deflection ratio (L / 1000) */
  FLEXURAL_DEFLECTION_SPAN_RATIO: 1000,
  /** Absolute deflection threshold for geared shafts to preserve tooth mesh alignment (mm) */
  GEAR_MESH_MAX_DEFLECTION_MM: 0.2,
  /** Critical absolute deflection threshold (mm) */
  CRITICAL_DEFLECTION_MM: 0.5,
  /** Maximum recommended shaft slenderness ratio (L / d) to avoid lateral whirling resonance */
  SLENDERNESS_COMPACT_LIMIT: 30,
  SLENDERNESS_CRITICAL_LIMIT: 40,
};

/**
 * Helper to compute effective shear modulus (G) in GPa
 */
export function getShearModulusGPa(material: Material): number {
  if (material.shearModulus && material.shearModulus > 0) {
    return material.shearModulus;
  }
  // Isotropic elastic relation: G = E / [2 * (1 + nu)]
  return material.elasticModulus / (2 * (1 + (material.poissonsRatio || 0.3)));
}

/**
 * Evaluate all design constraints and mechanical suitability for a specific material
 * under active workspace parameters (d, L, T, F, n, temp).
 */
export function evaluateMaterialSuitability(
  inputs: ConstraintEvaluationInputs
): MaterialSuitabilityEvaluation {
  const { material, params, baselineMaterial } = inputs;
  const targetSafetyFactor = inputs.targetSafetyFactor ?? params.safetyFactor ?? 2.0;

  const d_mm = Math.max(params.diameter, 1);
  const L_mm = Math.max(params.length, 1);
  const d_m = d_mm / 1000;
  const L_m = L_mm / 1000;
  const T_Nm = Math.max(params.torque, 0);
  const F_N = Math.max(params.force, 0);
  const operatingTempC = params.temperature ?? 20;

  // 1. Cross-sectional and Mass Properties
  const areaM2 = (Math.PI * Math.pow(d_m, 2)) / 4;
  const volumeM3 = areaM2 * L_m;
  const massKg = volumeM3 * material.density;
  const I_m4 = (Math.PI * Math.pow(d_m, 4)) / 64;
  const J_m4 = (Math.PI * Math.pow(d_m, 4)) / 32;

  // Specific strength in kN·m/kg = (Sy [MPa] * 1000) / density [kg/m³]
  const specificStrength = (material.yieldStrength * 1000) / material.density;

  // 2. Stress & Strength Calculations
  const bendingMomentNm = (F_N * L_m) / 4; // Midspan concentrated point load
  const bendingStressPa = (32 * bendingMomentNm) / (Math.PI * Math.pow(d_m, 3));
  const bendingStressMPa = bendingStressPa / 1e6;

  const shearStressPa = (16 * T_Nm) / (Math.PI * Math.pow(d_m, 3));
  const shearStressMPa = shearStressPa / 1e6;

  const vonMisesStressMPa = Math.sqrt(
    Math.pow(bendingStressMPa, 2) + 3 * Math.pow(shearStressMPa, 2)
  );

  const factorOfSafety =
    vonMisesStressMPa > 1e-4
      ? material.yieldStrength / vonMisesStressMPa
      : 999;

  // 3. Flexural Deflection & Bearing Slope
  const E_Pa = material.elasticModulus * 1e9;
  let centerDeflectionM = 0;
  let bearingSlopeRad = 0;
  if (E_Pa > 0 && I_m4 > 0) {
    centerDeflectionM = (F_N * Math.pow(L_m, 3)) / (48 * E_Pa * I_m4);
    bearingSlopeRad = (F_N * Math.pow(L_m, 2)) / (16 * E_Pa * I_m4);
  }
  const centerDeflectionMm = centerDeflectionM * 1000;

  // 4. Torsional Twist
  const G_GPa = getShearModulusGPa(material);
  const G_Pa = G_GPa * 1e9;
  let torsionalTwistRad = 0;
  if (G_Pa > 0 && J_m4 > 0) {
    torsionalTwistRad = (T_Nm * L_m) / (G_Pa * J_m4);
  }
  const torsionalTwistDeg = (torsionalTwistRad * 180) / Math.PI;
  const torsionalTwistDegPerMeter = L_m > 0 ? torsionalTwistDeg / L_m : 0;

  // 5. Evaluate Individual Constraints
  const constraints: ConstraintResult[] = [];

  // Constraint A: Yield Stress / Reserve Factor
  const allowableStressMPa = material.yieldStrength / targetSafetyFactor;
  const stressUtil = allowableStressMPa > 0 ? vonMisesStressMPa / allowableStressMPa : 1;
  let stressStatus: 'pass' | 'warning' | 'fail' = 'pass';
  let stressMsg = `Von Mises stress (${vonMisesStressMPa.toFixed(1)} MPa) satisfies allowable limit (${allowableStressMPa.toFixed(1)} MPa, FoS: ${factorOfSafety.toFixed(2)} ≥ ${targetSafetyFactor.toFixed(1)}).`;
  let stressRemedy: string | undefined;

  if (vonMisesStressMPa > material.yieldStrength) {
    stressStatus = 'fail';
    stressMsg = `CRITICAL YIELD FAILURE: Equivalent stress (${vonMisesStressMPa.toFixed(1)} MPa) exceeds material yield strength (${material.yieldStrength} MPa). Plastic deformation will occur.`;
    stressRemedy = `Increase diameter to at least ${(d_mm * Math.cbrt(vonMisesStressMPa / allowableStressMPa)).toFixed(1)} mm or upgrade to higher-yield alloy.`;
  } else if (vonMisesStressMPa > allowableStressMPa) {
    stressStatus = 'warning';
    stressMsg = `Stress (${vonMisesStressMPa.toFixed(1)} MPa) exceeds allowable design limit (${allowableStressMPa.toFixed(1)} MPa). Factor of safety (${factorOfSafety.toFixed(2)}) is below design target (${targetSafetyFactor.toFixed(1)}).`;
    stressRemedy = `Increase shaft diameter by ~${(((Math.cbrt(stressUtil) - 1) * 100)).toFixed(0)}% to reach target FoS.`;
  }

  constraints.push({
    type: 'yield_stress',
    name: 'Yield Strength & Reserve Factor',
    governingStandardOrRule: 'ASME B106.1M / Von Mises Failure Criterion',
    status: stressStatus,
    actualValue: vonMisesStressMPa,
    allowableValue: allowableStressMPa,
    unit: 'MPa',
    utilizationRatio: stressUtil,
    message: stressMsg,
    remedy: stressRemedy,
  });

  // Constraint B: Flexural Deflection
  const allowableDeflectionMm = L_mm / DESIGN_LIMITS.FLEXURAL_DEFLECTION_SPAN_RATIO;
  const deflUtil = allowableDeflectionMm > 0 ? centerDeflectionMm / allowableDeflectionMm : 0;
  let deflStatus: 'pass' | 'warning' | 'fail' = 'pass';
  let deflMsg = `Centerline deflection (${centerDeflectionMm.toFixed(4)} mm) is within allowable limit (${allowableDeflectionMm.toFixed(3)} mm = L/1000).`;
  let deflRemedy: string | undefined;

  if (centerDeflectionMm > allowableDeflectionMm * 1.5 || centerDeflectionMm > DESIGN_LIMITS.CRITICAL_DEFLECTION_MM) {
    deflStatus = 'fail';
    deflMsg = `EXCESSIVE DEFLECTION: Shaft sag (${centerDeflectionMm.toFixed(4)} mm) violates stiffness criteria (> ${allowableDeflectionMm.toFixed(3)} mm / 0.5 mm threshold).`;
    deflRemedy = `Increase shaft diameter d (stiffness scales as d⁴; upgrading steel grade does NOT reduce deflection).`;
  } else if (centerDeflectionMm > allowableDeflectionMm || centerDeflectionMm > DESIGN_LIMITS.GEAR_MESH_MAX_DEFLECTION_MM) {
    deflStatus = 'warning';
    deflMsg = `Marginal deflection (${centerDeflectionMm.toFixed(4)} mm) may induce gear pitch misalignment or premature seal degradation.`;
    deflRemedy = `Increase diameter slightly or shorten bearing span L to restore rigidity.`;
  }

  constraints.push({
    type: 'deflection',
    name: 'Centerline Flexural Rigidity',
    governingStandardOrRule: 'Standard Machinery Rule (δ ≤ L/1000 & δ ≤ 0.2 mm for gears)',
    status: deflStatus,
    actualValue: centerDeflectionMm,
    allowableValue: allowableDeflectionMm,
    unit: 'mm',
    utilizationRatio: deflUtil,
    message: deflMsg,
    remedy: deflRemedy,
  });

  // Constraint C: Bearing Journal Angular Misalignment
  const slopeUtil = bearingSlopeRad / DESIGN_LIMITS.MAX_BEARING_SLOPE_RAD;
  let slopeStatus: 'pass' | 'warning' | 'fail' = 'pass';
  let slopeMsg = `Bearing seat slope (${(bearingSlopeRad * 1000).toFixed(3)} mrad) is within acceptable deep-groove limit (${(DESIGN_LIMITS.MAX_BEARING_SLOPE_RAD * 1000).toFixed(1)} mrad).`;
  let slopeRemedy: string | undefined;

  if (bearingSlopeRad > DESIGN_LIMITS.CRITICAL_BEARING_SLOPE_RAD) {
    slopeStatus = 'fail';
    slopeMsg = `CRITICAL BEARING MISALIGNMENT: Journal angular slope (${(bearingSlopeRad * 1000).toFixed(3)} mrad) will cause edge-loading and rapid spalling in rigid ball bearings.`;
    slopeRemedy = `Use spherical roller/self-aligning bearings or increase shaft cross-section diameter.`;
  } else if (bearingSlopeRad > DESIGN_LIMITS.MAX_BEARING_SLOPE_RAD) {
    slopeStatus = 'warning';
    slopeMsg = `Elevated journal misalignment (${(bearingSlopeRad * 1000).toFixed(3)} mrad) exceeds standard 1.0 mrad deep-groove ball bearing rating.`;
    slopeRemedy = `Verify bearing catalog permissible misalignment or stiffen shaft.`;
  }

  constraints.push({
    type: 'bearing_slope',
    name: 'Bearing Journal Angular Slope',
    governingStandardOrRule: 'ISO 281 / Bearing Manufacturer Misalignment Limit (θ ≤ 0.001 rad)',
    status: slopeStatus,
    actualValue: bearingSlopeRad,
    allowableValue: DESIGN_LIMITS.MAX_BEARING_SLOPE_RAD,
    unit: 'rad',
    utilizationRatio: slopeUtil,
    message: slopeMsg,
    remedy: slopeRemedy,
  });

  // Constraint D: Torsional Twist
  const twistUtil = torsionalTwistDegPerMeter / DESIGN_LIMITS.MAX_TORSIONAL_TWIST_DEG_PER_M;
  let twistStatus: 'pass' | 'warning' | 'fail' = 'pass';
  let twistMsg = `Torsional twist (${torsionalTwistDegPerMeter.toFixed(3)}°/m) is within commercial transmission limit (${DESIGN_LIMITS.MAX_TORSIONAL_TWIST_DEG_PER_M.toFixed(1)}°/m).`;
  let twistRemedy: string | undefined;

  if (torsionalTwistDegPerMeter > DESIGN_LIMITS.CRITICAL_TORSIONAL_TWIST_DEG_PER_M) {
    twistStatus = 'fail';
    twistMsg = `EXCESSIVE TORSIONAL TWIST: Dynamic windup (${torsionalTwistDegPerMeter.toFixed(3)}°/m) exceeds critical machinery limit (${DESIGN_LIMITS.CRITICAL_TORSIONAL_TWIST_DEG_PER_M}°/m).`;
    twistRemedy = `Enlarge shaft diameter (torsional stiffness scales as d⁴ and shear modulus G).`;
  } else if (torsionalTwistDegPerMeter > DESIGN_LIMITS.MAX_TORSIONAL_TWIST_DEG_PER_M) {
    twistStatus = 'warning';
    twistMsg = `Moderate torsional twist (${torsionalTwistDegPerMeter.toFixed(3)}°/m) may cause synchronization error or vibration in precision drivetrains.`;
    twistRemedy = `Consider increasing diameter if precise angular timing is required.`;
  }

  constraints.push({
    type: 'torsional_twist',
    name: 'Torsional Deflection & Windup',
    governingStandardOrRule: 'Machinery Design Rule (θ_twist ≤ 1.0 deg/m)',
    status: twistStatus,
    actualValue: torsionalTwistDegPerMeter,
    allowableValue: DESIGN_LIMITS.MAX_TORSIONAL_TWIST_DEG_PER_M,
    unit: '°/m',
    utilizationRatio: twistUtil,
    message: twistMsg,
    remedy: twistRemedy,
  });

  // Constraint E: Thermal Service Limit
  const maxTempC = material.maxOperatingTempC ?? 300;
  const tempMargin = maxTempC - operatingTempC;
  let tempStatus: 'pass' | 'warning' | 'fail' = 'pass';
  let tempMsg = `Operating temperature (${operatingTempC}°C) is safely below maximum service limit (${maxTempC}°C, margin: +${tempMargin}°C).`;
  let tempRemedy: string | undefined;

  if (operatingTempC > maxTempC) {
    tempStatus = 'fail';
    tempMsg = `THERMAL OVERHEAT: Service temperature (${operatingTempC}°C) exceeds alloy rating (${maxTempC}°C). Microstructural softening or accelerated creep will occur.`;
    tempRemedy = `Select high-temperature alloy (e.g. Inconel 718, Stainless 316, or Ti-6Al-4V) or incorporate forced cooling.`;
  } else if (operatingTempC > maxTempC - 50) {
    tempStatus = 'warning';
    tempMsg = `Elevated temperature (${operatingTempC}°C) is within 50°C of alloy limit (${maxTempC}°C). Yield de-rating factors should be applied.`;
    tempRemedy = `Verify elevated-temperature tensile curves from MMPDS or ASME Section II-D.`;
  }

  constraints.push({
    type: 'temperature',
    name: 'Operating Temperature & Thermal Reserve',
    governingStandardOrRule: 'Material Specification Continuous Service Temperature',
    status: tempStatus,
    actualValue: operatingTempC,
    allowableValue: maxTempC,
    unit: '°C',
    utilizationRatio: maxTempC > 0 ? operatingTempC / maxTempC : 1,
    message: tempMsg,
    remedy: tempRemedy,
  });

  // Constraint F: Slenderness / Aspect Ratio
  const slenderness = d_mm > 0 ? L_mm / d_mm : 999;
  let slendernessStatus: 'pass' | 'warning' | 'fail' = 'pass';
  let slendernessMsg = `Aspect ratio L/d = ${slenderness.toFixed(1)} is within rigid shafting envelope (L/d ≤ ${DESIGN_LIMITS.SLENDERNESS_COMPACT_LIMIT}).`;
  let slendernessRemedy: string | undefined;

  if (slenderness > DESIGN_LIMITS.SLENDERNESS_CRITICAL_LIMIT) {
    slendernessStatus = 'fail';
    slendernessMsg = `EXCESSIVE SLENDERNESS (L/d = ${slenderness.toFixed(1)} > ${DESIGN_LIMITS.SLENDERNESS_CRITICAL_LIMIT}): High susceptibility to lateral whirling resonance, bowing, and critical speed proximity.`;
    slendernessRemedy = `Shorten bearing span L, add intermediate bearing support, or increase diameter d.`;
  } else if (slenderness > DESIGN_LIMITS.SLENDERNESS_COMPACT_LIMIT) {
    slendernessStatus = 'warning';
    slendernessMsg = `Slender shaft (L/d = ${slenderness.toFixed(1)}): Whirling frequency analysis and dynamic balancing are recommended.`;
    slendernessRemedy = `Evaluate first bending critical speed against operational RPM.`;
  }

  constraints.push({
    type: 'slenderness',
    name: 'Shaft Aspect Ratio & Whirling Envelope',
    governingStandardOrRule: 'Rotor Dynamics Rule (L/d ≤ 30 for rigid behavior, L/d ≤ 40 critical)',
    status: slendernessStatus,
    actualValue: slenderness,
    allowableValue: DESIGN_LIMITS.SLENDERNESS_COMPACT_LIMIT,
    unit: 'dimless',
    utilizationRatio: slenderness / DESIGN_LIMITS.SLENDERNESS_COMPACT_LIMIT,
    message: slendernessMsg,
    remedy: slendernessRemedy,
  });

  // 6. Overall Status & Governing Constraint Determination
  const hasFail = constraints.some((c) => c.status === 'fail');
  const hasWarning = constraints.some((c) => c.status === 'warning');
  const overallStatus: 'pass' | 'warning' | 'fail' = hasFail
    ? 'fail'
    : hasWarning
    ? 'warning'
    : 'pass';

  // Governing constraint is the one with highest utilization ratio or highest severity
  const sortedConstraints = [...constraints].sort((a, b) => {
    const sevWeight = (s: 'pass' | 'warning' | 'fail') => (s === 'fail' ? 2 : s === 'warning' ? 1 : 0);
    const diff = sevWeight(b.status) - sevWeight(a.status);
    if (diff !== 0) return diff;
    return b.utilizationRatio - a.utilizationRatio;
  });
  const governingConstraint = sortedConstraints[0];

  // 7. Suitability Score (0 - 100)
  let score = 100;
  for (const c of constraints) {
    if (c.status === 'fail') score -= 25;
    else if (c.status === 'warning') score -= 10;
  }
  // Penalize overdesign (FoS > 8 in weight-sensitive systems)
  if (factorOfSafety > 8 && factorOfSafety < 990) {
    score -= 5;
  }
  // Reward good specific strength
  if (specificStrength > 100) score += 5;
  if (specificStrength > 150) score += 5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Relative weight compared to baseline material (if provided)
  const baseMat = baselineMaterial || material;
  const baseMass = volumeM3 * baseMat.density;
  const relativeWeightVsBaselinePercent =
    baseMass > 0 ? ((massKg - baseMass) / baseMass) * 100 : 0;

  // 8. Recommendation Summary & Trade-off Insight
  let recommendationSummary = '';
  if (overallStatus === 'pass') {
    recommendationSummary = `Verified suitable. Satisfies all yield, rigidity, torsional, thermal, and alignment limits with ${factorOfSafety.toFixed(2)} FoS.`;
  } else if (overallStatus === 'warning') {
    recommendationSummary = `Conditional suitability. Governing limitation is ${governingConstraint.name.toLowerCase()} (${governingConstraint.message}).`;
  } else {
    recommendationSummary = `Deficient for active CAD envelope. Critical bottleneck: ${governingConstraint.name} (${governingConstraint.message}).`;
  }

  const tradeoffInsight = generateStiffnessStrengthInsight(baseMat, material);

  return {
    material,
    overallStatus,
    suitabilityScore: score,
    massKg,
    specificStrength,
    torsionalTwistDegPerMeter,
    centerDeflectionMm,
    bearingSlopeRad,
    vonMisesStressMPa,
    factorOfSafety,
    relativeWeightVsBaselinePercent,
    governingConstraint,
    allConstraints: constraints,
    recommendationSummary,
    tradeoffInsight,
  };
}

/**
 * Rank a list of candidate materials for given design parameters
 */
export function rankMaterialsForDesign(
  materials: Material[],
  params: DesignParameters,
  baselineMaterial?: Material
): MaterialSuitabilityEvaluation[] {
  const evaluations = materials.map((m) =>
    evaluateMaterialSuitability({
      material: m,
      params,
      baselineMaterial: baselineMaterial || materials[0],
    })
  );

  // Sort by overall status (pass > warning > fail), then by suitabilityScore desc, then specific strength desc
  return evaluations.sort((a, b) => {
    const statusWeight = (s: 'pass' | 'warning' | 'fail') => (s === 'pass' ? 2 : s === 'warning' ? 1 : 0);
    const sDiff = statusWeight(b.overallStatus) - statusWeight(a.overallStatus);
    if (sDiff !== 0) return sDiff;
    if (b.suitabilityScore !== a.suitabilityScore) return b.suitabilityScore - a.suitabilityScore;
    return b.specificStrength - a.specificStrength;
  });
}

/**
 * Generate transparent mechanical engineering insight explaining stiffness vs. strength,
 * modulus constancy across steel grades, and geometry scaling laws.
 */
export function generateStiffnessStrengthInsight(
  current: Material,
  candidate: Material
): string {
  const isCurrentSteel = current.category.includes('Steel');
  const isCandidateSteel = candidate.category.includes('Steel');
  const isCandidateAluminum = candidate.category.includes('Aluminum');
  const isCandidateTitanium = candidate.category.includes('Titanium');

  if (current.id === candidate.id) {
    return `Active alloy ${current.name} (${current.designation || 'standard'}). Bending stiffness is governed by E = ${current.elasticModulus} GPa (I ∝ d⁴) and torsional stiffness by G = ${getShearModulusGPa(current).toFixed(1)} GPa (J ∝ d⁴).`;
  }

  // Steel to Steel comparison (Fundamental Mechanical Engineering Insight)
  if (isCurrentSteel && isCandidateSteel) {
    const yieldRatio = candidate.yieldStrength / current.yieldStrength;
    const yieldChange = ((yieldRatio - 1) * 100).toFixed(0);
    const sign = Number(yieldChange) >= 0 ? '+' : '';

    return `Stiffness Constancy Law: Both ${current.name} and ${candidate.name} share virtually identical Young's Modulus (E ≈ 205 GPa) and Shear Modulus (G ≈ 79.5 GPa). Upgrading changes yield strength by ${sign}${yieldChange}%, but produces ZERO change in shaft deflection or torsional twist. To reduce deflection, shaft diameter d must be increased (I ∝ d⁴).`;
  }

  // Steel to Aluminum comparison
  if (isCurrentSteel && isCandidateAluminum) {
    const weightSavings = (((current.density - candidate.density) / current.density) * 100).toFixed(0);
    const modulusRatio = (current.elasticModulus / candidate.elasticModulus).toFixed(1);
    const diameterMultiplier = Math.pow(Number(modulusRatio), 0.25).toFixed(2);

    return `Lightweighting Trade-off: ${candidate.name} cuts mass by ~${weightSavings}%, but its modulus (E = ${candidate.elasticModulus} GPa) is ~${modulusRatio}x lower than steel. Under identical geometry, deflection and twist increase by ~${modulusRatio}x. To achieve equivalent stiffness, diameter must increase by ${((Number(diameterMultiplier) - 1) * 100).toFixed(0)}% (${diameterMultiplier}×).`;
  }

  // Steel to Titanium comparison
  if (isCurrentSteel && isCandidateTitanium) {
    const weightSavings = (((current.density - candidate.density) / current.density) * 100).toFixed(0);
    return `Aerospace Efficiency: ${candidate.name} offers exceptional specific strength (${((candidate.yieldStrength * 1000) / candidate.density).toFixed(0)} kN·m/kg) and cuts mass by ~${weightSavings}%. However, with E = ${candidate.elasticModulus} GPa (vs ${current.elasticModulus} GPa), flexural deflection will be ~1.8x higher unless section geometry is stiffened.`;
  }

  // General alloy comparison
  const eRatio = (candidate.elasticModulus / current.elasticModulus).toFixed(2);
  const massRatio = (candidate.density / current.density).toFixed(2);
  return `Comparing ${candidate.name} against ${current.name}: Elastic modulus ratio is ${eRatio}×, density ratio is ${massRatio}×, and yield strength is ${candidate.yieldStrength} MPa (vs ${current.yieldStrength} MPa).`;
}
