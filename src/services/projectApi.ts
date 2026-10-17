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
