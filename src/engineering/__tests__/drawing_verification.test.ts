import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { runDesignVerification } from '../drawing/drawingVerification';
import type { DesignParameters, Material, AnalysisResult } from '../../types';

describe('9-Point Engineering Design Verification Matrix Tests', () => {
  const validMaterial: Material = {
    id: 'aisi-4140',
    name: 'AISI 4140 Steel',
    category: 'Alloy Steel',
    yieldStrength: 415,
    tensileStrength: 655,
    density: 7850,
    elasticModulus: 210,
    poissonsRatio: 0.29,
    thermalExpansion: 12.3,
    costCategory: 'Medium',
    description: 'High tensile alloy steel',
  };

  const validParams: DesignParameters = {
    materialId: 'aisi-4140',
    diameter: 45,
    length: 320,
    torque: 500,
    force: 2500,
    rpm: 1450,
    safetyFactor: 2.0,
    temperature: 20,
  };

  const passingAnalysis: AnalysisResult = {
    shearStress: 28,
    bendingStress: 85,
    vonMisesStress: 155.4,
    equivalentStress: 162.1,
    yieldStrength: 415,
    factorOfSafety: 2.67,
    maxDeflection: 0.12,
    torqueCapacity: 1200,
    fatigueLife: 1e6,
    status: 'pass',
    statusMessage: 'OK',
  };

  it('evaluates all 9 verification categories and passes a compliant design', () => {
    const report = runDesignVerification(validParams, validMaterial, passingAnalysis);

    assert.strictEqual(report.totalChecks, 9);
    assert.strictEqual(report.failedCount, 0);
    assert.strictEqual(report.overallStatus, 'Passed');

    const categories = report.checks.map((c) => c.category);
    assert.ok(categories.includes('GEOMETRY'));
    assert.ok(categories.includes('DIMENSIONS'));
    assert.ok(categories.includes('INPUTS'));
    assert.ok(categories.includes('MATERIAL'));
    assert.ok(categories.includes('CALCULATIONS'));
    assert.ok(categories.includes('SAFETY_FACTOR'));
    assert.ok(categories.includes('DRAWING'));
    assert.ok(categories.includes('TOLERANCES'));
    assert.ok(categories.includes('WARNINGS'));

    // Check specific results
    const geomCheck = report.checks.find((c) => c.category === 'GEOMETRY')!;
    assert.strictEqual(geomCheck.status, 'Passed');

    const fosCheck = report.checks.find((c) => c.category === 'SAFETY_FACTOR')!;
    assert.strictEqual(fosCheck.status, 'Passed');
  });

  it('flags warning when slenderness ratio L/D > 40', () => {
    const slenderParams: DesignParameters = {
      ...validParams,
      diameter: 15,
      length: 800, // L/D = 53.3 > 40
    };

    const report = runDesignVerification(slenderParams, validMaterial, passingAnalysis);
    const geomCheck = report.checks.find((c) => c.category === 'GEOMETRY')!;

    assert.strictEqual(geomCheck.status, 'Warning');
    assert.match(geomCheck.message, /High slenderness ratio/);
  });

  it('fails verification when safety factor is below 1.0 (plastic yield failure)', () => {
    const failingAnalysis: AnalysisResult = {
      ...passingAnalysis,
      vonMisesStress: 480,
      factorOfSafety: 0.86,
      status: 'fail',
      statusMessage: 'Safety factor below required limit',
    };

    const report = runDesignVerification(validParams, validMaterial, failingAnalysis);
    const fosCheck = report.checks.find((c) => c.category === 'SAFETY_FACTOR')!;

    assert.strictEqual(fosCheck.status, 'Failed');
    assert.strictEqual(report.overallStatus, 'Failed');
    assert.match(fosCheck.message, /CRITICAL FAILURE/);
  });

  it('marks calculations and safety factor as "Not checked" when analysis has not run', () => {
    const report = runDesignVerification(validParams, validMaterial, null);

    const calcCheck = report.checks.find((c) => c.category === 'CALCULATIONS')!;
    assert.strictEqual(calcCheck.status, 'Not checked');

    const fosCheck = report.checks.find((c) => c.category === 'SAFETY_FACTOR')!;
    assert.strictEqual(fosCheck.status, 'Not checked');

    assert.strictEqual(report.overallStatus, 'Not checked');
  });

  it('fails material check if no certified material is assigned', () => {
    const report = runDesignVerification(validParams, null, passingAnalysis);

    const matCheck = report.checks.find((c) => c.category === 'MATERIAL')!;
    assert.strictEqual(matCheck.status, 'Failed');
    assert.strictEqual(report.overallStatus, 'Failed');
  });
});
