import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { env } from '../config/env.ts';
import { initDatabase } from '../db/client.ts';
import { processChatRequest } from '../services/llm.ts';
import { processOfflineChat } from '../services/providers/offlineProvider.ts';
import { getEngineeringAgent } from '../services/engineeringAgent.ts';
import {
  toolMetadataRegistry,
  geminiFunctionDeclarations,
  executeEngineeringTool,
  getToolMetadata,
} from '../tools/engineeringTools.ts';
import { getProjectById, getAllProjects } from '../services/projectService.js';

describe('Prompt 07 Engineering Agent Acceptance Suite (8 Real Test Scenarios)', () => {
  const originalProvider = env.LLM_PROVIDER;

  before(() => {
    initDatabase();
    env.LLM_PROVIDER = 'offline';
  });

  after(() => {
    env.LLM_PROVIDER = originalProvider;
  });

  // ==========================================================================
  // Section 1: Complete 38+ Engineering Tool Registry Verification
  // ==========================================================================
  describe('Tool Registry & Permission Classifications (38+ Tools Across Groups A-E)', () => {
    it('should register all required Prompt 07 tools with valid metadata and categories', () => {
      const requiredToolsGroupA = [
        'create_project', 'get_project', 'update_project', 'save_project',
        'list_projects', 'get_project_status', 'get_project_inputs', 'get_project_results'
      ];

      const requiredToolsGroupB = [
        'set_shaft_length', 'set_shaft_diameter', 'set_shaft_sections', 'set_shaft_features',
        'set_operating_speed', 'set_torque', 'set_applied_loads', 'set_support_conditions',
        'set_material', 'set_design_factor', 'get_current_engineering_inputs', 'validate_engineering_inputs'
      ];

      const requiredToolsGroupC = [
        'search_materials', 'get_material_details', 'get_material_properties',
        'compare_materials', 'select_material'
      ];

      const requiredToolsGroupD = [
        'create_shaft_geometry', 'update_shaft_geometry', 'add_shaft_section',
        'update_shaft_feature', 'remove_shaft_feature', 'get_model_geometry',
        'regenerate_model', 'get_model_dimensions', 'select_model_component',
        'update_component_visibility', 'get_model_status'
      ];

      const requiredToolsGroupE = [
        'calculate_transmitted_power', 'calculate_torsional_stress', 'calculate_bending_stress',
        'calculate_combined_stress', 'calculate_factor_of_safety', 'calculate_required_diameter',
        'calculate_shaft_deflection', 'calculate_failure_criteria', 'run_complete_shaft_analysis',
        'validate_design_results'
      ];

      const allGroups = [
        ...requiredToolsGroupA,
        ...requiredToolsGroupB,
        ...requiredToolsGroupC,
        ...requiredToolsGroupD,
        ...requiredToolsGroupE,
      ];

      for (const tool of allGroups) {
        const meta = getToolMetadata(tool);
        assert.ok(meta, `Metadata missing for registered tool: ${tool}`);
        assert.strictEqual(typeof meta.name, 'string');
        assert.strictEqual(typeof meta.description, 'string');
        assert.ok(meta.description.length > 5, `Description too short for tool: ${tool}`);
        assert.ok(['READ_ONLY', 'REVERSIBLE', 'HIGH_IMPACT'].includes(meta.permission),
          `Invalid permission '${meta.permission}' for tool: ${tool}`);
      }
    });

    it('should classify read-only analysis tools as READ_ONLY and reversible tools as REVERSIBLE', () => {
      // Category 1: Read-Only
      const readOnly = [
        'get_project_status', 'get_project_inputs', 'get_project_results',
        'get_current_engineering_inputs', 'validate_engineering_inputs',
        'search_materials', 'get_material_details', 'get_material_properties', 'compare_materials',
        'get_model_geometry', 'get_model_dimensions', 'get_model_status',
        'calculate_transmitted_power', 'calculate_torsional_stress', 'calculate_bending_stress',
        'calculate_combined_stress', 'calculate_factor_of_safety', 'calculate_required_diameter',
        'calculate_shaft_deflection', 'calculate_failure_criteria', 'run_complete_shaft_analysis',
        'validate_design_results'
      ];
      for (const t of readOnly) {
        assert.strictEqual(toolMetadataRegistry[t].permission, 'READ_ONLY', `${t} must be READ_ONLY`);
        assert.strictEqual(toolMetadataRegistry[t].requiresApproval, false, `${t} should not require approval`);
      }

      // Category 2: Reversible
      const reversible = [
        'create_project', 'update_project', 'set_shaft_length', 'set_shaft_diameter',
        'set_shaft_sections', 'set_shaft_features', 'set_operating_speed', 'set_torque',
        'set_applied_loads', 'set_support_conditions', 'set_material', 'set_design_factor',
        'select_material', 'create_shaft_geometry', 'update_shaft_geometry', 'regenerate_model'
      ];
      for (const t of reversible) {
        assert.strictEqual(toolMetadataRegistry[t].permission, 'REVERSIBLE', `${t} must be REVERSIBLE`);
        assert.strictEqual(toolMetadataRegistry[t].requiresApproval, true, `${t} requires approval`);
      }

      // Category 3: High Impact
      assert.strictEqual(toolMetadataRegistry['save_project'].permission, 'REVERSIBLE');
      assert.strictEqual(toolMetadataRegistry['save_project'].requiresApproval, true);
    });

    it('should expose valid Gemini function declarations for all registered tools', () => {
      assert.ok(geminiFunctionDeclarations.length >= 38, `Expected at least 38 declarations, got ${geminiFunctionDeclarations.length}`);
      const names = geminiFunctionDeclarations.map((d: any) => d.name);
      assert.ok(names.includes('set_torque'));
      assert.ok(names.includes('set_operating_speed'));
      assert.ok(names.includes('select_material'));
      assert.ok(names.includes('create_shaft_geometry'));
      assert.ok(names.includes('run_complete_shaft_analysis'));
      assert.ok(names.includes('validate_design_results'));
    });
  });

  // ==========================================================================
  // Scenario 1: Project Creation
  // ==========================================================================
  describe('Scenario 1: Project Creation', () => {
    it('should understand project creation request, invoke create_project, and persist to SQLite', async () => {
      const messages = [{ role: 'user' as const, content: 'Create a new shaft design project' }];
      const result = await processChatRequest(messages);

      assert.ok(result.toolsUsed.includes('create_project'));
      assert.ok(result.action);
      assert.strictEqual(result.action.type, 'project_created');
      assert.ok(result.action.project?.id);
      
      const createdId = result.action.project.id;
      const storedProj = getProjectById(createdId);
      assert.ok(storedProj, `Project ${createdId} should exist in database`);
      assert.strictEqual(storedProj.parameters.materialId, 'aisi-4140');
      assert.strictEqual(storedProj.parameters.torque, 500);
      assert.strictEqual(storedProj.parameters.rpm, 1450);

      // Verify execution telemetry
      assert.strictEqual(result.operationState, 'Completed');
      assert.ok(result.toolExecutionLogs && result.toolExecutionLogs.length > 0);
      const log = result.toolExecutionLogs.find((l) => l.tool === 'create_project');
      assert.ok(log);
      assert.strictEqual(log.status, 'success');
      assert.ok(result.message.content.includes(createdId));
    });
  });

  // ==========================================================================
  // Scenario 2: Engineering Inputs
  // ==========================================================================
  describe('Scenario 2: Engineering Inputs', () => {
    it('should set torque and operating speed, validate bounds, and update active project', async () => {
      const messages = [{ role: 'user' as const, content: 'Set torque to 500 Nm and speed to 1450 RPM' }];
      const result = await processChatRequest(messages);

      assert.ok(result.toolsUsed.includes('set_torque'));
      assert.ok(result.toolsUsed.includes('set_operating_speed'));
      assert.ok(result.action);
      assert.strictEqual(result.action.type, 'parameters_updated');
      assert.strictEqual(result.action.parameters.torque, 500);
      assert.strictEqual(result.action.parameters.rpm, 1450);

      // Verify engineering explanation and unit-checked values
      assert.ok(result.message.content.includes('500 N·m'));
      assert.ok(result.message.content.includes('1450 RPM'));
      assert.ok(result.message.content.includes('rad/s'));
      assert.strictEqual(result.operationState, 'Completed');
    });
  });

  // ==========================================================================
  // Scenario 3: Material Selection
  // ==========================================================================
  describe('Scenario 3: Material Selection', () => {
    it('should search database, retrieve certified properties, and assign AISI 4140 to project', async () => {
      const messages = [{ role: 'user' as const, content: 'Find AISI 4140 and use it for the shaft' }];
      const result = await processChatRequest(messages);

      assert.ok(result.toolsUsed.includes('search_materials') || result.toolsUsed.includes('select_material'));
      assert.ok(result.toolsUsed.includes('get_material_details') || result.toolsUsed.includes('select_material'));
      assert.ok(result.action);
      assert.strictEqual(result.action.type, 'parameters_updated');
      assert.strictEqual(result.action.parameters.materialId, 'aisi-4140');

      // Verify authoritative certified properties in output
      assert.ok(result.message.content.includes('655 MPa') || result.message.content.includes('Yield Strength'));
      assert.ok(result.message.content.includes('205 GPa') || result.message.content.includes('Modulus'));
      assert.strictEqual(result.operationState, 'Completed');
    });
  });

  // ==========================================================================
  // Scenario 4: CAD Generation
  // ==========================================================================
  describe('Scenario 4: CAD Generation', () => {
    it('should read current parameters, execute CAD geometry generation, and report envelope', async () => {
      const messages = [{ role: 'user' as const, content: 'Generate the shaft model' }];
      const result = await processChatRequest(messages);

      assert.ok(result.toolsUsed.includes('create_shaft_geometry') || result.toolsUsed.includes('regenerate_model'));
      assert.ok(result.action);
      assert.strictEqual(result.action.type, 'geometry_updated');
      assert.ok(result.action.parameters.diameter);
      assert.ok(result.action.parameters.length);

      // Verify geometry envelope reported
      assert.ok(result.message.content.includes('Outer Shaft Diameter') || result.message.content.includes('Diameter'));
      assert.ok(result.message.content.includes('Volume') || result.message.content.includes('Mass'));
      assert.ok(result.message.content.includes('VALID'));
      assert.strictEqual(result.operationState, 'Completed');
    });
  });

  // ==========================================================================
  // Scenario 5: Engineering Analysis
  // ==========================================================================
  describe('Scenario 5: Engineering Analysis', () => {
    it('should run complete solid mechanics analysis and validate stresses, FoS, and deflection', async () => {
      const messages = [{ role: 'user' as const, content: 'Run the shaft analysis' }];
      const result = await processChatRequest(messages);

      assert.ok(result.toolsUsed.includes('run_complete_shaft_analysis'));
      assert.ok(result.toolsUsed.includes('validate_design_results'));
      assert.ok(result.action);
      assert.strictEqual(result.action.type, 'analysis_completed');
      assert.ok(result.engineeringResult);
      assert.ok(result.engineeringResult.outputs);

      // Verify deterministic solid mechanics outputs
      assert.ok(result.message.content.includes('Torsional Shear Stress') || result.message.content.includes('tau = 16T/pi'));
      assert.ok(result.message.content.includes('Bending Normal Stress') || result.message.content.includes('sigma_b'));
      assert.ok(result.message.content.includes('Von Mises'));
      assert.ok(result.message.content.includes('Factor of Safety'));
      assert.ok(result.message.content.includes('Deflection'));
      assert.strictEqual(result.operationState, 'Completed');
    });
  });

  // ==========================================================================
  // Scenario 6: Multi-Step Autonomous Workflow
  // ==========================================================================
  describe('Scenario 6: Multi-Step Autonomous Workflow', () => {
    it('should execute complete end-to-end design sequence in a single request without manual intervention', async () => {
      const prompt = 'Design a shaft for 500 Nm torque at 1450 RPM using AISI 4140 steel, 320 mm span, 2500 N radial load, and target safety factor of 2.0. Create the project, generate the model, run analysis, and save the result.';
      const messages = [{ role: 'user' as const, content: prompt }];
      const result = await processChatRequest(messages);

      // Verify multi-tool sequential execution
      assert.ok(result.toolsUsed.length >= 6, `Expected at least 6 tools used, got ${result.toolsUsed.length}`);
      assert.ok(result.toolsUsed.includes('create_project'), 'Missing create_project');
      assert.ok(result.toolsUsed.includes('set_torque'), 'Missing set_torque');
      assert.ok(result.toolsUsed.includes('select_material'), 'Missing select_material');
      assert.ok(result.toolsUsed.includes('calculate_required_diameter'), 'Missing calculate_required_diameter');
      assert.ok(result.toolsUsed.includes('create_shaft_geometry'), 'Missing create_shaft_geometry');
      assert.ok(result.toolsUsed.includes('run_complete_shaft_analysis'), 'Missing run_complete_shaft_analysis');
      assert.ok(result.toolsUsed.includes('save_project'), 'Missing save_project');

      // Verify multiple actions recorded
      assert.ok(result.actions && result.actions.length >= 4, 'Actions array should contain multi-step state transitions');
      assert.ok(result.actions.some((a) => a.type === 'project_created'));
      assert.ok(result.actions.some((a) => a.type === 'parameters_updated'));
      assert.ok(result.actions.some((a) => a.type === 'geometry_updated'));
      assert.ok(result.actions.some((a) => a.type === 'version_saved'));

      // Verify execution telemetry logs
      assert.ok(result.toolExecutionLogs && result.toolExecutionLogs.length >= 6);
      for (const log of result.toolExecutionLogs) {
        assert.strictEqual(log.status, 'success');
        assert.ok(log.durationMs !== undefined && log.durationMs >= 0);
      }

      // Verify deterministic outputs in response content
      assert.ok(result.message.content.includes('Autonomous Shaft Design Workflow Completed'));
      assert.ok(result.message.content.includes('500 N·m'));
      assert.ok(result.message.content.includes('1450 RPM'));
      assert.ok(result.message.content.includes('AISI 4140'));
      assert.ok(result.message.content.includes('PASS'));
      assert.strictEqual(result.operationState, 'Completed');
    });
  });

  // ==========================================================================
  // Scenario 7: Context Awareness
  // ==========================================================================
  describe('Scenario 7: Context Awareness', () => {
    it('should resolve reference to active shaft, update diameter to 50 mm, regenerate CAD, and recalculate', async () => {
      // First ensure an active project exists
      const messages1 = [{ role: 'user' as const, content: 'Create a new shaft design project' }];
      const projResult = await processChatRequest(messages1);
      const activeProjId = projResult.action.project.id;

      // Follow-up context-dependent request
      const messages2 = [
        { role: 'user' as const, content: 'Create a new shaft design project' },
        { role: 'assistant' as const, content: projResult.message.content },
        { role: 'user' as const, content: 'Increase its diameter to 50 mm' },
      ];

      const result = await processChatRequest(messages2, { id: activeProjId, diameter: 45, length: 320 });

      assert.ok(result.toolsUsed.includes('set_shaft_diameter'));
      assert.ok(result.toolsUsed.includes('regenerate_model'));
      assert.ok(result.toolsUsed.includes('run_complete_shaft_analysis'));

      assert.ok(result.action);
      assert.strictEqual(result.action.type, 'parameters_updated');
      assert.strictEqual(result.action.parameters.diameter, 50);

      // Verify delta explanation
      assert.ok(result.message.content.includes('45 mm') || result.message.content.includes('baseline'));
      assert.ok(result.message.content.includes('50 mm'));
      assert.ok(result.message.content.includes('reduction') || result.message.content.includes('Torsional Shear Stress'));
      assert.strictEqual(result.operationState, 'Completed');
    });
  });

  // ==========================================================================
  // Scenario 8: Failure Recovery
  // ==========================================================================
  describe('Scenario 8: Failure Recovery', () => {
    it('should reject invalid negative diameter, explain violation, and leave project intact', async () => {
      const messages = [{ role: 'user' as const, content: 'Set diameter to -45 mm' }];
      const result = await processChatRequest(messages);

      assert.ok(result.toolsUsed.includes('validate_engineering_inputs'));
      assert.strictEqual(result.operationState, 'Failed');
      assert.ok(result.message.content.includes('Engineering Input Validation Failure') || result.message.content.includes('Error Detected'));
      assert.ok(result.message.content.includes('positive') || result.message.content.includes('strictly positive'));

      // Check tool log status
      assert.ok(result.toolExecutionLogs);
      const valLog = result.toolExecutionLogs.find((l) => l.tool === 'validate_engineering_inputs');
      assert.ok(valLog);

      // Verify no invalid negative parameter was persisted to active projects
      const all = getAllProjects();
      for (const p of all) {
        if (p.parameters.diameter !== undefined) {
          assert.ok(p.parameters.diameter > 0, `Project ${p.id} diameter must be positive, got ${p.parameters.diameter}`);
        }
      }
    });

    it('should reject zero speed with clear physical explanation', async () => {
      const messages = [{ role: 'user' as const, content: 'Set speed to 0 RPM' }];
      const result = await processChatRequest(messages);

      assert.ok(result.toolsUsed.includes('validate_engineering_inputs'));
      assert.strictEqual(result.operationState, 'Failed');
      assert.ok(result.message.content.includes('Validation Failure') || result.message.content.includes('speed'));
    });
  });
});
