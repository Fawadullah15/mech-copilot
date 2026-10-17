import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { executeEngineeringTool } from '../tools/engineeringTools.ts';

describe('AI Engineering Tools', () => {
  it('should validate and execute calculate_required_shaft_diameter', () => {
    const rawArgs = JSON.stringify({
      torqueNm: 1000,
      safetyFactor: 2.5
    });

    const responseStr = executeEngineeringTool('calculate_required_shaft_diameter', rawArgs);
    const response = JSON.parse(responseStr);
    
    assert.strictEqual(typeof response.requiredDiameterMm, 'number');
    assert.strictEqual(response.requiredDiameterMm, 46.7); // based on fallback logic in function
  });

  it('should validate and execute run_full_shaft_analysis', () => {
    const rawArgs = JSON.stringify({
      torqueNm: 1000,
      radialForceN: 5000,
      diameterMm: 50,
      lengthMm: 1000,
      rpm: 1800,
      yieldStrengthMPa: 655,
      tensileStrengthMPa: 850,
      elasticModulusGPa: 200,
      targetSafetyFactor: 2.0,
      operatingTempC: 25,
      criterion: 'Von Mises'
    });

    const responseStr = executeEngineeringTool('run_full_shaft_analysis', rawArgs);
    const response = JSON.parse(responseStr);

    assert.ok(response.overallStatus);
    assert.ok(response.equivalentStressMPa);
  });

  it('should reject unknown tools gracefully', () => {
    const responseStr = executeEngineeringTool('non_existent_tool', '{}');
    const response = JSON.parse(responseStr);
    assert.strictEqual(response.error, 'Tool non_existent_tool not found.');
  });

  it('should handle malformed arguments gracefully', () => {
    const responseStr = executeEngineeringTool('calculate_required_shaft_diameter', '{"invalid_json"');
    const response = JSON.parse(responseStr);
    assert.ok(response.error.includes('Error executing tool'));
  });
});
