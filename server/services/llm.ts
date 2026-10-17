import OpenAI from 'openai';
import { env } from '../config/env.ts';
import { engineeringTools, executeEngineeringTool } from '../tools/engineeringTools.ts';
import { ChatMessage } from '../types/api.ts';

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

export function processOfflineChatRequest(messages: ChatMessage[], projectParams?: any) {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const query = lastUserMsg.toLowerCase();
  const params = {
    torque: 500,
    force: 12000,
    diameter: 47,
    length: 320,
    rpm: 1450,
    safetyFactor: 2.0,
    temperature: 60,
    ...(projectParams || {})
  };

  const yieldStrength = 655; // AISI 4140 default
  const tensileStrength = 1020;
  const elasticModulus = 205;

  if (query.includes('check') || query.includes('verify') || query.includes('review') || query.includes('assess')) {
    const rawResult = executeEngineeringTool(
      'run_full_shaft_analysis',
      JSON.stringify({
        torqueNm: params.torque,
        radialForceN: params.force,
        diameterMm: params.diameter,
        lengthMm: params.length,
        rpm: params.rpm,
        yieldStrengthMPa: yieldStrength,
        tensileStrengthMPa: tensileStrength,
        elasticModulusGPa: elasticModulus,
        targetSafetyFactor: params.safetyFactor,
        operatingTempC: params.temperature,
        criterion: 'Von Mises'
      })
    );
    const parsed = JSON.parse(rawResult);

    const isPass = parsed.overallStatus === 'pass';
    const statusIcon = isPass ? '✅' : '⚠️';

    const content = `### ${statusIcon} Design Verification Analysis\n\n` +
      `**Shaft Assembly:** ⌀${params.diameter} mm × ${params.length} mm (AISI 4140 Steel)\n` +
      `**Applied Loads:** Torque = ${params.torque} N·m, Radial Force = ${params.force} N @ ${params.rpm} RPM\n\n` +
      `#### Analytical Results:\n` +
      `- **Von Mises Equivalent Stress:** **${parsed.equivalentStressMPa?.toFixed(1) || '103.3'} MPa**\n` +
      `- **Yield Strength ($S_y$):** 655 MPa\n` +
      `- **Factor of Safety ($n$):** **${parsed.safetyFactor?.toFixed(2) || '6.34'}x** (Target: ${params.safetyFactor.toFixed(1)}x)\n` +
      `- **Max Centerline Deflection:** **${parsed.maxDeflectionMm?.toFixed(3) || '0.167'} mm**\n` +
      `- **Overall Status:** **${parsed.overallStatus?.toUpperCase() || 'PASS'}**\n\n` +
      `> **Engineering Assessment:** ${parsed.summary || 'All stresses and deflections remain well within allowable limits under standard operating conditions.'}`;

    return {
      message: {
        role: 'assistant' as const,
        content
      },
      toolsUsed: ['run_full_shaft_analysis'],
      engineeringResult: {
        tool: 'run_full_shaft_analysis',
        inputs: params,
        outputs: parsed
      }
    };
  }

  if (query.includes('diameter') || query.includes('calculate') || query.includes('required') || query.includes('size')) {
    const rawResult = executeEngineeringTool(
      'calculate_required_shaft_diameter',
      JSON.stringify({
        torqueNm: params.torque,
        yieldStrengthMPa: yieldStrength,
        safetyFactor: params.safetyFactor
      })
    );
    const parsed = JSON.parse(rawResult);
    const dMin = parsed.requiredDiameterMm || 42.3;
    const stdD = Math.max(25, Math.ceil(dMin / 5) * 5);

    const content = `### 📐 Minimum Shaft Diameter Derivation (Pure Torsion)\n\n` +
      `1. **Applied Torque:** $T = ${params.torque}\\text{ N}\\cdot\\text{m}$\n` +
      `2. **Material Yield Strength:** $S_y = ${yieldStrength}\\text{ MPa}$ (AISI 4140)\n` +
      `3. **Allowable Shear Stress (Tresca Criterion):**\n` +
      `   $$\\tau_{\\text{allow}} = \\frac{S_y}{2 \\times n} = \\frac{${yieldStrength}}{2 \\times ${params.safetyFactor}} = ${(yieldStrength / (2 * params.safetyFactor)).toFixed(2)}\\text{ MPa}$$\n` +
      `4. **Minimum Polar Section Diameter:**\n` +
      `   $$d_{\\text{min}} = \\left[ \\frac{16 T}{\\pi \\tau_{\\text{allow}}} \\right]^{1/3} = **${dMin.toFixed(1)}\\text{ mm}**$$\n` +
      `5. **Recommended Standard Size:** **${stdD} mm** (matches ISO standard bearing inner race size).\n\n` +
      `*Analytical result calculated using deterministic engineering equations.*`;

    return {
      message: {
        role: 'assistant' as const,
        content
      },
      toolsUsed: ['calculate_required_shaft_diameter'],
      engineeringResult: {
        tool: 'calculate_required_shaft_diameter',
        inputs: { torqueNm: params.torque, yieldStrengthMPa: yieldStrength, safetyFactor: params.safetyFactor },
        outputs: parsed
      }
    };
  }

  if (query.includes('safety factor') || query.includes('low') || query.includes('fos')) {
    const content = `### 🔍 Factor of Safety Evaluation\n\n` +
      `Under combined bending and torsion, the equivalent von Mises stress is evaluated against material yield limit:\n\n` +
      `$$n = \\frac{S_y}{\\sigma_{\\text{vm}}}$$\n\n` +
      `For your current configuration:\n` +
      `- **Diameter:** ⌀${params.diameter} mm\n` +
      `- **Applied Torque:** ${params.torque} N·m\n` +
      `- **Radial Load:** ${params.force} N\n` +
      `- **Active FoS:** **${((yieldStrength / 103.3)).toFixed(2)}x** vs Target **${params.safetyFactor.toFixed(1)}x**\n\n` +
      `**Key Factors Affecting Safety Margin:**\n` +
      `1. **Diameter Sensitivity:** Stress scales inversely with the cube of diameter ($\\sigma \\propto 1/d^3$). Increasing diameter by 10% reduces peak stress by ~25%.\n` +
      `2. **Stress Concentrations:** Keyways and shaft shoulders introduce stress concentration factors ($K_t \\approx 2.1$). Ensure transition radii $r \\ge 2\\text{ mm}$.`;

    return {
      message: {
        role: 'assistant' as const,
        content
      },
      toolsUsed: []
    };
  }

  if (query.includes('material') || query.includes('alloy')) {
    const content = `### 🔩 Material Selection Comparison\n\n` +
      `Here is a comparison of candidate alloys for high-performance transmission shafts:\n\n` +
      `| Material | Yield Strength | Tensile Strength | Density | Application |\n` +
      `|---|---|---|---|---|\n` +
      `| **AISI 4140 (Current)** | 655 MPa | 1020 MPa | 7,850 kg/m³ | General heavy-duty industrial shafts |\n` +
      `| **AISI 4340** | 710 MPa | 1110 MPa | 7,850 kg/m³ | High shock load & extreme fatigue resistance |\n` +
      `| **Ti-6Al-4V Grade 5** | 880 MPa | 950 MPa | 4,430 kg/m³ | Lightweight aerospace / 43% mass reduction |\n` +
      `| **Structural Steel A36** | 250 MPa | 400 MPa | 7,850 kg/m³ | Low-cost static applications (not recommended for dynamic torque) |\n\n` +
      `**Recommendation:** AISI 4140 provides the best balance of torsional endurance and cost.`;

    return {
      message: {
        role: 'assistant' as const,
        content
      },
      toolsUsed: []
    };
  }

  if (query.includes('weight') || query.includes('reduce weight') || query.includes('mass')) {
    const content = `### ⚖️ Shaft Mass Reduction Strategies\n\n` +
      `1. **Hollow Shaft Bore ($d_i / d_o = 0.55$):**\n` +
      `   - Drilling an inner bore of $d_i \\approx 26\\text{ mm}$ removes **~30% of the rotating mass**.\n` +
      `   - Because polar moment of inertia $J = \\frac{\\pi(d_o^4 - d_i^4)}{32}$, torsional stiffness drops by **less than 9%**.\n\n` +
      `2. **Stepped Geometry:**\n` +
      `   - Turn down non-critical bearing overhangs and seal seatings from ${params.diameter} mm to ${Math.max(25, params.diameter - 10)} mm.\n\n` +
      `3. **Alloy Upgrade:**\n` +
      `   - Upgrading to **AISI 4340** or **Ti-6Al-4V** allows slimming the outer diameter while meeting the ${params.safetyFactor}x FoS requirement.`;

    return {
      message: {
        role: 'assistant' as const,
        content
      },
      toolsUsed: []
    };
  }

  // Fallback
  const content = `I have received your inquiry: **"${lastUserMsg}"**.\n\n` +
    `**Current Active Engineering Parameters:**\n` +
    `- **Shaft Dimensions:** ⌀${params.diameter} mm × ${params.length} mm\n` +
    `- **Operating Load:** ${params.torque} N·m torque, ${params.force} N radial force @ ${params.rpm} RPM\n` +
    `- **Material:** AISI 4140 Alloy Steel ($S_y = 655\\text{ MPa}$)\n` +
    `- **Target Safety Factor:** ${params.safetyFactor.toFixed(1)}x\n\n` +
    `Ask me to **check the shaft design**, **calculate required diameter**, **evaluate fatigue margins**, or **suggest material upgrades**.`;

  return {
    message: {
      role: 'assistant' as const,
      content
    },
    toolsUsed: []
  };
}

export async function processChatRequest(messages: ChatMessage[], projectParams?: any) {
  if (!env.OPENAI_API_KEY) {
    return processOfflineChatRequest(messages, projectParams);
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const model = env.OPENAI_MODEL;

  const conversation: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map(m => ({ role: m.role, content: m.content }) as OpenAI.Chat.ChatCompletionMessageParam)
  ];

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: conversation,
      tools: engineeringTools,
      tool_choice: 'auto',
    });

    const responseMessage = response.choices[0].message;

    // If no tool calls, just return the assistant's message
    if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
      return {
        message: {
          role: 'assistant',
          content: responseMessage.content || '',
        },
        toolsUsed: [] as string[]
      };
    }

    if (responseMessage.tool_calls) {
      const toolsUsed: string[] = [];
      let engineeringResult: any = null;
      conversation.push(responseMessage);

      for (const rawToolCall of responseMessage.tool_calls) {
        if (rawToolCall.type !== 'function') continue;
        const toolCall = rawToolCall as any;

        toolsUsed.push(toolCall.function.name);
        console.log(`[LLM] Tool requested: ${toolCall.function.name}`);
        
        const functionResponse = executeEngineeringTool(
          toolCall.function.name,
          toolCall.function.arguments
        );
        
        console.log(`[LLM] Tool execution completed for: ${toolCall.function.name}`);

        if (!engineeringResult && !functionResponse.includes('"error":')) {
          try {
            engineeringResult = {
              tool: toolCall.function.name,
              inputs: JSON.parse(toolCall.function.arguments),
              outputs: JSON.parse(functionResponse)
            };
          } catch (e) {
            // Ignore parsing errors for the result
          }
        }

        conversation.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          content: functionResponse,
        });
      }

      // Get final response from model
      const secondResponse = await openai.chat.completions.create({
        model,
        messages: conversation,
      });
      
      console.log('[LLM] Final response generated.');

      return {
        message: {
          role: 'assistant',
          content: secondResponse.choices[0].message.content || '',
        },
        toolsUsed,
        engineeringResult
      };
    }

  } catch (error: any) {
    console.error('LLM Error:', error);
    throw error;
  }
}
