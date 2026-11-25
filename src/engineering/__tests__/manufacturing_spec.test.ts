import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateManufacturingSpec } from '../drawing/manufacturingSpecs';
import type { DesignParameters, Material } from '../../types';

describe('Manufacturing Specification & Process Routing Generator Tests', () => {
  const sampleMaterial: Material = {
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
    designation: 'G41400',
    condition: 'Quenched & Tempered (Q&T)',
  };

  const sampleParams: DesignParameters = {
    materialId: 'aisi-4140',
    diameter: 45,
    length: 320,
    torque: 500,
    force: 2500,
    rpm: 1450,
    safetyFactor: 2.0,
    temperature: 20,
  };

  it('calculates billet stock and finished shaft mass accurately', () => {
    const spec = generateManufacturingSpec(sampleParams, sampleMaterial);

    assert.ok(spec.overallDimensions.roughWeightKg > 0);
    assert.ok(spec.overallDimensions.finishWeightKg > 0);
    assert.ok(
      spec.overallDimensions.roughWeightKg > spec.overallDimensions.finishWeightKg,
      'Rough billet stock must weigh more than finish machined part'
    );
  });

  it('generates standard bearing journal seats with ISO k5 fits and Ra 0.8 µm finish', () => {
    const spec = generateManufacturingSpec(sampleParams, sampleMaterial);

    assert.strictEqual(spec.bearingSeats.length, 2);
    assert.strictEqual(spec.bearingSeats[0].fitClass, 'ISO k5');
    assert.strictEqual(spec.bearingSeats[0].upperDevUm, 11);
    assert.strictEqual(spec.bearingSeats[0].lowerDevUm, 2);
    assert.strictEqual(spec.bearingSeats[0].surfaceFinishRa, 0.8);

    assert.strictEqual(spec.bearingSeats[1].fitClass, 'ISO k5');
    assert.strictEqual(spec.bearingSeats[1].surfaceFinishRa, 0.8);
  });

  it('generates DIN 6885-1 Form A keyway specification with P9 tolerance fit', () => {
    const spec = generateManufacturingSpec(sampleParams, sampleMaterial);

    assert.strictEqual(spec.keyway.standard, 'DIN 6885-1 (Parallel Key Form A)');
    assert.strictEqual(spec.keyway.fitClass, 'P9 (Tight Fit)');
    assert.ok(spec.keyway.widthMm > 0);
    assert.ok(spec.keyway.depthMm > 0);
  });

  it('provides a 6-stage manufacturing process routing schedule', () => {
    const spec = generateManufacturingSpec(sampleParams, sampleMaterial);

    assert.strictEqual(spec.processRouting.length, 6);
    const steps = spec.processRouting.map((r) => r.step);
    assert.deepStrictEqual(steps, [10, 20, 30, 40, 50, 60]);

    // Check key operations exist
    const ops = spec.processRouting.map((r) => r.operation);
    assert.ok(ops.some((o) => o.includes('Rough Turning')));
    assert.ok(ops.some((o) => o.includes('Heat Treatment')));
    assert.ok(ops.some((o) => o.includes('Keyway Slot Milling')));
    assert.ok(ops.some((o) => o.includes('Precision Cylindrical Grinding')));
  });
});
