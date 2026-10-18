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
  calculateFullShaftAnalysis
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
});
