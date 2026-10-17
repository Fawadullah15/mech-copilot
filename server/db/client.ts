import { DatabaseSync } from 'node:sqlite';
import { env } from '../config/env.js'; // Ensure to export DB URL from env
import fs from 'node:fs';
import path from 'node:path';

// Parse database URL (e.g. file:./data/mech-copilot.db)
let dbPath = env.DATABASE_URL || 'file:./data/mech-copilot.db';

if (env.NODE_ENV === 'test' || process.argv.includes('--test')) {
  dbPath = ':memory:';
} else if (dbPath.startsWith('file:')) {
  dbPath = dbPath.slice(5);
  // Ensure the directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir) && dir !== '.' && dir !== '..') {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Open the database (sync since SQLite operations are very fast locally)
export const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
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

export function resetDatabase() {
  db.exec(`
    DROP TABLE IF EXISTS messages;
    DROP TABLE IF EXISTS conversations;
    DROP TABLE IF EXISTS projects;
  `);
  initDatabase();
}
