import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  calculateGearGeometry,
  calculateGearPairGeometry,
  calculateGearKinematics,
  calculateMeshForces,
  integrateGearWithShaft,
  type CylindricalGearInput
} from '../gears';

describe('Stage 10: Cylindrical Gear Geometry Engine (ISO 21771-1 & ISO 53)', () => {
  test('Benchmark 1: Spur gear geometry (m = 3 mm, z = 20, alpha_n = 20 deg)', () => {
    // d = m * z = 3 * 20 = 60 mm
    // mt = mn = 3 mm, alphat = alphan = 20 deg
    // db = d * cos(20 deg) = 60 * 0.9396926 = 56.3815 mm
    // ha = 1.0 * mn = 3 mm => da = 60 + 2*3 = 66 mm
    // hf = 1.25 * mn = 3.75 mm => df = 60 - 2*3.75 = 52.5 mm
    // pn = pi * 3 = 9.4248 mm, pb = pn * cos(20 deg) = 8.8562 mm
    // zmin = 2 / sin^2(20 deg) = 2 / 0.1169778 = 17.098 => 17 teeth
    const spurInput: CylindricalGearInput = {
      id: 'gear-spur-20t',
      type: 'spur',
      teeth: 20,
      normalModule: 3,
      normalPressureAngleDeg: 20,
      helixAngleDeg: 0,
      helixHand: 'none',
      faceWidth: 30,
      profileShiftCoefficient: 0
    };

    const geom = calculateGearGeometry(spurInput);

    assert.strictEqual(geom.pitchDiameterMm, 60.0);
    assert.strictEqual(geom.transverseModuleMm, 3.0);
    assert.strictEqual(geom.transversePressureAngleDeg, 20.0);
    assert.strictEqual(geom.baseDiameterMm, 56.382);
    assert.strictEqual(geom.tipDiameterMm, 66.0);
    assert.strictEqual(geom.rootDiameterMm, 52.5);
    assert.strictEqual(geom.addendumMm, 3.0);
    assert.strictEqual(geom.dedendumMm, 3.75);
    assert.strictEqual(geom.circularPitchNormalMm, 9.4248);
    assert.strictEqual(geom.basePitchTransverseMm, 8.8564);
    assert.strictEqual(geom.axialPitchMm, null);
    assert.strictEqual(geom.hasUndercut, false);
    assert.strictEqual(geom.minimumTeethWithoutUndercut, 17.1);
  });

  test('Benchmark 2: Helical gear geometry (mn = 2.5 mm, z = 24, beta = 20 deg, alphan = 20 deg, Right Hand)', () => {
    // cos(20 deg) = 0.9396926
    // mt = 2.5 / cos(20 deg) = 2.660444 mm
    // tan(alphat) = tan(20 deg) / cos(20 deg) = 0.3639702 / 0.9396926 = 0.3873289 => alphat = 21.1728 deg
    // d = mt * z = 2.660444 * 24 = 63.8507 mm
    // db = d * cos(alphat) = 63.8507 * cos(21.1728 deg) = 63.8507 * 0.932479 = 59.5394 mm
    // ha = 1.0 * 2.5 = 2.5 mm => da = 63.8507 + 5.0 = 68.8507 mm
    // hf = 1.25 * 2.5 = 3.125 mm => df = 63.8507 - 6.25 = 57.6007 mm
    // axial pitch px = pi * mn / sin(beta) = pi * 2.5 / sin(20 deg) = 7.85398 / 0.342020 = 22.9635 mm
    const helicalInput: CylindricalGearInput = {
      id: 'gear-helical-24t',
      type: 'helical',
      teeth: 24,
      normalModule: 2.5,
      normalPressureAngleDeg: 20,
      helixAngleDeg: 20,
      helixHand: 'right',
      faceWidth: 40,
      profileShiftCoefficient: 0
    };

    const geom = calculateGearGeometry(helicalInput);

    assert.strictEqual(geom.transverseModuleMm, 2.6604);
    assert.strictEqual(geom.transversePressureAngleDeg, 21.1728);
    assert.strictEqual(geom.pitchDiameterMm, 63.851);
    assert.strictEqual(geom.baseDiameterMm, 59.54);
    assert.strictEqual(geom.tipDiameterMm, 68.851);
    assert.strictEqual(geom.rootDiameterMm, 57.601);
    assert.strictEqual(geom.axialPitchMm, 22.9635);
    assert.strictEqual(geom.helixHand, 'right');
  });

  test('Benchmark 3: Undercut detection for low tooth count (z = 12 < 17)', () => {
    const lowTeethInput: CylindricalGearInput = {
      id: 'gear-undercut-12t',
      type: 'spur',
      teeth: 12,
      normalModule: 4,
      normalPressureAngleDeg: 20,
      helixAngleDeg: 0,
      helixHand: 'none',
      faceWidth: 35,
      profileShiftCoefficient: 0
    };

    const geom = calculateGearGeometry(lowTeethInput);
    assert.strictEqual(geom.hasUndercut, true);
    assert.ok(geom.minProfileShiftForUndercut > 0);
    assert.ok(geom.warnings.some((w) => w.includes('undercut risk')));

    // If profile shift x >= minProfileShift is applied, undercut is eliminated
    const correctedInput: CylindricalGearInput = {
      ...lowTeethInput,
      profileShiftCoefficient: geom.minProfileShiftForUndercut + 0.05
    };
    const correctedGeom = calculateGearGeometry(correctedInput);
    assert.strictEqual(correctedGeom.hasUndercut, false);
  });

  test('Input validation rejects negative or invalid gear geometry', () => {
    // Teeth < 6
    assert.throws(
      () =>
        calculateGearGeometry({
          id: 'invalid-teeth',
          type: 'spur',
          teeth: 4,
          normalModule: 3,
          normalPressureAngleDeg: 20,
          helixAngleDeg: 0,
          helixHand: 'none',
          faceWidth: 30
        }),
      /Tooth count z must be an integer >= 6/
    );

    // Negative module
    assert.throws(
      () =>
        calculateGearGeometry({
          id: 'invalid-mod',
          type: 'spur',
          teeth: 20,
          normalModule: -2,
          normalPressureAngleDeg: 20,
          helixAngleDeg: 0,
          helixHand: 'none',
          faceWidth: 30
        }),
      /Normal module mn must be a positive number/
    );

    // Spur gear with non-zero helix angle
    assert.throws(
      () =>
        calculateGearGeometry({
          id: 'invalid-spur-helix',
          type: 'spur',
          teeth: 20,
          normalModule: 3,
          normalPressureAngleDeg: 20,
          helixAngleDeg: 15,
          helixHand: 'right',
          faceWidth: 30
        }),
      /Spur gear must have helixAngle = 0°/
    );

    // Helical gear with no hand
    assert.throws(
      () =>
        calculateGearGeometry({
          id: 'invalid-helical-hand',
          type: 'helical',
          teeth: 20,
          normalModule: 3,
          normalPressureAngleDeg: 20,
          helixAngleDeg: 15,
          helixHand: 'none',
          faceWidth: 30
        }),
      /must specify helixHand as 'left' or 'right'/
    );
  });
});

describe('Stage 10: Gear Pair Compatibility & Contact Ratio (ISO 21771-1:2024)', () => {
  const pinion: CylindricalGearInput = {
    id: 'pinion-20t',
    type: 'spur',
    teeth: 20,
    normalModule: 3,
    normalPressureAngleDeg: 20,
    helixAngleDeg: 0,
    helixHand: 'none',
    faceWidth: 40,
    profileShiftCoefficient: 0
  };

  const wheel: CylindricalGearInput = {
    id: 'wheel-50t',
    type: 'spur',
    teeth: 50,
    normalModule: 3,
    normalPressureAngleDeg: 20,
    helixAngleDeg: 0,
    helixHand: 'none',
    faceWidth: 35,
    profileShiftCoefficient: 0
  };

  test('Benchmark 1: External spur pair center distance and contact ratio', () => {
    // d1 = 3 * 20 = 60 mm, d2 = 3 * 50 = 150 mm
    // Reference center distance a = (60 + 150) / 2 = 105.0 mm
    // Gear ratio u = 50 / 20 = 2.50
    // da1 = 66 mm, db1 = 56.3815 mm => sqrt(66^2 - 56.3815^2) = sqrt(4356 - 3178.88) = sqrt(1177.12) = 34.309 mm
    // da2 = 156 mm, db2 = 150 * cos(20 deg) = 140.9539 mm => sqrt(156^2 - 140.9539^2) = sqrt(24336 - 19868.0) = sqrt(4468.0) = 66.843 mm
    // galpha = 0.5 * (34.309 + 66.843) - 105 * sin(20 deg) = 50.576 - 35.912 = 14.664 mm
    // pb = pi * 3 * cos(20 deg) = 8.8562 mm
    // eps_alpha = 14.664 / 8.8562 = 1.656 (satisfies eps_alpha >= 1.2)
    const pair = calculateGearPairGeometry({ pinion, wheel });

    assert.strictEqual(pair.isPairCompatible, true);
    assert.strictEqual(pair.gearRatio, 2.5);
    assert.strictEqual(pair.referenceCenterDistanceMm, 105.0);
    assert.strictEqual(pair.workingCenterDistanceMm, 105.0);
    assert.strictEqual(pair.commonFaceWidthMm, 35.0);
    assert.strictEqual(pair.profileContactRatio, 1.656);
    assert.strictEqual(pair.faceContactRatio, 0.0);
    assert.strictEqual(pair.totalContactRatio, 1.656);
    assert.strictEqual(pair.compatibilityErrors.length, 0);
  });

  test('Benchmark 2: Helical pair requires opposite hands and computes face contact ratio', () => {
    const helicalPinion: CylindricalGearInput = {
      id: 'h-pinion',
      type: 'helical',
      teeth: 20,
      normalModule: 2.5,
      normalPressureAngleDeg: 20,
      helixAngleDeg: 15,
      helixHand: 'left',
      faceWidth: 45
    };

    const helicalWheel: CylindricalGearInput = {
      id: 'h-wheel',
      type: 'helical',
      teeth: 60,
      normalModule: 2.5,
      normalPressureAngleDeg: 20,
      helixAngleDeg: 15,
      helixHand: 'right', // Opposite hand: valid!
      faceWidth: 40
    };

    const pair = calculateGearPairGeometry({
      pinion: helicalPinion,
      wheel: helicalWheel
    });

    assert.strictEqual(pair.isPairCompatible, true);
    // Face contact ratio: eps_beta = bw * sin(beta) / (pi * mn) = 40 * sin(15 deg) / (pi * 2.5)
    // 40 * 0.258819 / 7.85398 = 10.3528 / 7.85398 = 1.318
    assert.strictEqual(pair.faceContactRatio, 1.318);
    assert.ok(pair.totalContactRatio > pair.profileContactRatio);
  });

  test('Rejects incompatible gear pairs with explicit diagnostics', () => {
    // Mismatched module
    const badModPair = calculateGearPairGeometry({
      pinion,
      wheel: { ...wheel, normalModule: 3.5 }
    });
    assert.strictEqual(badModPair.isPairCompatible, false);
    assert.ok(badModPair.compatibilityErrors.some((e) => e.includes('Module mismatch')));

    // Same helical hand for external engagement (both left)
    const sameHandPair = calculateGearPairGeometry({
      pinion: {
        ...pinion,
        type: 'helical',
        helixAngleDeg: 15,
        helixHand: 'left'
      },
      wheel: {
        ...wheel,
        type: 'helical',
        helixAngleDeg: 15,
        helixHand: 'left'
      }
    });
    assert.strictEqual(sameHandPair.isPairCompatible, false);
    assert.ok(
      sameHandPair.compatibilityErrors.some((e) => e.includes('Helical hand conflict'))
    );
  });
});

describe('Stage 10: Gear Kinematics & Power Transmission', () => {
  test('Benchmark 1: Power, torque, speed, and efficiency conversion', () => {
    // Pinion: n1 = 1500 rpm, P = 15 kW, z1 = 20, z2 = 50 (i = 2.5)
    // omega1 = 2 * pi * 1500 / 60 = 157.0796 rad/s
    // T1 = (15 * 1000) / 157.0796 = 95.493 N·m
    // Output speed n2 = -1500 / 2.5 = -600 rpm (counter-rotating)
    // Efficiency eta = 0.98 => T2 = 95.493 * 2.5 * 0.98 = 233.958 N·m
    // Pout = 15 * 0.98 = 14.70 kW, Ploss = 0.30 kW
    const kin = calculateGearKinematics(
      {
        pinionSpeedRpm: 1500,
        transmittedPowerKw: 15,
        pinionToothCount: 20,
        wheelToothCount: 50,
        efficiency: 0.98,
        pinionRotationDirection: 'CW'
      },
      60.0 // Pinion pitch diameter d1 = 60 mm
    );

    assert.strictEqual(kin.gearRatio, 2.5);
    assert.strictEqual(kin.pinionTorqueNm, 95.49);
    assert.strictEqual(kin.wheelTorqueNm, 233.96);
    assert.strictEqual(kin.wheelSpeedRpm, -600.0);
    assert.strictEqual(kin.wheelSpeedMagnitudeRpm, 600.0);
    assert.strictEqual(kin.outputPowerKw, 14.7);
    assert.strictEqual(kin.powerLossKw, 0.3);
    assert.strictEqual(kin.wheelRotation, 'CCW');
    // Pitch line velocity: v = pi * 60 * 1500 / 60000 = 4.71 m/s
    assert.strictEqual(kin.pitchLineVelocityMs, 4.71);
  });

  test('Benchmark 2: Direct torque input converts to equivalent power', () => {
    const kin = calculateGearKinematics({
      pinionSpeedRpm: 1000,
      pinionTorqueNm: 200,
      pinionToothCount: 25,
      wheelToothCount: 75
    });

    // P = T * omega / 1000 = 200 * (2 * pi * 1000 / 60) / 1000 = 20.944 kW
    assert.strictEqual(kin.inputPowerKw, 20.944);
    assert.strictEqual(kin.gearRatio, 3.0);
  });
});

describe('Stage 10: 3D Gear Mesh-Force Engine', () => {
  test('Benchmark 1: External spur gear mesh forces (T1 = 200 N·m, d1 = 80 mm, alpha = 20 deg)', () => {
    // Ft = 2000 * 200 / 80 = 5000 N
    // Fr = 5000 * tan(20 deg) = 5000 * 0.3639702 = 1819.85 N
    // Fa = 0 N (spur)
    // Fn = 5000 / cos(20 deg) = 5000 / 0.9396926 = 5320.89 N
    // Mating wheel at theta = 90 deg (top, +y):
    // Pinion rotation CW:
    // Radial on pinion acts towards shaft center => Fy_radial = -Fr = -1819.85 N
    // Motion at top moves towards -z; reaction opposes motion => Fz_tangential = -Ft = -5000 N
    // Total on pinion: Fy = -1819.85 N, Fz = -5000.0 N, Fx = 0 N
    const forces = calculateMeshForces({
      pinionTorqueNm: 200,
      pinionPitchDiameterMm: 80,
      normalPressureAngleDeg: 20,
      transversePressureAngleDeg: 20,
      helixAngleDeg: 0,
      pinionHelixHand: 'none',
      pinionRotationDirection: 'CW',
      meshOrientationAngleDeg: 90
    });

    assert.strictEqual(forces.tangentialForceN, 5000.0);
    assert.strictEqual(forces.radialForceN, 1819.85);
    assert.strictEqual(forces.axialForceN, 0.0);
    assert.strictEqual(forces.normalForceN, 5320.89);

    assert.strictEqual(forces.pinionForceGlobalN.Fx, 0.0);
    assert.strictEqual(forces.pinionForceGlobalN.Fy, -1819.85);
    assert.strictEqual(forces.pinionForceGlobalN.Fz, -5000.0);

    // Wheel receives exact opposite reaction (Newton's 3rd Law)
    assert.strictEqual(forces.wheelForceGlobalN.Fx, 0.0);
    assert.strictEqual(forces.wheelForceGlobalN.Fy, 1819.85);
    assert.strictEqual(forces.wheelForceGlobalN.Fz, 5000.0);
    assert.strictEqual(forces.isEquilibriumEnforced, true);
  });

  test('Benchmark 2: Helical gear mesh forces and axial thrust sign (T1 = 300 N·m, d1 = 100 mm, beta = 20 deg RH, CW)', () => {
    // Ft = 2000 * 300 / 100 = 6000 N
    // alphat: tan(alphat) = tan(20 deg) / cos(20 deg) = 0.387329 => alphat = 21.173 deg
    // Fr = Ft * tan(alphat) = 6000 * 0.387329 = 2323.97 N
    // Fa = Ft * tan(beta) = 6000 * tan(20 deg) = 6000 * 0.3639702 = 2183.82 N
    // Fn = Ft / (cos(20 deg) * cos(20 deg)) = 6000 / (0.9396926^2) = 6000 / 0.883022 = 6794.85 N
    // RH + CW rotation => axial thrust on driver points in +x direction!
    // Fx = +2183.82 N
    // Contact point at y = +50 mm, z = 0 (for theta = 90 deg)
    // Eccentric overturning moment M = r x F:
    // r = (0, 0.050 m, 0)
    // F = (2183.82, 0, 0)
    // Mz = -y * Fx = -0.050 * 2183.82 = -109.19 N·m
    const forces = calculateMeshForces({
      pinionTorqueNm: 300,
      pinionPitchDiameterMm: 100,
      normalPressureAngleDeg: 20,
      transversePressureAngleDeg: 21.173,
      helixAngleDeg: 20,
      pinionHelixHand: 'right',
      pinionRotationDirection: 'CW',
      meshOrientationAngleDeg: 90
    });

    assert.strictEqual(forces.tangentialForceN, 6000.0);
    assert.strictEqual(forces.radialForceN, 2323.99);
    assert.strictEqual(forces.axialForceN, 2183.82);
    assert.strictEqual(forces.normalForceN, 6794.85);

    assert.strictEqual(forces.pinionForceGlobalN.Fx, 2183.82);
    assert.strictEqual(forces.pinionOverturningMomentGlobalNm.Mz, -109.191);

    // Reversing helix hand to 'left' reverses axial thrust direction to -x
    const lhForces = calculateMeshForces({
      pinionTorqueNm: 300,
      pinionPitchDiameterMm: 100,
      normalPressureAngleDeg: 20,
      transversePressureAngleDeg: 21.173,
      helixAngleDeg: 20,
      pinionHelixHand: 'left',
      pinionRotationDirection: 'CW',
      meshOrientationAngleDeg: 90
    });
    assert.strictEqual(lhForces.pinionForceGlobalN.Fx, -2183.82);
    assert.strictEqual(lhForces.pinionOverturningMomentGlobalNm.Mz, 109.191);
  });
});

describe('Stage 10: Shaft & Bearing Integration with Stage 08 Equilibrium Solver', () => {
  test('Integrates gear mesh loads into simply supported shaft and solves reactions', () => {
    // Shaft: Length L = 300 mm, Bearings at xA = 50 mm, xB = 250 mm (span = 200 mm)
    // Gear mounted at midspan xGear = 150 mm
    // Mesh forces on pinion:
    // Fy = -2000 N, Fz = -4000 N, Fx = 1000 N (with overturning moment Mz = -50 N·m = -50,000 N·mm)
    const meshForces = calculateMeshForces({
      pinionTorqueNm: 200,
      pinionPitchDiameterMm: 100,
      normalPressureAngleDeg: 20,
      transversePressureAngleDeg: 20,
      helixAngleDeg: 0,
      pinionHelixHand: 'none',
      pinionRotationDirection: 'CW',
      meshOrientationAngleDeg: 90
    });

    const integration = integrateGearWithShaft({
      shaftLengthMm: 300,
      bearingStationAMm: 50,
      bearingStationBMm: 250,
      gearStationMm: 150,
      meshForces,
      targetGear: 'pinion',
      supportArrangement: 'locating_floating',
      locatingStation: 'A',
      dynamicCapacityA: 28000, // N (e.g. 6207 ball bearing)
      dynamicCapacityB: 28000,
      shaftRpm: 1500
    });

    // Check equilibrium residual is essentially zero (< 1e-5 N)
    assert.strictEqual(integration.residuals.isEquilibriumSatisfied, true);
    assert.ok(Math.abs(integration.residuals.forceY) < 1e-4);
    assert.ok(Math.abs(integration.residuals.forceZ) < 1e-4);

    // Because gear is at exact midpoint of span (150 mm is halfway between 50 and 250 mm),
    // and Mz = 0 for spur gear, radial loads split exactly 50/50:
    // With d1 = 100 mm, T = 200 Nm => Ft = 4000 N, Fr = 1455.88 N
    // Fy_total = -1455.88 N => RyA = RyB = +727.94 N
    // Fz_total = -4000.0 N => RzA = RzB = +2000.0 N
    // FrA = FrB = sqrt(727.94^2 + 2000^2) = 2128.36 N
    assert.strictEqual(integration.reactionA.Ry, 727.94);
    assert.strictEqual(integration.reactionB.Ry, 727.94);
    assert.strictEqual(integration.reactionA.Rz, 2000.0);
    assert.strictEqual(integration.reactionB.Rz, 2000.0);
    assert.strictEqual(integration.reactionA.radialResultantN, 2128.36);
    assert.strictEqual(integration.reactionB.radialResultantN, 2128.36);

    // Life calculation is populated
    assert.ok(integration.bearingLifeA);
    assert.ok(integration.bearingLifeA.l10Hours > 0);
  });

  test('Warns when gear is mounted at an overhung station', () => {
    const meshForces = calculateMeshForces({
      pinionTorqueNm: 100,
      pinionPitchDiameterMm: 60,
      normalPressureAngleDeg: 20,
      transversePressureAngleDeg: 20,
      helixAngleDeg: 0,
      pinionHelixHand: 'none',
      pinionRotationDirection: 'CW'
    });

    // Overhung mount: xGear = 270 mm > xB = 250 mm
    const result = integrateGearWithShaft({
      shaftLengthMm: 300,
      bearingStationAMm: 50,
      bearingStationBMm: 250,
      gearStationMm: 270,
      meshForces,
      targetGear: 'pinion'
    });

    assert.ok(result.warnings.some((w) => w.includes('overhung station')));
    assert.strictEqual(result.residuals.isEquilibriumSatisfied, true);
  });
});
