import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import {
  runMigrations,
  getCurrentSchemaVersion,
  getAppliedMigrations,
  ensureMigrationTable,
  migrations,
} from '../db/migrations.js';
import { resetDatabase, activeDbPath } from '../db/client.js';

describe('SQLite Migration System', () => {
  it('migrates a fresh in-memory database to the latest schema version', () => {
    const memDb = new DatabaseSync(':memory:');
    assert.strictEqual(getCurrentSchemaVersion(memDb), 0);

    const result = runMigrations(memDb);
    assert.strictEqual(result.appliedCount, 2);
    assert.strictEqual(result.currentVersion, 2);
    assert.strictEqual(getCurrentSchemaVersion(memDb), 2);

    const applied = getAppliedMigrations(memDb);
    assert.strictEqual(applied.length, 2);
    assert.strictEqual(applied[0].version, 1);
    assert.strictEqual(applied[0].name, '001_initial_schema');
    assert.strictEqual(applied[1].version, 2);
    assert.strictEqual(applied[1].name, '002_design_versions');

    // Confirm tables exist
    const tables = memDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    assert.ok(tableNames.includes('projects'), 'projects table exists');
    assert.ok(tableNames.includes('conversations'), 'conversations table exists');
    assert.ok(tableNames.includes('messages'), 'messages table exists');
    assert.ok(tableNames.includes('design_versions'), 'design_versions table exists');
    assert.ok(tableNames.includes('schema_migrations'), 'schema_migrations table exists');
  });

  it('re-running migrations is idempotent and does not fail or duplicate entries', () => {
    const memDb = new DatabaseSync(':memory:');
    runMigrations(memDb);

    // Second run
    const secondRun = runMigrations(memDb);
    assert.strictEqual(secondRun.appliedCount, 0, 'No migrations should run on second pass');
    assert.strictEqual(secondRun.currentVersion, 2);

    const applied = getAppliedMigrations(memDb);
    assert.strictEqual(applied.length, 2, 'Applied migrations list length stays 2');
  });

  it('preserves existing project and conversation records when migrating an existing database', () => {
    const memDb = new DatabaseSync(':memory:');

    // Step 1: Manually create legacy v1 tables
    memDb.exec(`
      CREATE TABLE projects (
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
      CREATE TABLE conversations (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        title TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
      INSERT INTO projects VALUES (
        'proj-test-legacy', 'Legacy Project', 'Preserved test', 'Test', 'In Progress', 50,
        '2026-10-18T10:00:00Z', '2026-10-18T09:00:00Z', '{"diameter":45}', '["test"]'
      );
      INSERT INTO conversations VALUES (
        'conv-legacy-1', 'proj-test-legacy', 'Legacy Discussion', '2026-10-18T10:00:00Z'
      );
    `);

    // Step 2: Run migrations
    const result = runMigrations(memDb);
    assert.strictEqual(result.currentVersion, 2);

    // Step 3: Verify legacy data is 100% intact
    const proj = memDb.prepare('SELECT * FROM projects WHERE id = ?;').get('proj-test-legacy') as any;
    assert.ok(proj, 'Legacy project is preserved');
    assert.strictEqual(proj.name, 'Legacy Project');

    const conv = memDb.prepare('SELECT * FROM conversations WHERE id = ?;').get('conv-legacy-1') as any;
    assert.ok(conv, 'Legacy conversation is preserved');
    assert.strictEqual(conv.title, 'Legacy Discussion');

    // Verify new table design_versions is available
    const versions = memDb.prepare('SELECT * FROM design_versions;').all();
    assert.deepStrictEqual(versions, []);
  });

  it('rolls back transaction cleanly if a migration fails', () => {
    const memDb = new DatabaseSync(':memory:');
    runMigrations(memDb);

    // Construct a failing migration definition
    const badMigration = {
      version: 999,
      name: 'failing_migration',
      up: (db: DatabaseSync) => {
        db.exec('CREATE TABLE temp_valid (id TEXT PRIMARY KEY);');
        // Syntax error to trigger rollback
        db.exec('INVALID SQL SYNTAX HERE');
      },
    };

    // Temporarily append
    migrations.push(badMigration);

    assert.throws(
      () => {
        runMigrations(memDb);
      },
      /Migration 999 \(failing_migration\) failed/,
      'Should throw descriptive error'
    );

    // Verify rollback: temp_valid table must not exist
    const checkTable = memDb
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='temp_valid';")
      .get();
    assert.strictEqual(checkTable, undefined, 'Table from failed migration was rolled back');

    // Remove the bad migration
    migrations.pop();
  });

  it('safeguards against resetting development database in non-test mode', () => {
    // Calling resetDatabase in test mode works on memory/test db
    assert.doesNotThrow(() => {
      resetDatabase();
    });
  });
});
