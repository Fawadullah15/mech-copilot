import assert from 'node:assert/strict';
import { env } from '../server/config/env.ts';
import { verifyGeminiConnection } from '../server/services/providers/geminiProvider.ts';
import { processChatRequest, getAIProviderStatus } from '../server/services/llm.ts';
import {
  createProject,
  getProjectById,
  updateProject,
  deleteProject
} from '../server/services/projectService.ts';
import {
  getConversationById,
  getMessagesByConversationId,
  createConversation,
  addMessage
} from '../server/services/conversationService.ts';
import { initDatabase, db } from '../server/db/client.ts';
import { solveMinimumShaftDiameterCombined } from '../src/engineering/calculations/shaft.ts';

async function runGemini13StepVerification() {
  console.log('================================================================');
  console.log('🤖 MECH-COPILOT MVP STAGE 2: GEMINI COPILOT 13-STEP E2E TEST');
  console.log('================================================================\n');

  // Step 0: Ensure DB is initialized
  initDatabase();
  console.log('✓ SQLite database initialized');

  // Verify Provider Status
  const providerStatus = await getAIProviderStatus();
  console.log(`✓ Active Provider: ${providerStatus.provider.toUpperCase()} (${providerStatus.model})`);
  console.log(`✓ Status: ${providerStatus.status} (${providerStatus.displayStatus})\n`);

  if (!env.GEMINI_API_KEY) {
    console.warn('⚠️ No GEMINI_API_KEY found in environment. The test will run through the offline deterministic fallback.');
  }

  // Create clean isolated project
  const testProjectId = `proj-gemini-e2e-${Date.now()}`;
  const testConvId = `conv-gemini-e2e-${Date.now()}`;

  createProject({
    id: testProjectId,
    name: 'Gemini Shaft Verification Project',
    description: 'Autonomous E2E test project for Gemini solid shaft design workflow',
    type: 'Power Transmission',
    parameters: {
      materialId: 'aisi-1045',
      diameter: 45,
      length: 300,
      torque: 400,
      force: 8000,
      rpm: 1200,
      safetyFactor: 1.5,
      temperature: 40,
      criterion: 'Von Mises'
    }
  });

  createConversation(testConvId, testProjectId, '13-Step Verification Thread', new Date().toISOString());
  console.log(`✓ Test project created: ${testProjectId}`);
  console.log(`✓ Test conversation created: ${testConvId}\n`);

  const conversationHistory: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

  const runTurn = async (stepNum: number, userPrompt: string, expectedTool?: string) => {
    console.log(`--- [Step ${stepNum}] User: "${userPrompt}" ---`);
    conversationHistory.push({ role: 'user', content: userPrompt });

    // Persist user message to SQLite
    addMessage(testConvId, {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: userPrompt,
      timestamp: new Date().toISOString()
    });

    const currentProject = getProjectById(testProjectId);
    const result = await processChatRequest(conversationHistory, currentProject?.parameters);

    console.log(`Assistant (${result.provider}):`);
    const preview = result.message.content.length > 200
      ? result.message.content.substring(0, 200) + '...'
      : result.message.content;
    console.log(`> ${preview}`);

    if (result.toolsUsed && result.toolsUsed.length > 0) {
      console.log(`🔧 Deterministic Tools Executed: [${result.toolsUsed.join(', ')}]`);
    }

    if (result.engineeringResult) {
      console.log(`📊 Engineering Outputs:`, JSON.stringify(result.engineeringResult.outputs, null, 2));
    }

    if (expectedTool) {
      assert.ok(
        result.toolsUsed && result.toolsUsed.includes(expectedTool),
        `Expected tool ${expectedTool} to be executed, but got [${result.toolsUsed?.join(', ')}]`
      );
    }

    conversationHistory.push({ role: 'assistant', content: result.message.content });

    // Persist assistant message to SQLite
    addMessage(testConvId, {
      id: `msg-${Date.now()}-a`,
      role: 'assistant',
      content: result.message.content,
      timestamp: new Date().toISOString(),
      engineeringResult: result.engineeringResult
    });

    console.log('');
    return result;
  };

  try {
    // 1. "Design a shaft for 500 Nm torque."
    updateProject(testProjectId, { parameters: { torque: 500 } });
    await runTurn(1, 'Design a shaft for 500 Nm torque.');

    // 2. "Use AISI 4140 material."
    updateProject(testProjectId, { parameters: { materialId: 'aisi-4140' } });
    await runTurn(2, 'Use AISI 4140 material.');

    // 3. "Set the factor of safety to 2."
    updateProject(testProjectId, { parameters: { safetyFactor: 2.0 } });
    await runTurn(3, 'Set the factor of safety to 2.');

    // 4. "The shaft length is 320 mm."
    updateProject(testProjectId, { parameters: { length: 320 } });
    await runTurn(4, 'The shaft length is 320 mm.');

    // 5. "Apply a radial load of 12 kN."
    updateProject(testProjectId, { parameters: { force: 12000 } });
    await runTurn(5, 'Apply a radial load of 12 kN.');

    // 6. "Calculate the minimum required shaft diameter."
    const step6Result = await runTurn(6, 'Calculate the minimum required shaft diameter.', 'calculate_required_shaft_diameter');

    // 7. "Explain the result."
    await runTurn(7, 'Explain the result.');

    // 8. "Increase torque to 700 Nm."
    updateProject(testProjectId, { parameters: { torque: 700 } });
    await runTurn(8, 'Increase torque to 700 Nm.');

    // 9. "Recalculate the new shaft diameter."
    const step9Result = await runTurn(9, 'Recalculate the new shaft diameter.', 'calculate_required_shaft_diameter');

    // 10. Numerical verification: Compare returned diameter with deterministic calculation engine
    console.log('--- [Step 10] Numerical Ground-Truth Verification ---');
    // Ground truth: 500 Nm torque, 12 kN force, 320 mm length, AISI 4140 (Sy = 655 MPa), FoS = 2
    const baseline500 = solveMinimumShaftDiameterCombined({
      torqueNm: 500,
      radialForceN: 12000,
      lengthMm: 320,
      yieldStrengthMPa: 655,
      targetSafetyFactor: 2.0,
      criterion: 'Von Mises',
      elasticModulusGPa: 205,
      deflectionLimitRatio: 1000
    });
    console.log(`Deterministic 500 Nm Stress Root: ⌀${baseline500.combinedStressDiameterMm?.toFixed(2)} mm | Governing Root: ⌀${baseline500.requiredDiameterMm.toFixed(2)} mm`);

    // Ground truth: 700 Nm torque, 12 kN force, 320 mm length, AISI 4140 (Sy = 655 MPa), FoS = 2
    const baseline700 = solveMinimumShaftDiameterCombined({
      torqueNm: 700,
      radialForceN: 12000,
      lengthMm: 320,
      yieldStrengthMPa: 655,
      targetSafetyFactor: 2.0,
      criterion: 'Von Mises',
      elasticModulusGPa: 205,
      deflectionLimitRatio: 1000
    });
    console.log(`Deterministic 700 Nm Stress Root: ⌀${baseline700.combinedStressDiameterMm?.toFixed(2)} mm | Governing Root: ⌀${baseline700.requiredDiameterMm.toFixed(2)} mm`);

    // Check step 9 output matches deterministic root
    const returnedDiameter700 = step9Result.engineeringResult?.outputs?.requiredDiameterMm || step9Result.engineeringResult?.outputs?.minRequiredDiameterMm;
    assert.ok(returnedDiameter700, 'Step 9 must produce requiredDiameterMm');
    const diff700 = Math.abs(returnedDiameter700 - baseline700.requiredDiameterMm);
    console.log(`Tool Output: ⌀${returnedDiameter700.toFixed(2)} mm | Delta vs Solver: ${diff700.toFixed(4)} mm`);
    assert.ok(diff700 < 0.1, `Returned diameter ${returnedDiameter700} differs from solver root ${baseline700.requiredDiameterMm}`);
    console.log('✓ Ground truth match: Copilot diameter matches deterministic solver within 0.1 mm\n');

    // 11. Simulate workstation parameter application
    console.log('--- [Step 11] Workstation Parameter Application ---');
    const updatedParameters = {
      materialId: 'aisi-4140',
      diameter: Number(baseline700.requiredDiameterMm.toFixed(2)),
      length: 320,
      torque: 700,
      force: 12000,
      rpm: 1450,
      safetyFactor: 2.0,
      temperature: 60,
      criterion: 'Von Mises' as const
    };
    const updatedProj = updateProject(testProjectId, { parameters: updatedParameters });
    console.log(`Applied parameters to project ${testProjectId}:`, updatedProj.parameters);
    assert.strictEqual(updatedProj.parameters.torque, 700);
    assert.strictEqual(updatedProj.parameters.diameter, Number(baseline700.requiredDiameterMm.toFixed(2)));
    assert.strictEqual(updatedProj.parameters.materialId, 'aisi-4140');
    console.log('✓ Workstation application successful\n');

    // 12. Verify SQLite project parameter persistence
    console.log('--- [Step 12] SQLite Project Parameter & Conversation Persistence ---');
    const projectInDb = getProjectById(testProjectId);
    assert.ok(projectInDb, 'Project must be present in SQLite');
    assert.strictEqual(projectInDb.parameters.torque, 700);
    assert.strictEqual(projectInDb.parameters.force, 12000);
    assert.strictEqual(projectInDb.parameters.diameter, Number(baseline700.requiredDiameterMm.toFixed(2)));

    const savedMessages = getMessagesByConversationId(testConvId);
    console.log(`Total messages persisted in conversation: ${savedMessages.length}`);
    assert.ok(savedMessages.length >= 18, 'All user and assistant turns must be recorded');
    console.log('✓ SQLite persistence verified\n');

    // 13. Query SQLite directly to verify disk schema integrity and session recovery
    console.log('--- [Step 13] Raw SQLite Verification & Session Recovery ---');
    const rawProjRow: any = db.prepare('SELECT * FROM projects WHERE id = ?').get(testProjectId);
    assert.ok(rawProjRow, 'Raw project record must exist in SQLite database table');
    const rawParams = JSON.parse(rawProjRow.parameters);
    assert.strictEqual(rawParams.torque, 700);
    assert.strictEqual(rawParams.force, 12000);
    assert.strictEqual(rawParams.diameter, Number(baseline700.requiredDiameterMm.toFixed(2)));
    assert.strictEqual(rawParams.materialId, 'aisi-4140');
    console.log(`✓ Raw SQL check: Project ${testProjectId} parameters JSON verified`);

    const rawMsgRows: any[] = db.prepare('SELECT * FROM messages WHERE conversationId = ?').all(testConvId);
    assert.strictEqual(rawMsgRows.length, savedMessages.length, 'All conversation turns must be in messages table');
    console.log(`✓ Raw SQL check: ${rawMsgRows.length} messages verified directly in SQLite messages table`);
    console.log('✓ 13-Step Verification Test Complete & Fully Passing!\n');

  } finally {
    // Cleanup test project
    deleteProject(testProjectId);
    console.log(`✓ Cleaned up test project ${testProjectId}`);
  }
}

runGemini13StepVerification().catch((err) => {
  console.error('❌ E2E Verification failed:', err);
  process.exit(1);
});
