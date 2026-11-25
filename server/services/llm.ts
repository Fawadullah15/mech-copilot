import { env } from '../config/env.ts';
import { ChatMessage } from '../types/api.ts';
import { LLMProviderResult, ProviderStatusInfo } from './providers/types.ts';
import { processGeminiChat, verifyGeminiConnection } from './providers/geminiProvider.ts';
import { processOpenAIChat, verifyOpenAIConnection } from './providers/openaiProvider.ts';
import { processOfflineChat, getOfflineProviderStatus } from './providers/offlineProvider.ts';

export * from './providers/types.ts';

/**
 * Backward compatibility alias for offline chat requests
 */
export function processOfflineChatRequest(messages: ChatMessage[], projectParams?: any): LLMProviderResult {
  return processOfflineChat(messages, projectParams);
}

/**
 * Retrieves the live status of the active AI inference provider.
 * Never reports "Connected" without verifying live connectivity.
 */
export async function getAIProviderStatus(forceCheck = false): Promise<ProviderStatusInfo> {
  const providerConfig = env.LLM_PROVIDER?.toLowerCase() || 'gemini';

  if (providerConfig === 'gemini') {
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '') {
      return await verifyGeminiConnection(forceCheck);
    }
    return {
      provider: 'offline',
      status: 'Offline Mode',
      model: 'Deterministic Physics Kernel v2.4',
      verified: true,
      details: 'GEMINI_API_KEY not configured. Operating in Offline Mode.'
    };
  }

  if (providerConfig === 'openai') {
    if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.trim() !== '') {
      return await verifyOpenAIConnection();
    }
    return {
      provider: 'offline',
      status: 'Offline Mode',
      model: 'Deterministic Physics Kernel v2.4',
      verified: true,
      details: 'OPENAI_API_KEY not configured. Operating in Offline Mode.'
    };
  }

  return getOfflineProviderStatus();
}

/**
 * Main chat orchestrator. Dispatches requests to the configured provider:
 * 1. Gemini Cloud Mode (with automatic fallback to Offline on credentials or network errors)
 * 2. OpenAI Cloud Mode (if configured)
 * 3. Offline Deterministic Mode
 */
export async function processChatRequest(
  messages: ChatMessage[],
  projectParams?: any
): Promise<LLMProviderResult> {
  const provider = env.LLM_PROVIDER?.toLowerCase() || 'gemini';

  // 1. Gemini Cloud Mode
  if (provider === 'gemini') {
    if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY.trim() === '') {
      console.log('[LLM Orchestrator] No GEMINI_API_KEY configured. Falling back to Offline Mode.');
      return processOfflineChat(messages, projectParams);
    }

    try {
      return await processGeminiChat(messages, projectParams);
    } catch (geminiError: any) {
      console.error('[LLM Orchestrator] Gemini invocation failed. Falling back to Offline Mode. Error:', geminiError.message || geminiError);
      
      // Execute offline fallback
      const offlineResult = processOfflineChat(messages, projectParams);
      
      // Annotate offline response so client knows Gemini connection failed
      const rawErr = geminiError.message || '';
      let errorReason = 'Temporary API or network error';
      if (rawErr.includes('400') || rawErr.includes('403') || rawErr.includes('API key not valid')) {
        errorReason = 'Invalid or unauthorized Gemini API key';
      } else if (rawErr.includes('429')) {
        errorReason = 'Gemini API rate limit reached';
      } else if (rawErr.includes('503') || rawErr.includes('high demand')) {
        errorReason = 'Gemini service temporarily experiencing high demand';
      }

      return {
        ...offlineResult,
        providerStatus: `Gemini Connection Failed: ${errorReason}. Operating in Offline Mode.`
      };
    }
  }

  // 2. OpenAI Cloud Mode
  if (provider === 'openai') {
    if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.trim() === '') {
      console.log('[LLM Orchestrator] No OPENAI_API_KEY configured. Falling back to Offline Mode.');
      return processOfflineChat(messages, projectParams);
    }

    try {
      return await processOpenAIChat(messages, projectParams);
    } catch (openaiError: any) {
      console.error('[LLM Orchestrator] OpenAI invocation failed. Falling back to Offline Mode. Error:', openaiError.message || openaiError);
      const offlineResult = processOfflineChat(messages, projectParams);
      return {
        ...offlineResult,
        providerStatus: 'OpenAI Connection Failed. Operating in Offline Mode.'
      };
    }
  }

  // 3. Explicit Offline Mode
  return processOfflineChat(messages, projectParams);
}
