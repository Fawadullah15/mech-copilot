import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { initDatabase } from '../db/client.ts';
import { processOfflineChat } from '../services/providers/offlineProvider.js';
import { getToolMetadata, toolMetadataRegistry, executeEngineeringTool } from '../tools/engineeringTools.js';

describe('Prompt 05 Engineering AI Agent & Tool Execution Workflows', () => {
  before(() => {
    initDatabase();
  });

  // --------------------------------------------------------------------------
  // 1. Tool Registry & Permission Classification Tests (Prompt 05 Section 3 & 6)
  // --------------------------------------------------------------------------
  describe('Tool Registry & Permission Classification', () => {
    it('should register all 29 Prompt 05 engineering tools with valid metadata and permissions', () => {
      const requiredTools = [
        // Project tools
        'create_project', 'get_project', 'update_project', 'save_project', 'list_projects',
        // Shaft design tools
        'create_shaft', 'update_shaft', 'add_shaft_section', 'remove_shaft_feature', 'update_shaft_dimensions', 'get_shaft_geometry',
        // Engineering calculation tools
        'calculate_power', 'calculate_torsional_stress', 'calculate_bending_stress', 'calculate_combined_stress',
        'calculate_factor_of_safety', 'calculate_required_diameter', 'calculate_deflection', 'validate_design',
        // Material tools
        'search_materials', 'get_material_properties', 'update_material_selection',
        // CAD tools
        'regenerate_geometry', 'select_component', 'update_feature_visibility', 'set_camera_view',
        // Drawing & reporting tools
        'generate_orthographic_drawing', 'generate_engineering_report', 'export_drawing', 'get_project_revision_history'
      ];

      for (const toolName of requiredTools) {
        const meta = getToolMetadata(toolName);
        assert.ok(meta, `Metadata missing for tool: ${toolName}`);
        assert.ok(['READ_ONLY', 'REVERSIBLE', 'HIGH_IMPACT'].includes(meta.permission),
          `Invalid permission '${meta.permission}' for tool: ${toolName}`);
        assert.strictEqual(typeof meta.description, 'string');
        assert.ok(meta.description.length > 5);
      }
    });

    it('should classify read-only analysis tools as READ_ONLY with requiresApproval: false', () => {
      const readOnlyTools = [
        'calculate_power',
        'calculate_torsional_stress',
        'calculate_bending_stress',
        'calculate_combined_stress',
        'calculate_factor_of_safety',
        'calculate_required_diameter',
        'calculate_deflection',
        'get_material_properties',
        'get_shaft_geometry',
        'search_materials',
      ];

      for (const toolName of readOnlyTools) {
        const meta = getToolMetadata(toolName);
        assert.strictEqual(meta.permission, 'READ_ONLY', `${toolName} should be READ_ONLY`);
        assert.strictEqual(meta.requiresApproval, false, `${toolName} should not require approval`);
      }
    });

    it('should classify geometric and parameter modifications as REVERSIBLE with requiresApproval: true', () => {
      const reversibleTools = [
        'update_shaft',
        'update_shaft_dimensions',
        'add_shaft_section',
        'remove_shaft_feature',
        'update_material_selection',
        'regenerate_geometry',
      ];

      for (const toolName of reversibleTools) {
        const meta = getToolMetadata(toolName);
        assert.strictEqual(meta.permission, 'REVERSIBLE', `${toolName} should be REVERSIBLE`);
        assert.strictEqual(meta.requiresApproval, true, `${toolName} should require approval`);
      }
    });

    it('should reject malformed tool inputs gracefully with structured error message', () => {
      const malformedRes = executeEngineeringTool('calculate_torsional_stress', '{ bad json }');
      const parsed = JSON.parse(malformedRes);
      assert.ok(parsed.error);
      assert.ok(parsed.error.includes('Invalid JSON syntax'));
    });

    it('should reject negative diameter in calculation schema gracefully', () => {
      const invalidRes = executeEngineeringTool('calculate_torsional_stress', JSON.stringify({
        torqueNm: 500,
        diameterMm: -45, // invalid negative
      }));
      const parsed = JSON.parse(invalidRes);
      assert.ok(parsed.error);
      assert.ok(parsed.error.includes('Error executing tool'));
    });
  });

  // --------------------------------------------------------------------------
  // 2. Scenario A: Basic Shaft Request (Prompt 05 Section 10)
  // --------------------------------------------------------------------------
  describe('Scenario A: Basic shaft request with missing information', () => {
    it('should correctly extract torque and rpm, identify missing parameters, and ask clarification questions without inventing assumptions', () => {
      const result = processOfflineChat([
        { role: 'user', content: 'Design a shaft for 500 Nm torque and 1450 RPM.' }
      ]);

      assert.strictEqual(result.message.role, 'assistant');
      assert.strictEqual(result.operationState, 'Waiting for Information');
      assert.ok(result.requirements, 'Requirements summary must be present');
      assert.strictEqual(result.requirements.identified.torqueNm, 500);
      assert.strictEqual(result.requirements.identified.rpm, 1450);

      // Verify missing info identified
      assert.ok(result.requirements.missing.length >= 3);
      const missingStr = result.requirements.missing.join(' ');
      assert.ok(missingStr.includes('Material'), 'Should identify missing material');
      assert.ok(missingStr.includes('Span') || missingStr.includes('Length'), 'Should identify missing span');
      assert.ok(missingStr.includes('Load') || missingStr.includes('Force'), 'Should identify missing transverse load');

      // Verify clarification questions in message content
      assert.ok(result.message.content.includes('500 N·m') || result.message.content.includes('500'));
      assert.ok(result.message.content.includes('1,450 RPM') || result.message.content.includes('1450'));
      assert.ok(result.message.content.includes('Missing Engineering Information'));
      assert.ok(result.message.content.includes('Clarification Questions'));
    });
  });

  // --------------------------------------------------------------------------
  // 3. Scenario B: User Supplies Missing Information (Prompt 05 Section 10)
  // --------------------------------------------------------------------------
  describe('Scenario B: User supplies missing information', () => {
    it('should update project inputs, execute deterministic calculations, and present validated results', () => {
      const result = processOfflineChat([
        { role: 'user', content: 'Design a shaft for 500 Nm torque and 1450 RPM.' },
        { role: 'assistant', content: 'Please provide missing material and loads.' },
        { role: 'user', content: 'Use AISI 4140 steel, span 320 mm, radial force 2500 N, safety factor 2.0' }
      ]);

      assert.strictEqual(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.includes('calculate_required_shaft_diameter'));
      assert.ok(result.toolsUsed.includes('run_full_shaft_analysis'));
      assert.ok(result.toolsUsed.includes('calculate_power'));

      // Validate engineering outputs
      assert.ok(result.engineeringResult !== null);
      assert.strictEqual(result.engineeringResult.tool, 'run_full_shaft_analysis');
      assert.ok(result.engineeringResult.outputs.safetyFactor >= 2.0);
      assert.ok(result.engineeringResult.outputs.maxDeflectionMm > 0);

      // Validate requirements summary
      assert.strictEqual(result.requirements?.missing.length, 0, 'No missing requirements should remain');
      assert.strictEqual(result.requirements?.identified.torqueNm, 500);
      assert.strictEqual(result.requirements?.identified.radialForceN, 2500);
      assert.strictEqual(result.requirements?.identified.lengthMm, 320);

      // Content verification
      assert.ok(result.message.content.includes('Shaft Sizing & Structural Synthesis Complete'));
      assert.ok(result.message.content.includes('AISI 4140'));
      assert.ok(result.message.content.includes('Minimum Required Diameter'));
    });
  });

  // --------------------------------------------------------------------------
  // 4. Scenario C: Geometry Modification (Prompt 05 Section 10)
  // --------------------------------------------------------------------------
  describe('Scenario C: Geometry modification (Reversible action)', () => {
    it('should propose the change, classify as REVERSIBLE, and request user approval before applying', () => {
      const result = processOfflineChat([
        { role: 'user', content: 'Increase the shaft diameter to 50 mm.' }
      ], { diameter: 45, torque: 500, length: 320, force: 2500, rpm: 1450 });

      assert.strictEqual(result.operationState, 'Waiting for Approval');
      assert.ok(result.proposedChange, 'Proposed change object must be present');
      assert.strictEqual(result.proposedChange.permission, 'REVERSIBLE');
      assert.strictEqual(result.proposedChange.requiresApproval, true);
      assert.strictEqual(result.proposedChange.parameter, 'diameter');
      assert.strictEqual(result.proposedChange.proposedValue, 50);

      // Stress delta calculation explanation
      assert.ok(result.message.content.includes('⌀50 mm'));
      assert.ok(result.message.content.includes('Reversible design action'));
      assert.ok(result.message.content.includes('Approve & Apply'));
      assert.ok(result.message.content.includes('Torsional Shear Stress'));
    });
  });

  // --------------------------------------------------------------------------
  // 5. Scenario D: Material Change (Prompt 05 Section 10)
  // --------------------------------------------------------------------------
  describe('Scenario D: Material change (Reversible action)', () => {
    it('should retrieve certified material properties, show property deltas, and request approval', () => {
      const result = processOfflineChat([
        { role: 'user', content: 'Change material to 6061-T6 aluminum.' }
      ], { materialId: 'aisi-4140', diameter: 45, torque: 500 });

      assert.strictEqual(result.operationState, 'Waiting for Approval');
      assert.ok(result.proposedChange, 'Proposed change object must be present');
      assert.strictEqual(result.proposedChange.permission, 'REVERSIBLE');
      assert.strictEqual(result.proposedChange.requiresApproval, true);
      assert.strictEqual(result.proposedChange.payload.materialId, 'al-6061-t6');

      // Check metallurgical comparison table
      assert.ok(result.message.content.includes('6061-T6 Aluminum') || result.message.content.includes('6061'));
      assert.ok(result.message.content.includes('276 MPa') || result.message.content.includes('Yield Strength'));
      assert.ok(result.message.content.includes('2,700 kg/m³') || result.message.content.includes('Density'));
      assert.ok(result.message.content.includes('Approve & Apply'));
    });
  });

  // --------------------------------------------------------------------------
  // 6. Scenario E: Engineering Report Generation (Prompt 05 Section 10)
  // --------------------------------------------------------------------------
  describe('Scenario E: Engineering report generation', () => {
    it('should execute report generation tool using saved project data and distinguish assumptions from results', () => {
      const result = processOfflineChat([
        { role: 'user', content: 'Generate engineering report.' }
      ]);

      assert.strictEqual(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.includes('generate_engineering_report'));
      assert.strictEqual(result.engineeringResult.tool, 'generate_engineering_report');
      assert.strictEqual(result.engineeringResult.outputs.totalSections, 18);
      assert.ok(result.message.content.includes('18-section mechanical engineering calculation report'));
      assert.ok(result.message.content.includes('Certified Metallurgical Properties'));
    });
  });

  // --------------------------------------------------------------------------
  // 7. Scenario F: Invalid / Unsupported Request (Prompt 05 Section 10)
  // --------------------------------------------------------------------------
  describe('Scenario F: Invalid / unsupported request handling', () => {
    it('should identify unsupported domain, refuse cleanly without false success, and save no invalid state', () => {
      const result = processOfflineChat([
        { role: 'user', content: 'Run CFD aerodynamic simulation and turbulent boundary layer analysis on the shaft.' }
      ]);

      assert.strictEqual(result.operationState, 'Failed');
      assert.strictEqual(result.toolsUsed.length, 0);
      assert.ok(result.message.content.includes('Unsupported / Out-of-Scope Domains'));
      assert.ok(result.message.content.includes('Computational Fluid Dynamics (CFD)'));
      assert.ok(!result.message.content.includes('Success'));
      assert.strictEqual(result.engineeringResult, undefined);
    });
  });
});
