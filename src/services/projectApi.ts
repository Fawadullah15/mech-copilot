import { Project, ConversationThread, CopilotMessage } from '../types';
import { API_BASE_URL } from './chatApi';

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE_URL}/api/projects`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function fetchProjectById(id: string): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/api/projects/${id}`);
  if (!res.ok) throw new Error('Failed to fetch project');
  return res.json();
}

export async function updateProjectParameters(id: string, parameters: any): Promise<Project> {
  const res = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parameters })
  });
  if (!res.ok) throw new Error('Failed to update project parameters');
  return res.json();
}

export async function fetchConversations(projectId: string): Promise<ConversationThread[]> {
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/conversations`);
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
}

export async function initSampleProject(): Promise<Project[]> {
  const res = await fetch(`${API_BASE_URL}/api/projects/init-sample`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!res.ok) throw new Error('Failed to initialize sample project');
  const data = await res.json();
  return data.projects || [];
}

export async function fetchProjectVersions(projectId: string): Promise<import('../types').DesignVersion[]> {
  const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/versions`);
  if (!res.ok) throw new Error('Failed to fetch project versions');
  const versions = await res.json();
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
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to create design version');
  }
  const created = await res.json();
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
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to restore design version');
  }
  return res.json();
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


