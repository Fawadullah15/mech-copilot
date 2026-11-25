import { db } from '../db/client.js';
import { documentService } from './documentService.ts';

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
  const id = project.id || `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const stmt = db.prepare(`
    INSERT INTO projects (id, name, description, type, status, progress, lastModified, created, parameters, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    id,
    project.name || 'Untitled Project',
    project.description || '',
    project.type || 'General',
    project.status || 'Active',
    project.progress ?? 0,
    project.lastModified || new Date().toISOString(),
    project.created || new Date().toISOString(),
    JSON.stringify(project.parameters || {}),
    JSON.stringify(project.tags || [])
  );
  return { ...project, id };
}

export function updateProject(id: string, updates: any) {
  const current = getProjectById(id);
  if (!current) throw new Error('Project not found');

  const updated = { ...current, ...updates };
  // deep merge parameters if provided
  let parametersChanged = false;
  if (updates.parameters) {
    updated.parameters = { ...current.parameters, ...updates.parameters };
    parametersChanged = true;
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

  // If parameters changed, invalidate previous documents per Phase 6 & Phase 9
  if (parametersChanged) {
    try {
      documentService.markProjectDocumentsStale(id);
    } catch {
      // Non-blocking in case table is not ready or test mock
    }
  }

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

export function ensureDefaultProjectSeeded() {
  // Clean workspace: do not auto-seed dummy demo projects into database
  return null;
}
