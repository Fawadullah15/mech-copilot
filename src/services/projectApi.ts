import { Project, ConversationThread, CopilotMessage } from '../types';
import { API_BASE_URL } from './chatApi';

async function parseJsonResponse<T>(res: Response, fallbackErrMsg: string): Promise<T> {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('text/html')) {
    throw new Error('Backend returned HTML (endpoint not found or offline)');
  }
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || fallbackErrMsg);
  }
  return res.json();
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE_URL}/api/projects`);
  return parseJsonResponse<Project[]>(res, 'Failed to fetch projects');
}

export async function fetchProjectById(id: string): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/api/projects/${id}`);
  return parseJsonResponse<Project>(res, 'Failed to fetch project');
}

export function sanitizeParametersForApi(parameters: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  if (typeof parameters.materialId === 'string' && parameters.materialId.trim()) {
    clean.materialId = parameters.materialId.trim().slice(0, 50);
  }
  if (typeof parameters.diameter === 'number' && Number.isFinite(parameters.diameter) && parameters.diameter > 0) {
    clean.diameter = Math.min(10000, Math.round(parameters.diameter * 100) / 100);
  }
  if (typeof parameters.length === 'number' && Number.isFinite(parameters.length) && parameters.length > 0) {
    clean.length = Math.min(100000, Math.round(parameters.length * 100) / 100);
  }
  if (typeof parameters.torque === 'number' && Number.isFinite(parameters.torque) && parameters.torque >= 0) {
    clean.torque = Math.min(1000000, Math.round(parameters.torque * 100) / 100);
  }
  if (typeof parameters.force === 'number' && Number.isFinite(parameters.force) && parameters.force >= 0) {
    clean.force = Math.min(1000000, Math.round(parameters.force * 100) / 100);
  }
  if (typeof parameters.rpm === 'number' && Number.isFinite(parameters.rpm) && parameters.rpm >= 0) {
    clean.rpm = Math.min(100000, Math.round(parameters.rpm * 100) / 100);
  }
  if (typeof parameters.safetyFactor === 'number' && Number.isFinite(parameters.safetyFactor) && parameters.safetyFactor > 0) {
    clean.safetyFactor = Math.min(100, Math.round(parameters.safetyFactor * 100) / 100);
  }
  if (typeof parameters.temperature === 'number' && Number.isFinite(parameters.temperature) && parameters.temperature >= -273 && parameters.temperature <= 2000) {
    clean.temperature = Math.round(parameters.temperature * 100) / 100;
  }
  if (parameters.criterion === 'Tresca' || parameters.criterion === 'Von Mises') {
    clean.criterion = parameters.criterion;
  }
  if (typeof parameters.deflectionLimitRatio === 'number' && Number.isFinite(parameters.deflectionLimitRatio) && parameters.deflectionLimitRatio > 0) {
    clean.deflectionLimitRatio = Math.min(100000, parameters.deflectionLimitRatio);
  }
  return clean;
}

export async function createProjectRecord(project: {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  progress: number;
  lastModified: string;
  created: string;
  parameters: any;
  tags: string[];
}): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...project,
      parameters: sanitizeParametersForApi(project.parameters || {}),
    }),
  });
  return parseJsonResponse<Project>(res, 'Failed to create project');
}

export async function updateProjectParameters(id: string, parameters: any): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parameters: sanitizeParametersForApi(parameters || {}) })
  });
  return parseJsonResponse<Project>(res, 'Failed to update project parameters');
}

export async function fetchConversations(projectId: string): Promise<ConversationThread[]> {
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/conversations`);
  return parseJsonResponse<ConversationThread[]>(res, 'Failed to fetch conversations');
}

export async function initSampleProject(): Promise<Project[]> {
  const res = await fetch(`${API_BASE_URL}/api/projects/init-sample`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await parseJsonResponse<{ projects?: Project[] }>(res, 'Failed to initialize sample project');
  return data.projects || [];
}

export async function fetchProjectVersions(projectId: string): Promise<import('../types').DesignVersion[]> {
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/versions`);
  const versions = await parseJsonResponse<any[]>(res, 'Failed to fetch project versions');
  // Ensure timestamp compatibility (mapped from createdAt if timestamp not set)
  return versions.map((v: any) => ({
    ...v,
    timestamp: v.timestamp || v.createdAt || 'Just now',
  }));
}

export type CreateProjectVersionPayload = {
  label: string;
  notes?: string;
  version?: string;
  author?: string;
  parameters: Partial<import('../types').DesignParameters>;
  materialId?: string;
  materialName?: string;
  factorOfSafety?: number;
  status?: 'pass' | 'warning' | 'fail';
  calculationSummary?: string;
};

export async function createProjectVersion(
  projectId: string,
  data: CreateProjectVersionPayload
): Promise<import('../types').DesignVersion> {
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/versions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const created = await parseJsonResponse<any>(res, 'Failed to create design version');
  return {
    ...created,
    timestamp: created.timestamp || created.createdAt || 'Just now',
  };
}

export async function restoreProjectVersion(
  projectId: string,
  versionId: string
): Promise<{ project: Project; restoredVersion: import('../types').DesignVersion }> {
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/versions/${versionId}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return parseJsonResponse<{ project: Project; restoredVersion: import('../types').DesignVersion }>(
    res,
    'Failed to restore design version'
  );
}

export async function deleteProjectVersion(projectId: string, versionId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/versions/${versionId}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to delete design version');
  }
}


