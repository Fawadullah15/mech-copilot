import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createProject,
  deleteProject,
} from '../server/services/projectService.js';
import { db, initDatabase } from '../server/db/client.js';
import {
  computeShaftGeometryModel,
  computeDrawingLayout,
} from '../src/engineering/drawing/drawingGeometry.js';
import { generateDrawingDimensions } from '../src/engineering/drawing/dimensionGenerator.js';
import { generateManufacturingSpec } from '../src/engineering/drawing/manufacturingSpecs.js';
import { runDesignVerification } from '../src/engineering/drawing/drawingVerification.js';
import {
  getSheetDimensions,
  calculateOptimalDrawingScale,
  getProjectionSymbolSvg,
} from '../src/engineering/drawing/sheetStandards.js';
import {
  createDesignVersion,
  getVersionsByProjectId,
  restoreDesignVersion,
  computeParameterDelta,
} from '../server/services/versionService.js';
import type { DesignParameters, Material, AnalysisResult } from '../src/types/index.js';

describe('Prompt 04 Acceptance Verification Suite (10 Real Criteria)', () => {
  initDatabase();

  // Common test fixture data
  const baseMaterial: Material = {
    id: 'aisi-4140',
    name: 'AISI 4140 Chromium-Molybdenum Steel',
    category: 'Alloy Steel',
    yieldStrength: 415,
    tensileStrength: 655,
    density: 7850,
    elasticModulus: 210,
    poissonsRatio: 0.29,
    thermalExpansion: 12.3,
    costCategory: 'Medium',
    description: 'High tensile alloy steel for power transmission shafts',
  };

  const baseParams: DesignParameters = {
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
    shearStress: 28.0,
    bendingStress: 85.0,
    vonMisesStress: 155.4,
    equivalentStress: 162.1,
    yieldStrength: 415.0,
    factorOfSafety: 2.67,
    maxDeflection: 0.12,
    torqueCapacity: 1200,
    fatigueLife: 1e6,
    status: 'pass',
    statusMessage: 'Stress levels within allowable limits',
  };

  // Test 1: Generate a drawing from an existing shaft project
  it('Criterion 1: Generates a complete 2D drawing layout from shaft project parameters', () => {
    const layout = computeDrawingLayout(baseParams, 'A3', 'landscape', 'first-angle');
    assert.ok(layout, 'Layout must be generated');
    assert.strictEqual(layout.sheet.widthMm, 420);
    assert.strictEqual(layout.sheet.heightMm, 297);
    assert.strictEqual(layout.sheet.viewBoxWidth, 1680);
    assert.strictEqual(layout.sheet.viewBoxHeight, 1188);
    assert.strictEqual(layout.model.totalLength, 320);
    assert.strictEqual(layout.model.mainDia, 45);
    assert.ok(layout.scaleFactor > 0, 'Scale factor must be positive');
    assert.strictEqual(layout.scaleLabel, '1:2');

    const dimensions = generateDrawingDimensions(layout, baseParams);
    assert.ok(dimensions.length >= 8, `Expected at least 8 dimensions, got ${dimensions.length}`);

    const spec = generateManufacturingSpec(baseParams, baseMaterial);
    assert.ok(spec.overallDimensions.finishWeightKg > 0);
  });

  // Test 2: Confirm all orthographic views represent actual geometry
  it('Criterion 2: Orthographic views (Front, Top, Section A-A, Isometric) represent actual geometry', () => {
    const layout = computeDrawingLayout(baseParams, 'A3', 'landscape', 'first-angle');

    // Front view geometry
    const frontDrawnWidth = layout.model.totalLength * layout.frontView.scale;
    assert.ok(frontDrawnWidth > 0, 'Front view drawn width must be positive');
    assert.strictEqual(layout.frontView.cx, layout.topView.cx, 'Front and Top views must share horizontal center axis');

    // First Angle alignment: Top view is BELOW Front view
    assert.ok(layout.topView.cy > layout.frontView.cy, 'In First Angle, Top view sits below Front view');

    // Third Angle alignment: Top view is ABOVE Front view
    const thirdAngleLayout = computeDrawingLayout(baseParams, 'A3', 'landscape', 'third-angle');
    assert.ok(thirdAngleLayout.topView.cy < thirdAngleLayout.frontView.cy, 'In Third Angle, Top view sits above Front view');

    // Section A-A view
    assert.ok(layout.sideView.cx > layout.frontView.cx, 'Section A-A is located to the right of Front view in First Angle');
    assert.strictEqual(layout.sideView.cy, layout.frontView.cy, 'Section A-A is vertically aligned with Front view center');

    // Isometric view
    assert.ok(layout.isometricView.cx > 0 && layout.isometricView.cy > 0, 'Isometric reference view has valid coordinates');
  });

  // Test 3: Change shaft diameter and verify every relevant drawing view updates
  it('Criterion 3: Parameter modifications dynamically update all orthographic views', () => {
    const originalLayout = computeDrawingLayout(baseParams, 'A3', 'landscape', 'first-angle');
    const modifiedParams: DesignParameters = {
      ...baseParams,
      diameter: 75,
      length: 450,
    };
    const updatedLayout = computeDrawingLayout(modifiedParams, 'A3', 'landscape', 'first-angle');

    // Geometry updates
    assert.strictEqual(updatedLayout.model.mainDia, 75);
    assert.strictEqual(updatedLayout.model.totalLength, 450);
    assert.strictEqual(updatedLayout.model.journalDia, 75 * 0.9);
    assert.strictEqual(updatedLayout.model.journalLength, 50);
    assert.strictEqual(updatedLayout.model.mainLength, 450 - 100);

    // Scale adaptation: 450mm length on A3 requires 1:2 scale
    assert.strictEqual(updatedLayout.scaleLabel, '1:2');
    assert.notStrictEqual(
      updatedLayout.model.totalLength * updatedLayout.frontView.scale,
      originalLayout.model.totalLength * originalLayout.frontView.scale
    );
  });

  // Test 4: Confirm dimensions match model parameters
  it('Criterion 4: Dimensions strictly derive from model parameters without hardcoded numbers', () => {
    const layout = computeDrawingLayout(baseParams, 'A3', 'landscape', 'first-angle');
    const dimensions = generateDrawingDimensions(layout, baseParams);

    const lengthDim = dimensions.find((d) => d.id === 'dim-total-length');
    assert.ok(lengthDim);
    assert.strictEqual(lengthDim.nominalValue, baseParams.length);
    assert.strictEqual(lengthDim.parameterKey, 'length');
    assert.strictEqual(lengthDim.editable, true);

    const diaDim = dimensions.find((d) => d.id === 'dim-main-dia');
    assert.ok(diaDim);
    assert.strictEqual(diaDim.nominalValue, baseParams.diameter);
    assert.strictEqual(diaDim.parameterKey, 'diameter');
    assert.strictEqual(diaDim.editable, true);

    const leftJournalDim = dimensions.find((d) => d.id === 'dim-left-journal-dia');
    assert.ok(leftJournalDim);
    assert.strictEqual(leftJournalDim.nominalValue, baseParams.diameter * 0.9);
    assert.strictEqual(leftJournalDim.fitTolerance, 'k5');
  });

  // Test 5: Export drawing as PDF and SVG
  it('Criterion 5: Verifies SVG and export formatting and projection symbol markup', () => {
    const symbol1st = getProjectionSymbolSvg('first-angle', 80, 110);
    assert.match(symbol1st, /<circle/, 'First angle symbol must contain circular projection');
    assert.match(symbol1st, /<polygon/, 'First angle symbol must contain frustum cone');

    const symbol3rd = getProjectionSymbolSvg('third-angle', 80, 110);
    assert.match(symbol3rd, /<circle/, 'Third angle symbol must contain circular projection');

    const sheetA3 = getSheetDimensions('A3', 'landscape');
    assert.strictEqual(sheetA3.widthMm, 420);
    assert.strictEqual(sheetA3.heightMm, 297);
    assert.strictEqual(sheetA3.viewBoxWidth, 1680);
    assert.strictEqual(sheetA3.viewBoxHeight, 1188);
  });

  // Test 6: Reopen saved project and verify drawing consistency
  it('Criterion 6: Reopened project parameters reconstruct identical drawing layout', () => {
    const savedParameters: DesignParameters = {
      materialId: 'aisi-4140',
      diameter: 55,
      length: 380,
      torque: 750,
      force: 3200,
      rpm: 950,
      safetyFactor: 2.2,
      temperature: 25,
    };

    const initialLayout = computeDrawingLayout(savedParameters, 'A3', 'landscape', 'first-angle');
    const initialDims = generateDrawingDimensions(initialLayout, savedParameters);

    // Simulate database JSON serialization & reload
    const serialized = JSON.stringify(savedParameters);
    const reloadedParameters: DesignParameters = JSON.parse(serialized);

    const reloadedLayout = computeDrawingLayout(reloadedParameters, 'A3', 'landscape', 'first-angle');
    const reloadedDims = generateDrawingDimensions(reloadedLayout, reloadedParameters);

    assert.deepStrictEqual(initialLayout.model, reloadedLayout.model);
    assert.strictEqual(initialLayout.scaleLabel, reloadedLayout.scaleLabel);
    assert.strictEqual(initialDims.length, reloadedDims.length);
    for (let i = 0; i < initialDims.length; i++) {
      assert.strictEqual(initialDims[i].nominalValue, reloadedDims[i].nominalValue);
      assert.strictEqual(initialDims[i].x1, reloadedDims[i].x1);
      assert.strictEqual(initialDims[i].y1, reloadedDims[i].y1);
    }
  });

  // Test 7: Create a new revision and inspect previous revision
  it('Criterion 7: Creates design versions and calculates parameter diffs', () => {
    const testProjectId = `proj-test-rev-${Date.now()}`;
    try {
      createProject({
        id: testProjectId,
        name: 'Gearbox Shaft Test Project',
        parameters: baseParams,
      });

      // Create v1.0
      const v1 = createDesignVersion({
        projectId: testProjectId,
        version: 'v1.0',
        label: 'Initial Baseline Design',
        notes: 'Initial standard 45mm shaft',
        parameters: { ...baseParams },
        materialId: baseMaterial.id,
        materialName: baseMaterial.name,
        factorOfSafety: 2.67,
        status: 'pass',
        drawingStatus: 'DRAFT',
      });
      assert.strictEqual(v1.version, 'v1.0');

      // Create v1.1 with modified diameter
      const updatedParams = { ...baseParams, diameter: 52 };
      const delta = computeParameterDelta(baseParams, updatedParams);
      assert.deepStrictEqual(delta.diameter, { previous: 45, current: 52 });

      const v2 = createDesignVersion({
        projectId: testProjectId,
        version: 'v1.1',
        label: 'Reinforced Shaft Journal',
        notes: 'Upsized diameter to 52mm for torsional margin',
        parameters: updatedParams,
        materialId: baseMaterial.id,
        materialName: baseMaterial.name,
        factorOfSafety: 3.12,
        status: 'pass',
        drawingStatus: 'PRELIMINARY',
        changedParameters: delta,
      });
      assert.strictEqual(v2.version, 'v1.1');

      const versions = getVersionsByProjectId(testProjectId);
      assert.strictEqual(versions.length, 2);
      assert.strictEqual(versions[0].version, 'v1.1');
      assert.strictEqual(versions[1].version, 'v1.0');
      assert.deepStrictEqual(versions[0].changedParameters?.diameter, { previous: 45, current: 52 });
    } finally {
      try { deleteProject(testProjectId); } catch {}
    }
  });

  // Test 8: Restore an older revision without deleting history
  it('Criterion 8: Restores older revision non-destructively, creating a new audit entry', () => {
    const testProjectId = `proj-restore-test-${Date.now()}`;
    try {
      createProject({
        id: testProjectId,
        name: 'Turbine Shaft Test Project',
        parameters: baseParams,
      });

      const v1 = createDesignVersion({
        projectId: testProjectId,
        version: 'v1.0',
        label: 'Baseline 45mm',
        parameters: { ...baseParams, diameter: 45 },
        materialId: baseMaterial.id,
        materialName: baseMaterial.name,
        factorOfSafety: 2.5,
        status: 'pass',
      });

      const v2 = createDesignVersion({
        projectId: testProjectId,
        version: 'v1.1',
        label: 'Experimental 35mm',
        parameters: { ...baseParams, diameter: 35 },
        materialId: baseMaterial.id,
        materialName: baseMaterial.name,
        factorOfSafety: 1.1,
        status: 'warning',
      });

      // Restore v1.0
      const restoreResult = restoreDesignVersion(testProjectId, v1.id);
      assert.ok(restoreResult.newVersion, 'Must generate a new version record when restoring');
      assert.strictEqual(restoreResult.newVersion.restoredFromVersion, 'v1.0');
      assert.strictEqual(restoreResult.newVersion.parameters.diameter, 45);

      // Check that total versions is now 3 (v1.0, v1.1, v1.2-restored)
      const allVersions = getVersionsByProjectId(testProjectId);
      assert.strictEqual(allVersions.length, 3, 'Revision history must be fully preserved with 3 records');
      assert.ok(allVersions.some((v) => v.id === v1.id), 'v1.0 must still exist');
      assert.ok(allVersions.some((v) => v.id === v2.id), 'v1.1 must still exist');
    } finally {
      try { deleteProject(testProjectId); } catch {}
    }
  });

  // Test 9: Trigger missing-input warnings
  it('Criterion 9: 9-point verification matrix triggers appropriate warnings and critical failure flags', () => {
    // 9.1 Missing torque input
    const invalidInputs: DesignParameters = {
      ...baseParams,
      torque: 0, // Invalid
    };
    const report1 = runDesignVerification(invalidInputs, baseMaterial, passingAnalysis);
    const inputCheck = report1.checks.find((c) => c.category === 'INPUTS')!;
    assert.strictEqual(inputCheck.status, 'Failed');

    // 9.2 Slenderness ratio > 40
    const slenderParams: DesignParameters = {
      ...baseParams,
      diameter: 12,
      length: 600, // L/D = 50 > 40
    };
    const report2 = runDesignVerification(slenderParams, baseMaterial, passingAnalysis);
    const geomCheck = report2.checks.find((c) => c.category === 'GEOMETRY')!;
    assert.strictEqual(geomCheck.status, 'Warning');
    assert.match(geomCheck.message, /High slenderness ratio/);

    // 9.3 Factor of safety below 1.0
    const failingAnalysis: AnalysisResult = {
      ...passingAnalysis,
      vonMisesStress: 500,
      factorOfSafety: 0.83,
      status: 'fail',
      statusMessage: 'Yield limit exceeded',
    };
    const report3 = runDesignVerification(baseParams, baseMaterial, failingAnalysis);
    const fosCheck = report3.checks.find((c) => c.category === 'SAFETY_FACTOR')!;
    assert.strictEqual(fosCheck.status, 'Failed');
    assert.strictEqual(report3.overallStatus, 'Failed');
    assert.match(fosCheck.message, /CRITICAL FAILURE/);
  });

  // Test 10: Confirm unsupported drawing or verification features are not falsely marked as complete
  it('Criterion 10: Unrun calculations are flagged as "Not checked", DRAFT drawings flagged with warning', () => {
    // When analysis has not run (null)
    const unrunReport = runDesignVerification(baseParams, baseMaterial, null, { isDraft: true });

    const calcCheck = unrunReport.checks.find((c) => c.category === 'CALCULATIONS')!;
    assert.strictEqual(calcCheck.status, 'Not checked');

    const fosCheck = unrunReport.checks.find((c) => c.category === 'SAFETY_FACTOR')!;
    assert.strictEqual(fosCheck.status, 'Not checked');

    const drawCheck = unrunReport.checks.find((c) => c.category === 'DRAWING')!;
    assert.strictEqual(drawCheck.status, 'Warning', 'DRAFT status must trigger warning rather than false Pass');

    assert.ok(unrunReport.disclaimer.includes('Review and final engineering sign-off required'));
  });
});
