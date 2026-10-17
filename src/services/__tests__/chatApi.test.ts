import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { sendChatMessage } from '../chatApi.ts';
import type { CopilotMessage } from '../../types/index.ts';

describe('Frontend chatApi tests', () => {
  const originalFetch = global.fetch;

  after(() => {
    global.fetch = originalFetch;
  });

  it('Test 1 - API service sends correct payload', async () => {
    let capturedPayload: any;
    // @ts-ignore
    global.fetch = async (input, init) => {
      capturedPayload = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ message: { role: 'assistant', content: 'test' } }));
    };

    const messages: CopilotMessage[] = [
      { id: '1', role: 'user', content: 'Hello', timestamp: '' }
    ];
    await sendChatMessage(messages, 'proj-1', 'conv-1');
    assert.deepStrictEqual(capturedPayload, {
      projectId: 'proj-1',
      conversationId: 'conv-1',
      userMessage: { id: '1', role: 'user', content: 'Hello', timestamp: '' },
      messages: [{ role: 'user', content: 'Hello' }]
    });
  });

  it('Test 2 - Successful response with engineeringResult', async () => {
    // @ts-ignore
    global.fetch = async () => {
      return new Response(JSON.stringify({
        message: { role: 'assistant', content: 'The required shaft diameter is 46.7 mm.' },
        toolsUsed: ['calculate_required_shaft_diameter'],
        engineeringResult: {
          tool: 'calculate_required_shaft_diameter',
          inputs: { torqueNm: 1000 },
          outputs: { requiredDiameterMm: 46.7 }
        }
      }));
    };

    const result = await sendChatMessage([{id:'1', role:'user', content:'a', timestamp:''}], 'proj-1', 'conv-1');
    assert.strictEqual(result.role, 'assistant');
    assert.strictEqual(result.content, 'The required shaft diameter is 46.7 mm.');
    assert.strictEqual(result.type, 'calculation');
    assert.ok(result.structuredData !== undefined);
    assert.ok(result.engineeringResult !== undefined);
    assert.strictEqual(result.engineeringResult?.outputs.requiredDiameterMm, 46.7);
  });

  it('Test 3 - Backend unavailable', async () => {
    // @ts-ignore
    global.fetch = async () => {
      throw new TypeError('fetch failed');
    };

    await assert.rejects(
      async () => await sendChatMessage([{id:'1', role:'user', content:'a', timestamp:''}], 'proj-1', 'conv-1'),
      /Unable to connect to the engineering Copilot server/
    );
  });

  it('Test 4 - HTTP error', async () => {
    // @ts-ignore
    global.fetch = async () => {
      return new Response(JSON.stringify({ error: 'Server exploded' }), { status: 500 });
    };

    await assert.rejects(
      async () => await sendChatMessage([{id:'1', role:'user', content:'a', timestamp:''}], 'proj-1', 'conv-1'),
      /Server exploded/
    );
  });
});
