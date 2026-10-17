// ─── Page Navigation ────────────────────────────────────────────────
export type PageId =
  | 'dashboard'
  | 'projects'
  | 'workspace'
  | 'analysis'
  | 'materials'
  | 'calculations'
  | 'reports'
  | 'settings';

// ─── Materials ──────────────────────────────────────────────────────
export interface Material {
  id: string;
  name: string;
  category: string;
  yieldStrength: number;      // MPa
  tensileStrength: number;    // MPa
  density: number;            // kg/m³
  elasticModulus: number;     // GPa
  poissonsRatio: number;
  thermalExpansion: number;   // µm/(m·°C)
  costCategory: 'Low' | 'Medium' | 'High' | 'Very High';
  description: string;
}

// ─── Design Parameters ─────────────────────────────────────────────
export interface DesignParameters {
  materialId: string;
  diameter: number;           // mm
  length: number;             // mm
  torque: number;             // Nm
  force: number;              // N
  rpm: number;
  safetyFactor: number;
  temperature: number;        // °C
}

// ─── Analysis ───────────────────────────────────────────────────────
export interface AnalysisResult {
  vonMisesStress: number;     // MPa
  yieldStrength: number;      // MPa
  factorOfSafety: number;
  maxDeflection: number;      // mm
  torqueCapacity: number;     // Nm
  fatigueLife: number;        // cycles
  shearStress: number;        // MPa
  bendingStress: number;      // MPa
  status: 'pass' | 'warning' | 'fail';
  statusMessage: string;
}

export interface StressDistributionPoint {
  position: number;           // mm from left end
  vonMises: number;           // MPa
  shear: number;              // MPa
  bending: number;            // MPa
}

export interface FatigueCurvePoint {
  cycles: number;
  stress: number;             // MPa
}

// ─── Component Selection in 3D CAD ─────────────────────────────────
export interface ComponentSelection {
  id: 'shaft' | 'bearing-left' | 'bearing-right' | 'gear' | 'keyway';
  name: string;
  type: string;
  material: string;
  status: 'pass' | 'warning' | 'review';
  specs: Record<string, string>;
  suggestedPrompt: string;
}

// ─── Engineering Warnings ──────────────────────────────────────────
export interface EngineeringWarning {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  reason: string;
  affectedParameter: string;
  currentValue: string;
  requiredValue: string;
  recommendedAction: string;
  autoFixValue?: Partial<DesignParameters>;
  applied?: boolean;
}

// ─── Design Optimization ───────────────────────────────────────────
export type OptimizationObjective =
  | 'weight'
  | 'cost'
  | 'strength'
  | 'fatigue'
  | 'balanced';

export interface OptimizationOption {
  id: string;
  title: string;
  tag: string;
  diameter: number;
  materialId: string;
  materialName: string;
  weightKg: number;
  safetyFactor: number;
  costCategory: string;
  fatigueLifeCycles: string;
  tradeOffSummary: string;
  isRecommended?: boolean;
}

// ─── AI Design Reasoning Chain ──────────────────────────────────────
export interface ReasoningStep {
  stage: 'REQUIREMENT' | 'CALCULATION' | 'MATERIAL' | 'SAFETY CHECK' | 'RECOMMENDATION';
  summary: string;
  details: string;
  expanded?: boolean;
}

export interface EngineeringResult {
  tool: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
}

// ─── Copilot Chat ───────────────────────────────────────────────────
export type MessageType =
  | 'explanation'
  | 'calculation'
  | 'recommendation'
  | 'warning'
  | 'general';

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  type?: MessageType;
  structuredData?: { label: string; value: string }[];
  actions?: CopilotAction[];
  reasoningChain?: ReasoningStep[];
  saved?: boolean;
  engineeringResult?: EngineeringResult;
}

export interface CopilotAction {
  label: string;
  type: 'apply' | 'analyze' | 'explain' | 'optimize';
  icon?: string;
  payload?: any;
}

export interface ConversationThread {
  id: string;
  title: string;
  createdAt: string;
  messages: CopilotMessage[];
}

// ─── File Upload & Spec Extraction ─────────────────────────────────
export interface UploadedEngineeringFile {
  id: string;
  name: string;
  fileType: 'cad' | 'pdf' | 'image' | 'spec';
  fileSize: string;
  uploadedAt: string;
  status: 'uploading' | 'analyzing' | 'extracted';
  extractedSpecs?: {
    torque?: number;
    rpm?: number;
    safetyFactor?: number;
    recommendedMaterial?: string;
    diameterMin?: number;
    operatingTemp?: number;
    notes?: string;
  };
}

// ─── Natural Language Problem Parsing ──────────────────────────────
export interface ParsedProblemRequirements {
  rawText: string;
  torque?: number;
  rpm?: number;
  safetyFactor?: number;
  diameter?: number;
  length?: number;
  material?: string;
  force?: number;
  ready: boolean;
}

// ─── Project (with Memory) ──────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'In Progress' | 'Review' | 'Completed';
  progress: number;           // 0-100
  lastModified: string;
  created: string;
  parameters: DesignParameters;
  tags: string[];
  conversations?: ConversationThread[];
  activeThreadId?: string;
  uploadedFiles?: UploadedEngineeringFile[];
  notes?: string[];
}

// ─── Dashboard ──────────────────────────────────────────────────────
export interface ActivityItem {
  id: string;
  type: 'analysis' | 'design' | 'recommendation' | 'warning' | 'material';
  title: string;
  description: string;
  timestamp: string;
  status?: 'pass' | 'warning' | 'fail' | 'info';
}

export interface DesignWarning {
  id: string;
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  project: string;
}

// ─── Report ─────────────────────────────────────────────────────────
export interface ReportSection {
  id: string;
  title: string;
  content: string;
  icon: string;
}

// ─── Design Version History ─────────────────────────────────────────
export interface DesignVersion {
  id: string;
  version: string;
  label: string;
  timestamp: string;
  author: string;
  parameters: DesignParameters;
  materialName: string;
  factorOfSafety: number;
  status: 'pass' | 'warning' | 'fail';
  notes: string;
}

