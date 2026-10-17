import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  toMeters,
  fromMeters,
  toNewtonMeters,
  fromNewtonMeters,
  toPascals,
  fromPascals,
  toNewtons,
  fromNewtons,
  toWatts,
  fromWatts,
  formatEngineeringValue
} from '../units.ts';

import { validateShaftInputs } from '../validation/inputValidation.ts';

import {
  calculateShaftTorsion,
  calculateRequiredTorsionDiameter
} from '../calculations/torsion.ts';

import { calculateShaftBending } from '../calculations/bending.ts';
import { calculateCombinedStress } from '../calculations/combinedStress.ts';
import { calculateShaftDeflection } from '../calculations/deflection.ts';
import { calculatePowerTransmission } from '../calculations/power.ts';
import { calculateFactorOfSafety } from '../calculations/safetyFactor.ts';
import { calculateFullShaftAnalysis } from '../calculations/shaft.ts';
import {
  calculateShaftStress,
  calculateRequiredShaftDiameter,
  calculateBendingStress,
  calculatePower,
  calculateDeflection,
  calculateFactorOfSafetyTool,
  runFullShaftAnalysis
} from '../tools/copilotTools.ts';

describe('Engineering Unit Conversions', () => {
  it('converts lengths accurately (mm, m, inch)', () => {
    assert.strictEqual(toMeters(1000, 'mm'), 1.0);
    assert.strictEqual(toMeters({ value: 25.4, unit: 'mm' }), 0.0254);
    assert.strictEqual(toMeters({ value: 1, unit: 'm' }), 1.0);
    assert.strictEqual(toMeters({ value: 1, unit: 'inch' }), 0.0254);
    assert.strictEqual(fromMeters(0.0254, 'inch'), 1.0);
    assert.strictEqual(fromMeters(1.0, 'mm'), 1000);
  });

  it('converts torques accurately (N·m, N·mm, lb-ft)', () => {
    assert.strictEqual(toNewtonMeters(500, 'N·m'), 500);
    assert.strictEqual(toNewtonMeters({ value: 1000, unit: 'N·mm' }), 1.0);
    const nmFromLbFt = toNewtonMeters({ value: 100, unit: 'lb-ft' });
    assert.ok(Math.abs(nmFromLbFt - 135.58) < 0.1);
    assert.strictEqual(fromNewtonMeters(1.0, 'N·mm'), 1000);
  });

  it('converts stresses accurately (Pa, MPa, GPa, psi)', () => {
    assert.strictEqual(toPascals(250, 'MPa'), 250e6);
    assert.strictEqual(toPascals({ value: 200, unit: 'GPa' }), 200e9);
    const paFromPsi = toPascals({ value: 1000, unit: 'psi' });
    assert.ok(Math.abs(paFromPsi - 6894757) < 10);
    assert.strictEqual(fromPascals(250e6, 'MPa'), 250);
  });

  it('converts forces accurately (N, kN, lbf)', () => {
    assert.strictEqual(toNewtons(5000, 'N'), 5000);
    assert.strictEqual(toNewtons({ value: 5, unit: 'kN' }), 5000);
    const nFromLbf = toNewtons({ value: 100, unit: 'lbf' });
    assert.ok(Math.abs(nFromLbf - 444.82) < 0.1);
  });

  it('converts power accurately (W, kW, hp)', () => {
    assert.strictEqual(toWatts(15, 'kW'), 15000);
    const hpFromWatts = fromWatts(745.7, 'hp');
    assert.ok(Math.abs(hpFromWatts - 1.0) < 0.01);
  });
});

describe('Input Validation & Safeguards', () => {
  it('detects zero or negative diameters', () => {
    const res = validateShaftInputs({ diameterMm: 0, lengthMm: 500 });
    assert.strictEqual(res.isValid, false);
    assert.ok(res.errors.some((e) => e.includes('positive non-zero')));
  });

  it('warns about high slenderness ratios L/d > 40', () => {
    const res = validateShaftInputs({ diameterMm: 10, lengthMm: 800 });
    assert.ok(res.warnings.some((w) => w.includes('slenderness ratio')));
  });

  it('passes valid parameters', () => {
    const res = validateShaftInputs({ diameterMm: 45, lengthMm: 320, torqueNm: 420, forceN: 2500 });
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.errors.length, 0);
  });
});

describe('Torsional Stress (Textbook Verification)', () => {
  it('computes polar inertia and shear stress for d=50mm, T=1000Nm', () => {
    // Textbook case:
    // d = 0.05m -> J = pi * 0.05^4 / 32 = 6.135923e-7 m^4
    // tau = 16 * 1000 / (pi * 0.05^3) = 40.743665 MPa
    const result = calculateShaftTorsion({
      torque: 1000,
      diameter: 50,
      yieldStrength: 250,
      targetSafetyFactor: 2.0
    });

    assert.ok(Math.abs(result.result.shearStressMPa - 40.74) < 0.1);
    assert.ok(Math.abs(result.result.polarMomentOfInertia - 6.1359e-7) < 1e-10);
    // Allowable shear for Sy=250, n=2: 250 / 4 = 62.5 MPa
    assert.strictEqual(result.result.allowableShearStressMPa, 62.5);
    assert.strictEqual(result.status, 'pass');
    assert.ok(result.disclaimer.includes('Engineer review required'));
  });

  it('calculates minimum required shaft diameter', () => {
    const req = calculateRequiredTorsionDiameter(1000, 'N·m', 62.5);
    // d_min = (16 * 1000 / (pi * 62.5e6))^(1/3) = 0.04335 m = 43.35 mm
    assert.ok(Math.abs(req.requiredDiameterMm - 43.35) < 0.2);
  });
});

describe('Bending Stress (Textbook Verification)', () => {
  it('computes moment of inertia and bending stress for d=50mm, F=5000N, L=1000mm', () => {
    // M = F * L / 4 = 5000 * 1 / 4 = 1250 N·m
    // I = pi * 0.05^4 / 64 = 3.06796e-7 m^4
    // sigma_b = 32 * 1250 / (pi * 0.05^3) = 101.859 MPa
    const bending = calculateShaftBending({
      force: 5000,
      length: 1000,
      diameter: 50,
      allowableYieldStrength: 250
    });

    assert.strictEqual(bending.result.bendingMomentNm, 1250);
    assert.ok(Math.abs(bending.result.bendingStressMPa - 101.86) < 0.1);
    assert.strictEqual(bending.status, 'pass');
  });
});

describe('Combined Stress: Von Mises vs Tresca Criteria', () => {
  it('explicitly calculates Von Mises and Tresca equivalent stresses and enforces Tresca >= Von Mises', () => {
    const sigma_b = 101.859;
    const tau = 40.744;
    const Sy = 250;

    const vm = calculateCombinedStress({
      bendingStressMPa: sigma_b,
      shearStressMPa: tau,
      yieldStrengthMPa: Sy,
      criterion: 'Von Mises',
      targetSafetyFactor: 1.5
    });

    const tresca = calculateCombinedStress({
      bendingStressMPa: sigma_b,
      shearStressMPa: tau,
      yieldStrengthMPa: Sy,
      criterion: 'Tresca',
      targetSafetyFactor: 1.5
    });

    assert.strictEqual(vm.result.criterion, 'Von Mises');
    assert.strictEqual(tresca.result.criterion, 'Tresca');

    // Expected:
    // Von Mises: sqrt(101.859^2 + 3 * 40.744^2) = 123.92 MPa
    // Tresca: sqrt(101.859^2 + 4 * 40.744^2) = 130.44 MPa
    assert.ok(Math.abs(vm.result.equivalentStressMPa - 123.92) < 0.2);
    assert.ok(Math.abs(tresca.result.equivalentStressMPa - 130.44) < 0.2);

    // Theory requires Tresca equivalent stress >= Von Mises equivalent stress
    assert.ok(tresca.result.equivalentStressMPa >= vm.result.equivalentStressMPa);
    // Consequently FoS_vm >= FoS_tresca
    assert.ok(vm.result.factorOfSafety >= tresca.result.factorOfSafety);
  });
});

describe('Shaft Deflection (Simply Supported Central Point Load)', () => {
  it('computes deflection delta = FL^3 / (48EI)', () => {
    // F = 5000 N, L = 1 m, E = 200 GPa, d = 0.05 m
    // delta = 5000 * 1^3 / (48 * 200e9 * 3.06796e-7) = 1.6976 mm
    const defl = calculateShaftDeflection({
      force: 5000,
      length: 1000,
      diameter: 50,
      elasticModulus: 200
    });

    assert.strictEqual(defl.model, 'Simply supported beam, central point load');
    assert.ok(Math.abs(defl.result.maxDeflectionMm - 1.698) < 0.02);
  });
});

describe('Power Transmission', () => {
  it('computes power for T=100Nm at 1800 RPM', () => {
    // omega = 2 * pi * 1800 / 60 = 188.495 rad/s
    // P = 100 * 188.495 = 18849.56 W = 18.85 kW = 25.28 hp
    const power = calculatePowerTransmission({
      torque: 100,
      rpm: 1800
    });

    assert.ok(Math.abs(power.result.angularVelocityRadS - 188.5) < 0.2);
    assert.ok(Math.abs(power.result.powerKW - 18.85) < 0.1);
    assert.ok(Math.abs(power.result.powerHp - 25.28) < 0.1);
  });
});

describe('Safety Factor Calculation', () => {
  it('computes FoS = Sy / sigma and margin %', () => {
    const sf = calculateFactorOfSafety({
      strengthMPa: 300,
      appliedStressMPa: 150,
      targetSafetyFactor: 1.5
    });

    assert.strictEqual(sf.result.factorOfSafety, 2.0);
    assert.strictEqual(sf.status, 'pass');
    assert.ok(sf.result.marginPercent > 0);
  });
});

describe('Composite Shaft Analysis & Copilot Tools', () => {
  it('runs composite analysis unifying all calculations', () => {
    const comp = calculateFullShaftAnalysis({
      torqueNm: 420,
      radialForceN: 2500,
      diameterMm: 45,
      lengthMm: 320,
      rpm: 1450,
      yieldStrengthMPa: 415,
      tensileStrengthMPa: 650,
      elasticModulusGPa: 205,
      targetSafetyFactor: 2.0,
      operatingTempC: 25,
      criterion: 'Von Mises'
    });

    assert.ok(comp.torsion.result.shearStressMPa > 0);
    assert.ok(comp.bending.result.bendingStressMPa > 0);
    assert.ok(comp.combinedStress.result.equivalentStressMPa > 0);
    assert.ok(comp.deflection.result.maxDeflectionMm > 0);
    assert.ok(comp.power.result.powerKW > 0);
    assert.ok(comp.summary.includes('Von Mises'));
    assert.ok(['pass', 'warning', 'fail'].includes(comp.overallStatus));
  });

  it('runs Copilot tool functions without errors', () => {
    const stressTool = calculateShaftStress({ torque: 420, diameter: 45 });
    assert.ok(stressTool.result.shearStressMPa > 0);

    const reqDiaTool = calculateRequiredShaftDiameter({ torque: 420, yieldStrength: 415, safetyFactor: 2 });
    assert.ok(reqDiaTool.requiredDiameterMm > 0);

    const bendingTool = calculateBendingStress({ force: 2500, length: 320, diameter: 45 });
    assert.ok(bendingTool.result.bendingStressMPa > 0);

    const powerTool = calculatePower({ torque: 420, rpm: 1450 });
    assert.ok(powerTool.result.powerKW > 0);

    const deflTool = calculateDeflection({ force: 2500, length: 320, diameter: 45, elasticModulus: 205 });
    assert.ok(deflTool.result.maxDeflectionMm > 0);

    const fosTool = calculateFactorOfSafetyTool({ strengthMPa: 415, appliedStressMPa: 120, targetSafetyFactor: 2.0 });
    assert.ok(fosTool.result.factorOfSafety > 0);

    const fullTool = runFullShaftAnalysis({
      torqueNm: 420,
      radialForceN: 2500,
      diameterMm: 45,
      lengthMm: 320,
      rpm: 1450,
      yieldStrengthMPa: 415,
      tensileStrengthMPa: 650,
      elasticModulusGPa: 205,
      targetSafetyFactor: 2.0
    });
    assert.ok(fullTool.overallStatus !== undefined);
  });
});
