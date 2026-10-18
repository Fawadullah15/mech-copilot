import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { materials, getMaterialById } from '../../data/materials';
import {
  evaluateMaterialSuitability,
  rankMaterialsForDesign,
  generateStiffnessStrengthInsight,
  getShearModulusGPa,
  DESIGN_LIMITS,
} from '../constraints';
import type { DesignParameters } from '../../types';

describe('Material Intelligence & Metallurgy Verification Tests', () => {
  test('all 10 materials have complete verified metadata and specifications', () => {
    assert.equal(materials.length, 10, 'Must have exactly 10 production materials');

    const expectedIds = [
      'aisi-4140',
      'aisi-1045',
      'al-6061-t6',
      'ss-304',
      'ti-grade-5',
      'aisi-4340',
      'inconel-718',
      'bronze-c932',
      'ss-316',
      'al-7075-t6',
    ];

    for (const id of expectedIds) {
      const mat = getMaterialById(id);
      assert.ok(mat, `Material ${id} must exist in registry`);
      assert.ok(mat.designation, `${id} must have UNS designation`);
      assert.ok(mat.condition, `${id} must have condition/heat treat specified`);
      assert.ok(mat.specification, `${id} must have standard ASTM/AMS specification`);
      assert.ok(mat.sourceCitation, `${id} must have bibliographic source citation`);
      assert.equal(mat.verificationStatus, 'verified', `${id} must be verified against standards`);
      assert.ok(mat.maxOperatingTempC && mat.maxOperatingTempC > 0, `${id} must have max operating temp`);
      assert.ok(mat.machinabilityPercent && mat.machinabilityPercent > 0, `${id} must have machinability`);
      assert.ok(mat.assumptions && mat.assumptions.length > 0, `${id} must state engineering assumptions`);
      assert.ok(mat.limitations && mat.limitations.length > 0, `${id} must state engineering limitations`);
    }
  });

  test('shear modulus G satisfies isotropic elasticity G = E / [2*(1+nu)] within 1%', () => {
    for (const mat of materials) {
      const G_calculated = mat.elasticModulus / (2 * (1 + mat.poissonsRatio));
      const G_tabulated = getShearModulusGPa(mat);

      const percentDiff = Math.abs((G_tabulated - G_calculated) / G_calculated) * 100;
      assert.ok(
        percentDiff < 1.0,
        `Material ${mat.name} shear modulus mismatch: G_tab=${G_tabulated}, G_calc=${G_calculated.toFixed(2)} (${percentDiff.toFixed(2)}% diff)`
      );
    }
  });

  test('temperature limits reflect real metallurgical behavior', () => {
    const al6061 = getMaterialById('al-6061-t6')!;
    const inconel718 = getMaterialById('inconel-718')!;
    const steel4140 = getMaterialById('aisi-4140')!;

    assert.equal(al6061.maxOperatingTempC, 150, '6061-T6 over-ages above 150°C');
    assert.equal(inconel718.maxOperatingTempC, 650, 'Inconel 718 maintains strength up to 650°C');
    assert.equal(steel4140.maxOperatingTempC, 425, '4140 steel max service temp is ~425°C');
  });
});

describe('Design Constraints & Decision Support Tests', () => {
  const nominalParams: DesignParameters = {
    materialId: 'aisi-4140',
    diameter: 45,
    length: 320,
    torque: 450,
    force: 2500,
    rpm: 1450,
    safetyFactor: 2.0,
    temperature: 50,
  };

  test('analytical torsional twist formula matches hand calculation (θ = TL / GJ)', () => {
    // Hand calculation:
    // d = 40 mm, L = 1000 mm, T = 500 Nm, G = 79.5 GPa
    // J = pi * 0.04^4 / 32 = 2.513274e-7 m^4
    // theta_rad = (500 * 1.0) / (79.5e9 * 2.513274e-7) = 0.025024 rad
    // theta_deg = 0.025024 * (180 / pi) = 1.4338 deg/m
    const mat = getMaterialById('aisi-4140')!;
    const testParams: DesignParameters = {
      ...nominalParams,
      diameter: 40,
      length: 1000,
      torque: 500,
      force: 0,
    };

    const evaluation = evaluateMaterialSuitability({ material: mat, params: testParams });
    const expectedTwist = (500 * 1.0) / (79.5e9 * ((Math.PI * Math.pow(0.04, 4)) / 32)) * (180 / Math.PI);

    assert.ok(
      Math.abs(evaluation.torsionalTwistDegPerMeter - expectedTwist) < 0.01,
      `Calculated twist (${evaluation.torsionalTwistDegPerMeter}) matches analytical (${expectedTwist})`
    );

    // Since twist is 1.43°/m > 1.0°/m, twist constraint should be 'warning'
    const twistConstraint = evaluation.allConstraints.find((c) => c.type === 'torsional_twist')!;
    assert.equal(twistConstraint.status, 'warning');
  });

  test('bearing journal slope matches beam theory (θ = FL² / 16EI)', () => {
    const mat = getMaterialById('aisi-4140')!;
    const testParams: DesignParameters = {
      ...nominalParams,
      diameter: 40,
      length: 500,
      force: 5000,
      torque: 0,
    };

    const evaluation = evaluateMaterialSuitability({ material: mat, params: testParams });
    const I = (Math.PI * Math.pow(0.04, 4)) / 64;
    const E = 205e9;
    const expectedSlope = (5000 * Math.pow(0.5, 2)) / (16 * E * I);

    assert.ok(
      Math.abs(evaluation.bearingSlopeRad - expectedSlope) < 1e-6,
      `Slope (${evaluation.bearingSlopeRad}) matches analytical (${expectedSlope})`
    );

    // Expected slope is ~0.00303 rad > 0.002 rad critical limit, so status must be 'fail'
    const slopeConstraint = evaluation.allConstraints.find((c) => c.type === 'bearing_slope')!;
    assert.equal(slopeConstraint.status, 'fail');
    assert.ok(slopeConstraint.message.includes('CRITICAL BEARING MISALIGNMENT'));
  });

  test('stiffness constancy law: carbon vs alloy steels have identical deflection and twist', () => {
    const steel1045 = getMaterialById('aisi-1045')!;
    const steel4140 = getMaterialById('aisi-4140')!;
    const steel4340 = getMaterialById('aisi-4340')!;

    const eval1045 = evaluateMaterialSuitability({ material: steel1045, params: nominalParams });
    const eval4140 = evaluateMaterialSuitability({ material: steel4140, params: nominalParams });
    const eval4340 = evaluateMaterialSuitability({ material: steel4340, params: nominalParams });

    // Both have E = 205 GPa, so deflection must be IDENTICAL within floating point precision
    assert.equal(
      eval1045.centerDeflectionMm.toFixed(5),
      eval4140.centerDeflectionMm.toFixed(5),
      '1045 and 4140 deflection must be identical'
    );
    assert.equal(
      eval4140.centerDeflectionMm.toFixed(5),
      eval4340.centerDeflectionMm.toFixed(5),
      '4140 and 4340 deflection must be identical'
    );

    // Torsional twist must be identical
    assert.equal(
      eval1045.torsionalTwistDegPerMeter.toFixed(4),
      eval4140.torsionalTwistDegPerMeter.toFixed(4),
      '1045 and 4140 torsional twist must be identical'
    );

    // But yield reserve / factor of safety must reflect the higher strength
    assert.ok(
      eval4140.factorOfSafety > eval1045.factorOfSafety,
      '4140 must have higher FoS than 1045'
    );
    assert.ok(
      eval4340.factorOfSafety > eval4140.factorOfSafety,
      '4340 must have higher FoS than 4140'
    );

    // Check explanation generator
    const insight = generateStiffnessStrengthInsight(steel1045, steel4140);
    assert.ok(insight.includes("Stiffness Constancy Law"));
    assert.ok(insight.includes("ZERO change in shaft deflection"));
  });

  test('temperature limit constraint detects thermal over-limit', () => {
    const al6061 = getMaterialById('al-6061-t6')!;
    const hotParams: DesignParameters = {
      ...nominalParams,
      temperature: 180, // Exceeds 150°C rating
    };

    const evaluation = evaluateMaterialSuitability({ material: al6061, params: hotParams });
    const tempConstraint = evaluation.allConstraints.find((c) => c.type === 'temperature')!;
    assert.equal(tempConstraint.status, 'fail');
    assert.ok(tempConstraint.message.includes('THERMAL OVERHEAT'));
  });

  test('slenderness ratio constraint detects excessive aspect ratio L/d > 40', () => {
    const mat = getMaterialById('aisi-4140')!;
    const slenderParams: DesignParameters = {
      ...nominalParams,
      diameter: 10,
      length: 500, // L/d = 50 > 40
    };

    const evaluation = evaluateMaterialSuitability({ material: mat, params: slenderParams });
    const slendernessConstraint = evaluation.allConstraints.find((c) => c.type === 'slenderness')!;
    assert.equal(slendernessConstraint.status, 'fail');
    assert.ok(slendernessConstraint.message.includes('EXCESSIVE SLENDERNESS'));
  });

  test('rankMaterialsForDesign returns valid sorted list of all 10 materials', () => {
    const rankings = rankMaterialsForDesign(materials, nominalParams);
    assert.equal(rankings.length, 10, 'Rankings must include all 10 materials');

    // First element should have high suitability
    const top = rankings[0];
    assert.ok(top.suitabilityScore >= rankings[rankings.length - 1].suitabilityScore);
    assert.ok(top.overallStatus === 'pass' || top.overallStatus === 'warning');
  });
});
