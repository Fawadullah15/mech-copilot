import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  findDiameterStep,
  DIAMETER_STEPS,
  IT_TABLE_UM,
  STANDARD_FITS,
} from '../tolerances/iso286Data';
import {
  calculateHoleLimits,
  calculateShaftLimits,
  calculateFit,
  parseFitDesignation,
} from '../tolerances/iso286Engine';
import { calculateToleranceStackUp } from '../tolerances/stackUpEngine';
import type { StackUpComponent } from '../tolerances/types';

describe('ISO 286 Limits and Fits Engine Verification', () => {
  describe('Diameter Step Boundary Selection', () => {
    test('correctly selects diameter step for interior and boundary nominal diameters', () => {
      // Step 0: (0, 3] mm
      const s0 = findDiameterStep(2.5)!;
      assert.equal(s0.stepIndex, 0);
      const s0_bound = findDiameterStep(3.0)!;
      assert.equal(s0_bound.stepIndex, 0);

      // Step 1: (3, 6] mm
      const s1 = findDiameterStep(3.001)!;
      assert.equal(s1.stepIndex, 1);
      const s1_bound = findDiameterStep(6.0)!;
      assert.equal(s1_bound.stepIndex, 1);

      // Step 4: (18, 30] mm
      const s4 = findDiameterStep(25.0)!;
      assert.equal(s4.stepIndex, 4);
      const s4_bound = findDiameterStep(30.0)!;
      assert.equal(s4_bound.stepIndex, 4);

      // Step 5: (30, 50] mm
      const s5 = findDiameterStep(30.001)!;
      assert.equal(s5.stepIndex, 5);
      const s5_mid = findDiameterStep(45.0)!;
      assert.equal(s5_mid.stepIndex, 5);
      const s5_bound = findDiameterStep(50.0)!;
      assert.equal(s5_bound.stepIndex, 5);

      // Step 6: (50, 80] mm
      const s6 = findDiameterStep(80.0)!;
      assert.equal(s6.stepIndex, 6);

      // Step 12: (400, 500] mm
      const s12 = findDiameterStep(500.0)!;
      assert.equal(s12.stepIndex, 12);
    });

    test('rejects out-of-range diameters (< 0, 0, > 500 mm)', () => {
      assert.equal(findDiameterStep(0), null);
      assert.equal(findDiameterStep(-5), null);
      assert.equal(findDiameterStep(500.1), null);
      assert.equal(findDiameterStep(1000), null);
    });
  });

  describe('Independent Benchmark 1: 25 H7/h6 (Precision Sliding / Location Fit)', () => {
    // Standard ISO 286-2 reference for 25 H7/h6 (Step 18-30 mm):
    // IT7 = 21 µm, IT6 = 13 µm
    // Hole H7: 0 to +21 µm -> D_min = 25.000 mm, D_max = 25.021 mm
    // Shaft h6: 0 to -13 µm -> d_max = 25.000 mm, d_min = 24.987 mm
    // Min clearance = 0 µm, Max clearance = +34 µm
    test('calculates exact limit dimensions and clearance fit classification', () => {
      const fit = calculateFit(25, 'H7', 'h6');

      assert.equal(fit.nominalDiameterMm, 25);
      assert.equal(fit.holeClass, 'H7');
      assert.equal(fit.shaftClass, 'h6');
      assert.equal(fit.fitType, 'clearance');

      // Hole
      assert.equal(fit.holeLimits.lowerDeviationUm, 0);
      assert.equal(fit.holeLimits.upperDeviationUm, 21);
      assert.equal(fit.holeLimits.minDimensionMm, 25.000);
      assert.equal(fit.holeLimits.maxDimensionMm, 25.021);

      // Shaft
      assert.equal(fit.shaftLimits.upperDeviationUm, 0);
      assert.equal(fit.shaftLimits.lowerDeviationUm, -13);
      assert.equal(fit.shaftLimits.maxDimensionMm, 25.000);
      assert.equal(fit.shaftLimits.minDimensionMm, 24.987);

      // Fit Limits
      assert.equal(fit.minClearanceUm, 0);
      assert.equal(fit.maxClearanceUm, 34);
      assert.equal(fit.minClearanceMm, 0.000);
      assert.equal(fit.maxClearanceMm, 0.034);
      assert.equal(fit.fitToleranceUm, 34);
    });
  });

  describe('Independent Benchmark 2: 45 H7/g6 (Precision Running Fit with Lubrication)', () => {
    // Standard ISO 286-2 reference for 45 H7/g6 (Step 30-50 mm):
    // IT7 = 25 µm, IT6 = 16 µm
    // Hole H7: 0 to +25 µm -> D_min = 45.000 mm, D_max = 45.025 mm
    // Shaft g6: es = -9 µm, ei = -25 µm -> d_max = 44.991 mm, d_min = 44.975 mm
    // Min clearance = 45.000 - 44.991 = +9 µm
    // Max clearance = 45.025 - 44.975 = +50 µm
    test('calculates exact running clearance limits for 45 mm shaft', () => {
      const fit = calculateFit(45, 'H7', 'g6');

      assert.equal(fit.nominalDiameterMm, 45);
      assert.equal(fit.fitType, 'clearance');

      // Hole limits
      assert.equal(fit.holeLimits.minDimensionMm, 45.000);
      assert.equal(fit.holeLimits.maxDimensionMm, 45.025);

      // Shaft limits
      assert.equal(fit.shaftLimits.upperDeviationUm, -9);
      assert.equal(fit.shaftLimits.lowerDeviationUm, -25);
      assert.equal(fit.shaftLimits.maxDimensionMm, 44.991);
      assert.equal(fit.shaftLimits.minDimensionMm, 44.975);

      // Clearance
      assert.equal(fit.minClearanceUm, 9);
      assert.equal(fit.maxClearanceUm, 50);
      assert.equal(fit.minClearanceMm, 0.009);
      assert.equal(fit.maxClearanceMm, 0.050);
    });
  });

  describe('Independent Benchmark 3: 50 H7/k6 (Transition Fit for Keyed Gears)', () => {
    // Standard ISO 286-2 reference for 50 H7/k6 (Step 30-50 mm):
    // IT7 = 25 µm, IT6 = 16 µm
    // Hole H7: 0 to +25 µm -> D_min = 50.000 mm, D_max = 50.025 mm
    // Shaft k6: ei = +2 µm, es = +18 µm -> d_min = 50.002 mm, d_max = 50.018 mm
    // Max clearance = 50.025 - 50.002 = +23 µm
    // Max interference = 50.018 - 50.000 = +18 µm
    test('calculates transition fit with simultaneous clearance and interference possibilities', () => {
      const fit = calculateFit(50, 'H7', 'k6');

      assert.equal(fit.fitType, 'transition');
      assert.equal(fit.holeLimits.minDimensionMm, 50.000);
      assert.equal(fit.holeLimits.maxDimensionMm, 50.025);

      assert.equal(fit.shaftLimits.lowerDeviationUm, 2);
      assert.equal(fit.shaftLimits.upperDeviationUm, 18);
      assert.equal(fit.shaftLimits.minDimensionMm, 50.002);
      assert.equal(fit.shaftLimits.maxDimensionMm, 50.018);

      assert.equal(fit.maxClearanceUm, 23);
      assert.equal(fit.maxInterferenceUm, 18);
      assert.equal(fit.minClearanceUm, -18);
    });
  });

  describe('Independent Benchmark 4: 80 H7/p6 (Interference / Press Fit)', () => {
    // Standard ISO 286-2 reference for 80 H7/p6 (Step 50-80 mm):
    // IT7 = 30 µm, IT6 = 19 µm
    // Hole H7: 0 to +30 µm -> D_min = 80.000 mm, D_max = 80.030 mm
    // Shaft p6: ei = +32 µm, es = +51 µm -> d_min = 80.032 mm, d_max = 80.051 mm
    // Min interference = 80.032 - 80.030 = +2 µm
    // Max interference = 80.051 - 80.000 = +51 µm
    test('calculates definite positive interference limits', () => {
      const fit = calculateFit(80, 'H7', 'p6');

      assert.equal(fit.fitType, 'interference');
      assert.equal(fit.holeLimits.minDimensionMm, 80.000);
      assert.equal(fit.holeLimits.maxDimensionMm, 80.030);

      assert.equal(fit.shaftLimits.lowerDeviationUm, 32);
      assert.equal(fit.shaftLimits.upperDeviationUm, 51);
      assert.equal(fit.shaftLimits.minDimensionMm, 80.032);
      assert.equal(fit.shaftLimits.maxDimensionMm, 80.051);

      assert.equal(fit.minInterferenceUm, 2);
      assert.equal(fit.maxInterferenceUm, 51);
      assert.ok(fit.maxClearanceUm < 0, 'Clearance must be negative for interference fit');
    });
  });

  describe('Designation Parsing & Error Handling', () => {
    test('parses various standard designation string formats', () => {
      const p1 = parseFitDesignation('45 H7/h6');
      assert.deepEqual(p1, { nominalMm: 45, holeClass: 'H7', shaftClass: 'h6' });

      const p2 = parseFitDesignation('⌀50 H7/p6');
      assert.deepEqual(p2, { nominalMm: 50, holeClass: 'H7', shaftClass: 'p6' });

      const p3 = parseFitDesignation('H7/g6', 32);
      assert.deepEqual(p3, { nominalMm: 32, holeClass: 'H7', shaftClass: 'g6' });
    });

    test('rejects unsupported hole or shaft classes gracefully', () => {
      assert.throws(() => calculateHoleLimits(25, 'Z99'), /Unsupported/);
      assert.throws(() => calculateShaftLimits(25, 'x6'), /not in the verified ISO 286 database/);
      assert.throws(() => calculateFit(600, 'H7', 'h6'), /out of range/);
    });
  });
});

describe('1D Dimensional Tolerance Stack-Up Verification', () => {
  test('calculates exact worst-case and statistical RSS for 3-component assembly chain', () => {
    // Assembly:
    // C1: Base housing gap = 100.00 mm +/- 0.10 mm (direction: +1)
    // C2: Gear hub width = 40.00 mm +/- 0.05 mm (direction: -1)
    // C3: Bearing spacer = 50.00 mm +/- 0.05 mm (direction: -1)
    // Expected Gap:
    // Nominal = 100 - 40 - 50 = 10.00 mm
    // WC Max = (100 + 0.10) - (40 - 0.05) - (50 - 0.05) = 100.10 - 39.95 - 49.95 = 10.20 mm
    // WC Min = (100 - 0.10) - (40 + 0.05) - (50 + 0.05) = 99.90 - 40.05 - 50.05 = 9.80 mm
    // WC Total Range = 0.40 mm
    // Statistical RSS:
    // T_1 = 0.20, T_2 = 0.10, T_3 = 0.10
    // T_rss = sqrt(0.20^2 + 0.10^2 + 0.10^2) = sqrt(0.04 + 0.01 + 0.01) = sqrt(0.06) ≈ 0.2449 mm
    // RSS Max = 10.00 + 0.1225 = 10.1225 mm
    // RSS Min = 10.00 - 0.1225 = 9.8775 mm
    const components: StackUpComponent[] = [
      { id: 'c1', name: 'Housing Cavity', nominalMm: 100, upperTolMm: 0.10, lowerTolMm: -0.10, direction: 1 },
      { id: 'c2', name: 'Gear Hub', nominalMm: 40, upperTolMm: 0.05, lowerTolMm: -0.05, direction: -1 },
      { id: 'c3', name: 'Bearing Spacer', nominalMm: 50, upperTolMm: 0.05, lowerTolMm: -0.05, direction: -1 },
    ];

    const result = calculateToleranceStackUp(components);

    assert.equal(result.nominalAssemblyMm, 10.000);
    assert.equal(result.worstCaseMaxMm, 10.200);
    assert.equal(result.worstCaseMinMm, 9.800);
    assert.equal(result.worstCaseVariationMm, 0.400);

    // RSS check
    const expectedRssVar = Math.sqrt(0.04 + 0.01 + 0.01);
    assert.ok(Math.abs(result.rssVariationMm - expectedRssVar) < 0.001);
    assert.ok(result.rssVariationMm < result.worstCaseVariationMm);

    // Top contributor check: Housing Cavity contributes 50% of WC variation
    assert.equal(result.topDriver.component.name, 'Housing Cavity');
    assert.equal(result.topDriver.worstCasePercent, 50.0);
    assert.equal(result.topDriver.rssVariancePercent, 66.7);
  });

  test('handles unilateral tolerances and mixed directions', () => {
    // C1: 20 mm (+0.05, 0.00) (dir +1) -> min 20.00, max 20.05
    // C2: 5 mm (0.00, -0.02) (dir -1) -> min 4.98, max 5.00
    // Assembly:
    // Nominal = 20 - 5 = 15 mm
    // Max = 20.05 - 4.98 = 15.07 mm
    // Min = 20.00 - 5.00 = 15.00 mm
    // Variation = 0.07 mm
    const components: StackUpComponent[] = [
      { id: 'c1', name: 'Pin', nominalMm: 20, upperTolMm: 0.05, lowerTolMm: 0.00, direction: 1 },
      { id: 'c2', name: 'Washer', nominalMm: 5, upperTolMm: 0.00, lowerTolMm: -0.02, direction: -1 },
    ];

    const result = calculateToleranceStackUp(components);
    assert.equal(result.nominalAssemblyMm, 15.000);
    assert.equal(result.worstCaseMaxMm, 15.070);
    assert.equal(result.worstCaseMinMm, 15.000);
    assert.equal(result.worstCaseVariationMm, 0.070);
  });

  test('rejects empty component list', () => {
    assert.throws(() => calculateToleranceStackUp([]), /Tolerance stack-up requires at least one dimensional component/);
  });
});
