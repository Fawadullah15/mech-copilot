import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  computeShaftGeometryModel,
  computeDrawingLayout,
} from '../drawing/drawingGeometry';
import {
  getSheetDimensions,
  calculateOptimalDrawingScale,
} from '../drawing/sheetStandards';
import type { DesignParameters } from '../../types';

describe('2D Drawing Geometric Projection Engine Tests', () => {
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

  it('computes exact parametric shaft geometry model from input parameters', () => {
    const geom = computeShaftGeometryModel(sampleParams);

    assert.strictEqual(geom.totalLength, 320);
    assert.strictEqual(geom.mainDia, 45);
    assert.strictEqual(geom.mainRadius, 22.5);

    // Journal diameters: 90% of main diameter
    assert.strictEqual(geom.journalDia, 40.5);
    assert.strictEqual(geom.journalRadius, 20.25);

    // Journal length: min(length * 0.18, 50) = min(57.6, 50) = 50 mm
    assert.strictEqual(geom.journalLength, 50);

    // Main span length: total - 2 * journalLength = 320 - 100 = 220 mm
    assert.strictEqual(geom.mainLength, 220);

    // Chamfer & transition fillet
    assert.strictEqual(geom.chamferSize, 1.5);
    assert.strictEqual(geom.filletRadius, 2.3);

    // Keyway dimensions DIN 6885-1 Form A
    assert.strictEqual(geom.keywayWidth, 11.3);
    assert.strictEqual(geom.keywayDepth, 4.5);
  });

  it('calculates optimal ISO drawing scale based on shaft length and sheet bounds', () => {
    // A3 usable width is approx 273 mm
    assert.strictEqual(calculateOptimalDrawingScale(100, 'A3'), '2:1');
    assert.strictEqual(calculateOptimalDrawingScale(250, 'A3'), '1:1');
    assert.strictEqual(calculateOptimalDrawingScale(320, 'A3'), '1:2');
    assert.strictEqual(calculateOptimalDrawingScale(800, 'A3'), '1:5');
    assert.strictEqual(calculateOptimalDrawingScale(1800, 'A3'), '1:10');
  });

  it('generates standard sheet dimensions for A4, A3, and A2 in landscape and portrait', () => {
    const a4Land = getSheetDimensions('A4', 'landscape');
    assert.strictEqual(a4Land.widthMm, 297);
    assert.strictEqual(a4Land.heightMm, 210);
    assert.strictEqual(a4Land.viewBoxWidth, 297 * 4);
    assert.strictEqual(a4Land.viewBoxHeight, 210 * 4);

    const a3Land = getSheetDimensions('A3', 'landscape');
    assert.strictEqual(a3Land.widthMm, 420);
    assert.strictEqual(a3Land.heightMm, 297);

    const a2Port = getSheetDimensions('A2', 'portrait');
    assert.strictEqual(a2Port.widthMm, 420);
    assert.strictEqual(a2Port.heightMm, 594);
  });

  it('aligns orthographic views strictly according to First Angle vs Third Angle projection', () => {
    // First Angle projection: Top view is BELOW Front view (cy_top > cy_front)
    const firstAngleLayout = computeDrawingLayout(sampleParams, 'A3', 'landscape', 'first-angle');
    assert.ok(
      firstAngleLayout.topView.cy > firstAngleLayout.frontView.cy,
      'In First Angle projection, Top view must sit below Front view'
    );
    assert.strictEqual(
      firstAngleLayout.topView.cx,
      firstAngleLayout.frontView.cx,
      'Top view must be horizontally centered and aligned with Front view'
    );

    // Third Angle projection: Top view is ABOVE Front view (cy_top < cy_front)
    const thirdAngleLayout = computeDrawingLayout(sampleParams, 'A3', 'landscape', 'third-angle');
    assert.ok(
      thirdAngleLayout.topView.cy < thirdAngleLayout.frontView.cy,
      'In Third Angle projection, Top view must sit above Front view'
    );
    assert.strictEqual(
      thirdAngleLayout.topView.cx,
      thirdAngleLayout.frontView.cx,
      'Top view must remain horizontally aligned with Front view'
    );

    // Side view / Section A-A must be positioned to the right of Front view
    assert.ok(
      firstAngleLayout.sideView.cx > firstAngleLayout.frontView.cx,
      'Section A-A side view must be positioned to the right of Front view'
    );
  });
});
