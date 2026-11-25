import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import app from '../app.ts';
import { resetDatabase } from '../db/client.ts';
import { createProduct } from '../services/productService.ts';
import {
  createBOM,
  getBOMs,
  getBOMById,
  updateBOM,
  deleteBOM,
  addBOMLine,
  updateBOMLine,
  deleteBOMLine,
  validateBOM,
  releaseBOM,
  obsoleteBOM,
  BOMImmutableError,
  BOMValidationError,
} from '../services/bomService.ts';

describe('BOM Engine & Lifecycle Management Tests', () => {
  let server: Server;
  const PORT = 3005;
  const BASE_URL = `http://localhost:${PORT}`;

  let parentId: string;
  let shaftId: string;
  let bearingId: string;
  let housingId: string;

  before(async () => {
    resetDatabase();

    // Create test products
    const parent = createProduct({
      item_code: 'ASY-SPDL-01',
      name: 'Precision Milling Spindle Assembly',
      item_type: 'SUBASSEMBLY',
      base_unit: 'EA',
    });
    parentId = parent.id;

    const shaft = createProduct({
      item_code: 'PRT-SHFT-01',
      name: 'Hardened Spindle Drive Shaft',
      item_type: 'COMPONENT',
      base_unit: 'EA',
    });
    shaftId = shaft.id;

    const bearing = createProduct({
      item_code: 'PRT-BRG-7008',
      name: 'Angular Contact Bearing 7008',
      item_type: 'COMPONENT',
      base_unit: 'EA',
    });
    bearingId = bearing.id;

    const housing = createProduct({
      item_code: 'PRT-HSG-01',
      name: 'Cast Iron Spindle Cartridge Housing',
      item_type: 'COMPONENT',
      base_unit: 'EA',
    });
    housingId = housing.id;

    return new Promise((resolve) => {
      server = app.listen(PORT, () => resolve(undefined));
    });
  });

  after(() => {
    server.close();
  });

  it('creates a new draft BOM header and verifies defaults', () => {
    const bom = createBOM({
      parent_product_id: parentId,
      bom_code: 'BOM-SPDL-001',
      alt_code: 'PRIMARY',
      notes: 'Initial spindle baseline BOM',
    });

    assert.ok(bom.id.startsWith('bom-'));
    assert.strictEqual(bom.bom_code, 'BOM-SPDL-001');
    assert.strictEqual(bom.alt_code, 'PRIMARY');
    assert.strictEqual(bom.status, 'DRAFT');
    assert.strictEqual(bom.base_quantity, 1.0);
    assert.strictEqual(bom.unit, 'EA');
    assert.strictEqual(bom.lines.length, 0);

    const fetched = getBOMById(bom.id);
    assert.ok(fetched);
    assert.strictEqual(fetched.bom_code, 'BOM-SPDL-001');
    assert.strictEqual(fetched.parent_product?.item_code, 'ASY-SPDL-01');
  });

  it('adds and updates line items on a draft BOM', () => {
    const boms = getBOMs({ parent_product_id: parentId });
    const bomId = boms[0].id;

    // Line 1: Spindle shaft (qty: 1, make)
    const line1 = addBOMLine(bomId, {
      component_product_id: shaftId,
      quantity: 1,
      unit: 'EA',
      scrap_percentage: 2.0,
      supply_classification: 'MAKE',
      preferred_sourcing: 'INTERNAL',
      notes: 'CNC turned and induction hardened',
    });

    assert.strictEqual(line1.line_number, 10);
    assert.strictEqual(line1.component_item_code, 'PRT-SHFT-01');
    assert.strictEqual(line1.quantity, 1);
    assert.strictEqual(line1.scrap_percentage, 2.0);

    // Line 2: Angular contact bearings (qty: 2, buy)
    const line2 = addBOMLine(bomId, {
      component_product_id: bearingId,
      quantity: 2,
      unit: 'EA',
      scrap_percentage: 0.0,
      supply_classification: 'BUY',
      preferred_sourcing: 'IMPORTED',
      notes: 'Matched duplex pair',
    });

    assert.strictEqual(line2.line_number, 20);
    assert.strictEqual(line2.component_item_code, 'PRT-BRG-7008');
    assert.strictEqual(line2.quantity, 2);

    // Line 3: Cartridge housing (qty: 1)
    const line3 = addBOMLine(bomId, {
      component_product_id: housingId,
      quantity: 1,
      unit: 'EA',
      supply_classification: 'MAKE',
      preferred_sourcing: 'INTERNAL',
    });

    assert.strictEqual(line3.line_number, 30);

    // Update Line 2 quantity from 2 to 4 (e.g. quad set)
    const updatedLine2 = updateBOMLine(bomId, line2.id, {
      quantity: 4,
      notes: 'Quad back-to-back arrangement',
    });

    assert.strictEqual(updatedLine2.quantity, 4);
    assert.strictEqual(updatedLine2.notes, 'Quad back-to-back arrangement');

    // Verify BOM lines count
    const fullBOM = getBOMById(bomId)!;
    assert.strictEqual(fullBOM.lines.length, 3);
  });

  it('rejects adding parent product as its own component or using mismatched units', () => {
    const boms = getBOMs({ parent_product_id: parentId });
    const bomId = boms[0].id;

    // Self-reference check
    assert.throws(
      () => {
        addBOMLine(bomId, {
          component_product_id: parentId, // self!
          quantity: 1,
          unit: 'EA',
          supply_classification: 'MAKE',
        });
      },
      /Cannot add parent product as a component/,
      'Must reject self-referential BOM line'
    );

    // Mismatched unit check
    assert.throws(
      () => {
        addBOMLine(bomId, {
          component_product_id: shaftId,
          quantity: 1,
          unit: 'KG', // component base unit is EA!
          supply_classification: 'MAKE',
        });
      },
      /is incompatible with component/,
      'Must reject incompatible unit without verified conversion'
    );
  });

  it('validates and releases a BOM, locking it against modifications', () => {
    const boms = getBOMs({ parent_product_id: parentId });
    const bomId = boms[0].id;

    // Validate
    const validation = validateBOM(bomId);
    assert.strictEqual(validation.valid, true);
    assert.strictEqual(validation.errors.length, 0);

    // Release
    const released = releaseBOM(bomId);
    assert.strictEqual(released.status, 'RELEASED');
    assert.ok(released.released_at);

    // Attempting to add line to released BOM must throw BOMImmutableError
    assert.throws(
      () => {
        addBOMLine(bomId, {
          component_product_id: shaftId,
          quantity: 1,
          unit: 'EA',
          supply_classification: 'MAKE',
        });
      },
      BOMImmutableError,
      'Must prevent adding lines to released BOM'
    );

    // Attempting to update line on released BOM must throw BOMImmutableError
    assert.throws(
      () => {
        updateBOMLine(bomId, released.lines[0].id, {
          quantity: 99,
        });
      },
      BOMImmutableError,
      'Must prevent updating lines on released BOM'
    );

    // Attempting to delete line on released BOM must throw BOMImmutableError
    assert.throws(
      () => {
        deleteBOMLine(bomId, released.lines[0].id);
      },
      BOMImmutableError,
      'Must prevent deleting lines on released BOM'
    );

    // Attempting to delete released BOM must throw BOMImmutableError
    assert.throws(
      () => {
        deleteBOM(bomId);
      },
      BOMImmutableError,
      'Must prevent deleting a released BOM'
    );
  });

  it('HTTP API: BOM validation and release endpoints', async () => {
    // Create new product and draft BOM via API
    const newProd = createProduct({
      item_code: 'ASY-MOTOR-PULLEY',
      name: 'Motor Pulley Assembly',
      item_type: 'SUBASSEMBLY',
      base_unit: 'EA',
    });

    const createBomRes = await fetch(`${BASE_URL}/api/boms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parent_product_id: newProd.id,
        bom_code: 'BOM-PULLEY-001',
      }),
    });

    assert.strictEqual(createBomRes.status, 201);
    const bom = await createBomRes.json();

    // Validating an empty BOM should return valid: false
    const valRes1 = await fetch(`${BASE_URL}/api/boms/${bom.id}/validate`, { method: 'POST' });
    const valBody1 = await valRes1.json();
    assert.strictEqual(valBody1.valid, false);
    assert.ok(valBody1.errors.some((e: string) => e.includes('no component lines')));

    // Add component line via API
    const addLineRes = await fetch(`${BASE_URL}/api/boms/${bom.id}/lines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        component_product_id: shaftId,
        quantity: 1,
        unit: 'EA',
        supply_classification: 'MAKE',
      }),
    });
    assert.strictEqual(addLineRes.status, 201);

    // Release via API
    const releaseRes = await fetch(`${BASE_URL}/api/boms/${bom.id}/release`, { method: 'POST' });
    assert.strictEqual(releaseRes.status, 200);
    const releasedBom = await releaseRes.json();
    assert.strictEqual(releasedBom.status, 'RELEASED');
  });
});
