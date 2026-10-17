import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { processChatRequest } from '../services/llm.ts';
import { env } from '../config/env.ts';

describe('LLM Integration (Mocked API)', () => {
  const originalFetch = global.fetch;
  const originalKey = env.OPENAI_API_KEY;

  before(() => {
    env.OPENAI_API_KEY = 'test_key';
  });

  after(() => {
    global.fetch = originalFetch;
    env.OPENAI_API_KEY = originalKey;
  });

  it('Test 1 — Diameter tool result: should process and return engineeringResult', async () => {
    // @ts-ignore
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);
      if (body.messages.length === 2) {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_123',
                type: 'function',
                function: {
                  name: 'calculate_required_shaft_diameter',
                  arguments: JSON.stringify({ torqueNm: 1000, safetyFactor: 2 })
                }
              }]
            }
          }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        choices: [{
          message: {
            role: 'assistant',
            content: 'The required shaft diameter is 46.7 mm.'
          }
        }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const response = await processChatRequest([{ role: 'user', content: 'Calculate required shaft diameter for 1000 Nm torque.' }]);
    assert.ok(response);

    assert.strictEqual(response.message.content, 'The required shaft diameter is 46.7 mm.');
    assert.ok(response.toolsUsed?.includes('calculate_required_shaft_diameter'));
    assert.ok(response.engineeringResult, 'engineeringResult should exist');
    assert.strictEqual(response.engineeringResult.tool, 'calculate_required_shaft_diameter');
    assert.strictEqual(response.engineeringResult.inputs.torqueNm, 1000);
    assert.ok(response.engineeringResult.outputs.requiredDiameterMm > 0);
  });

  it('Test 2 — Full shaft analysis: should process and return engineeringResult', async () => {
    // @ts-ignore
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);
      if (body.messages.length === 2) {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_123',
                type: 'function',
                function: {
                  name: 'run_full_shaft_analysis',
                  arguments: JSON.stringify({
                    torqueNm: 1000, radialForceN: 500, diameterMm: 50, lengthMm: 1000,
                    rpm: 1500, yieldStrengthMPa: 400, tensileStrengthMPa: 500,
                    elasticModulusGPa: 200, targetSafetyFactor: 2.0, operatingTempC: 25
                  })
                }
              }]
            }
          }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        choices: [{ message: { role: 'assistant', content: 'Analysis complete.' } }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const response = await processChatRequest([{ role: 'user', content: 'Run analysis.' }]);
    assert.ok(response);
    
    assert.ok(response.engineeringResult);
    assert.strictEqual(response.engineeringResult.tool, 'run_full_shaft_analysis');
    assert.ok(response.engineeringResult.outputs.overallStatus);
  });

  it('Test 3 — Normal chat: should not contain engineeringResult', async () => {
    // @ts-ignore
    global.fetch = async () => {
      return new Response(JSON.stringify({
        choices: [{ message: { role: 'assistant', content: 'A shaft transmits power.' } }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };

    const response = await processChatRequest([{ role: 'user', content: 'What is a shaft?' }]);
    assert.ok(response);
    
    assert.strictEqual(response.message.content, 'A shaft transmits power.');
    assert.strictEqual(response.engineeringResult, undefined);
  });
});
