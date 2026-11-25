import { DatabaseSync } from 'node:sqlite';
import { db as defaultDb } from './client.js';

export interface Migration {
  version: number;
  name: string;
  up: (database: DatabaseSync) => void;
}

/**
 * Migration 001: Initial schema baseline.
 * Defines projects, conversations, and messages.
 * Uses CREATE TABLE IF NOT EXISTS to guarantee safe compatibility with existing databases.
 */
function migration001_initial_schema(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL,
      lastModified TEXT NOT NULL,
      created TEXT NOT NULL,
      parameters TEXT NOT NULL,
      tags TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      title TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversationId TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      type TEXT,
      structuredData TEXT,
      actions TEXT,
      reasoningChain TEXT,
      saved INTEGER DEFAULT 0,
      engineeringResult TEXT,
      FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);
}

/**
 * Migration 002: Persistent Design Versions table.
 * Stores reproducible engineering design checkpoints, parameters, and metadata.
 */
function migration002_design_versions(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS design_versions (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      version TEXT NOT NULL,
      label TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT 'Current User',
      schemaVersion INTEGER NOT NULL DEFAULT 1,
      parameters TEXT NOT NULL,
      materialId TEXT NOT NULL,
      materialName TEXT NOT NULL,
      factorOfSafety REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pass',
      calculationSummary TEXT,
      calculationEngineVersion TEXT NOT NULL DEFAULT '0.1.0',
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_design_versions_project
    ON design_versions (projectId, createdAt DESC);
  `);
}

/**
 * Migration 003: Manufacturing Product Master & Multi-Level Bill of Materials (BOM) engine.
 * Foundation Phase - Prompt 02.
 * Tables: products, product_revisions, bom_headers, bom_lines.
 */
function migration003_manufacturing_bom(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      item_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      item_type TEXT NOT NULL CHECK(item_type IN ('FINISHED_PRODUCT', 'SUBASSEMBLY', 'COMPONENT', 'RAW_MATERIAL', 'CONSUMABLE')),
      base_unit TEXT NOT NULL,
      lifecycle_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(lifecycle_status IN ('DRAFT', 'ACTIVE', 'PHASED_OUT', 'ARCHIVED')),
      is_archived INTEGER NOT NULL DEFAULT 0 CHECK(is_archived IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_products_item_code ON products(item_code);
    CREATE INDEX IF NOT EXISTS idx_products_type_status ON products(item_type, lifecycle_status);
    CREATE INDEX IF NOT EXISTS idx_products_archived ON products(is_archived);

    CREATE TABLE IF NOT EXISTS product_revisions (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      revision_code TEXT NOT NULL,
      revision_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(revision_status IN ('DRAFT', 'RELEASED', 'OBSOLETE')),
      notes TEXT NOT NULL DEFAULT '',
      effective_date TEXT,
      released_at TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(product_id, revision_code)
    );

    CREATE INDEX IF NOT EXISTS idx_product_revisions_product ON product_revisions(product_id, revision_code);
    CREATE INDEX IF NOT EXISTS idx_product_revisions_status ON product_revisions(revision_status);

    CREATE TABLE IF NOT EXISTS bom_headers (
      id TEXT PRIMARY KEY,
      parent_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      parent_revision_id TEXT REFERENCES product_revisions(id) ON DELETE RESTRICT,
      bom_code TEXT NOT NULL,
      alt_code TEXT NOT NULL DEFAULT 'PRIMARY',
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'RELEASED', 'OBSOLETE')),
      base_quantity REAL NOT NULL DEFAULT 1.0 CHECK(base_quantity > 0),
      unit TEXT NOT NULL DEFAULT 'EA',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      released_at TEXT,
      UNIQUE(parent_product_id, bom_code, alt_code)
    );

    CREATE INDEX IF NOT EXISTS idx_bom_headers_parent ON bom_headers(parent_product_id);
    CREATE INDEX IF NOT EXISTS idx_bom_headers_status ON bom_headers(status);

    CREATE TABLE IF NOT EXISTS bom_lines (
      id TEXT PRIMARY KEY,
      bom_id TEXT NOT NULL REFERENCES bom_headers(id) ON DELETE CASCADE,
      line_number INTEGER NOT NULL CHECK(line_number > 0),
      component_product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      component_revision_id TEXT REFERENCES product_revisions(id) ON DELETE RESTRICT,
      quantity REAL NOT NULL CHECK(quantity > 0),
      unit TEXT NOT NULL,
      scrap_percentage REAL NOT NULL DEFAULT 0.0 CHECK(scrap_percentage >= 0 AND scrap_percentage < 100),
      supply_classification TEXT NOT NULL CHECK(supply_classification IN ('MAKE', 'BUY')),
      preferred_sourcing TEXT NOT NULL CHECK(preferred_sourcing IN ('INTERNAL', 'LOCAL', 'IMPORTED', 'ANY')),
      notes TEXT NOT NULL DEFAULT '',
      UNIQUE(bom_id, line_number)
    );

    CREATE INDEX IF NOT EXISTS idx_bom_lines_bom ON bom_lines(bom_id);
    CREATE INDEX IF NOT EXISTS idx_bom_lines_component ON bom_lines(component_product_id);
  `);
}

/**
 * Migration 004: Drawing Status & Non-Destructive Delta Tracking.
 * Adds drawingStatus, changedParameters, and restoredFromVersion to design_versions.
 */
function migration004_drawing_and_delta_tracking(database: DatabaseSync): void {
  const columns = database.prepare("PRAGMA table_info(design_versions);").all() as { name: string }[];
  const colNames = new Set(columns.map((c) => c.name));

  if (!colNames.has('drawingStatus')) {
    database.exec("ALTER TABLE design_versions ADD COLUMN drawingStatus TEXT NOT NULL DEFAULT 'DRAFT';");
  }
  if (!colNames.has('changedParameters')) {
    database.exec("ALTER TABLE design_versions ADD COLUMN changedParameters TEXT;");
  }
  if (!colNames.has('restoredFromVersion')) {
    database.exec("ALTER TABLE design_versions ADD COLUMN restoredFromVersion TEXT;");
  }
}

/**
 * Migration 005: Engineering Workflow State Machine & Document Traceability.
 * Foundation Phase - Prompt 08.
 * Tables: engineering_workflows, engineering_documents.
 */
function migration005_engineering_workflows_and_documents(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS engineering_workflows (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      userRequest TEXT NOT NULL,
      state TEXT NOT NULL CHECK(state IN (
        'Created',
        'Planning',
        'Awaiting information',
        'Awaiting approval',
        'Executing',
        'Validating',
        'Generating documentation',
        'Saving',
        'Completed',
        'Failed',
        'Cancelled'
      )),
      plannedOperations TEXT NOT NULL DEFAULT '[]',
      executedTools TEXT NOT NULL DEFAULT '[]',
      operationInputs TEXT NOT NULL DEFAULT '{}',
      operationResults TEXT NOT NULL DEFAULT '{}',
      failedOperations TEXT NOT NULL DEFAULT '[]',
      recoveryAttempts INTEGER NOT NULL DEFAULT 0,
      outputReferences TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_workflows_project ON engineering_workflows(projectId);
    CREATE INDEX IF NOT EXISTS idx_workflows_state ON engineering_workflows(state);

    CREATE TABLE IF NOT EXISTS engineering_documents (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      revisionId TEXT,
      documentType TEXT NOT NULL CHECK(documentType IN (
        'DRAWING_SVG',
        'DRAWING_PNG',
        'REPORT_JSON',
        'REPORT_PDF',
        'MANUFACTURING_SPEC'
      )),
      title TEXT NOT NULL,
      sourceRevision TEXT NOT NULL,
      isStale INTEGER NOT NULL DEFAULT 0 CHECK(isStale IN (0, 1)),
      status TEXT NOT NULL DEFAULT 'CURRENT' CHECK(status IN ('CURRENT', 'OUTDATED', 'SUPERSEDED', 'DRAFT')),
      fileLocation TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      content TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_documents_project ON engineering_documents(projectId);
    CREATE INDEX IF NOT EXISTS idx_documents_type ON engineering_documents(documentType);
    CREATE INDEX IF NOT EXISTS idx_documents_stale ON engineering_documents(isStale);
  `);
}

/**
 * Ordered list of all migrations.
 * Each migration must have a unique, monotonically increasing version number.
 */
export const migrations: Migration[] = [
  {
    version: 1,
    name: '001_initial_schema',
    up: migration001_initial_schema,
  },
  {
    version: 2,
    name: '002_design_versions',
    up: migration002_design_versions,
  },
  {
    version: 3,
    name: '003_manufacturing_bom',
    up: migration003_manufacturing_bom,
  },
  {
    version: 4,
    name: '004_drawing_and_delta_tracking',
    up: migration004_drawing_and_delta_tracking,
  },
  {
    version: 5,
    name: '005_engineering_workflows_and_documents',
    up: migration005_engineering_workflows_and_documents,
  },
];

/**
 * Ensures the schema_migrations tracking table exists.
 */
export function ensureMigrationTable(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
}

/**
 * Returns the highest applied schema version number, or 0 if none applied.
 */
export function getCurrentSchemaVersion(database: DatabaseSync = defaultDb): number {
  ensureMigrationTable(database);
  const row = database
    .prepare('SELECT MAX(version) as maxVersion FROM schema_migrations;')
    .get() as { maxVersion: number | null } | undefined;
  return row?.maxVersion ?? 0;
}

/**
 * Returns all applied migration records.
 */
export function getAppliedMigrations(database: DatabaseSync = defaultDb): { version: number; name: string; applied_at: string }[] {
  ensureMigrationTable(database);
  return database
    .prepare('SELECT version, name, applied_at FROM schema_migrations ORDER BY version ASC;')
    .all() as { version: number; name: string; applied_at: string }[];
}

/**
 * Executes all pending migrations in order, each within a discrete transaction.
 * Fails clearly if any migration throws, leaving subsequent migrations unapplied.
 */
export function runMigrations(database: DatabaseSync = defaultDb): { appliedCount: number; currentVersion: number } {
  // Enforce foreign key constraints
  database.exec('PRAGMA foreign_keys = ON;');
  ensureMigrationTable(database);

  const appliedList = getAppliedMigrations(database);
  const appliedVersions = new Set(appliedList.map((m) => m.version));

  let appliedCount = 0;

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    // Run each migration transactionally
    database.exec('BEGIN IMMEDIATE;');
    try {
      migration.up(database);

      const insertStmt = database.prepare(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);'
      );
      insertStmt.run(migration.version, migration.name, new Date().toISOString());

      database.exec('COMMIT;');
      appliedCount++;
    } catch (err) {
      try {
        database.exec('ROLLBACK;');
      } catch (rollbackErr) {
        // Rollback error secondary
      }
      throw new Error(`Migration ${migration.version} (${migration.name}) failed: ${(err as Error).message}`);
    }
  }

  const currentVersion = getCurrentSchemaVersion(database);
  return { appliedCount, currentVersion };
}
