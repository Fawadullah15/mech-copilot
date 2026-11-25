import { db } from '../db/client.js';
import { randomUUID } from 'node:crypto';
import type {
  Product,
  ProductRevision,
  ProductWithRevisions,
  ItemType,
  LifecycleStatus,
} from '../types/manufacturing.js';

export interface CreateProductInput {
  item_code: string;
  name: string;
  description?: string;
  item_type: ItemType;
  base_unit: string;
  lifecycle_status?: LifecycleStatus;
  initial_revision_code?: string;
  initial_revision_notes?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  item_type?: ItemType;
  base_unit?: string;
  lifecycle_status?: LifecycleStatus;
}

export interface ProductQueryFilters {
  search?: string;
  item_type?: ItemType;
  lifecycle_status?: LifecycleStatus;
  is_archived?: number;
  limit?: number;
  offset?: number;
}

export interface CreateRevisionInput {
  revision_code: string;
  notes?: string;
  effective_date?: string;
}

export class ProductError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'ProductError';
  }
}

export class ProductNotFoundError extends ProductError {
  constructor(identifier: string) {
    super(`Product not found: ${identifier}`, 404);
    this.name = 'ProductNotFoundError';
  }
}

export class DuplicateProductCodeError extends ProductError {
  constructor(code: string) {
    super(`Product with code '${code}' already exists`, 409);
    this.name = 'DuplicateProductCodeError';
  }
}

export class ProductInUseError extends ProductError {
  constructor(code: string, detail: string) {
    super(`Cannot delete product '${code}': ${detail}`, 409);
    this.name = 'ProductInUseError';
  }
}

export class RevisionError extends ProductError {
  constructor(message: string, statusCode: number = 400) {
    super(message, statusCode);
    this.name = 'RevisionError';
  }
}

/**
 * Creates a new Product record and immediately provisions initial revision (e.g. Rev 'A').
 */
export function createProduct(input: CreateProductInput): ProductWithRevisions {
  const existing = getProductByCode(input.item_code);
  if (existing) {
    throw new DuplicateProductCodeError(input.item_code);
  }

  const now = new Date().toISOString();
  const productId = `prod-${randomUUID()}`;
  const revisionId = `prev-${randomUUID()}`;
  const revCode = input.initial_revision_code || 'A';
  const revNotes = input.initial_revision_notes || 'Initial engineering release baseline';

  db.exec('BEGIN IMMEDIATE;');
  try {
    const insertProd = db.prepare(`
      INSERT INTO products (
        id, item_code, name, description, item_type, base_unit,
        lifecycle_status, is_archived, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?);
    `);

    insertProd.run(
      productId,
      input.item_code.trim(),
      input.name.trim(),
      (input.description || '').trim(),
      input.item_type,
      input.base_unit.trim().toUpperCase(),
      input.lifecycle_status || 'ACTIVE',
      now,
      now
    );

    const insertRev = db.prepare(`
      INSERT INTO product_revisions (
        id, product_id, revision_code, revision_status, notes,
        effective_date, released_at, created_at
      ) VALUES (?, ?, ?, 'DRAFT', ?, ?, NULL, ?);
    `);

    insertRev.run(
      revisionId,
      productId,
      revCode.trim().toUpperCase(),
      revNotes,
      now,
      now
    );

    db.exec('COMMIT;');
  } catch (err: any) {
    try {
      db.exec('ROLLBACK;');
    } catch {}
    if (err.message && err.message.includes('UNIQUE constraint failed: products.item_code')) {
      throw new DuplicateProductCodeError(input.item_code);
    }
    throw err;
  }

  const created = getProductById(productId);
  if (!created) throw new ProductError('Failed to retrieve newly created product', 500);
  return created;
}

/**
 * Retrieves a list of products matching search criteria and filters.
 */
export function getProducts(filters: ProductQueryFilters = {}): Product[] {
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params: any[] = [];

  if (filters.is_archived !== undefined) {
    sql += ' AND is_archived = ?';
    params.push(filters.is_archived);
  } else {
    // Default to unarchived products unless explicitly asked
    sql += ' AND is_archived = 0';
  }

  if (filters.item_type) {
    sql += ' AND item_type = ?';
    params.push(filters.item_type);
  }

  if (filters.lifecycle_status) {
    sql += ' AND lifecycle_status = ?';
    params.push(filters.lifecycle_status);
  }

  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    sql += ' AND (item_code LIKE ? OR name LIKE ? OR description LIKE ?)';
    params.push(term, term, term);
  }

  sql += ' ORDER BY item_code ASC';

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }
  }

  const rows = db.prepare(sql).all(...params) as unknown as Product[];
  return rows;
}

/**
 * Retrieves a product by ID along with its revision history.
 */
export function getProductById(id: string): ProductWithRevisions | null {
  const prod = db.prepare('SELECT * FROM products WHERE id = ?;').get(id) as unknown as Product | undefined;
  if (!prod) return null;

  const revisions = db
    .prepare('SELECT * FROM product_revisions WHERE product_id = ? ORDER BY created_at DESC;')
    .all(id) as unknown as ProductRevision[];

  const currentRevision = revisions.find((r) => r.revision_status === 'RELEASED') || revisions[0];

  return {
    ...prod,
    revisions,
    current_revision: currentRevision,
  };
}

/**
 * Retrieves a product by unique item code.
 */
export function getProductByCode(itemCode: string): Product | null {
  const row = db
    .prepare('SELECT * FROM products WHERE item_code = ?;')
    .get(itemCode.trim()) as unknown as Product | undefined;
  return row || null;
}

/**
 * Updates metadata of an existing product.
 */
export function updateProduct(id: string, updates: UpdateProductInput): ProductWithRevisions {
  const current = getProductById(id);
  if (!current) throw new ProductNotFoundError(id);

  const now = new Date().toISOString();
  const newName = updates.name !== undefined ? updates.name.trim() : current.name;
  const newDesc = updates.description !== undefined ? updates.description.trim() : current.description;
  const newType = updates.item_type !== undefined ? updates.item_type : current.item_type;
  const newUnit = updates.base_unit !== undefined ? updates.base_unit.trim().toUpperCase() : current.base_unit;
  const newStatus = updates.lifecycle_status !== undefined ? updates.lifecycle_status : current.lifecycle_status;

  const stmt = db.prepare(`
    UPDATE products
    SET name = ?, description = ?, item_type = ?, base_unit = ?, lifecycle_status = ?, updated_at = ?
    WHERE id = ?;
  `);

  stmt.run(newName, newDesc, newType, newUnit, newStatus, now, id);

  return getProductById(id)!;
}

/**
 * Soft archives a product.
 */
export function archiveProduct(id: string): ProductWithRevisions {
  const current = getProductById(id);
  if (!current) throw new ProductNotFoundError(id);

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE products
    SET is_archived = 1, lifecycle_status = 'ARCHIVED', updated_at = ?
    WHERE id = ?;
  `).run(now, id);

  return getProductById(id)!;
}

/**
 * Deletes a product if not referenced by any BOMs or released engineering records.
 */
export function deleteProduct(id: string): void {
  const current = getProductById(id);
  if (!current) throw new ProductNotFoundError(id);

  // Check 1: Referenced as parent in any BOM
  const parentBom = db.prepare('SELECT id, bom_code FROM bom_headers WHERE parent_product_id = ? LIMIT 1;').get(id) as { id: string; bom_code: string } | undefined;
  if (parentBom) {
    throw new ProductInUseError(current.item_code, `Referenced as parent product in BOM '${parentBom.bom_code}'`);
  }

  // Check 2: Referenced as component in any BOM line
  const lineRef = db.prepare(`
    SELECT bl.id, bh.bom_code
    FROM bom_lines bl
    JOIN bom_headers bh ON bl.bom_id = bh.id
    WHERE bl.component_product_id = ? LIMIT 1;
  `).get(id) as { id: string; bom_code: string } | undefined;
  if (lineRef) {
    throw new ProductInUseError(current.item_code, `Referenced as a component line item in BOM '${lineRef.bom_code}'`);
  }

  // Check 3: Check for released revisions
  const hasReleasedRevision = current.revisions.some((r) => r.revision_status === 'RELEASED');
  if (hasReleasedRevision) {
    throw new ProductInUseError(current.item_code, 'Contains one or more released engineering revisions. Archive the product instead of deleting.');
  }

  db.exec('BEGIN IMMEDIATE;');
  try {
    db.prepare('DELETE FROM product_revisions WHERE product_id = ?;').run(id);
    db.prepare('DELETE FROM products WHERE id = ?;').run(id);
    db.exec('COMMIT;');
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {}
    throw err;
  }
}

/**
 * Creates a new draft revision for an existing product.
 */
export function createProductRevision(productId: string, input: CreateRevisionInput): ProductRevision {
  const prod = getProductById(productId);
  if (!prod) throw new ProductNotFoundError(productId);

  const revCode = input.revision_code.trim().toUpperCase();
  const existing = prod.revisions.find((r) => r.revision_code === revCode);
  if (existing) {
    throw new RevisionError(`Revision '${revCode}' already exists for product '${prod.item_code}'`, 409);
  }

  const now = new Date().toISOString();
  const revId = `prev-${randomUUID()}`;

  const stmt = db.prepare(`
    INSERT INTO product_revisions (
      id, product_id, revision_code, revision_status, notes,
      effective_date, released_at, created_at
    ) VALUES (?, ?, ?, 'DRAFT', ?, ?, NULL, ?);
  `);

  stmt.run(
    revId,
    productId,
    revCode,
    (input.notes || '').trim(),
    input.effective_date || now,
    now
  );

  return db.prepare('SELECT * FROM product_revisions WHERE id = ?;').get(revId) as unknown as ProductRevision;
}

/**
 * Retrieves all revisions for a given product.
 */
export function getProductRevisions(productId: string): ProductRevision[] {
  const prod = getProductById(productId);
  if (!prod) throw new ProductNotFoundError(productId);
  return prod.revisions;
}

/**
 * Retrieves a specific revision by product ID and revision ID.
 */
export function getProductRevisionById(productId: string, revisionId: string): ProductRevision | null {
  const rev = db
    .prepare('SELECT * FROM product_revisions WHERE id = ? AND product_id = ?;')
    .get(revisionId, productId) as unknown as ProductRevision | undefined;
  return rev || null;
}

/**
 * Releases a draft revision, freezing its state.
 */
export function releaseProductRevision(productId: string, revisionId: string, effectiveDate?: string): ProductRevision {
  const rev = getProductRevisionById(productId, revisionId);
  if (!rev) throw new RevisionError(`Revision '${revisionId}' not found for product '${productId}'`, 404);

  if (rev.revision_status !== 'DRAFT') {
    throw new RevisionError(`Cannot release revision in status '${rev.revision_status}'. Only DRAFT revisions can be released.`, 400);
  }

  const now = new Date().toISOString();
  const effDate = effectiveDate || rev.effective_date || now;

  db.prepare(`
    UPDATE product_revisions
    SET revision_status = 'RELEASED', released_at = ?, effective_date = ?
    WHERE id = ?;
  `).run(now, effDate, revisionId);

  return getProductRevisionById(productId, revisionId)!;
}

/**
 * Marks a revision as obsolete.
 */
export function obsoleteProductRevision(productId: string, revisionId: string): ProductRevision {
  const rev = getProductRevisionById(productId, revisionId);
  if (!rev) throw new RevisionError(`Revision '${revisionId}' not found for product '${productId}'`, 404);

  db.prepare(`
    UPDATE product_revisions
    SET revision_status = 'OBSOLETE'
    WHERE id = ?;
  `).run(revisionId);

  return getProductRevisionById(productId, revisionId)!;
}
