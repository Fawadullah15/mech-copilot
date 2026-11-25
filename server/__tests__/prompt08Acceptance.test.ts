import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.ts';
import { initDatabase } from '../db/client.ts';
import { processChatRequest } from '../services/llm.ts';
import { processOfflineChat } from '../services/providers/offlineProvider.ts';
import { getEngineeringAgent } from '../services/engineeringAgent.ts';
import { workflowOrchestrator } from '../services/workflowOrchestrator.ts';
import { documentService } from '../services/documentService.ts';
import { reportService } from '../services/reportService.ts';
import { pdfService } from '../services/pdfService.ts';
import { getProjectById, createProject } from '../services/projectService.js';
import app from '../app.ts';

describe('Prompt 08 Autonomous Engineering Workflow Acceptance Suite (Tests A-G)', () => {
  const originalProvider = env.LLM_PROVIDER;

  before(() => {
    initDatabase();
    env.LLM_PROVIDER = 'offline';
  });

  after(() => {
    env.LLM_PROVIDER = originalProvider;
  });

  // ==========================================================================
  // TEST A: Complete Autonomous Shaft Design
  // ==========================================================================
  describe('TEST A: Complete Shaft Design Workflow', () => {
    it('should understand request, execute complete 10-tool design sequence, produce CAD, drawing, and PDF report', async () => {
      const prompt = 'Design a shaft for 500 Nm torque at 1450 RPM. Use AISI 4140 and a factor of safety of 2.';
      const result = await processChatRequest([
        { role: 'user', content: prompt }
      ]);

      assert.strictEqual(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.length >= 8, `Expected at least 8 tools, got ${result.toolsUsed.length}`);
      assert.ok(result.toolsUsed.includes('create_project'), 'Includes create_project');
      assert.ok(result.toolsUsed.includes('set_torque'), 'Includes set_torque');
      assert.ok(result.toolsUsed.includes('select_material'), 'Includes select_material');
      assert.ok(result.toolsUsed.includes('calculate_required_diameter'), 'Includes calculate_required_diameter');
      assert.ok(result.toolsUsed.includes('create_shaft_geometry'), 'Includes create_shaft_geometry');
      assert.ok(result.toolsUsed.includes('run_complete_shaft_analysis'), 'Includes run_complete_shaft_analysis');
      assert.ok(result.toolsUsed.includes('generate_orthographic_drawing'), 'Includes generate_orthographic_drawing');
      assert.ok(result.toolsUsed.includes('generate_engineering_report'), 'Includes generate_engineering_report');
      assert.ok(result.toolsUsed.includes('save_project'), 'Includes save_project');

      // Verify explanation and outputs
      assert.ok(result.message.content.includes('500 N·m'), 'Mentions 500 N·m');
      assert.ok(result.message.content.includes('1450 RPM'), 'Mentions 1450 RPM');
      assert.ok(result.message.content.includes('AISI 4140'), 'Mentions AISI 4140');
      assert.ok(result.message.content.includes('Von Mises Stress'), 'Includes stress calculation');
      assert.ok(result.message.content.includes('Engineering Drawing'), 'Mentions drawing generation');
      assert.ok(result.message.content.includes('Engineering Report & PDF'), 'Mentions PDF generation');

      // Check PDF exists in artifacts/reports
      const reportsDir = path.resolve(process.cwd(), 'artifacts', 'reports');
      assert.ok(fs.existsSync(reportsDir), 'Reports directory exists');
      const files = fs.readdirSync(reportsDir).filter((f) => f.endsWith('.pdf'));
      assert.ok(files.length > 0, 'PDF report file was generated on disk');
    });
  });

  // ==========================================================================
  // TEST B: Automatic Design Correction
  // ==========================================================================
  describe('TEST B: Automatic Design Correction (FoS Optimization)', () => {
    it('should evaluate structural margin, detect deficit, size required diameter, update model, and verify pass', async () => {
      // Seed an initial undersized shaft (30 mm)
      const proj = createProject({
        name: 'Undersized Test Shaft',
        description: 'Test shaft requiring automatic diameter correction',
        parameters: { diameter: 30, length: 320, torque: 500, force: 12000, rpm: 1450, safetyFactor: 2.0, materialId: 'aisi-4140' },
      });

      const prompt = 'Check the shaft and increase its diameter if required to meet the specified design factor.';
      const result = await processChatRequest(
        [{ role: 'user', content: prompt }],
        { id: proj.id, projectId: proj.id, ...proj.parameters }
      );

      assert.strictEqual(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.includes('run_complete_shaft_analysis'), 'Analyzes initial shaft');
      assert.ok(result.toolsUsed.includes('calculate_required_diameter'), 'Calculates required diameter');
      assert.ok(result.toolsUsed.includes('set_shaft_diameter'), 'Updates diameter');
      assert.ok(result.toolsUsed.includes('regenerate_model'), 'Regenerates CAD');
      assert.ok(result.toolsUsed.includes('validate_design_results'), 'Validates revised FoS');

      // Verify updated project in database
      const updatedProj = getProjectById(proj.id);
      assert.ok(updatedProj, 'Project exists');
      assert.ok(updatedProj.parameters.diameter > 30, `Diameter increased from 30 mm to ${updatedProj.parameters.diameter} mm`);
      assert.strictEqual(result.action?.type, 'parameters_updated');
      assert.ok(result.message.content.includes('Automatic Engineering Design Correction Applied'));
    });
  });

  // ==========================================================================
  // TEST C: Drawing Generation
  // ==========================================================================
  describe('TEST C: Drawing Generation & Validation', () => {
    it('should generate ISO 5457 drawing views, validate dimensions, and export SVG & PDF formats', async () => {
      const prompt = 'Generate the complete engineering drawing.';
      const result = await processChatRequest([{ role: 'user', content: prompt }]);

      assert.strictEqual(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.includes('generate_orthographic_drawing'));
      assert.ok(result.toolsUsed.includes('validate_drawing_dimensions'));
      assert.ok(result.toolsUsed.includes('export_drawing'));

      assert.strictEqual(result.action?.type, 'drawing_generated');
      assert.strictEqual(result.action?.sheetSize, 'A3');
      assert.strictEqual(result.action?.projection, 'first-angle');
      assert.ok(result.message.content.includes('Front Elevation'));
      assert.ok(result.message.content.includes('Section A-A'));
      assert.ok(result.message.content.includes('Isometric View'));
      assert.ok(result.message.content.includes('Dimensional Closure'));
    });
  });

  // ==========================================================================
  // TEST D: Complete Engineering Report
  // ==========================================================================
  describe('TEST D: Complete Engineering Report & PDF Export', () => {
    it('should compile formal 10-section report, generate certified PDF, and return download link', async () => {
      const prompt = 'Generate the final engineering report with all calculations and drawings.';
      const result = await processChatRequest([{ role: 'user', content: prompt }]);

      assert.strictEqual(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.includes('generate_engineering_report'));
      assert.ok(result.toolsUsed.includes('export_pdf_report'));

      assert.strictEqual(result.action?.type, 'report_generated');
      assert.ok(result.action?.pdfDownloadUrl?.includes('/api/projects/'));
      assert.ok(result.message.content.includes('10-section mechanical engineering audit report'));
      assert.ok(result.message.content.includes('Download Engineering Report PDF'));
    });
  });

  // ==========================================================================
  // TEST E: Printing
  // ==========================================================================
  describe('TEST E: Real Printing Pipeline & Truthful Reporting', () => {
    it('should prepare print sheet, trigger browser print dialog, and report truthful physical limits', async () => {
      const prompt = 'Print the engineering report.';
      const result = await processChatRequest([{ role: 'user', content: prompt }]);

      assert.strictEqual(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.includes('generate_engineering_report'));
      assert.ok(result.toolsUsed.includes('prepare_print_document'));

      assert.strictEqual(result.action?.type, 'print_dialog_requested');
      assert.ok(result.message.content.includes('Report Generated'));
      assert.ok(result.message.content.includes('PDF Document Exported'));
      assert.ok(result.message.content.includes('Browser Print Dialog'));
      assert.ok(result.message.content.includes('Physical Print Truth'));
    });
  });

  // ==========================================================================
  // TEST F: Design Revision & Document Consistency
  // ==========================================================================
  describe('TEST F: Design Revision & Document Consistency (Phase 9)', () => {
    it('should update diameter to 50 mm, mark previous documents as OUTDATED, regenerate outputs, and save new version', async () => {
      const proj = createProject({
        name: 'Revision Lifecycle Test Shaft',
        description: 'Test shaft for non-destructive version delta tracking',
        parameters: { diameter: 45, length: 320, torque: 500, force: 2500, rpm: 1450, safetyFactor: 2.0, materialId: 'aisi-4140' },
      });

      // 1. Initial report to establish document records
      reportService.generateAndSaveReportDocuments(proj.id);
      const initialDocs = documentService.getDocumentsByProject(proj.id);
      assert.ok(initialDocs.length > 0, 'Initial documents registered');
      assert.strictEqual(initialDocs[0].isStale, false, 'Initial document is fresh');

      // 2. Request revision
      const prompt = 'Change the shaft diameter to 50 mm and regenerate all outputs.';
      const result = await processChatRequest(
        [{ role: 'user', content: prompt }],
        { id: proj.id, projectId: proj.id, ...proj.parameters }
      );

      assert.strictEqual(result.operationState, 'Completed');
      assert.ok(result.toolsUsed.includes('set_shaft_diameter'));
      assert.ok(result.toolsUsed.includes('regenerate_model'));
      assert.ok(result.toolsUsed.includes('run_complete_shaft_analysis'));
      assert.ok(result.toolsUsed.includes('generate_orthographic_drawing'));
      assert.ok(result.toolsUsed.includes('generate_engineering_report'));
      assert.ok(result.toolsUsed.includes('save_project'));

      // Verify parameter update in DB
      const updatedProj = getProjectById(proj.id);
      assert.strictEqual(updatedProj.parameters.diameter, 50);

      // Verify document stale marking and new documents
      const allDocs = documentService.getDocumentsByProject(proj.id);
      const staleDocs = allDocs.filter((d) => d.isStale);
      const freshDocs = allDocs.filter((d) => !d.isStale);
      assert.ok(staleDocs.length > 0, 'Prior documents marked stale (OUTDATED)');
      assert.ok(freshDocs.length > 0, 'New documents generated as CURRENT');
    });
  });

  // ==========================================================================
  // TEST G: Failure Recovery
  // ==========================================================================
  describe('TEST G: Graceful Failure Recovery', () => {
    it('should halt safely on pipeline failure, preserve SQLite project parameters, and report no false completion', async () => {
      const proj = createProject({
        name: 'Pre-Failure Safe Shaft',
        description: 'Project verifying state preservation under forced pipeline failure',
        parameters: { diameter: 45, length: 320, torque: 500, force: 2500, rpm: 1450, safetyFactor: 2.0, materialId: 'aisi-4140' },
      });

      const prompt = 'Force a report generation failure to verify pipeline recovery.';
      const result = await processChatRequest(
        [{ role: 'user', content: prompt }],
        { id: proj.id, projectId: proj.id, ...proj.parameters }
      );

      assert.strictEqual(result.operationState, 'Failed');
      assert.ok(result.message.content.includes('Engineering Workflow Failure Detected'));
      assert.ok(result.message.content.includes('Project State Preserved'));
      assert.ok(result.message.content.includes('No False Completion'));

      // Confirm SQLite project remains completely uncorrupted
      const preservedProj = getProjectById(proj.id);
      assert.strictEqual(preservedProj.parameters.diameter, 45);
      assert.strictEqual(preservedProj.parameters.torque, 500);
    });
  });

  // ==========================================================================
  // Section 8: Workflow Orchestrator & State Machine
  // ==========================================================================
  describe('Workflow Orchestrator State Machine & Persistence', () => {
    it('should create workflow in Planning state, execute dependent steps, and reach Completed state', async () => {
      const proj = createProject({
        name: 'State Machine Test Shaft',
        description: 'Workflow execution test project',
        parameters: { diameter: 45, length: 320, torque: 500, force: 2500, rpm: 1450, safetyFactor: 2.0, materialId: 'aisi-4140' },
      });

      const agent = getEngineeringAgent({ projectId: proj.id });
      const wf = workflowOrchestrator.planShaftDesignWorkflow(proj.id, 'Design a shaft', {
        torqueNm: 500,
        rpm: 1450,
        safetyFactor: 2.0,
      });

      assert.strictEqual(wf.state, 'Created');
      assert.ok(wf.plannedOperations.length >= 8);

      const execResult = await workflowOrchestrator.executeAutonomousWorkflow(wf.id, agent);
      assert.strictEqual(execResult.workflow.state, 'Completed');
      assert.ok(execResult.workflow.executedTools.length >= 8);
      assert.ok(execResult.workflow.outputReferences.reportPdfPath);

      // Verify persistence in SQLite
      const retrievedWf = workflowOrchestrator.getWorkflow(wf.id);
      assert.ok(retrievedWf);
      assert.strictEqual(retrievedWf.state, 'Completed');
    });

    it('should support safe resumption of an interrupted workflow', async () => {
      const proj = createProject({
        name: 'Resumption Test Shaft',
        description: 'Workflow resumption test project',
        parameters: { diameter: 45, length: 320, torque: 500, force: 2500, rpm: 1450, safetyFactor: 2.0, materialId: 'aisi-4140' },
      });

      const agent = getEngineeringAgent({ projectId: proj.id });
      const wf = workflowOrchestrator.planShaftDesignWorkflow(proj.id, 'Design shaft for 500 Nm', {
        torqueNm: 500,
        rpm: 1450,
      });

      // Simulate interruption by marking a step failed
      wf.plannedOperations[3].status = 'failed';
      wf.plannedOperations[3].error = 'Simulated network timeout during geometry compilation';
      workflowOrchestrator.updateWorkflow(wf.id, {
        state: 'Failed',
        plannedOperations: wf.plannedOperations,
      });

      // Resume workflow
      const resumed = await workflowOrchestrator.resumeWorkflow(wf.id, agent);
      assert.strictEqual(resumed.workflow.state, 'Completed');
      assert.ok(resumed.workflow.recoveryAttempts >= 1);
    });
  });

  // ==========================================================================
  // Section 9: PDF Service & Document Binary Generation
  // ==========================================================================
  describe('PDF Service & Document Binary Spec', () => {
    it('should generate valid standard-compliant PDF-1.4 file with correct magic bytes and sections', () => {
      const reportData = reportService.compileProjectReport('proj-default');
      const { buffer, hash } = pdfService.generateReportPdfBuffer(reportData);

      assert.ok(buffer.length > 5000, `Buffer size (${buffer.length} bytes) should be substantial`);
      const header = buffer.subarray(0, 8).toString('latin1');
      assert.ok(header.startsWith('%PDF-1.4'), 'Starts with %PDF-1.4');
      assert.ok(hash.length === 64, 'Has valid SHA-256 hash');
    });
  });
});
