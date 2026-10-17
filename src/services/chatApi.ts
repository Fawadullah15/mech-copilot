import { CopilotMessage, MessageType } from '../types';

export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

export interface ChatRequestPayload {
  projectId: string;
  conversationId: string;
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
  error?: string;
  details?: any;
}

export async function sendChatMessage(messages: CopilotMessage[], projectId: string, conversationId: string): Promise<CopilotMessage> {
  // Find the last user message
  const userMessage = messages[messages.length - 1];
  
  // Format for backend
  const payload: ChatRequestPayload = {
    projectId,
    conversationId,
    userMessage,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

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
        { label: 'Tools Used', value: data.toolsUsed.join(', ') }
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
    };
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to the engineering Copilot server. Please make sure the backend is running.');
    }
    throw error;
  }
}
