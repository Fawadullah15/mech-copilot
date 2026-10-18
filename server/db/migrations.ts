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
