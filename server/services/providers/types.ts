import { ChatMessage } from '../../types/api.ts';

export type ProviderType = 'gemini' | 'openai' | 'offline';

export type AgentOperationState =
  | 'Thinking'
  | 'Waiting for Information'
  | 'Waiting for Approval'
  | 'Executing'
  | 'Completed'
  | 'Failed';

export interface ToolExecutionLogEntry {
  tool: string;
  category?: string;
  permission: 'READ_ONLY' | 'REVERSIBLE' | 'HIGH_IMPACT';
  status: 'success' | 'failed';
  timestamp: string;
  durationMs?: number;
}

export interface ProposedEngineeringChange {
  type: 'proposed_dimension_change' | 'proposed_material_change' | 'proposed_geometry_update' | 'high_impact_operation';
  title: string;
  description: string;
  permission: 'READ_ONLY' | 'REVERSIBLE' | 'HIGH_IMPACT';
  requiresApproval: boolean;
  parameter?: string;
  currentValue?: any;
  proposedValue?: any;
  unit?: string;
  changes?: { field: string; current: any; proposed: any; unit?: string }[];
  payload?: any;
}

export interface EngineeringRequirementsSummary {
  identified: Record<string, any>;
  missing: string[];
  assumptions?: string[];
}

export interface LLMProviderResult {
  message: {
    role: 'assistant';
    content: string;
  };
  toolsUsed: string[];
  engineeringResult?: any;
  action?: any;
  actions?: any[];
  operationState?: AgentOperationState;
  toolExecutionLogs?: ToolExecutionLogEntry[];
  requirements?: EngineeringRequirementsSummary;
  proposedChange?: ProposedEngineeringChange;
  provider: ProviderType;
  providerStatus: string;
  model?: string;
}

export interface ProviderStatusInfo {
  provider: ProviderType;
  status: 'Gemini Connected' | 'Gemini Connection Failed' | 'OpenAI Connected' | 'OpenAI Connection Failed' | 'Offline Mode';
  model: string;
  verified: boolean;
  details?: string;
  lastChecked?: string;
}
