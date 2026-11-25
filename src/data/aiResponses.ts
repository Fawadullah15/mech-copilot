import type { CopilotMessage, ReasoningStep } from '../types';

let msgCounter = 200;
export function nextId(): string {
  return `msg-${++msgCounter}`;
}

export function now(): string {
  return new Date().toISOString();
}

// Initial reasoning chain (empty for clean workspace)
export const defaultShaftReasoningChain: ReasoningStep[] = [];

// Initial conversation in new threads (empty for clean workspace)
export const initialMessages: CopilotMessage[] = [];

export const explanationResponse: CopilotMessage = {
  id: '',
  role: 'assistant',
  type: 'calculation',
  content:
    '**Shaft Diameter Calculation — Analytical Proof:**\n\n' +
    '1. **Input Torque:** $T = 500\\text{ Nm}$\n' +
    '2. **Material Yield Strength:** $S_y = 655\\text{ MPa}$ (AISI 4140)\n' +
    '3. **Allowable Shear Stress:**\n' +
    '   $$\\tau_{\\text{allow}} = \\frac{S_y}{2 \\times n} = \\frac{655}{2 \\times 2.0} = 163.75\\text{ MPa}$$\n' +
    '4. **Minimum Diameter from Polar Section Modulus:**\n' +
    '   $$\\tau_{\\text{max}} = \\frac{16T}{\\pi d^3} \\le \\tau_{\\text{allow}}$$\n' +
    '   $$d_{\\text{min}} = \\sqrt[3]{\\frac{16T}{\\pi \\tau_{\\text{allow}}}} = \\sqrt[3]{\\frac{16 \\times 500}{\\pi \\times 163.75 \\times 10^6}} \\times 1000 = 42.27\\text{ mm}$$\n' +
    '5. **Standard Selection:** Round up to nearest standard bearing journal size $\\rightarrow$ **45 mm**.',
  timestamp: '',
  structuredData: [
    { label: 'Theory', value: 'Max Shear (Tresca)' },
    { label: 'Formula', value: 'd = [16T/(πτ)]^(1/3)' },
    { label: 'τ_allow', value: '163.8 MPa' },
    { label: 'Computed d', value: '42.3 mm' },
    { label: 'Standard d', value: '45.0 mm' },
  ],
  actions: [
    { label: 'Apply 45 mm', type: 'apply', payload: { diameter: 45 } },
    { label: 'Run Analysis', type: 'analyze' },
  ],
};
