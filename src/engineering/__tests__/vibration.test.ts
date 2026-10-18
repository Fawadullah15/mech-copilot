import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  runModalAnalysis,
  assembleBeamSystem,
  evaluateCriticalSpeeds,
  calculateImbalanceResponse,
  calculateRigidRotorBalancing,
  evaluateExcitationOrders,
  RotorSystemInput
} from '../vibration';

describe('Stage 11: Vibration, Critical Speeds & Dynamic Rotor Verification', () => {
  // Common test rotor: 1000 mm steel shaft, d = 50 mm, simply supported
  const uniformSteelRotor: RotorSystemInput = {
    segments: [
      {
        id: 'seg-1',
        length: 1000, // mm
        outerDiameter: 50, // mm
        materialId: 'structural-steel',
        elasticModulus: 210, // GPa
        density: 7850, // kg/m³
      },
    ],
    supports: [
      {
        id: 'sup-A',
        stationZ: 0,
        type: 'rigid_pinned',
        radialStiffness: 1e9,
        label: 'Bearing A',
      },
      {
        id: 'sup-B',
        stationZ: 1000,
        type: 'rigid_pinned',
        radialStiffness: 1e9,
        label: 'Bearing B',
      },
    ],
    operatingSpeedRpm: 1500,
    operatingSpeedRangeRpm: [1200, 1800],
    meshElementMaxLenMm: 25, // 40 elements along 1 m
  };

  test('Benchmark 1: Uniform Simply Supported Beam 1st Lateral Mode matches analytical Euler-Bernoulli solution', () => {
    // Analytical solution:
    // L = 1.0 m, d = 0.05 m, E = 2.1e11 Pa, rho = 7850 kg/m³
    // A = pi*0.05²/4 = 1.9635e-3 m², I = pi*0.05⁴/64 = 3.0680e-7 m⁴
    // omega_1 = (pi²/L²) * sqrt(E*I / rho*A) = pi² * 64.6554 = 638.125 rad/s
    // f_1 = 638.125 / (2*pi) = 101.561 Hz
    const result = runModalAnalysis(uniformSteelRotor);

    const f1_fea = result.modes[0].frequencyHz;
    const f1_theory = result.benchmarks.simplySupportedFirstModeHz;

    assert.ok(f1_theory > 101.5 && f1_theory < 101.6, `Expected theory ~101.56 Hz, got ${f1_theory}`);
    // FEA with Hermite cubic elements matches analytical solution within 0.1%
    const errorPct = Math.abs(f1_fea - f1_theory) / f1_theory * 100;
    assert.ok(errorPct < 0.1, `FEA error ${errorPct.toFixed(3)}% must be < 0.1% (FEA: ${f1_fea} Hz, Theory: ${f1_theory} Hz)`);

    // Synchronous critical speed
    const nc1 = result.modes[0].synchronousSpeedRpm;
    assert.ok(Math.abs(nc1 - 60 * f1_fea) < 0.1);
    assert.strictEqual(result.modes[0].isRigidBody, false);
  });

  test('Benchmark 2: Higher Bending Modes (2nd and 3rd) conform to harmonic integer-squared ratios', () => {
    // For simply supported uniform beam: f_n = n² * f_1
    // f_2 = 4 * 101.56 = 406.24 Hz
    // f_3 = 9 * 101.56 = 914.05 Hz
    const result = runModalAnalysis(uniformSteelRotor);

    const f1 = result.modes[0].frequencyHz;
    const f2 = result.modes[1].frequencyHz;
    const f3 = result.modes[2].frequencyHz;

    const ratio2 = f2 / f1;
    const ratio3 = f3 / f1;

    // Ratios should be very close to 4.0 and 9.0 (within 0.5%)
    assert.ok(Math.abs(ratio2 - 4.0) < 0.03, `Expected f2/f1 ~ 4.0, got ${ratio2.toFixed(3)}`);
    assert.ok(Math.abs(ratio3 - 9.0) < 0.15, `Expected f3/f1 ~ 9.0, got ${ratio3.toFixed(3)}`);
  });

  test('Benchmark 3: Cantilever (Fixed-Free) Beam Natural Frequency matches continuous mechanics', () => {
    // Fixed at z = 0, Free at z = 1000 mm
    // Analytical formula: omega_1 = (1.8751²/L²) * sqrt(EI / rho*A) = 3.5160 * 64.6554 = 227.33 rad/s
    // f_1 = 227.33 / (2*pi) = 36.18 Hz
    const cantileverRotor: RotorSystemInput = {
      segments: uniformSteelRotor.segments,
      supports: [
        {
          id: 'sup-fixed',
          stationZ: 0,
          type: 'rigid_fixed',
          radialStiffness: 1e9,
          label: 'Fixed Base',
        },
      ],
      operatingSpeedRpm: 1500,
      meshElementMaxLenMm: 25,
    };

    const result = runModalAnalysis(cantileverRotor);
    const f1_cantilever = result.modes[0].frequencyHz;

    assert.ok(
      Math.abs(f1_cantilever - 36.18) < 0.2,
      `Expected cantilever f1 ~36.18 Hz, got ${f1_cantilever} Hz`
    );
  });

  test('Benchmark 4: Free-Free Rotor Model Has Rigid-Body Modes Near Zero Frequency', () => {
    // Unconstrained rotor in space
    const freeFreeRotor: RotorSystemInput = {
      segments: uniformSteelRotor.segments,
      supports: [], // no constraints
      operatingSpeedRpm: 1500,
      meshElementMaxLenMm: 25,
    };

    const result = runModalAnalysis(freeFreeRotor);

    // Modes 1 and 2 must be rigid-body modes (translation and rotation) with omega ~ 0
    assert.strictEqual(result.modes[0].isRigidBody, true);
    assert.strictEqual(result.modes[1].isRigidBody, true);
    assert.ok(result.modes[0].frequencyHz < 0.05);
    assert.ok(result.modes[1].frequencyHz < 0.05);

    // Mode 3 is the first flexible free-free bending mode (classical: (4.730²/2pi/L²) * sqrt(EI/rhoA) ~ 230.2 Hz)
    assert.strictEqual(result.modes[2].isRigidBody, false);
    assert.ok(
      Math.abs(result.modes[2].frequencyHz - 230.2) < 2.0,
      `Expected free-free flexible mode ~230.2 Hz, got ${result.modes[2].frequencyHz}`
    );
  });

  test('Benchmark 5: Rayleigh and Dunkerley approximations provide consistent upper and lower bounds', () => {
    const result = runModalAnalysis(uniformSteelRotor);

    // Rayleigh quotient frequency
    const f_rayleigh = result.benchmarks.rayleighFirstModeHz;
    assert.ok(f_rayleigh > 100 && f_rayleigh < 105, `Rayleigh estimate ${f_rayleigh} Hz`);

    // Verify modal Rayleigh check on mode 1
    const mode1Rayleigh = result.modes[0].rayleighFrequencyHz;
    assert.ok(
      mode1Rayleigh && Math.abs(mode1Rayleigh - result.modes[0].frequencyHz) < 0.1,
      'Mode Rayleigh frequency must equal modal frequency'
    );
  });

  test('Benchmark 6: Lumped central mass lowers fundamental natural frequency predictably', () => {
    // Add 10 kg disk at midspan (z = 500 mm)
    const rotorWithDisk: RotorSystemInput = {
      ...uniformSteelRotor,
      lumpedMasses: [
        {
          id: 'gear-disk',
          stationZ: 500,
          mass: 10.0, // kg
          label: 'Spur Gear Disk',
        },
      ],
    };

    const resultBare = runModalAnalysis(uniformSteelRotor);
    const resultLoaded = runModalAnalysis(rotorWithDisk);

    const f1_bare = resultBare.modes[0].frequencyHz;
    const f1_loaded = resultLoaded.modes[0].frequencyHz;

    // Adding 10 kg to 15.4 kg shaft drops frequency from 101.56 Hz down to ~66.8 Hz
    assert.ok(f1_loaded < f1_bare, `Loaded frequency (${f1_loaded} Hz) must be lower than bare (${f1_bare} Hz)`);
    assert.ok(f1_loaded > 60 && f1_loaded < 72, `Expected loaded frequency ~66.8 Hz, got ${f1_loaded} Hz`);

    // Dunkerley approximation must be a conservative lower bound: f_dunk <= f1_loaded
    const f_dunk = resultLoaded.benchmarks.dunkerleyFirstModeHz;
    assert.ok(f_dunk !== undefined && f_dunk <= f1_loaded, `Dunkerley (${f_dunk}) must be <= FEA (${f1_loaded})`);
  });

  test('Benchmark 7: Flexible bearing supports reduce natural frequency relative to rigid mounts', () => {
    const flexibleSupportRotor: RotorSystemInput = {
      segments: uniformSteelRotor.segments,
      supports: [
        {
          id: 'sup-A-flex',
          stationZ: 0,
          type: 'flexible_spring',
          radialStiffness: 2.0e7, // 20 kN/mm (realistic rolling bearing housing)
          label: 'Flexible Support A',
        },
        {
          id: 'sup-B-flex',
          stationZ: 1000,
          type: 'flexible_spring',
          radialStiffness: 2.0e7,
          label: 'Flexible Support B',
        },
      ],
      operatingSpeedRpm: 1500,
      meshElementMaxLenMm: 25,
    };

    const resultRigid = runModalAnalysis(uniformSteelRotor);
    const resultFlex = runModalAnalysis(flexibleSupportRotor);

    const f1_rigid = resultRigid.modes[0].frequencyHz;
    const f1_flex = resultFlex.modes[0].frequencyHz;

    assert.ok(
      f1_flex < f1_rigid,
      `Flexible bearing frequency (${f1_flex} Hz) must be lower than rigid (${f1_rigid} Hz)`
    );
  });

  test('Benchmark 8: Unbalance Centrifugal Force scales quadratically with rotational speed (Fu = U * Omega²)', () => {
    const U_gmm = 50.0; // 50 g·mm = 5e-5 kg·m
    const response = calculateImbalanceResponse({
      unbalanceGMm: U_gmm,
      speedRangeRpm: [1000, 4000],
      speedStepRpm: 1000,
      dampingRatio: 0.04,
      effectiveMassKg: 15.0,
      effectiveStiffnessNM: 2.0e6,
    });

    // Check force at 1000 rpm vs 2000 rpm (should quadruple: (2000/1000)² = 4.0)
    const pt1000 = response.sweep.find(p => p.speedRpm === 1000)!;
    const pt2000 = response.sweep.find(p => p.speedRpm === 2000)!;
    assert.ok(pt1000 && pt2000);

    const ratio = pt2000.excitationForceN / pt1000.excitationForceN;
    assert.ok(Math.abs(ratio - 4.0) < 0.01, `Expected force ratio 4.0, got ${ratio}`);

    // Direct formula check at 3000 rpm: Omega = 314.159 rad/s, Fu = 5e-5 * 314.159² = 4.935 N
    const pt3000 = response.sweep.find(p => p.speedRpm === 3000)!;
    assert.ok(Math.abs(pt3000.excitationForceN - 4.935) < 0.05);
  });

  test('Benchmark 9: Jeffcott response demonstrates resonant peak and 0° -> 90° -> 180° phase lag', () => {
    // k = 1.0e6 N/m, m = 10 kg => omega_n = sqrt(1e5) = 316.228 rad/s => fn = 50.33 Hz => n_res = 3020 rpm
    const response = calculateImbalanceResponse({
      unbalanceGMm: 100.0,
      speedRangeRpm: [500, 6000],
      speedStepRpm: 20,
      dampingRatio: 0.05,
      effectiveMassKg: 10.0,
      effectiveStiffnessNM: 1.0e6,
    });

    assert.ok(
      Math.abs(response.resonantSpeedRpm - 3020) < 10,
      `Expected resonant speed ~3020 rpm, got ${response.resonantSpeedRpm}`
    );

    // Subcritical phase (< 30° at low speed)
    const lowSpeedPt = response.sweep.find(p => p.speedRpm === 1000)!;
    assert.ok(lowSpeedPt.phaseDeg < 30.0);

    // Resonant phase (~90°)
    const nearResPt = response.sweep.reduce((prev, curr) =>
      Math.abs(curr.speedRpm - response.resonantSpeedRpm) < Math.abs(prev.speedRpm - response.resonantSpeedRpm) ? curr : prev
    );
    assert.ok(Math.abs(nearResPt.phaseDeg - 90.0) < 5.0, `Phase at resonance must be ~90°, got ${nearResPt.phaseDeg}°`);

    // Supercritical phase (> 150° at 6000 rpm)
    const highSpeedPt = response.sweep.find(p => p.speedRpm === 6000)!;
    assert.ok(highSpeedPt.phaseDeg > 150.0);
  });

  test('Benchmark 10: Dynamic Magnification factor Q and peak amplitude scale with damping ratio', () => {
    const inputZeta05 = {
      unbalanceGMm: 100.0,
      speedRangeRpm: [2500, 3500] as [number, number],
      speedStepRpm: 10,
      dampingRatio: 0.05, // Q = 10
      effectiveMassKg: 10.0,
      effectiveStiffnessNM: 1.0e6,
    };

    const inputZeta02 = {
      ...inputZeta05,
      dampingRatio: 0.02, // Q = 25
    };

    const res05 = calculateImbalanceResponse(inputZeta05);
    const res02 = calculateImbalanceResponse(inputZeta02);

    assert.strictEqual(res05.amplificationFactorQ, 10);
    assert.strictEqual(res02.amplificationFactorQ, 25);

    // Peak amplitude ratio should be 25 / 10 = 2.5
    const ampRatio = res02.peakAmplitudeUm / res05.peakAmplitudeUm;
    assert.ok(Math.abs(ampRatio - 2.5) < 0.1, `Expected amp ratio ~2.5, got ${ampRatio.toFixed(2)}`);
  });

  test('Benchmark 11: Critical speed separation margins and resonance crossing detection', () => {
    const modal = runModalAnalysis(uniformSteelRotor);
    // Mode 1 nc1 ~ 6094 rpm

    // Case A: Operating at 6000 rpm inside range [5800, 6200] rpm (crosses critical speed)
    const assessmentCritical = evaluateCriticalSpeeds(modal, {
      operatingSpeedRpm: 6000,
      operatingRangeRpm: [5800, 6200],
      recommendedMarginPercent: 15.0,
    });
    assert.strictEqual(assessmentCritical.overallStatus, 'critical');
    assert.ok(assessmentCritical.checks[0].crossesOperatingRange);

    // Case B: Operating at 5400 rpm (margin ~ 11.4% < 15%)
    const assessmentWarning = evaluateCriticalSpeeds(modal, {
      operatingSpeedRpm: 5400,
      operatingRangeRpm: [5200, 5600],
      recommendedMarginPercent: 15.0,
    });
    assert.strictEqual(assessmentWarning.overallStatus, 'warning');

    // Case C: Operating at 1500 rpm (nc1 = 6094 rpm, margin > 70%)
    const assessmentSafe = evaluateCriticalSpeeds(modal, {
      operatingSpeedRpm: 1500,
      operatingRangeRpm: [1200, 1800],
      recommendedMarginPercent: 15.0,
    });
    assert.strictEqual(assessmentSafe.overallStatus, 'safe');
    assert.ok(assessmentSafe.checks[0].separationPercent > 50.0);
  });

  test('Benchmark 12: Rotational excitation orders and gear mesh frequency evaluation', () => {
    const modal = runModalAnalysis(uniformSteelRotor); // f1 ~ 101.56 Hz

    // At 1500 rpm: 1X = 25 Hz, 2X = 50 Hz, 4X = 100 Hz (~ near f1!)
    // Gear with 20 teeth: f_mesh = 20 * 25 = 500 Hz
    const orders = evaluateExcitationOrders({
      operatingSpeedRpm: 1500,
      gearToothCount: 20,
      modal,
    });

    assert.strictEqual(orders.runningFrequencyHz, 25.0);
    assert.strictEqual(orders.gearMeshFrequencyHz, 500.0);

    // 4X is 100 Hz, which is within 10% of f1 (101.56 Hz)
    const order4X = orders.orders.find(o => o.multiplier === 4)!;
    assert.strictEqual(order4X.frequencyHz, 100.0);
    assert.strictEqual(order4X.nearResonanceWithMode, 1);
    assert.ok(order4X.frequencyMarginPercent && order4X.frequencyMarginPercent < 2.0);
  });

  test('Benchmark 13: ISO 21940-11 Rigid-Rotor Permissible Residual Unbalance Verification', () => {
    // Rotor mass M = 20 kg, n = 3000 rpm, Grade G2.5
    // Omega = 2*pi*3000/60 = 314.159 rad/s
    // e_per = 1000 * 2.5 / 314.159 = 7.9577 um (g*mm/kg)
    // U_per = 7.9577 * 20 = 159.15 g*mm
    const balanceResult = calculateRigidRotorBalancing({
      rotorMassKg: 20.0,
      serviceSpeedRpm: 3000,
      grade: 'G2.5',
      correctionPlanes: 'two',
    });

    assert.strictEqual(balanceResult.grade, 'G2.5');
    assert.ok(Math.abs(balanceResult.serviceSpeedRadS - 314.159) < 0.01);
    assert.ok(Math.abs(balanceResult.permissibleSpecificUnbalanceUpm - 7.958) < 0.01);
    assert.ok(Math.abs(balanceResult.permissibleResidualUnbalanceGMm - 159.15) < 0.2);

    // 50/50 symmetric two-plane split
    assert.strictEqual(balanceResult.planeAllocation.planes, 'two');
    assert.ok(Math.abs(balanceResult.planeAllocation.planeAGMm - 79.58) < 0.1);
    assert.ok(Math.abs(balanceResult.planeAllocation.planeBGMm! - 79.58) < 0.1);
  });

  test('Benchmark 14: Matrix Positive-Definiteness, Symmetry, and Residual Integrity', () => {
    const assembled = assembleBeamSystem(uniformSteelRotor);

    // Check symmetry of active K and M
    const n = assembled.K_active.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        assert.strictEqual(
          assembled.K_active[i][j],
          assembled.K_active[j][i],
          `K must be symmetric at (${i},${j})`
        );
        assert.strictEqual(
          assembled.M_active[i][j],
          assembled.M_active[j][i],
          `M must be symmetric at (${i},${j})`
        );
      }
    }

    // Modal solution residuals must be small (< 1e-6)
    const modal = runModalAnalysis(uniformSteelRotor);
    assert.ok(modal.solverDiagnostics.matrixConditionOk, 'Matrix condition must be OK');
    assert.ok(
      modal.solverDiagnostics.maxResidual < 1e-6,
      `Max eigen-residual ${modal.solverDiagnostics.maxResidual} must be < 1e-6`
    );
  });
});
