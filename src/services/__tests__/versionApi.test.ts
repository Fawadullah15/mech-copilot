import test, { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchProjectVersions,
  createProjectVersion,
  restoreProjectVersion,
  deleteProjectVersion,
} from '../projectApi.ts';

describe('Frontend Version API Service Tests', () => {
  const originalFetch = global.fetch;

  after(() => {
    global.fetch = originalFetch;
  });

  it('fetchProjectVersions calls correct endpoint and formats timestamps', async () => {
    let capturedUrl = '';
    // @ts-ignore
    global.fetch = async (url: string) => {
      capturedUrl = url;
      return new Response(
        JSON.stringify([
          {
            id: 'ver-123',
            projectId: 'proj-gearbox',
            version: 'v1.1',
            label: 'Initial Checkpoint',
            createdAt: '2026-10-18T10:00:00Z',
            parameters: { diameter: 45 },
            materialName: 'AISI 4140',
            factorOfSafety: 2.5,
            status: 'pass',
            notes: 'Test note',
          },
        ])
      );
    };

    const versions = await fetchProjectVersions('proj-gearbox');
    assert.ok(capturedUrl.includes('/api/projects/proj-gearbox/versions'));
    assert.strictEqual(versions.length, 1);
    assert.strictEqual(versions[0].id, 'ver-123');
    assert.strictEqual(versions[0].timestamp, '2026-10-18T10:00:00Z');
  });

  it('createProjectVersion posts valid payload and returns created record', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    let capturedBody: any;

    // @ts-ignore
    global.fetch = async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedMethod = init?.method || '';
      capturedBody = JSON.parse(init?.body as string);
      return new Response(
        JSON.stringify({
          id: 'ver-new',
          projectId: 'proj-gearbox',
          version: 'v1.2',
          ...capturedBody,
        }),
        { status: 201 }
      );
    };

    const payload = {
      label: 'Upsized Shaft',
      parameters: { diameter: 50 },
      materialName: 'AISI 4340',
      factorOfSafety: 2.8,
      status: 'pass' as const,
      notes: 'Increased torque capacity',
    };

    const created = await createProjectVersion('proj-gearbox', payload);
    assert.ok(capturedUrl.includes('/api/projects/proj-gearbox/versions'));
    assert.strictEqual(capturedMethod, 'POST');
    assert.strictEqual(capturedBody.label, 'Upsized Shaft');
    assert.strictEqual(created.id, 'ver-new');
    assert.strictEqual(created.version, 'v1.2');
  });

  it('restoreProjectVersion sends POST to restore endpoint and returns project', async () => {
    let capturedUrl = '';
    let capturedMethod = '';

    // @ts-ignore
    global.fetch = async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedMethod = init?.method || '';
      return new Response(
        JSON.stringify({
          message: 'Design version restored successfully',
          project: { id: 'proj-gearbox', parameters: { diameter: 50 } },
          restoredVersion: { id: 'ver-new', version: 'v1.2' },
        })
      );
    };

    const result = await restoreProjectVersion('proj-gearbox', 'ver-new');
    assert.ok(capturedUrl.includes('/api/projects/proj-gearbox/versions/ver-new/restore'));
    assert.strictEqual(capturedMethod, 'POST');
    assert.strictEqual(result.project.parameters.diameter, 50);
  });

  it('deleteProjectVersion sends DELETE request to specific version', async () => {
    let capturedUrl = '';
    let capturedMethod = '';

    // @ts-ignore
    global.fetch = async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedMethod = init?.method || '';
      return new Response(null, { status: 204 });
    };

    await deleteProjectVersion('proj-gearbox', 'ver-del');
    assert.ok(capturedUrl.includes('/api/projects/proj-gearbox/versions/ver-del'));
    assert.strictEqual(capturedMethod, 'DELETE');
  });
});
