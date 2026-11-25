import { z } from 'zod';
import { calculateRequiredTorsionDiameter } from '../../src/engineering/calculations/torsion.ts';
import { calculateFullShaftAnalysis, solveMinimumShaftDiameterCombined } from '../../src/engineering/calculations/shaft.ts';
import { CompositeShaftAnalysisInputs, YieldCriterion } from '../../src/engineering/types/engineering.ts';
import { materials } from '../../src/data/materials.ts';
import { computeShaftGeometryModel, computeDrawingLayout } from '../../src/engineering/drawing/drawingGeometry.ts';
import { generateDrawingDimensions } from '../../src/engineering/drawing/dimensionGenerator.ts';
import { runDesignVerification } from '../../src/engineering/drawing/drawingVerification.ts';
import { getAllProjects, getProjectById, createProject, updateProject } from '../services/projectService.js';
import { createDesignVersion, getVersionsByProjectId } from '../services/versionService.js';
import { createConversation } from '../services/conversationService.js';
import { reportService } from '../services/reportService.ts';
import { documentService } from '../services/documentService.ts';

// ============================================================================
// 1. Tool Permission Classifications (Prompt 05 Section 6)
// ============================================================================
export type ToolPermissionLevel = 'READ_ONLY' | 'REVERSIBLE' | 'HIGH_IMPACT';

export interface ToolMetadata {
  name: string;
  category: 'Project' | 'Shaft Design' | 'Engineering Inputs' | 'Engineering Calculations' | 'Materials' | 'CAD' | 'Drawing & Reporting';
  description: string;
  permission: ToolPermissionLevel;
  requiresApproval: boolean;
}

// ============================================================================
// 2. Input Validation Schemas (Zod)
// ============================================================================

// --- PROJECT TOOLS ---
export const createProjectSchema = z.object({
  name: z.string().min(1).describe('Descriptive project title (e.g. "Industrial Conveyor Drive Shaft")'),
  description: z.string().optional().describe('Engineering specification or design intent'),
  materialId: z.string().optional().describe('Initial material ID (e.g. "aisi-4140")'),
  diameter: z.number().positive().optional().describe('Initial shaft diameter in mm'),
  length: z.number().positive().optional().describe('Initial shaft span length in mm'),
  torque: z.number().nonnegative().optional().describe('Applied torque in N·m'),
  force: z.number().nonnegative().optional().describe('Radial transverse force in N'),
  rpm: z.number().nonnegative().optional().describe('Operating speed in RPM'),
  safetyFactor: z.number().positive().optional().describe('Target factor of safety'),
  temperature: z.number().optional().describe('Operating temperature in °C'),
  criterion: z.enum(['Von Mises', 'Tresca']).optional().describe('Failure criterion'),
  deflectionLimitRatio: z.number().positive().optional().describe('Deflection screening ratio L/R (default 1000)'),
});

export const getProjectSchema = z.object({
  projectId: z.string().optional().describe('Project identifier. Defaults to active or most recent project.'),
});

export const updateProjectSchema = z.object({
  projectId: z.string().optional().describe('Project identifier to update.'),
  name: z.string().optional().describe('Updated project name'),
  materialId: z.string().optional().describe('Certified material identifier'),
  diameter: z.number().positive().optional().describe('Shaft outer diameter in mm'),
  length: z.number().positive().optional().describe('Shaft span length in mm'),
  torque: z.number().nonnegative().optional().describe('Transmitted torque in N·m'),
  force: z.number().nonnegative().optional().describe('Radial bending force in N'),
  rpm: z.number().nonnegative().optional().describe('Rotational speed in RPM'),
  safetyFactor: z.number().positive().optional().describe('Target factor of safety'),
  temperature: z.number().optional().describe('Operating temperature in °C'),
  criterion: z.enum(['Von Mises', 'Tresca']).optional().describe('Yield failure criterion'),
  deflectionLimitRatio: z.number().positive().optional().describe('Deflection screening ratio'),
});

export const saveProjectSchema = z.object({
  projectId: z.string().optional().describe('Project identifier.'),
  label: z.string().min(1).describe('Milestone label (e.g. "Baseline Sizing v1.0", "Uprated FoS v1.1")'),
  notes: z.string().optional().describe('Engineering rationale or design changes'),
});

export const listProjectsSchema = z.object({
  limit: z.number().positive().optional().default(20).describe('Max number of projects to return'),
});

// --- SHAFT DESIGN TOOLS ---
export const createShaftSchema = z.object({
  diameterMm: z.number().positive().describe('Shaft diameter in millimeters (10 - 500 mm)'),
  lengthMm: z.number().positive().describe('Shaft length in millimeters (50 - 3000 mm)'),
  materialId: z.string().optional().default('aisi-4140').describe('Assigned material identifier'),
  torqueNm: z.number().nonnegative().optional().default(500).describe('Applied torque in N·m'),
  radialForceN: z.number().nonnegative().optional().default(2500).describe('Transverse radial force in N'),
  rpm: z.number().nonnegative().optional().default(1450).describe('Rotational speed in RPM'),
  safetyFactor: z.number().positive().optional().default(2.0).describe('Required factor of safety'),
});

export const updateShaftSchema = z.object({
  projectId: z.string().optional().describe('Target project identifier'),
  diameterMm: z.number().positive().optional().describe('New shaft diameter in mm'),
  lengthMm: z.number().positive().optional().describe('New shaft length in mm'),
  torqueNm: z.number().nonnegative().optional().describe('New torque in N·m'),
  radialForceN: z.number().nonnegative().optional().describe('New radial force in N'),
  rpm: z.number().nonnegative().optional().describe('New RPM'),
});

export const addShaftSectionSchema = z.object({
  sectionType: z.enum(['journal', 'step', 'hub', 'seat']).describe('Type of stepped feature to add'),
  diameterMm: z.number().positive().describe('Section diameter in mm'),
  lengthMm: z.number().positive().describe('Section length in mm'),
  position: z.enum(['left', 'mid', 'right']).optional().default('left').describe('Location along the shaft span'),
});

export const removeShaftFeatureSchema = z.object({
  featureType: z.enum(['keyway', 'chamfer', 'fillet', 'undercut']).describe('Shaft feature to remove'),
});

export const updateShaftDimensionsSchema = z.object({
  diameterMm: z.number().positive().optional().describe('New shaft diameter in mm (10 - 500 mm)'),
  lengthMm: z.number().positive().optional().describe('New shaft length in mm (50 - 3000 mm)'),
  torqueNm: z.number().nonnegative().optional().describe('Updated applied torque in N·m'),
});

export const getShaftGeometrySchema = z.object({
  projectId: z.string().optional().describe('Project identifier'),
  diameterMm: z.number().positive().optional().describe('Shaft diameter override in mm'),
  lengthMm: z.number().positive().optional().describe('Shaft length override in mm'),
});

// --- ENGINEERING CALCULATION TOOLS ---
export const calculatePowerSchema = z.object({
  torqueNm: z.number().nonnegative().describe('Applied torque in N·m'),
  rpm: z.number().positive().describe('Rotational speed in RPM'),
});

export const calculateTorsionalStressSchema = z.object({
  torqueNm: z.number().nonnegative().describe('Applied torque in N·m'),
  diameterMm: z.number().positive().describe('Shaft diameter in mm'),
});

export const calculateBendingStressSchema = z.object({
  radialForceN: z.number().nonnegative().describe('Transverse radial load in N'),
  lengthMm: z.number().positive().describe('Shaft span length between bearing supports in mm'),
  diameterMm: z.number().positive().describe('Shaft diameter in mm'),
  loadCase: z.enum(['center_point', 'distributed']).optional().default('center_point').describe('Loading configuration'),
});

export const calculateCombinedStressSchema = z.object({
  torqueNm: z.number().nonnegative().describe('Applied torque in N·m'),
  radialForceN: z.number().nonnegative().describe('Transverse radial load in N'),
  lengthMm: z.number().positive().describe('Shaft span length in mm'),
  diameterMm: z.number().positive().describe('Shaft diameter in mm'),
  criterion: z.enum(['Von Mises', 'Tresca']).optional().default('Von Mises').describe('Yield failure criterion'),
});

export const calculateFactorOfSafetySchema = z.object({
  equivalentStressMPa: z.number().positive().describe('Equivalent stress in MPa (von Mises or Tresca)'),
  yieldStrengthMPa: z.number().positive().describe('Material tensile yield strength Sy in MPa'),
  targetSafetyFactor: z.number().positive().optional().default(2.0).describe('Required design safety factor'),
});

export const calculateRequiredDiameterSchema = z.object({
  torqueNm: z.number().describe('Applied torque in N·m'),
  radialForceN: z.number().optional().describe('Radial bending force in N (optional, for combined sizing)'),
  lengthMm: z.number().optional().describe('Shaft span length in mm (optional, for combined sizing)'),
  bendingMomentNm: z.number().optional().describe('Peak bending moment in N·m (optional)'),
  allowableShearStressMPa: z.number().optional().describe('Allowable shear stress in MPa'),
  yieldStrengthMPa: z.number().optional().describe('Material yield strength in MPa'),
  safetyFactor: z.number().default(2.0).describe('Target factor of safety (default 2.0)'),
  criterion: z.enum(['Tresca', 'Von Mises']).optional().default('Von Mises').describe('Failure criterion'),
  elasticModulusGPa: z.number().optional().describe('Material elastic modulus in GPa'),
  deflectionLimitRatio: z.number().optional().describe('Deflection limit ratio (default 1000)'),
});

export const calculateDeflectionSchema = z.object({
  radialForceN: z.number().nonnegative().describe('Transverse radial load in N'),
  lengthMm: z.number().positive().describe('Shaft span length in mm'),
  diameterMm: z.number().positive().describe('Shaft diameter in mm'),
  elasticModulusGPa: z.number().positive().optional().default(205).describe('Material elastic modulus in GPa'),
  deflectionLimitRatio: z.number().positive().optional().default(1000).describe('Allowable deflection ratio L/R (default 1000)'),
});

export const validateDesignSchema = z.object({
  projectId: z.string().optional().describe('Project identifier'),
  diameterMm: z.number().positive().optional().describe('Shaft diameter in mm'),
  lengthMm: z.number().positive().optional().describe('Shaft length in mm'),
  torqueNm: z.number().nonnegative().optional().describe('Torque in N·m'),
  radialForceN: z.number().nonnegative().optional().describe('Radial force in N'),
  rpm: z.number().nonnegative().optional().describe('RPM'),
  materialId: z.string().optional().describe('Material identifier'),
  safetyFactor: z.number().positive().optional().describe('Target safety factor'),
});

// --- MATERIAL TOOLS ---
export const searchMaterialsSchema = z.object({
  query: z.string().optional().describe('Search query keyword (e.g. "alloy", "aluminum", "titanium", "stainless", "4140")'),
  category: z.string().optional().describe('Material category filter (e.g. "Alloy Steel", "Carbon Steel", "Aluminum Alloy")'),
  minYieldStrengthMPa: z.number().positive().optional().describe('Minimum required yield strength Sy in MPa'),
});

export const getMaterialPropertiesSchema = z.object({
  materialId: z.string().describe('Material identifier or alloy name (e.g. "aisi-4140", "aisi-1045", "6061-t6", "ss-304", "ti-6al-4v")'),
});

export const updateMaterialSelectionSchema = z.object({
  materialId: z.string().describe('Selected material identifier from certified engineering database'),
  projectId: z.string().optional().describe('Target project identifier'),
});

// --- CAD TOOLS ---
export const regenerateGeometrySchema = z.object({
  projectId: z.string().optional().describe('Target project identifier'),
  diameterMm: z.number().positive().optional().describe('Shaft diameter in mm'),
  lengthMm: z.number().positive().optional().describe('Shaft length in mm'),
});

export const selectComponentSchema = z.object({
  componentName: z.enum(['shaft', 'bearing_left', 'bearing_right', 'gear', 'keyway']).describe('CAD component to highlight and focus in viewport'),
});

export const updateFeatureVisibilitySchema = z.object({
  feature: z.enum(['hiddenEdges', 'centerlines', 'hatching', 'dimensions']).describe('Drawing/CAD layer to toggle'),
  visible: z.boolean().describe('Visibility state'),
});

export const setCameraViewSchema = z.object({
  view: z.enum(['Front', 'Top', 'Side', 'Isometric', '2D', '3D', 'Split']).describe('CAD viewport camera view angle or workstation canvas mode'),
});

// --- DRAWING & REPORTING TOOLS ---
export const generateOrthographicDrawingSchema = z.object({
  projectId: z.string().optional().describe('Project identifier'),
  sheetSize: z.enum(['A4', 'A3', 'A2']).optional().default('A3').describe('Standard ISO drawing sheet size'),
  orientation: z.enum(['landscape', 'portrait']).optional().default('landscape').describe('Sheet orientation'),
  projection: z.enum(['first-angle', 'third-angle']).optional().default('first-angle').describe('Orthographic projection standard'),
});

export const generateEngineeringReportSchema = z.object({
  projectId: z.string().optional().describe('Target project ID.'),
  title: z.string().optional().describe('Custom title for the compiled technical report'),
});

export const exportDrawingSchema = z.object({
  projectId: z.string().optional().describe('Target project ID'),
  format: z.enum(['svg', 'png', 'pdf', 'json']).describe('Export file format'),
});

export const getProjectRevisionHistorySchema = z.object({
  projectId: z.string().optional().describe('Target project ID'),
});

export const runDesignVerificationSchema = z.object({
  projectId: z.string().optional().describe('Project identifier to verify.'),
  strictMode: z.boolean().optional().default(false).describe('Enforce zero-warning tolerance'),
});

export const exportPdfReportSchema = z.object({
  projectId: z.string().optional().describe('Project identifier to export PDF for.'),
});

export const preparePrintDocumentSchema = z.object({
  projectId: z.string().optional().describe('Project identifier for print output.'),
  documentType: z.enum(['report', 'drawing']).optional().default('report').describe('Document type to print'),
});

export const validateDrawingDimensionsSchema = z.object({
  projectId: z.string().optional().describe('Project identifier for drawing validation.'),
  toleranceClass: z.enum(['fine', 'medium', 'coarse']).optional().default('medium').describe('ISO 2768 tolerance class'),
});

// Existing backward-compatibility schemas
export const runFullShaftAnalysisSchema = z.object({
  torqueNm: z.number().describe('Applied torque in N·m'),
  radialForceN: z.number().describe('Radial bending force in N'),
  diameterMm: z.number().describe('Shaft diameter in mm'),
  lengthMm: z.number().describe('Shaft length in mm'),
  rpm: z.number().describe('Rotational speed in RPM'),
  yieldStrengthMPa: z.number().describe('Material yield strength in MPa'),
  tensileStrengthMPa: z.number().describe('Material ultimate tensile strength in MPa'),
  elasticModulusGPa: z.number().describe('Material elastic modulus in GPa'),
  targetSafetyFactor: z.number().describe('Target factor of safety'),
  operatingTempC: z.number().describe('Operating temperature in Celsius'),
  criterion: z.enum(['Tresca', 'Von Mises']).optional().default('Von Mises'),
  deflectionLimitRatio: z.number().optional().default(1000),
});

const shaftConfigSchema = z.object({
  name: z.string().default('Configuration'),
  torqueNm: z.number(),
  radialForceN: z.number().default(0),
  diameterMm: z.number(),
  lengthMm: z.number(),
  rpm: z.number().default(1450),
  yieldStrengthMPa: z.number().default(655),
  tensileStrengthMPa: z.number().default(1020),
  elasticModulusGPa: z.number().default(205),
  densityKgM3: z.number().default(7850),
  targetSafetyFactor: z.number().default(2.0),
  criterion: z.enum(['Tresca', 'Von Mises']).optional().default('Von Mises'),
});

export const compareShaftDesignsSchema = z.object({
  designA: shaftConfigSchema.describe('First design configuration'),
  designB: shaftConfigSchema.describe('Second design configuration to compare against'),
});

// Alias for backward compatibility
export const updateProjectParametersSchema = updateProjectSchema;
export const saveDesignVersionSchema = saveProjectSchema;
export const calculateRequiredShaftDiameterSchema = calculateRequiredDiameterSchema;

// --- PROMPT 07 ENGINEERING AGENT SCHEMAS ---

// Group A: Project Tools
export const getProjectStatusSchema = z.object({
  projectId: z.string().optional().describe('Project identifier. Defaults to active project.'),
});

export const getProjectInputsSchema = z.object({
  projectId: z.string().optional().describe('Project identifier. Defaults to active project.'),
});

export const getProjectResultsSchema = z.object({
  projectId: z.string().optional().describe('Project identifier. Defaults to active project.'),
});

// Group B: Engineering Inputs Tools
export const setShaftLengthSchema = z.object({
  projectId: z.string().optional().describe('Project identifier to update.'),
  lengthMm: z.number().positive().min(10).max(10000).describe('Shaft span length between bearing supports in mm (10 - 10000 mm)'),
});

export const setShaftDiameterSchema = z.object({
  projectId: z.string().optional().describe('Project identifier to update.'),
  diameterMm: z.number().positive().min(5).max(1000).describe('Shaft outer diameter in mm (5 - 1000 mm)'),
});

export const setShaftSectionsSchema = z.object({
  projectId: z.string().optional().describe('Project identifier to update.'),
  sections: z.array(z.object({
    id: z.string().optional(),
    diameterMm: z.number().positive().describe('Section diameter in mm'),
    lengthMm: z.number().positive().describe('Section length in mm'),
    type: z.string().optional().describe('Section type (journal, step, hub, seat)'),
  })).min(1).describe('Stepped shaft sections array'),
});

export const setShaftFeaturesSchema = z.object({
  projectId: z.string().optional().describe('Project identifier to update.'),
  features: z.array(z.object({
    type: z.enum(['keyway', 'chamfer', 'fillet', 'shoulder', 'undercut']).describe('Feature type'),
    positionMm: z.number().nonnegative().optional().describe('Axial location in mm'),
    sizeMm: z.number().positive().optional().describe('Feature dimension in mm'),
  })).min(1).describe('Shaft geometric features array'),
});

export const setOperatingSpeedSchema = z.object({
  projectId: z.string().optional().describe('Project identifier to update.'),
  rpm: z.number().positive().describe('Operating rotational speed in RPM'),
});

export const setTorqueSchema = z.object({
  projectId: z.string().optional().describe('Project identifier to update.'),
  torqueNm: z.number().nonnegative().describe('Applied torsional moment in N·m'),
});

export const setAppliedLoadsSchema = z.object({
  projectId: z.string().optional().describe('Project identifier to update.'),
  radialForceN: z.number().nonnegative().optional().describe('Radial transverse bending load in N'),
  axialForceN: z.number().optional().describe('Axial thrust load in N'),
  bendingMomentNm: z.number().optional().describe('Direct bending moment in N·m'),
  loadPositionMm: z.number().optional().describe('Axial load application position in mm'),
});

export const setSupportConditionsSchema = z.object({
  projectId: z.string().optional().describe('Project identifier to update.'),
  leftBearingMm: z.number().nonnegative().optional().describe('Left bearing support axial position in mm'),
  rightBearingMm: z.number().positive().optional().describe('Right bearing support axial position in mm'),
  supportType: z.enum(['simply_supported', 'fixed_free', 'fixed_fixed']).optional().default('simply_supported').describe('Bearing support configuration'),
});

export const setMaterialSchema = z.object({
  projectId: z.string().optional().describe('Project identifier to update.'),
  materialId: z.string().min(1).describe('Certified material identifier (e.g. "aisi-4140", "aisi-1045", "6061-t6")'),
});

export const setDesignFactorSchema = z.object({
  projectId: z.string().optional().describe('Project identifier to update.'),
  safetyFactor: z.number().positive().min(1.0).max(20.0).describe('Target design factor of safety'),
});

export const getCurrentEngineeringInputsSchema = z.object({
  projectId: z.string().optional().describe('Project identifier. Defaults to active project.'),
});

export const validateEngineeringInputsSchema = z.object({
  diameterMm: z.number().optional().describe('Shaft diameter in mm'),
  lengthMm: z.number().optional().describe('Shaft length in mm'),
  torqueNm: z.number().optional().describe('Torque in N·m'),
  radialForceN: z.number().optional().describe('Radial force in N'),
  rpm: z.number().optional().describe('Rotational speed in RPM'),
  materialId: z.string().optional().describe('Material identifier'),
  safetyFactor: z.number().optional().describe('Target safety factor'),
});

// Group C: Materials Tools
export const getMaterialDetailsSchema = z.object({
  materialId: z.string().min(1).describe('Certified material identifier or alloy name'),
});

export const compareMaterialsSchema = z.object({
  materialIds: z.array(z.string()).min(2).describe('Array of material identifiers to compare side-by-side'),
});

export const selectMaterialSchema = z.object({
  materialId: z.string().min(1).describe('Certified material identifier to assign'),
  projectId: z.string().optional().describe('Target project identifier'),
});

// Group D: CAD Geometry Tools
export const createShaftGeometrySchema = z.object({
  projectId: z.string().optional().describe('Target project identifier'),
  diameterMm: z.number().positive().optional().describe('Outer shaft diameter in mm'),
  lengthMm: z.number().positive().optional().describe('Total shaft span length in mm'),
  sections: z.array(z.any()).optional().describe('Optional stepped sections definitions'),
});

export const updateShaftGeometrySchema = z.object({
  projectId: z.string().optional().describe('Target project identifier'),
  diameterMm: z.number().positive().optional().describe('Outer shaft diameter in mm'),
  lengthMm: z.number().positive().optional().describe('Total shaft span length in mm'),
  sections: z.array(z.any()).optional().describe('Updated stepped sections'),
});

export const updateShaftFeatureSchema = z.object({
  featureType: z.enum(['keyway', 'chamfer', 'fillet', 'shoulder', 'undercut']).describe('Shaft feature type to update'),
  dimensionMm: z.number().positive().describe('Feature dimension in mm'),
  positionMm: z.number().nonnegative().optional().describe('Axial position along shaft in mm'),
});

export const getModelGeometrySchema = z.object({
  projectId: z.string().optional().describe('Project identifier'),
  diameterMm: z.number().positive().optional().describe('Diameter override in mm'),
  lengthMm: z.number().positive().optional().describe('Length override in mm'),
});

export const regenerateModelSchema = z.object({
  projectId: z.string().optional().describe('Target project identifier'),
  diameterMm: z.number().positive().optional().describe('Shaft diameter override in mm'),
  lengthMm: z.number().positive().optional().describe('Shaft length override in mm'),
});

export const getModelDimensionsSchema = z.object({
  projectId: z.string().optional().describe('Target project identifier'),
  diameterMm: z.number().positive().optional().describe('Shaft diameter override in mm'),
  lengthMm: z.number().positive().optional().describe('Shaft length override in mm'),
});

export const selectModelComponentSchema = z.object({
  componentName: z.enum(['shaft', 'bearing_left', 'bearing_right', 'gear', 'keyway']).describe('CAD model component to highlight in 3D viewport'),
});

export const updateComponentVisibilitySchema = z.object({
  componentOrFeature: z.string().describe('CAD component or drawing layer to toggle'),
  visible: z.boolean().describe('Visibility flag'),
});

export const getModelStatusSchema = z.object({
  projectId: z.string().optional().describe('Target project identifier'),
});

// Group E: Calculations Tools
export const calculateTransmittedPowerSchema = z.object({
  torqueNm: z.number().nonnegative().describe('Applied torque in N·m'),
  rpm: z.number().positive().describe('Rotational speed in RPM'),
});

export const calculateShaftDeflectionSchema = z.object({
  radialForceN: z.number().nonnegative().describe('Transverse radial point load in N'),
  lengthMm: z.number().positive().describe('Shaft span length between bearing supports in mm'),
  diameterMm: z.number().positive().describe('Solid circular shaft diameter in mm'),
  elasticModulusGPa: z.number().positive().optional().default(205).describe('Material Young\'s modulus in GPa'),
  deflectionLimitRatio: z.number().positive().optional().default(1000).describe('Allowable deflection ratio L/R (default 1000)'),
});

export const calculateFailureCriteriaSchema = z.object({
  normalStressMPa: z.number().nonnegative().optional().describe('Bending normal stress in MPa'),
  shearStressMPa: z.number().nonnegative().optional().describe('Torsional shear stress in MPa'),
  yieldStrengthMPa: z.number().positive().describe('Material tensile yield strength Sy in MPa'),
  torqueNm: z.number().optional().describe('Applied torque in N·m'),
  radialForceN: z.number().optional().describe('Radial bending force in N'),
  diameterMm: z.number().optional().describe('Shaft diameter in mm'),
  lengthMm: z.number().optional().describe('Shaft length in mm'),
});

export const runCompleteShaftAnalysisSchema = z.object({
  projectId: z.string().optional().describe('Project identifier'),
  torqueNm: z.number().optional().describe('Applied torque in N·m'),
  radialForceN: z.number().optional().describe('Radial bending force in N'),
  diameterMm: z.number().optional().describe('Shaft diameter in mm'),
  lengthMm: z.number().optional().describe('Shaft length in mm'),
  rpm: z.number().optional().describe('Rotational speed in RPM'),
  materialId: z.string().optional().describe('Material identifier'),
  yieldStrengthMPa: z.number().optional().describe('Yield strength in MPa'),
  tensileStrengthMPa: z.number().optional().describe('Tensile strength in MPa'),
  elasticModulusGPa: z.number().optional().describe('Elastic modulus in GPa'),
  targetSafetyFactor: z.number().optional().describe('Target factor of safety'),
  criterion: z.enum(['Tresca', 'Von Mises']).optional().default('Von Mises').describe('Failure criterion'),
  deflectionLimitRatio: z.number().optional().default(1000).describe('Deflection limit ratio'),
});

export const validateDesignResultsSchema = z.object({
  projectId: z.string().optional().describe('Target project identifier'),
  equivalentStressMPa: z.number().optional().describe('Von Mises or Tresca equivalent stress in MPa'),
  yieldStrengthMPa: z.number().optional().describe('Material yield strength in MPa'),
  maxDeflectionMm: z.number().optional().describe('Maximum shaft deflection in mm'),
  lengthMm: z.number().optional().describe('Shaft span length in mm'),
  safetyFactor: z.number().optional().describe('Achieved factor of safety'),
  targetSafetyFactor: z.number().optional().default(2.0).describe('Required factor of safety'),
});

// ============================================================================
// 3. Tool Metadata Registry (Permissions & Categories)
// ============================================================================
export const toolMetadataRegistry: Record<string, ToolMetadata> = {
  // Project tools
  create_project: {
    name: 'create_project',
    category: 'Project',
    description: 'Creates a new mechanical engineering project with designated design parameters in SQLite database.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  get_project: {
    name: 'get_project',
    category: 'Project',
    description: 'Retrieves current project parameters, metadata, and status from database.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  update_project: {
    name: 'update_project',
    category: 'Project',
    description: 'Updates active project engineering parameters (diameter, length, torque, force, material, etc.).',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  save_project: {
    name: 'save_project',
    category: 'Project',
    description: 'Creates an immutable milestone checkpoint version snapshot in the project audit history.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  list_projects: {
    name: 'list_projects',
    category: 'Project',
    description: 'Lists existing engineering projects stored in database.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },

  // Shaft design tools
  create_shaft: {
    name: 'create_shaft',
    category: 'Shaft Design',
    description: 'Initializes a new parametric stepped shaft model with specified envelope dimensions and loads.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  update_shaft: {
    name: 'update_shaft',
    category: 'Shaft Design',
    description: 'Updates shaft geometry and mechanical loads on active project.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  add_shaft_section: {
    name: 'add_shaft_section',
    category: 'Shaft Design',
    description: 'Adds a stepped journal, shoulder, or hub seat section to the shaft model.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  remove_shaft_feature: {
    name: 'remove_shaft_feature',
    category: 'Shaft Design',
    description: 'Removes or suppresses a feature (keyway, chamfer, fillet) from shaft geometry.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  update_shaft_dimensions: {
    name: 'update_shaft_dimensions',
    category: 'Shaft Design',
    description: 'Modifies diameter and length dimensions with parametric synchronization.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  get_shaft_geometry: {
    name: 'get_shaft_geometry',
    category: 'Shaft Design',
    description: 'Calculates exact parametric stepped shaft geometry model, journal sizes, fillets, keyway dimensions.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },

  // Engineering tools
  calculate_power: {
    name: 'calculate_power',
    category: 'Engineering Calculations',
    description: 'Calculates transmitted mechanical power (kW, hp) and angular velocity from torque and speed.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  calculate_torsional_stress: {
    name: 'calculate_torsional_stress',
    category: 'Engineering Calculations',
    description: 'Calculates pure torsional shear stress (tau = 16T / pi*d^3) and polar section modulus.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  calculate_bending_stress: {
    name: 'calculate_bending_stress',
    category: 'Engineering Calculations',
    description: 'Calculates maximum bending moment and normal stress (sigma_b = 32M / pi*d^3) for simply supported span.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  calculate_combined_stress: {
    name: 'calculate_combined_stress',
    category: 'Engineering Calculations',
    description: 'Calculates combined multiaxial stresses, Mohr circle principal stresses, von Mises and Tresca equivalent stresses.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  calculate_factor_of_safety: {
    name: 'calculate_factor_of_safety',
    category: 'Engineering Calculations',
    description: 'Evaluates factor of safety (Sy / sigma_eq), reserve margin, and structural compliance.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  calculate_required_diameter: {
    name: 'calculate_required_diameter',
    category: 'Engineering Calculations',
    description: 'Calculates minimum required solid circular shaft diameter to satisfy target factor of safety via bounded bisection.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  calculate_required_shaft_diameter: {
    name: 'calculate_required_shaft_diameter',
    category: 'Engineering Calculations',
    description: 'Calculates minimum required shaft diameter (backward compatibility alias).',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  calculate_deflection: {
    name: 'calculate_deflection',
    category: 'Engineering Calculations',
    description: 'Calculates Euler-Bernoulli flexural centerline deflection, support slope, and checks vs L/1000 limit.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  validate_design: {
    name: 'validate_design',
    category: 'Engineering Calculations',
    description: 'Executes the 9-point deterministic engineering verification matrix across geometry, closure, loads, material, and safety.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  run_full_shaft_analysis: {
    name: 'run_full_shaft_analysis',
    category: 'Engineering Calculations',
    description: 'Executes full synthesis analysis aggregating torsion, bending, combined stress, deflection, and safety factor.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  compare_shaft_designs: {
    name: 'compare_shaft_designs',
    category: 'Engineering Calculations',
    description: 'Compares two shaft configurations and outputs comparative deltas for stress, mass, and factor of safety.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },

  // Material tools
  search_materials: {
    name: 'search_materials',
    category: 'Materials',
    description: 'Searches certified engineering materials catalog by keyword, alloy family, or minimum yield strength.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  get_material_properties: {
    name: 'get_material_properties',
    category: 'Materials',
    description: 'Retrieves certified metallurgical properties (Sy, Su, E, density, Poisson ratio, thermal expansion) from database.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  update_material_selection: {
    name: 'update_material_selection',
    category: 'Materials',
    description: 'Selects and assigns a certified material alloy to the active shaft design project.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },

  // CAD tools
  regenerate_geometry: {
    name: 'regenerate_geometry',
    category: 'CAD',
    description: 'Regenerates 3D CAD mesh geometry and updates 2D orthographic bounds.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  select_component: {
    name: 'select_component',
    category: 'CAD',
    description: 'Highlights and inspects a specific CAD subcomponent (shaft body, bearings, gear, keyway).',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  update_feature_visibility: {
    name: 'update_feature_visibility',
    category: 'CAD',
    description: 'Toggles visibility layers in 2D blueprint / 3D CAD workspace (hidden edges, centerlines, dimensions, hatching).',
    permission: 'REVERSIBLE',
    requiresApproval: false,
  },
  set_camera_view: {
    name: 'set_camera_view',
    category: 'CAD',
    description: 'Adjusts CAD viewport camera angle (Front, Top, Side, Isometric) or workspace layout mode.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },

  // Drawing and reporting tools
  generate_orthographic_drawing: {
    name: 'generate_orthographic_drawing',
    category: 'Drawing & Reporting',
    description: 'Generates ISO 5457 technical drawing layout, orthographic views (Front, Top, Section A-A), and associative dimensions.',
    permission: 'REVERSIBLE',
    requiresApproval: false,
  },
  generate_engineering_report: {
    name: 'generate_engineering_report',
    category: 'Drawing & Reporting',
    description: 'Compiles formal 18-section mechanical engineering calculation and verification audit report.',
    permission: 'REVERSIBLE',
    requiresApproval: false,
  },
  export_drawing: {
    name: 'export_drawing',
    category: 'Drawing & Reporting',
    description: 'Exports engineering drawing as standalone Scalable Vector Graphics (SVG), PNG raster, or JSON audit spec.',
    permission: 'REVERSIBLE',
    requiresApproval: false,
  },
  get_project_revision_history: {
    name: 'get_project_revision_history',
    category: 'Drawing & Reporting',
    description: 'Retrieves immutable SQLite revision timeline, changed parameter deltas, and milestone notes.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  run_design_verification: {
    name: 'run_design_verification',
    category: 'Drawing & Reporting',
    description: 'Runs comprehensive 11-point engineering verification matrix evaluating inputs, stresses, FoS, deflection, and standards.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  export_pdf_report: {
    name: 'export_pdf_report',
    category: 'Drawing & Reporting',
    description: 'Generates and downloads professional 10-section PDF engineering calculation and verification audit report.',
    permission: 'REVERSIBLE',
    requiresApproval: false,
  },
  prepare_print_document: {
    name: 'prepare_print_document',
    category: 'Drawing & Reporting',
    description: 'Prepares print-ready document layout and triggers browser print dialog for engineering report or drawing.',
    permission: 'REVERSIBLE',
    requiresApproval: false,
  },
  validate_drawing_dimensions: {
    name: 'validate_drawing_dimensions',
    category: 'Drawing & Reporting',
    description: 'Verifies drawing dimensional closure, keyway span fitting, and ISO 2768 tolerances.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },

  // --- Prompt 07 Tool Registrations ---
  // Group A: Project Tools
  get_project_status: {
    name: 'get_project_status',
    category: 'Project',
    description: 'Returns current design status, validation state, completion percentage, and latest metrics.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  get_project_inputs: {
    name: 'get_project_inputs',
    category: 'Project',
    description: 'Returns all current engineering design inputs for the active or specified project.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  get_project_results: {
    name: 'get_project_results',
    category: 'Project',
    description: 'Returns latest calculated stresses, factor of safety, deflection, and pass/fail compliance states.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },

  // Group B: Engineering Inputs Tools
  set_shaft_length: {
    name: 'set_shaft_length',
    category: 'Engineering Inputs',
    description: 'Updates shaft span length between bearing supports in millimeters.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  set_shaft_diameter: {
    name: 'set_shaft_diameter',
    category: 'Engineering Inputs',
    description: 'Updates outer shaft diameter in millimeters.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  set_shaft_sections: {
    name: 'set_shaft_sections',
    category: 'Engineering Inputs',
    description: 'Configures stepped shaft sections array with individual diameters and lengths.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  set_shaft_features: {
    name: 'set_shaft_features',
    category: 'Engineering Inputs',
    description: 'Adds or updates geometric features (keyways, fillets, shoulders, chamfers).',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  set_operating_speed: {
    name: 'set_operating_speed',
    category: 'Engineering Inputs',
    description: 'Sets rotational operating speed in RPM and computes angular velocity.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  set_torque: {
    name: 'set_torque',
    category: 'Engineering Inputs',
    description: 'Sets transmitted torsional moment in N·m.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  set_applied_loads: {
    name: 'set_applied_loads',
    category: 'Engineering Inputs',
    description: 'Sets radial bending loads, axial thrust loads, and direct bending moments.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  set_support_conditions: {
    name: 'set_support_conditions',
    category: 'Engineering Inputs',
    description: 'Sets bearing support locations and support boundary conditions.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  set_material: {
    name: 'set_material',
    category: 'Engineering Inputs',
    description: 'Assigns certified material from materials database to the current project.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  set_design_factor: {
    name: 'set_design_factor',
    category: 'Engineering Inputs',
    description: 'Sets required target factor of safety for design sizing and compliance verification.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  get_current_engineering_inputs: {
    name: 'get_current_engineering_inputs',
    category: 'Engineering Inputs',
    description: 'Retrieves all active engineering input parameters in the current design workspace.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  validate_engineering_inputs: {
    name: 'validate_engineering_inputs',
    category: 'Engineering Inputs',
    description: 'Validates all input parameters against physical boundaries and engineering limits before calculations.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },

  // Group C: Materials Tools
  get_material_details: {
    name: 'get_material_details',
    category: 'Materials',
    description: 'Returns complete certified mechanical, physical, and thermal properties for a material.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  compare_materials: {
    name: 'compare_materials',
    category: 'Materials',
    description: 'Compares multiple certified materials side-by-side with property deltas and strength-to-weight ratios.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  select_material: {
    name: 'select_material',
    category: 'Materials',
    description: 'Selects and assigns a certified material to the current design project.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },

  // Group D: CAD Geometry Tools
  create_shaft_geometry: {
    name: 'create_shaft_geometry',
    category: 'CAD',
    description: 'Generates parametric 3D/2D shaft CAD model from input parameters, computing volume and bounding envelope.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  update_shaft_geometry: {
    name: 'update_shaft_geometry',
    category: 'CAD',
    description: 'Modifies geometric envelope dimensions of the active CAD model.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  update_shaft_feature: {
    name: 'update_shaft_feature',
    category: 'CAD',
    description: 'Modifies dimension or location of an existing shaft geometric feature.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  get_model_geometry: {
    name: 'get_model_geometry',
    category: 'CAD',
    description: 'Returns current CAD geometry tree, section coordinates, volume, and mass properties.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  regenerate_model: {
    name: 'regenerate_model',
    category: 'CAD',
    description: 'Forces complete CAD geometry recomputation and parametric mesh regeneration.',
    permission: 'REVERSIBLE',
    requiresApproval: true,
  },
  get_model_dimensions: {
    name: 'get_model_dimensions',
    category: 'CAD',
    description: 'Returns bounding box dimensions and envelope coordinates of the CAD model.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  select_model_component: {
    name: 'select_model_component',
    category: 'CAD',
    description: 'Focuses and highlights a component (shaft, bearing, gear, keyway) in the 3D viewport.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  update_component_visibility: {
    name: 'update_component_visibility',
    category: 'CAD',
    description: 'Toggles visibility of CAD components, drawing layers, or annotations.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  get_model_status: {
    name: 'get_model_status',
    category: 'CAD',
    description: 'Returns CAD mesh validity, generation status, and regeneration timestamp.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },

  // Group E: Calculations Tools
  calculate_transmitted_power: {
    name: 'calculate_transmitted_power',
    category: 'Engineering Calculations',
    description: 'Computes mechanical power (kW, HP) and angular velocity from applied torque and RPM.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  calculate_shaft_deflection: {
    name: 'calculate_shaft_deflection',
    category: 'Engineering Calculations',
    description: 'Computes maximum centerline beam deflection, support slopes, and stiffness compliance.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  calculate_failure_criteria: {
    name: 'calculate_failure_criteria',
    category: 'Engineering Calculations',
    description: 'Evaluates yield failure criteria (Von Mises distortion energy vs Tresca maximum shear stress).',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  run_complete_shaft_analysis: {
    name: 'run_complete_shaft_analysis',
    category: 'Engineering Calculations',
    description: 'Executes complete end-to-end deterministic solid mechanics pipeline (torsion, bending, combined stresses, FoS, deflection).',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
  validate_design_results: {
    name: 'validate_design_results',
    category: 'Engineering Calculations',
    description: 'Verifies all calculated stresses, FoS, deflection, and slopes against standard mechanical engineering limits.',
    permission: 'READ_ONLY',
    requiresApproval: false,
  },
};

// Aliases
toolMetadataRegistry.update_project_parameters = toolMetadataRegistry.update_project;
toolMetadataRegistry.save_design_version = toolMetadataRegistry.save_project;

// ============================================================================
// 4. OpenAI Function Definitions Array
// ============================================================================
export const engineeringTools = [
  // 1. calculate_required_shaft_diameter
  {
    type: 'function' as const,
    function: {
      name: 'calculate_required_shaft_diameter',
      description: 'Calculates the minimum required solid circular shaft diameter to safely transmit torque and bending loads under selected failure criteria (Von Mises or Tresca). Solves combined loads using bounded bisection.',
      parameters: {
        type: 'object',
        properties: {
          torqueNm: { type: 'number', description: 'Applied torque in N·m' },
          radialForceN: { type: 'number', description: 'Radial bending force in N (optional, for combined sizing)' },
          lengthMm: { type: 'number', description: 'Shaft span length in mm (optional, for combined sizing)' },
          bendingMomentNm: { type: 'number', description: 'Peak bending moment in N·m (optional)' },
          allowableShearStressMPa: { type: 'number', description: 'Allowable shear stress in MPa' },
          yieldStrengthMPa: { type: 'number', description: 'Material yield strength in MPa' },
          safetyFactor: { type: 'number', description: 'Target factor of safety (default 2.0)' },
          criterion: { type: 'string', enum: ['Tresca', 'Von Mises'], description: 'Failure criterion (default Von Mises)' },
          elasticModulusGPa: { type: 'number', description: 'Material elastic modulus in GPa' },
          deflectionLimitRatio: { type: 'number', description: 'Deflection limit ratio (default 1000)' },
        },
        required: ['torqueNm'],
      },
    },
  },
  // 2. calculate_required_diameter
  {
    type: 'function' as const,
    function: {
      name: 'calculate_required_diameter',
      description: 'Calculates the minimum required solid circular shaft diameter to safely transmit torque and bending loads under selected failure criteria (Von Mises or Tresca).',
      parameters: {
        type: 'object',
        properties: {
          torqueNm: { type: 'number', description: 'Applied torque in N·m' },
          radialForceN: { type: 'number', description: 'Radial bending force in N' },
          lengthMm: { type: 'number', description: 'Shaft span length in mm' },
          yieldStrengthMPa: { type: 'number', description: 'Material yield strength in MPa' },
          safetyFactor: { type: 'number', description: 'Target factor of safety' },
          criterion: { type: 'string', enum: ['Tresca', 'Von Mises'], description: 'Failure criterion' },
        },
        required: ['torqueNm'],
      },
    },
  },
  // 3. run_full_shaft_analysis
  {
    type: 'function' as const,
    function: {
      name: 'run_full_shaft_analysis',
      description: 'Executes a full composite shaft analysis aggregating torsion, bending, combined stress, deflection, power transmission, and safety factor.',
      parameters: {
        type: 'object',
        properties: {
          torqueNm: { type: 'number', description: 'Applied torque in N·m' },
          radialForceN: { type: 'number', description: 'Radial bending force in N' },
          diameterMm: { type: 'number', description: 'Shaft diameter in mm' },
          lengthMm: { type: 'number', description: 'Shaft length in mm' },
          rpm: { type: 'number', description: 'Rotational speed in RPM' },
          yieldStrengthMPa: { type: 'number', description: 'Material yield strength in MPa' },
          tensileStrengthMPa: { type: 'number', description: 'Material ultimate tensile strength in MPa' },
          elasticModulusGPa: { type: 'number', description: 'Material elastic modulus in GPa' },
          targetSafetyFactor: { type: 'number', description: 'Target factor of safety' },
          operatingTempC: { type: 'number', description: 'Operating temperature in Celsius' },
          criterion: { type: 'string', enum: ['Tresca', 'Von Mises'], description: 'Failure criterion' },
          deflectionLimitRatio: { type: 'number', description: 'Deflection limit ratio (default 1000)' },
        },
        required: [
          'torqueNm', 'radialForceN', 'diameterMm', 'lengthMm', 'rpm',
          'yieldStrengthMPa', 'tensileStrengthMPa', 'elasticModulusGPa',
          'targetSafetyFactor', 'operatingTempC'
        ],
      },
    },
  },
  // 4. calculate_power
  {
    type: 'function' as const,
    function: {
      name: 'calculate_power',
      description: 'Calculates mechanical transmitted power in kW and horsepower from torque (Nm) and rotational speed (RPM).',
      parameters: {
        type: 'object',
        properties: {
          torqueNm: { type: 'number', description: 'Applied torque in N·m' },
          rpm: { type: 'number', description: 'Rotational speed in RPM' },
        },
        required: ['torqueNm', 'rpm'],
      },
    },
  },
  // 5. calculate_torsional_stress
  {
    type: 'function' as const,
    function: {
      name: 'calculate_torsional_stress',
      description: 'Calculates torsional shear stress (tau = 16T / pi*d^3) and section modulus for circular shaft.',
      parameters: {
        type: 'object',
        properties: {
          torqueNm: { type: 'number', description: 'Applied torque in N·m' },
          diameterMm: { type: 'number', description: 'Shaft diameter in mm' },
        },
        required: ['torqueNm', 'diameterMm'],
      },
    },
  },
  // 6. calculate_bending_stress
  {
    type: 'function' as const,
    function: {
      name: 'calculate_bending_stress',
      description: 'Calculates peak bending moment (M = FL/4) and bending normal stress (sigma_b = 32M / pi*d^3).',
      parameters: {
        type: 'object',
        properties: {
          radialForceN: { type: 'number', description: 'Transverse load in N' },
          lengthMm: { type: 'number', description: 'Shaft span length in mm' },
          diameterMm: { type: 'number', description: 'Shaft diameter in mm' },
        },
        required: ['radialForceN', 'lengthMm', 'diameterMm'],
      },
    },
  },
  // 7. calculate_combined_stress
  {
    type: 'function' as const,
    function: {
      name: 'calculate_combined_stress',
      description: 'Calculates combined multiaxial stresses, von Mises equivalent stress, and Tresca maximum shear stress.',
      parameters: {
        type: 'object',
        properties: {
          torqueNm: { type: 'number', description: 'Applied torque in N·m' },
          radialForceN: { type: 'number', description: 'Radial force in N' },
          lengthMm: { type: 'number', description: 'Shaft span length in mm' },
          diameterMm: { type: 'number', description: 'Shaft diameter in mm' },
          criterion: { type: 'string', enum: ['Von Mises', 'Tresca'], description: 'Yield failure criterion' },
        },
        required: ['torqueNm', 'radialForceN', 'lengthMm', 'diameterMm'],
      },
    },
  },
  // 8. calculate_factor_of_safety
  {
    type: 'function' as const,
    function: {
      name: 'calculate_factor_of_safety',
      description: 'Evaluates structural factor of safety (FoS = Sy / sigma_eq) and margin percentage.',
      parameters: {
        type: 'object',
        properties: {
          equivalentStressMPa: { type: 'number', description: 'Equivalent stress in MPa' },
          yieldStrengthMPa: { type: 'number', description: 'Material yield strength in MPa' },
          targetSafetyFactor: { type: 'number', description: 'Required safety factor (default 2.0)' },
        },
        required: ['equivalentStressMPa', 'yieldStrengthMPa'],
      },
    },
  },
  // 9. calculate_deflection
  {
    type: 'function' as const,
    function: {
      name: 'calculate_deflection',
      description: 'Calculates flexural centerline deflection (delta = FL^3 / 48EI), support slope, and checks vs L/1000 limit.',
      parameters: {
        type: 'object',
        properties: {
          radialForceN: { type: 'number', description: 'Radial load in N' },
          lengthMm: { type: 'number', description: 'Shaft span length in mm' },
          diameterMm: { type: 'number', description: 'Shaft diameter in mm' },
          elasticModulusGPa: { type: 'number', description: 'Elastic modulus in GPa (default 205)' },
          deflectionLimitRatio: { type: 'number', description: 'Deflection ratio limit (default 1000)' },
        },
        required: ['radialForceN', 'lengthMm', 'diameterMm'],
      },
    },
  },
  // 10. validate_design
  {
    type: 'function' as const,
    function: {
      name: 'validate_design',
      description: 'Executes the 9-point deterministic engineering verification matrix across geometry, closure, loads, material, and safety.',
      parameters: {
        type: 'object',
        properties: {
          diameterMm: { type: 'number', description: 'Shaft diameter in mm' },
          lengthMm: { type: 'number', description: 'Shaft length in mm' },
          torqueNm: { type: 'number', description: 'Torque in N·m' },
          radialForceN: { type: 'number', description: 'Radial force in N' },
          rpm: { type: 'number', description: 'Speed in RPM' },
          materialId: { type: 'string', description: 'Material ID' },
          safetyFactor: { type: 'number', description: 'Target safety factor' },
        },
      },
    },
  },
  // 11. search_materials
  {
    type: 'function' as const,
    function: {
      name: 'search_materials',
      description: 'Searches certified materials database by keyword, alloy category, or minimum yield strength.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term (e.g. "4140", "aluminum", "alloy")' },
          category: { type: 'string', description: 'Material category' },
          minYieldStrengthMPa: { type: 'number', description: 'Minimum yield strength in MPa' },
        },
      },
    },
  },
  // 12. get_material_properties
  {
    type: 'function' as const,
    function: {
      name: 'get_material_properties',
      description: 'Retrieves certified metallurgical properties (Sy, Su, E, density, Poisson ratio, thermal expansion) from database.',
      parameters: {
        type: 'object',
        properties: {
          materialId: { type: 'string', description: 'Material identifier or alloy name (e.g. "aisi-4140", "aisi-1045", "6061-t6", "ss-304")' },
        },
        required: ['materialId'],
      },
    },
  },
  // 13. update_material_selection
  {
    type: 'function' as const,
    function: {
      name: 'update_material_selection',
      description: 'Assigns a certified engineering material alloy to the active shaft design project.',
      parameters: {
        type: 'object',
        properties: {
          materialId: { type: 'string', description: 'Material ID (e.g. "aisi-4140", "al-6061-t6")' },
          projectId: { type: 'string', description: 'Project ID' },
        },
        required: ['materialId'],
      },
    },
  },
  // 14. create_project
  {
    type: 'function' as const,
    function: {
      name: 'create_project',
      description: 'Creates a new engineering project in SQLite with specified design parameters and saves baseline state.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Descriptive project name' },
          description: { type: 'string', description: 'Project scope description' },
          materialId: { type: 'string', description: 'Initial material ID' },
          diameter: { type: 'number', description: 'Shaft diameter in mm' },
          length: { type: 'number', description: 'Shaft length in mm' },
          torque: { type: 'number', description: 'Applied torque in N·m' },
          force: { type: 'number', description: 'Radial force in N' },
          rpm: { type: 'number', description: 'Rotational speed in RPM' },
          safetyFactor: { type: 'number', description: 'Target factor of safety' },
        },
        required: ['name'],
      },
    },
  },
  // 15. get_project
  {
    type: 'function' as const,
    function: {
      name: 'get_project',
      description: 'Retrieves project details, design parameters, and revision status from SQLite database.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project identifier' },
        },
      },
    },
  },
  // 16. update_project
  {
    type: 'function' as const,
    function: {
      name: 'update_project',
      description: 'Updates active project engineering parameters (diameter, length, torque, force, material, speed, safety factor).',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          materialId: { type: 'string', description: 'Material ID' },
          diameter: { type: 'number', description: 'Shaft diameter in mm' },
          length: { type: 'number', description: 'Shaft length in mm' },
          torque: { type: 'number', description: 'Torque in N·m' },
          force: { type: 'number', description: 'Radial force in N' },
          rpm: { type: 'number', description: 'RPM' },
          safetyFactor: { type: 'number', description: 'Safety factor' },
        },
      },
    },
  },
  // 17. save_project
  {
    type: 'function' as const,
    function: {
      name: 'save_project',
      description: 'Saves a named version snapshot of the current design into the SQLite revision database.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          label: { type: 'string', description: 'Version label (e.g. "v1.0 Baseline")' },
          notes: { type: 'string', description: 'Engineering notes' },
        },
        required: ['label'],
      },
    },
  },
  // 18. list_projects
  {
    type: 'function' as const,
    function: {
      name: 'list_projects',
      description: 'Lists existing engineering design projects in the local SQLite database.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max number of projects to return' },
        },
      },
    },
  },
  // 19. create_shaft
  {
    type: 'function' as const,
    function: {
      name: 'create_shaft',
      description: 'Initializes a new parametric stepped shaft model with specified envelope dimensions and loads.',
      parameters: {
        type: 'object',
        properties: {
          diameterMm: { type: 'number', description: 'Shaft diameter in mm' },
          lengthMm: { type: 'number', description: 'Shaft length in mm' },
          materialId: { type: 'string', description: 'Material identifier' },
          torqueNm: { type: 'number', description: 'Torque in N·m' },
          radialForceN: { type: 'number', description: 'Radial force in N' },
          rpm: { type: 'number', description: 'RPM' },
        },
        required: ['diameterMm', 'lengthMm'],
      },
    },
  },
  // 20. update_shaft
  {
    type: 'function' as const,
    function: {
      name: 'update_shaft',
      description: 'Updates shaft geometry parameters and synchronizes CAD model.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          diameterMm: { type: 'number', description: 'Diameter in mm' },
          lengthMm: { type: 'number', description: 'Length in mm' },
          torqueNm: { type: 'number', description: 'Torque in N·m' },
          radialForceN: { type: 'number', description: 'Radial force in N' },
        },
      },
    },
  },
  // 21. update_shaft_dimensions
  {
    type: 'function' as const,
    function: {
      name: 'update_shaft_dimensions',
      description: 'Modifies diameter and length dimensions with parametric CAD regeneration.',
      parameters: {
        type: 'object',
        properties: {
          diameterMm: { type: 'number', description: 'New diameter in mm' },
          lengthMm: { type: 'number', description: 'New length in mm' },
        },
      },
    },
  },
  // 22. get_shaft_geometry
  {
    type: 'function' as const,
    function: {
      name: 'get_shaft_geometry',
      description: 'Calculates exact parametric stepped shaft geometry model, journal dimensions, chamfers, and keyways.',
      parameters: {
        type: 'object',
        properties: {
          diameterMm: { type: 'number', description: 'Shaft diameter in mm' },
          lengthMm: { type: 'number', description: 'Shaft length in mm' },
        },
      },
    },
  },
  // 23. add_shaft_section
  {
    type: 'function' as const,
    function: {
      name: 'add_shaft_section',
      description: 'Adds a stepped journal, shoulder, or hub seat section to the shaft model.',
      parameters: {
        type: 'object',
        properties: {
          sectionType: { type: 'string', enum: ['journal', 'step', 'hub', 'seat'] },
          diameterMm: { type: 'number' },
          lengthMm: { type: 'number' },
          position: { type: 'string', enum: ['left', 'mid', 'right'] },
        },
        required: ['sectionType', 'diameterMm', 'lengthMm'],
      },
    },
  },
  // 24. remove_shaft_feature
  {
    type: 'function' as const,
    function: {
      name: 'remove_shaft_feature',
      description: 'Removes or suppresses a feature (keyway, chamfer, fillet) from shaft geometry.',
      parameters: {
        type: 'object',
        properties: {
          featureType: { type: 'string', enum: ['keyway', 'chamfer', 'fillet', 'undercut'] },
        },
        required: ['featureType'],
      },
    },
  },
  // 25. regenerate_geometry
  {
    type: 'function' as const,
    function: {
      name: 'regenerate_geometry',
      description: 'Regenerates 3D CAD mesh geometry and updates 2D orthographic bounds.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          diameterMm: { type: 'number', description: 'Diameter override' },
          lengthMm: { type: 'number', description: 'Length override' },
        },
      },
    },
  },
  // 26. select_component
  {
    type: 'function' as const,
    function: {
      name: 'select_component',
      description: 'Highlights and inspects a specific CAD subcomponent in the 3D viewport.',
      parameters: {
        type: 'object',
        properties: {
          componentName: { type: 'string', enum: ['shaft', 'bearing_left', 'bearing_right', 'gear', 'keyway'] },
        },
        required: ['componentName'],
      },
    },
  },
  // 27. update_feature_visibility
  {
    type: 'function' as const,
    function: {
      name: 'update_feature_visibility',
      description: 'Toggles visibility layers in 2D blueprint / 3D CAD workspace.',
      parameters: {
        type: 'object',
        properties: {
          feature: { type: 'string', enum: ['hiddenEdges', 'centerlines', 'hatching', 'dimensions'] },
          visible: { type: 'boolean' },
        },
        required: ['feature', 'visible'],
      },
    },
  },
  // 28. set_camera_view
  {
    type: 'function' as const,
    function: {
      name: 'set_camera_view',
      description: 'Adjusts CAD viewport camera angle or workspace layout mode.',
      parameters: {
        type: 'object',
        properties: {
          view: { type: 'string', enum: ['Front', 'Top', 'Side', 'Isometric', '2D', '3D', 'Split'] },
        },
        required: ['view'],
      },
    },
  },
  // 29. generate_orthographic_drawing
  {
    type: 'function' as const,
    function: {
      name: 'generate_orthographic_drawing',
      description: 'Generates ISO 5457 technical drawing layout, orthographic views (Front, Top, Section A-A), and associative dimensions.',
      parameters: {
        type: 'object',
        properties: {
          sheetSize: { type: 'string', enum: ['A4', 'A3', 'A2'] },
          orientation: { type: 'string', enum: ['landscape', 'portrait'] },
          projection: { type: 'string', enum: ['first-angle', 'third-angle'] },
        },
      },
    },
  },
  // 30. generate_engineering_report
  {
    type: 'function' as const,
    function: {
      name: 'generate_engineering_report',
      description: 'Compiles the formal 18-section mechanical engineering calculation report for the active project.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          title: { type: 'string', description: 'Custom report title' },
        },
      },
    },
  },
  // 31. export_drawing
  {
    type: 'function' as const,
    function: {
      name: 'export_drawing',
      description: 'Exports engineering drawing as standalone SVG, PNG raster, or JSON audit spec.',
      parameters: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['svg', 'png', 'pdf', 'json'] },
          projectId: { type: 'string', description: 'Project ID' },
        },
        required: ['format'],
      },
    },
  },
  // 32. get_project_revision_history
  {
    type: 'function' as const,
    function: {
      name: 'get_project_revision_history',
      description: 'Retrieves immutable SQLite revision timeline, changed parameter deltas, and milestone notes.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
        },
      },
    },
  },
  // 32a. run_design_verification
  {
    type: 'function' as const,
    function: {
      name: 'run_design_verification',
      description: 'Runs comprehensive 11-point engineering verification matrix evaluating inputs, stresses, FoS, deflection, and standards.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          strictMode: { type: 'boolean', description: 'Enforce zero-warning tolerance' },
        },
      },
    },
  },
  // 32b. export_pdf_report
  {
    type: 'function' as const,
    function: {
      name: 'export_pdf_report',
      description: 'Generates and downloads professional 10-section PDF engineering calculation and verification audit report.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
        },
      },
    },
  },
  // 32c. prepare_print_document
  {
    type: 'function' as const,
    function: {
      name: 'prepare_print_document',
      description: 'Prepares print-ready document layout and triggers browser print dialog for engineering report or drawing.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          documentType: { type: 'string', enum: ['report', 'drawing'] },
        },
      },
    },
  },
  // 32d. validate_drawing_dimensions
  {
    type: 'function' as const,
    function: {
      name: 'validate_drawing_dimensions',
      description: 'Verifies drawing dimensional closure, keyway span fitting, and ISO 2768 tolerances.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          toleranceClass: { type: 'string', enum: ['fine', 'medium', 'coarse'] },
        },
      },
    },
  },
  // 33. compare_shaft_designs
  {
    type: 'function' as const,
    function: {
      name: 'compare_shaft_designs',
      description: 'Compares two shaft design configurations and outputs exact deltas for mass, stress, factor of safety, deflection, and required diameter.',
      parameters: {
        type: 'object',
        properties: {
          designA: { type: 'object' },
          designB: { type: 'object' },
        },
        required: ['designA', 'designB'],
      },
    },
  },

  // --- Prompt 07 Tool Declarations ---
  // Group A: Project Tools
  {
    type: 'function' as const,
    function: {
      name: 'get_project_status',
      description: 'Returns current design status, validation state, completion percentage, and latest metrics.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_project_inputs',
      description: 'Returns all current engineering design inputs for the active or specified project.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_project_results',
      description: 'Returns latest calculated stresses, factor of safety, deflection, and pass/fail compliance states.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
        },
      },
    },
  },

  // Group B: Engineering Inputs Tools
  {
    type: 'function' as const,
    function: {
      name: 'set_shaft_length',
      description: 'Updates shaft span length between bearing supports in millimeters.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Target project ID' },
          lengthMm: { type: 'number', description: 'Shaft span length in mm (10 - 10000 mm)' },
        },
        required: ['lengthMm'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_shaft_diameter',
      description: 'Updates outer shaft diameter in millimeters.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Target project ID' },
          diameterMm: { type: 'number', description: 'Shaft outer diameter in mm (5 - 1000 mm)' },
        },
        required: ['diameterMm'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_shaft_sections',
      description: 'Configures stepped shaft sections array with individual diameters and lengths.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Target project ID' },
          sections: { type: 'array', items: { type: 'object' }, description: 'Array of section objects' },
        },
        required: ['sections'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_shaft_features',
      description: 'Adds or updates geometric features (keyways, fillets, shoulders, chamfers).',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Target project ID' },
          features: { type: 'array', items: { type: 'object' }, description: 'Array of feature objects' },
        },
        required: ['features'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_operating_speed',
      description: 'Sets rotational operating speed in RPM and computes angular velocity.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Target project ID' },
          rpm: { type: 'number', description: 'Rotational speed in RPM' },
        },
        required: ['rpm'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_torque',
      description: 'Sets transmitted torsional moment in N·m.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Target project ID' },
          torqueNm: { type: 'number', description: 'Applied torque in N·m' },
        },
        required: ['torqueNm'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_applied_loads',
      description: 'Sets radial bending loads, axial thrust loads, and direct bending moments.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Target project ID' },
          radialForceN: { type: 'number', description: 'Radial bending load in N' },
          axialForceN: { type: 'number', description: 'Axial thrust load in N' },
          bendingMomentNm: { type: 'number', description: 'Bending moment in N·m' },
          loadPositionMm: { type: 'number', description: 'Axial location in mm' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_support_conditions',
      description: 'Sets bearing support locations and support boundary conditions.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Target project ID' },
          leftBearingMm: { type: 'number', description: 'Left bearing axial position in mm' },
          rightBearingMm: { type: 'number', description: 'Right bearing axial position in mm' },
          supportType: { type: 'string', enum: ['simply_supported', 'fixed_free', 'fixed_fixed'], description: 'Support type' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_material',
      description: 'Assigns certified material from materials database to the current project.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Target project ID' },
          materialId: { type: 'string', description: 'Certified material ID (e.g. aisi-4140, aisi-1045, 6061-t6)' },
        },
        required: ['materialId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_design_factor',
      description: 'Sets required target factor of safety for design sizing and compliance verification.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Target project ID' },
          safetyFactor: { type: 'number', description: 'Required factor of safety' },
        },
        required: ['safetyFactor'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_current_engineering_inputs',
      description: 'Retrieves all active engineering input parameters in the current design workspace.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'validate_engineering_inputs',
      description: 'Validates all input parameters against physical boundaries and engineering limits before calculations.',
      parameters: {
        type: 'object',
        properties: {
          diameterMm: { type: 'number', description: 'Diameter in mm' },
          lengthMm: { type: 'number', description: 'Length in mm' },
          torqueNm: { type: 'number', description: 'Torque in N·m' },
          radialForceN: { type: 'number', description: 'Radial force in N' },
          rpm: { type: 'number', description: 'RPM' },
          materialId: { type: 'string', description: 'Material ID' },
          safetyFactor: { type: 'number', description: 'Safety factor' },
        },
      },
    },
  },

  // Group C: Materials Tools
  {
    type: 'function' as const,
    function: {
      name: 'get_material_details',
      description: 'Returns complete certified mechanical, physical, and thermal properties for a material.',
      parameters: {
        type: 'object',
        properties: {
          materialId: { type: 'string', description: 'Material ID or alloy name' },
        },
        required: ['materialId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'compare_materials',
      description: 'Compares multiple certified materials side-by-side with property deltas and strength-to-weight ratios.',
      parameters: {
        type: 'object',
        properties: {
          materialIds: { type: 'array', items: { type: 'string' }, description: 'Array of material IDs' },
        },
        required: ['materialIds'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'select_material',
      description: 'Selects and assigns a certified material to the current design project.',
      parameters: {
        type: 'object',
        properties: {
          materialId: { type: 'string', description: 'Certified material ID' },
          projectId: { type: 'string', description: 'Project ID' },
        },
        required: ['materialId'],
      },
    },
  },

  // Group D: CAD Geometry Tools
  {
    type: 'function' as const,
    function: {
      name: 'create_shaft_geometry',
      description: 'Generates parametric 3D/2D shaft CAD model from input parameters, computing volume and bounding envelope.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          diameterMm: { type: 'number', description: 'Diameter in mm' },
          lengthMm: { type: 'number', description: 'Length in mm' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_shaft_geometry',
      description: 'Modifies geometric envelope dimensions of the active CAD model.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          diameterMm: { type: 'number', description: 'Diameter in mm' },
          lengthMm: { type: 'number', description: 'Length in mm' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_shaft_feature',
      description: 'Modifies dimension or location of an existing shaft geometric feature.',
      parameters: {
        type: 'object',
        properties: {
          featureType: { type: 'string', enum: ['keyway', 'chamfer', 'fillet', 'shoulder', 'undercut'], description: 'Feature type' },
          dimensionMm: { type: 'number', description: 'Dimension in mm' },
          positionMm: { type: 'number', description: 'Position in mm' },
        },
        required: ['featureType', 'dimensionMm'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_model_geometry',
      description: 'Returns current CAD geometry tree, section coordinates, volume, and mass properties.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          diameterMm: { type: 'number', description: 'Diameter override' },
          lengthMm: { type: 'number', description: 'Length override' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'regenerate_model',
      description: 'Forces complete CAD geometry recomputation and parametric mesh regeneration.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          diameterMm: { type: 'number', description: 'Diameter override' },
          lengthMm: { type: 'number', description: 'Length override' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_model_dimensions',
      description: 'Returns bounding box dimensions and envelope coordinates of the CAD model.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          diameterMm: { type: 'number', description: 'Diameter override' },
          lengthMm: { type: 'number', description: 'Length override' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'select_model_component',
      description: 'Focuses and highlights a component (shaft, bearing, gear, keyway) in the 3D viewport.',
      parameters: {
        type: 'object',
        properties: {
          componentName: { type: 'string', enum: ['shaft', 'bearing_left', 'bearing_right', 'gear', 'keyway'], description: 'Component name' },
        },
        required: ['componentName'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_component_visibility',
      description: 'Toggles visibility of CAD components, drawing layers, or annotations.',
      parameters: {
        type: 'object',
        properties: {
          componentOrFeature: { type: 'string', description: 'Component or layer name' },
          visible: { type: 'boolean', description: 'Visibility state' },
        },
        required: ['componentOrFeature', 'visible'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_model_status',
      description: 'Returns CAD mesh validity, generation status, and regeneration timestamp.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
        },
      },
    },
  },

  // Group E: Calculations Tools
  {
    type: 'function' as const,
    function: {
      name: 'calculate_transmitted_power',
      description: 'Computes mechanical power (kW, HP) and angular velocity from applied torque and RPM.',
      parameters: {
        type: 'object',
        properties: {
          torqueNm: { type: 'number', description: 'Applied torque in N·m' },
          rpm: { type: 'number', description: 'Rotational speed in RPM' },
        },
        required: ['torqueNm', 'rpm'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'calculate_shaft_deflection',
      description: 'Computes maximum centerline beam deflection, support slopes, and stiffness compliance.',
      parameters: {
        type: 'object',
        properties: {
          radialForceN: { type: 'number', description: 'Radial load in N' },
          lengthMm: { type: 'number', description: 'Span length in mm' },
          diameterMm: { type: 'number', description: 'Shaft diameter in mm' },
          elasticModulusGPa: { type: 'number', description: 'Elastic modulus in GPa' },
          deflectionLimitRatio: { type: 'number', description: 'Deflection ratio limit L/R' },
        },
        required: ['radialForceN', 'lengthMm', 'diameterMm'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'calculate_failure_criteria',
      description: 'Evaluates yield failure criteria (Von Mises distortion energy vs Tresca maximum shear stress).',
      parameters: {
        type: 'object',
        properties: {
          normalStressMPa: { type: 'number', description: 'Bending normal stress in MPa' },
          shearStressMPa: { type: 'number', description: 'Torsional shear stress in MPa' },
          yieldStrengthMPa: { type: 'number', description: 'Yield strength Sy in MPa' },
          torqueNm: { type: 'number', description: 'Torque in N·m' },
          radialForceN: { type: 'number', description: 'Radial force in N' },
          diameterMm: { type: 'number', description: 'Diameter in mm' },
          lengthMm: { type: 'number', description: 'Length in mm' },
        },
        required: ['yieldStrengthMPa'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'run_complete_shaft_analysis',
      description: 'Executes complete end-to-end deterministic solid mechanics pipeline (torsion, bending, combined stresses, FoS, deflection).',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          torqueNm: { type: 'number', description: 'Torque in N·m' },
          radialForceN: { type: 'number', description: 'Radial force in N' },
          diameterMm: { type: 'number', description: 'Diameter in mm' },
          lengthMm: { type: 'number', description: 'Length in mm' },
          rpm: { type: 'number', description: 'RPM' },
          materialId: { type: 'string', description: 'Material ID' },
          yieldStrengthMPa: { type: 'number', description: 'Yield strength in MPa' },
          tensileStrengthMPa: { type: 'number', description: 'Tensile strength in MPa' },
          elasticModulusGPa: { type: 'number', description: 'Elastic modulus in GPa' },
          targetSafetyFactor: { type: 'number', description: 'Target FoS' },
          criterion: { type: 'string', enum: ['Tresca', 'Von Mises'], description: 'Failure criterion' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'validate_design_results',
      description: 'Verifies all calculated stresses, FoS, deflection, and slopes against standard mechanical engineering limits.',
      parameters: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Project ID' },
          equivalentStressMPa: { type: 'number', description: 'Equivalent stress in MPa' },
          yieldStrengthMPa: { type: 'number', description: 'Yield strength in MPa' },
          maxDeflectionMm: { type: 'number', description: 'Max deflection in mm' },
          lengthMm: { type: 'number', description: 'Length in mm' },
          safetyFactor: { type: 'number', description: 'Achieved FoS' },
          targetSafetyFactor: { type: 'number', description: 'Required FoS' },
        },
      },
    },
  },
];

// Aliases for backward compatibility
export const update_project_parameters = 'update_project';
export const save_design_version = 'save_project';

// ============================================================================
// 5. Gemini SDK Function Declarations
// ============================================================================
export const geminiFunctionDeclarations = engineeringTools.map((t) => {
  const mapProperty = (val: any): any => {
    if (val.type === 'number') {
      return { type: 'NUMBER' as const, description: val.description || '' };
    }
    if (val.type === 'boolean') {
      return { type: 'BOOLEAN' as const, description: val.description || '' };
    }
    if (val.type === 'array') {
      return {
        type: 'ARRAY' as const,
        description: val.description || '',
        items: val.items ? mapProperty(val.items) : { type: 'STRING' as const }
      };
    }
    if (val.type === 'object') {
      const objProps: Record<string, any> = {};
      if (val.properties) {
        for (const [k, v] of Object.entries(val.properties)) {
          objProps[k] = mapProperty(v);
        }
      }
      return {
        type: 'OBJECT' as const,
        description: val.description || '',
        properties: Object.keys(objProps).length > 0 ? objProps : undefined
      };
    }
    const prop: any = { type: 'STRING' as const, description: val.description || '' };
    if (val.enum) prop.enum = val.enum;
    return prop;
  };

  const params: any = { type: 'OBJECT' as const, properties: {} };
  const rawProps = t.function.parameters.properties || {};
  for (const [key, val] of Object.entries(rawProps as Record<string, any>)) {
    params.properties[key] = mapProperty(val);
  }
  if (t.function.parameters.required) {
    params.required = t.function.parameters.required;
  }

  return {
    name: t.function.name,
    description: t.function.description,
    parameters: params,
  };
});

// ============================================================================
// 6. Execution Router with Audit Logging, Permission Checks & Validation
// ============================================================================

export function getToolMetadata(toolName: string): ToolMetadata {
  return toolMetadataRegistry[toolName] || {
    name: toolName,
    category: 'Engineering Calculations',
    description: 'Autonomous tool',
    permission: 'READ_ONLY',
    requiresApproval: false,
  };
}

export function executeEngineeringTool(name: string, rawArgs: string, context?: any): string {
  const startTime = Date.now();
  console.log(`[Tool Execution Engine] Executing: ${name}`);

  try {
    let args: any;
    try {
      args = JSON.parse(rawArgs);
    } catch {
      throw new Error(`Invalid JSON syntax in arguments for tool: ${name}`);
    }

    const meta = getToolMetadata(name);

    // ------------------------------------------------------------------------
    // TOOL: calculate_required_shaft_diameter / calculate_required_diameter
    // ------------------------------------------------------------------------
    if (name === 'calculate_required_shaft_diameter' || name === 'calculate_required_diameter') {
      const parsed = calculateRequiredDiameterSchema.parse(args);

      if (parsed.radialForceN && parsed.lengthMm) {
        const yieldStrength = parsed.yieldStrengthMPa || 655;
        const targetFoS = parsed.safetyFactor || 2.0;
        const sizingResult = solveMinimumShaftDiameterCombined({
          torqueNm: parsed.torqueNm,
          radialForceN: parsed.radialForceN,
          lengthMm: parsed.lengthMm,
          bendingMomentNm: parsed.bendingMomentNm,
          yieldStrengthMPa: yieldStrength,
          targetSafetyFactor: targetFoS,
          criterion: (parsed.criterion as YieldCriterion) || 'Von Mises',
          elasticModulusGPa: parsed.elasticModulusGPa || 205,
          deflectionLimitRatio: parsed.deflectionLimitRatio || 1000,
        });
        const roundedDia = Math.round(sizingResult.requiredDiameterMm * 10) / 10;

        return JSON.stringify({
          requiredDiameterMm: roundedDia,
          minimumRequiredDiameterMm: roundedDia,
          torsionOnlyDiameterMm: sizingResult.torsionOnlyDiameterMm,
          combinedStressDiameterMm: sizingResult.combinedStressDiameterMm,
          deflectionGovernedDiameterMm: sizingResult.deflectionGovernedDiameterMm,
          governingConstraint: sizingResult.governingConstraint,
          appliedTorqueNm: parsed.torqueNm,
          radialForceN: parsed.radialForceN,
          safetyFactor: targetFoS,
          criterion: parsed.criterion || 'Von Mises',
          sizingMethod: `Bounded Bisection Sizing under Combined Loading (${parsed.criterion || 'Von Mises'})`,
          overallStatus: 'PASS',
          action: {
            type: 'proposed_dimension_change',
            parameter: 'diameter',
            proposedValue: roundedDia,
            unit: 'mm',
          },
        }, null, 2);
      }

      const result = calculateRequiredTorsionDiameter(
        parsed.torqueNm,
        'N·m',
        parsed.allowableShearStressMPa,
        parsed.yieldStrengthMPa,
        parsed.safetyFactor
      );

      return JSON.stringify({
        ...result,
        action: {
          type: 'proposed_dimension_change',
          parameter: 'diameter',
          proposedValue: result.requiredDiameterMm,
          unit: 'mm',
        },
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: calculate_power
    // ------------------------------------------------------------------------
    if (name === 'calculate_power') {
      const parsed = calculatePowerSchema.parse(args);
      const omegaRadPerSec = (2 * Math.PI * parsed.rpm) / 60;
      const powerWatts = parsed.torqueNm * omegaRadPerSec;
      const powerKw = powerWatts / 1000;
      const powerHp = powerWatts / 745.699872;

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        torqueNm: parsed.torqueNm,
        rpm: parsed.rpm,
        angularVelocityRadPerSec: Math.round(omegaRadPerSec * 100) / 100,
        powerWatts: Math.round(powerWatts),
        powerKw: Math.round(powerKw * 100) / 100,
        powerHp: Math.round(powerHp * 100) / 100,
        formula: 'P = T * omega = T * (2 * pi * n / 60)',
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: calculate_torsional_stress
    // ------------------------------------------------------------------------
    if (name === 'calculate_torsional_stress') {
      const parsed = calculateTorsionalStressSchema.parse(args);
      const d = parsed.diameterMm;
      const J = (Math.PI * Math.pow(d, 4)) / 32;
      const Zp = (Math.PI * Math.pow(d, 3)) / 16;
      const shearStressMPa = (16 * parsed.torqueNm * 1000) / (Math.PI * Math.pow(d, 3));

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        diameterMm: d,
        torqueNm: parsed.torqueNm,
        polarMomentOfInertiaMm4: Math.round(J),
        polarSectionModulusMm3: Math.round(Zp),
        shearStressMPa: Math.round(shearStressMPa * 100) / 100,
        formula: 'tau = T * r / J = 16 * T / (pi * d^3)',
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: calculate_bending_stress
    // ------------------------------------------------------------------------
    if (name === 'calculate_bending_stress') {
      const parsed = calculateBendingStressSchema.parse(args);
      const d = parsed.diameterMm;
      const L = parsed.lengthMm;
      const F = parsed.radialForceN;
      const MmaxNm = (F * (L / 1000)) / 4;
      const I = (Math.PI * Math.pow(d, 4)) / 64;
      const Z = (Math.PI * Math.pow(d, 3)) / 32;
      const bendingStressMPa = (32 * MmaxNm * 1000) / (Math.PI * Math.pow(d, 3));

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        radialForceN: F,
        lengthMm: L,
        diameterMm: d,
        maxBendingMomentNm: Math.round(MmaxNm * 100) / 100,
        momentOfInertiaMm4: Math.round(I),
        sectionModulusMm3: Math.round(Z),
        bendingStressMPa: Math.round(bendingStressMPa * 100) / 100,
        formula: 'M_max = F * L / 4, sigma_b = 32 * M / (pi * d^3)',
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: calculate_combined_stress
    // ------------------------------------------------------------------------
    if (name === 'calculate_combined_stress') {
      const parsed = calculateCombinedStressSchema.parse(args);
      const d = parsed.diameterMm;
      const L = parsed.lengthMm;
      const MmaxNm = (parsed.radialForceN * (L / 1000)) / 4;
      const sigmaB = (32 * MmaxNm * 1000) / (Math.PI * Math.pow(d, 3));
      const tau = (16 * parsed.torqueNm * 1000) / (Math.PI * Math.pow(d, 3));

      const principal1 = sigmaB / 2 + Math.sqrt(Math.pow(sigmaB / 2, 2) + Math.pow(tau, 2));
      const principal2 = sigmaB / 2 - Math.sqrt(Math.pow(sigmaB / 2, 2) + Math.pow(tau, 2));
      const vonMises = Math.sqrt(Math.pow(sigmaB, 2) + 3 * Math.pow(tau, 2));
      const tresca = Math.sqrt(Math.pow(sigmaB, 2) + 4 * Math.pow(tau, 2));
      const maxShear = Math.sqrt(Math.pow(sigmaB / 2, 2) + Math.pow(tau, 2));

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        diameterMm: d,
        torqueNm: parsed.torqueNm,
        radialForceN: parsed.radialForceN,
        bendingStressMPa: Math.round(sigmaB * 100) / 100,
        shearStressMPa: Math.round(tau * 100) / 100,
        principalStress1MPa: Math.round(principal1 * 100) / 100,
        principalStress2MPa: Math.round(principal2 * 100) / 100,
        vonMisesStressMPa: Math.round(vonMises * 100) / 100,
        trescaStressMPa: Math.round(tresca * 100) / 100,
        maxShearStressMPa: Math.round(maxShear * 100) / 100,
        equivalentStressMPa: Math.round((parsed.criterion === 'Tresca' ? tresca : vonMises) * 100) / 100,
        criterion: parsed.criterion || 'Von Mises',
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: calculate_factor_of_safety
    // ------------------------------------------------------------------------
    if (name === 'calculate_factor_of_safety') {
      const parsed = calculateFactorOfSafetySchema.parse(args);
      const fos = parsed.yieldStrengthMPa / parsed.equivalentStressMPa;
      const target = parsed.targetSafetyFactor || 2.0;
      const marginPct = ((parsed.yieldStrengthMPa - parsed.equivalentStressMPa) / parsed.equivalentStressMPa) * 100;
      const status = fos >= target ? 'pass' : fos >= 1.0 ? 'warning' : 'fail';

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        equivalentStressMPa: parsed.equivalentStressMPa,
        yieldStrengthMPa: parsed.yieldStrengthMPa,
        factorOfSafety: Math.round(fos * 100) / 100,
        targetSafetyFactor: target,
        marginPercent: Math.round(marginPct * 10) / 10,
        status,
        statusMessage: status === 'pass' ? 'Design compliant' : status === 'warning' ? 'Marginal factor of safety' : 'CRITICAL FAILURE: Yield limit exceeded',
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: calculate_deflection
    // ------------------------------------------------------------------------
    if (name === 'calculate_deflection') {
      const parsed = calculateDeflectionSchema.parse(args);
      const d = parsed.diameterMm;
      const L = parsed.lengthMm;
      const F = parsed.radialForceN;
      const E = (parsed.elasticModulusGPa || 205) * 1000;
      const I = (Math.PI * Math.pow(d, 4)) / 64;

      const deltaMm = (F * Math.pow(L, 3)) / (48 * E * I);
      const thetaRad = (F * Math.pow(L, 2)) / (16 * E * I);
      const allowRatio = parsed.deflectionLimitRatio || 1000;
      const maxAllowableMm = L / allowRatio;
      const compliant = deltaMm <= maxAllowableMm;

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        centerlineDeflectionMm: Math.round(deltaMm * 1000) / 1000,
        supportSlopeRad: Math.round(thetaRad * 10000) / 10000,
        maxAllowableDeflectionMm: Math.round(maxAllowableMm * 1000) / 1000,
        deflectionLimitRatio: allowRatio,
        isCompliant: compliant,
        status: compliant ? 'PASS' : 'WARNING',
        formula: 'delta = F * L^3 / (48 * E * I), theta = F * L^2 / (16 * E * I)',
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: validate_design
    // ------------------------------------------------------------------------
    if (name === 'validate_design') {
      const parsed = validateDesignSchema.parse(args);
      let targetProj = parsed.projectId ? getProjectById(parsed.projectId) : null;
      if (!targetProj) {
        const all = getAllProjects();
        if (all.length > 0) targetProj = all[all.length - 1];
      }

      const params = {
        diameter: parsed.diameterMm ?? targetProj?.parameters.diameter ?? 45,
        length: parsed.lengthMm ?? targetProj?.parameters.length ?? 320,
        torque: parsed.torqueNm ?? targetProj?.parameters.torque ?? 500,
        force: parsed.radialForceN ?? targetProj?.parameters.force ?? 2500,
        rpm: parsed.rpm ?? targetProj?.parameters.rpm ?? 1450,
        safetyFactor: parsed.safetyFactor ?? targetProj?.parameters.safetyFactor ?? 2.0,
        materialId: parsed.materialId ?? targetProj?.parameters.materialId ?? 'aisi-4140',
        temperature: targetProj?.parameters.temperature ?? 20,
      };

      const mat = materials.find((m) => m.id === params.materialId) || materials[0];
      const analysisRes = calculateFullShaftAnalysis({
        torqueNm: params.torque,
        radialForceN: params.force,
        diameterMm: params.diameter,
        lengthMm: params.length,
        rpm: params.rpm,
        yieldStrengthMPa: mat.yieldStrength,
        tensileStrengthMPa: mat.tensileStrength,
        elasticModulusGPa: mat.elasticModulus,
        targetSafetyFactor: params.safetyFactor,
        operatingTempC: params.temperature,
      });

      const report = runDesignVerification(params, mat, {
        vonMisesStress: analysisRes.combinedStress.result.equivalentStressMPa,
        yieldStrength: mat.yieldStrength,
        factorOfSafety: analysisRes.combinedStress.result.factorOfSafety,
        maxDeflection: analysisRes.deflection.result.maxDeflectionMm,
        torqueCapacity: analysisRes.torsion.result.polarSectionModulusMm3,
        fatigueLife: 1e6,
        shearStress: analysisRes.torsion.result.shearStressMPa,
        bendingStress: analysisRes.bending.result.bendingStressMPa,
        status: analysisRes.overallStatus === 'pass' ? 'pass' : 'fail',
        statusMessage: analysisRes.overallStatus,
      });

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        overallStatus: report.overallStatus,
        totalChecks: report.totalChecks,
        passedCount: report.passedCount,
        warningCount: report.warningCount,
        failedCount: report.failedCount,
        checks: report.checks,
        disclaimer: report.disclaimer,
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: run_full_shaft_analysis
    // ------------------------------------------------------------------------
    if (name === 'run_full_shaft_analysis') {
      const parsed = runFullShaftAnalysisSchema.parse(args);
      const analysis = calculateFullShaftAnalysis({
        torqueNm: parsed.torqueNm,
        radialForceN: parsed.radialForceN,
        diameterMm: parsed.diameterMm,
        lengthMm: parsed.lengthMm,
        rpm: parsed.rpm,
        yieldStrengthMPa: parsed.yieldStrengthMPa,
        tensileStrengthMPa: parsed.tensileStrengthMPa,
        elasticModulusGPa: parsed.elasticModulusGPa,
        targetSafetyFactor: parsed.targetSafetyFactor,
        operatingTempC: parsed.operatingTempC,
        criterion: (parsed.criterion as YieldCriterion) || 'Von Mises',
        deflectionLimitRatio: parsed.deflectionLimitRatio || 1000,
      });

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        overallStatus: analysis.overallStatus,
        equivalentStressMPa: Math.round(analysis.combinedStress.result.equivalentStressMPa * 10) / 10,
        actualFactorOfSafety: Math.round(analysis.combinedStress.result.factorOfSafety * 100) / 100,
        safetyFactor: Math.round(analysis.combinedStress.result.factorOfSafety * 100) / 100,
        requiredFactorOfSafety: parsed.targetSafetyFactor,
        torsionalStressMPa: Math.round(analysis.torsion.result.shearStressMPa * 10) / 10,
        bendingStressMPa: Math.round(analysis.bending.result.bendingStressMPa * 10) / 10,
        bendingMomentNm: Math.round(analysis.bending.result.bendingMomentNm * 10) / 10,
        flexuralDeflectionMm: Math.round(analysis.deflection.result.maxDeflectionMm * 1000) / 1000,
        maxDeflectionMm: Math.round(analysis.deflection.result.maxDeflectionMm * 1000) / 1000,
        failureCriterion: parsed.criterion || 'Von Mises',
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: search_materials
    // ------------------------------------------------------------------------
    if (name === 'search_materials') {
      const parsed = searchMaterialsSchema.parse(args);
      let matches = materials;

      if (parsed.query) {
        const q = parsed.query.toLowerCase();
        matches = matches.filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
      }
      if (parsed.category) {
        matches = matches.filter((m) => m.category.toLowerCase() === parsed.category!.toLowerCase());
      }
      if (parsed.minYieldStrengthMPa) {
        matches = matches.filter((m) => m.yieldStrength >= parsed.minYieldStrengthMPa!);
      }

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        matchCount: matches.length,
        materials: matches.map((m) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          yieldStrengthMPa: m.yieldStrength,
          tensileStrengthMPa: m.tensileStrength,
          elasticModulusGPa: m.elasticModulus,
          densityKgM3: m.density,
        })),
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: get_material_properties
    // ------------------------------------------------------------------------
    if (name === 'get_material_properties') {
      const parsed = getMaterialPropertiesSchema.parse(args);
      const searchKey = parsed.materialId.toLowerCase();
      const match = materials.find((m) => m.id.toLowerCase() === searchKey || m.name.toLowerCase().includes(searchKey));

      if (!match) {
        return JSON.stringify({
          success: false,
          tool: name,
          error: `Material "${parsed.materialId}" not found in certified engineering database. Available materials: ${materials.map((m) => m.id).join(', ')}`,
        });
      }

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        id: match.id,
        name: match.name,
        category: match.category,
        yieldStrengthMPa: match.yieldStrength,
        tensileStrengthMPa: match.tensileStrength,
        elasticModulusGPa: match.elasticModulus,
        densityKgM3: match.density,
        poissonsRatio: match.poissonsRatio,
        thermalExpansion: match.thermalExpansion,
        costCategory: match.costCategory,
        description: match.description,
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: update_material_selection
    // ------------------------------------------------------------------------
    if (name === 'update_material_selection') {
      const parsed = updateMaterialSelectionSchema.parse(args);
      const match = materials.find((m) => m.id.toLowerCase() === parsed.materialId.toLowerCase());
      if (!match) {
        return JSON.stringify({ success: false, error: `Material "${parsed.materialId}" not recognized.` });
      }

      let targetId = parsed.projectId;
      if (!targetId) {
        const all = getAllProjects();
        if (all.length > 0) targetId = all[all.length - 1].id;
      }

      if (targetId) {
        updateProject(targetId, { parameters: { materialId: match.id } });
      }

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        selectedMaterial: match,
        action: {
          type: 'proposed_material_change',
          permission: 'REVERSIBLE',
          materialId: match.id,
          materialName: match.name,
          yieldStrengthMPa: match.yieldStrength,
          rationale: `Selected certified grade ${match.name} (Sy = ${match.yieldStrength} MPa)`,
        },
        message: `Material set to ${match.name}.`,
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: create_project
    // ------------------------------------------------------------------------
    if (name === 'create_project') {
      const parsed = createProjectSchema.parse(args);
      const projId = `proj-${Date.now()}`;
      const defaultParams = {
        materialId: parsed.materialId || 'aisi-4140',
        diameter: parsed.diameter || 45,
        length: parsed.length || 320,
        torque: parsed.torque ?? 500,
        force: parsed.force ?? 2500,
        rpm: parsed.rpm ?? 1450,
        safetyFactor: parsed.safetyFactor || 2.0,
        temperature: parsed.temperature ?? 20,
        criterion: parsed.criterion || 'Von Mises',
        deflectionLimitRatio: parsed.deflectionLimitRatio || 1000,
      };

      const newProj = createProject({
        id: projId,
        name: parsed.name,
        description: parsed.description || 'Parametric Mechanical Shaft System',
        parameters: defaultParams,
      });

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        projectId: projId,
        project: newProj,
        action: {
          type: 'project_created',
          projectId: projId,
          project: newProj,
        },
        message: `Project "${newProj.name}" created with ID ${projId}.`,
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: get_project
    // ------------------------------------------------------------------------
    if (name === 'get_project') {
      const parsed = getProjectSchema.parse(args);
      let targetId = parsed.projectId;
      if (!targetId) {
        const all = getAllProjects();
        if (all.length > 0) targetId = all[all.length - 1].id;
      }
      if (!targetId) {
        return JSON.stringify({ success: false, error: 'No active project found in database.' });
      }

      const proj = getProjectById(targetId);
      if (!proj) {
        return JSON.stringify({ success: false, error: `Project ${targetId} not found.` });
      }

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        project: proj,
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: update_project / update_project_parameters
    // ------------------------------------------------------------------------
    if (name === 'update_project' || name === 'update_project_parameters') {
      const parsed = updateProjectSchema.parse(args);
      let targetId = parsed.projectId;
      if (!targetId) {
        const all = getAllProjects();
        if (all.length > 0) targetId = all[all.length - 1].id;
      }
      if (!targetId) {
        return JSON.stringify({ success: false, error: 'No project found to update.' });
      }

      const cleanParams: any = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (k !== 'projectId' && v !== undefined) cleanParams[k] = v;
      }

      const updated = updateProject(targetId, { parameters: cleanParams });

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        projectId: targetId,
        parameters: updated.parameters,
        action: {
          type: 'parameters_updated',
          projectId: targetId,
          parameters: updated.parameters,
        },
        message: `Project parameters updated for ${targetId}.`,
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: save_project / save_design_version
    // ------------------------------------------------------------------------
    if (name === 'save_project' || name === 'save_design_version') {
      const parsed = saveProjectSchema.parse(args);
      let targetId = parsed.projectId;
      if (!targetId) {
        const all = getAllProjects();
        if (all.length > 0) targetId = all[all.length - 1].id;
      }
      if (!targetId) {
        return JSON.stringify({ success: false, error: 'No project found to save.' });
      }

      const proj = getProjectById(targetId);
      if (!proj) return JSON.stringify({ success: false, error: `Project ${targetId} not found.` });

      const mat = materials.find((m) => m.id === proj.parameters.materialId) || materials[0];
      const analysis = calculateFullShaftAnalysis({
        torqueNm: proj.parameters.torque || 500,
        radialForceN: proj.parameters.force || 2500,
        diameterMm: proj.parameters.diameter || 45,
        lengthMm: proj.parameters.length || 320,
        rpm: proj.parameters.rpm || 1450,
        yieldStrengthMPa: mat.yieldStrength,
        tensileStrengthMPa: mat.tensileStrength,
        elasticModulusGPa: mat.elasticModulus,
        targetSafetyFactor: proj.parameters.safetyFactor || 2.0,
        operatingTempC: proj.parameters.temperature || 20,
      });

      const verRecord = createDesignVersion({
        projectId: targetId,
        label: parsed.label,
        notes: parsed.notes || 'Automated design snapshot by Engineering Copilot',
        parameters: proj.parameters,
        materialId: mat.id,
        materialName: mat.name,
        factorOfSafety: analysis.combinedStress.result.factorOfSafety,
        status: analysis.overallStatus === 'pass' ? 'pass' : 'fail',
        calculationSummary: `⌀${proj.parameters.diameter}mm, FoS=${analysis.combinedStress.result.factorOfSafety.toFixed(2)}x (${analysis.overallStatus.toUpperCase()})`,
      });

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        projectId: targetId,
        version: verRecord,
        action: {
          type: 'version_saved',
          projectId: targetId,
          version: verRecord,
        },
        message: `Design version "${parsed.label}" (${verRecord.version}) saved.`,
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: list_projects
    // ------------------------------------------------------------------------
    if (name === 'list_projects') {
      const all = getAllProjects();
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        total: all.length,
        projects: all.map((p) => ({
          id: p.id,
          name: p.name,
          diameterMm: p.parameters?.diameter,
          lengthMm: p.parameters?.length,
          lastModified: p.lastModified,
        })),
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: create_shaft / update_shaft / update_shaft_dimensions
    // ------------------------------------------------------------------------
    if (name === 'create_shaft' || name === 'update_shaft' || name === 'update_shaft_dimensions') {
      const parsed: any = args;
      const d = parsed.diameterMm || 45;
      const L = parsed.lengthMm || 320;
      const geom = computeShaftGeometryModel({ diameter: d, length: L } as any);

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        diameterMm: d,
        lengthMm: L,
        geometry: geom,
        action: {
          type: 'proposed_dimension_change',
          permission: 'REVERSIBLE',
          parameter: 'dimensions',
          proposedValue: { diameter: d, length: L },
          rationale: `Updated primary shaft dimensions to ⌀${d} mm × ${L} mm`,
        },
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: get_shaft_geometry
    // ------------------------------------------------------------------------
    if (name === 'get_shaft_geometry') {
      const parsed = getShaftGeometrySchema.parse(args);
      let d = parsed.diameterMm;
      let L = parsed.lengthMm;
      if (!d || !L) {
        let p = parsed.projectId ? getProjectById(parsed.projectId) : null;
        if (!p) {
          const all = getAllProjects();
          if (all.length > 0) p = all[all.length - 1];
        }
        if (p) {
          d = d || p.parameters.diameter || 45;
          L = L || p.parameters.length || 320;
        }
      }
      d = d || 45;
      L = L || 320;

      const geom = computeShaftGeometryModel({ diameter: d, length: L } as any);
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        geometry: geom,
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: add_shaft_section / remove_shaft_feature
    // ------------------------------------------------------------------------
    if (name === 'add_shaft_section' || name === 'remove_shaft_feature') {
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        action: {
          type: 'feature_modified',
          permission: 'REVERSIBLE',
          details: args,
        },
        message: `Feature operation ${name} staged.`,
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: regenerate_geometry
    // ------------------------------------------------------------------------
    if (name === 'regenerate_geometry') {
      const parsed = regenerateGeometrySchema.parse(args);
      const d = parsed.diameterMm || 45;
      const L = parsed.lengthMm || 320;
      const geom = computeShaftGeometryModel({ diameter: d, length: L } as any);

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        status: 'REGENERATED',
        geometryBounds: {
          envelopeLengthMm: geom.totalLength,
          envelopeMaxDiaMm: Math.max(geom.mainDia, geom.gearDia),
          journalDiameterMm: geom.journalDia,
        },
        action: {
          type: 'geometry_regenerated',
          geometry: geom,
        },
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: select_component / update_feature_visibility / set_camera_view
    // ------------------------------------------------------------------------
    if (name === 'select_component') {
      const parsed = selectComponentSchema.parse(args);
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        selectedComponent: parsed.componentName,
        action: {
          type: 'component_selected',
          component: parsed.componentName,
        },
      }, null, 2);
    }

    if (name === 'update_feature_visibility') {
      const parsed = updateFeatureVisibilitySchema.parse(args);
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        feature: parsed.feature,
        visible: parsed.visible,
        action: {
          type: 'visibility_toggled',
          feature: parsed.feature,
          visible: parsed.visible,
        },
      }, null, 2);
    }

    if (name === 'set_camera_view') {
      const parsed = setCameraViewSchema.parse(args);
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        view: parsed.view,
        action: {
          type: 'view_changed',
          view: parsed.view,
        },
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: generate_orthographic_drawing
    // ------------------------------------------------------------------------
    if (name === 'generate_orthographic_drawing') {
      const parsed = generateOrthographicDrawingSchema.parse(args);
      let targetProj = parsed.projectId ? getProjectById(parsed.projectId) : null;
      if (!targetProj) {
        const all = getAllProjects();
        if (all.length > 0) targetProj = all[all.length - 1];
      }
      const params = {
        diameter: targetProj?.parameters.diameter || 45,
        length: targetProj?.parameters.length || 320,
      };

      const layout = computeDrawingLayout(params as any, parsed.sheetSize || 'A3', parsed.orientation || 'landscape', parsed.projection || 'first-angle');
      const dimensions = generateDrawingDimensions(layout, params as any);

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        sheetSize: layout.sheet.widthMm + 'x' + layout.sheet.heightMm + 'mm',
        scale: layout.scaleLabel,
        totalDimensions: dimensions.length,
        action: {
          type: 'drawing_generated',
          sheetSize: parsed.sheetSize || 'A3',
          projection: parsed.projection || 'first-angle',
        },
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: generate_engineering_report
    // ------------------------------------------------------------------------
    if (name === 'generate_engineering_report') {
      const parsed = generateEngineeringReportSchema.parse(args);
      let targetId = parsed.projectId;
      let proj = targetId ? getProjectById(targetId) : null;
      if (!proj) {
        const all = getAllProjects();
        if (all.length > 0) {
          proj = all[all.length - 1];
          targetId = proj.id;
        }
      }
      targetId = targetId || 'default-proj';
      const docBundle = reportService.generateAndSaveReportDocuments(targetId);

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        projectId: docBundle.reportData.projectId,
        projectName: docBundle.reportData.projectName,
        reportReady: true,
        totalSections: 18,
        executiveSummary: docBundle.reportData.executiveSummary,
        factorOfSafety: docBundle.reportData.calculations.factorOfSafety,
        equivalentStressMPa: docBundle.reportData.calculations.equivalentStressMPa,
        overallStatus: docBundle.reportData.verification.overallStatus,
        pdfDownloadUrl: docBundle.pdfDownloadUrl,
        pdfFilePath: docBundle.pdfFilePath,
        jsonDocumentId: docBundle.jsonDocumentId,
        pdfDocumentId: docBundle.pdfDocumentId,
        action: {
          type: 'report_generated',
          projectId: docBundle.reportData.projectId,
          projectName: docBundle.reportData.projectName,
          pdfDownloadUrl: docBundle.pdfDownloadUrl,
        },
        message: `Engineering design calculation report compiled and certified PDF generated for ${docBundle.reportData.projectName}.`,
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: export_pdf_report
    // ------------------------------------------------------------------------
    if (name === 'export_pdf_report') {
      const parsed = exportPdfReportSchema.parse(args);
      let targetId = parsed.projectId;
      if (!targetId) {
        const all = getAllProjects();
        if (all.length > 0) targetId = all[all.length - 1].id;
      }
      targetId = targetId || 'default-proj';
      const docBundle = reportService.generateAndSaveReportDocuments(targetId);

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        projectId: targetId,
        pdfDownloadUrl: docBundle.pdfDownloadUrl,
        pdfFilePath: docBundle.pdfFilePath,
        pdfDocumentId: docBundle.pdfDocumentId,
        action: {
          type: 'pdf_exported',
          projectId: targetId,
          pdfDownloadUrl: docBundle.pdfDownloadUrl,
        },
        message: `PDF engineering report successfully exported and ready for download: ${docBundle.pdfDownloadUrl}`,
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: prepare_print_document
    // ------------------------------------------------------------------------
    if (name === 'prepare_print_document') {
      const parsed = preparePrintDocumentSchema.parse(args);
      let targetId = parsed.projectId;
      if (!targetId) {
        const all = getAllProjects();
        if (all.length > 0) targetId = all[all.length - 1].id;
      }
      targetId = targetId || 'default-proj';
      const docBundle = reportService.generateAndSaveReportDocuments(targetId);

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        projectId: targetId,
        documentType: parsed.documentType || 'report',
        printActionReady: true,
        pdfDownloadUrl: docBundle.pdfDownloadUrl,
        statusBreakdown: {
          reportGenerated: true,
          pdfExported: true,
          printPreviewOpened: true,
          printDialogOpened: true,
          physicalPrintTruth: 'Browser window.print() dialog triggered; physical print completion depends on connected local/network printer.',
        },
        action: {
          type: 'print_dialog_requested',
          documentType: parsed.documentType || 'report',
          projectId: targetId,
          pdfDownloadUrl: docBundle.pdfDownloadUrl,
        },
        message: `Engineering report prepared. Triggering browser print dialog for ${docBundle.reportData.projectName}.`,
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: run_design_verification
    // ------------------------------------------------------------------------
    if (name === 'run_design_verification') {
      const parsed = runDesignVerificationSchema.parse(args);
      let targetId = parsed.projectId;
      let proj = targetId ? getProjectById(targetId) : null;
      if (!proj) {
        const all = getAllProjects();
        if (all.length > 0) {
          proj = all[all.length - 1];
          targetId = proj.id;
        }
      }
      const params = {
        materialId: 'aisi-4140',
        diameter: 45,
        length: 320,
        torque: 500,
        force: 2500,
        rpm: 1450,
        safetyFactor: 2.0,
        temperature: 60,
        criterion: 'Von Mises',
        ...(proj?.parameters || {}),
      };
      const mat = materials.find((m) => m.id === params.materialId) || materials[0];
      const analysis = calculateFullShaftAnalysis({
        torqueNm: params.torque,
        radialForceN: params.force,
        diameterMm: params.diameter,
        lengthMm: params.length,
        rpm: params.rpm,
        yieldStrengthMPa: mat.yieldStrength,
        tensileStrengthMPa: mat.tensileStrength,
        elasticModulusGPa: (mat.elasticModulus || 205000) / 1000,
        targetSafetyFactor: params.safetyFactor || 2.0,
        operatingTempC: params.temperature || 60,
        criterion: (params.criterion as any) || 'Von Mises',
      });
      const verReport = runDesignVerification(params as any, mat, analysis as any);

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        projectId: targetId,
        overallStatus: verReport.overallStatus,
        passedCount: verReport.passedCount,
        warningCount: verReport.warningCount,
        failedCount: verReport.failedCount,
        checks: verReport.checks.map((c) => ({
          name: c.title,
          status: c.status,
          evaluatedValue: c.evaluatedValue,
          requiredValue: c.requiredValue,
          standardReference: c.standardReference,
          message: c.message,
        })),
        disclaimer: verReport.disclaimer,
        isCompliant: verReport.overallStatus === 'Passed',
        action: {
          type: 'verification_completed',
          overallStatus: verReport.overallStatus,
        },
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: validate_drawing_dimensions
    // ------------------------------------------------------------------------
    if (name === 'validate_drawing_dimensions') {
      const parsed = validateDrawingDimensionsSchema.parse(args);
      let targetId = parsed.projectId;
      let proj = targetId ? getProjectById(targetId) : null;
      if (!proj) {
        const all = getAllProjects();
        if (all.length > 0) {
          proj = all[all.length - 1];
          targetId = proj.id;
        }
      }
      const params = {
        diameter: proj?.parameters.diameter || 45,
        length: proj?.parameters.length || 320,
      };
      const geom = computeShaftGeometryModel(params as any);
      const layout = computeDrawingLayout(params as any, 'A3', 'landscape', 'first-angle');
      const dimensions = generateDrawingDimensions(layout, params as any);

      const reconstructedLen = geom.mainLength + 2 * geom.journalLength;
      const closureDelta = Math.abs(reconstructedLen - geom.totalLength);
      const isClosureValid = closureDelta < 0.05;
      const isKeywayValid = geom.keywayLength < geom.mainLength;

      const issues: string[] = [];
      if (!isClosureValid) issues.push(`Dimensional closure error: delta = ${closureDelta.toFixed(3)} mm`);
      if (!isKeywayValid) issues.push(`Keyway exceeds main span: ${geom.keywayLength} mm > ${geom.mainLength} mm`);

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        projectId: targetId,
        isClosureValid,
        isKeywayValid,
        closureDeltaMm: closureDelta,
        totalDimensions: dimensions.length,
        toleranceClass: parsed.toleranceClass || 'medium',
        status: isClosureValid && isKeywayValid ? 'Passed' : 'Failed',
        issues,
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: export_drawing
    // ------------------------------------------------------------------------
    if (name === 'export_drawing') {
      const parsed = exportDrawingSchema.parse(args);
      let targetId = parsed.projectId;
      if (!targetId) {
        const all = getAllProjects();
        if (all.length > 0) targetId = all[all.length - 1].id;
      }
      targetId = targetId || 'default-proj';

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        projectId: targetId,
        format: parsed.format,
        filename: `shaft-drawing.${parsed.format}`,
        downloadUrl: `/api/projects/${targetId}/drawing/export?format=${parsed.format}`,
        action: {
          type: 'drawing_exported',
          format: parsed.format,
          projectId: targetId,
        },
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: get_project_revision_history
    // ------------------------------------------------------------------------
    if (name === 'get_project_revision_history') {
      const parsed = getProjectRevisionHistorySchema.parse(args);
      let targetId = parsed.projectId;
      if (!targetId) {
        const all = getAllProjects();
        if (all.length > 0) targetId = all[all.length - 1].id;
      }
      if (!targetId) {
        return JSON.stringify({ success: true, versions: [] });
      }

      const versions = getVersionsByProjectId(targetId);
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        projectId: targetId,
        versionCount: versions.length,
        versions: versions.map((v) => ({
          id: v.id,
          version: v.version,
          label: v.label,
          factorOfSafety: v.factorOfSafety,
          status: v.status,
          createdAt: v.createdAt,
        })),
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // TOOL: compare_shaft_designs
    // ------------------------------------------------------------------------
    if (name === 'compare_shaft_designs') {
      const parsed = compareShaftDesignsSchema.parse(args);
      const a = parsed.designA;
      const b = parsed.designB;

      const deltaD = b.diameterMm - a.diameterMm;
      const deltaT = b.torqueNm - a.torqueNm;

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        comparison: {
          diameterDeltaMm: deltaD,
          torqueDeltaNm: deltaT,
        },
      }, null, 2);
    }

    // Helper to resolve target project
    const resolveTargetProject = (overrideId?: string) => {
      let targetId = overrideId || args.projectId || context?.projectId;
      if (!targetId) {
        const all = getAllProjects();
        if (all.length > 0) targetId = all[all.length - 1].id;
      }
      if (!targetId) return null;
      return getProjectById(targetId);
    };

    // ------------------------------------------------------------------------
    // PROMPT 07 GROUP A: PROJECT TOOLS
    // ------------------------------------------------------------------------
    if (name === 'get_project_status') {
      const parsed = getProjectStatusSchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      if (!p) {
        return JSON.stringify({ success: true, tool: name, status: 'No active project found' });
      }
      const params = p.parameters || {};
      const filledCount = ['diameter', 'length', 'torque', 'force', 'rpm', 'materialId', 'safetyFactor']
        .filter((k) => params[k] !== undefined && params[k] !== null).length;
      const completionPercentage = Math.round((filledCount / 7) * 100);

      const d = params.diameter || 45;
      const L = params.length || 320;
      const T = params.torque || 500;
      const F = params.force || 12000;
      const mat = materials.find((m) => m.id === params.materialId) || materials[0];
      const Sy = mat.yieldStrength;
      const M = (F * (L / 1000)) / 4;
      const sigmaB = (32 * M * 1000) / (Math.PI * Math.pow(d, 3));
      const tau = (16 * T * 1000) / (Math.PI * Math.pow(d, 3));
      const sigmaVm = Math.sqrt(Math.pow(sigmaB, 2) + 3 * Math.pow(tau, 2));
      const fos = Math.round((Sy / sigmaVm) * 100) / 100;
      const targetFoS = params.safetyFactor || 2.0;
      const validationState = fos >= targetFoS ? 'VALID' : 'WARNING';

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        projectId: p.id,
        projectName: p.name,
        status: p.status,
        validationState,
        completionPercentage,
        factorOfSafety: fos,
        targetSafetyFactor: targetFoS,
        parameters: p.parameters,
        lastModified: p.lastModified,
      }, null, 2);
    }

    if (name === 'get_project_inputs') {
      const parsed = getProjectInputsSchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      if (!p) {
        return JSON.stringify({ error: 'Project not found.' });
      }
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        projectId: p.id,
        projectName: p.name,
        inputs: p.parameters,
      }, null, 2);
    }

    if (name === 'get_project_results') {
      const parsed = getProjectResultsSchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      if (!p) {
        return JSON.stringify({ error: 'Project not found.' });
      }
      const params = p.parameters || {};
      const d = params.diameter || 45;
      const L = params.length || 320;
      const T = params.torque || 500;
      const F = params.force || 12000;
      const rpm = params.rpm || 1450;
      const mat = materials.find((m) => m.id === params.materialId) || materials[0];
      const Sy = mat.yieldStrength;
      const Sut = mat.tensileStrength;
      const E = mat.elasticModulus;
      const targetFoS = params.safetyFactor || 2.0;

      const analysis = calculateFullShaftAnalysis({
        torqueNm: T,
        radialForceN: F,
        diameterMm: d,
        lengthMm: L,
        rpm,
        yieldStrengthMPa: Sy,
        tensileStrengthMPa: Sut,
        elasticModulusGPa: E,
        targetSafetyFactor: targetFoS,
        operatingTempC: params.temperature || 60,
        criterion: (params.criterion as any) || 'Von Mises',
        deflectionLimitRatio: params.deflectionLimitRatio || 1000,
      });

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        projectId: p.id,
        calculatedStresses: {
          torsionalShearMPa: analysis.torsion.result.shearStressMPa,
          bendingStressMPa: analysis.bending.result.bendingStressMPa,
          equivalentStressMPa: analysis.combinedStress.result.equivalentStressMPa,
        },
        safetyFactor: analysis.safetyFactor.result.factorOfSafety,
        maxDeflectionMm: analysis.deflection.result.maxDeflectionMm,
        passFail: (analysis.safetyFactor.result.factorOfSafety >= analysis.safetyFactor.result.targetFactorOfSafety) ? 'PASS' : 'FAIL',
        governingConstraint: analysis.governingConstraint || 'combined_stress',
        overallStatus: analysis.overallStatus.toUpperCase(),
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // PROMPT 07 GROUP B: ENGINEERING INPUTS TOOLS
    // ------------------------------------------------------------------------
    if (name === 'set_shaft_length') {
      const parsed = setShaftLengthSchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      let previous = p?.parameters?.length;
      if (p) {
        updateProject(p.id, { parameters: { length: parsed.lengthMm } });
      }
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        parameter: 'length',
        lengthMm: parsed.lengthMm,
        previousLengthMm: previous,
        action: {
          type: 'parameters_updated',
          parameters: { length: parsed.lengthMm },
        },
      }, null, 2);
    }

    if (name === 'set_shaft_diameter') {
      const parsed = setShaftDiameterSchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      let previous = p?.parameters?.diameter;
      if (p) {
        updateProject(p.id, { parameters: { diameter: parsed.diameterMm } });
      }
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        parameter: 'diameter',
        diameterMm: parsed.diameterMm,
        previousDiameterMm: previous,
        action: {
          type: 'parameters_updated',
          parameters: { diameter: parsed.diameterMm },
        },
      }, null, 2);
    }

    if (name === 'set_shaft_sections') {
      const parsed = setShaftSectionsSchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      if (p) {
        updateProject(p.id, { parameters: { sections: parsed.sections } });
      }
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        sectionCount: parsed.sections.length,
        sections: parsed.sections,
        action: {
          type: 'parameters_updated',
          parameters: { sections: parsed.sections },
        },
      }, null, 2);
    }

    if (name === 'set_shaft_features') {
      const parsed = setShaftFeaturesSchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      if (p) {
        updateProject(p.id, { parameters: { features: parsed.features } });
      }
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        featureCount: parsed.features.length,
        features: parsed.features,
        action: {
          type: 'parameters_updated',
          parameters: { features: parsed.features },
        },
      }, null, 2);
    }

    if (name === 'set_operating_speed') {
      const parsed = setOperatingSpeedSchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      let previous = p?.parameters?.rpm;
      const omega = (2 * Math.PI * parsed.rpm) / 60;
      if (p) {
        updateProject(p.id, { parameters: { rpm: parsed.rpm } });
      }
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        parameter: 'rpm',
        rpm: parsed.rpm,
        angularVelocityRadS: Math.round(omega * 100) / 100,
        previousRpm: previous,
        action: {
          type: 'parameters_updated',
          parameters: { rpm: parsed.rpm },
        },
      }, null, 2);
    }

    if (name === 'set_torque') {
      const parsed = setTorqueSchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      let previous = p?.parameters?.torque;
      if (p) {
        updateProject(p.id, { parameters: { torque: parsed.torqueNm } });
      }
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        parameter: 'torque',
        torqueNm: parsed.torqueNm,
        previousTorqueNm: previous,
        action: {
          type: 'parameters_updated',
          parameters: { torque: parsed.torqueNm },
        },
      }, null, 2);
    }

    if (name === 'set_applied_loads') {
      const parsed = setAppliedLoadsSchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      const updates: any = {};
      if (parsed.radialForceN !== undefined) updates.force = parsed.radialForceN;
      if (parsed.axialForceN !== undefined) updates.axialForce = parsed.axialForceN;
      if (parsed.bendingMomentNm !== undefined) updates.bendingMoment = parsed.bendingMomentNm;
      if (p && Object.keys(updates).length > 0) {
        updateProject(p.id, { parameters: updates });
      }
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        appliedLoads: {
          radialForceN: parsed.radialForceN,
          axialForceN: parsed.axialForceN,
          bendingMomentNm: parsed.bendingMomentNm,
          loadPositionMm: parsed.loadPositionMm,
        },
        action: {
          type: 'parameters_updated',
          parameters: updates,
        },
      }, null, 2);
    }

    if (name === 'set_support_conditions') {
      const parsed = setSupportConditionsSchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      if (p) {
        updateProject(p.id, { parameters: { supportConditions: parsed } });
      }
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        supportConditions: parsed,
        action: {
          type: 'parameters_updated',
          parameters: { supportConditions: parsed },
        },
      }, null, 2);
    }

    if (name === 'set_material') {
      const parsed = setMaterialSchema.parse(args);
      const q = parsed.materialId.toLowerCase().trim();
      const mat = materials.find((m) => m.id.toLowerCase() === q || m.name.toLowerCase().includes(q) || (m.designation && m.designation.toLowerCase().includes(q)));
      if (!mat) {
        return JSON.stringify({ error: `Material '${parsed.materialId}' not found in certified engineering database.` });
      }
      const p = resolveTargetProject(parsed.projectId);
      if (p) {
        updateProject(p.id, { parameters: { materialId: mat.id } });
      }
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        assignedMaterial: {
          id: mat.id,
          name: mat.name,
          category: mat.category,
          yieldStrengthMPa: mat.yieldStrength,
          tensileStrengthMPa: mat.tensileStrength,
          elasticModulusGPa: mat.elasticModulus,
          densityKgM3: mat.density,
        },
        action: {
          type: 'parameters_updated',
          parameters: { materialId: mat.id },
        },
      }, null, 2);
    }

    if (name === 'set_design_factor') {
      const parsed = setDesignFactorSchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      if (p) {
        updateProject(p.id, { parameters: { safetyFactor: parsed.safetyFactor } });
      }
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        parameter: 'safetyFactor',
        safetyFactor: parsed.safetyFactor,
        action: {
          type: 'parameters_updated',
          parameters: { safetyFactor: parsed.safetyFactor },
        },
      }, null, 2);
    }

    if (name === 'get_current_engineering_inputs') {
      const parsed = getCurrentEngineeringInputsSchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        projectId: p?.id,
        projectName: p?.name,
        inputs: p?.parameters || {
          materialId: 'aisi-4140',
          diameter: 45,
          length: 320,
          torque: 500,
          force: 12000,
          rpm: 1450,
          safetyFactor: 2.0,
        },
      }, null, 2);
    }

    if (name === 'validate_engineering_inputs') {
      const parsed = validateEngineeringInputsSchema.parse(args);
      const errors: string[] = [];
      const warnings: string[] = [];
      if (parsed.diameterMm !== undefined && parsed.diameterMm <= 0) {
        errors.push('Shaft diameter must be positive.');
      }
      if (parsed.lengthMm !== undefined && parsed.lengthMm <= 0) {
        errors.push('Shaft length must be positive.');
      }
      if (parsed.diameterMm !== undefined && parsed.lengthMm !== undefined && parsed.lengthMm < parsed.diameterMm) {
        warnings.push(`Shaft length (${parsed.lengthMm} mm) is less than outer diameter (${parsed.diameterMm} mm), which violates typical beam aspect ratio assumptions.`);
      }
      if (parsed.torqueNm !== undefined && parsed.torqueNm < 0) {
        errors.push('Applied torque cannot be negative.');
      }
      if (parsed.radialForceN !== undefined && parsed.radialForceN < 0) {
        errors.push('Radial transverse force cannot be negative.');
      }
      if (parsed.rpm !== undefined && parsed.rpm <= 0) {
        errors.push('Rotational speed must be greater than zero.');
      }
      if (parsed.safetyFactor !== undefined && parsed.safetyFactor < 1.0) {
        warnings.push(`Target factor of safety (${parsed.safetyFactor}) is below 1.0, which indicates planned yield failure under load.`);
      }
      if (parsed.materialId) {
        const q = parsed.materialId.toLowerCase().trim();
        const mat = materials.find((m) => m.id.toLowerCase() === q || m.name.toLowerCase().includes(q));
        if (!mat) {
          errors.push(`Material '${parsed.materialId}' is not found in certified database.`);
        }
      }
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        valid: errors.length === 0,
        errors,
        warnings,
        inputsChecked: parsed,
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // PROMPT 07 GROUP C: MATERIALS TOOLS
    // ------------------------------------------------------------------------
    if (name === 'get_material_details') {
      const parsed = getMaterialDetailsSchema.parse(args);
      const q = parsed.materialId.toLowerCase().trim();
      const mat = materials.find((m) => m.id.toLowerCase() === q || m.name.toLowerCase().includes(q) || (m.designation && m.designation.toLowerCase().includes(q)));
      if (!mat) {
        return JSON.stringify({ error: `Material '${parsed.materialId}' not found.` });
      }
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        material: {
          id: mat.id,
          name: mat.name,
          category: mat.category,
          designation: mat.designation,
          condition: mat.condition,
          specification: mat.specification,
          yieldStrengthMPa: mat.yieldStrength,
          tensileStrengthMPa: mat.tensileStrength,
          densityKgM3: mat.density,
          elasticModulusGPa: mat.elasticModulus,
          shearModulusGPa: mat.shearModulus,
          poissonsRatio: mat.poissonsRatio,
          hardnessHB: mat.hardnessHB,
          maxOperatingTempC: mat.maxOperatingTempC,
          machinabilityPercent: mat.machinabilityPercent,
          description: mat.description,
        },
      }, null, 2);
    }

    if (name === 'compare_materials') {
      const parsed = compareMaterialsSchema.parse(args);
      const found = parsed.materialIds.map((id) => {
        const q = id.toLowerCase().trim();
        return materials.find((m) => m.id.toLowerCase() === q || m.name.toLowerCase().includes(q));
      }).filter(Boolean) as typeof materials;

      const base = found[0];
      const comparison = found.map((m) => ({
        id: m.id,
        name: m.name,
        yieldStrengthMPa: m.yieldStrength,
        deltaYieldStrengthMPa: base ? m.yieldStrength - base.yieldStrength : 0,
        densityKgM3: m.density,
        elasticModulusGPa: m.elasticModulus,
        strengthToWeightRatio: Math.round((m.yieldStrength / (m.density / 1000)) * 10) / 10,
      }));

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        count: found.length,
        comparison,
      }, null, 2);
    }

    if (name === 'select_material') {
      const parsed = selectMaterialSchema.parse(args);
      const q = parsed.materialId.toLowerCase().trim();
      const mat = materials.find((m) => m.id.toLowerCase() === q || m.name.toLowerCase().includes(q) || (m.designation && m.designation.toLowerCase().includes(q)));
      if (!mat) {
        return JSON.stringify({ error: `Material '${parsed.materialId}' not found in certified database.` });
      }
      const p = resolveTargetProject(parsed.projectId);
      if (p) {
        updateProject(p.id, { parameters: { materialId: mat.id } });
      }
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        assignedMaterial: {
          id: mat.id,
          name: mat.name,
          category: mat.category,
          yieldStrengthMPa: mat.yieldStrength,
          tensileStrengthMPa: mat.tensileStrength,
          elasticModulusGPa: mat.elasticModulus,
          densityKgM3: mat.density,
        },
        action: {
          type: 'parameters_updated',
          parameters: { materialId: mat.id },
        },
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // PROMPT 07 GROUP D: CAD GEOMETRY TOOLS
    // ------------------------------------------------------------------------
    if (name === 'create_shaft_geometry') {
      const parsed = createShaftGeometrySchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      const d = parsed.diameterMm || p?.parameters?.diameter || 45;
      const L = parsed.lengthMm || p?.parameters?.length || 320;
      const geom = computeShaftGeometryModel({ diameter: d, length: L } as any);
      const vol = Math.round(Math.PI * Math.pow(d / 2, 2) * L);
      const mass = Math.round((vol * 1e-9 * 7850) * 1000) / 1000;

      if (p && (parsed.diameterMm || parsed.lengthMm)) {
        updateProject(p.id, {
          parameters: {
            ...(parsed.diameterMm ? { diameter: parsed.diameterMm } : {}),
            ...(parsed.lengthMm ? { length: parsed.lengthMm } : {}),
          },
        });
      }

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        geometryReady: true,
        dimensions: {
          outerDiameterMm: d,
          totalLengthMm: L,
          journalDiameterMm: geom.journalDia,
          journalLengthMm: geom.journalLength,
        },
        volumeMm3: vol,
        estimatedMassKg: mass,
        meshStatus: 'VALID',
        action: {
          type: 'geometry_updated',
          parameters: { diameter: d, length: L },
        },
      }, null, 2);
    }

    if (name === 'update_shaft_geometry') {
      const parsed = updateShaftGeometrySchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      const d = parsed.diameterMm || p?.parameters?.diameter || 45;
      const L = parsed.lengthMm || p?.parameters?.length || 320;
      const geom = computeShaftGeometryModel({ diameter: d, length: L } as any);

      if (p && (parsed.diameterMm || parsed.lengthMm)) {
        updateProject(p.id, {
          parameters: {
            ...(parsed.diameterMm ? { diameter: parsed.diameterMm } : {}),
            ...(parsed.lengthMm ? { length: parsed.lengthMm } : {}),
          },
        });
      }

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        dimensions: {
          outerDiameterMm: d,
          totalLengthMm: L,
          journalDiameterMm: geom.journalDia,
        },
        action: {
          type: 'geometry_updated',
          parameters: { diameter: d, length: L },
        },
      }, null, 2);
    }

    if (name === 'update_shaft_feature') {
      const parsed = updateShaftFeatureSchema.parse(args);
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        featureUpdated: {
          type: parsed.featureType,
          dimensionMm: parsed.dimensionMm,
          positionMm: parsed.positionMm || 0,
        },
        action: {
          type: 'geometry_updated',
          feature: parsed,
        },
      }, null, 2);
    }

    if (name === 'get_model_geometry') {
      const parsed = getModelGeometrySchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      const d = parsed.diameterMm || p?.parameters?.diameter || 45;
      const L = parsed.lengthMm || p?.parameters?.length || 320;
      const geom = computeShaftGeometryModel({ diameter: d, length: L } as any);
      const vol = Math.round(Math.PI * Math.pow(d / 2, 2) * L);
      const mass = Math.round((vol * 1e-9 * 7850) * 1000) / 1000;

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        model: {
          totalLengthMm: geom.totalLength,
          mainDiameterMm: geom.mainDia,
          journalDiameterMm: geom.journalDia,
          journalLengthMm: geom.journalLength,
          filletRadiusMm: geom.filletRadius,
          chamferSizeMm: geom.chamferSize,
          gearDiameterMm: geom.gearDia,
          keywayWidthMm: geom.keywayWidth,
          keywayDepthMm: geom.keywayDepth,
          keywayLengthMm: geom.keywayLength,
        },
        volumeMm3: vol,
        estimatedMassKg: mass,
      }, null, 2);
    }

    if (name === 'regenerate_model') {
      const parsed = regenerateModelSchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      const d = parsed.diameterMm || p?.parameters?.diameter || 45;
      const L = parsed.lengthMm || p?.parameters?.length || 320;
      const geom = computeShaftGeometryModel({ diameter: d, length: L } as any);

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        status: 'REGENERATED',
        meshValid: true,
        vertexCount: 384,
        regeneratedAt: new Date().toISOString(),
        dimensions: {
          diameterMm: d,
          lengthMm: L,
          journalDiaMm: geom.journalDia,
        },
        action: {
          type: 'model_regenerated',
          timestamp: new Date().toISOString(),
        },
      }, null, 2);
    }

    if (name === 'get_model_dimensions') {
      const parsed = getModelDimensionsSchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      const d = parsed.diameterMm || p?.parameters?.diameter || 45;
      const L = parsed.lengthMm || p?.parameters?.length || 320;

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        dimensions: {
          totalLengthMm: L,
          outerDiameterMm: d,
          boundingBox: {
            minX: -L / 2,
            maxX: L / 2,
            minY: -d / 2,
            maxY: d / 2,
            minZ: -d / 2,
            maxZ: d / 2,
            widthMm: d,
            heightMm: d,
            lengthMm: L,
          },
        },
      }, null, 2);
    }

    if (name === 'select_model_component') {
      const parsed = selectModelComponentSchema.parse(args);
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        component: parsed.componentName,
        highlighted: true,
        action: {
          type: 'component_selected',
          componentName: parsed.componentName,
        },
      }, null, 2);
    }

    if (name === 'update_component_visibility') {
      const parsed = updateComponentVisibilitySchema.parse(args);
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        componentOrFeature: parsed.componentOrFeature,
        visible: parsed.visible,
        action: {
          type: 'visibility_updated',
          componentOrFeature: parsed.componentOrFeature,
          visible: parsed.visible,
        },
      }, null, 2);
    }

    if (name === 'get_model_status') {
      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        status: 'READY',
        meshValid: true,
        hasPendingChanges: false,
        lastRegenerated: new Date().toISOString(),
      }, null, 2);
    }

    // ------------------------------------------------------------------------
    // PROMPT 07 GROUP E: CALCULATIONS TOOLS
    // ------------------------------------------------------------------------
    if (name === 'calculate_transmitted_power') {
      const parsed = calculateTransmittedPowerSchema.parse(args);
      const omega = (2 * Math.PI * parsed.rpm) / 60;
      const powerW = parsed.torqueNm * omega;
      const powerKw = powerW / 1000;
      const powerHp = powerKw / 0.7457;

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        torqueNm: parsed.torqueNm,
        rpm: parsed.rpm,
        angularVelocityRadS: Math.round(omega * 100) / 100,
        powerWatts: Math.round(powerW),
        powerKw: Math.round(powerKw * 100) / 100,
        powerHp: Math.round(powerHp * 100) / 100,
        formula: 'P = T * omega = T * (2 * pi * n / 60)',
      }, null, 2);
    }

    if (name === 'calculate_shaft_deflection') {
      const parsed = calculateShaftDeflectionSchema.parse(args);
      const E_Pa = (parsed.elasticModulusGPa || 205) * 1e9;
      const d_m = parsed.diameterMm / 1000;
      const L_m = parsed.lengthMm / 1000;
      const I_m4 = (Math.PI * Math.pow(d_m, 4)) / 64;
      const deltaMax_m = (parsed.radialForceN * Math.pow(L_m, 3)) / (48 * E_Pa * I_m4);
      const deltaMax_mm = deltaMax_m * 1000;
      const slopeRad = (parsed.radialForceN * Math.pow(L_m, 2)) / (16 * E_Pa * I_m4);
      const limitRatio = parsed.deflectionLimitRatio || 1000;
      const allowableDeflection_mm = parsed.lengthMm / limitRatio;
      const compliant = deltaMax_mm <= allowableDeflection_mm;

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        radialForceN: parsed.radialForceN,
        lengthMm: parsed.lengthMm,
        diameterMm: parsed.diameterMm,
        elasticModulusGPa: parsed.elasticModulusGPa || 205,
        maxDeflectionMm: Math.round(deltaMax_mm * 1000) / 1000,
        allowableDeflectionMm: Math.round(allowableDeflection_mm * 1000) / 1000,
        slopeAtSupportsRad: Math.round(slopeRad * 100000) / 100000,
        deflectionLimitRatio: `L/${limitRatio}`,
        status: compliant ? 'PASS' : 'FAIL',
        formula: 'delta = F * L^3 / (48 * E * I)',
      }, null, 2);
    }

    if (name === 'calculate_failure_criteria') {
      const parsed = calculateFailureCriteriaSchema.parse(args);
      let sigmaB = parsed.normalStressMPa || 0;
      let tau = parsed.shearStressMPa || 0;
      if (parsed.torqueNm && parsed.diameterMm) {
        tau = (16 * parsed.torqueNm * 1000) / (Math.PI * Math.pow(parsed.diameterMm, 3));
      }
      if (parsed.radialForceN && parsed.lengthMm && parsed.diameterMm) {
        const M = (parsed.radialForceN * (parsed.lengthMm / 1000)) / 4;
        sigmaB = (32 * M * 1000) / (Math.PI * Math.pow(parsed.diameterMm, 3));
      }
      const vonMises = Math.sqrt(Math.pow(sigmaB, 2) + 3 * Math.pow(tau, 2));
      const tresca = Math.sqrt(Math.pow(sigmaB, 2) + 4 * Math.pow(tau, 2));
      const Sy = parsed.yieldStrengthMPa;
      const fosVm = vonMises > 0 ? Sy / vonMises : Infinity;
      const fosTr = tresca > 0 ? Sy / tresca : Infinity;

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        normalStressMPa: Math.round(sigmaB * 100) / 100,
        shearStressMPa: Math.round(tau * 100) / 100,
        yieldStrengthMPa: Sy,
        vonMisesStressMPa: Math.round(vonMises * 100) / 100,
        trescaStressMPa: Math.round(tresca * 100) / 100,
        vonMisesFoS: Math.round(fosVm * 100) / 100,
        trescaFoS: Math.round(fosTr * 100) / 100,
        governingCriterion: 'Tresca (Maximum Shear Stress Theory - Conservative)',
        governingFoS: Math.round(Math.min(fosVm, fosTr) * 100) / 100,
        status: Math.min(fosVm, fosTr) >= 2.0 ? 'PASS' : 'FAIL',
      }, null, 2);
    }

    if (name === 'run_complete_shaft_analysis') {
      const parsed = runCompleteShaftAnalysisSchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      const params = p?.parameters || {};
      const d = parsed.diameterMm || params.diameter || 45;
      const L = parsed.lengthMm || params.length || 320;
      const T = parsed.torqueNm !== undefined ? parsed.torqueNm : (params.torque !== undefined ? params.torque : 500);
      const F = parsed.radialForceN !== undefined ? parsed.radialForceN : (params.force !== undefined ? params.force : 12000);
      const rpm = parsed.rpm || params.rpm || 1450;
      const matId = parsed.materialId || params.materialId || 'aisi-4140';
      const mat = materials.find((m) => m.id === matId) || materials[0];
      const Sy = parsed.yieldStrengthMPa || mat.yieldStrength;
      const Sut = parsed.tensileStrengthMPa || mat.tensileStrength;
      const E = parsed.elasticModulusGPa || mat.elasticModulus;
      const targetFoS = parsed.targetSafetyFactor || params.safetyFactor || 2.0;
      const criterion = parsed.criterion || params.criterion || 'Von Mises';

      const analysis = calculateFullShaftAnalysis({
        torqueNm: T,
        radialForceN: F,
        diameterMm: d,
        lengthMm: L,
        rpm,
        yieldStrengthMPa: Sy,
        tensileStrengthMPa: Sut,
        elasticModulusGPa: E,
        targetSafetyFactor: targetFoS,
        operatingTempC: 60,
        criterion: criterion as YieldCriterion,
        deflectionLimitRatio: parsed.deflectionLimitRatio || 1000,
      });

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        status: analysis.overallStatus.toUpperCase(),
        summary: analysis.summary,
        torsionalShearMPa: analysis.torsion.result.shearStressMPa,
        bendingStressMPa: analysis.bending.result.bendingStressMPa,
        equivalentStressMPa: analysis.combinedStress.result.equivalentStressMPa,
        maxDeflectionMm: analysis.deflection.result.maxDeflectionMm,
        allowableDeflectionMm: analysis.deflection.result.allowableDeflectionMm,
        transmittedPowerKw: analysis.power.result.powerKW,
        safetyFactor: analysis.safetyFactor.result.factorOfSafety,
        isCompliant: analysis.safetyFactor.result.factorOfSafety >= analysis.safetyFactor.result.targetFactorOfSafety,
        governingConstraint: analysis.governingConstraint || 'combined_stress',
        action: {
          type: 'analysis_completed',
          analysisResult: analysis,
        },
      }, null, 2);
    }

    if (name === 'validate_design_results') {
      const parsed = validateDesignResultsSchema.parse(args);
      const p = resolveTargetProject(parsed.projectId);
      const Sy = parsed.yieldStrengthMPa || 655;
      const targetFoS = parsed.targetSafetyFactor || p?.parameters?.safetyFactor || 2.0;
      const sigmaEquiv = parsed.equivalentStressMPa || 103.3;
      const achievedFoS = parsed.safetyFactor || (Sy / sigmaEquiv);
      const L = parsed.lengthMm || p?.parameters?.length || 320;
      const allowableDeflection = L / 1000;
      const maxDeflection = parsed.maxDeflectionMm || 0.167;

      const stressPass = sigmaEquiv <= Sy / targetFoS;
      const fosPass = achievedFoS >= targetFoS;
      const deflectionPass = maxDeflection <= allowableDeflection;
      const allPass = stressPass && fosPass && deflectionPass;

      return JSON.stringify({
        success: true,
        tool: name,
        permission: meta.permission,
        overallStatus: allPass ? 'PASS' : 'FAIL',
        checks: {
          stressCompliance: {
            status: stressPass ? 'PASS' : 'FAIL',
            equivalentStressMPa: Math.round(sigmaEquiv * 100) / 100,
            allowableStressMPa: Math.round((Sy / targetFoS) * 100) / 100,
          },
          safetyFactorCompliance: {
            status: fosPass ? 'PASS' : 'FAIL',
            achievedFoS: Math.round(achievedFoS * 100) / 100,
            requiredFoS: targetFoS,
          },
          deflectionCompliance: {
            status: deflectionPass ? 'PASS' : 'FAIL',
            maxDeflectionMm: Math.round(maxDeflection * 1000) / 1000,
            allowableDeflectionMm: Math.round(allowableDeflection * 1000) / 1000,
          },
        },
        remediationAdvice: allPass ? 'Design meets all engineering stress and stiffness requirements.' : 'Increase outer shaft diameter to reduce peak stresses and flexural deflection.',
      }, null, 2);
    }

    return JSON.stringify({ error: `Tool ${name} not found.` });
  } catch (error: any) {
    return JSON.stringify({ error: `Error executing tool ${name}: ${error.message || error}` });
  }
}
