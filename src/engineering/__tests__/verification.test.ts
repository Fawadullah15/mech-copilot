import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  calculateShaftTorsion,
  calculateShaftBending,
  calculateCombinedStress,
  calculateShaftDeflection,
  calculatePowerTransmission,
  calculateFactorOfSafety,
  generateCalculationExplanation,
  getNearestStandardDiameter,
  calculateFullShaftAnalysis,
  solveMinimumShaftDiameterCombined,
  validateShaftInputs
} from '../index';
import type { DesignParameters, Material } from '../../types';

describe('Stage 03 Independent Formula Verification & Benchmark Cases', () => {
  // Benchmark conditions:
  // d = 45 mm, L = 320 mm, T = 500 N*m, F = 12000 N, RPM = 1450, AISI 4140 (Sy = 655 MPa, E = 205 GPa)
  const BENCHMARK_PARAMS: DesignParameters = {
    materialId: 'aisi-4140',
    diameter: 45,
    length: 320,
    torque: 500,
    force: 12000,
    rpm: 1450,
    safetyFactor: 2.0,
    temperature: 60
  };

  const BENCHMARK_MATERIAL: Material = {
    id: 'aisi-4140',
    name: 'AISI 4140 Alloy Steel',
    category: 'Alloy Steel',
    yieldStrength: 655,
    tensileStrength: 1020,
    density: 7850,
    elasticModulus: 205,
    poissonsRatio: 0.29,
    thermalExpansion: 12.3,
    costCategory: 'Medium',
    description: 'High strength chromium-molybdenum alloy steel.'
  };

  test('Benchmark A: Solid circular shaft pure torsion formula & units', () => {
    // J = pi * d^4 / 32
    // tau = 16 * T / (pi * d^3)
    const res = calculateShaftTorsion({
      torque: { value: 500, unit: 'N·m' },
      diameter: { value: 45, unit: 'mm' },
      yieldStrength: { value: 655, unit: 'MPa' },
      targetSafetyFactor: 2.0
    });

    assert.strictEqual(res.status, 'pass');
    // Analytical value: 16 * 500 / (pi * 0.045^3) = 27,944,905 Pa = 27.94 MPa
    const tau = res.result.shearStressMPa;
    assert.ok(Math.abs(tau - 27.94) < 0.05, `Expected ~27.94 MPa, got ${tau}`);

    // Minimum diameter for allowable shear: tau_allow = 655 / (2 * 2) = 163.75 MPa
    // d_min = [16 * 500 / (pi * 163.75e6)]^(1/3) * 1000 = 24.96 mm
    const dMin = res.result.minRequiredDiameterMm!;
    assert.ok(Math.abs(dMin - 24.96) < 0.05, `Expected ~24.96 mm, got ${dMin}`);
  });

  test('Benchmark B: Solid circular shaft simply supported bending moment & normal stress', () => {
    // M = F * L / 4 = 12000 * 0.32 / 4 = 960 N*m
    // sigma_b = 32 * M / (pi * d^3) = 32 * 960 / (pi * 0.045^3) = 107.31 MPa
    const res = calculateShaftBending({
      force: { value: 12000, unit: 'N' },
      length: { value: 320, unit: 'mm' },
      diameter: { value: 45, unit: 'mm' },
      allowableYieldStrength: { value: 655, unit: 'MPa' }
    });

    assert.strictEqual(res.result.bendingMomentNm, 960);
    const sigmaB = res.result.bendingStressMPa;
    assert.ok(Math.abs(sigmaB - 107.31) < 0.05, `Expected ~107.31 MPa, got ${sigmaB}`);
  });

  test('Benchmark C: Combined Multiaxial Stress (Von Mises vs Tresca)', () => {
    // sigma_b = 107.308 MPa, tau = 27.945 MPa
    // Von Mises: sqrt(sigma_b^2 + 3 * tau^2) = sqrt(11515.01 + 2342.76) = 117.72 MPa
    const vm = calculateCombinedStress({
      bendingStressMPa: 107.308,
      shearStressMPa: 27.945,
      yieldStrengthMPa: 655,
      criterion: 'Von Mises',
      targetSafetyFactor: 2.0
    });

    assert.ok(Math.abs(vm.result.equivalentStressMPa - 117.72) < 0.05, `Expected ~117.72 MPa, got ${vm.result.equivalentStressMPa}`);
    assert.ok(Math.abs(vm.result.factorOfSafety - 5.56) < 0.05, `Expected FoS ~5.56, got ${vm.result.factorOfSafety}`);

    // Tresca: sqrt(sigma_b^2 + 4 * tau^2) = sqrt(11515.01 + 3123.68) = 120.99 MPa
    const tresca = calculateCombinedStress({
      bendingStressMPa: 107.308,
      shearStressMPa: 27.945,
      yieldStrengthMPa: 655,
      criterion: 'Tresca',
      targetSafetyFactor: 2.0
    });

    assert.ok(Math.abs(tresca.result.equivalentStressMPa - 120.99) < 0.05, `Expected ~120.99 MPa, got ${tresca.result.equivalentStressMPa}`);
    assert.ok(Math.abs(tresca.result.factorOfSafety - 5.41) < 0.05, `Expected FoS ~5.41, got ${tresca.result.factorOfSafety}`);

    // Tresca is conservative relative to Von Mises:
    assert.ok(tresca.result.equivalentStressMPa >= vm.result.equivalentStressMPa, 'Tresca equivalent stress must be >= Von Mises');
    assert.ok(tresca.result.factorOfSafety <= vm.result.factorOfSafety, 'Tresca FoS must be <= Von Mises FoS');
  });

  test('Benchmark D: Beam midspan deflection and support slope', () => {
    // delta_max = F * L^3 / (48 * E * I)
    // I = pi * 0.045^4 / 64 = 2.01289e-7 m^4
    // 48 * E * I = 48 * 205e9 * 2.01289e-7 = 1,980,684 N*m^2
    // F * L^3 = 12000 * 0.32^3 = 393.216 N*m^3
    // delta_max = 393.216 / 1,980,684 = 0.0001985 m = 0.1985 mm
    // theta = F * L^2 / (16 * E * I) = 12000 * 0.32^2 / 660,228 = 0.00186 rad
    const res = calculateShaftDeflection({
      force: { value: 12000, unit: 'N' },
      length: { value: 320, unit: 'mm' },
      diameter: { value: 45, unit: 'mm' },
      elasticModulus: { value: 205, unit: 'GPa' }
    });

    assert.ok(Math.abs(res.result.maxDeflectionMm - 0.1985) < 0.001, `Expected ~0.1985 mm, got ${res.result.maxDeflectionMm}`);
    assert.ok(Math.abs(res.result.slopeAtSupportsRad - 0.00186) < 0.0001, `Expected ~0.00186 rad, got ${res.result.slopeAtSupportsRad}`);
  });

  test('Benchmark E: Power transmission, angular velocity, and horsepower conversion', () => {
    // omega = 2 * pi * 1450 / 60 = 151.8436 rad/s
    // P = 500 * 151.8436 = 75,921.8 W = 75.92 kW
    // hp = 75,921.8 / 745.69987 = 101.81 hp
    const res = calculatePowerTransmission({
      torque: { value: 500, unit: 'N·m' },
      rpm: 1450
    });

    assert.ok(Math.abs(res.result.angularVelocityRadS - 151.84) < 0.05);
    assert.ok(Math.abs(res.result.powerKW - 75.92) < 0.05);
    assert.ok(Math.abs(res.result.powerHp - 101.81) < 0.1);
  });

  test('Benchmark F: Factor of safety deliberately handles zero, negative, and infinite stress', () => {
    // Normal case
    const normal = calculateFactorOfSafety({
      strengthMPa: 655,
      appliedStressMPa: 131,
      targetSafetyFactor: 2.0
    });
    assert.strictEqual(normal.result.factorOfSafety, 5.0);
    assert.strictEqual(normal.status, 'pass');

    // Zero applied stress (should return safe finite representation 999 without NaN or crash)
    const zeroStress = calculateFactorOfSafety({
      strengthMPa: 655,
      appliedStressMPa: 0,
      targetSafetyFactor: 2.0
    });
    assert.ok(isFinite(zeroStress.result.factorOfSafety), 'Zero stress must produce finite FoS');
    assert.strictEqual(zeroStress.result.factorOfSafety, 999);
    assert.strictEqual(zeroStress.status, 'pass');

    // Zero strength or negative stress handled gracefully in combined stress
    const invalidCombined = calculateCombinedStress({
      bendingStressMPa: 100,
      shearStressMPa: 50,
      yieldStrengthMPa: 0,
      targetSafetyFactor: 2.0
    });
    assert.strictEqual(invalidCombined.status, 'fail');
    assert.ok(invalidCombined.warnings.length > 0);
  });

  test('Benchmark G: Deterministic explanation generator dynamically reflects active parameters', () => {
    // Run with 500 Nm, 45 mm, AISI 4140
    const exp1 = generateCalculationExplanation(BENCHMARK_PARAMS, BENCHMARK_MATERIAL);
    assert.ok(exp1.content.includes('$T = 500\\text{ N}\\cdot\\text{m}$'));
    assert.ok(exp1.content.includes('$d = 45\\text{ mm}$'));
    assert.ok(exp1.content.includes('AISI 4140 Alloy Steel'));

    // Change parameters to 800 Nm, 60 mm, Aluminum 6061-T6
    const AL_MATERIAL: Material = {
      ...BENCHMARK_MATERIAL,
      id: 'al-6061',
      name: 'Aluminum 6061-T6',
      yieldStrength: 276
    };
    const MODIFIED_PARAMS: DesignParameters = {
      ...BENCHMARK_PARAMS,
      diameter: 60,
      torque: 800
    };

    const exp2 = generateCalculationExplanation(MODIFIED_PARAMS, AL_MATERIAL);
    assert.ok(exp2.content.includes('$T = 800\\text{ N}\\cdot\\text{m}$'), 'Must reflect 800 Nm dynamically');
    assert.ok(exp2.content.includes('$d = 60\\text{ mm}$'), 'Must reflect 60 mm dynamically');
    assert.ok(exp2.content.includes('Aluminum 6061-T6'), 'Must reflect Aluminum dynamically');
    assert.ok(exp2.content.includes('276'), 'Must reflect 276 MPa yield dynamically');

    // Ensure recommendations reflect standard metric sizes
    assert.strictEqual(getNearestStandardDiameter(42.3), 45);
    assert.strictEqual(getNearestStandardDiameter(48.1), 50);
  });

  test('Benchmark H: Bounded Bisection Combined Minimum Diameter Sizing (Von Mises vs Tresca)', () => {
    // Inputs: T = 500 N*m, F = 12000 N, L = 320 mm -> M = 960 N*m
    // Sy = 655 MPa, n_target = 2.0
    // Analytical Von Mises:
    // d_vm = [ (32 * n / (pi * Sy)) * sqrt(M^2 + 0.75 * T^2) ]^(1/3)
    // sqrt(960^2 + 0.75 * 500^2) = sqrt(921600 + 187500) = 1053.138 N*m
    // d_vm = [ (64 / (pi * 655e6)) * 1053.138 ]^(1/3) = [ 3.27547e-5 ]^(1/3) = 0.031995 m = 32.00 mm
    const solVM = solveMinimumShaftDiameterCombined({
      torqueNm: 500,
      radialForceN: 12000,
      lengthMm: 320,
      yieldStrengthMPa: 655,
      targetSafetyFactor: 2.0,
      criterion: 'Von Mises'
    });

    assert.ok(
      Math.abs(solVM.combinedStressDiameterMm - 32.00) < 0.05,
      `Expected Von Mises d_min ~32.00 mm, got ${solVM.combinedStressDiameterMm}`
    );
    assert.ok(solVM.bisectionIterations < 50, 'Bisection should converge in under 50 iterations');

    // Analytical Tresca:
    // d_tr = [ (32 * n / (pi * Sy)) * sqrt(M^2 + T^2) ]^(1/3)
    // sqrt(960^2 + 500^2) = sqrt(921600 + 250000) = 1082.4047 N*m
    // d_tr = [ (64 / (pi * 655e6)) * 1082.4047 ]^(1/3) = [ 3.36649e-5 ]^(1/3) = 0.032289 m = 32.29 mm
    const solTresca = solveMinimumShaftDiameterCombined({
      torqueNm: 500,
      radialForceN: 12000,
      lengthMm: 320,
      yieldStrengthMPa: 655,
      targetSafetyFactor: 2.0,
      criterion: 'Tresca'
    });

    assert.ok(
      Math.abs(solTresca.combinedStressDiameterMm - 32.29) < 0.05,
      `Expected Tresca d_min ~32.29 mm, got ${solTresca.combinedStressDiameterMm}`
    );

    // Tresca diameter must be greater than or equal to Von Mises diameter:
    assert.ok(
      solTresca.combinedStressDiameterMm >= solVM.combinedStressDiameterMm,
      'Tresca sizing must be more conservative than Von Mises'
    );
  });

  test('Benchmark I: Numerical Sensitivity & Target FoS Threshold at Calculated Root', () => {
    // Solved Von Mises root for T=500 Nm, M=960 Nm, Sy=655 MPa, n=2.0 is d ~ 32.00 mm
    const solVM = solveMinimumShaftDiameterCombined({
      torqueNm: 500,
      radialForceN: 12000,
      lengthMm: 320,
      yieldStrengthMPa: 655,
      targetSafetyFactor: 2.0,
      criterion: 'Von Mises'
    });
    const dMin = solVM.combinedStressDiameterMm;

    // Evaluate at dMin:
    const atRoot = calculateFullShaftAnalysis({
      torqueNm: 500,
      radialForceN: 12000,
      lengthMm: 320,
      diameterMm: dMin,
      rpm: 1450,
      yieldStrengthMPa: 655,
      tensileStrengthMPa: 1020,
      elasticModulusGPa: 205,
      targetSafetyFactor: 2.0,
      operatingTempC: 60,
      criterion: 'Von Mises'
    });
    // FoS at root should equal 2.00 within 0.005:
    assert.ok(
      Math.abs(atRoot.combinedStress.result.factorOfSafety - 2.00) < 0.005,
      `FoS at exact root must be ~2.00, got ${atRoot.combinedStress.result.factorOfSafety}`
    );

    // Evaluate slightly below dMin (-0.2 mm): must fail target safety factor
    const belowRoot = calculateFullShaftAnalysis({
      torqueNm: 500,
      radialForceN: 12000,
      lengthMm: 320,
      diameterMm: dMin - 0.2,
      rpm: 1450,
      yieldStrengthMPa: 655,
      tensileStrengthMPa: 1020,
      elasticModulusGPa: 205,
      targetSafetyFactor: 2.0,
      operatingTempC: 60,
      criterion: 'Von Mises'
    });
    assert.ok(
      belowRoot.combinedStress.result.factorOfSafety < 2.00,
      `Diameter ${dMin - 0.2} mm must produce FoS < 2.00 (got ${belowRoot.combinedStress.result.factorOfSafety})`
    );

    // Evaluate slightly above dMin (+0.2 mm): must pass target safety factor
    const aboveRoot = calculateFullShaftAnalysis({
      torqueNm: 500,
      radialForceN: 12000,
      lengthMm: 320,
      diameterMm: dMin + 0.2,
      rpm: 1450,
      yieldStrengthMPa: 655,
      tensileStrengthMPa: 1020,
      elasticModulusGPa: 205,
      targetSafetyFactor: 2.0,
      operatingTempC: 60,
      criterion: 'Von Mises'
    });
    assert.ok(
      aboveRoot.combinedStress.result.factorOfSafety > 2.00,
      `Diameter ${dMin + 0.2} mm must produce FoS > 2.00 (got ${aboveRoot.combinedStress.result.factorOfSafety})`
    );
  });

  test('Benchmark J: Critical Defect Prevention: Pure Torsion Sizing under Combined Load Fails', () => {
    // Pure torsion requires d_min = 24.96 mm for T=500 Nm, Sy=655 MPa, n=2.0
    // If an engineer mistakenly uses pure torsion diameter under combined loading (M = 960 Nm):
    const combinedWithTorsionDiameter = calculateFullShaftAnalysis({
      torqueNm: 500,
      radialForceN: 12000,
      lengthMm: 320,
      diameterMm: 24.96,
      rpm: 1450,
      yieldStrengthMPa: 655,
      tensileStrengthMPa: 1020,
      elasticModulusGPa: 205,
      targetSafetyFactor: 2.0,
      operatingTempC: 60,
      criterion: 'Von Mises'
    });

    // Bending stress on 24.96 mm shaft: 32 * 960 / (pi * 0.02496^3) = 627.9 MPa!
    // Equivalent stress: ~633 MPa -> FoS = 655 / 633 = 1.03x (far below required 2.0x, nearly yields!)
    assert.ok(
      combinedWithTorsionDiameter.combinedStress.result.factorOfSafety < 2.0,
      'Pure torsion diameter must NOT satisfy combined loading safety factor'
    );
    assert.strictEqual(combinedWithTorsionDiameter.overallStatus, 'fail');
    assert.ok(
      (combinedWithTorsionDiameter.minRequiredDiameterMm || 0) > 24.96,
      `Combined required diameter (${combinedWithTorsionDiameter.minRequiredDiameterMm} mm) must be larger than pure torsion (24.96 mm)`
    );
  });

  test('Benchmark K: Flexural Deflection Stiffness Constraint & Screening Ratios', () => {
    // For F = 12000 N, L = 320 mm, E = 205 GPa:
    // Stiffness-limited diameter for L/1000 (0.32 mm max deflection):
    // d_defl = [ (4000 * F * L^2) / (3 * pi * E) ]^(1/4)
    // 4000 * 12000 * 0.32^2 = 4,915,200
    // 3 * pi * 205e9 = 1.93208e12
    // d_defl = [ 4915200 / 1.93208e12 ]^(1/4) = [ 2.544e-6 ]^(1/4) = 0.03994 m = 39.94 mm
    const solStiffness = solveMinimumShaftDiameterCombined({
      torqueNm: 500,
      radialForceN: 12000,
      lengthMm: 320,
      yieldStrengthMPa: 655,
      targetSafetyFactor: 2.0,
      criterion: 'Von Mises',
      elasticModulusGPa: 205,
      deflectionLimitRatio: 1000
    });

    assert.ok(
      Math.abs(solStiffness.deflectionGovernedDiameterMm! - 39.94) < 0.1,
      `Expected deflection governed diameter ~39.94 mm, got ${solStiffness.deflectionGovernedDiameterMm}`
    );
    // Since 39.94 mm > 32.00 mm (combined stress), stiffness governs overall required diameter!
    assert.strictEqual(solStiffness.governingConstraint, 'deflection_stiffness');
    assert.ok(
      Math.abs(solStiffness.requiredDiameterMm - 39.94) < 0.1,
      `Overall required diameter must be ~39.94 mm, got ${solStiffness.requiredDiameterMm}`
    );

    // If deflection limit ratio is relaxed to L/500 (allowable 0.64 mm):
    // d_defl = [ (2000 * 12000 * 0.32^2) / (3 * pi * 205e9) ]^(1/4) = 33.59 mm
    const solRelaxed = solveMinimumShaftDiameterCombined({
      torqueNm: 500,
      radialForceN: 12000,
      lengthMm: 320,
      yieldStrengthMPa: 655,
      targetSafetyFactor: 2.0,
      criterion: 'Von Mises',
      elasticModulusGPa: 205,
      deflectionLimitRatio: 500
    });
    assert.ok(
      Math.abs(solRelaxed.deflectionGovernedDiameterMm! - 33.59) < 0.1,
      `Expected relaxed deflection diameter ~33.59 mm, got ${solRelaxed.deflectionGovernedDiameterMm}`
    );
  });

  test('Benchmark L: Material Inversion & Parametric Responsiveness', () => {
    // Sizing under identical loads (T=500, F=12000, L=320, n=2.0) across 3 materials:
    // 1. AISI 4140: Sy = 655 MPa -> d_vm ~ 32.00 mm
    // 2. AISI 1045: Sy = 310 MPa -> d_vm = 32.00 * (655 / 310)^(1/3) = 41.04 mm
    // 3. Structural Steel A36: Sy = 250 MPa -> d_vm = 32.00 * (655 / 250)^(1/3) = 44.13 mm
    const sol4140 = solveMinimumShaftDiameterCombined({
      torqueNm: 500,
      radialForceN: 12000,
      lengthMm: 320,
      yieldStrengthMPa: 655,
      targetSafetyFactor: 2.0,
      criterion: 'Von Mises'
    });

    const sol1045 = solveMinimumShaftDiameterCombined({
      torqueNm: 500,
      radialForceN: 12000,
      lengthMm: 320,
      yieldStrengthMPa: 310,
      targetSafetyFactor: 2.0,
      criterion: 'Von Mises'
    });

    const solA36 = solveMinimumShaftDiameterCombined({
      torqueNm: 500,
      radialForceN: 12000,
      lengthMm: 320,
      yieldStrengthMPa: 250,
      targetSafetyFactor: 2.0,
      criterion: 'Von Mises'
    });

    assert.ok(Math.abs(sol4140.combinedStressDiameterMm - 32.00) < 0.05);
    assert.ok(Math.abs(sol1045.combinedStressDiameterMm - 41.04) < 0.1);
    assert.ok(Math.abs(solA36.combinedStressDiameterMm - 44.13) < 0.1);

    // Monotonicity law: As yield strength decreases, required diameter must strictly increase
    assert.ok(
      solA36.combinedStressDiameterMm > sol1045.combinedStressDiameterMm &&
      sol1045.combinedStressDiameterMm > sol4140.combinedStressDiameterMm,
      'Lower yield strength must demand larger diameter'
    );
  });

  test('Benchmark M: Strict Input Validation & Out-of-Bounds Rejection', () => {
    // 1. Negative diameter
    const negDiameter = validateShaftInputs({ diameterMm: -25 });
    assert.strictEqual(negDiameter.isValid, false);
    assert.ok(negDiameter.errors.some(e => e.includes('Diameter must be greater than 0')));

    // 2. Zero length
    const zeroLength = validateShaftInputs({ lengthMm: 0 });
    assert.strictEqual(zeroLength.isValid, false);
    assert.ok(zeroLength.errors.some(e => e.includes('Shaft length must be greater than 0')));

    // 3. Negative torque
    const negTorque = validateShaftInputs({ torqueNm: -100 });
    assert.strictEqual(negTorque.isValid, false);
    assert.ok(negTorque.errors.some(e => e.includes('torque must be a non-negative value')));

    // 4. Zero safety factor
    const zeroFoS = validateShaftInputs({ safetyFactor: 0 });
    assert.strictEqual(zeroFoS.isValid, false);
    assert.ok(zeroFoS.errors.some(e => e.includes('safety factor must be strictly greater than 0')));

    // 5. Valid inputs pass cleanly
    const valid = validateShaftInputs({
      diameterMm: 45,
      lengthMm: 320,
      torqueNm: 500,
      forceN: 12000,
      rpm: 1450,
      safetyFactor: 2.0,
      yieldStrengthMPa: 655,
      elasticModulusGPa: 205
    });
    assert.strictEqual(valid.isValid, true);
    assert.strictEqual(valid.errors.length, 0);
  });

  test('Benchmark N: Composite Shaft Analysis Full Integration and Dynamic Derivation Consistency', () => {
    const full = calculateFullShaftAnalysis({
      torqueNm: 500,
      radialForceN: 12000,
      diameterMm: 45,
      lengthMm: 320,
      rpm: 1450,
      yieldStrengthMPa: 655,
      tensileStrengthMPa: 1020,
      elasticModulusGPa: 205,
      targetSafetyFactor: 2.0,
      operatingTempC: 60,
      criterion: 'Von Mises',
      deflectionLimitRatio: 1000
    });

    // Check overall pass status
    assert.strictEqual(full.overallStatus, 'pass');
    // Check all sub-results populated with verified values
    assert.ok(Math.abs(full.torsion.result.shearStressMPa - 27.94) < 0.05);
    assert.ok(Math.abs(full.bending.result.bendingStressMPa - 107.31) < 0.05);
    assert.ok(Math.abs(full.combinedStress.result.equivalentStressMPa - 117.72) < 0.05);
    assert.ok(Math.abs(full.combinedStress.result.factorOfSafety - 5.56) < 0.05);
    assert.ok(Math.abs(full.deflection.result.maxDeflectionMm - 0.1985) < 0.005);
    assert.ok(Math.abs(full.power.result.powerKW - 75.92) < 0.05);
    assert.ok(Math.abs(full.power.result.powerHp - 101.8) < 0.1);

    // Check minimum required diameter metrics
    assert.ok(full.minRequiredDiameterMm! <= 45, '45 mm shaft must exceed required diameter');
    assert.strictEqual(full.governingConstraint, 'deflection_stiffness');
    assert.ok(full.summary.includes('Von Mises'));
    assert.ok(full.summary.includes('Minimum required diameter: 39.9 mm'));
  });
});
