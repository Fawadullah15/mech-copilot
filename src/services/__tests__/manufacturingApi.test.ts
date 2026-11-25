import test, { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchProducts,
  fetchProductById,
  createProduct,
  updateProduct,
  archiveProduct,
  deleteProduct,
  createProductRevision,
  releaseProductRevision,
} from '../productApi.ts';
import {
  fetchBOMs,
  fetchBOMById,
  createBOM,
  addBOMLine,
  updateBOMLine,
  deleteBOMLine,
  validateBOM,
  releaseBOM,
  explodeBOM,
} from '../bomApi.ts';

describe('Frontend Manufacturing Client API Service Tests', () => {
  const originalFetch = global.fetch;

  after(() => {
    global.fetch = originalFetch;
  });

  describe('Product API Client', () => {
    it('fetchProducts applies filters to query string and returns array', async () => {
      let capturedUrl = '';
      // @ts-ignore
      global.fetch = async (url: string) => {
        capturedUrl = url;
        return new Response(
          JSON.stringify({
            count: 1,
            products: [
              {
                id: 'prod-1',
                item_code: 'CNC-001',
                name: '3-Axis Milling Center',
                item_type: 'FINISHED_PRODUCT',
                base_unit: 'EA',
                lifecycle_status: 'ACTIVE',
                is_archived: 0,
                created_at: '2026-11-06T00:00:00Z',
                updated_at: '2026-11-06T00:00:00Z',
              },
            ],
          })
        );
      };

      const result = await fetchProducts({
        search: 'CNC',
        item_type: 'FINISHED_PRODUCT',
        is_archived: 0,
      });

      assert.ok(capturedUrl.includes('/api/products?'));
      assert.ok(capturedUrl.includes('search=CNC'));
      assert.ok(capturedUrl.includes('item_type=FINISHED_PRODUCT'));
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].item_code, 'CNC-001');
    });

    it('createProduct sends POST request with payload and returns created item', async () => {
      let capturedMethod = '';
      let capturedBody: any;
      // @ts-ignore
      global.fetch = async (url: string, init?: RequestInit) => {
        capturedMethod = init?.method || '';
        capturedBody = JSON.parse(init?.body as string);
        return new Response(
          JSON.stringify({
            id: 'prod-new',
            ...capturedBody,
            created_at: '2026-11-06T00:00:00Z',
            updated_at: '2026-11-06T00:00:00Z',
          }),
          { status: 201 }
        );
      };

      const product = await createProduct({
        item_code: 'SHAFT-001',
        name: 'Precision Hardened Drive Shaft',
        item_type: 'COMPONENT',
        base_unit: 'EA',
        initial_revision_code: 'A',
      });

      assert.strictEqual(capturedMethod, 'POST');
      assert.strictEqual(capturedBody.item_code, 'SHAFT-001');
      assert.strictEqual(product.id, 'prod-new');
      assert.strictEqual(product.item_code, 'SHAFT-001');
    });

    it('manages product revision creation and release transition', async () => {
      let revCreated = false;
      let revReleased = false;

      // @ts-ignore
      global.fetch = async (url: string, init?: RequestInit) => {
        if (url.includes('/revisions') && init?.method === 'POST' && !url.includes('/release')) {
          revCreated = true;
          return new Response(
            JSON.stringify({
              id: 'rev-b',
              product_id: 'prod-1',
              revision_code: 'B',
              status: 'DRAFT',
              notes: 'Added chamfer',
              created_at: '2026-11-06T00:00:00Z',
            }),
            { status: 201 }
          );
        }
        if (url.includes('/release') && init?.method === 'POST') {
          revReleased = true;
          return new Response(
            JSON.stringify({
              id: 'rev-b',
              product_id: 'prod-1',
              revision_code: 'B',
              status: 'RELEASED',
              notes: 'Added chamfer',
              created_at: '2026-11-06T00:00:00Z',
            })
          );
        }
        throw new Error('Unexpected route: ' + url);
      };

      const rev = await createProductRevision('prod-1', {
        revision_code: 'B',
        notes: 'Added chamfer',
      });
      assert.strictEqual(rev.status, 'DRAFT');
      assert.ok(revCreated);

      const released = await releaseProductRevision('prod-1', 'rev-b');
      assert.strictEqual(released.status, 'RELEASED');
      assert.ok(revReleased);
    });
  });

  describe('BOM API Client', () => {
    it('fetchBOMs queries /api/boms and returns BOM header list', async () => {
      let capturedUrl = '';
      // @ts-ignore
      global.fetch = async (url: string) => {
        capturedUrl = url;
        return new Response(
          JSON.stringify({
            count: 1,
            boms: [
              {
                id: 'bom-1',
                parent_product_id: 'prod-1',
                parent_revision_id: null,
                bom_code: 'BOM-CNC-01',
                alt_code: '01',
                status: 'DRAFT',
                base_quantity: 1,
                unit: 'EA',
                notes: 'Primary production routing',
                created_at: '2026-11-06T00:00:00Z',
                updated_at: '2026-11-06T00:00:00Z',
                released_at: null,
              },
            ],
          })
        );
      };

      const boms = await fetchBOMs({ status: 'DRAFT' });
      assert.ok(capturedUrl.includes('/api/boms?status=DRAFT'));
      assert.strictEqual(boms.length, 1);
      assert.strictEqual(boms[0].bom_code, 'BOM-CNC-01');
    });

    it('addBOMLine sends component details to line endpoint', async () => {
      let capturedBody: any;
      // @ts-ignore
      global.fetch = async (url: string, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        return new Response(
          JSON.stringify({
            id: 'line-1',
            bom_id: 'bom-1',
            line_number: 10,
            component_product_id: capturedBody.component_product_id,
            component_item_code: 'BEAR-6205',
            component_name: 'Deep Groove Ball Bearing 6205',
            component_item_type: 'COMPONENT',
            component_base_unit: 'EA',
            quantity: capturedBody.quantity,
            unit: capturedBody.unit,
            scrap_percentage: capturedBody.scrap_percentage || 0,
            supply_classification: capturedBody.supply_classification,
            preferred_sourcing: capturedBody.preferred_sourcing,
            notes: capturedBody.notes || '',
          }),
          { status: 201 }
        );
      };

      const line = await addBOMLine('bom-1', {
        line_number: 10,
        component_product_id: 'prod-bear-6205',
        quantity: 2,
        unit: 'EA',
        scrap_percentage: 2.5,
        supply_classification: 'BUY',
        preferred_sourcing: 'LOCAL',
        notes: 'Pre-lubricated bearing',
      });

      assert.strictEqual(line.line_number, 10);
      assert.strictEqual(line.quantity, 2);
      assert.strictEqual(line.scrap_percentage, 2.5);
      assert.strictEqual(line.supply_classification, 'BUY');
      assert.strictEqual(line.preferred_sourcing, 'LOCAL');
    });

    it('validateBOM and releaseBOM execute validation diagnostics and release locking', async () => {
      let validateCalled = false;
      let releaseCalled = false;

      // @ts-ignore
      global.fetch = async (url: string, init?: RequestInit) => {
        if (url.includes('/validate')) {
          validateCalled = true;
          return new Response(
            JSON.stringify({
              valid: true,
              bom_id: 'bom-1',
              bom_code: 'BOM-CNC-01',
              errors: [],
              warnings: [],
              checked_at: '2026-11-06T00:00:00Z',
            })
          );
        }
        if (url.includes('/release')) {
          releaseCalled = true;
          return new Response(
            JSON.stringify({
              id: 'bom-1',
              parent_product_id: 'prod-1',
              bom_code: 'BOM-CNC-01',
              status: 'RELEASED',
              base_quantity: 1,
              unit: 'EA',
              lines: [],
              released_at: '2026-11-06T00:00:00Z',
            })
          );
        }
        throw new Error('Unknown path ' + url);
      };

      const validation = await validateBOM('bom-1');
      assert.ok(validateCalled);
      assert.strictEqual(validation.valid, true);
      assert.strictEqual(validation.errors.length, 0);

      const releasedBOM = await releaseBOM('bom-1');
      assert.ok(releaseCalled);
      assert.strictEqual(releasedBOM.status, 'RELEASED');
    });

    it('explodeBOM requests scaled target quantity and returns hierarchy and summary', async () => {
      let capturedUrl = '';
      // @ts-ignore
      global.fetch = async (url: string) => {
        capturedUrl = url;
        return new Response(
          JSON.stringify({
            bom_id: 'bom-1',
            bom_code: 'BOM-CNC-01',
            parent_product: {
              id: 'prod-1',
              item_code: 'CNC-001',
              name: 'CNC Milling Center',
              item_type: 'FINISHED_PRODUCT',
              base_unit: 'EA',
            },
            target_quantity: 5,
            hierarchy: [
              {
                node_id: 'node-1',
                level: 1,
                line_number: 10,
                path: ['CNC-001', 'HEAD-001'],
                path_string: 'CNC-001 > HEAD-001',
                parent_product_id: 'prod-1',
                parent_item_code: 'CNC-001',
                parent_name: 'CNC Milling Center',
                component_product_id: 'prod-head',
                component_item_code: 'HEAD-001',
                component_name: 'Milling Spindle Head',
                item_type: 'SUBASSEMBLY',
                supply_classification: 'MAKE',
                preferred_sourcing: 'INTERNAL',
                unit: 'EA',
                unit_quantity: 1,
                scrap_percentage: 0,
                net_required_quantity: 5,
                gross_required_quantity: 5,
                has_children: false,
                missing_bom: false,
                children: [],
              },
            ],
            summary: [
              {
                product_id: 'prod-head',
                item_code: 'HEAD-001',
                name: 'Milling Spindle Head',
                item_type: 'SUBASSEMBLY',
                supply_classification: 'MAKE',
                preferred_sourcing: 'INTERNAL',
                unit: 'EA',
                total_net_quantity: 5,
                total_gross_quantity: 5,
                scrap_allowance_quantity: 0,
                usage_count: 1,
                usage_paths: ['CNC-001 > HEAD-001'],
              },
            ],
            unresolved_subassemblies: [],
            calculation_timestamp: '2026-11-06T00:00:00Z',
            engine_version: 'v1.0-deterministic',
          })
        );
      };

      const explosion = await explodeBOM('bom-1', 5);
      assert.ok(capturedUrl.includes('/api/boms/bom-1/explode?quantity=5'));
      assert.strictEqual(explosion.target_quantity, 5);
      assert.strictEqual(explosion.hierarchy.length, 1);
      assert.strictEqual(explosion.summary[0].total_net_quantity, 5);
      assert.strictEqual(explosion.summary[0].item_code, 'HEAD-001');
    });
  });
});
