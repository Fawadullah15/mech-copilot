import type {
  InterferenceFitInput,
  InterferenceFitResult
} from './types';

/**
 * Calculates cylindrical interference fit elasticity, contact pressure bounds,
 * shaft/hub stresses, and torque/axial friction transmission capacity
 * conforming to DIN 7190-1:2017-02 and Lamé thick-walled cylinder theory.
 */
export function calculateInterferenceFit(input: InterferenceFitInput): InterferenceFitResult {
  const {
    shaftNominalDiameter,
    hubOuterDiameter,
    shaftInnerDiameter = 0,
    fitLength,
    shaftMaxDiameter,
    shaftMinDiameter,
    hubMaxBore,
    hubMinBore,
    frictionCoefficient,
    frictionSource = 'DIN 7190-1: Steel/steel unlubricated press fit (μ = 0.14)',
    transmittedTorque,
    axialForce = 0,
    simultaneousLoading = false,
    shaftMaterial,
    hubMaterial,
    surfaceSmoothingCorrectionUm = 0
  } = input;

  const warnings: string[] = [];

  // Validations
  if (!Number.isFinite(shaftNominalDiameter) || shaftNominalDiameter <= 0) {
    throw new Error(`Shaft nominal diameter must be positive, received: ${shaftNominalDiameter}`);
  }
  if (!Number.isFinite(hubOuterDiameter) || hubOuterDiameter <= shaftNominalDiameter) {
    throw new Error(
      `Hub outer diameter Do (${hubOuterDiameter} mm) must be strictly greater than nominal fit diameter d (${shaftNominalDiameter} mm).`
    );
  }
  if (!Number.isFinite(shaftInnerDiameter) || shaftInnerDiameter < 0 || shaftInnerDiameter >= shaftNominalDiameter) {
    throw new Error(
      `Shaft inner diameter di (${shaftInnerDiameter} mm) must be non-negative and less than outer diameter d (${shaftNominalDiameter} mm).`
    );
  }
  if (!Number.isFinite(fitLength) || fitLength <= 0) {
    throw new Error(`Fit contact length L must be positive, received: ${fitLength}`);
  }
  if (!Number.isFinite(frictionCoefficient) || frictionCoefficient <= 0) {
    throw new Error(`Friction coefficient must be positive, received: ${frictionCoefficient}`);
  }

  // Material properties validation
  const EsGPa = shaftMaterial.elasticModulus;
  const EhGPa = hubMaterial.elasticModulus;
  const nus = shaftMaterial.poissonsRatio;
  const nuh = hubMaterial.poissonsRatio;
  const SysMpa = shaftMaterial.yieldStrength;
  const SyhMpa = hubMaterial.yieldStrength;

  if (EsGPa <= 0 || EhGPa <= 0) {
    throw new Error('Elastic moduli of shaft and hub materials must be positive numbers.');
  }
  if (nus <= 0 || nus >= 0.5 || nuh <= 0 || nuh >= 0.5) {
    throw new Error('Poisson ratios of shaft and hub materials must be between 0 and 0.5.');
  }
  if (SysMpa <= 0 || SyhMpa <= 0) {
    throw new Error('Yield strengths of shaft and hub materials must be positive.');
  }

  // Dimensional interference bounds (raw, in mm and converted to μm)
  const d = shaftNominalDiameter;
  const deltaMaxMm = shaftMaxDiameter - hubMinBore;
  const deltaMinMm = shaftMinDiameter - hubMaxBore;
  const deltaNomMm = (shaftMaxDiameter + shaftMinDiameter) / 2 - (hubMaxBore + hubMinBore) / 2;

  const deltaMaxUm = deltaMaxMm * 1000;
  const deltaMinUm = deltaMinMm * 1000;
  const deltaNomUm = deltaNomMm * 1000;

  // Surface roughness flattening loss G (DIN 7190-1)
  const smoothingLossMm = Math.max(0, surfaceSmoothingCorrectionUm) / 1000;
  const effectiveMaxMm = Math.max(0, deltaMaxMm - smoothingLossMm);
  const effectiveMinMm = deltaMinMm - smoothingLossMm;

  const isTransitionOrClearance = effectiveMinMm <= 0;
  if (isTransitionOrClearance) {
    warnings.push(
      `Tolerance bounds permit clearance (min effective interference: ${(effectiveMinMm * 1000).toFixed(
        1
      )} μm). Worst-case minimum contact pressure and friction torque capacity are 0.`
    );
  }

  // Diameter ratios (Lamé geometry factors)
  const qHub = d / hubOuterDiameter; // 0 < qHub < 1
  const qShaft = shaftInnerDiameter / d; // 0 <= qShaft < 1

  // Elastic compliance calculations (convert E from GPa to MPa: E_MPa = E_GPa * 1000)
  const EsMpa = EsGPa * 1000;
  const EhMpa = EhGPa * 1000;

  // Hub compliance term Ch = (1/Eh) * [ (1 + qHub^2)/(1 - qHub^2) + nu_h ]
  const hubFactor = (1 + qHub * qHub) / (1 - qHub * qHub);
  const Ch = (hubFactor + nuh) / EhMpa;

  // Shaft compliance term Cs:
  // For solid shaft (qShaft = 0): Cs = (1 - nu_s) / Es
  // For hollow shaft: Cs = (1/Es) * [ (1 + qShaft^2)/(1 - qShaft^2) - nu_s ]
  const shaftFactor = qShaft > 0 ? (1 + qShaft * qShaft) / (1 - qShaft * qShaft) : 1.0;
  const Cs = (shaftFactor - nus) / EsMpa;

  // Total elastic compliance constant: K = d * (Ch + Cs)  [mm/MPa]
  const K_elastic = d * (Ch + Cs);

  // Contact pressure bounds: p = delta / K_elastic  [MPa]
  const pMinMpa = effectiveMinMm > 0 ? effectiveMinMm / K_elastic : 0;
  const pMaxMpa = effectiveMaxMm > 0 ? effectiveMaxMm / K_elastic : 0;
  const pNomMpa = (pMinMpa + pMaxMpa) / 2;

  // Stresses in Hub at inner bore (r = d/2) under pMax (Lamé thick-cylinder equations)
  // Hoop tensile stress: sigma_t = + pMax * (1 + qHub^2)/(1 - qHub^2)
  const hubHoopStressMaxMpa = pMaxMpa * hubFactor;
  // Radial compressive stress: sigma_r = - pMax
  const hubRadialStressMaxMpa = -pMaxMpa;
  // Von Mises equivalent stress: sqrt(sigma_t^2 - sigma_t*sigma_r + sigma_r^2) = sqrt(sigma_t^2 + sigma_t*p + p^2)
  const hubVonMisesMaxMpa = Math.sqrt(
    hubHoopStressMaxMpa * hubHoopStressMaxMpa +
      hubHoopStressMaxMpa * pMaxMpa +
      pMaxMpa * pMaxMpa
  );
  const hubYieldSafetyFactor = hubVonMisesMaxMpa > 0 ? SyhMpa / hubVonMisesMaxMpa : Infinity;

  // Stresses in Shaft under pMax
  // For solid shaft: sigma_t = sigma_r = -pMax => Von Mises = pMax
  // For hollow shaft: sigma_t_inner = - 2*pMax / (1 - qShaft^2) => Von Mises = 2*pMax / (1 - qShaft^2)
  const shaftVonMisesMaxMpa = qShaft > 0 ? (2 * pMaxMpa) / (1 - qShaft * qShaft) : pMaxMpa;
  const shaftYieldSafetyFactor = shaftVonMisesMaxMpa > 0 ? SysMpa / shaftVonMisesMaxMpa : Infinity;

  if (hubYieldSafetyFactor < 1.0) {
    warnings.push(
      `Hub inner bore yields under maximum interference: Von Mises stress (${hubVonMisesMaxMpa.toFixed(
        1
      )} MPa) exceeds hub yield strength (${SyhMpa} MPa). Plastic dilation will reduce residual retention.`
    );
  }
  if (shaftYieldSafetyFactor < 1.0) {
    warnings.push(
      `Shaft yields under maximum contact pressure: Von Mises stress (${shaftVonMisesMaxMpa.toFixed(
        1
      )} MPa) exceeds shaft yield strength (${SysMpa} MPa).`
    );
  }

  // Frictional Transmission Capacity
  // Normal interface area: A = pi * d * L (mm²)
  // Normal force: Fn = p * pi * d * L (N)
  // Max available friction force: F_frict = mu * Fn
  const contactAreaMm2 = Math.PI * d * fitLength;
  const minFrictionForceN = frictionCoefficient * pMinMpa * contactAreaMm2;
  const maxFrictionForceN = frictionCoefficient * pMaxMpa * contactAreaMm2;

  // Axial retention capacity: F_axial_cap = F_frict
  const minAxialCapacityN = minFrictionForceN;
  const maxAxialCapacityN = maxFrictionForceN;

  // Torque capacity: Tcap = F_frict * (d / 2)  [N·mm] -> convert to N·m
  const minTorqueCapacityNm = (minFrictionForceN * (d / 2)) / 1000;
  const maxTorqueCapacityNm = (maxFrictionForceN * (d / 2)) / 1000;

  // Demands & Margins
  const appliedTorqueNm = Math.abs(transmittedTorque);
  const appliedAxialN = Math.abs(axialForce);

  const torqueMargin = appliedTorqueNm > 0 ? minTorqueCapacityNm / appliedTorqueNm : Infinity;
  const axialMargin = appliedAxialN > 0 ? minAxialCapacityN / appliedAxialN : Infinity;

  // Combined Loading Check
  let combinedTractionN: number | undefined;
  let combinedMargin: number | undefined;

  if (simultaneousLoading && (appliedTorqueNm > 0 || appliedAxialN > 0)) {
    // Tangential force Ft = (2 * T / d)
    const appliedFtN = (2 * (appliedTorqueNm * 1000)) / d;
    combinedTractionN = Math.sqrt(appliedFtN * appliedFtN + appliedAxialN * appliedAxialN);
    combinedMargin = combinedTractionN > 0 ? minFrictionForceN / combinedTractionN : Infinity;

    if (combinedMargin < 1.0) {
      warnings.push(
        `Combined friction traction (${combinedTractionN.toFixed(1)} N) exceeds available minimum interface friction (${minFrictionForceN.toFixed(
          1
        )} N). Fit will slip under simultaneous torque and axial thrust.`
      );
    }
  }

  // Status determination
  let status: 'safe' | 'caution' | 'fail' | 'clearance_risk' = 'safe';
  let statusMessage = '';

  if (effectiveMinMm <= 0) {
    status = 'clearance_risk';
    statusMessage = 'Clearance risk: Tolerance range allows line-to-line or clearance fit. Guaranteed frictional capacity is zero.';
  } else if (hubYieldSafetyFactor < 1.0 || shaftYieldSafetyFactor < 1.0) {
    status = 'fail';
    statusMessage = `Stress failure: Component yielding under maximum interference (Hub s_yield = ${hubYieldSafetyFactor.toFixed(
      2
    )}, Shaft s_yield = ${shaftYieldSafetyFactor.toFixed(2)}).`;
  } else if (torqueMargin < 1.0 || axialMargin < 1.0 || (simultaneousLoading && (combinedMargin ?? 1.0) < 1.0)) {
    status = 'fail';
    statusMessage = `Capacity failure: Applied loads exceed guaranteed minimum friction capacity (Torque margin = ${torqueMargin.toFixed(
      2
    )}, Axial margin = ${axialMargin.toFixed(2)}).`;
  } else if (torqueMargin < 1.5 || hubYieldSafetyFactor < 1.25) {
    status = 'caution';
    statusMessage = `Marginal fit: Torque safety margin (${torqueMargin.toFixed(
      2
    )}) or hub yield margin (${hubYieldSafetyFactor.toFixed(2)}) is low.`;
  } else {
    status = 'safe';
    statusMessage = `Interference fit approved: Guaranteed torque capacity (${minTorqueCapacityNm.toFixed(
      1
    )} N·m) satisfies demand with margin n = ${torqueMargin.toFixed(2)}, and hub remains elastic (s_yield = ${hubYieldSafetyFactor.toFixed(2)}).`;
  }

  const assumptions = [
    'Axisymmetric elastic thick-walled cylinder theory (Lamé relations) under uniform radial pressure.',
    'Isotropic linear-elastic material behavior up to the proportional yield limit.',
    'Uniform Coulomb friction distribution across full contact length without local stick-slip transitions.',
    'Neglects end notch stress peaks (Saint-Venant edge stress concentrations at hub faces).'
  ];

  const limitations = [
    'Does not model plastic interference / autofrettage; hub must remain within elastic yield limit.',
    'Surface smoothing loss G must be evaluated if ground or turned surfaces have high peak-to-valley roughness Rz.',
    'Centrifugal relief at high rotational speeds is neglected; reduce pressure for high peripheral velocities (v > 50 m/s).'
  ];

  return {
    shaftNominalDiameter,
    hubOuterDiameter,
    shaftInnerDiameter,
    fitLength,
    frictionCoefficient,
    frictionSource,
    diametralInterference: {
      minUm: Number(deltaMinUm.toFixed(1)),
      maxUm: Number(deltaMaxUm.toFixed(1)),
      nominalUm: Number(deltaNomUm.toFixed(1)),
      effectiveMinUm: Number((effectiveMinMm * 1000).toFixed(1)),
      effectiveMaxUm: Number((effectiveMaxMm * 1000).toFixed(1)),
      isTransitionOrClearance
    },
    contactPressure: {
      minMpa: Number(pMinMpa.toFixed(2)),
      maxMpa: Number(pMaxMpa.toFixed(2)),
      nominalMpa: Number(pNomMpa.toFixed(2))
    },
    stresses: {
      hubHoopStressMaxMpa: Number(hubHoopStressMaxMpa.toFixed(1)),
      hubRadialStressMaxMpa: Number(hubRadialStressMaxMpa.toFixed(1)),
      hubVonMisesMaxMpa: Number(hubVonMisesMaxMpa.toFixed(1)),
      hubYieldSafetyFactor: Number(hubYieldSafetyFactor.toFixed(2)),
      shaftVonMisesMaxMpa: Number(shaftVonMisesMaxMpa.toFixed(1)),
      shaftYieldSafetyFactor: Number(shaftYieldSafetyFactor.toFixed(2)),
      hubYieldStrengthMpa: SyhMpa,
      shaftYieldStrengthMpa: SysMpa
    },
    capacity: {
      minTorqueCapacityNm: Number(minTorqueCapacityNm.toFixed(1)),
      maxTorqueCapacityNm: Number(maxTorqueCapacityNm.toFixed(1)),
      minAxialCapacityN: Number(minAxialCapacityN.toFixed(1)),
      maxAxialCapacityN: Number(maxAxialCapacityN.toFixed(1)),
      torqueMargin: Number(torqueMargin.toFixed(2)),
      axialMargin: Number(axialMargin.toFixed(2)),
      combinedTractionN: combinedTractionN ? Number(combinedTractionN.toFixed(1)) : undefined,
      combinedMargin: combinedMargin ? Number(combinedMargin.toFixed(2)) : undefined
    },
    status,
    statusMessage,
    warnings,
    assumptions,
    limitations,
    standardReference: 'DIN 7190-1:2017-02'
  };
}
