import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import app from '../app.ts';
import { db, resetDatabase } from '../db/client.ts';
import {
  createProject,
  getProjectById,
  deleteProject,
} from '../services/projectService.ts';
import {
  createDesignVersion,
  getVersionsByProjectId,
  getVersionById,
  restoreDesignVersion,
  deleteDesignVersion,
} from '../services/versionService.ts';

describe('Design Versions Persistence & API Tests', () => {
  let server: Server;
  const PORT = 3003;
  const BASE_URL = `http://localhost:${PORT}`;

  const sampleParams1 = {
    materialId: 'aisi-4140',
    diameter: 45.125,
    length: 320.5,
    torque: 500.75,
    force: 12000.25,
    rpm: 1450,
    safetyFactor: 2.25,
    temperature: 65,
  };

  const sampleParams2 = {
    materialId: 'aisi-4340',
    diameter: 50.0,
    length: 350.0,
    torque: 600.0,
    force: 15000.0,
    rpm: 1500,
    safetyFactor: 2.5,
    temperature: 70,
  };

  before(async () => {
    resetDatabase();
    return new Promise((resolve) => {
      server = app.listen(PORT, () => resolve(undefined));
    });
  });

  after(() => {
    server.close();
  });

  it('creates, retrieves, and lists design snapshots in database', () => {
    const proj = createProject({
      id: 'proj-ver-test-1',
      name: 'Version Test Project 1',
      description: 'Testing design snapshots',
      type: 'Shaft Test',
      status: 'In Progress',
      progress: 40,
      lastModified: new Date().toISOString(),
      created: new Date().toISOString(),
      parameters: sampleParams1,
      tags: ['test'],
    });

    const v1 = createDesignVersion({
      projectId: proj.id,
      label: 'Initial Baseline Checkpoint',
      notes: 'Initial sizing at ⌀45.125 mm',
      parameters: sampleParams1,
      materialId: 'aisi-4140',
      materialName: 'AISI 4140 Steel',
      factorOfSafety: 2.25,
      status: 'pass',
      calculationSummary: 'Initial pass under Von Mises',
    });

    assert.ok(v1.id.startsWith('ver-'), 'Generated unique ID');
    assert.strictEqual(v1.version, 'v1.1');
    assert.strictEqual(v1.label, 'Initial Baseline Checkpoint');
    assert.strictEqual(v1.parameters.diameter, 45.125, 'Exact floating point precision preserved');

    // Create second version
    const v2 = createDesignVersion({
      projectId: proj.id,
      label: 'Upsized to ⌀50 mm for High Torque',
      notes: 'Torque boosted to 600 Nm',
      parameters: sampleParams2,
      materialId: 'aisi-4340',
      materialName: 'AISI 4340 Steel',
      factorOfSafety: 2.85,
      status: 'pass',
    });

    assert.strictEqual(v2.version, 'v1.2');

    // List all versions
    const list = getVersionsByProjectId(proj.id);
    assert.strictEqual(list.length, 2);
    // Ordered createdAt DESC (v2 first, then v1)
    assert.strictEqual(list[0].id, v2.id);
    assert.strictEqual(list[1].id, v1.id);

    // Retrieve single version
    const retrieved = getVersionById(proj.id, v1.id);
    assert.ok(retrieved);
    assert.strictEqual(retrieved?.id, v1.id);
    assert.strictEqual(retrieved?.parameters.force, 12000.25);
  });

  it('restores a design snapshot, updating active project parameters', () => {
    const proj = getProjectById('proj-ver-test-1')!;
    const versions = getVersionsByProjectId(proj.id);
    const targetVersion = versions.find((v) => v.label === 'Initial Baseline Checkpoint')!;

    // Current project has sampleParams2 (from previous test or current state)
    // Restore targetVersion (sampleParams1)
    const { project: restoredProject, restoredVersion } = restoreDesignVersion(proj.id, targetVersion.id);

    assert.strictEqual(restoredVersion.id, targetVersion.id);
    assert.strictEqual(restoredProject.parameters.diameter, 45.125);
    assert.strictEqual(restoredProject.parameters.torque, 500.75);
    assert.strictEqual(restoredProject.parameters.materialId, 'aisi-4140');

    // Verify DB reflects updated project parameters
    const refreshed = getProjectById(proj.id)!;
    assert.strictEqual(refreshed.parameters.diameter, 45.125);
  });

  it('enforces cross-project isolation (project B cannot access or restore project A versions)', () => {
    const projA = createProject({
      id: 'proj-isolation-a',
      name: 'Project A',
      description: 'A',
      type: 'Shaft',
      status: 'In Progress',
      progress: 10,
      lastModified: new Date().toISOString(),
      created: new Date().toISOString(),
      parameters: sampleParams1,
      tags: ['a'],
    });

    const projB = createProject({
      id: 'proj-isolation-b',
      name: 'Project B',
      description: 'B',
      type: 'Shaft',
      status: 'In Progress',
      progress: 10,
      lastModified: new Date().toISOString(),
      created: new Date().toISOString(),
      parameters: sampleParams2,
      tags: ['b'],
    });

    const versionA = createDesignVersion({
      projectId: projA.id,
      label: 'Version for A',
      parameters: sampleParams1,
    });

    // Attempt to access versionA under project B
    const crossAccess = getVersionById(projB.id, versionA.id);
    assert.strictEqual(crossAccess, null, 'Cross project getVersionById must return null');

    // Attempt to restore versionA under project B
    assert.throws(
      () => {
        restoreDesignVersion(projB.id, versionA.id);
      },
      /Version not found or does not belong to project/,
      'Cannot restore across projects'
    );

    // Attempt to delete versionA under project B
    const crossDelete = deleteDesignVersion(projB.id, versionA.id);
    assert.strictEqual(crossDelete, false, 'Cannot delete across projects');
  });

  it('cascades deletion of snapshots when parent project is deleted', () => {
    const proj = createProject({
      id: 'proj-cascade-test',
      name: 'Cascade Project',
      description: 'Delete test',
      type: 'Shaft',
      status: 'In Progress',
      progress: 0,
      lastModified: new Date().toISOString(),
      created: new Date().toISOString(),
      parameters: sampleParams1,
      tags: [],
    });

    createDesignVersion({
      projectId: proj.id,
      label: 'Snapshot to cascade',
      parameters: sampleParams1,
    });

    const beforeDelete = getVersionsByProjectId(proj.id);
    assert.strictEqual(beforeDelete.length, 1);

    // Delete project
    deleteProject(proj.id);

    // Versions must be wiped out via ON DELETE CASCADE
    const afterDelete = getVersionsByProjectId(proj.id);
    assert.strictEqual(afterDelete.length, 0, 'Versions cascaded and deleted');
  });

  // ─── Express HTTP API Endpoints Tests ─────────────────────────────

  it('HTTP API: GET /api/projects/:id/versions returns version list', async () => {
    const proj = createProject({
      id: 'proj-api-test',
      name: 'API Test Project',
      description: 'Testing endpoints',
      type: 'Shaft',
      status: 'In Progress',
      progress: 0,
      lastModified: new Date().toISOString(),
      created: new Date().toISOString(),
      parameters: sampleParams1,
      tags: [],
    });

    const res = await fetch(`${BASE_URL}/api/projects/${proj.id}/versions`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.strictEqual(data.length, 0);
  });

  it('HTTP API: POST /api/projects/:id/versions validates body and persists snapshot', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/proj-api-test/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: 'HTTP API Created Checkpoint',
        notes: 'Integration test checkpoint',
        parameters: sampleParams1,
        materialId: 'aisi-4140',
        materialName: 'AISI 4140 Steel',
        factorOfSafety: 2.28,
        status: 'pass',
      }),
    });

    assert.strictEqual(res.status, 201);
    const created = await res.json();
    assert.strictEqual(created.label, 'HTTP API Created Checkpoint');
    assert.strictEqual(created.version, 'v1.1');
    assert.strictEqual(created.parameters.diameter, 45.125);
  });

  it('HTTP API: POST /api/projects/:id/versions rejects malformed payload with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/proj-api-test/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: '', // Blank label is invalid
        parameters: { diameter: -50 }, // Negative diameter is invalid
      }),
    });

    assert.strictEqual(res.status, 400);
    const errorData = await res.json();
    assert.ok(errorData.error);
  });

  it('HTTP API: POST /api/projects/:id/versions/:versionId/restore restores parameters', async () => {
    // 1. Get the created version
    const listRes = await fetch(`${BASE_URL}/api/projects/proj-api-test/versions`);
    const versions = await listRes.json();
    const ver = versions[0];

    // 2. Change project diameter
    await fetch(`${BASE_URL}/api/projects/proj-api-test`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parameters: { diameter: 99.9 } }),
    });

    // 3. Restore version
    const restoreRes = await fetch(`${BASE_URL}/api/projects/proj-api-test/versions/${ver.id}/restore`, {
      method: 'POST',
    });

    assert.strictEqual(restoreRes.status, 200);
    const restoreData = await restoreRes.json();
    assert.strictEqual(restoreData.project.parameters.diameter, 45.125);
    assert.strictEqual(restoreData.restoredVersion.id, ver.id);
  });

  it('HTTP API: DELETE /api/projects/:id/versions/:versionId deletes checkpoint', async () => {
    const listRes = await fetch(`${BASE_URL}/api/projects/proj-api-test/versions`);
    const versions = await listRes.json();
    const ver = versions[0];

    const delRes = await fetch(`${BASE_URL}/api/projects/proj-api-test/versions/${ver.id}`, {
      method: 'DELETE',
    });
    assert.strictEqual(delRes.status, 204);

    // Verify gone
    const verifyRes = await fetch(`${BASE_URL}/api/projects/proj-api-test/versions/${ver.id}`);
    assert.strictEqual(verifyRes.status, 404);
  });
});
