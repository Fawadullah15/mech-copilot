import { db } from '../db/client.js';
import { randomUUID } from 'node:crypto';
import type {
  BOMHeader,
  BOMLineWithComponent,
  ExplodedBOMNode,
  ExplodedBOMResult,
  SummarizedComponentRequirement,
  ItemType,
} from '../types/manufacturing.js';

export class BOMCalculationError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'BOMCalculationError';
  }
}

export class CircularBOMReferenceError extends BOMCalculationError {
  constructor(public cyclePath: string[]) {
    super(
      `Circular BOM reference detected in hierarchy: ${cyclePath.join(' -> ')}`,
      422
    );
    this.name = 'CircularBOMReferenceError';
  }
}

/**
 * Retrieves the active primary BOM for a given product ID.
 * Prefers RELEASED BOMs; falls back to DRAFT PRIMARY BOM if no released one exists.
 */
export function getActiveBOMForProduct(productId: string): BOMHeader | null {
  // First attempt: Primary released BOM
  let bom = db
    .prepare(`
      SELECT * FROM bom_headers
      WHERE parent_product_id = ? AND status = 'RELEASED'
      ORDER BY created_at DESC LIMIT 1;
    `)
    .get(productId) as unknown as BOMHeader | undefined;

  if (bom) return bom;

  // Second attempt: Primary DRAFT BOM
  bom = db
    .prepare(`
      SELECT * FROM bom_headers
      WHERE parent_product_id = ? AND alt_code = 'PRIMARY'
      ORDER BY created_at DESC LIMIT 1;
    `)
    .get(productId) as unknown as BOMHeader | undefined;

  if (bom) return bom;

  // Third attempt: Any BOM
  bom = db
    .prepare(`
      SELECT * FROM bom_headers
      WHERE parent_product_id = ?
      ORDER BY created_at DESC LIMIT 1;
    `)
    .get(productId) as unknown as BOMHeader | undefined;

  return bom || null;
}

/**
 * Retrieves lines for a BOM header with joined component product metadata.
 */
export function getBOMLinesWithComponents(bomId: string): BOMLineWithComponent[] {
  const rows = db
    .prepare(`
      SELECT
        bl.id,
        bl.bom_id,
        bl.line_number,
        bl.component_product_id,
        bl.component_revision_id,
        bl.quantity,
        bl.unit,
        bl.scrap_percentage,
        bl.supply_classification,
        bl.preferred_sourcing,
        bl.notes,
        p.item_code as component_item_code,
        p.name as component_name,
        p.item_type as component_item_type,
        p.base_unit as component_base_unit,
        pr.revision_code as component_revision_code
      FROM bom_lines bl
      JOIN products p ON bl.component_product_id = p.id
      LEFT JOIN product_revisions pr ON bl.component_revision_id = pr.id
      WHERE bl.bom_id = ?
      ORDER BY bl.line_number ASC;
    `)
    .all(bomId) as any[];

  return rows.map((r) => ({
    id: r.id,
    bom_id: r.bom_id,
    line_number: r.line_number,
    component_product_id: r.component_product_id,
    component_revision_id: r.component_revision_id,
    quantity: r.quantity,
    unit: r.unit,
    scrap_percentage: r.scrap_percentage,
    supply_classification: r.supply_classification,
    preferred_sourcing: r.preferred_sourcing,
    notes: r.notes || '',
    component_item_code: r.component_item_code,
    component_name: r.component_name,
    component_item_type: r.component_item_type,
    component_base_unit: r.component_base_unit,
    component_revision_code: r.component_revision_code || null,
  }));
}

/**
 * Performs a deterministic recursive multi-level BOM explosion.
 *
 * @param bomId The root BOM header ID
 * @param targetQuantity Number of parent assemblies to produce (default: 1.0)
 */
export function explodeBOM(bomId: string, targetQuantity: number = 1.0): ExplodedBOMResult {
  if (targetQuantity <= 0) {
    throw new BOMCalculationError('Explosion target quantity must be strictly greater than zero');
  }

  const rootBom = db.prepare('SELECT * FROM bom_headers WHERE id = ?;').get(bomId) as unknown as BOMHeader | undefined;
  if (!rootBom) {
    throw new BOMCalculationError(`BOM header not found: ${bomId}`, 404);
  }

  const parentProd = db
    .prepare('SELECT id, item_code, name, item_type, base_unit FROM products WHERE id = ?;')
    .get(rootBom.parent_product_id) as any;
  if (!parentProd) {
    throw new BOMCalculationError(`Parent product not found for BOM: ${bomId}`, 404);
  }

  const unresolvedSubassemblies: { product_id: string; item_code: string; name: string; path: string }[] = [];
  const visitedProductIdsOnPath: string[] = [parentProd.id];
  const itemCodesOnPath: string[] = [parentProd.item_code];

  // Helper for recursive explosion
  function explodeLines(
    currentBomId: string,
    parentId: string,
    parentItemCode: string,
    parentName: string,
    accumulatedMultiplier: number,
    currentLevel: number,
    currentPath: string[],
    visitedIds: string[]
  ): ExplodedBOMNode[] {
    const lines = getBOMLinesWithComponents(currentBomId);
    const nodes: ExplodedBOMNode[] = [];

    for (const line of lines) {
      const componentId = line.component_product_id;
      const componentCode = line.component_item_code;
      const nextPath = [...currentPath, componentCode];

      // Check for circular reference on current traversal path
      if (visitedIds.includes(componentId)) {
        throw new CircularBOMReferenceError([...nextPath]);
      }

      // Unit compatibility check
      if (line.unit.toUpperCase() !== line.component_base_unit.toUpperCase()) {
        throw new BOMCalculationError(
          `Unit mismatch at line ${line.line_number} for component '${componentCode}': line specifies '${line.unit}' but component base unit is '${line.component_base_unit}'. Unit conversions are not yet permitted.`
        );
      }

      // Net and gross calculation
      const lineMultiplier = line.quantity;
      const netQty = accumulatedMultiplier * lineMultiplier;
      const scrapFactor = 1 + line.scrap_percentage / 100;
      const grossQty = Math.round(netQty * scrapFactor * 10000) / 10000;

      const isSubassembly =
        line.component_item_type === 'SUBASSEMBLY' ||
        (line.component_item_type === 'FINISHED_PRODUCT' && line.supply_classification === 'MAKE');

      let childNodes: ExplodedBOMNode[] = [];
      let missingBOM = false;
      let subassemblyBomId: string | undefined = undefined;

      if (isSubassembly) {
        const subBom = getActiveBOMForProduct(componentId);
        if (subBom) {
          subassemblyBomId = subBom.id;
          childNodes = explodeLines(
            subBom.id,
            componentId,
            componentCode,
            line.component_name,
            netQty, // children inherit parent's cumulative net quantity
            currentLevel + 1,
            nextPath,
            [...visitedIds, componentId]
          );
        } else {
          missingBOM = true;
          unresolvedSubassemblies.push({
            product_id: componentId,
            item_code: componentCode,
            name: line.component_name,
            path: nextPath.join(' / '),
          });
        }
      }

      const node: ExplodedBOMNode = {
        node_id: `node-${randomUUID()}`,
        level: currentLevel,
        line_number: line.line_number,
        path: nextPath,
        path_string: nextPath.join(' / '),
        parent_product_id: parentId,
        parent_item_code: parentItemCode,
        parent_name: parentName,
        component_product_id: componentId,
        component_item_code: componentCode,
        component_name: line.component_name,
        item_type: line.component_item_type,
        supply_classification: line.supply_classification,
        preferred_sourcing: line.preferred_sourcing,
        unit: line.unit,
        unit_quantity: line.quantity,
        scrap_percentage: line.scrap_percentage,
        net_required_quantity: Math.round(netQty * 10000) / 10000,
        gross_required_quantity: grossQty,
        has_children: childNodes.length > 0,
        missing_bom: missingBOM,
        subassembly_bom_id: subassemblyBomId,
        children: childNodes,
      };

      nodes.push(node);
    }

    return nodes;
  }

  const hierarchy = explodeLines(
    rootBom.id,
    parentProd.id,
    parentProd.item_code,
    parentProd.name,
    targetQuantity,
    1,
    [parentProd.item_code],
    visitedProductIdsOnPath
  );

  const summary = summarizeHierarchy(hierarchy);

  return {
    bom_id: rootBom.id,
    bom_code: rootBom.bom_code,
    parent_product: {
      id: parentProd.id,
      item_code: parentProd.item_code,
      name: parentProd.name,
      item_type: parentProd.item_type,
      base_unit: parentProd.base_unit,
    },
    target_quantity: targetQuantity,
    hierarchy,
    summary,
    unresolved_subassemblies: unresolvedSubassemblies,
    calculation_timestamp: new Date().toISOString(),
    engine_version: '1.0.0-deterministic',
  };
}

/**
 * Aggregates all components in the exploded tree into a summarized list of requirements.
 * Leaf components and intermediate parts are grouped by component product ID.
 */
export function summarizeHierarchy(nodes: ExplodedBOMNode[]): SummarizedComponentRequirement[] {
  const map = new Map<string, SummarizedComponentRequirement>();

  function collect(nodeList: ExplodedBOMNode[]) {
    for (const node of nodeList) {
      const existing = map.get(node.component_product_id);
      if (!existing) {
        map.set(node.component_product_id, {
          product_id: node.component_product_id,
          item_code: node.component_item_code,
          name: node.component_name,
          item_type: node.item_type,
          supply_classification: node.supply_classification,
          preferred_sourcing: node.preferred_sourcing,
          unit: node.unit,
          total_net_quantity: node.net_required_quantity,
          total_gross_quantity: node.gross_required_quantity,
          scrap_allowance_quantity: Math.round((node.gross_required_quantity - node.net_required_quantity) * 10000) / 10000,
          usage_count: 1,
          usage_paths: [node.path_string],
        });
      } else {
        existing.total_net_quantity = Math.round((existing.total_net_quantity + node.net_required_quantity) * 10000) / 10000;
        existing.total_gross_quantity = Math.round((existing.total_gross_quantity + node.gross_required_quantity) * 10000) / 10000;
        existing.scrap_allowance_quantity = Math.round((existing.total_gross_quantity - existing.total_net_quantity) * 10000) / 10000;
        existing.usage_count += 1;
        if (!existing.usage_paths.includes(node.path_string)) {
          existing.usage_paths.push(node.path_string);
        }
      }

      if (node.children && node.children.length > 0) {
        collect(node.children);
      }
    }
  }

  collect(nodes);

  return Array.from(map.values()).sort((a, b) => a.item_code.localeCompare(b.item_code));
}
