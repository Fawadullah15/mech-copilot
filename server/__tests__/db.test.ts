import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, initDatabase, resetDatabase, isTestMode, activeDbPath } from '../db/client.ts';
import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject
} from '../services/projectService.ts';
import {
  createConversation,
  getConversationsByProjectId,
  getConversationById,
  addMessage,
  getMessagesByConversationId
} from '../services/conversationService.ts';

// Use an in-memory database for testing to ensure isolation and prevent polluting local db.
describe('Database Persistence Layer', () => {
  before(() => {
    assert.ok(isTestMode(), 'db.test.ts must be running in test mode');
    assert.ok(
      activeDbPath === ':memory:' || activeDbPath.includes('test'),
      `db.test.ts must use an isolated test database, but got: ${activeDbPath}`
    );
    resetDatabase();
  });

  after(() => {
    resetDatabase();
  });

  const testProject = {
    id: 'test-proj-1',
    name: 'Test Project',
    description: 'A test project',
    type: 'Test',
    status: 'In Progress',
    progress: 50,
    lastModified: new Date().toISOString(),
    created: new Date().toISOString(),
    parameters: { diameter: 45, torque: 500 },
    tags: ['test']
  };

  it('Project creation & retrieval', () => {
    createProject(testProject);
    const p = getProjectById('test-proj-1');
    assert.ok(p);
    assert.strictEqual(p.name, 'Test Project');
    assert.strictEqual(p.parameters.diameter, 45);
  });

  it('Project listing', () => {
    const list = getAllProjects();
    assert.ok(list.length >= 1);
    const p = list.find(x => x.id === 'test-proj-1');
    assert.ok(p);
  });

  it('Project update', () => {
    const updated = updateProject('test-proj-1', {
      parameters: { diameter: 50 } // partial parameter update
    });
    assert.strictEqual(updated.parameters.diameter, 50);
    assert.strictEqual(updated.parameters.torque, 500); // preserved

    const fetched = getProjectById('test-proj-1');
    assert.strictEqual(fetched?.parameters.diameter, 50);
  });

  it('Conversation creation', () => {
    const conv = createConversation('test-conv-1', 'test-proj-1', 'Test Conversation', new Date().toISOString());
    assert.ok(conv);

    const fetched = getConversationById('test-conv-1');
    assert.strictEqual(fetched.projectId, 'test-proj-1');
  });

  it('Message persistence', () => {
    const msg1 = {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date().toISOString()
    };
    addMessage('test-conv-1', msg1);
    
    const messages = getMessagesByConversationId('test-conv-1');
    assert.strictEqual(messages.length, 1);
    assert.strictEqual(messages[0].content, 'Hello');
  });

  it('Engineering result persistence', () => {
    const aiMsg = {
      id: 'msg-2',
      role: 'assistant',
      content: 'Here is the result',
      timestamp: new Date().toISOString(),
      engineeringResult: {
        tool: 'calculate',
        inputs: { foo: 'bar' },
        outputs: { status: 'PASS' }
      }
    };
    addMessage('test-conv-1', aiMsg);

    const messages = getMessagesByConversationId('test-conv-1');
    assert.strictEqual(messages.length, 2);
    
    const fetchedAiMsg = messages.find(m => m.id === 'msg-2');
    assert.ok(fetchedAiMsg);
    assert.ok(fetchedAiMsg.engineeringResult);
    assert.strictEqual(fetchedAiMsg.engineeringResult.tool, 'calculate');
    assert.strictEqual(fetchedAiMsg.engineeringResult.outputs.status, 'PASS');
  });

  it('Chat restoration via project conversations', () => {
    const convs = getConversationsByProjectId('test-proj-1');
    assert.strictEqual(convs.length, 1);
    assert.strictEqual(convs[0].id, 'test-conv-1');
  });

  it('Project deletion cascades correctly', () => {
    deleteProject('test-proj-1');
    assert.strictEqual(getProjectById('test-proj-1'), null);

    // Verify cascade (foreign keys are enabled)
    const convs = getConversationsByProjectId('test-proj-1');
    assert.strictEqual(convs.length, 0);
  });

  it('Not found behavior', () => {
    assert.strictEqual(getProjectById('invalid-id'), null);
    
    assert.throws(() => {
      updateProject('invalid-id', {});
    }, /Project not found/);
  });
});
