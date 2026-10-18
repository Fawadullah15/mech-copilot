import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  solveShaftReactions,
  calculateEquivalentDynamicLoad,
  interpolateDgbbFactors,
  calculateL10Life,
  calculateStaticSafety,
  getAllBearings,
  getBearingsByBore,
  getBearingById,
  createCustomBearing,
  runCompleteBearingAnalysis
} from '../bearings';
import type { BearingCatalogItem, ShaftTransverseLoad } from '../bearings/types';

describe('Shaft Support Reaction Statics Solver Tests', () => {
  test('symmetric central point load produces equal reactions and zero equilibrium residuals', () => {
    // Shaft length = 300 mm, bearings at xA = 20 mm, xB = 280 mm (span = 260 mm)
    // Central load at midpoint x = 150 mm, Fy = -2000 N (downwards)
    const result = solveShaftReactions({
      shaftLength: 300,
      xA: 20,
      xB: 280,
      transverseLoads: [
        { id: 'load-1', name: 'Central Load', x: 150, Fy: -2000, Fz: 0 }
      ]
    });

    assert.strictEqual(result.span, 260);
    assert.strictEqual(result.reactions.A.Ry, 1000);
    assert.strictEqual(result.reactions.B.Ry, 1000);
    assert.strictEqual(result.reactions.A.Fr, 1000);
    assert.strictEqual(result.reactions.B.Fr, 1000);
    assert.strictEqual(result.reactions.A.Rz, 0);
    assert.strictEqual(result.reactions.B.Rz, 0);

    // Equilibrium verification
    assert.ok(result.equilibriumCheck.isEquilibriumSatisfied);
    assert.ok(Math.abs(result.equilibriumCheck.sumFy) < 1e-4);
    assert.ok(Math.abs(result.equilibriumCheck.sumMzAtA) < 1e-4);
  });

  test('asymmetric transverse load calculates exact lever-arm reaction distribution', () => {
    // Span = 200 mm (xA = 0, xB = 200). Load at x = 50 mm, Fy = -4000 N.
    // Reaction B: -(-4000 * 50) / 200 = +1000 N
    // Reaction A: 4000 - 1000 = +3000 N
    const result = solveShaftReactions({
      shaftLength: 250,
      xA: 0,
      xB: 200,
      transverseLoads: [
        { id: 'load-gear', name: 'Pinion', x: 50, Fy: -4000, Fz: 0 }
      ]
    });

    assert.strictEqual(result.reactions.A.Ry, 3000);
    assert.strictEqual(result.reactions.B.Ry, 1000);
    assert.strictEqual(result.reactions.A.Fr, 3000);
    assert.strictEqual(result.reactions.B.Fr, 1000);
    assert.ok(result.equilibriumCheck.isEquilibriumSatisfied);
  });

  test('3D orthogonal loading resolves vertical and horizontal reactions into resultant radial loads', () => {
    // Fy = -1200 N, Fz = -1600 N at center of 200 mm span (xA = 0, xB = 200, load at x = 100)
    // RyA = RyB = 600 N
    // RzA = RzB = 800 N
    // FrA = FrB = sqrt(600^2 + 800^2) = 1000 N
    const result = solveShaftReactions({
      shaftLength: 200,
      xA: 0,
      xB: 200,
      transverseLoads: [
        { id: 'load-3d', name: 'Helical Gear Load', x: 100, Fy: -1200, Fz: -1600 }
      ]
    });

    assert.strictEqual(result.reactions.A.Ry, 600);
    assert.strictEqual(result.reactions.B.Ry, 600);
    assert.strictEqual(result.reactions.A.Rz, 800);
    assert.strictEqual(result.reactions.B.Rz, 800);
    assert.strictEqual(result.reactions.A.Fr, 1000);
    assert.strictEqual(result.reactions.B.Fr, 1000);
    assert.ok(result.equilibriumCheck.isEquilibriumSatisfied);
  });

  test('overhung load outside bearing supports produces negative reaction at distant support', () => {
    // Supports at xA = 50, xB = 250 (span = 200 mm). Overhung load at x = 300 mm (dx from A = 250 mm).
    // Fy = -1000 N.
    // RyB = -(-1000 * 250) / 200 = +1250 N (upward support)
    // RyA = -(-1000) - 1250 = -250 N (downward hold-down)
    const result = solveShaftReactions({
      shaftLength: 350,
      xA: 50,
      xB: 250,
      transverseLoads: [
        { id: 'load-pulley', name: 'Overhung Pulley', x: 300, Fy: -1000, Fz: 0 }
      ]
    });

    assert.strictEqual(result.reactions.B.Ry, 1250);
    assert.strictEqual(result.reactions.A.Ry, -250);
    assert.strictEqual(result.reactions.A.Fr, 250); // Magnitude is 250 N
    assert.strictEqual(result.reactions.B.Fr, 1250);
    assert.ok(result.equilibriumCheck.isEquilibriumSatisfied);
  });

  test('locating/floating arrangement allocates 100% of axial load to designated locating bearing', () => {
    // Case 1: Locating at A
    const resA = solveShaftReactions({
      shaftLength: 300,
      xA: 20,
      xB: 280,
      transverseLoads: [{ id: 'L1', name: 'L1', x: 150, Fy: -1000, Fz: 0 }],
      axialLoads: [{ id: 'A1', name: 'Thrust', x: 150, Fa: 2500 }],
      arrangement: 'locating_floating',
      locatingStation: 'A'
    });
    assert.strictEqual(resA.reactions.A.Fa, 2500);
    assert.strictEqual(resA.reactions.B.Fa, 0);

    // Case 2: Locating at B
    const resB = solveShaftReactions({
      shaftLength: 300,
      xA: 20,
      xB: 280,
      transverseLoads: [{ id: 'L1', name: 'L1', x: 150, Fy: -1000, Fz: 0 }],
      axialLoads: [{ id: 'A1', name: 'Thrust', x: 150, Fa: 2500 }],
      arrangement: 'locating_floating',
      locatingStation: 'B'
    });
    assert.strictEqual(resB.reactions.A.Fa, 0);
    assert.strictEqual(resB.reactions.B.Fa, 2500);
  });

  test('rejects invalid or singular support configurations', () => {
    assert.throws(
      () =>
        solveShaftReactions({
          shaftLength: 300,
          xA: 150,
          xB: 150, // Zero span
          transverseLoads: [{ id: '1', name: '1', x: 150, Fy: -1000, Fz: 0 }]
        }),
      /Bearing support span must be positive/
    );

    assert.throws(
      () =>
        solveShaftReactions({
          shaftLength: 300,
          xA: 200,
          xB: 50, // Reversed stations
          transverseLoads: [{ id: '1', name: '1', x: 100, Fy: -1000, Fz: 0 }]
        }),
      /Bearing support span must be positive/
    );

    assert.throws(
      () =>
        solveShaftReactions({
          shaftLength: 300,
          xA: -10, // Negative position
          xB: 250,
          transverseLoads: [{ id: '1', name: '1', x: 100, Fy: -1000, Fz: 0 }]
        }),
      /outside the shaft length/
    );
  });
});

describe('ISO 281:2007 Equivalent Dynamic Load Engine Tests', () => {
  const dgbb6209: BearingCatalogItem = {
    id: 'dgbb-6209',
    designation: '6209',
    type: 'deep_groove_ball',
    typeName: 'Deep Groove Ball Bearing',
    d: 45,
    D: 85,
    B: 19,
    C: 35100,
    C0: 21600,
    limitingSpeedRpm: 8500,
    referenceSpeedRpm: 17000,
    massKg: 0.41,
    standard: 'ISO 15 / ISO 281'
  };

  test('deep groove ball bearing under pure radial load yields P = Fr', () => {
    const eq = calculateEquivalentDynamicLoad(dgbb6209, 2500, 0);
    assert.strictEqual(eq.P, 2500);
    assert.strictEqual(eq.X, 1.0);
    assert.strictEqual(eq.Y, 0);
    assert.strictEqual(eq.isPureRadial, true);
  });

  test('deep groove ball bearing with Fa/Fr <= e remains pure radial P = Fr', () => {
    // Fr = 5000 N, Fa = 500 N => Fa/Fr = 0.10.
    // Fa/C0 = 500 / 21600 = 0.023 => e ~ 0.21.
    // 0.10 <= 0.21 => pure radial branch
    const eq = calculateEquivalentDynamicLoad(dgbb6209, 5000, 500);
    assert.strictEqual(eq.P, 5000);
    assert.strictEqual(eq.X, 1.0);
    assert.strictEqual(eq.Y, 0);
    assert.strictEqual(eq.isPureRadial, true);
  });

  test('deep groove ball bearing with Fa/Fr > e switches to combined load P = 0.56*Fr + Y*Fa', () => {
    // Fr = 2000 N, Fa = 1500 N => Fa/Fr = 0.75.
    // Fa/C0 = 1500 / 21600 = 0.0694.
    // Interpolated e ~ 0.27, Y ~ 1.63.
    // 0.75 > 0.27 => P = 0.56 * 2000 + 1.63 * 1500 = 1120 + 2445 = 3565 N.
    const eq = calculateEquivalentDynamicLoad(dgbb6209, 2000, 1500);
    assert.ok(eq.ratioFaFr > eq.e);
    assert.strictEqual(eq.X, 0.56);
    assert.ok(eq.Y >= 1.55 && eq.Y <= 1.71);
    assert.ok(eq.P > 3000 && eq.P < 4000);
    assert.strictEqual(eq.isPureRadial, false);
  });

  test('cylindrical roller bearing operates in pure radial mode and flags warning if thrust applied', () => {
    const crb: BearingCatalogItem = {
      id: 'crb-nu209',
      designation: 'NU 209',
      type: 'cylindrical_roller',
      typeName: 'Cylindrical Roller Bearing',
      d: 45,
      D: 85,
      B: 19,
      C: 64000,
      C0: 53000,
      limitingSpeedRpm: 8500,
      referenceSpeedRpm: 9000,
      massKg: 0.44,
      standard: 'ISO 15 / ISO 281'
    };

    const pure = calculateEquivalentDynamicLoad(crb, 4000, 0);
    assert.strictEqual(pure.P, 4000);
    assert.strictEqual(pure.warning, undefined);

    const withAxial = calculateEquivalentDynamicLoad(crb, 4000, 800);
    assert.strictEqual(withAxial.P, 4000);
    assert.ok(withAxial.warning?.includes('Standard NU/N cylindrical roller bearings do not support axial thrust'));
  });

  test('angular contact ball bearing (40 deg) evaluates e = 1.14 threshold', () => {
    const acbb: BearingCatalogItem = {
      id: 'acbb-7209b',
      designation: '7209 B',
      type: 'angular_contact_ball',
      typeName: 'Angular Contact Ball Bearing',
      d: 45,
      D: 85,
      B: 19,
      C: 39000,
      C0: 29000,
      limitingSpeedRpm: 9000,
      referenceSpeedRpm: 10000,
      e: 1.14,
      Y: 0.57,
      Y0: 0.26,
      massKg: 0.43,
      standard: 'ISO 15 / ISO 281'
    };

    // Sub-threshold: Fr = 2000, Fa = 1000 => Fa/Fr = 0.5 <= 1.14
    const sub = calculateEquivalentDynamicLoad(acbb, 2000, 1000);
    assert.strictEqual(sub.P, 2000);

    // Over-threshold: Fr = 2000, Fa = 3000 => Fa/Fr = 1.5 > 1.14
    // P = 0.35 * 2000 + 0.57 * 3000 = 700 + 1710 = 2410 N
    const over = calculateEquivalentDynamicLoad(acbb, 2000, 3000);
    assert.strictEqual(over.X, 0.35);
    assert.strictEqual(over.Y, 0.57);
    assert.strictEqual(over.P, 2410);
  });
});

describe('ISO 281:2007 Dynamic L10 Rating Life Engine Tests', () => {
  const dgbb: BearingCatalogItem = {
    id: 'dgbb-6209',
    designation: '6209',
    type: 'deep_groove_ball',
    typeName: 'Deep Groove Ball Bearing',
    d: 45,
    D: 85,
    B: 19,
    C: 35100, // N
    C0: 21600,
    limitingSpeedRpm: 8500,
    referenceSpeedRpm: 17000,
    massKg: 0.41,
    standard: 'ISO 15 / ISO 281'
  };

  test('ball bearing L10 follows cubic exponent p = 3 against benchmark calculation', () => {
    // Benchmark: C = 35100 N, P = 3510 N => C/P = 10.
    // L10 = (10)^3 = 1000 million revolutions.
    // At n = 1500 RPM:
    // L10h = (10^6 / (60 * 1500)) * 1000 = (1e9 / 90000) = 11111.11 hours.
    const life = calculateL10Life(dgbb, 3510, 1500);

    assert.strictEqual(life.p, 3);
    assert.strictEqual(life.L10RevolutionsMillions, 1000);
    assert.strictEqual(life.L10Hours, 11111.1);
    assert.strictEqual(life.status, 'marginal'); // 5000 - 20000 hours is marginal
  });

  test('roller bearing L10 follows exponent p = 10/3', () => {
    const crb: BearingCatalogItem = {
      id: 'crb-nu209',
      designation: 'NU 209',
      type: 'cylindrical_roller',
      typeName: 'Cylindrical Roller Bearing',
      d: 45,
      D: 85,
      B: 19,
      C: 64000,
      C0: 53000,
      limitingSpeedRpm: 8500,
      referenceSpeedRpm: 9000,
      massKg: 0.44,
      standard: 'ISO 15 / ISO 281'
    };

    // C = 64000 N, P = 6400 N => C/P = 10.
    // L10 = 10^(10/3) = 10^3.333333333 = 2154.43 million revolutions.
    // At n = 1500 RPM: L10h = (1e6 / 90000) * 2154.4347 = 23938.16 hours.
    const life = calculateL10Life(crb, 6400, 1500);

    assert.strictEqual(life.p, 3.3333);
    assert.strictEqual(life.L10RevolutionsMillions, 2154.43);
    assert.strictEqual(life.L10Hours, 23938.2);
    assert.strictEqual(life.status, 'adequate'); // >= 20000 hours
  });

  test('speed sensitivity: doubling RPM exactly halves operating hours', () => {
    const lifeAt1000 = calculateL10Life(dgbb, 4000, 1000);
    const lifeAt2000 = calculateL10Life(dgbb, 4000, 2000);

    assert.strictEqual(lifeAt1000.L10RevolutionsMillions, lifeAt2000.L10RevolutionsMillions);
    assert.strictEqual(Math.round(lifeAt1000.L10Hours), Math.round(lifeAt2000.L10Hours * 2));
  });

  test('unloaded condition (P = 0) returns infinite life without division by zero crash', () => {
    const life = calculateL10Life(dgbb, 0, 1800);
    assert.strictEqual(life.L10RevolutionsMillions, Infinity);
    assert.strictEqual(life.L10Hours, Infinity);
    assert.strictEqual(life.status, 'adequate');
  });
});

describe('ISO 76:2006 Static Safety Factor Tests', () => {
  const dgbb: BearingCatalogItem = {
    id: 'dgbb-6209',
    designation: '6209',
    type: 'deep_groove_ball',
    typeName: 'Deep Groove Ball Bearing',
    d: 45,
    D: 85,
    B: 19,
    C: 35100,
    C0: 21600, // N
    limitingSpeedRpm: 8500,
    referenceSpeedRpm: 17000,
    massKg: 0.41,
    standard: 'ISO 15 / ISO 281'
  };

  test('static equivalent load P0 satisfies P0 >= Fr rule and evaluates s0 = C0 / P0', () => {
    // Fr = 10000 N, Fa = 2000 N
    // X0 = 0.6, Y0 = 0.5
    // X0*Fr + Y0*Fa = 6000 + 1000 = 7000 N
    // ISO 76 rule: P0 = max(7000, 10000) = 10000 N.
    // s0 = 21600 / 10000 = 2.16
    const stat = calculateStaticSafety(dgbb, 10000, 2000);
    assert.strictEqual(stat.P0, 10000);
    assert.strictEqual(stat.s0, 2.16);
    assert.strictEqual(stat.status, 'safe');
  });

  test('detects static brinelling risk when P0 > C0 (s0 < 1.0)', () => {
    // Fr = 25000 N (> C0 of 21600 N)
    const stat = calculateStaticSafety(dgbb, 25000, 0);
    assert.strictEqual(stat.P0, 25000);
    assert.ok(stat.s0 < 1.0);
    assert.strictEqual(stat.status, 'brinelling_risk');
    assert.ok(stat.guidance.includes('CRITICAL'));
  });
});

describe('Bearing Catalog & Subsystem Integration Tests', () => {
  test('catalog contains standard bearings for 45 mm nominal shaft journal', () => {
    const bearings45 = getBearingsByBore(45);
    assert.ok(bearings45.length >= 4);

    const designations = bearings45.map((b) => b.designation);
    assert.ok(designations.includes('6209'));
    assert.ok(designations.includes('6309'));
    assert.ok(designations.includes('NU 209 ECP'));
    assert.ok(designations.includes('7209 B'));
  });

  test('creates custom user-defined bearing with validation', () => {
    const custom = createCustomBearing({
      designation: 'CUSTOM-CERAMIC-45',
      type: 'deep_groove_ball',
      d: 45,
      C: 45000,
      C0: 28000
    });

    assert.strictEqual(custom.d, 45);
    assert.strictEqual(custom.C, 45000);
    assert.strictEqual(custom.C0, 28000);
    assert.ok(custom.id.startsWith('custom-'));
  });

  test('runCompleteBearingAnalysis executes full end-to-end shaft bearing engineering workflow', () => {
    const bA = getBearingById('dgbb-6209')!;
    const bB = getBearingById('crb-nu209')!;
    assert.ok(bA && bB);

    const analysis = runCompleteBearingAnalysis({
      shaftLength: 320,
      shaftDiameter: 45,
      rpm: 1800,
      xA: 25,
      xB: 295,
      transverseLoads: [
        { id: 'gear', name: 'Drive Gear', x: 160, Fy: -2500, Fz: 0 }
      ],
      axialLoads: [
        { id: 'thrust', name: 'Helical Thrust', x: 160, Fa: 1200 }
      ],
      arrangement: 'locating_floating',
      locatingStation: 'A',
      bearingA: bA,
      bearingB: bB
    });

    assert.strictEqual(analysis.shaftLength, 320);
    assert.strictEqual(analysis.shaftDiameter, 45);
    assert.ok(analysis.reactions.equilibriumCheck.isEquilibriumSatisfied);

    // Support A (locating DGBB) carries all axial thrust (1200 N)
    assert.strictEqual(analysis.reactions.reactions.A.Fa, 1200);
    assert.strictEqual(analysis.reactions.reactions.B.Fa, 0);

    // Dynamic life evaluations
    assert.ok(analysis.stationA.dynamicLife.L10Hours > 0);
    assert.ok(analysis.stationB.dynamicLife.L10Hours > 0);

    // Static safety evaluations
    assert.ok(analysis.stationA.staticSafety.s0 > 1.5);
    assert.ok(analysis.stationB.staticSafety.s0 > 1.5);

    assert.ok(['pass', 'warning', 'fail'].includes(analysis.overallStatus));
    assert.ok(analysis.summary.length > 20);
  });
});
