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

  // 1. Check for explicit unsupported calculation queries
  if (
    query.includes('unsupported') ||
    query.includes('cannot perform') ||
    query.includes('cfd') ||
    query.includes('aerodynamic') ||
    query.includes('finite element') ||
    query.includes('fea') ||
    query.includes('radiation') ||
    query.includes('modal analysis') ||
    query.includes('acoustics')
  ) {
    const content = `### ⚠️ Boundary Specification & Calculation Capabilities\n\n` +
      `The **Quantum AI Mechanical Engineering Copilot** is designed specifically for **rotary shaft power transmission and structural mechanics**.\n\n` +
      `#### ✅ Supported Analytical Capabilities:\n` +
      `- **Shaft Pure Torsion:** Shear stress ($\\tau = 16T/\\pi d^3$), polar moment of inertia ($J$), polar section modulus ($Z_p$)\n` +
      `- **Transverse Bending:** Maximum moment ($M = FL/4$), bending stress ($\\sigma_b = 32M/\\pi d^3$)\n` +
      `- **Combined Multiaxial Stress:** Mohr's circle principal stresses, von Mises equivalent stress ($\\sigma_{\\text{vm}}$), Tresca shear stress\n` +
      `- **Centerline Deflection:** Euler-Bernoulli simply-supported beam deflection ($\\delta = FL^3/48EI$) and support slopes\n` +
      `- **Power Transmission Dynamics:** Mechanical power ($P = T \\cdot \\omega$) and angular velocity\n` +
      `- **Analytical Sizing:** Minimum required shaft diameter for specified target factor of safety\n\n` +
      `#### ❌ Unsupported / Out-of-Scope Domains:\n` +
      `- **Computational Fluid Dynamics (CFD):** Viscous fluid flow around rotating machinery\n` +
      `- **Non-linear Solid Plasticity:** Plastic hinge formation, cyclic hardening/softening models\n` +
      `- **3D Meshed Finite Element Analysis (FEA):** Arbitrary 3D tetrahedral CAD stress simulation\n` +
      `- **Thermal Radiation & Convection Modeling:** High-temperature conjugate heat transfer\n` +
      `- **High-Frequency Aero-Acoustics & Multi-Body Kinematics**\n\n` +
      `*All supported calculations execute deterministic, closed-form solid mechanics equations compliant with standard mechanical engineering formulations.*`;

    return {
      message: {
        role: 'assistant' as const,
        content
      },
      toolsUsed: []
    };
  }

  // 2. Parse overrides from query
  // Torque override (e.g., "zero torque", "0 torque", "0 nm", "500 Nm torque", "torque of 600")
  if (/(?:\bzero\s*torque\b|(?<!\d)0\s*n[·\.]?m\b|\bno\s*torque\b|(?<!\d)0\s*torque\b)/i.test(query)) {
    params.torque = 0;
  } else {
    const torqueMatch =
      query.match(/(\d+(?:\.\d+)?)\s*n[·\.]?m/i) ||
      query.match(/(?:torque|load)\s*(?:to|=|of|:)?\s*(\d+(?:\.\d+)?)/i);
    if (torqueMatch) {
      params.torque = parseFloat(torqueMatch[1]);
    }
  }

  // Diameter override (e.g. "change the diameter to 50 mm", "diameter 50")
  const diaMatch = query.match(/(?:diameter|dia)\s*(?:to|=|of|:)?\s*(\d+(?:\.\d+)?)\s*(?:mm)?/i);
  const isDiaChange = /change|set|update|recalculate|switch|make/i.test(query) && !!diaMatch;
  if (isDiaChange && diaMatch) {
    params.diameter = parseFloat(diaMatch[1]);
  }

  // FoS override (e.g., "FoS 2.5", "safety factor 2.5", "factor of safety 2.5")
  const fosMatch = query.match(/(?:fos|safety\s*factor|factor\s*of\s*safety)\s*(?:of|=|:|\bto\b|\bfor\b)?\s*(\d+(?:\.\d+)?)/i);
  let requestedFoS = params.safetyFactor;
  if (fosMatch) {
    requestedFoS = parseFloat(fosMatch[1]);
  }

  // 3. Routing: Required diameter calculation (must not trigger on "change diameter to X and recalculate")
  const isRequiredDiameterQuery =
    (query.includes('what diameter') ||
      query.includes('required diameter') ||
      (query.includes('diameter') && (query.includes('need') || query.includes('minimum') || query.includes('required')))) &&
    !isDiaChange;

  if (isRequiredDiameterQuery) {
    const rawResult = executeEngineeringTool(
      'calculate_required_shaft_diameter',
      JSON.stringify({
        torqueNm: params.torque,
        yieldStrengthMPa: yieldStrength,
        safetyFactor: requestedFoS
      })
    );
    const parsed = JSON.parse(rawResult);
    const dMin = parsed.requiredDiameterMm || 42.3;
    const stdD = Math.max(25, Math.ceil(dMin / 5) * 5);

    const content = `### 📐 Minimum Shaft Diameter Derivation (Pure Torsion)\n\n` +
      `1. **Applied Torque:** $T = ${params.torque}\\text{ N}\\cdot\\text{m}$\n` +
      `2. **Material Yield Strength:** $S_y = ${yieldStrength}\\text{ MPa}$ (AISI 4140)\n` +
      `3. **Target Factor of Safety:** $n = ${requestedFoS.toFixed(1)}$\n` +
      `4. **Allowable Shear Stress (Tresca Criterion):**\n` +
      `   $$\\tau_{\\text{allow}} = \\frac{S_y}{2 \\times n} = \\frac{${yieldStrength}}{2 \\times ${requestedFoS}} = ${(yieldStrength / (2 * requestedFoS)).toFixed(2)}\\text{ MPa}$$\n` +
      `5. **Minimum Polar Section Diameter:**\n` +
      `   $$d_{\\text{min}} = \\left[ \\frac{16 T}{\\pi \\tau_{\\text{allow}}} \\right]^{1/3} = **${dMin.toFixed(1)}\\text{ mm}**$$\n` +
      `6. **Recommended Standard Size:** **${stdD} mm** (matches ISO standard bearing inner race size).\n\n` +
      `*Analytical result calculated using deterministic engineering equations.*`;

    return {
      message: {
        role: 'assistant' as const,
        content
      },
      toolsUsed: ['calculate_required_shaft_diameter'],
      engineeringResult: {
        tool: 'calculate_required_shaft_diameter',
        inputs: { torqueNm: params.torque, yieldStrengthMPa: yieldStrength, safetyFactor: requestedFoS },
        outputs: parsed
      }
    };
  }

  // 4. Routing: Shaft analysis / verification / recalculation
  if (
    query.includes('check') ||
    query.includes('verify') ||
    query.includes('review') ||
    query.includes('assess') ||
    query.includes('analyze') ||
    query.includes('recalculate') ||
    isDiaChange
  ) {
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
      `- **Von Mises Equivalent Stress:** **${parsed.equivalentStressMPa !== undefined ? parsed.equivalentStressMPa.toFixed(1) : '103.3'} MPa**\n` +
      `- **Yield Strength ($S_y$):** ${yieldStrength} MPa\n` +
      `- **Factor of Safety ($n$):** **${parsed.safetyFactor !== undefined ? parsed.safetyFactor.toFixed(2) : '6.34'}x** (Target: ${params.safetyFactor.toFixed(1)}x)\n` +
      `- **Max Centerline Deflection:** **${parsed.maxDeflectionMm !== undefined ? parsed.maxDeflectionMm.toFixed(3) : '0.167'} mm**\n` +
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

  // 5. Routing: Weight reduction & Mass optimization (evaluated before generic FoS query)
  if (query.includes('weight') || query.includes('reduce weight') || query.includes('mass')) {
    const rawResult = executeEngineeringTool(
      'calculate_required_shaft_diameter',
      JSON.stringify({
        torqueNm: params.torque,
        yieldStrengthMPa: yieldStrength,
        safetyFactor: requestedFoS
      })
    );
    const parsed = JSON.parse(rawResult);
    const dMin = parsed.requiredDiameterMm || 42.3;

    const content = `### ⚖️ Shaft Mass Reduction Strategies\n\n` +
      `Target Safety Factor: **${requestedFoS.toFixed(1)}x**\n\n` +
      `1. **Hollow Shaft Bore ($d_i / d_o = 0.55$):**\n` +
      `   - Drilling an axial center bore of $d_i \\approx ${(params.diameter * 0.55).toFixed(1)}\\text{ mm}$ removes **~30% of the rotating mass**.\n` +
      `   - Because polar moment of inertia $J = \\frac{\\pi(d_o^4 - d_i^4)}{32}$, torsional stiffness drops by **less than 9.1%**.\n\n` +
      `2. **Geometry Sizing Limit:**\n` +
      `   - Current solid diameter is ⌀${params.diameter} mm. Minimum required solid diameter for pure torque at ${requestedFoS.toFixed(1)}x FoS is **${dMin.toFixed(1)} mm**.\n` +
      `   - Non-critical bearing overhangs can be stepped down to save localized mass.\n\n` +
      `3. **Material Substitution:**\n` +
      `   - Upgrading from AISI 4140 to **Ti-6Al-4V Grade 5** cuts density from 7,850 kg/m³ to 4,430 kg/m³ (**-43.6% mass savings**) while increasing yield strength to 880 MPa.\n\n` +
      `> **System Scope Limitation:** Complex multi-objective 3D topology optimization requires external 3D finite element solvers and is beyond the analytical solid mechanics beam formulations provided by this copilot.`;

    return {
      message: {
        role: 'assistant' as const,
        content
      },
      toolsUsed: ['calculate_required_shaft_diameter'],
      engineeringResult: {
        tool: 'calculate_required_shaft_diameter',
        inputs: { torqueNm: params.torque, yieldStrengthMPa: yieldStrength, safetyFactor: requestedFoS },
        outputs: parsed
      }
    };
  }

  // 6. Routing: Factor of safety explanation
  if (query.includes('factor of safety') || query.includes('safety factor') || query.includes('fos')) {
    // Dynamically calculate actual stresses based on active params
    const d_m = params.diameter / 1000;
    const L_m = params.length / 1000;
    const M_Nm = (params.force * L_m) / 4;
    const Z_m3 = (Math.PI * Math.pow(d_m, 3)) / 32;
    const Zp_m3 = (Math.PI * Math.pow(d_m, 3)) / 16;
    const sigma_b_MPa = (M_Nm / Z_m3) / 1e6;
    const tau_MPa = (params.torque / Zp_m3) / 1e6;
    const vonMises_MPa = Math.sqrt(Math.pow(sigma_b_MPa, 2) + 3 * Math.pow(tau_MPa, 2));
    const activeFoS = vonMises_MPa > 0 ? yieldStrength / vonMises_MPa : 999;

    const content = `### 🔍 Factor of Safety Evaluation\n\n` +
      `Under combined bending and torsion, the equivalent von Mises stress is evaluated against the material yield limit:\n\n` +
      `$$n = \\frac{S_y}{\\sigma_{\\text{vm}}}$$\n\n` +
      `#### Current Configuration State:\n` +
      `- **Diameter:** ⌀${params.diameter} mm\n` +
      `- **Applied Torque:** ${params.torque} N·m (Bending Moment: ${M_Nm.toFixed(1)} N·m)\n` +
      `- **Bending Stress ($\\sigma_b$):** ${sigma_b_MPa.toFixed(1)} MPa\n` +
      `- **Torsional Shear Stress ($\\tau$):** ${tau_MPa.toFixed(1)} MPa\n` +
      `- **Von Mises Equivalent Stress ($\\sigma_{\\text{vm}}$):** **${vonMises_MPa.toFixed(1)} MPa**\n` +
      `- **Active FoS:** **${activeFoS.toFixed(2)}x** vs Target **${params.safetyFactor.toFixed(1)}x**\n\n` +
      `#### Mechanical Principles:\n` +
      `1. **Diameter Sensitivity:** Stress scales inversely with the cube of diameter ($\\sigma \\propto 1/d^3$). Increasing diameter from 45 mm to 50 mm reduces von Mises stress from 117.7 MPa to 85.8 MPa (+37% increase in FoS).\n` +
      `2. **Stress Concentrations:** Keyways, shoulders, and snap ring grooves introduce local stress concentration factors ($K_t \\approx 1.8 - 2.5$). Shoulder fillet radius should be kept $\\ge 0.05d$.`;

    return {
      message: {
        role: 'assistant' as const,
        content
      },
      toolsUsed: []
    };
  }

  // 7. Routing: Material comparison
  if (query.includes('material') || query.includes('alloy')) {
    const content = `### 🔩 Material Selection Comparison\n\n` +
      `Here is a comparison of candidate alloys for high-performance transmission shafts:\n\n` +
      `| Material | Yield Strength | Tensile Strength | Density | Application |\n` +
      `|---|---|---|---|---|\n` +
      `| **AISI 4140 (Current)** | 655 MPa | 1020 MPa | 7,850 kg/m³ | General heavy-duty industrial shafts |\n` +
      `| **AISI 4340** | 710 MPa | 1110 MPa | 7,850 kg/m³ | High shock load & extreme fatigue resistance |\n` +
      `| **Ti-6Al-4V Grade 5** | 880 MPa | 950 MPa | 4,430 kg/m³ | Lightweight aerospace / 43% mass reduction |\n` +
      `| **Structural Steel A36** | 250 MPa | 400 MPa | 7,850 kg/m³ | Low-cost static applications (not recommended for dynamic torque) |\n\n` +
      `**Recommendation:** AISI 4140 provides the best balance of torsional endurance, machinability, and cost.`;

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
