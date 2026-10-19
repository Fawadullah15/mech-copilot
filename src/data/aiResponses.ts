import type { CopilotMessage, ReasoningStep } from '../types';

let msgCounter = 200;
export function nextId(): string {
  return `msg-${++msgCounter}`;
}

export function now(): string {
  return new Date().toISOString();
}

// Sample structured reasoning chain for shaft design
export const defaultShaftReasoningChain: ReasoningStep[] = [
  {
    stage: 'REQUIREMENT',
    summary: 'Applied Torque: 500 Nm @ 1450 RPM',
    details: 'Operating in continuous industrial service with electric motor drive. Torsional load is predominantly steady with moderate start-up shock (shock factor K_a = 1.25). Design service life target: 20,000 hours.',
    expanded: false,
  },
  {
    stage: 'CALCULATION',
    summary: 'Minimum diameter from Maximum Shear Stress (Tresca): 42.3 mm',
    details: 'τ_allow = S_y / (2 × n) = 655 / (2 × 2.0) = 163.75 MPa.\nd_min = [ (16 × T) / (π × τ_allow) ]^(1/3) = [ (16 × 500 × 10³) / (π × 163.75) ]^(1/3) = 42.27 mm.',
    expanded: false,
  },
  {
    stage: 'MATERIAL',
    summary: 'AISI 4140 Alloy Steel (Quenched & Tempered)',
    details: 'Yield Strength: 655 MPa | Tensile: 1020 MPa | Modulus: 205 GPa. Chromium-molybdenum composition ensures through-hardenability and high resistance to torsional fatigue.',
    expanded: false,
  },
  {
    stage: 'SAFETY CHECK',
    summary: 'Calculated Factor of Safety: 2.28 vs Target: 2.0',
    details: 'Combined Von Mises equivalent stress under bending (M = 960 Nm) and torsion (T = 500 Nm) yields σ_vm = 287 MPa. Safety factor n = 655 / 287 = 2.28 (14% margin over target).',
    expanded: false,
  },
  {
    stage: 'RECOMMENDATION',
    summary: 'Specify Standard Diameter: 45 mm',
    details: 'Standard metric bearing journal diameter 45 mm (fits ISO standard 6209 deep groove ball bearings). Yields conservative safety margin and standard keyway geometry (DIN 6885-1 14×9).',
    expanded: true,
  },
];

// Initial conversation in new threads
export const initialMessages: CopilotMessage[] = [
  {
    id: 'msg-1',
    role: 'assistant',
    type: 'general',
    content:
      'Welcome to the Engineering Copilot. I am actively monitoring your design parameters, material selections, and active 3D components. How can I assist with your design analysis today?',
    timestamp: '2026-09-17T06:00:00Z',
  },
  {
    id: 'msg-2',
    role: 'user',
    content: 'Design a shaft capable of handling 500 Nm of torque.',
    timestamp: '2026-09-17T06:01:00Z',
  },
  {
    id: 'msg-3',
    role: 'assistant',
    type: 'recommendation',
    content:
      'Based on the current parameters and AISI 4140 Steel, I recommend a minimum shaft diameter of 42 mm. With a safety factor of 2.0, the standard recommended diameter is 45 mm.\n\nReview the multi-stage engineering reasoning below to inspect the governing equations and safety margin checks:',
    timestamp: '2026-09-17T06:01:30Z',
    structuredData: [
      { label: 'Material', value: 'AISI 4140 Steel' },
      { label: 'Applied Torque', value: '500 Nm' },
      { label: 'Safety Factor', value: '2.0' },
      { label: 'Min. Diameter', value: '42 mm' },
      { label: 'Recommended Diameter', value: '45 mm' },
      { label: 'Status', value: '⚠ Requires confirmation' },
    ],
    reasoningChain: defaultShaftReasoningChain,
    actions: [
      { label: 'Apply Recommendation', type: 'apply' },
      { label: 'Run Analysis', type: 'analyze' },
      { label: 'Explain Calculation', type: 'explain' },
      { label: 'Optimize Design', type: 'optimize' },
    ],
  },
];

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

