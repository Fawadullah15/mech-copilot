import { db } from '../db/client.js';

export function getAllProjects() {
  const stmt = db.prepare('SELECT * FROM projects');
  const rows = stmt.all() as any[];
  return rows.map(mapProjectFromDb);
}

export function getProjectById(id: string) {
  const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
  const row = stmt.get(id) as any;
  if (!row) return null;
  return mapProjectFromDb(row);
}

export function createProject(project: any) {
  const stmt = db.prepare(`
    INSERT INTO projects (id, name, description, type, status, progress, lastModified, created, parameters, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    project.id,
    project.name,
    project.description,
    project.type,
    project.status,
    project.progress,
    project.lastModified,
    project.created,
    JSON.stringify(project.parameters),
    JSON.stringify(project.tags || [])
  );
  return project;
}

export function updateProject(id: string, updates: any) {
  const current = getProjectById(id);
  if (!current) throw new Error('Project not found');

  const updated = { ...current, ...updates };
  // deep merge parameters if provided
  if (updates.parameters) {
    updated.parameters = { ...current.parameters, ...updates.parameters };
  }
  
  updated.lastModified = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE projects 
    SET name = ?, description = ?, type = ?, status = ?, progress = ?, lastModified = ?, parameters = ?, tags = ?
    WHERE id = ?
  `);
  stmt.run(
    updated.name,
    updated.description,
    updated.type,
    updated.status,
    updated.progress,
    updated.lastModified,
    JSON.stringify(updated.parameters),
    JSON.stringify(updated.tags),
    id
  );

  return updated;
}

export function deleteProject(id: string) {
  const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
  stmt.run(id);
}

function mapProjectFromDb(row: any) {
  return {
    ...row,
    parameters: JSON.parse(row.parameters),
    tags: JSON.parse(row.tags)
  };
}

export const DEFAULT_DEMO_PROJECT = {
  id: 'proj-gearbox',
  name: 'Gearbox Assembly',
  description: 'Two-stage spur gearbox for industrial conveyor drive system. Includes input shaft, intermediate shaft, output shaft, and housing design.',
  type: 'Power Transmission',
  status: 'In Progress',
  progress: 72,
  lastModified: '2026-09-17T06:30:00Z',
  created: '2026-08-15T09:00:00Z',
  parameters: {
    materialId: 'aisi-4140',
    diameter: 45,
    length: 320,
    torque: 500,
    force: 12000,
    rpm: 1450,
    safetyFactor: 2.0,
    temperature: 60,
  },
  tags: ['gearbox', 'power-transmission', 'industrial'],
};

export function ensureDefaultProjectSeeded() {
  const existing = getAllProjects();
  if (existing.length === 0) {
    createProject(DEFAULT_DEMO_PROJECT);
    return DEFAULT_DEMO_PROJECT;
  }
  return null;
}
