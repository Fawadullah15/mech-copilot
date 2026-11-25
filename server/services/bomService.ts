import { db } from '../db/client.js';
import { randomUUID } from 'node:crypto';
import type {
  BOMHeader,
  BOMLine,
  BOMLineWithComponent,
  BOMWithLines,
  BOMValidationResult,
  BOMStatus,
  SupplyClassification,
  PreferredSourcing,
} from '../types/manufacturing.js';
import { getProductById } from './productService.js';
import {
  getBOMLinesWithComponents,
  explodeBOM,
  CircularBOMReferenceError,
} from './bomCalculationService.js';

export interface CreateBOMInput {
  parent_product_id: string;
  parent_revision_id?: string | null;
  bom_code: string;
  alt_code?: string;
  base_quantity?: number;
  unit?: string;
  notes?: string;
}

export interface UpdateBOMInput {
  alt_code?: string;
  base_quantity?: number;
  unit?: string;
  notes?: string;
}

export interface AddBOMLineInput {
  line_number?: number;
  component_product_id: string;
  component_revision_id?: string | null;
  quantity: number;
  unit: string;
  scrap_percentage?: number;
  supply_classification: SupplyClassification;
  preferred_sourcing?: PreferredSourcing;
  notes?: string;
}

export interface UpdateBOMLineInput {
  line_number?: number;
  component_revision_id?: string | null;
  quantity?: number;
  unit?: string;
  scrap_percentage?: number;
  supply_classification?: SupplyClassification;
  preferred_sourcing?: PreferredSourcing;
  notes?: string;
}

export interface BOMQueryFilters {
  parent_product_id?: string;
  status?: BOMStatus;
  search?: string;
}

export class BOMError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'BOMError';
  }
}

export class BOMNotFoundError extends BOMError {
  constructor(id: string) {
    super(`BOM not found: ${id}`, 404);
    this.name = 'BOMNotFoundError';
  }
}

export class BOMLineNotFoundError extends BOMError {
  constructor(lineId: string, bomId: string) {
    super(`BOM line '${lineId}' not found on BOM '${bomId}'`, 404);
    this.name = 'BOMLineNotFoundError';
  }
}

export class BOMImmutableError extends BOMError {
  constructor(bomCode: string, action: string = 'modify') {
    super(
      `Cannot ${action} released or obsolete BOM '${bomCode}'. Released BOMs are immutable. Create a new draft revision or alternative definition.`,
      409
    );
    this.name = 'BOMImmutableError';
  }
}

export class BOMValidationError extends BOMError {
  constructor(public errors: string[]) {
    super(`BOM validation failed: ${errors.join('; ')}`, 422);
    this.name = 'BOMValidationError';
  }
}

/**
 * Creates a new BOM Header in DRAFT status.
 */
export function createBOM(input: CreateBOMInput): BOMWithLines {
  const parentProd = getProductById(input.parent_product_id);
  if (!parentProd) {
    throw new BOMError(`Parent product not found: ${input.parent_product_id}`, 404);
  }

  if (input.parent_revision_id) {
    const rev = parentProd.revisions.find((r) => r.id === input.parent_revision_id);
    if (!rev) {
      throw new BOMError(`Parent revision '${input.parent_revision_id}' does not belong to product '${parentProd.item_code}'`, 400);
    }
  }

  const bomCode = input.bom_code.trim();
  const altCode = (input.alt_code || 'PRIMARY').trim().toUpperCase();
  const baseQty = input.base_quantity && input.base_quantity > 0 ? input.base_quantity : 1.0;
  const unit = (input.unit || parentProd.base_unit).trim().toUpperCase();

  // Check unique constraint: parent_product_id + bom_code + alt_code
  const existing = db
    .prepare('SELECT id FROM bom_headers WHERE parent_product_id = ? AND bom_code = ? AND alt_code = ?;')
    .get(parentProd.id, bomCode, altCode);
  if (existing) {
    throw new BOMError(`BOM with code '${bomCode}' and alternative '${altCode}' already exists for product '${parentProd.item_code}'`, 409);
  }

  const now = new Date().toISOString();
  const bomId = `bom-${randomUUID()}`;

  const stmt = db.prepare(`
    INSERT INTO bom_headers (
      id, parent_product_id, parent_revision_id, bom_code, alt_code,
      status, base_quantity, unit, notes, created_at, updated_at, released_at
    ) VALUES (?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, NULL);
  `);

  stmt.run(
    bomId,
    parentProd.id,
    input.parent_revision_id || null,
    bomCode,
    altCode,
    baseQty,
    unit,
    (input.notes || '').trim(),
    now,
    now
  );

  return getBOMById(bomId)!;
}

/**
 * Retrieves a list of BOM headers filtered by parent product or status.
 */
export function getBOMs(filters: BOMQueryFilters = {}): BOMHeader[] {
  let sql = 'SELECT * FROM bom_headers WHERE 1=1';
  const params: any[] = [];

  if (filters.parent_product_id) {
    sql += ' AND parent_product_id = ?';
    params.push(filters.parent_product_id);
  }

  if (filters.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    sql += ' AND (bom_code LIKE ? OR notes LIKE ?)';
    params.push(term, term);
  }

  sql += ' ORDER BY created_at DESC;';

  return db.prepare(sql).all(...params) as unknown as BOMHeader[];
}

/**
 * Retrieves a BOM by ID including all lines with joined component product data.
 */
export function getBOMById(id: string): BOMWithLines | null {
  const header = db.prepare('SELECT * FROM bom_headers WHERE id = ?;').get(id) as unknown as BOMHeader | undefined;
  if (!header) return null;

  const parentProduct = getProductById(header.parent_product_id) || undefined;
  const parentRevision = header.parent_revision_id
    ? parentProduct?.revisions.find((r) => r.id === header.parent_revision_id) || null
    : null;

  const lines = getBOMLinesWithComponents(id);

  return {
    ...header,
    parent_product: parentProduct,
    parent_revision: parentRevision,
    lines,
  };
}

/**
 * Updates an existing draft BOM header. Released or Obsolete BOMs cannot be modified.
 */
export function updateBOM(id: string, updates: UpdateBOMInput): BOMWithLines {
  const current = getBOMById(id);
  if (!current) throw new BOMNotFoundError(id);

  if (current.status !== 'DRAFT') {
    throw new BOMImmutableError(current.bom_code, 'update');
  }

  const now = new Date().toISOString();
  const newAlt = updates.alt_code !== undefined ? updates.alt_code.trim().toUpperCase() : current.alt_code;
  const newBaseQty = updates.base_quantity !== undefined ? updates.base_quantity : current.base_quantity;
  const newUnit = updates.unit !== undefined ? updates.unit.trim().toUpperCase() : current.unit;
  const newNotes = updates.notes !== undefined ? updates.notes.trim() : current.notes;

  db.prepare(`
    UPDATE bom_headers
    SET alt_code = ?, base_quantity = ?, unit = ?, notes = ?, updated_at = ?
    WHERE id = ?;
  `).run(newAlt, newBaseQty, newUnit, newNotes, now, id);

  return getBOMById(id)!;
}

/**
 * Deletes a draft BOM header and its line items.
 */
export function deleteBOM(id: string): void {
  const current = getBOMById(id);
  if (!current) throw new BOMNotFoundError(id);

  if (current.status === 'RELEASED') {
    throw new BOMImmutableError(current.bom_code, 'delete');
  }

  db.prepare('DELETE FROM bom_headers WHERE id = ?;').run(id);
}

/**
 * Adds a new line item to a draft BOM.
 */
export function addBOMLine(bomId: string, input: AddBOMLineInput): BOMLineWithComponent {
  const bom = getBOMById(bomId);
  if (!bom) throw new BOMNotFoundError(bomId);

  if (bom.status !== 'DRAFT') {
    throw new BOMImmutableError(bom.bom_code, 'add lines to');
  }

  // Prevent parent from being added as its own immediate component
  if (input.component_product_id === bom.parent_product_id) {
    throw new BOMError('Cannot add parent product as a component of its own Bill of Materials', 422);
  }

  const compProd = getProductById(input.component_product_id);
  if (!compProd) {
    throw new BOMError(`Component product not found: ${input.component_product_id}`, 404);
  }

  // Unit compatibility enforcement
  const lineUnit = input.unit.trim().toUpperCase();
  if (lineUnit !== compProd.base_unit.toUpperCase()) {
    throw new BOMError(
      `Line item unit '${lineUnit}' is incompatible with component '${compProd.item_code}' base unit '${compProd.base_unit}'. Conversions are currently disabled.`,
      422
    );
  }

  if (input.quantity <= 0) {
    throw new BOMError('Component quantity must be strictly greater than zero', 400);
  }

  const scrapPct = input.scrap_percentage !== undefined ? input.scrap_percentage : 0.0;
  if (scrapPct < 0 || scrapPct >= 100) {
    throw new BOMError('Scrap percentage must be between 0.0% and 99.99%', 400);
  }

  // Auto-generate line number if omitted
  let lineNum = input.line_number;
  if (!lineNum || lineNum <= 0) {
    const maxLine = db
      .prepare('SELECT MAX(line_number) as maxNum FROM bom_lines WHERE bom_id = ?;')
      .get(bomId) as { maxNum: number | null };
    lineNum = (maxLine?.maxNum ?? 0) + 10;
  }

  // Check unique line number on this BOM
  const existingLine = db
    .prepare('SELECT id FROM bom_lines WHERE bom_id = ? AND line_number = ?;')
    .get(bomId, lineNum);
  if (existingLine) {
    throw new BOMError(`Line number ${lineNum} already exists on BOM '${bom.bom_code}'`, 409);
  }

  const lineId = `line-${randomUUID()}`;

  const stmt = db.prepare(`
    INSERT INTO bom_lines (
      id, bom_id, line_number, component_product_id, component_revision_id,
      quantity, unit, scrap_percentage, supply_classification, preferred_sourcing, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  stmt.run(
    lineId,
    bomId,
    lineNum,
    compProd.id,
    input.component_revision_id || null,
    input.quantity,
    lineUnit,
    scrapPct,
    input.supply_classification,
    input.preferred_sourcing || 'ANY',
    (input.notes || '').trim()
  );

  const lines = getBOMLinesWithComponents(bomId);
  const created = lines.find((l) => l.id === lineId);
  if (!created) throw new BOMError('Failed to retrieve newly added line', 500);

  // Update parent BOM updated_at timestamp
  db.prepare('UPDATE bom_headers SET updated_at = ? WHERE id = ?;').run(new Date().toISOString(), bomId);

  return created;
}

/**
 * Updates an existing BOM line item.
 */
export function updateBOMLine(bomId: string, lineId: string, updates: UpdateBOMLineInput): BOMLineWithComponent {
  const bom = getBOMById(bomId);
  if (!bom) throw new BOMNotFoundError(bomId);

  if (bom.status !== 'DRAFT') {
    throw new BOMImmutableError(bom.bom_code, 'update lines on');
  }

  const existingLine = bom.lines.find((l) => l.id === lineId);
  if (!existingLine) throw new BOMLineNotFoundError(lineId, bomId);

  const newQty = updates.quantity !== undefined ? updates.quantity : existingLine.quantity;
  if (newQty <= 0) throw new BOMError('Quantity must be strictly greater than zero', 400);

  const newScrap = updates.scrap_percentage !== undefined ? updates.scrap_percentage : existingLine.scrap_percentage;
  if (newScrap < 0 || newScrap >= 100) throw new BOMError('Scrap percentage must be between 0.0% and 99.99%', 400);

  const newUnit = updates.unit !== undefined ? updates.unit.trim().toUpperCase() : existingLine.unit;
  if (newUnit !== existingLine.component_base_unit.toUpperCase()) {
    throw new BOMError(
      `Line item unit '${newUnit}' is incompatible with component base unit '${existingLine.component_base_unit}'`,
      422
    );
  }

  const newLineNum = updates.line_number !== undefined ? updates.line_number : existingLine.line_number;
  if (newLineNum !== existingLine.line_number) {
    const conflict = db
      .prepare('SELECT id FROM bom_lines WHERE bom_id = ? AND line_number = ? AND id != ?;')
      .get(bomId, newLineNum, lineId);
    if (conflict) {
      throw new BOMError(`Line number ${newLineNum} already exists on BOM '${bom.bom_code}'`, 409);
    }
  }

  const newSupply = updates.supply_classification !== undefined ? updates.supply_classification : existingLine.supply_classification;
  const newSourcing = updates.preferred_sourcing !== undefined ? updates.preferred_sourcing : existingLine.preferred_sourcing;
  const newNotes = updates.notes !== undefined ? updates.notes.trim() : existingLine.notes;
  const newRevId = updates.component_revision_id !== undefined ? updates.component_revision_id : existingLine.component_revision_id;

  db.prepare(`
    UPDATE bom_lines
    SET line_number = ?, component_revision_id = ?, quantity = ?, unit = ?,
        scrap_percentage = ?, supply_classification = ?, preferred_sourcing = ?, notes = ?
    WHERE id = ?;
  `).run(newLineNum, newRevId, newQty, newUnit, newScrap, newSupply, newSourcing, newNotes, lineId);

  // Update parent BOM updated_at
  db.prepare('UPDATE bom_headers SET updated_at = ? WHERE id = ?;').run(new Date().toISOString(), bomId);

  const lines = getBOMLinesWithComponents(bomId);
  return lines.find((l) => l.id === lineId)!;
}

/**
 * Removes a line item from a draft BOM.
 */
export function deleteBOMLine(bomId: string, lineId: string): void {
  const bom = getBOMById(bomId);
  if (!bom) throw new BOMNotFoundError(bomId);

  if (bom.status !== 'DRAFT') {
    throw new BOMImmutableError(bom.bom_code, 'delete lines from');
  }

  const existingLine = bom.lines.find((l) => l.id === lineId);
  if (!existingLine) throw new BOMLineNotFoundError(lineId, bomId);

  db.prepare('DELETE FROM bom_lines WHERE id = ? AND bom_id = ?;').run(lineId, bomId);
  db.prepare('UPDATE bom_headers SET updated_at = ? WHERE id = ?;').run(new Date().toISOString(), bomId);
}

/**
 * Validates a BOM structure for completeness, consistency, and acyclicity.
 */
export function validateBOM(bomId: string): BOMValidationResult {
  const bom = getBOMById(bomId);
  if (!bom) throw new BOMNotFoundError(bomId);

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check 1: Must contain at least one line item
  if (bom.lines.length === 0) {
    errors.push('BOM contains no component lines. A valid BOM must specify at least one component or raw material.');
  }

  // Check 2: Verify component existence and active status
  for (const line of bom.lines) {
    const comp = getProductById(line.component_product_id);
    if (!comp) {
      errors.push(`Line ${line.line_number}: Component product ID '${line.component_product_id}' does not exist.`);
      continue;
    }

    if (comp.is_archived === 1 || comp.lifecycle_status === 'ARCHIVED') {
      errors.push(`Line ${line.line_number}: Component '${comp.item_code}' is archived and cannot be used in a released BOM.`);
    }

    if (line.unit.toUpperCase() !== comp.base_unit.toUpperCase()) {
      errors.push(`Line ${line.line_number}: Unit mismatch for '${comp.item_code}'. Line unit is '${line.unit}', component base unit is '${comp.base_unit}'.`);
    }

    if (line.quantity <= 0) {
      errors.push(`Line ${line.line_number}: Quantity must be greater than zero.`);
    }

    if (line.scrap_percentage < 0 || line.scrap_percentage >= 100) {
      errors.push(`Line ${line.line_number}: Invalid scrap percentage (${line.scrap_percentage}%).`);
    }

    if (line.component_item_type === 'SUBASSEMBLY' && line.supply_classification === 'MAKE') {
      const subBom = db.prepare('SELECT id, status FROM bom_headers WHERE parent_product_id = ? LIMIT 1;').get(comp.id) as any;
      if (!subBom) {
        warnings.push(`Subassembly '${comp.item_code}' at line ${line.line_number} does not yet have a defined BOM.`);
      } else if (subBom.status !== 'RELEASED') {
        warnings.push(`Subassembly '${comp.item_code}' at line ${line.line_number} has an unreleased BOM (status: ${subBom.status}).`);
      }
    }
  }

  // Check 3: Check for circular references through entire multi-level hierarchy
  try {
    explodeBOM(bomId, 1.0);
  } catch (err: any) {
    if (err instanceof CircularBOMReferenceError) {
      errors.push(err.message);
    } else {
      errors.push(`Hierarchy resolution failure: ${err.message}`);
    }
  }

  return {
    valid: errors.length === 0,
    bom_id: bom.id,
    bom_code: bom.bom_code,
    errors,
    warnings,
    checked_at: new Date().toISOString(),
  };
}

/**
 * Releases a draft BOM, freezing its definition permanently.
 */
export function releaseBOM(bomId: string): BOMWithLines {
  const bom = getBOMById(bomId);
  if (!bom) throw new BOMNotFoundError(bomId);

  if (bom.status === 'RELEASED') {
    return bom;
  }

  const validation = validateBOM(bomId);
  if (!validation.valid) {
    throw new BOMValidationError(validation.errors);
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE bom_headers
    SET status = 'RELEASED', released_at = ?, updated_at = ?
    WHERE id = ?;
  `).run(now, now, bomId);

  return getBOMById(bomId)!;
}

/**
 * Marks a released or draft BOM as obsolete.
 */
export function obsoleteBOM(bomId: string): BOMWithLines {
  const bom = getBOMById(bomId);
  if (!bom) throw new BOMNotFoundError(bomId);

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE bom_headers
    SET status = 'OBSOLETE', updated_at = ?
    WHERE id = ?;
  `).run(now, bomId);

  return getBOMById(bomId)!;
}
