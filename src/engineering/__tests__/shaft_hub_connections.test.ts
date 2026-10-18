import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  calculateParallelKey,
  getRecommendedKeyDimensions,
  calculateInterferenceFit,
  calculateThermalAssembly,
  STANDARD_DIN_6885_KEYS
} from '../connections';

describe('Stage 09: Shaft–Hub Connections — Parallel Key Tests (DIN 6885-1)', () => {
  const steelKeyMaterial = { name: 'C45E Key Stock', yieldStrength: 450 };
  const shaftMaterial = { name: 'AISI 4140 Q&T', yieldStrength: 655 };
  const hubMaterial = { name: 'Cast Steel GS-52', yieldStrength: 350 };

  test('Benchmark 1: Tangential force from known torque and shaft diameter', () => {
    // Torque T = 400 N·m = 400,000 N·mm, d = 45 mm
    // Ft = 2*T / d = 800,000 / 45 = 17,777.78 N
    const result = calculateParallelKey({
      shaftDiameter: 45,
      keyWidth: 14,
      keyHeight: 9,
      keyLength: 56,
      keyProfile: 'form_a_round_ends',
      torque: 400,
      keyMaterial: steelKeyMaterial,
      shaftMaterial,
      hubMaterial
    });

    assert.strictEqual(result.tangentialForce, 17777.8);
    assert.strictEqual(result.shaftDiameter, 45);
  });

  test('Benchmark 2: Key shear stress with Form A rounded ends effective length (Leff = L - b)', () => {
    // d = 45 mm, b = 14 mm, h = 9 mm, L = 56 mm
    // Form A: Leff = 56 - 14 = 42 mm
    // Shear area As = 14 * 42 = 588 mm²
    // tau_k = 17777.78 / 588 = 30.23 MPa
    const result = calculateParallelKey({
      shaftDiameter: 45,
      keyWidth: 14,
      keyHeight: 9,
      keyLength: 56,
      keyProfile: 'form_a_round_ends',
      torque: 400,
      keyMaterial: steelKeyMaterial,
      shaftMaterial,
      hubMaterial
    });

    assert.strictEqual(result.effectiveLength, 42);
    assert.strictEqual(result.shearArea, 588);
    assert.strictEqual(result.shearStress, 30.23);
  });

  test('Benchmark 3: Flank bearing contact pressure using asymmetric keyway depth', () => {
    // h = 9 mm, t1 = 5.5 mm (shaft), t2 = 3.5 mm (hub)
    // heff = min(5.5, 9 - 5.5) = 3.5 mm
    // Leff = 42 mm
    // Bearing area Ab = 3.5 * 42 = 147 mm²
    // pb = 17777.78 / 147 = 120.94 MPa
    const result = calculateParallelKey({
      shaftDiameter: 45,
      keyWidth: 14,
      keyHeight: 9,
      keyLength: 56,
      shaftKeywayDepth: 5.5,
      keyProfile: 'form_a_round_ends',
      torque: 400,
      keyMaterial: steelKeyMaterial,
      shaftMaterial,
      hubMaterial
    });

    assert.strictEqual(result.effectiveContactHeight, 3.5);
    assert.strictEqual(result.bearingArea, 147);
    assert.strictEqual(result.bearingPressure, 120.94);
  });

  test('Benchmark 4: Allowable limits and connection torque capacity governed by weakest mating material', () => {
    // Key Sy = 450 MPa, Shaft Sy = 655 MPa, Hub Sy = 350 MPa => Hub governs contact
    // Allowable shear (n=1.5): tau_allow = 0.577 * 450 / 1.5 = 173.10 MPa
    // Allowable bearing (n=1.5): p_allow = 0.80 * 350 / 1.5 = 186.67 MPa
    // Torque capacity shear: 173.10 * 588 * 45 / 2000 = 2290.1 N·m
    // Torque capacity bearing: 186.67 * 147 * 45 / 2000 = 617.4 N·m
    // Governing capacity = 617.4 N·m, safety factor n = 617.4 / 400 = 1.54
    const result = calculateParallelKey({
      shaftDiameter: 45,
      keyWidth: 14,
      keyHeight: 9,
      keyLength: 56,
      shaftKeywayDepth: 5.5,
      torque: 400,
      safetyFactor: 1.5,
      keyMaterial: steelKeyMaterial,
      shaftMaterial,
      hubMaterial
    });

    assert.strictEqual(result.governingMaterialForPressure, 'Cast Steel GS-52');
    assert.strictEqual(result.allowableShearStress, 173.1);
    assert.strictEqual(result.allowableBearingPressure, 186.67);
    assert.strictEqual(result.governingMode, 'contact_pressure');
    assert.strictEqual(result.connectionSafetyFactor, 1.54);
    assert.strictEqual(result.status, 'safe');
  });

  test('Benchmark 5: Reversing torque triggers flank de-rating and explicit warning', () => {
    const normal = calculateParallelKey({
      shaftDiameter: 45,
      keyWidth: 14,
      keyHeight: 9,
      keyLength: 56,
      shaftKeywayDepth: 5.5,
      torque: 400,
      isReversingTorque: false,
      keyMaterial: steelKeyMaterial,
      shaftMaterial,
      hubMaterial
    });

    const reversing = calculateParallelKey({
      shaftDiameter: 45,
      keyWidth: 14,
      keyHeight: 9,
      keyLength: 56,
      shaftKeywayDepth: 5.5,
      torque: 400,
      isReversingTorque: true,
      keyMaterial: steelKeyMaterial,
      shaftMaterial,
      hubMaterial
    });

    // 40% reduction in allowable contact pressure
    assert.ok(reversing.allowableBearingPressure < normal.allowableBearingPressure);
    assert.strictEqual(
      Number(reversing.allowableBearingPressure.toFixed(2)),
      Number((normal.allowableBearingPressure * 0.6).toFixed(2))
    );
    assert.ok(reversing.reversingLoadWarning?.includes('Reversing/alternating torque'));
  });

  test('DIN 6885-1 recommended sizing table lookup and fallback estimation', () => {
    const d45 = getRecommendedKeyDimensions(45);
    assert.strictEqual(d45.isProvisional, false);
    assert.strictEqual(d45.dimensions.b, 14);
    assert.strictEqual(d45.dimensions.h, 9);
    assert.strictEqual(d45.dimensions.t1, 5.5);

    const d55 = getRecommendedKeyDimensions(55);
    assert.strictEqual(d55.dimensions.b, 16);
    assert.strictEqual(d55.dimensions.h, 10);

    // Out-of-range fallback
    const d200 = getRecommendedKeyDimensions(200);
    assert.strictEqual(d200.isProvisional, true);
    assert.ok(d200.dimensions.b > 0);
  });

  test('Key input validation rejects zero or unphysical geometry', () => {
    assert.throws(
      () =>
        calculateParallelKey({
          shaftDiameter: -45,
          keyWidth: 14,
          keyHeight: 9,
          keyLength: 56,
          torque: 400,
          keyMaterial: steelKeyMaterial,
          shaftMaterial,
          hubMaterial
        }),
      /Shaft diameter must be a positive finite number/
    );

    assert.throws(
      () =>
        calculateParallelKey({
          shaftDiameter: 45,
          keyWidth: 30, // 30 mm is > 50% of 45 mm
          keyHeight: 9,
          keyLength: 56,
          torque: 400,
          keyMaterial: steelKeyMaterial,
          shaftMaterial,
          hubMaterial
        }),
      /Key width .* is excessively large/
    );
  });
});

describe('Stage 09: Shaft–Hub Connections — Cylindrical Interference Fit Tests (DIN 7190-1)', () => {
  const steelShaft = {
    name: 'AISI 4140 Q&T',
    elasticModulus: 205, // GPa
    poissonsRatio: 0.29,
    yieldStrength: 655, // MPa
    thermalExpansion: 12.2 // 10^-6 / K
  };

  const steelHub = {
    name: 'AISI 1045 Carbon Steel',
    elasticModulus: 205, // GPa
    poissonsRatio: 0.29,
    yieldStrength: 530, // MPa
    thermalExpansion: 11.5 // 10^-6 / K
  };

  test('Benchmark 1: Thick-walled cylinder elastic contact pressure matches analytical Lamé solution', () => {
    // Solid shaft d = 50 mm, Hub Do = 100 mm (q = 0.5), L = 50 mm
    // Es = Eh = 205 GPa, nus = nuh = 0.29
    // q^2 = 0.25 => (1+q^2)/(1-q^2) = 1.25/0.75 = 5/3 = 1.666667
    // Ch = (1.666667 + 0.29) / 205,000 = 1.956667 / 205,000 = 9.544717e-6 MPa^-1
    // Cs = (1 - 0.29) / 205,000 = 0.71 / 205,000 = 3.463415e-6 MPa^-1
    // K = 50 * (9.544717e-6 + 3.463415e-6) = 50 * 1.300813e-5 = 0.0006504066 mm/MPa
    // If delta = 50 um = 0.050 mm:
    // p = 0.050 / 0.0006504066 = 76.875 MPa
    const result = calculateInterferenceFit({
      shaftNominalDiameter: 50,
      hubNominalBore: 50,
      shaftMaxDiameter: 50.050,
      shaftMinDiameter: 50.050,
      hubMaxBore: 50.000,
      hubMinBore: 50.000,
      hubOuterDiameter: 100,
      fitLength: 50,
      frictionCoefficient: 0.15,
      transmittedTorque: 500,
      shaftMaterial: steelShaft,
      hubMaterial: steelHub
    });

    assert.strictEqual(result.contactPressure.minMpa, 76.87);
    assert.strictEqual(result.contactPressure.maxMpa, 76.87);
  });

  test('Benchmark 2: Hub inner bore stresses under p = 76.88 MPa', () => {
    // sigma_t = p * (1+q^2)/(1-q^2) = 76.875 * 5/3 = 128.125 MPa
    // sigma_r = -p = -76.875 MPa
    // Von Mises = sqrt(128.125^2 + 128.125*76.875 + 76.875^2) = 179.38 MPa
    // Hub Sy = 530 MPa => s_yield = 530 / 179.38 = 2.95
    const result = calculateInterferenceFit({
      shaftNominalDiameter: 50,
      hubNominalBore: 50,
      shaftMaxDiameter: 50.050,
      shaftMinDiameter: 50.050,
      hubMaxBore: 50.000,
      hubMinBore: 50.000,
      hubOuterDiameter: 100,
      fitLength: 50,
      frictionCoefficient: 0.15,
      transmittedTorque: 500,
      shaftMaterial: steelShaft,
      hubMaterial: steelHub
    });

    assert.strictEqual(result.stresses.hubHoopStressMaxMpa, 128.1);
    assert.strictEqual(result.stresses.hubRadialStressMaxMpa, -76.9);
    assert.strictEqual(result.stresses.hubVonMisesMaxMpa, 179.4);
    assert.strictEqual(result.stresses.hubYieldSafetyFactor, 2.95);
  });

  test('Benchmark 3: Friction torque and axial capacity calculation', () => {
    // Normal interface area: A = pi * 50 * 50 = 2500*pi = 7853.98 mm²
    // Normal force: Fn = 76.875 * 7853.98 = 603,775 N
    // Axial capacity: F_axial = mu * Fn = 0.15 * 603,775 = 90,566 N = 90.57 kN
    // Torque capacity: Tcap = F_axial * (d/2) = 90566 * 0.025 = 2264.16 N·m
    // For applied torque 500 N·m => margin = 2264.16 / 500 = 4.53
    const result = calculateInterferenceFit({
      shaftNominalDiameter: 50,
      hubNominalBore: 50,
      shaftMaxDiameter: 50.050,
      shaftMinDiameter: 50.050,
      hubMaxBore: 50.000,
      hubMinBore: 50.000,
      hubOuterDiameter: 100,
      fitLength: 50,
      frictionCoefficient: 0.15,
      transmittedTorque: 500,
      shaftMaterial: steelShaft,
      hubMaterial: steelHub
    });

    assert.strictEqual(Math.round(result.capacity.minAxialCapacityN), 90566);
    assert.strictEqual(result.capacity.minTorqueCapacityNm, 2264.2);
    assert.strictEqual(result.capacity.torqueMargin, 4.53);
    assert.strictEqual(result.status, 'safe');
  });

  test('Benchmark 4: Dissimilar materials (Steel Shaft, Aluminum Hub)', () => {
    const aluHub = {
      name: 'Al 6061-T6',
      elasticModulus: 68.9, // GPa
      poissonsRatio: 0.33,
      yieldStrength: 276, // MPa
      thermalExpansion: 23.6 // 10^-6 / K
    };

    // Aluminum has much lower modulus (68.9 vs 205 GPa) => higher compliance, lower contact pressure
    const result = calculateInterferenceFit({
      shaftNominalDiameter: 50,
      hubNominalBore: 50,
      shaftMaxDiameter: 50.050,
      shaftMinDiameter: 50.050,
      hubMaxBore: 50.000,
      hubMinBore: 50.000,
      hubOuterDiameter: 100,
      fitLength: 50,
      frictionCoefficient: 0.15,
      transmittedTorque: 500,
      shaftMaterial: steelShaft,
      hubMaterial: aluHub
    });

    assert.ok(result.contactPressure.minMpa < 76.88);
    assert.strictEqual(result.contactPressure.minMpa, 30.82);
    assert.strictEqual(result.capacity.minTorqueCapacityNm, 907.8);
  });

  test('Benchmark 5: Transition/clearance fit detection stops false friction claims', () => {
    // Tolerance that allows clearance: shaft 50.010, hub 50.025 => delta_min = -0.015 mm
    const result = calculateInterferenceFit({
      shaftNominalDiameter: 50,
      hubNominalBore: 50,
      shaftMaxDiameter: 50.030,
      shaftMinDiameter: 50.010,
      hubMaxBore: 50.025,
      hubMinBore: 50.000,
      hubOuterDiameter: 100,
      fitLength: 50,
      frictionCoefficient: 0.15,
      transmittedTorque: 500,
      shaftMaterial: steelShaft,
      hubMaterial: steelHub
    });

    assert.strictEqual(result.diametralInterference.isTransitionOrClearance, true);
    assert.strictEqual(result.contactPressure.minMpa, 0);
    assert.strictEqual(result.capacity.minTorqueCapacityNm, 0);
    assert.strictEqual(result.status, 'clearance_risk');
  });

  test('Benchmark 6: Simultaneous torque and axial loading evaluates combined traction', () => {
    const result = calculateInterferenceFit({
      shaftNominalDiameter: 50,
      hubNominalBore: 50,
      shaftMaxDiameter: 50.050,
      shaftMinDiameter: 50.050,
      hubMaxBore: 50.000,
      hubMinBore: 50.000,
      hubOuterDiameter: 100,
      fitLength: 50,
      frictionCoefficient: 0.15,
      transmittedTorque: 500,
      axialForce: 15000,
      simultaneousLoading: true,
      shaftMaterial: steelShaft,
      hubMaterial: steelHub
    });

    // Ft = 2 * 500,000 / 50 = 20,000 N
    // Fa = 15,000 N
    // Fres = sqrt(20000^2 + 15000^2) = 25,000 N
    // Friction force = 90,566 N => combined margin = 90566 / 25000 = 3.62
    assert.strictEqual(result.capacity.combinedTractionN, 25000);
    assert.strictEqual(result.capacity.combinedMargin, 3.62);
  });

  test('Benchmark 7: Stage 10 Audit Regression — Solid shaft (d=50, Do=100, L=60, E=210 GPa, nu=0.30)', () => {
    // Audit benchmark verification:
    // q = 50/100 = 0.5 => q^2 = 0.25 => (1+q^2)/(1-q^2) = 1.25/0.75 = 5/3 = 1.666667
    // Ch = (1.666667 + 0.30) / 210,000 = 1.966667 / 210,000 = 9.365079e-6 MPa^-1
    // Cs = (1.0 - 0.30) / 210,000 = 0.70 / 210,000 = 3.333333e-6 MPa^-1
    // Ch + Cs = 1.269841e-5 MPa^-1
    // K = 50 * 1.269841e-5 = 0.0006349206 mm/MPa (0.6349 um/MPa)
    // For delta_min = 15 um = 0.015 mm => p_min = 0.015 / 0.0006349206 = 23.625 MPa (~23.63 MPa)
    // For delta_max = 41 um = 0.041 mm => p_max = 0.041 / 0.0006349206 = 64.575 MPa (~64.57 MPa)
    // T_cap = mu * p_min * pi * d^2 * L / 2 = 0.15 * 23.625 * pi * 2500 * 60 / 2 = 835.0 N·m
    const steel210 = {
      name: 'Steel C45E',
      elasticModulus: 210,
      poissonsRatio: 0.30,
      yieldStrength: 600,
      thermalExpansion: 12.0
    };

    const result = calculateInterferenceFit({
      shaftNominalDiameter: 50,
      hubNominalBore: 50,
      shaftMaxDiameter: 50.041,
      shaftMinDiameter: 50.015,
      hubMaxBore: 50.000,
      hubMinBore: 50.000,
      hubOuterDiameter: 100,
      fitLength: 60,
      frictionCoefficient: 0.15,
      transmittedTorque: 500,
      shaftMaterial: steel210,
      hubMaterial: steel210
    });

    assert.strictEqual(result.contactPressure.minMpa, 23.63);
    assert.strictEqual(result.contactPressure.maxMpa, 64.57);
    assert.strictEqual(result.capacity.minTorqueCapacityNm, 835);
  });
});

describe('Stage 09: Shaft–Hub Connections — Thermal Assembly Tests', () => {
  test('Benchmark 1: Hub heating calculation for uniform steel assembly', () => {
    // d = 50 mm, max interference delta_max = 50 um = 0.050 mm
    // Target handling clearance = 30 um = 0.030 mm
    // Total required dilation = 0.080 mm
    // Steel hub alpha = 12.0e-6 / K
    // Delta T = 0.080 / (50 * 12.0e-6) = 0.080 / 0.0006 = 133.33 K
    // T_hub = 20 + 133.33 = 153.33 °C
    const result = calculateThermalAssembly({
      nominalDiameter: 50,
      maxShaftDiameter: 50.050,
      minHubBore: 50.000,
      shaftThermalExpansion: 12.0,
      hubThermalExpansion: 12.0,
      referenceTemperatureC: 20,
      targetAssemblyClearanceUm: 30
    });

    assert.strictEqual(result.initialMaxInterferenceUm, 50);
    assert.strictEqual(result.targetAssemblyClearanceUm, 30);
    assert.strictEqual(result.totalExpansionRequiredUm, 80);
    assert.strictEqual(result.calculatedHubTempForAssemblyC, 153.3);
    assert.strictEqual(result.isHubTempSafe, true);
    assert.strictEqual(result.status, 'feasible');
  });

  test('Benchmark 2: Dissimilar material expansion (Aluminum hub on steel shaft)', () => {
    // Aluminum alpha = 23.0e-6 / K
    // Delta T = 0.080 / (50 * 23.0e-6) = 0.080 / 0.00115 = 69.57 K => T_hub = 89.57 °C
    const result = calculateThermalAssembly({
      nominalDiameter: 50,
      maxShaftDiameter: 50.050,
      minHubBore: 50.000,
      shaftThermalExpansion: 12.0,
      hubThermalExpansion: 23.0,
      referenceTemperatureC: 20,
      targetAssemblyClearanceUm: 30
    });

    assert.strictEqual(result.calculatedHubTempForAssemblyC, 89.6);
    assert.strictEqual(result.isHubTempSafe, true);
  });

  test('Benchmark 3: Evaluates resulting clearance for specific user-provided assembly temperatures', () => {
    // Hub heated to 180 °C (Delta T = 160 K), Shaft cooled to -40 °C (Delta T = -60 K)
    // Hub expansion: 50 * 12e-6 * 160 = 0.096 mm = 96 um
    // Shaft contraction: 50 * 12e-6 * (-60) = -0.036 mm = 36 um contraction
    // Total thermal clearance change: 96 - (-36) = 132 um
    // Minus initial interference 50 um => net clearance = 82 um
    const result = calculateThermalAssembly({
      nominalDiameter: 50,
      maxShaftDiameter: 50.050,
      minHubBore: 50.000,
      shaftThermalExpansion: 12.0,
      hubThermalExpansion: 12.0,
      referenceTemperatureC: 20,
      targetAssemblyClearanceUm: 30,
      hubHeatingTempC: 180,
      shaftCoolingTempC: -40
    });

    assert.strictEqual(result.hubExpansionAtInputTempUm, 96);
    assert.strictEqual(result.shaftContractionAtInputTempUm, 36);
    assert.strictEqual(result.resultingClearanceAtInputTempsUm, 82);
  });

  test('Benchmark 4: Excessive temperature warning when heating exceeds tempering limits', () => {
    // High interference requiring T_hub > 250 °C
    const result = calculateThermalAssembly({
      nominalDiameter: 50,
      maxShaftDiameter: 50.180, // 180 um interference
      minHubBore: 50.000,
      shaftThermalExpansion: 12.0,
      hubThermalExpansion: 12.0,
      referenceTemperatureC: 20,
      targetAssemblyClearanceUm: 30,
      maxAllowableHubTempC: 250
    });

    assert.ok(result.calculatedHubTempForAssemblyC > 250);
    assert.strictEqual(result.isHubTempSafe, false);
    assert.ok(result.warnings.some((w) => w.includes('exceeds allowable limit')));
  });
});
