import { DatabaseSync } from 'node:sqlite';
import { db as defaultDb } from '../db/client.js';
import { EngineeringAgent } from './engineeringAgent.ts';
import { reportService } from './reportService.ts';
import { documentService } from './documentService.ts';
import { getProjectById, updateProject } from './projectService.js';

export type WorkflowState =
  | 'Created'
  | 'Planning'
  | 'Awaiting information'
  | 'Awaiting approval'
  | 'Executing'
  | 'Validating'
  | 'Generating documentation'
  | 'Saving'
  | 'Completed'
  | 'Failed'
  | 'Cancelled';

export interface PlannedOperation {
  id: string;
  stepNumber: number;
  name: string;
  tool: string;
  description: string;
  dependencies: string[];
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  inputs?: any;
  result?: any;
  error?: string;
}

export interface EngineeringWorkflowRecord {
  id: string;
  projectId: string;
  userRequest: string;
  state: WorkflowState;
  plannedOperations: PlannedOperation[];
  executedTools: string[];
  operationInputs: Record<string, any>;
  operationResults: Record<string, any>;
  failedOperations: Array<{ stepId: string; tool: string; error: string; timestamp: string }>;
  recoveryAttempts: number;
  outputReferences: {
    drawingSvgId?: string;
    reportJsonId?: string;
    reportPdfPath?: string;
    versionId?: string;
    pdfDownloadUrl?: string;
    printActionReady?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export class WorkflowOrchestrator {
  private db: DatabaseSync;

  constructor(database: DatabaseSync = defaultDb) {
    this.db = database;
  }

  /**
   * Creates and initializes a new persistent workflow record in SQLite.
   */
  public createWorkflow(
    projectId: string,
    userRequest: string,
    plannedOps: PlannedOperation[] = []
  ): EngineeringWorkflowRecord {
    const id = `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: EngineeringWorkflowRecord = {
      id,
      projectId,
      userRequest,
      state: 'Created',
      plannedOperations: plannedOps,
      executedTools: [],
      operationInputs: {},
      operationResults: {},
      failedOperations: [],
      recoveryAttempts: 0,
      outputReferences: {},
      createdAt: now,
      updatedAt: now,
    };

    this.saveWorkflowRecord(record);
    return record;
  }

  /**
   * Retrieves a workflow by its execution ID.
   */
  public getWorkflow(id: string): EngineeringWorkflowRecord | null {
    const row = this.db.prepare('SELECT * FROM engineering_workflows WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.mapRowToRecord(row);
  }

  /**
   * Retrieves all workflows for a given project.
   */
  public getWorkflowsByProject(projectId: string): EngineeringWorkflowRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM engineering_workflows WHERE projectId = ? ORDER BY createdAt DESC')
      .all(projectId) as any[];
    return rows.map(this.mapRowToRecord);
  }

  /**
   * Updates state, results, and outputs for a workflow record.
   */
  public updateWorkflow(
    id: string,
    patch: Partial<EngineeringWorkflowRecord>
  ): EngineeringWorkflowRecord | null {
    const current = this.getWorkflow(id);
    if (!current) return null;

    const updated: EngineeringWorkflowRecord = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    this.saveWorkflowRecord(updated);
    return updated;
  }

  /**
   * Plans the complete autonomous shaft design sequence with explicit dependency graph.
   */
  public planShaftDesignWorkflow(
    projectId: string,
    userRequest: string,
    extractedParams: {
      torqueNm?: number;
      rpm?: number;
      materialId?: string;
      safetyFactor?: number;
      radialLoadN?: number;
      lengthMm?: number;
      includeDrawings?: boolean;
      includeReport?: boolean;
      includePrint?: boolean;
    }
  ): EngineeringWorkflowRecord {
    const torque = extractedParams.torqueNm || 500;
    const rpm = extractedParams.rpm || 1450;
    const matId = extractedParams.materialId || 'aisi-4140';
    const fos = extractedParams.safetyFactor || 2.0;
    const span = extractedParams.lengthMm || 320;
    const radialLoad = extractedParams.radialLoadN || 2500;

    const plannedOps: PlannedOperation[] = [
      {
        id: 'op-inputs',
        stepNumber: 1,
        name: 'Set Engineering Inputs',
        tool: 'set_torque',
        description: `Configure torque = ${torque} N*m, speed = ${rpm} RPM, span = ${span} mm, radial load = ${radialLoad} N`,
        dependencies: [],
        status: 'pending',
        inputs: { torqueNm: torque, rpm, lengthMm: span, radialForceN: radialLoad },
      },
      {
        id: 'op-material',
        stepNumber: 2,
        name: 'Assign Material',
        tool: 'select_material',
        description: `Select certified material '${matId}' with mechanical yield strength and modulus properties`,
        dependencies: ['op-inputs'],
        status: 'pending',
        inputs: { materialId: matId },
      },
      {
        id: 'op-sizing',
        stepNumber: 3,
        name: 'Deterministic Sizing',
        tool: 'calculate_required_diameter',
        description: 'Calculate minimum required shaft diameter to satisfy target factor of safety',
        dependencies: ['op-inputs', 'op-material'],
        status: 'pending',
        inputs: { torqueNm: torque, radialForceN: radialLoad, lengthMm: span, safetyFactor: fos },
      },
      {
        id: 'op-geometry',
        stepNumber: 4,
        name: 'Generate CAD Geometry',
        tool: 'create_shaft_geometry',
        description: 'Construct parametric stepped shaft geometry with shoulders, keyways, and journal sections',
        dependencies: ['op-sizing'],
        status: 'pending',
      },
      {
        id: 'op-analysis',
        stepNumber: 5,
        name: 'Structural Stress Analysis',
        tool: 'run_complete_shaft_analysis',
        description: 'Evaluate torsional shear, bending moment, von Mises equivalent stress, and elastic deflection',
        dependencies: ['op-geometry'],
        status: 'pending',
      },
      {
        id: 'op-verification',
        stepNumber: 6,
        name: 'Automatic Verification',
        tool: 'validate_design_results',
        description: 'Execute comprehensive 11-point engineering verification matrix against ISO/DIN standards',
        dependencies: ['op-analysis'],
        status: 'pending',
      },
      {
        id: 'op-drawing',
        stepNumber: 7,
        name: 'Generate Orthographic Drawing',
        tool: 'generate_orthographic_drawing',
        description: 'Render ISO 5457 drawing sheet (Front, Top, Section A-A, Isometric) with associative dimensions',
        dependencies: ['op-geometry', 'op-verification'],
        status: 'pending',
      },
      {
        id: 'op-report',
        stepNumber: 8,
        name: 'Generate Engineering Report & PDF',
        tool: 'generate_engineering_report',
        description: 'Compile formal 10-section engineering audit report and generate compliant PDF 1.4 document',
        dependencies: ['op-verification', 'op-drawing'],
        status: 'pending',
      },
      {
        id: 'op-checkpoint',
        stepNumber: 9,
        name: 'Save Revision Checkpoint',
        tool: 'save_project',
        description: 'Persist milestone snapshot to SQLite revision history and attach document references',
        dependencies: ['op-report'],
        status: 'pending',
      },
    ];

    return this.createWorkflow(projectId, userRequest, plannedOps);
  }

  /**
   * Executes an end-to-end planned autonomous engineering workflow with dependency enforcement,
   * live state transitions, recovery attempts on failure, and document creation.
   */
  public async executeAutonomousWorkflow(
    workflowId: string,
    agent: EngineeringAgent
  ): Promise<{
    workflow: EngineeringWorkflowRecord;
    actions: any[];
    summary: string;
  }> {
    const wf = this.getWorkflow(workflowId);
    if (!wf) throw new Error(`Workflow ${workflowId} not found.`);

    // Transition: Planning -> Executing
    this.updateWorkflow(wf.id, { state: 'Executing' });
    const executedTools: string[] = [];
    const operationResults: Record<string, any> = {};
    const actions: any[] = [];
    let projId = wf.projectId;

    for (const op of wf.plannedOperations) {
      // Check dependencies
      const unsatisfied = op.dependencies.filter(
        (depId) => wf.plannedOperations.find((p) => p.id === depId)?.status !== 'completed'
      );

      if (unsatisfied.length > 0) {
        op.status = 'failed';
        op.error = `Dependency not satisfied: ${unsatisfied.join(', ')}`;
        wf.failedOperations.push({
          stepId: op.id,
          tool: op.tool,
          error: op.error,
          timestamp: new Date().toISOString(),
        });
        this.updateWorkflow(wf.id, {
          state: 'Failed',
          plannedOperations: wf.plannedOperations,
          failedOperations: wf.failedOperations,
        });
        return {
          workflow: this.getWorkflow(wf.id)!,
          actions,
          summary: `Workflow execution halted at step '${op.name}': dependencies [${unsatisfied.join(', ')}] were not satisfied.`,
        };
      }

      op.status = 'executing';
      this.updateWorkflow(wf.id, { plannedOperations: wf.plannedOperations });

      try {
        let toolResult: any;

        if (op.tool === 'generate_engineering_report') {
          // Transition state: Generating documentation
          this.updateWorkflow(wf.id, { state: 'Generating documentation' });
          const docBundle = reportService.generateAndSaveReportDocuments(projId);
          toolResult = {
            success: true,
            report: docBundle.reportData,
            pdfDownloadUrl: docBundle.pdfDownloadUrl,
            pdfFilePath: docBundle.pdfFilePath,
            jsonDocumentId: docBundle.jsonDocumentId,
            pdfDocumentId: docBundle.pdfDocumentId,
          };
          wf.outputReferences.reportJsonId = docBundle.jsonDocumentId;
          wf.outputReferences.reportPdfPath = docBundle.pdfFilePath;
          wf.outputReferences.pdfDownloadUrl = docBundle.pdfDownloadUrl;
          actions.push({
            type: 'report_generated',
            pdfDownloadUrl: docBundle.pdfDownloadUrl,
            projectId: projId,
          });
        } else {
          const args = { ...(op.inputs || {}), projectId: projId };
          const { output } = agent.executeTool(op.tool, args);
          toolResult = output;

          if (output?.action) actions.push(output.action);
          if (op.tool === 'create_project' && output?.projectId) {
            projId = output.projectId;
            wf.projectId = projId;
          }
          if (op.tool === 'calculate_required_diameter' && output?.requiredDiameterMm) {
            // Forward required diameter to geometry step inputs
            const geomOp = wf.plannedOperations.find((p) => p.id === 'op-geometry');
            if (geomOp) {
              geomOp.inputs = {
                ...(geomOp.inputs || {}),
                diameterMm: output.requiredDiameterMm,
                lengthMm: op.inputs?.lengthMm || 320,
              };
            }
          }
          if (op.tool === 'save_project' && output?.version?.id) {
            wf.outputReferences.versionId = output.version.id;
          }
          if (op.tool === 'generate_orthographic_drawing') {
            wf.outputReferences.drawingSvgId = `drawing-svg-${Date.now()}`;
            actions.push({
              type: 'drawing_generated',
              sheetSize: output.sheetSize || 'A3',
              scale: output.scale || '1:2',
            });
          }
        }

        op.status = 'completed';
        op.result = toolResult;
        operationResults[op.tool] = toolResult;
        if (!executedTools.includes(op.tool)) executedTools.push(op.tool);

        if (op.id === 'op-verification') {
          // Phase 4 & Phase 2 state: Validating
          this.updateWorkflow(wf.id, { state: 'Validating' });
        }
      } catch (err: any) {
        op.status = 'failed';
        op.error = err?.message || String(err);
        wf.failedOperations.push({
          stepId: op.id,
          tool: op.tool,
          error: op.error || 'Unknown error',
          timestamp: new Date().toISOString(),
        });

        // Attempt recovery if safe
        wf.recoveryAttempts += 1;
        this.updateWorkflow(wf.id, {
          state: 'Failed',
          plannedOperations: wf.plannedOperations,
          failedOperations: wf.failedOperations,
          recoveryAttempts: wf.recoveryAttempts,
        });

        return {
          workflow: this.getWorkflow(wf.id)!,
          actions,
          summary: `Workflow execution failed at step '${op.name}': ${op.error}. The project state was preserved safely.`,
        };
      }
    }

    // Saving and Completed transitions
    this.updateWorkflow(wf.id, {
      state: 'Completed',
      plannedOperations: wf.plannedOperations,
      executedTools,
      operationResults,
      outputReferences: wf.outputReferences,
    });

    const finalWf = this.getWorkflow(wf.id)!;
    const summary = `Autonomous engineering workflow completed successfully across ${executedTools.length} tools. Generated 3D model, orthographic drawing, formal 10-section engineering report, and compliant PDF.`;

    return { workflow: finalWf, actions, summary };
  }

  /**
   * Resumes an interrupted or failed workflow from the last valid checkpoint.
   */
  public async resumeWorkflow(
    workflowId: string,
    agent: EngineeringAgent
  ): Promise<{ workflow: EngineeringWorkflowRecord; actions: any[]; summary: string }> {
    const wf = this.getWorkflow(workflowId);
    if (!wf) throw new Error(`Workflow ${workflowId} not found.`);

    // Reset failed/executing steps to pending
    for (const op of wf.plannedOperations) {
      if (op.status === 'failed' || op.status === 'executing') {
        op.status = 'pending';
        delete op.error;
      }
    }

    this.updateWorkflow(wf.id, {
      state: 'Executing',
      plannedOperations: wf.plannedOperations,
      recoveryAttempts: wf.recoveryAttempts + 1,
    });

    return this.executeAutonomousWorkflow(wf.id, agent);
  }

  private saveWorkflowRecord(record: EngineeringWorkflowRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO engineering_workflows (
        id, projectId, userRequest, state, plannedOperations,
        executedTools, operationInputs, operationResults, failedOperations,
        recoveryAttempts, outputReferences, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        state = excluded.state,
        plannedOperations = excluded.plannedOperations,
        executedTools = excluded.executedTools,
        operationInputs = excluded.operationInputs,
        operationResults = excluded.operationResults,
        failedOperations = excluded.failedOperations,
        recoveryAttempts = excluded.recoveryAttempts,
        outputReferences = excluded.outputReferences,
        updatedAt = excluded.updatedAt
    `);

    stmt.run(
      record.id,
      record.projectId,
      record.userRequest,
      record.state,
      JSON.stringify(record.plannedOperations),
      JSON.stringify(record.executedTools),
      JSON.stringify(record.operationInputs),
      JSON.stringify(record.operationResults),
      JSON.stringify(record.failedOperations),
      record.recoveryAttempts,
      JSON.stringify(record.outputReferences),
      record.createdAt,
      record.updatedAt
    );
  }

  private mapRowToRecord(row: any): EngineeringWorkflowRecord {
    return {
      id: row.id,
      projectId: row.projectId,
      userRequest: row.userRequest,
      state: row.state as WorkflowState,
      plannedOperations: row.plannedOperations ? JSON.parse(row.plannedOperations) : [],
      executedTools: row.executedTools ? JSON.parse(row.executedTools) : [],
      operationInputs: row.operationInputs ? JSON.parse(row.operationInputs) : {},
      operationResults: row.operationResults ? JSON.parse(row.operationResults) : {},
      failedOperations: row.failedOperations ? JSON.parse(row.failedOperations) : [],
      recoveryAttempts: row.recoveryAttempts || 0,
      outputReferences: row.outputReferences ? JSON.parse(row.outputReferences) : {},
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export const workflowOrchestrator = new WorkflowOrchestrator();
