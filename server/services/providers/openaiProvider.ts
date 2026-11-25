import OpenAI from 'openai';
import { env } from '../../config/env.ts';
import { engineeringTools, executeEngineeringTool } from '../../tools/engineeringTools.ts';
import { ChatMessage } from '../../types/api.ts';
import { LLMProviderResult, ProviderStatusInfo } from './types.ts';

const SYSTEM_PROMPT = `You are a Mechanical Engineering Design Copilot.

Your job is to help users reason about mechanical shaft design.
Use the available engineering tools whenever the user asks for a calculation that those tools can perform.
Do not invent engineering calculations when a deterministic tool exists.
Do not fabricate numerical results.
Do not claim that a calculation was performed unless a tool actually returned the result.
Before calling a tool, identify the required parameters and units.
If required information is missing, ask the user for it.
After receiving a tool result, explain the result clearly.
Keep engineering calculations separate from conversational reasoning.
Do not silently assume important engineering parameters.`;

export async function verifyOpenAIConnection(): Promise<ProviderStatusInfo> {
  if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY.trim() === '') {
    return {
      provider: 'openai',
      status: 'OpenAI Connection Failed',
      model: env.OPENAI_MODEL,
      verified: false,
      details: 'OPENAI_API_KEY is not configured in server environment.',
      lastChecked: new Date().toISOString()
    };
  }

  return {
    provider: 'openai',
    status: 'OpenAI Connected',
    model: env.OPENAI_MODEL,
    verified: true,
    details: 'OpenAI API key configured.',
    lastChecked: new Date().toISOString()
  };
}

export async function processOpenAIChat(
  messages: ChatMessage[],
  projectParams?: any
): Promise<LLMProviderResult> {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured in server environment.');
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const model = env.OPENAI_MODEL;

  const conversation: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.ChatCompletionMessageParam)
  ];

  const response = await openai.chat.completions.create({
    model,
    messages: conversation,
    tools: engineeringTools,
    tool_choice: 'auto',
  });

  const responseMessage = response.choices[0].message;

  if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
    return {
      message: {
        role: 'assistant',
        content: responseMessage.content || '',
      },
      toolsUsed: [],
      provider: 'openai',
      providerStatus: 'OpenAI Connected',
      model
    };
  }

  const toolsUsed: string[] = [];
  let engineeringResult: any = null;
  conversation.push(responseMessage);

  for (const rawToolCall of responseMessage.tool_calls) {
    if (rawToolCall.type !== 'function') continue;
    const toolCall = rawToolCall as any;

    toolsUsed.push(toolCall.function.name);
    console.log(`[OpenAI Tool Call] Executing tool: ${toolCall.function.name}`);

    const functionResponse = executeEngineeringTool(
      toolCall.function.name,
      toolCall.function.arguments
    );

    console.log(`[OpenAI Tool Call] Completed execution for: ${toolCall.function.name}`);

    if (!engineeringResult && !functionResponse.includes('"error":')) {
      try {
        engineeringResult = {
          tool: toolCall.function.name,
          inputs: JSON.parse(toolCall.function.arguments),
          outputs: JSON.parse(functionResponse)
        };
      } catch {
        // Ignore JSON parse errors
      }
    }

    conversation.push({
      tool_call_id: toolCall.id,
      role: 'tool',
      content: functionResponse,
    });
  }

  const secondResponse = await openai.chat.completions.create({
    model,
    messages: conversation,
  });

  return {
    message: {
      role: 'assistant',
      content: secondResponse.choices[0].message.content || '',
    },
    toolsUsed,
    engineeringResult,
    provider: 'openai',
    providerStatus: 'Engineering Calculation Completed',
    model
  };
}
