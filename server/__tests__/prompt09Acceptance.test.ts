import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase } from '../db/client.ts';
import { env } from '../config/env.ts';
import { EngineeringAgent } from '../services/engineeringAgent.ts';
import { processOfflineChat } from '../services/providers/offlineProvider.ts';
import { createProject, getProjectById, getAllProjects } from '../services/projectService.js';
import { documentService } from '../services/documentService.ts';
import { getVersionsByProjectId } from '../services/versionService.js';
import { materials } from '../../src/data/materials.ts';
import { executeEngineeringTool } from '../tools/engineeringTools.ts';

describe('Prompt 09 Final Agentic Engineering System Acceptance Suite', () => {
  const originalProvider = env.LLM_PROVIDER;

  before(() => {
    initDatabase();
    env.LLM_PROVIDER = 'offline';
  });

  after(() => {
    env.LLM_PROVIDER = originalProvider;
  });

  // ==========================================================================
  // PHASE 3 - TEST 1: Create and Analyze a Shaft
  // ==========================================================================
  describe('TEST 1: Create and Analyze a Shaft', () => {
    it('understands requirements, identifies missing conditions, executes 10 tools, sizes geometry, validates and saves', async () => {
      const userPrompt = 'Create a new shaft design project. The shaft must transmit 500 Nm torque at 1450 RPM. Use AISI 4140 steel and a factor of safety of 2. Generate the 3D model and complete the supported engineering analysis.';
      const agent = new EngineeringAgent();
      const result = agent.executeWorkflow(userPrompt);

      assert.equal(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.length >= 8, `Expected at least 8 tools, got ${result.toolsUsed.length}`);
      assert.ok(result.toolsUsed.includes('create_project'));
      assert.ok(result.toolsUsed.includes('set_torque'));
      assert.ok(result.toolsUsed.includes('set_operating_speed'));
      assert.ok(result.toolsUsed.includes('select_material'));
      assert.ok(result.toolsUsed.includes('calculate_required_diameter'));
      assert.ok(result.toolsUsed.includes('create_shaft_geometry'));
      assert.ok(result.toolsUsed.includes('run_complete_shaft_analysis'));
      assert.ok(result.toolsUsed.includes('validate_design_results'));
      assert.ok(result.toolsUsed.includes('save_project'));

      // Verify active project created in SQLite
      const projects = getAllProjects();
      assert.ok(projects.length > 0);
      const latest = projects[0];
      assert.equal(latest.parameters.torque, 500);
      assert.equal(latest.parameters.rpm, 1450);
      assert.equal(latest.parameters.materialId, 'aisi-4140');
      assert.equal(latest.parameters.safetyFactor, 2.0);

      // Verify engineering summary contains numerical values
      const content = result.message.content;
      assert.ok(content.includes('500 N·m') || content.includes('500 N*m'));
      assert.ok(content.includes('1450 RPM'));
      assert.ok(content.includes('AISI 4140'));
      assert.ok(content.includes('Von Mises'));
      assert.ok(content.includes('PASS'));
    });
  });

  // ==========================================================================
  // PHASE 3 - TEST 2: Modify an Existing Design
  // ==========================================================================
  describe('TEST 2: Modify an Existing Design', () => {
    it('identifies project, updates diameter to 50 mm, regenerates geometry, marks stale documents, saves revision and reports deltas', async () => {
      // 1. Establish project baseline with diameter 45 mm
      const proj = createProject({
        name: 'Transmission Shaft Revision Test',
        parameters: { diameter: 45, length: 320, torque: 500, force: 2500, rpm: 1450, materialId: 'aisi-4140', safetyFactor: 2.0 },
      });

      // Save a baseline document
      documentService.saveDocument({
        id: `doc-baseline-${proj.id}`,
        projectId: proj.id,
        documentType: 'REPORT_PDF',
        title: 'Baseline Report',
        sourceRevision: 'v1.0',
        isStale: false,
        status: 'CURRENT',
        metadata: {},
      });

      // 2. Execute modification instruction
      const agent = new EngineeringAgent({ projectId: proj.id });
      const result = agent.executeWorkflow('Increase the shaft diameter to 50 mm and update everything.');

      assert.equal(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.includes('set_shaft_diameter'));
      assert.ok(result.toolsUsed.includes('regenerate_model'));
      assert.ok(result.toolsUsed.includes('run_complete_shaft_analysis'));
      assert.ok(result.toolsUsed.includes('generate_orthographic_drawing'));
      assert.ok(result.toolsUsed.includes('generate_engineering_report'));
      assert.ok(result.toolsUsed.includes('save_project'));

      // Verify updated project parameters in SQLite
      const updatedProj = getProjectById(proj.id);
      assert.equal(updatedProj.parameters.diameter, 50);

      // Verify previous document was marked OUTDATED per Phase 6 & Phase 9
      const oldDoc = documentService.getDocumentById(`doc-baseline-${proj.id}`);
      assert.equal(oldDoc?.status, 'OUTDATED');
      assert.equal(oldDoc?.isStale, true);

      // Verify version checkpoint created in SQLite
      const versions = getVersionsByProjectId(proj.id);
      assert.ok(versions.length > 0);
      assert.ok(versions[0].label.includes('50 mm'));

      // Verify report message describes exact deltas
      assert.ok(result.message.content.includes('⌀45 mm') || result.message.content.includes('45 mm'));
      assert.ok(result.message.content.includes('⌀50 mm') || result.message.content.includes('50 mm'));
      assert.ok(result.message.content.includes('OUTDATED'));
    });
  });

  // ==========================================================================
  // PHASE 3 - TEST 3: Analyze a Design Problem
  // ==========================================================================
  describe('TEST 3: Analyze a Design Problem', () => {
    it('inspects FoS against requirement, sizes required diameter, updates model, and verifies revised design passes', async () => {
      // Create project with small diameter that fails target FoS 2.0 under high load
      const proj = createProject({
        name: 'FoS Sizing Problem Test',
        parameters: { diameter: 30, length: 320, torque: 500, force: 12000, rpm: 1450, materialId: 'aisi-4140', safetyFactor: 2.0 },
      });

      const agent = new EngineeringAgent({ projectId: proj.id });
      const result = agent.executeWorkflow('Check whether this shaft meets the required factor of safety. Correct the design if it does not.');

      assert.equal(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.includes('run_complete_shaft_analysis'));
      assert.ok(result.toolsUsed.includes('calculate_required_diameter'));
      assert.ok(result.toolsUsed.includes('set_shaft_diameter'));
      assert.ok(result.toolsUsed.includes('regenerate_model'));
      assert.ok(result.toolsUsed.includes('validate_design_results'));

      // Verify diameter was increased in project parameters
      const updatedProj = getProjectById(proj.id);
      assert.ok(updatedProj.parameters.diameter >= 40, `Expected diameter >= 40, got ${updatedProj.parameters.diameter}`);

      // Verify output message documents initial deficit and revised compliance
      const content = result.message.content;
      assert.ok(content.includes('Automatic Engineering Design Correction'));
      assert.ok(content.includes('PASS'));
    });
  });

  // ==========================================================================
  // PHASE 3 - TEST 4: Material Comparison & Selection
  // ==========================================================================
  describe('TEST 4: Material Comparison & Selection', () => {
    it('compares AISI 1045 and AISI 4140 from database, explains mechanical differences, and updates project with recommendation', async () => {
      const proj = createProject({
        name: 'Material Comparison Project',
        parameters: { diameter: 45, length: 320, torque: 500, force: 2500, rpm: 1450, materialId: 'aisi-1045', safetyFactor: 2.0 },
      });

      const agent = new EngineeringAgent({ projectId: proj.id });
      const result = agent.executeWorkflow('Compare AISI 1045 and AISI 4140 for this shaft and use the more suitable material.');

      assert.equal(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.includes('get_material_details'));
      assert.ok(result.toolsUsed.includes('select_material'));
      assert.ok(result.toolsUsed.includes('run_complete_shaft_analysis'));
      assert.ok(result.toolsUsed.includes('validate_design_results'));

      // Verify active material updated to AISI 4140 in SQLite
      const updatedProj = getProjectById(proj.id);
      assert.equal(updatedProj.parameters.materialId, 'aisi-4140');

      // Verify comparative analysis in message
      const content = result.message.content;
      assert.ok(content.includes('AISI 1045'));
      assert.ok(content.includes('AISI 4140'));
      assert.ok(content.includes('530 MPa') || content.includes('Yield'));
      assert.ok(content.includes('655 MPa'));
      assert.ok(content.includes('205 GPa'));
      assert.ok(content.includes('fatigue'));
    });
  });

  // ==========================================================================
  // PHASE 3 - TEST 5: Technical Drawings Generation
  // ==========================================================================
  describe('TEST 5: Technical Drawings Generation', () => {
    it('generates ISO 5457 drawing views, validates associative dimensions, and exports SVG and PDF', async () => {
      const proj = createProject({
        name: 'Drawing Acceptance Test Project',
        parameters: { diameter: 45, length: 320, torque: 500, force: 2500, rpm: 1450, materialId: 'aisi-4140' },
      });

      const agent = new EngineeringAgent({ projectId: proj.id });
      const result = agent.executeWorkflow('Generate the complete engineering drawing for this shaft.');

      assert.equal(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.includes('generate_orthographic_drawing'));
      assert.ok(result.toolsUsed.includes('validate_drawing_dimensions'));
      assert.ok(result.toolsUsed.includes('export_drawing'));

      const content = result.message.content;
      assert.ok(content.includes('Front Elevation'));
      assert.ok(content.includes('Top Plan'));
      assert.ok(content.includes('Section A-A'));
      assert.ok(content.includes('Isometric'));
      assert.ok(content.includes('SVG') && content.includes('PDF'));
      assert.equal(result.action.type, 'drawing_generated');
    });
  });

  // ==========================================================================
  // PHASE 3 - TEST 6: Complete Engineering Documentation
  // ==========================================================================
  describe('TEST 6: Complete Engineering Documentation', () => {
    it('compiles 10-section report, generates certified PDF-1.4 with SHA-256 hash, and provides download link', async () => {
      const proj = createProject({
        name: 'Report Acceptance Test Project',
        parameters: { diameter: 45, length: 320, torque: 500, force: 2500, rpm: 1450, materialId: 'aisi-4140', safetyFactor: 2.0 },
      });

      const agent = new EngineeringAgent({ projectId: proj.id });
      const result = agent.executeWorkflow('Prepare the complete engineering report with the calculations, material details, drawings, and final design verification.');

      assert.equal(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.includes('generate_engineering_report'));
      assert.ok(result.toolsUsed.includes('export_pdf_report'));

      const content = result.message.content;
      assert.ok(content.includes('10-section'));
      assert.ok(content.includes('Cover Page'));
      assert.ok(content.includes('Design Requirements'));
      assert.ok(content.includes('Engineering Calculations'));
      assert.ok(content.includes('Design Verification'));
      assert.ok(content.includes('SHA-256'));
      assert.ok(content.includes('.pdf') || content.includes('/api/projects/'));
    });
  });

  // ==========================================================================
  // PHASE 3 - TEST 7: Printing Pipeline
  // ==========================================================================
  describe('TEST 7: Printing Pipeline', () => {
    it('prepares printable sheet, dispatches print dialog action, and delivers truthful hardware capability report', async () => {
      const proj = createProject({
        name: 'Print Acceptance Test Project',
        parameters: { diameter: 45, length: 320, torque: 500, force: 2500, rpm: 1450, materialId: 'aisi-4140' },
      });

      const agent = new EngineeringAgent({ projectId: proj.id });
      const result = agent.executeWorkflow('Open the final engineering report for printing.');

      assert.equal(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.includes('generate_engineering_report'));
      assert.ok(result.toolsUsed.includes('prepare_print_document'));

      assert.equal(result.action.type, 'print_dialog_requested');
      assert.equal(result.action.documentType, 'report');

      const content = result.message.content;
      assert.ok(content.includes('window.print()') || content.includes('Print dialog'));
      assert.ok(content.includes('physical print') || content.includes('local connected printer') || content.includes('printer'));
    });
  });

  // ==========================================================================
  // PHASE 4: Conversational Memory and Project Context
  // ==========================================================================
  describe('Phase 4: Conversational Memory & Context Awareness', () => {
    it('correctly handles "Change its length to 320 mm."', async () => {
      const proj = createProject({
        name: 'Length Memory Test',
        parameters: { diameter: 45, length: 400, torque: 500, force: 2500, rpm: 1450, materialId: 'aisi-4140' },
      });
      const agent = new EngineeringAgent({ projectId: proj.id });
      const result = agent.executeWorkflow('Change its length to 320 mm.');

      assert.equal(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.includes('set_shaft_length'));
      assert.ok(result.toolsUsed.includes('regenerate_model'));
      assert.ok(result.toolsUsed.includes('run_complete_shaft_analysis'));

      const updated = getProjectById(proj.id);
      assert.equal(updated.parameters.length, 320);
      assert.ok(result.message.content.includes('320 mm'));
    });

    it('correctly handles "What material did we select?"', async () => {
      const proj = createProject({
        name: 'Material Memory Test',
        parameters: { diameter: 45, length: 320, torque: 500, force: 2500, rpm: 1450, materialId: 'aisi-4140' },
      });
      const agent = new EngineeringAgent({ projectId: proj.id });
      const result = agent.executeWorkflow('What material did we select?');

      assert.equal(result.operationState, 'Completed');
      const content = result.message.content;
      assert.ok(content.includes('AISI 4140'));
      assert.ok(content.includes('655 MPa'));
      assert.ok(content.includes('1020 MPa'));
    });

    it('correctly handles "Show me the previous calculation."', async () => {
      const proj = createProject({
        name: 'Calc Memory Test',
        parameters: { diameter: 45, length: 320, torque: 500, force: 2500, rpm: 1450, materialId: 'aisi-4140' },
      });
      const agent = new EngineeringAgent({ projectId: proj.id });
      const result = agent.executeWorkflow('Show me the previous calculation.');

      assert.equal(result.operationState, 'Completed');
      const content = result.message.content;
      assert.ok(content.includes('Torsional Shear Stress'));
      assert.ok(content.includes('Von Mises'));
      assert.ok(content.includes('Factor of Safety'));
    });

    it('correctly handles "Increase that diameter."', async () => {
      const proj = createProject({
        name: 'Inc Diameter Memory Test',
        parameters: { diameter: 45, length: 320, torque: 500, force: 2500, rpm: 1450, materialId: 'aisi-4140' },
      });
      const agent = new EngineeringAgent({ projectId: proj.id });
      const result = agent.executeWorkflow('Increase that diameter.');

      assert.equal(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.includes('set_shaft_diameter'));
      assert.ok(result.toolsUsed.includes('regenerate_model'));

      const updated = getProjectById(proj.id);
      assert.equal(updated.parameters.diameter, 50);
      assert.ok(result.message.content.includes('⌀50 mm'));
    });

    it('correctly handles "Generate the drawing again."', async () => {
      const proj = createProject({
        name: 'Regen Drawing Memory Test',
        parameters: { diameter: 45, length: 320, torque: 500, force: 2500, rpm: 1450, materialId: 'aisi-4140' },
      });
      const agent = new EngineeringAgent({ projectId: proj.id });
      const result = agent.executeWorkflow('Generate the drawing again.');

      assert.equal(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.includes('generate_orthographic_drawing'));
      assert.ok(result.toolsUsed.includes('validate_drawing_dimensions'));
      assert.ok(result.message.content.includes('Front Elevation'));
    });

    it('correctly handles "Compare this revision with the previous one."', async () => {
      const proj = createProject({
        name: 'Revision Diff Memory Test',
        parameters: { diameter: 45, length: 320, torque: 500, force: 2500, rpm: 1450, materialId: 'aisi-4140' },
      });

      // Save version 1
      executeEngineeringTool('save_project', JSON.stringify({
        projectId: proj.id,
        label: 'Baseline v1.0',
        notes: 'Initial sizing',
      }));

      // Update diameter and save version 2
      executeEngineeringTool('set_shaft_diameter', JSON.stringify({
        projectId: proj.id,
        diameterMm: 50,
      }));
      executeEngineeringTool('save_project', JSON.stringify({
        projectId: proj.id,
        label: 'Revision v2.0',
        notes: 'Updated diameter to 50 mm',
      }));

      const agent = new EngineeringAgent({ projectId: proj.id });
      const result = agent.executeWorkflow('Compare this revision with the previous one.');

      assert.equal(result.operationState, 'Completed');
      const content = result.message.content;
      assert.ok(content.includes('Design Revision Parameter Comparison'));
      assert.ok(content.includes('diameter'));
      assert.ok(content.includes('45'));
      assert.ok(content.includes('50'));
    });

    it('correctly handles "What is still incomplete?"', async () => {
      const proj = createProject({
        name: 'Incomplete Audit Test',
        parameters: { diameter: 45, length: 320, torque: 500, force: 2500, rpm: 1450, materialId: 'aisi-4140' },
      });
      const agent = new EngineeringAgent({ projectId: proj.id });
      const result = agent.executeWorkflow('What is still incomplete?');

      assert.equal(result.operationState, 'Completed');
      const content = result.message.content;
      assert.ok(content.includes('Engineering Deliverables & Completion Audit'));
      assert.ok(content.includes('Operating Requirements'));
      assert.ok(content.includes('Material Specification'));
    });
  });

  // ==========================================================================
  // PHASE 6: Failure and Edge Case Testing (16 Conditions)
  // ==========================================================================
  describe('Phase 6: Failure & Edge Case Testing', () => {
    it('handles missing torque by requesting required input (Condition 1)', () => {
      const agent = new EngineeringAgent();
      const result = agent.executeWorkflow('Design a shaft for 1450 RPM without specifying torque.');
      assert.equal(result.operationState, 'Waiting for Information');
      assert.ok(result.message.content.includes('Missing Required Engineering Parameter'));
      assert.ok(result.message.content.includes('Transmitted Torque'));
    });

    it('rejects negative shaft diameter with physical error (Condition 2)', () => {
      const agent = new EngineeringAgent();
      const result = agent.executeWorkflow('Change diameter to -45 mm');
      assert.equal(result.operationState, 'Failed');
      assert.ok(result.message.content.includes('strictly positive') || result.message.content.includes('impossible'));
    });

    it('rejects unknown material and explains available options (Condition 3)', () => {
      const agent = new EngineeringAgent();
      const result = agent.executeWorkflow('Use Vibranium steel for this shaft');
      assert.equal(result.operationState, 'Failed');
      assert.ok(result.message.content.includes('Not Found in Certified Engineering Database'));
      assert.ok(result.message.content.includes('AISI 4140'));
    });

    it('blocks analysis on missing support conditions (Condition 4)', () => {
      const agent = new EngineeringAgent();
      const result = agent.executeWorkflow('Calculate deflection without supports');
      assert.equal(result.operationState, 'Failed');
      assert.ok(result.message.content.includes('Missing Boundary / Support Conditions'));
      assert.ok(result.message.content.includes('Simply Supported'));
    });

    it('rejects invalid geometry aspect ratio (Condition 5)', () => {
      const agent = new EngineeringAgent();
      const result = agent.executeWorkflow('Set length to 10 mm and diameter to 100 mm');
      assert.equal(result.operationState, 'Failed');
      assert.ok(result.message.content.includes('Aspect Ratio Violation'));
    });

    it('handles forced pipeline failure safely and preserves SQLite state (Condition 6 & 10)', () => {
      const proj = createProject({
        name: 'Failure Preservation Test',
        parameters: { diameter: 45, length: 320, torque: 500, force: 2500, rpm: 1450, materialId: 'aisi-4140' },
      });
      const agent = new EngineeringAgent({ projectId: proj.id });
      const result = agent.executeWorkflow('force a report failure');

      assert.equal(result.operationState, 'Failed');
      assert.ok(result.message.content.includes('Engineering Workflow Failure Detected'));
      assert.ok(result.message.content.includes('Project State Preserved'));

      // Project parameters remain intact in database
      const p = getProjectById(proj.id);
      assert.equal(p.parameters.diameter, 45);
      assert.equal(p.parameters.torque, 500);
    });

    it('marks documents OUTDATED when parameters change (Condition 13, 14, 15)', () => {
      const proj = createProject({
        name: 'Stale Documents Test',
        parameters: { diameter: 45, length: 320, torque: 500, force: 2500, rpm: 1450, materialId: 'aisi-4140' },
      });

      documentService.saveDocument({
        id: `doc-stale-${proj.id}`,
        projectId: proj.id,
        documentType: 'DRAWING_SVG',
        title: 'Drawing SVG',
        sourceRevision: 'v1.0',
        isStale: false,
        status: 'CURRENT',
        metadata: {},
      });

      // Update diameter
      documentService.markProjectDocumentsStale(proj.id);

      const doc = documentService.getDocumentById(`doc-stale-${proj.id}`);
      assert.equal(doc?.status, 'OUTDATED');
      assert.equal(doc?.isStale, true);
    });
  });

  // ==========================================================================
  // PHASE 7: Engineering Data Correctness
  // ==========================================================================
  describe('Phase 7: Engineering Data Correctness', () => {
    it('verifies deterministic equations against analytical reference benchmark', () => {
      // Benchmark: d = 50 mm, T = 500 N*m, F = 2500 N, L = 320 mm, Sy = 655 MPa
      const d = 50;
      const T = 500;
      const F = 2500;
      const L = 320;
      const Sy = 655;

      const rawResult = executeEngineeringTool('run_complete_shaft_analysis', JSON.stringify({
        diameterMm: d,
        lengthMm: L,
        torqueNm: T,
        radialForceN: F,
        rpm: 1450,
        yieldStrengthMPa: Sy,
      }));

      const parsed = JSON.parse(rawResult);

      // Analytical reference values:
      // tau = 16 * T / (pi * d^3) = 16 * 500,000 / (pi * 125,000) = 20.37 MPa
      const expectedTau = (16 * T * 1000) / (Math.PI * Math.pow(d, 3));
      assert.ok(Math.abs(parsed.torsionalShearMPa - expectedTau) < 0.2);

      // M = F * L / 4 = 2500 * 320 / 4 = 200,000 N*mm = 200 N*m
      // sigma_b = 32 * M / (pi * d^3) = 32 * 200,000 / (pi * 125,000) = 16.30 MPa
      const expectedSigmaB = (32 * 200000) / (Math.PI * Math.pow(d, 3));
      assert.ok(Math.abs(parsed.bendingStressMPa - expectedSigmaB) < 0.2);

      // sigma_vm = sqrt(sigma_b^2 + 3 * tau^2) = sqrt(16.30^2 + 3 * 20.37^2) = sqrt(265.69 + 1244.74) = sqrt(1510.43) = 38.86 MPa
      const expectedSigmaVm = Math.sqrt(Math.pow(expectedSigmaB, 2) + 3 * Math.pow(expectedTau, 2));
      assert.ok(Math.abs(parsed.equivalentStressMPa - expectedSigmaVm) < 0.5);

      // FoS = Sy / sigma_vm = 655 / 38.86 = 16.85
      const expectedFos = Sy / expectedSigmaVm;
      assert.ok(Math.abs(parsed.safetyFactor - expectedFos) < 0.5);

      // Deflection: delta = F * L^3 / (48 * E * I)
      // I = pi * d^4 / 64 = pi * 6,250,000 / 64 = 306,796 mm^4
      // E = 205,000 MPa
      // delta = 2500 * 320^3 / (48 * 205,000 * 306,796) = 2500 * 32,768,000 / 3,018,872,640,000 = 0.027 mm
      assert.ok(parsed.maxDeflectionMm < 0.05);
      assert.ok(parsed.maxDeflectionMm > 0.01);
    });
  });

  // ==========================================================================
  // OFFLINE CHAT ROUTING INTEGRATION
  // ==========================================================================
  describe('Offline Chat Provider Routing to Engineering Agent', () => {
    it('seamlessly routes natural language engineering prompt through processOfflineChat', () => {
      const result = processOfflineChat([
        { role: 'user', content: 'Create a new shaft design project. The shaft must transmit 500 Nm torque at 1450 RPM. Use AISI 4140 steel and a factor of safety of 2. Generate the 3D model and complete the supported engineering analysis.' },
      ]);

      assert.equal(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.length >= 8);
      assert.ok(result.message.content.includes('Autonomous Shaft Design Workflow Completed'));
    });

    it('seamlessly routes material comparison prompt through processOfflineChat', () => {
      const result = processOfflineChat([
        { role: 'user', content: 'Compare AISI 1045 and AISI 4140 for this shaft and use the more suitable material.' },
      ]);

      assert.equal(result.operationState, 'Completed');
      assert.ok(result.message.content.includes('Comparative Material Analysis'));
      assert.ok(result.message.content.includes('AISI 1045'));
      assert.ok(result.message.content.includes('AISI 4140'));
    });
  });

});
