import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeDrawingLayout } from '../drawing/drawingGeometry';
import { generateDrawingDimensions } from '../drawing/dimensionGenerator';
import type { DesignParameters } from '../../types';

describe('2D Drawing Dimension Associativity & Generator Tests', () => {
  const sampleParams: DesignParameters = {
    materialId: 'aisi-4140',
    diameter: 50,
    length: 400,
    torque: 600,
    force: 3000,
    rpm: 1200,
    safetyFactor: 2.5,
    temperature: 20,
  };

  it('generates fully associative dimensions derived from input parameters without hardcoding', () => {
    const layout = computeDrawingLayout(sampleParams, 'A3', 'landscape', 'first-angle');
    const dimensions = generateDrawingDimensions(layout, sampleParams);

    assert.ok(dimensions.length >= 8, 'Must generate full technical dimension suite');

    // 1. Overall Length Dimension
    const totalLenDim = dimensions.find((d) => d.id === 'dim-total-length');
    assert.ok(totalLenDim, 'Overall length dimension exists');
    assert.strictEqual(totalLenDim.nominalValue, 400);
    assert.strictEqual(totalLenDim.parameterKey, 'length');
    assert.strictEqual(totalLenDim.editable, true);
    assert.strictEqual(totalLenDim.dimensionType, 'linear-length');

    // 2. Main Diameter Dimension
    const mainDiaDim = dimensions.find((d) => d.id === 'dim-main-dia');
    assert.ok(mainDiaDim, 'Main diameter dimension exists');
    assert.strictEqual(mainDiaDim.nominalValue, 50);
    assert.strictEqual(mainDiaDim.parameterKey, 'diameter');
    assert.strictEqual(mainDiaDim.editable, true);
    assert.strictEqual(mainDiaDim.dimensionType, 'diameter');

    // 3. Left Bearing Journal (k5 fit)
    const leftJournalDim = dimensions.find((d) => d.id === 'dim-left-journal-dia');
    assert.ok(leftJournalDim, 'Left journal dimension exists');
    assert.strictEqual(leftJournalDim.nominalValue, 45); // 90% of 50mm
    assert.strictEqual(leftJournalDim.fitTolerance, 'k5');
    assert.strictEqual(leftJournalDim.upperDevMm, 0.011);
    assert.strictEqual(leftJournalDim.lowerDevMm, 0.002);

    // 4. Keyway Dimension (DIN 6885-1 P9)
    const keywayDim = dimensions.find((d) => d.id === 'dim-keyway-width');
    assert.ok(keywayDim, 'Keyway width dimension exists');
    assert.strictEqual(keywayDim.fitTolerance, 'P9');
    assert.strictEqual(keywayDim.nominalValue, 12.5); // 25% of 50mm
    assert.strictEqual(keywayDim.upperDevMm, -0.012);
    assert.strictEqual(keywayDim.lowerDevMm, -0.042);
  });

  it('dynamically adapts dimensions when design parameters change', () => {
    const updatedParams: DesignParameters = {
      ...sampleParams,
      diameter: 65,
      length: 550,
    };

    const layout = computeDrawingLayout(updatedParams, 'A3', 'landscape', 'first-angle');
    const dimensions = generateDrawingDimensions(layout, updatedParams);

    const totalLenDim = dimensions.find((d) => d.id === 'dim-total-length')!;
    assert.strictEqual(totalLenDim.nominalValue, 550);

    const mainDiaDim = dimensions.find((d) => d.id === 'dim-main-dia')!;
    assert.strictEqual(mainDiaDim.nominalValue, 65);

    const leftJournalDim = dimensions.find((d) => d.id === 'dim-left-journal-dia')!;
    assert.strictEqual(leftJournalDim.nominalValue, 58.5); // 90% of 65mm
  });
});
