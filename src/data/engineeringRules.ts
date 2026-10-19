import type {
  EngineeringWarning,
  OptimizationObjective,
  OptimizationOption,
  ParsedProblemRequirements,
  DesignParameters,
  Material,
} from '../types';
import { getMaterialById } from './materials';
import {
  calculateRequiredShaftDiameter,
  calculateFullShaftAnalysis
} from '../engineering';

// ─── 1. Intelligent Engineering Warnings Engine ─────────────────────
export function evaluateEngineeringWarnings(
  params: DesignParameters,
  material: Material
): EngineeringWarning[] {
  const warnings: EngineeringWarning[] = [];

  // Minimum diameter check based on torque (Tresca)
  const req = calculateRequiredShaftDiameter({
    torque: params.torque,
    yieldStrength: material.yieldStrength,
    safetyFactor: params.safetyFactor
  });
  const dMin = req.requiredDiameterMm;

  if (params.diameter < dMin) {
    warnings.push({
      id: 'warn-diameter-undersized',
      severity: 'critical',
      title: 'Diameter Below Recommended Minimum',
      reason: `At ${params.torque} Nm torque and target FoS ${params.safetyFactor}, theoretical minimum shaft diameter is ${dMin.toFixed(1)} mm. Current diameter is ${params.diameter} mm.`,
      affectedParameter: 'Diameter',
      currentValue: `${params.diameter} mm`,
      requiredValue: `≥ ${Math.ceil(dMin)} mm`,
      recommendedAction: `Increase shaft diameter to ${Math.max(45, Math.ceil(dMin / 5) * 5)} mm to restore safe stress margins.`,
      autoFixValue: { diameter: Math.max(45, Math.ceil(dMin / 5) * 5) },
    });
  }

  // Full composite stress analysis for FoS & deflection checks
  const analysis = calculateFullShaftAnalysis({
    torqueNm: params.torque,
    radialForceN: params.force,
    diameterMm: params.diameter,
    lengthMm: params.length,
    rpm: params.rpm,
    yieldStrengthMPa: material.yieldStrength,
    tensileStrengthMPa: material.tensileStrength,
    elasticModulusGPa: material.elasticModulus,
    targetSafetyFactor: params.safetyFactor,
    operatingTempC: params.temperature,
    criterion: 'Von Mises'
  });

  const estFoS = analysis.combinedStress.result.factorOfSafety;

  if (estFoS < params.safetyFactor) {
    warnings.push({
      id: 'warn-fos-low',
      severity: 'warning',
      title: 'Safety Factor Below Project Target',
      reason: `Calculated safety factor (${estFoS.toFixed(2)} under Von Mises) is below the required project target of ${params.safetyFactor}.`,
      affectedParameter: 'Safety Factor',
      currentValue: estFoS.toFixed(2),
      requiredValue: params.safetyFactor.toFixed(1),
      recommendedAction: 'Increase diameter or select higher yield strength material (e.g. AISI 4340).',
      autoFixValue: { diameter: Math.round(params.diameter * 1.1) },
    });
  }

  // Deflection check
  if (analysis.deflection.status === 'fail' || analysis.deflection.status === 'warning') {
    warnings.push({
      id: 'warn-deflection-high',
      severity: analysis.deflection.status === 'fail' ? 'critical' : 'warning',
      title: 'Midspan Shaft Deflection Exceeds Limit',
      reason: `Centerline deflection (${analysis.deflection.result.maxDeflectionMm.toFixed(3)} mm) exceeds recommended machine design threshold (${analysis.deflection.result.allowableDeflectionMm?.toFixed(3)} mm).`,
      affectedParameter: 'Deflection',
      currentValue: `${analysis.deflection.result.maxDeflectionMm.toFixed(3)} mm`,
      requiredValue: `≤ ${analysis.deflection.result.allowableDeflectionMm?.toFixed(3)} mm`,
      recommendedAction: 'Increase diameter to boost flexural rigidity (I ∝ d⁴) or shorten bearing span.',
      autoFixValue: { diameter: Math.max(params.diameter + 5, 45) },
    });
  }

  // Temperature warning
  if (params.temperature >= 70) {
    warnings.push({
      id: 'warn-temperature',
      severity: params.temperature > 100 ? 'critical' : 'warning',
      title: 'Operating Temperature May Affect Material Strength',
      reason: `Operating temperature (${params.temperature}°C) causes thermal derating of yield strength by approx ${(params.temperature * 0.08).toFixed(1)}% and increases thermal expansion ($\Delta L$).`,
      affectedParameter: 'Temperature',
      currentValue: `${params.temperature}°C`,
      requiredValue: '< 60°C nominal',
      recommendedAction: 'Verify lubricant viscosity rating, ensure axial expansion float bearing, and consider temperature derated yield limits.',
      autoFixValue: { temperature: 55 },
    });
  }

  // Material fatigue warning for high cycle machinery
  if (params.rpm >= 2000 && material.id === 'aisi-1045') {
    warnings.push({
      id: 'warn-fatigue-material',
      severity: 'warning',
      title: 'Current Material May Reduce Fatigue Life',
      reason: `Operating at ${params.rpm} RPM generates >1.2×10⁸ stress cycles per 1000 operating hours. AISI 1045 has lower endurance limit compared to alloy steels.`,
      affectedParameter: 'Material Selection',
      currentValue: material.name,
      requiredValue: 'Alloy Steel (e.g. AISI 4140 / 4340)',
      recommendedAction: 'Upgrade material to quenched & tempered AISI 4140 or AISI 4340 for higher fatigue endurance limit.',
      autoFixValue: { materialId: 'aisi-4140' },
    });
  }

  return warnings;
}

// ─── 2. Multi-Objective Design Optimization Engine ───────────────────
export function generateOptimizationOptions(
  objective: OptimizationObjective,
  currentParams: DesignParameters
): OptimizationOption[] {
  switch (objective) {
    case 'weight':
      return [
        {
          id: 'opt-weight-1',
          title: 'High-Strength Downsized Shaft',
          tag: 'Best Weight Reduction',
          diameter: 42,
          materialId: 'aisi-4340',
          materialName: 'AISI 4340 Alloy Steel',
          weightKg: 4.12,
          safetyFactor: 2.24,
          costCategory: 'Medium',
          fatigueLifeCycles: '> 10⁷ (Infinite)',
          tradeOffSummary: 'Reduces mass by 14% while exceeding target safety factor through premium alloy strength.',
          isRecommended: true,
        },
        {
          id: 'opt-weight-2',
          title: 'Ultra-Lightweight Titanium Shaft',
          tag: 'Maximum Weight Savings',
          diameter: 44,
          materialId: 'ti-grade-5',
          materialName: 'Titanium Grade 5 (Ti-6Al-4V)',
          weightKg: 2.65,
          safetyFactor: 2.52,
          costCategory: 'Very High',
          fatigueLifeCycles: '> 10⁷ (Infinite)',
          tradeOffSummary: 'Cuts mass by 45%. Exceptional corrosion and fatigue performance at higher raw material cost.',
        },
        {
          id: 'opt-weight-3',
          title: 'Aviation Aluminum Alloy',
          tag: 'Low Inertia Rotor',
          diameter: 48,
          materialId: 'al-7075-t6',
          materialName: 'Aluminum 7075-T6',
          weightKg: 2.48,
          safetyFactor: 2.05,
          costCategory: 'High',
          fatigueLifeCycles: '5.2 × 10⁶ cycles',
          tradeOffSummary: 'Lightest feasible solid configuration. Requires generous keyway fillets to prevent notch sensitivity.',
        },
      ];

    case 'cost':
      return [
        {
          id: 'opt-cost-1',
          title: 'Standard Carbon Steel Economical Sizing',
          tag: 'Lowest Manufacturing Cost',
          diameter: 48,
          materialId: 'aisi-1045',
          materialName: 'AISI 1045 Carbon Steel',
          weightKg: 5.34,
          safetyFactor: 2.15,
          costCategory: 'Low',
          fatigueLifeCycles: '8.4 × 10⁶ cycles',
          tradeOffSummary: 'Readily available standard bar stock. Lowest machining and material raw cost.',
          isRecommended: true,
        },
        {
          id: 'opt-cost-2',
          title: 'Standard AISI 4140 Stock Size',
          tag: 'Balanced Cost & Longevity',
          diameter: 45,
          materialId: 'aisi-4140',
          materialName: 'AISI 4140 Alloy Steel',
          weightKg: 4.82,
          safetyFactor: 2.42,
          costCategory: 'Medium',
          fatigueLifeCycles: '> 10⁷ (Infinite)',
          tradeOffSummary: 'Direct drop-in replacement with standard 6209 bearing catalog availability.',
        },
        {
          id: 'opt-cost-3',
          title: 'Heavy Duty Structural Carbon Steel',
          tag: 'Over-Engineered Budget',
          diameter: 50,
          materialId: 'aisi-1045',
          materialName: 'AISI 1045 Carbon Steel',
          weightKg: 5.82,
          safetyFactor: 2.85,
          costCategory: 'Low',
          fatigueLifeCycles: '> 10⁷ (Infinite)',
          tradeOffSummary: 'Heavier design providing high structural margin at minimum unit material cost.',
        },
      ];

    case 'strength':
    case 'fatigue':
      return [
        {
          id: 'opt-str-1',
          title: 'Max-Torque High-Endurance Configuration',
          tag: 'Maximum Reliability',
          diameter: 48,
          materialId: 'aisi-4340',
          materialName: 'AISI 4340 Alloy Steel',
          weightKg: 5.32,
          safetyFactor: 3.12,
          costCategory: 'Medium',
          fatigueLifeCycles: '> 10⁸ (Infinite)',
          tradeOffSummary: 'Extremely robust against shock loads and torsional vibration overloads.',
          isRecommended: true,
        },
        {
          id: 'opt-str-2',
          title: 'Nickel Superalloy Extreme Duty',
          tag: 'Severe Operating Environment',
          diameter: 45,
          materialId: 'inconel-718',
          materialName: 'Inconel 718 Superalloy',
          weightKg: 5.08,
          safetyFactor: 3.65,
          costCategory: 'Very High',
          fatigueLifeCycles: '> 10⁸ (Infinite)',
          tradeOffSummary: 'Superior high-temperature capability and immune to thermal softening up to 600°C.',
        },
        {
          id: 'opt-str-3',
          title: 'Enlarged Standard 4140 Profile',
          tag: 'Conservative Safety Margin',
          diameter: 50,
          materialId: 'aisi-4140',
          materialName: 'AISI 4140 Alloy Steel',
          weightKg: 5.80,
          safetyFactor: 3.48,
          costCategory: 'Medium',
          fatigueLifeCycles: '> 10⁸ (Infinite)',
          tradeOffSummary: 'High margin of safety using standard workshop tooling and heat treat practices.',
        },
      ];

    case 'balanced':
    default:
      return [
        {
          id: 'opt-bal-1',
          title: 'Recommended Standard Production Shaft',
          tag: 'Optimal All-Round Design',
          diameter: 45,
          materialId: 'aisi-4140',
          materialName: 'AISI 4140 Alloy Steel',
          weightKg: 4.82,
          safetyFactor: 2.42,
          costCategory: 'Medium',
          fatigueLifeCycles: '> 10⁷ (Infinite)',
          tradeOffSummary: 'Proven industry standard geometry. Excellent balance of mass, strength, bearing fit, and unit cost.',
          isRecommended: true,
        },
        {
          id: 'opt-bal-2',
          title: 'Compact High-Strength Profile',
          tag: 'Compact Envelope',
          diameter: 42,
          materialId: 'aisi-4340',
          materialName: 'AISI 4340 Alloy Steel',
          weightKg: 4.12,
          safetyFactor: 2.24,
          costCategory: 'Medium',
          fatigueLifeCycles: '> 10⁷ (Infinite)',
          tradeOffSummary: 'Ideal when radial space inside the gearbox housing is constrained.',
        },
        {
          id: 'opt-bal-3',
          title: 'Heavy Duty Reserve Sizing',
          tag: 'High Shock Tolerance',
          diameter: 48,
          materialId: 'aisi-4140',
          materialName: 'AISI 4140 Alloy Steel',
          weightKg: 5.32,
          safetyFactor: 3.08,
          costCategory: 'Medium',
          fatigueLifeCycles: '> 10⁸ (Infinite)',
          tradeOffSummary: 'Gives 28% extra overload capacity for harsh start-stop cycle applications.',
        },
      ];
  }
}

// ─── 3. Natural Language Engineering Problem Parser ─────────────────
export function parseEngineeringProblem(text: string): ParsedProblemRequirements {
  const lower = text.toLowerCase();

  // Extract torque (e.g., 500 nm, 500nm, 850 n-m)
  const torqueMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:nm|n-m|n\s*m|newton[- ]?meters?)/i);
  const torque = torqueMatch ? parseFloat(torqueMatch[1]) : undefined;

  // Extract RPM (e.g., 1500 rpm, 1450 rev/min)
  const rpmMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:rpm|rev\/min|revolutions)/i);
  const rpm = rpmMatch ? parseFloat(rpmMatch[1]) : undefined;

  // Extract Safety Factor (e.g., safety factor of 2, fos 2.5, sf 2.0)
  const sfMatch = text.match(/(?:safety factor|fos|sf|factor of safety)(?:\s*(?:of|is|:|=))?\s*(\d+(?:\.\d+)?)/i)
    || text.match(/(\d+(?:\.\d+)?)\s*(?:safety factor|fos|sf)/i);
  const safetyFactor = sfMatch ? parseFloat(sfMatch[1]) : undefined;

  // Extract Diameter (e.g., diameter of 45 mm, 45mm shaft)
  const diaMatch = text.match(/(?:diameter|diam|⌀)(?:\s*(?:of|is|:|=))?\s*(\d+(?:\.\d+)?)\s*(?:mm)?/i)
    || text.match(/(\d+(?:\.\d+)?)\s*mm\s*(?:shaft|diameter)/i);
  const diameter = diaMatch ? parseFloat(diaMatch[1]) : undefined;

  // Extract Length (e.g., length 300 mm, 320mm long)
  const lenMatch = text.match(/(?:length|span|long)(?:\s*(?:of|is|:|=))?\s*(\d+(?:\.\d+)?)\s*(?:mm)?/i);
  const length = lenMatch ? parseFloat(lenMatch[1]) : undefined;

  // Extract Force (e.g., force 10000 N, 12 kN)
  let force: number | undefined;
  const knMatch = text.match(/(\d+(?:\.\d+)?)\s*kn/i);
  if (knMatch) {
    force = parseFloat(knMatch[1]) * 1000;
  } else {
    const nMatch = text.match(/(\d+(?:\.\d+)?)\s*n(?!\w)/i);
    if (nMatch) force = parseFloat(nMatch[1]);
  }

  // Material detection
  let material: string | undefined;
  if (lower.includes('4140')) material = 'AISI 4140 Steel';
  else if (lower.includes('4340')) material = 'AISI 4340 Steel';
  else if (lower.includes('1045')) material = 'AISI 1045 Steel';
  else if (lower.includes('6061')) material = 'Aluminum 6061-T6';
  else if (lower.includes('titanium') || lower.includes('ti-6al')) material = 'Titanium Grade 5';
  else if (lower.includes('304') || lower.includes('stainless')) material = 'Stainless Steel 304';

  const ready = torque !== undefined || rpm !== undefined || safetyFactor !== undefined || diameter !== undefined;

  return {
    rawText: text,
    torque,
    rpm,
    safetyFactor,
    diameter,
    length,
    material,
    force,
    ready,
  };
}

// ─── 4. Mock File Upload Presets ────────────────────────────────────
export const mockUploadedFiles = [
  {
    id: 'preset-1',
    name: 'gearbox_shaft_spec_revB.pdf',
    fileType: 'pdf' as const,
    fileSize: '1.4 MB',
    uploadedAt: 'Just now',
    status: 'extracted' as const,
    extractedSpecs: {
      torque: 500,
      rpm: 1450,
      safetyFactor: 2.0,
      recommendedMaterial: 'AISI 4140 Steel',
      diameterMin: 42,
      operatingTemp: 60,
      notes: 'Industrial conveyor drive spec sheet. Requires keyway per DIN 6885-1.',
    },
  },
  {
    id: 'preset-2',
    name: 'driveshaft_assembly_v3.step',
    fileType: 'cad' as const,
    fileSize: '4.8 MB',
    uploadedAt: '10 min ago',
    status: 'extracted' as const,
    extractedSpecs: {
      torque: 850,
      rpm: 3500,
      safetyFactor: 2.5,
      recommendedMaterial: 'AISI 4340 Steel',
      diameterMin: 50,
      operatingTemp: 45,
      notes: '3D CAD geometry with splined journal and dual bearing steps.',
    },
  },
  {
    id: 'preset-3',
    name: 'hydraulic_pump_specs.docx',
    fileType: 'spec' as const,
    fileSize: '820 KB',
    uploadedAt: 'Yesterday',
    status: 'extracted' as const,
    extractedSpecs: {
      torque: 200,
      rpm: 2200,
      safetyFactor: 3.0,
      recommendedMaterial: 'Aluminum 6061-T6',
      diameterMin: 38,
      operatingTemp: 80,
      notes: 'Axial piston pump interface. Thermal expansion critical at 80°C.',
    },
  },
];
