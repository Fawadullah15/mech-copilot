import { z } from 'zod';
import { calculateRequiredTorsionDiameter } from '../../src/engineering/calculations/torsion.ts';
import { calculateFullShaftAnalysis } from '../../src/engineering/calculations/shaft.ts';
import { CompositeShaftAnalysisInputs, YieldCriterion } from '../../src/engineering/types/engineering.ts';

// 1. Schemas for Validation (and for OpenAI tool definition)
export const calculateRequiredShaftDiameterSchema = z.object({
  torqueNm: z.number().describe('Applied torque in N·m'),
  allowableShearStressMPa: z.number().optional().describe('Allowable shear stress in MPa. Pass this if known.'),
  yieldStrengthMPa: z.number().optional().describe('Material yield strength in MPa. Pass this if allowable shear stress is unknown.'),
  safetyFactor: z.number().default(2.0).describe('Target factor of safety. Default is 2.0.'),
});

export const runFullShaftAnalysisSchema = z.object({
  torqueNm: z.number().describe('Applied torque in N·m'),
  radialForceN: z.number().describe('Radial bending force in N'),
  diameterMm: z.number().describe('Shaft diameter in mm'),
  lengthMm: z.number().describe('Shaft length in mm'),
  rpm: z.number().describe('Rotational speed in RPM'),
  yieldStrengthMPa: z.number().describe('Material yield strength in MPa'),
  tensileStrengthMPa: z.number().describe('Material ultimate tensile strength in MPa'),
  elasticModulusGPa: z.number().describe('Material elastic modulus in GPa'),
  targetSafetyFactor: z.number().describe('Target factor of safety'),
  operatingTempC: z.number().describe('Operating temperature in Celsius'),
  criterion: z.enum(['Tresca', 'Von Mises']).optional().describe('Failure criterion to use. Default is Von Mises.'),
});

// 2. OpenAI Tool Definitions
export const engineeringTools = [
  {
    type: 'function' as const,
    function: {
      name: 'calculate_required_shaft_diameter',
      description: 'Calculates the minimum required solid circular shaft diameter to safely transmit a given torque under pure torsion. Use this when the user asks for required shaft size or diameter.',
      parameters: {
        type: 'object',
        properties: {
          torqueNm: { type: 'number', description: 'Applied torque in N·m' },
          allowableShearStressMPa: { type: 'number', description: 'Allowable shear stress in MPa' },
          yieldStrengthMPa: { type: 'number', description: 'Material yield strength in MPa' },
          safetyFactor: { type: 'number', description: 'Target factor of safety (default 2.0)' },
        },
        required: ['torqueNm'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'run_full_shaft_analysis',
      description: 'Executes a full composite shaft analysis aggregating torsion, bending, combined stress, deflection, power transmission, and safety factor. Use this to verify an existing design.',
      parameters: {
        type: 'object',
        properties: {
          torqueNm: { type: 'number', description: 'Applied torque in N·m' },
          radialForceN: { type: 'number', description: 'Radial bending force in N' },
          diameterMm: { type: 'number', description: 'Shaft diameter in mm' },
          lengthMm: { type: 'number', description: 'Shaft length in mm' },
          rpm: { type: 'number', description: 'Rotational speed in RPM' },
          yieldStrengthMPa: { type: 'number', description: 'Material yield strength in MPa' },
          tensileStrengthMPa: { type: 'number', description: 'Material ultimate tensile strength in MPa' },
          elasticModulusGPa: { type: 'number', description: 'Material elastic modulus in GPa' },
          targetSafetyFactor: { type: 'number', description: 'Target factor of safety' },
          operatingTempC: { type: 'number', description: 'Operating temperature in Celsius' },
          criterion: { type: 'string', enum: ['Tresca', 'Von Mises'], description: 'Failure criterion' },
        },
        required: [
          'torqueNm', 'radialForceN', 'diameterMm', 'lengthMm', 'rpm',
          'yieldStrengthMPa', 'tensileStrengthMPa', 'elasticModulusGPa',
          'targetSafetyFactor', 'operatingTempC'
        ],
      },
    },
  }
];

// 3. Tool Executor
export function executeEngineeringTool(name: string, rawArgs: string): string {
  try {
    const args = JSON.parse(rawArgs);

    if (name === 'calculate_required_shaft_diameter') {
      const parsedArgs = calculateRequiredShaftDiameterSchema.parse(args);
      const result = calculateRequiredTorsionDiameter(
        parsedArgs.torqueNm,
        'N·m',
        parsedArgs.allowableShearStressMPa,
        parsedArgs.yieldStrengthMPa,
        parsedArgs.safetyFactor
      );
      return JSON.stringify(result, null, 2);
    } 
    
    if (name === 'run_full_shaft_analysis') {
      const parsedArgs = runFullShaftAnalysisSchema.parse(args);
      const inputs: CompositeShaftAnalysisInputs = {
        ...parsedArgs,
        criterion: (parsedArgs.criterion as YieldCriterion) || 'Von Mises'
      };
      const result = calculateFullShaftAnalysis(inputs);
      return JSON.stringify({
        overallStatus: result.overallStatus,
        summary: result.summary,
        equivalentStressMPa: result.combinedStress.result.equivalentStressMPa,
        safetyFactor: result.combinedStress.result.factorOfSafety,
        maxDeflectionMm: result.deflection.result.maxDeflectionMm,
      }, null, 2);
    }

    return JSON.stringify({ error: `Tool ${name} not found.` });
  } catch (error: any) {
    return JSON.stringify({ error: `Error executing tool ${name}: ${error.message || error}` });
  }
}
