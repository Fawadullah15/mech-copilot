import type { DesignParameters, Material, CopilotMessage } from '../../types';
import { nextId, now } from '../../data/aiResponses';

/**
 * Standard metric bearing journal diameters (ISO metric series).
 */
const STANDARD_METRIC_DIAMETERS = [
  10, 12, 15, 17, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
  110, 120, 130, 140, 150, 160, 170, 180, 190, 200
];

export function getNearestStandardDiameter(minDiameterMm: number): number {
  const match = STANDARD_METRIC_DIAMETERS.find((d) => d >= minDiameterMm);
  return match ?? Math.ceil(minDiameterMm / 5) * 5;
}

/**
 * Generates a dynamic, deterministic mathematical proof and engineering explanation
 * based on the active project's exact parameters and material properties.
 * Eliminates static/mocked numbers and provides fully traceable analytical steps.
 */
export function generateCalculationExplanation(
  params: DesignParameters,
  material: Material
): CopilotMessage {
  const T = params.torque; // N·m
  const d = params.diameter; // mm
  const L = params.length; // mm
  const F = params.force; // N
  const n = params.safetyFactor;
  const Sy = material.yieldStrength; // MPa
  const E_GPa = material.elasticModulus; // GPa

  // 1. Torsion analysis:
  // tau_allow = Sy / (2 * n) (Tresca limit)
  const tauAllow = Sy / (2 * n);
  // tau = 16 * T / (pi * d^3) in MPa:
  // (16 * (T * 1e3)) / (pi * d^3)
  const tau = d > 0 ? (16 * T * 1000) / (Math.PI * Math.pow(d, 3)) : 0;

  // d_min for pure torsion:
  const dMinTorsion = tauAllow > 0 && T > 0
    ? Math.cbrt((16 * T * 1000) / (Math.PI * tauAllow))
    : 0;

  // 2. Bending analysis (simply supported, central point load):
  const M = (F * (L / 1000)) / 4; // N·m
  const sigmaB = d > 0 ? (32 * M * 1000) / (Math.PI * Math.pow(d, 3)) : 0; // MPa

  // 3. Combined multiaxial stress (Von Mises):
  const sigmaVM = Math.sqrt(Math.pow(sigmaB, 2) + 3 * Math.pow(tau, 2)); // MPa
  const resultingFoS = sigmaVM > 0 ? Sy / sigmaVM : 999;

  // 4. Deflection:
  const I_m4 = (Math.PI * Math.pow(d / 1000, 4)) / 64;
  const defl_mm = (I_m4 > 0 && E_GPa > 0)
    ? ((F * Math.pow(L / 1000, 3)) / (48 * (E_GPa * 1e9) * I_m4)) * 1000
    : 0;

  const recDiameter = getNearestStandardDiameter(Math.max(dMinTorsion, 10));

  const content =
    `**Deterministic Shaft Calculation — Analytical Derivation:**\n\n` +
    `1. **Active Operating Parameters:**\n` +
    `   - Applied Torque: $T = ${T}\\text{ N}\\cdot\\text{m}$\n` +
    `   - Transverse Force: $F = ${F}\\text{ N}$ across span $L = ${L}\\text{ mm}$\n` +
    `   - Selected Material: **${material.name}** ($S_y = ${Sy}\\text{ MPa}$, $E = ${E_GPa}\\text{ GPa}$)\n` +
    `   - Target Safety Factor: $n_{\\text{target}} = ${n.toFixed(1)}$\n\n` +
    `2. **Allowable Shear Stress (Tresca Yield Hypothesis):**\n` +
    `   $$\\tau_{\\text{allow}} = \\frac{S_y}{2 \\times n} = \\frac{${Sy}}{2 \\times ${n.toFixed(1)}} = ${tauAllow.toFixed(2)}\\text{ MPa}$$\n\n` +
    `3. **Torsional Shear Stress at Active Diameter ($d = ${d}\\text{ mm}$):**\n` +
    `   $$\\tau = \\frac{16T}{\\pi d^3} = \\frac{16 \\times (${T} \\times 10^3)}{\\pi \\times ${d}^3} = ${tau.toFixed(2)}\\text{ MPa}$$\n` +
    `   *Minimum Required Diameter for Pure Torsion:*\n` +
    `   $$d_{\\min} = \\sqrt[3]{\\frac{16T}{\\pi \\tau_{\\text{allow}}}} = \\sqrt[3]{\\frac{16 \\times (${T} \\times 10^3)}{\\pi \\times ${tauAllow.toFixed(2)}}} = ${dMinTorsion.toFixed(2)}\\text{ mm}$$\n\n` +
    `4. **Bending & Combined Multiaxial Stress:**\n` +
    `   - Peak Bending Moment: $M_{\\max} = \\frac{F \\cdot L}{4} = \\frac{${F} \\times ${(L / 1000).toFixed(3)}}{4} = ${M.toFixed(1)}\\text{ N}\\cdot\\text{m}$\n` +
    `   - Normal Bending Stress: $\\sigma_b = \\frac{32M}{\\pi d^3} = ${sigmaB.toFixed(2)}\\text{ MPa}$\n` +
    `   - Equivalent Von Mises Stress:\n` +
    `     $$\\sigma_{\\text{VM}} = \\sqrt{\\sigma_b^2 + 3\\tau^2} = \\sqrt{${sigmaB.toFixed(1)}^2 + 3(${tau.toFixed(1)})^2} = ${sigmaVM.toFixed(1)}\\text{ MPa}$$\n` +
    `   - Evaluated Factor of Safety: $\\text{FoS} = \\frac{S_y}{\\sigma_{\\text{VM}}} = \\frac{${Sy}}{${sigmaVM.toFixed(1)}} = \\mathbf{${resultingFoS.toFixed(2)}}$ (Target: ${n.toFixed(1)})\n` +
    `   - Midspan Elastic Deflection: $\\delta_{\\max} = \\frac{FL^3}{48EI} = \\mathbf{${defl_mm.toFixed(3)}\\text{ mm}}$\n\n` +
    `5. **Standard Sizing Recommendation:**\n` +
    `   - ISO Metric Standard Journal: **${recDiameter} mm** (fits standard bearing series)\n` +
    `   - Structural Reserve: ${resultingFoS >= n ? `Sufficient (Margin: +${(((resultingFoS - n) / n) * 100).toFixed(1)}%)` : `Deficit (Requires diameter increase or higher strength alloy)`}`;

  const structuredData = [
    { label: 'Material', value: `${material.name} (Sy=${Sy} MPa)` },
    { label: 'Torque / Force', value: `${T} Nm / ${F} N` },
    { label: 'Current Diameter', value: `${d} mm` },
    { label: 'Min Torsion Diameter', value: `${dMinTorsion.toFixed(1)} mm` },
    { label: 'Von Mises Stress', value: `${sigmaVM.toFixed(1)} MPa` },
    { label: 'Factor of Safety', value: `${resultingFoS.toFixed(2)}x (Target: ${n.toFixed(1)}x)` },
    { label: 'Status', value: resultingFoS >= n ? '✓ Verified Safe' : '⚠ Marginal/Below Target' }
  ];

  return {
    id: nextId(),
    role: 'assistant',
    type: 'calculation',
    content,
    timestamp: now(),
    structuredData,
    actions: [
      { label: `Apply ${recDiameter} mm`, type: 'apply', payload: { diameter: recDiameter } },
      { label: 'Run Analysis', type: 'analyze' },
      { label: 'Re-evaluate Parameters', type: 'explain' }
    ]
  };
}
