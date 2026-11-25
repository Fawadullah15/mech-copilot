import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const dbPath = path.resolve('data/mech-copilot.db');
const db = new DatabaseSync(dbPath);

console.log('Cleaning active workspace database at:', dbPath);

db.exec('BEGIN TRANSACTION;');
try {
  db.exec('DELETE FROM messages;');
  db.exec('DELETE FROM conversations;');
  db.exec('DELETE FROM design_versions;');
  db.exec('DELETE FROM projects;');
  db.exec('COMMIT;');
  console.log('Database cleaned successfully.');
} catch (err) {
  db.exec('ROLLBACK;');
  console.error('Failed to clean database:', err);
  process.exit(1);
}

const projects = db.prepare('SELECT COUNT(*) as count FROM projects;').get();
const convs = db.prepare('SELECT COUNT(*) as count FROM conversations;').get();
const msgs = db.prepare('SELECT COUNT(*) as count FROM messages;').get();
const vers = db.prepare('SELECT COUNT(*) as count FROM design_versions;').get();

console.log(`Remaining counts:
  projects: ${projects.count}
  conversations: ${convs.count}
  messages: ${msgs.count}
  design_versions: ${vers.count}`);
