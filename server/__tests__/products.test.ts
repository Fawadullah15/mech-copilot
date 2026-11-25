import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import app from '../app.ts';
import { db, resetDatabase } from '../db/client.ts';
import {
  createProduct,
  getProducts,
  getProductById,
  getProductByCode,
  updateProduct,
  archiveProduct,
  deleteProduct,
  createProductRevision,
  getProductRevisions,
  getProductRevisionById,
  releaseProductRevision,
  obsoleteProductRevision,
  DuplicateProductCodeError,
  ProductInUseError,
  RevisionError,
} from '../services/productService.ts';
import { createBOM, addBOMLine } from '../services/bomService.ts';

describe('Manufacturing Product Master & Revision Engine Tests', () => {
  let server: Server;
  const PORT = 3004;
  const BASE_URL = `http://localhost:${PORT}`;

  before(async () => {
    resetDatabase();
    return new Promise((resolve) => {
      server = app.listen(PORT, () => resolve(undefined));
    });
  });

  after(() => {
    server.close();
  });

  it('creates and retrieves a product with automatic initial revision A', () => {
    const prod = createProduct({
      item_code: 'CNC-M01',
      name: '3-Axis CNC Vertical Milling Machine',
      description: 'Industrial 3-axis CNC milling machine center',
      item_type: 'FINISHED_PRODUCT',
      base_unit: 'EA',
      lifecycle_status: 'ACTIVE',
      initial_revision_code: 'A',
      initial_revision_notes: 'Initial production baseline',
    });

    assert.ok(prod.id.startsWith('prod-'));
    assert.strictEqual(prod.item_code, 'CNC-M01');
    assert.strictEqual(prod.name, '3-Axis CNC Vertical Milling Machine');
    assert.strictEqual(prod.item_type, 'FINISHED_PRODUCT');
    assert.strictEqual(prod.base_unit, 'EA');
    assert.strictEqual(prod.lifecycle_status, 'ACTIVE');
    assert.strictEqual(prod.is_archived, 0);

    // Initial revision check
    assert.strictEqual(prod.revisions.length, 1);
    assert.strictEqual(prod.revisions[0].revision_code, 'A');
    assert.strictEqual(prod.revisions[0].revision_status, 'DRAFT');
    assert.strictEqual(prod.revisions[0].notes, 'Initial production baseline');

    // Retrieval by ID
    const fetched = getProductById(prod.id);
    assert.ok(fetched);
    assert.strictEqual(fetched.id, prod.id);
    assert.strictEqual(fetched.item_code, 'CNC-M01');

    // Retrieval by Code
    const fetchedCode = getProductByCode('CNC-M01');
    assert.ok(fetchedCode);
    assert.strictEqual(fetchedCode.id, prod.id);
  });

  it('rejects duplicate item codes with DuplicateProductCodeError', () => {
    assert.throws(
      () => {
        createProduct({
          item_code: 'CNC-M01', // duplicate!
          name: 'Duplicate Machine',
          item_type: 'FINISHED_PRODUCT',
          base_unit: 'EA',
        });
      },
      DuplicateProductCodeError,
      'Must reject duplicate product codes'
    );
  });

  it('lists and filters products by search term, type, and lifecycle status', () => {
    createProduct({
      item_code: 'SPDL-ASSY-01',
      name: 'High Precision Spindle Subassembly',
      item_type: 'SUBASSEMBLY',
      base_unit: 'EA',
    });

    createProduct({
      item_code: 'BRG-6205-C3',
      name: 'Deep Groove Ball Bearing 25x52x15',
      item_type: 'COMPONENT',
      base_unit: 'EA',
    });

    createProduct({
      item_code: 'RAW-STL-4140',
      name: 'AISI 4140 Round Bar Stock 50mm',
      item_type: 'RAW_MATERIAL',
      base_unit: 'M',
    });

    // All active
    const all = getProducts();
    assert.ok(all.length >= 4);

    // Filter by type
    const subassemblies = getProducts({ item_type: 'SUBASSEMBLY' });
    assert.strictEqual(subassemblies.length, 1);
    assert.strictEqual(subassemblies[0].item_code, 'SPDL-ASSY-01');

    // Search query
    const searchResult = getProducts({ search: 'Bearing' });
    assert.strictEqual(searchResult.length, 1);
    assert.strictEqual(searchResult[0].item_code, 'BRG-6205-C3');
  });

  it('updates product metadata and archives products safely', () => {
    const raw = getProductByCode('RAW-STL-4140')!;
    const updated = updateProduct(raw.id, {
      name: 'AISI 4140 Quenched & Tempered Bar Stock 50mm',
      description: 'Thermal processed alloy steel bar stock',
    });

    assert.strictEqual(updated.name, 'AISI 4140 Quenched & Tempered Bar Stock 50mm');
    assert.strictEqual(updated.description, 'Thermal processed alloy steel bar stock');

    // Archive
    const archived = archiveProduct(raw.id);
    assert.strictEqual(archived.is_archived, 1);
    assert.strictEqual(archived.lifecycle_status, 'ARCHIVED');

    // Default getProducts does not include archived
    const activeList = getProducts();
    assert.ok(!activeList.some((p) => p.item_code === 'RAW-STL-4140'));

    // Explicit getProducts includes archived
    const archivedList = getProducts({ is_archived: 1 });
    assert.ok(archivedList.some((p) => p.item_code === 'RAW-STL-4140'));
  });

  it('manages engineering revision lifecycle (Draft -> Released -> Obsolete)', () => {
    const spdl = getProductByCode('SPDL-ASSY-01')!;

    // Create Revision B
    const revB = createProductRevision(spdl.id, {
      revision_code: 'B',
      notes: 'Updated labyrinth seal tolerance',
    });

    assert.strictEqual(revB.revision_code, 'B');
    assert.strictEqual(revB.revision_status, 'DRAFT');

    // Duplicate revision code rejected
    assert.throws(
      () => {
        createProductRevision(spdl.id, {
          revision_code: 'B',
          notes: 'Duplicate revision B',
        });
      },
      RevisionError,
      'Cannot create duplicate revision code for same product'
    );

    // Release Revision B
    const releasedB = releaseProductRevision(spdl.id, revB.id, '2026-11-06T12:00:00Z');
    assert.strictEqual(releasedB.revision_status, 'RELEASED');
    assert.ok(releasedB.released_at);
    assert.strictEqual(releasedB.effective_date, '2026-11-06T12:00:00Z');

    // Releasing already released revision throws error
    assert.throws(
      () => {
        releaseProductRevision(spdl.id, revB.id);
      },
      RevisionError,
      'Cannot release an already released revision'
    );

    // Mark obsolete
    const obsoleteB = obsoleteProductRevision(spdl.id, revB.id);
    assert.strictEqual(obsoleteB.revision_status, 'OBSOLETE');

    // Check revision list order
    const revisions = getProductRevisions(spdl.id);
    assert.strictEqual(revisions.length, 2);
  });

  it('prevents deletion of products referenced in Bills of Materials', () => {
    const parent = createProduct({
      item_code: 'TEST-PARENT',
      name: 'Parent Assembly',
      item_type: 'SUBASSEMBLY',
      base_unit: 'EA',
    });

    const child = createProduct({
      item_code: 'TEST-CHILD',
      name: 'Child Part',
      item_type: 'COMPONENT',
      base_unit: 'EA',
    });

    const bom = createBOM({
      parent_product_id: parent.id,
      bom_code: 'BOM-TEST-REF',
    });

    addBOMLine(bom.id, {
      component_product_id: child.id,
      quantity: 2,
      unit: 'EA',
      supply_classification: 'BUY',
    });

    // Attempting to delete child component must be rejected
    assert.throws(
      () => {
        deleteProduct(child.id);
      },
      ProductInUseError,
      'Cannot delete component referenced in BOM line'
    );

    // Attempting to delete parent must be rejected
    assert.throws(
      () => {
        deleteProduct(parent.id);
      },
      ProductInUseError,
      'Cannot delete parent product referenced in BOM header'
    );
  });

  // HTTP API Integration Tests
  it('HTTP API: GET /api/products returns products list', async () => {
    const res = await fetch(`${BASE_URL}/api/products?search=CNC`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.products);
    assert.ok(body.count >= 1);
    assert.ok(body.products.some((p: any) => p.item_code === 'CNC-M01'));
  });

  it('HTTP API: POST /api/products creates product and handles duplicate 409', async () => {
    const postRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_code: 'FAST-M8X25',
        name: 'Hex Bolt Grade 8.8 M8x25',
        item_type: 'COMPONENT',
        base_unit: 'EA',
      }),
    });

    assert.strictEqual(postRes.status, 201);
    const created = await postRes.json();
    assert.strictEqual(created.item_code, 'FAST-M8X25');

    // Duplicate check
    const dupRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_code: 'FAST-M8X25',
        name: 'Duplicate Hex Bolt',
        item_type: 'COMPONENT',
        base_unit: 'EA',
      }),
    });

    assert.strictEqual(dupRes.status, 409);
    const dupBody = await dupRes.json();
    assert.ok(dupBody.error.includes('already exists'));
  });

  it('HTTP API: Product revisions endpoints (POST, GET, Release)', async () => {
    const prod = getProductByCode('FAST-M8X25')!;

    // Create revision B via API
    const createRevRes = await fetch(`${BASE_URL}/api/products/${prod.id}/revisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        revision_code: 'B',
        notes: 'Zinc plated coating specification added',
      }),
    });

    assert.strictEqual(createRevRes.status, 201);
    const revB = await createRevRes.json();
    assert.strictEqual(revB.revision_code, 'B');

    // Release revision B via API
    const releaseRes = await fetch(`${BASE_URL}/api/products/${prod.id}/revisions/${revB.id}/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ effective_date: '2026-11-06' }),
    });

    assert.strictEqual(releaseRes.status, 200);
    const released = await releaseRes.json();
    assert.strictEqual(released.revision_status, 'RELEASED');
  });
});
