import { DatabaseSync } from 'node:sqlite';
import { env } from '../config/env.js';
import fs from 'node:fs';
import path from 'node:path';
import { runMigrations } from './migrations.js';

/**
 * Returns true if running in any automated test environment.
 * Checks NODE_ENV, TEST_DATABASE_URL, npm lifecycle event, and process.argv.
 */
export function isTestMode(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.TEST_DATABASE_URL) ||
    Boolean(process.env.NODE_TEST_CONTEXT) ||
    (process.env.npm_lifecycle_event ? process.env.npm_lifecycle_event.includes('test') : false) ||
    process.argv.includes('--test') ||
    process.argv.some((arg) => arg.includes('test') || arg.includes('__tests__'))
  );
}

/**
 * Resolves the SQLite database path:
 * - Test mode: defaults to ':memory:' or process.env.TEST_DATABASE_URL
 * - Development/Production: defaults to process.env.DATABASE_URL or file:./data/mech-copilot.db
 */
export function resolveDatabasePath(): string {
  if (isTestMode()) {
    return process.env.TEST_DATABASE_URL || ':memory:';
  }
  const rawUrl = process.env.DATABASE_URL || env.DATABASE_URL || 'file:./data/mech-copilot.db';
  if (rawUrl.startsWith('file:')) {
    const filePath = rawUrl.slice(5);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir) && dir !== '.' && dir !== '..') {
      fs.mkdirSync(dir, { recursive: true });
    }
    return filePath;
  }
  return rawUrl;
}

export const activeDbPath = resolveDatabasePath();

// Open the database (sync since SQLite operations are very fast locally)
export const db = new DatabaseSync(activeDbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  runMigrations(db);
}

export function resetDatabase() {
  // CRITICAL SAFEGUARD: Never allow dropping tables from development database
  if (!isTestMode() && activeDbPath !== ':memory:' && !activeDbPath.includes('test')) {
    throw new Error(`CRITICAL SAFETY ERROR: Attempted to call resetDatabase() on development database: ${activeDbPath}`);
  }
  db.exec(`
    DROP TABLE IF EXISTS design_versions;
    DROP TABLE IF EXISTS messages;
    DROP TABLE IF EXISTS conversations;
    DROP TABLE IF EXISTS projects;
    DROP TABLE IF EXISTS schema_migrations;
  `);
  initDatabase();
}

