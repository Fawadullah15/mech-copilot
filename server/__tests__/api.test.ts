import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../app.ts';
import type { Server } from 'node:http';
import { env } from '../config/env.ts';

describe('Backend API Tests', () => {
  let server: Server;
  const PORT = 3002; // Use a different port for testing
  const BASE_URL = `http://localhost:${PORT}`;

  before(async () => {
    return new Promise((resolve) => {
      server = app.listen(PORT, () => resolve(undefined));
    });
  });

  after(() => {
    server.close();
  });

  it('GET /api/health should return 200 OK', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'ok');
    assert.strictEqual(data.service, 'mech-copilot-api');
  });

  it('POST /api/chat with invalid body should return 400', async () => {
    const originalKey = env.OPENAI_API_KEY;
    env.OPENAI_API_KEY = 'dummy';

    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }) // Empty messages array is invalid
    });
    
    env.OPENAI_API_KEY = originalKey;

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(typeof data.error, 'string');
    assert.ok(data.error.includes('Invalid request structure'));
  });

  it('POST /api/chat with missing API key should gracefully fall back to deterministic engineering calculation (HTTP 200)', async () => {
    // Ensure OPENAI_API_KEY is undefined for this test
    const originalKey = env.OPENAI_API_KEY;
    env.OPENAI_API_KEY = undefined;

    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Calculate the required shaft diameter for 500 Nm torque' }]
      })
    });
    
    env.OPENAI_API_KEY = originalKey;

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.message.role, 'assistant');
    assert.ok(typeof data.message.content === 'string');
    assert.ok(data.message.content.includes('Diameter') || data.message.content.includes('diameter'));
    assert.ok(Array.isArray(data.toolsUsed));
    assert.ok(data.toolsUsed.includes('calculate_required_shaft_diameter'));
    assert.ok(data.engineeringResult !== null && typeof data.engineeringResult === 'object');
    assert.strictEqual(data.engineeringResult.tool, 'calculate_required_shaft_diameter');
    assert.ok(data.engineeringResult.outputs.requiredDiameterMm > 0);
  });

  it('GET /api/unknown should return 404', async () => {
    const res = await fetch(`${BASE_URL}/api/unknown`);
    assert.strictEqual(res.status, 404);
    const data = await res.json();
    assert.strictEqual(data.error, 'Route not found');
  });

  describe('Offline Chat 7 Prompt Suite', () => {
    const originalKey = env.OPENAI_API_KEY;

    before(() => {
      env.OPENAI_API_KEY = undefined;
    });

    after(() => {
      env.OPENAI_API_KEY = originalKey;
    });

    it('Prompt 1: "Check this shaft design."', async () => {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Check this shaft design.' }]
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.toolsUsed.includes('run_full_shaft_analysis'));
      assert.ok(data.engineeringResult);
      assert.strictEqual(data.engineeringResult.tool, 'run_full_shaft_analysis');
    });

    it('Prompt 2: "Reduce the shaft weight."', async () => {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Reduce the shaft weight.' }]
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.toolsUsed.includes('calculate_required_shaft_diameter'));
      assert.ok(data.message.content.includes('Hollow Shaft Bore') || data.message.content.includes('Mass Reduction'));
    });

    it('Prompt 3: "What diameter do I need for FoS 2.5?"', async () => {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'What diameter do I need for FoS 2.5?' }]
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.toolsUsed.includes('calculate_required_shaft_diameter'));
      assert.strictEqual(data.engineeringResult.inputs.safetyFactor, 2.5);
    });

    it('Prompt 4: "Explain the current shaft\'s factor of safety."', async () => {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: "Explain the current shaft's factor of safety." }]
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.message.content.includes('Factor of Safety Evaluation'));
      assert.ok(data.message.content.includes('Active FoS'));
    });

    it('Prompt 5: "Analyze this design with zero torque."', async () => {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Analyze this design with zero torque.' }]
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.toolsUsed.includes('run_full_shaft_analysis'));
      assert.strictEqual(data.engineeringResult.inputs.torque, 0);
    });

    it('Prompt 6: "Change the diameter to 50 mm and recalculate."', async () => {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Change the diameter to 50 mm and recalculate.' }]
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.toolsUsed.includes('run_full_shaft_analysis'));
      assert.strictEqual(data.engineeringResult.inputs.diameter, 50);
    });

    it('Prompt 7: "Give me an unsupported calculation that the system cannot perform."', async () => {
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Give me an unsupported calculation that the system cannot perform.' }]
        })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.message.content.includes('Boundary Specification'));
      assert.ok(data.message.content.includes('Computational Fluid Dynamics (CFD)'));
      assert.strictEqual(data.toolsUsed.length, 0);
    });
  });
});
