import { DatabaseSync } from 'node:sqlite';
import { db as defaultDb } from '../db/client.js';
import { getProjectById, updateProject } from './projectService.js';

export interface DesignVersionRecord {
  id: string;
  projectId: string;
  version: string;
  label: string;
  notes: string;
  createdAt: string;
  author: string;
  schemaVersion: number;
  parameters: {
    materialId?: string;
    diameter?: number;
    length?: number;
    torque?: number;
    force?: number;
    rpm?: number;
    safetyFactor?: number;
    temperature?: number;
  };
  materialId: string;
  materialName: string;
  factorOfSafety: number;
  status: 'pass' | 'warning' | 'fail';
  calculationSummary?: string;
  calculationEngineVersion: string;
  drawingStatus?: 'DRAFT' | 'PRELIMINARY' | 'APPROVED' | 'OBSOLETE';
  changedParameters?: Record<string, { previous: any; current: any }>;
  restoredFromVersion?: string;
}

export interface CreateDesignVersionInput {
  id?: string;
  projectId: string;
  version?: string;
  label: string;
  notes?: string;
  createdAt?: string;
  author?: string;
  parameters: Record<string, any>;
  materialId?: string;
  materialName?: string;
  factorOfSafety?: number;
  status?: 'pass' | 'warning' | 'fail';
  calculationSummary?: string;
  calculationEngineVersion?: string;
  drawingStatus?: 'DRAFT' | 'PRELIMINARY' | 'APPROVED' | 'OBSOLETE';
  changedParameters?: Record<string, { previous: any; current: any }>;
  restoredFromVersion?: string;
}

/**
 * Computes difference between two parameter dictionaries
 */
export function computeParameterDelta(
  prev: Record<string, any> = {},
  curr: Record<string, any> = {}
): Record<string, { previous: any; current: any }> {
  const delta: Record<string, { previous: any; current: any }> = {};
  const keys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
  for (const k of keys) {
    if (prev[k] !== curr[k]) {
      delta[k] = { previous: prev[k] ?? null, current: curr[k] ?? null };
    }
  }
  return delta;
}

/**
 * Format a raw database row into a typed DesignVersionRecord
 */
function mapRowToRecord(row: any): DesignVersionRecord {
  let parsedParams = {};
  try {
    parsedParams = typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters;
  } catch {
    parsedParams = {};
  }

  let changedParameters = undefined;
  try {
    changedParameters = row.changedParameters ? JSON.parse(row.changedParameters) : undefined;
  } catch {
    changedParameters = undefined;
  }

  return {
    id: row.id,
    projectId: row.projectId,
    version: row.version,
    label: row.label,
    notes: row.notes || '',
    createdAt: row.createdAt,
    author: row.author || 'Current User',
    schemaVersion: row.schemaVersion || 1,
    parameters: parsedParams,
    materialId: row.materialId,
    materialName: row.materialName,
    factorOfSafety: Number(row.factorOfSafety) || 0,
    status: (row.status as 'pass' | 'warning' | 'fail') || 'pass',
    calculationSummary: row.calculationSummary || undefined,
    calculationEngineVersion: row.calculationEngineVersion || '0.1.0',
    drawingStatus: row.drawingStatus || 'DRAFT',
    changedParameters,
    restoredFromVersion: row.restoredFromVersion || undefined,
  };
}

/**
 * Lists all design snapshots for a project, ordered by creation time descending.
 */
export function getVersionsByProjectId(projectId: string, database: DatabaseSync = defaultDb): DesignVersionRecord[] {
  const stmt = database.prepare(
    'SELECT * FROM design_versions WHERE projectId = ? ORDER BY createdAt DESC, rowid DESC;'
  );
  const rows = stmt.all(projectId) as any[];
  return rows.map(mapRowToRecord);
}

/**
 * Retrieves a single design snapshot by ID, ensuring it belongs to the given projectId.
 */
export function getVersionById(
  projectId: string,
  versionId: string,
  database: DatabaseSync = defaultDb
): DesignVersionRecord | null {
  const stmt = database.prepare(
    'SELECT * FROM design_versions WHERE projectId = ? AND id = ? LIMIT 1;'
  );
  const row = stmt.get(projectId, versionId) as any;
  if (!row) return null;
  return mapRowToRecord(row);
}

/**
 * Creates and persists a new design version snapshot for a project.
 */
export function createDesignVersion(
  input: CreateDesignVersionInput,
  database: DatabaseSync = defaultDb
): DesignVersionRecord {
  // 1. Verify project exists
  const project = getProjectById(input.projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  // 2. Generate unique ID if missing
  const id = input.id || `ver-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // 3. Determine version label (e.g., v1.1, v1.2) if not specified
  let version = input.version;
  if (!version) {
    const countRow = database
      .prepare('SELECT COUNT(*) as count FROM design_versions WHERE projectId = ?;')
      .get(input.projectId) as { count: number };
    const count = countRow?.count ?? 0;
    version = `v1.${count + 1}`;
  }

  const createdAt = input.createdAt || new Date().toISOString();
  const author = input.author || 'Current User';
  const schemaVersion = 1;
  const notes = input.notes || '';
  const parametersJson = JSON.stringify(input.parameters);
  const materialId = input.materialId || input.parameters?.materialId || 'aisi-4140';
  const materialName = input.materialName || 'AISI 4140 Steel';
  const factorOfSafety = typeof input.factorOfSafety === 'number' ? input.factorOfSafety : 0;
  const status = input.status || 'pass';
  const calculationSummary = input.calculationSummary || null;
  const calculationEngineVersion = input.calculationEngineVersion || '0.1.0';
  const drawingStatus = input.drawingStatus || 'DRAFT';
  const restoredFromVersion = input.restoredFromVersion || null;

  // Auto-calculate changed parameters delta if not provided
  let changedParams = input.changedParameters;
  if (!changedParams) {
    const prevRow = database
      .prepare('SELECT parameters FROM design_versions WHERE projectId = ? ORDER BY createdAt DESC, rowid DESC LIMIT 1;')
      .get(input.projectId) as any;
    if (prevRow) {
      try {
        const prevP = typeof prevRow.parameters === 'string' ? JSON.parse(prevRow.parameters) : prevRow.parameters;
        changedParams = computeParameterDelta(prevP, input.parameters);
      } catch {
        changedParams = undefined;
      }
    }
  }
  const changedParametersJson = changedParams ? JSON.stringify(changedParams) : null;

  const insertStmt = database.prepare(`
    INSERT INTO design_versions (
      id, projectId, version, label, notes, createdAt, author, schemaVersion,
      parameters, materialId, materialName, factorOfSafety, status,
      calculationSummary, calculationEngineVersion,
      drawingStatus, changedParameters, restoredFromVersion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `);

  insertStmt.run(
    id,
    input.projectId,
    version,
    input.label,
    notes,
    createdAt,
    author,
    schemaVersion,
    parametersJson,
    materialId,
    materialName,
    factorOfSafety,
    status,
    calculationSummary,
    calculationEngineVersion,
    drawingStatus,
    changedParametersJson,
    restoredFromVersion
  );

  return {
    id,
    projectId: input.projectId,
    version,
    label: input.label,
    notes,
    createdAt,
    author,
    schemaVersion,
    parameters: input.parameters,
    materialId,
    materialName,
    factorOfSafety,
    status,
    calculationSummary: calculationSummary || undefined,
    calculationEngineVersion,
    drawingStatus,
    changedParameters: changedParams,
    restoredFromVersion: restoredFromVersion || undefined,
  };
}

/**
 * Restores a snapshot into the active project design parameters.
 * Validates ownership, uses a transaction, and updates the project parameters in SQLite.
 * Creates a NEW non-destructive version snapshot, preserving complete audit history.
 */
export function restoreDesignVersion(
  projectId: string,
  versionId: string,
  database: DatabaseSync = defaultDb
): { project: any; restoredVersion: DesignVersionRecord; newVersion?: DesignVersionRecord } {
  // Transactional restore
  database.exec('BEGIN IMMEDIATE;');
  try {
    const version = getVersionById(projectId, versionId, database);
    if (!version) {
      throw new Error('Version not found or does not belong to project');
    }

    const project = getProjectById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Merge snapshot parameters into project
    const updatedParameters = {
      ...project.parameters,
      ...version.parameters,
      materialId: version.materialId || version.parameters.materialId || project.parameters.materialId,
    };

    const updatedProject = updateProject(projectId, {
      parameters: updatedParameters,
    });

    // Create a new non-destructive version record to preserve history
    const newVersion = createDesignVersion(
      {
        projectId,
        label: `Restored: ${version.version} (${version.label})`,
        notes: `Restored parameters from snapshot ${version.version}. Non-destructive revision created.`,
        parameters: updatedParameters,
        materialId: updatedParameters.materialId,
        materialName: version.materialName,
        factorOfSafety: version.factorOfSafety,
        status: version.status,
        calculationSummary: version.calculationSummary,
        drawingStatus: version.drawingStatus || 'DRAFT',
        restoredFromVersion: version.version,
      },
      database
    );

    database.exec('COMMIT;');
    return { project: updatedProject, restoredVersion: version, newVersion };
  } catch (err) {
    try {
      database.exec('ROLLBACK;');
    } catch {
      // rollback catch
    }
    throw err;
  }
}

/**
 * Deletes a snapshot by ID with cross-project safety check.
 */
export function deleteDesignVersion(
  projectId: string,
  versionId: string,
  database: DatabaseSync = defaultDb
): boolean {
  const version = getVersionById(projectId, versionId, database);
  if (!version) {
    return false;
  }

  const stmt = database.prepare('DELETE FROM design_versions WHERE projectId = ? AND id = ?;');
  const result = stmt.run(projectId, versionId);
  return result.changes > 0;
}
