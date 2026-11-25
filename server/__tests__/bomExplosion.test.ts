import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import app from '../app.ts';
import { resetDatabase } from '../db/client.ts';
import { createProduct } from '../services/productService.ts';
import { createBOM, addBOMLine, releaseBOM } from '../services/bomService.ts';
import {
  explodeBOM,
  CircularBOMReferenceError,
} from '../services/bomCalculationService.ts';

describe('Deterministic Multi-Level BOM Explosion & Quantity Calculation Engine', () => {
  let server: Server;
  const PORT = 3006;
  const BASE_URL = `http://localhost:${PORT}`;

  let rootBomId: string;
  let cncMachineId: string;
  let bearingId: string;
  let shaftId: string;
  let motorId: string;
  let bracketId: string;

  before(async () => {
    resetDatabase();

    // ─── Set up the 5 CNC Machine Benchmark Assembly ─────────────────────────
    //
    // CNC Machine Model 01 (FINISHED_PRODUCT)
    // ├── Spindle Subassembly (qty: 1)
    // │   ├── Spindle Shaft (qty: 1, 5% scrap)
    // │   └── Precision Bearings (qty: 2)
    // ├── Axis Drive Subassembly (qty: 3)
    // │   └── Drive Motor (qty: 1 per axis -> 3 total)
    // └── Machine Bed Subassembly (qty: 1)
    //     └── Mounting Brackets (qty: 4)

    const cnc = createProduct({
      item_code: 'CNC-M01',
      name: '3-Axis CNC Vertical Milling Machine',
      item_type: 'FINISHED_PRODUCT',
      base_unit: 'EA',
    });
    cncMachineId = cnc.id;

    // Subassemblies
    const spindleAssy = createProduct({
      item_code: 'ASY-SPDL',
      name: 'Spindle Assembly',
      item_type: 'SUBASSEMBLY',
      base_unit: 'EA',
    });

    const axisAssy = createProduct({
      item_code: 'ASY-AXIS',
      name: 'Axis Drive Assembly',
      item_type: 'SUBASSEMBLY',
      base_unit: 'EA',
    });

    const bedAssy = createProduct({
      item_code: 'ASY-BED',
      name: 'Machine Bed Assembly',
      item_type: 'SUBASSEMBLY',
      base_unit: 'EA',
    });

    // Components
    const bearing = createProduct({
      item_code: 'PRT-BRG-PREC',
      name: 'Precision Spindle Bearing',
      item_type: 'COMPONENT',
      base_unit: 'EA',
    });
    bearingId = bearing.id;

    const shaft = createProduct({
      item_code: 'PRT-SHFT-DRV',
      name: 'Spindle Shaft AISI 4140',
      item_type: 'COMPONENT',
      base_unit: 'EA',
    });
    shaftId = shaft.id;

    const motor = createProduct({
      item_code: 'PRT-MTR-SERVO',
      name: 'AC Servo Drive Motor',
      item_type: 'COMPONENT',
      base_unit: 'EA',
    });
    motorId = motor.id;

    const bracket = createProduct({
      item_code: 'PRT-BRKT-MNT',
      name: 'Rigid Mounting Bracket',
      item_type: 'COMPONENT',
      base_unit: 'EA',
    });
    bracketId = bracket.id;

    // Build Spindle Subassembly BOM
    const spdlBom = createBOM({
      parent_product_id: spindleAssy.id,
      bom_code: 'BOM-SPDL-SUB',
    });
    addBOMLine(spdlBom.id, {
      component_product_id: shaft.id,
      quantity: 1, // 1 shaft per spindle
      unit: 'EA',
      scrap_percentage: 5.0, // 5% scrap
      supply_classification: 'MAKE',
      preferred_sourcing: 'INTERNAL',
    });
    addBOMLine(spdlBom.id, {
      component_product_id: bearing.id,
      quantity: 2, // 2 bearings per spindle
      unit: 'EA',
      scrap_percentage: 0.0,
      supply_classification: 'BUY',
      preferred_sourcing: 'IMPORTED',
    });
    releaseBOM(spdlBom.id);

    // Build Axis Drive Subassembly BOM
    const axisBom = createBOM({
      parent_product_id: axisAssy.id,
      bom_code: 'BOM-AXIS-SUB',
    });
    addBOMLine(axisBom.id, {
      component_product_id: motor.id,
      quantity: 1, // 1 motor per axis
      unit: 'EA',
      supply_classification: 'BUY',
      preferred_sourcing: 'LOCAL',
    });
    releaseBOM(axisBom.id);

    // Build Machine Bed Subassembly BOM
    const bedBom = createBOM({
      parent_product_id: bedAssy.id,
      bom_code: 'BOM-BED-SUB',
    });
    addBOMLine(bedBom.id, {
      component_product_id: bracket.id,
      quantity: 4, // 4 mounting brackets per bed
      unit: 'EA',
      supply_classification: 'MAKE',
      preferred_sourcing: 'INTERNAL',
    });
    releaseBOM(bedBom.id);

    // Build Root CNC Machine Model 01 BOM
    const topBom = createBOM({
      parent_product_id: cnc.id,
      bom_code: 'BOM-CNC-TOP',
    });
    addBOMLine(topBom.id, {
      component_product_id: spindleAssy.id,
      quantity: 1, // 1 spindle assembly per machine
      unit: 'EA',
      supply_classification: 'MAKE',
    });
    addBOMLine(topBom.id, {
      component_product_id: axisAssy.id,
      quantity: 3, // 3 axis assemblies (X, Y, Z) per machine
      unit: 'EA',
      supply_classification: 'MAKE',
    });
    addBOMLine(topBom.id, {
      component_product_id: bedAssy.id,
      quantity: 1, // 1 bed assembly per machine
      unit: 'EA',
      supply_classification: 'MAKE',
    });
    releaseBOM(topBom.id);
    rootBomId = topBom.id;

    return new Promise((resolve) => {
      server = app.listen(PORT, () => resolve(undefined));
    });
  });

  after(() => {
    server.close();
  });

  it('calculates single machine component quantities exactly (1 CNC Machine)', () => {
    const result = explodeBOM(rootBomId, 1.0);

    assert.strictEqual(result.target_quantity, 1.0);
    assert.strictEqual(result.parent_product.item_code, 'CNC-M01');
    assert.strictEqual(result.hierarchy.length, 3); // 3 primary branches

    // Find summarized totals
    const bearingReq = result.summary.find((s) => s.item_code === 'PRT-BRG-PREC');
    assert.ok(bearingReq);
    assert.strictEqual(bearingReq.total_net_quantity, 2);

    const shaftReq = result.summary.find((s) => s.item_code === 'PRT-SHFT-DRV');
    assert.ok(shaftReq);
    assert.strictEqual(shaftReq.total_net_quantity, 1);
    // 5% scrap on 1 shaft = 1.05 gross
    assert.strictEqual(shaftReq.total_gross_quantity, 1.05);

    const motorReq = result.summary.find((s) => s.item_code === 'PRT-MTR-SERVO');
    assert.ok(motorReq);
    assert.strictEqual(motorReq.total_net_quantity, 3);

    const bracketReq = result.summary.find((s) => s.item_code === 'PRT-BRKT-MNT');
    assert.ok(bracketReq);
    assert.strictEqual(bracketReq.total_net_quantity, 4);
  });

  it('calculates 5 CNC Machines order exactly per specification: Bearings=10, Shafts=5, Motors=15, Brackets=20', () => {
    const result = explodeBOM(rootBomId, 5.0);

    assert.strictEqual(result.target_quantity, 5.0);

    // Exact benchmark assertions
    const bearingReq = result.summary.find((s) => s.item_code === 'PRT-BRG-PREC')!;
    assert.strictEqual(
      bearingReq.total_net_quantity,
      10,
      '5 CNC machines * 2 bearings/machine = 10 bearings'
    );

    const shaftReq = result.summary.find((s) => s.item_code === 'PRT-SHFT-DRV')!;
    assert.strictEqual(
      shaftReq.total_net_quantity,
      5,
      '5 CNC machines * 1 shaft/machine = 5 spindle shafts'
    );
    // 5 shafts + 5% scrap allowance = 5 * 1.05 = 5.25 gross
    assert.strictEqual(
      shaftReq.total_gross_quantity,
      5.25,
      '5 shafts with 5% scrap = 5.25 units'
    );
    assert.strictEqual(shaftReq.scrap_allowance_quantity, 0.25);

    const motorReq = result.summary.find((s) => s.item_code === 'PRT-MTR-SERVO')!;
    assert.strictEqual(
      motorReq.total_net_quantity,
      15,
      '5 CNC machines * 3 motors/machine (X, Y, Z) = 15 servo motors'
    );

    const bracketReq = result.summary.find((s) => s.item_code === 'PRT-BRKT-MNT')!;
    assert.strictEqual(
      bracketReq.total_net_quantity,
      20,
      '5 CNC machines * 4 brackets/machine = 20 mounting brackets'
    );

    // Check tree hierarchy paths
    const spindleNode = result.hierarchy.find((n) => n.component_item_code === 'ASY-SPDL')!;
    assert.strictEqual(spindleNode.level, 1);
    assert.strictEqual(spindleNode.net_required_quantity, 5);

    const shaftNode = spindleNode.children.find((n) => n.component_item_code === 'PRT-SHFT-DRV')!;
    assert.strictEqual(shaftNode.level, 2);
    assert.strictEqual(shaftNode.path_string, 'CNC-M01 / ASY-SPDL / PRT-SHFT-DRV');
  });

  it('detects circular BOM references in complex multi-level structures (A -> B -> C -> A)', () => {
    // Product A
    const prodA = createProduct({
      item_code: 'CYCLE-A',
      name: 'Loop Product A',
      item_type: 'SUBASSEMBLY',
      base_unit: 'EA',
    });

    // Product B
    const prodB = createProduct({
      item_code: 'CYCLE-B',
      name: 'Loop Product B',
      item_type: 'SUBASSEMBLY',
      base_unit: 'EA',
    });

    // Product C
    const prodC = createProduct({
      item_code: 'CYCLE-C',
      name: 'Loop Product C',
      item_type: 'SUBASSEMBLY',
      base_unit: 'EA',
    });

    // BOM A contains B
    const bomA = createBOM({ parent_product_id: prodA.id, bom_code: 'BOM-CYC-A' });
    addBOMLine(bomA.id, { component_product_id: prodB.id, quantity: 1, unit: 'EA', supply_classification: 'MAKE' });

    // BOM B contains C
    const bomB = createBOM({ parent_product_id: prodB.id, bom_code: 'BOM-CYC-B' });
    addBOMLine(bomB.id, { component_product_id: prodC.id, quantity: 1, unit: 'EA', supply_classification: 'MAKE' });

    // BOM C contains A (CLOSES THE CYCLE!)
    const bomC = createBOM({ parent_product_id: prodC.id, bom_code: 'BOM-CYC-C' });
    addBOMLine(bomC.id, { component_product_id: prodA.id, quantity: 1, unit: 'EA', supply_classification: 'MAKE' });

    // Attempting to explode BOM A must detect the cycle A -> B -> C -> A
    assert.throws(
      () => {
        explodeBOM(bomA.id, 1.0);
      },
      (err: any) => {
        assert.ok(err instanceof CircularBOMReferenceError);
        assert.ok(err.message.includes('Circular BOM reference detected'));
        assert.deepStrictEqual(err.cyclePath, ['CYCLE-A', 'CYCLE-B', 'CYCLE-C', 'CYCLE-A']);
        return true;
      },
      'Must identify exact cycle path in hierarchy'
    );
  });

  it('identifies subassemblies without a defined BOM as unresolved', () => {
    const parentWithMissing = createProduct({
      item_code: 'ASY-INCOMPLETE',
      name: 'Assembly with Missing Subassembly BOM',
      item_type: 'FINISHED_PRODUCT',
      base_unit: 'EA',
    });

    const subWithoutBOM = createProduct({
      item_code: 'ASY-NO-BOM',
      name: 'Subassembly with No BOM Defined',
      item_type: 'SUBASSEMBLY',
      base_unit: 'EA',
    });

    const bom = createBOM({ parent_product_id: parentWithMissing.id, bom_code: 'BOM-INCOMP' });
    addBOMLine(bom.id, {
      component_product_id: subWithoutBOM.id,
      quantity: 2,
      unit: 'EA',
      supply_classification: 'MAKE',
    });

    const result = explodeBOM(bom.id, 1.0);
    assert.strictEqual(result.unresolved_subassemblies.length, 1);
    assert.strictEqual(result.unresolved_subassemblies[0].item_code, 'ASY-NO-BOM');
    assert.strictEqual(result.hierarchy[0].missing_bom, true);
  });

  it('HTTP API: GET /api/boms/:id/explode returns exploded hierarchy and rolled-up requirements', async () => {
    const res = await fetch(`${BASE_URL}/api/boms/${rootBomId}/explode?quantity=5`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.target_quantity, 5);
    assert.strictEqual(body.bom_code, 'BOM-CNC-TOP');
    assert.ok(body.hierarchy.length === 3);

    // Verify 5 machines quantities via HTTP
    const bearingReq = body.summary.find((s: any) => s.item_code === 'PRT-BRG-PREC');
    assert.strictEqual(bearingReq.total_net_quantity, 10);

    const motorReq = body.summary.find((s: any) => s.item_code === 'PRT-MTR-SERVO');
    assert.strictEqual(motorReq.total_net_quantity, 15);
  });
});
