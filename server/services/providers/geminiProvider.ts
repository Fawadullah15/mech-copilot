import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.ts';
import { geminiFunctionDeclarations, executeEngineeringTool, getToolMetadata } from '../../tools/engineeringTools.ts';
import { ChatMessage } from '../../types/api.ts';
import { LLMProviderResult, ProviderStatusInfo, ToolExecutionLogEntry } from './types.ts';

const SYSTEM_PROMPT = `You are a Mechanical Engineering Design Copilot specializing in solid circular shaft design and power transmission mechanics.

CORE BEHAVIORAL REQUIREMENTS:
1. Always call the available engineering tools whenever the user requests a calculation, shaft sizing, complete analysis, material properties, design comparison, project creation, parameter updates, version snapshots, or report generation.
2. NEVER invent, fabricate, or approximate numerical engineering results or material properties. All authoritative engineering numbers MUST come from the deterministic calculation engine via tool calls.
3. NEVER claim a design passes or meets safety requirements without a deterministic tool result confirming Factor of Safety >= target.
4. When bending loads (radial force or bending moment) and span are present, ALWAYS evaluate combined stresses. Never use a torsion-only diameter to certify combined loading.
5. Identify explicit governing assumptions: simply supported span with central radial point load (M_max = FL/4) and uniform circular cross-section.
6. Clearly distinguish between the minimum required diameter (d_min) and the currently selected/active shaft diameter.
7. Explain analytical results using governing solid mechanics formulations (torsional shear tau = 16T/pi*d^3, bending sigma_b = 32M/pi*d^3, Von Mises sigma_vm = sqrt(sigma_b^2 + 3*tau^2), Tresca sigma_tr = sqrt(sigma_b^2 + 4*tau^2), deflection delta = FL^3/48EI) with substituted numerical values.
8. If critical parameters for a new design are missing, ask a concise clarifying question rather than guessing.
9. When the user asks to start, create, or initialize a project or design a new shaft, call create_project with the extracted parameters.
10. When the user asks to update, modify, or change design parameters (e.g. increase torque, change diameter, change material), call update_project_parameters and recalculate.
11. When the user asks to save a design version or create a milestone/checkpoint, call save_design_version.
12. When the user asks to generate the engineering calculation report, call generate_engineering_report.`;

// In-memory verification cache to avoid redundant API calls
let cachedStatus: ProviderStatusInfo | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 60000; // 1 minute

export async function verifyGeminiConnection(forceCheck = false): Promise<ProviderStatusInfo> {
  const now = Date.now();
  if (!forceCheck && cachedStatus && (now - lastCheckTime) < CACHE_TTL_MS) {
    return cachedStatus;
  }

  if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY.trim() === '') {
    cachedStatus = {
      provider: 'gemini',
      status: 'Gemini Connection Failed',
      model: env.GEMINI_MODEL,
      verified: false,
      details: 'GEMINI_API_KEY is not configured in server environment.',
      lastChecked: new Date().toISOString()
    };
    lastCheckTime = now;
    return cachedStatus;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    // Minimal verification call using configured model
    const testRes = await ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: 'Ping: reply with "READY" if operational.',
      config: {
        maxOutputTokens: 10,
        temperature: 0.1
      }
    });

    if (testRes && testRes.text) {
      cachedStatus = {
        provider: 'gemini',
        status: 'Gemini Connected',
        model: env.GEMINI_MODEL,
        verified: true,
        details: `Successfully connected to Gemini API (${env.GEMINI_MODEL}).`,
        lastChecked: new Date().toISOString()
      };
      lastCheckTime = now;
      return cachedStatus;
    }

    throw new Error('Received empty response from Gemini API.');
  } catch (err: any) {
    const rawMsg = err.message || String(err);
    let sanitizedDetails = 'Gemini API connection error.';

    if (rawMsg.includes('400') || rawMsg.includes('403') || rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid')) {
      sanitizedDetails = 'Invalid or unauthorized Gemini API key.';
    } else if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
      sanitizedDetails = 'Gemini API quota exceeded or rate limit reached.';
    } else if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand')) {
      sanitizedDetails = 'Gemini model temporarily experiencing high demand.';
    } else if (rawMsg.includes('ECONNREFUSED') || rawMsg.includes('ETIMEDOUT') || rawMsg.includes('fetch failed')) {
      sanitizedDetails = 'Network timeout contacting Google Gemini API endpoints.';
    }

    console.warn(`[Gemini Provider] Health check warning: ${sanitizedDetails}`);

    cachedStatus = {
      provider: 'gemini',
      status: 'Gemini Connection Failed',
      model: env.GEMINI_MODEL,
      verified: false,
      details: sanitizedDetails,
      lastChecked: new Date().toISOString()
    };
    lastCheckTime = now;
    return cachedStatus;
  }
}

export async function processGeminiChat(
  messages: ChatMessage[],
  projectParams?: any
): Promise<LLMProviderResult> {
  if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY.trim() === '') {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const model = env.GEMINI_MODEL;

  // Format active project context preamble if parameters are available
  let contextPreamble = '';
  if (projectParams) {
    contextPreamble = `\n[ACTIVE WORKSTATION STATE: Material: ${projectParams.materialId || 'AISI 4140'}, Diameter: ${projectParams.diameter || 45} mm, Length: ${projectParams.length || 320} mm, Torque: ${projectParams.torque || 500} N·m, Force: ${projectParams.force || 12000} N, RPM: ${projectParams.rpm || 1450}, FoS Target: ${projectParams.safetyFactor || 2.0}, Criterion: ${projectParams.criterion || 'Von Mises'}, Deflection Limit: L/${projectParams.deflectionLimitRatio || 1000}]\n`;
  }

  // Convert ChatMessage[] to Gemini contents schema
  const contents: Array<{
    role: 'user' | 'model';
    parts: Array<any>;
  }> = [];

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const role = m.role === 'assistant' ? 'model' : 'user';
    let text = m.content;
    
    // Attach project context to the latest user message
    if (i === messages.length - 1 && role === 'user' && contextPreamble) {
      text = `${text}\n${contextPreamble}`;
    }

    contents.push({
      role,
      parts: [{ text }]
    });
  }

  const tools: any = [
    {
      functionDeclarations: geminiFunctionDeclarations
    }
  ];

  const config: any = {
    systemInstruction: SYSTEM_PROMPT,
    tools,
    temperature: 0.2
  };

  // Helper with transient retry and timeout guard
  const callWithRetry = async (payloadContents: any[], targetModel: string, attempts = 2) => {
    let lastErr: any;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout contacting Gemini API (15s)')), 15000)
        );
        return (await Promise.race([
          ai.models.generateContent({
            model: targetModel,
            contents: payloadContents,
            config
          }),
          timeoutPromise
        ])) as any;
      } catch (err: any) {
        lastErr = err;
        const msg = err.message || '';
        // If transient 503, 429, or timeout, retry with backoff
        if ((msg.includes('503') || msg.includes('high demand') || msg.includes('429') || msg.includes('Timeout')) && attempt < attempts) {
          console.warn(`[Gemini Provider] Transient ${msg.includes('503') ? '503' : 'retry'} encountered, retrying in 1s...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  };

  // Multi-turn tool execution loop (supports up to 8 chained tool rounds)
  const toolsUsed: string[] = [];
  const toolExecutionLogs: ToolExecutionLogEntry[] = [];
  const actions: any[] = [];
  let latestAction: any = null;
  let primaryEngineeringResult: any = null;
  let finalContent = '';
  const MAX_TOOL_TURNS = 8;
  const executionContext = {
    projectId: projectParams?.id || projectParams?.projectId,
    parameters: projectParams
  };

  let currentResponse = await callWithRetry(contents, model);

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const functionCalls = currentResponse.functionCalls;
    if (!functionCalls || functionCalls.length === 0) {
      // Extract text from candidates if text property is empty
      if (currentResponse.text) {
        finalContent = currentResponse.text;
      } else if (currentResponse.candidates && currentResponse.candidates[0]?.content?.parts) {
        finalContent = currentResponse.candidates[0].content.parts
          .filter((p: any) => p.text)
          .map((p: any) => p.text)
          .join('\n');
      }
      break;
    }

    // Append model's candidate turn with function calls to contents
    if (currentResponse.candidates && currentResponse.candidates[0]?.content) {
      contents.push(currentResponse.candidates[0].content as any);
    }

    const responseParts: any[] = [];

    for (const call of functionCalls) {
      const toolName = call.name || 'unknown_tool';
      if (!toolsUsed.includes(toolName)) {
        toolsUsed.push(toolName);
      }
      const toolMeta = getToolMetadata(toolName);
      const toolStart = Date.now();
      console.log(`[Gemini Tool Call Turn ${turn + 1}] Executing deterministic tool: ${toolName}`);

      const rawResult = executeEngineeringTool(toolName, JSON.stringify(call.args || {}), executionContext);
      const toolDuration = Date.now() - toolStart;
      console.log(`[Gemini Tool Call Turn ${turn + 1}] Completed execution for: ${toolName} in ${toolDuration}ms`);

      let parsedResult: any;
      try {
        parsedResult = JSON.parse(rawResult);
      } catch {
        parsedResult = { result: rawResult };
      }

      toolExecutionLogs.push({
        tool: toolName,
        category: toolMeta.category,
        permission: toolMeta.permission,
        status: rawResult.includes('"error":') ? 'failed' : 'success',
        timestamp: new Date().toISOString(),
        durationMs: Math.max(1, toolDuration),
      });

      if (parsedResult?.action) {
        actions.push(parsedResult.action);
        latestAction = parsedResult.action;
      }

      // Prioritize shaft sizing/analysis calculation results for primaryEngineeringResult
      if (!rawResult.includes('"error":')) {
        if (
          !primaryEngineeringResult ||
          toolName === 'run_complete_shaft_analysis' ||
          toolName === 'calculate_required_diameter' ||
          toolName === 'calculate_required_shaft_diameter' ||
          toolName === 'run_full_shaft_analysis'
        ) {
          primaryEngineeringResult = {
            tool: toolName,
            inputs: call.args,
            outputs: parsedResult,
            action: parsedResult?.action
          };
        }
      }

      responseParts.push({
        functionResponse: {
          name: toolName,
          response: parsedResult
        }
      });
    }

    // Append function response turn to contents
    contents.push({
      role: 'user',
      parts: responseParts
    });

    // Request subsequent model turn
    currentResponse = await callWithRetry(contents, model);
  }

  // Final text extraction
  if (!finalContent) {
    if (currentResponse.text) {
      finalContent = currentResponse.text;
    } else if (currentResponse.candidates && currentResponse.candidates[0]?.content?.parts) {
      finalContent = currentResponse.candidates[0].content.parts
        .filter((p: any) => p.text && !p.thought)
        .map((p: any) => p.text)
        .join('\n');
    }
  }

  if (!finalContent || !finalContent.trim()) {
    if (primaryEngineeringResult?.outputs?.summary) {
      finalContent = String(primaryEngineeringResult.outputs.summary);
    } else if (toolsUsed.length > 0) {
      finalContent = `Completed engineering operations (${toolsUsed.join(', ')}). Results and workstation state have been synchronized.`;
    } else {
      finalContent = 'Engineering agent ready. Specify shaft loads, material, or analysis action to proceed.';
    }
  }

  return {
    message: {
      role: 'assistant',
      content: finalContent
    },
    toolsUsed,
    toolExecutionLogs: toolExecutionLogs.length > 0 ? toolExecutionLogs : undefined,
    operationState: 'Completed',
    engineeringResult: primaryEngineeringResult || (latestAction ? { tool: latestAction.type, action: latestAction, outputs: latestAction } : null),
    action: latestAction,
    actions: actions.length > 0 ? actions : undefined,
    provider: 'gemini',
    providerStatus: toolsUsed.length > 0 ? 'Engineering Calculation Completed' : 'Gemini Connected',
    model
  };
}
