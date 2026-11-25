import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('data/mech-copilot.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables in data/mech-copilot.db:');
for (const t of tables) {
  const count = db.prepare(`SELECT count(*) as c FROM "${t.name}"`).get();
  console.log(`- ${t.name}: ${count.c} rows`);
}
const projects = db.prepare('SELECT id, name, type, status FROM projects').all();
console.log('\nProjects:', projects);
