import {
  calculateShaftTorsion,
  calculateShaftBending,
  calculateCombinedStress,
  calculateShaftDeflection,
  calculatePowerTransmission,
  calculateFactorOfSafety,
  calculateFullShaftAnalysis
} from '../src/engineering/index.ts';
import { processOfflineChatRequest } from '../server/services/llm.ts';

console.log('--- 1. Testing Zero Torque ---');
const zeroTorque = calculateFullShaftAnalysis({
  torqueNm: 0,
  radialForceN: 12000,
  diameterMm: 45,
  lengthMm: 320,
  rpm: 1450,
  yieldStrengthMPa: 655,
  tensileStrengthMPa: 1020,
  elasticModulusGPa: 205,
  targetSafetyFactor: 2.0,
  operatingTempC: 60
});
console.log('Zero torque eqStress:', zeroTorque.combinedStress.result.equivalentStressMPa, 'FoS:', zeroTorque.combinedStress.result.factorOfSafety, 'status:', zeroTorque.overallStatus);

console.log('\n--- 2. Testing Zero Force & Zero Torque ---');
const zeroAll = calculateFullShaftAnalysis({
  torqueNm: 0,
  radialForceN: 0,
  diameterMm: 45,
  lengthMm: 320,
  rpm: 1450,
  yieldStrengthMPa: 655,
  tensileStrengthMPa: 1020,
  elasticModulusGPa: 205,
  targetSafetyFactor: 2.0,
  operatingTempC: 60
});
console.log('Zero all eqStress:', zeroAll.combinedStress.result.equivalentStressMPa, 'FoS:', zeroAll.combinedStress.result.factorOfSafety, 'status:', zeroAll.overallStatus);

console.log('\n--- 3. Testing Negative Diameter ---');
const negDiameter = calculateFullShaftAnalysis({
  torqueNm: 500,
  radialForceN: 12000,
  diameterMm: -45,
  lengthMm: 320,
  rpm: 1450,
  yieldStrengthMPa: 655,
  tensileStrengthMPa: 1020,
  elasticModulusGPa: 205,
  targetSafetyFactor: 2.0,
  operatingTempC: 60
});
console.log('Neg diameter status:', negDiameter.overallStatus, 'deflection status:', negDiameter.deflection.status);

console.log('\n--- 4. Testing Zero Yield Strength ---');
const zeroYield = calculateFullShaftAnalysis({
  torqueNm: 500,
  radialForceN: 12000,
  diameterMm: 45,
  lengthMm: 320,
  rpm: 1450,
  yieldStrengthMPa: 0,
  tensileStrengthMPa: 1020,
  elasticModulusGPa: 205,
  targetSafetyFactor: 2.0,
  operatingTempC: 60
});
console.log('Zero yield status:', zeroYield.overallStatus, 'combinedStress FoS:', zeroYield.combinedStress.result.factorOfSafety);

console.log('\n--- 5. Testing Zero Elastic Modulus ---');
const zeroE = calculateShaftDeflection({
  force: 12000,
  length: 320,
  diameter: 45,
  elasticModulus: 0
});
console.log('Zero E status:', zeroE.status, 'warnings:', zeroE.warnings, 'maxDeflectionMm:', zeroE.result.maxDeflectionMm);

console.log('\n--- 6. Testing 7 Offline Prompts ---');
const prompts = [
  'Check this shaft design.',
  'What is the current factor of safety?',
  'What diameter is required for a target factor of safety of 2.5?',
  'Reduce the shaft weight while respecting the target factor of safety.',
  'Reduce the shaft weight.',
  'What diameter do I need for FoS 2.5?',
  'Explain the current shaft\'s factor of safety.',
  'Analyze this design with zero torque.',
  'Change the diameter to 50 mm and recalculate.',
  'Give me an unsupported calculation that the system cannot perform.'
];

for (const p of prompts) {
  const res = processOfflineChatRequest([{ id: '1', role: 'user', content: p, timestamp: new Date().toISOString() }], {
    diameter: 45,
    torque: 500,
    force: 12000,
    length: 320,
    rpm: 1450,
    safetyFactor: 2.0,
    temperature: 60
  });
  console.log(`\nPROMPT: "${p}"`);
  console.log(`Tools used: ${JSON.stringify(res.toolsUsed)}`);
  console.log(`Has engineeringResult: ${!!res.engineeringResult}`);
  console.log(`Summary response snippet: ${res.message.content.slice(0, 120).replace(/\n/g, ' ')}...`);
}
