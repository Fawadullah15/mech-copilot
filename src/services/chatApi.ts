import { CopilotMessage, MessageType, ProviderStatusInfo } from '../types';

export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? '' : 'http://localhost:3001');

export interface ChatRequestPayload {
  projectId?: string;
  conversationId?: string;
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  // The raw user message that initiated this request
  userMessage?: CopilotMessage;
}

export interface ChatResponsePayload {
  message: {
    role: 'assistant';
    content: string;
  };
  toolsUsed?: string[];
  engineeringResult?: any;
  action?: any;
  actions?: any[];
  operationState?: 'Thinking' | 'Waiting for Information' | 'Waiting for Approval' | 'Executing' | 'Completed' | 'Failed';
  toolExecutionLogs?: any[];
  requirements?: any;
  proposedChange?: any;
  provider?: 'gemini' | 'openai' | 'offline';
  providerStatus?: string;
  model?: string;
  error?: string;
  details?: any;
}

export async function fetchChatProviderStatus(force = false): Promise<ProviderStatusInfo> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/chat/status${force ? '?force=true' : ''}`);
    if (!res.ok) {
      return {
        provider: 'offline',
        status: 'offline',
        displayStatus: 'Offline Mode (Server Status ' + res.status + ')',
        model: 'Deterministic Engine',
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      provider: 'offline',
      status: 'offline',
      displayStatus: 'Offline Mode (API unreachable)',
      model: 'Deterministic Engine',
      error: err.message,
    };
  }
}

export async function sendChatMessage(messages: CopilotMessage[], projectId?: string, conversationId?: string): Promise<CopilotMessage> {
  // Find the last user message
  const userMessage = messages[messages.length - 1];
  
  const validMessages = messages
    .filter((m) => typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));

  // Format for backend
  const payload: ChatRequestPayload = {
    projectId,
    conversationId,
    userMessage,
    messages: validMessages.length > 0 ? validMessages : [{ role: 'user', content: userMessage?.content || ' ' }],
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error('Engineering Copilot API server is unavailable or returned an HTML page.');
    }

    const data: ChatResponsePayload = await response.json();

    if (!response.ok) {
      if (response.status === 503) {
        throw new Error('LLM backend is not fully configured or is unavailable (e.g. missing API key).');
      }
      if (response.status === 400) {
        throw new Error('Invalid chat request sent to the server.');
      }
      throw new Error(data.error || 'Unknown error occurred while contacting the Copilot API.');
    }

    if (!data.message || !data.message.content) {
      throw new Error('Received an empty response from the Copilot API.');
    }

    // Determine basic message type based on tools
    let msgType: MessageType = 'general';
    let structuredData = undefined;
    
    if (data.toolsUsed && data.toolsUsed.length > 0) {
      msgType = 'calculation';
      structuredData = [
        { label: 'Tools Used', value: data.toolsUsed.join(', ') },
        { label: 'AI Provider', value: data.provider ? `${data.provider.toUpperCase()} (${data.model || ''})` : 'DETERMINISTIC' }
      ];
    }

    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      type: msgType,
      content: data.message.content,
      timestamp: new Date().toISOString(),
      structuredData,
      engineeringResult: data.engineeringResult,
      action: data.action || data.engineeringResult?.action,
      actions: data.actions,
      operationState: data.operationState || (data.toolsUsed && data.toolsUsed.length > 0 ? 'Completed' : undefined),
      toolExecutionLogs: data.toolExecutionLogs,
      requirements: data.requirements,
      proposedChange: data.proposedChange || (data.action?.requiresApproval ? data.action : undefined),
      provider: data.provider,
      providerStatus: data.providerStatus,
      model: data.model,
    };
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to the engineering Copilot server. Please make sure the backend is running.');
    }
    throw error;
  }
}
