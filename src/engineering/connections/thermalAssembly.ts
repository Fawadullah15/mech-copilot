import type {
  ThermalAssemblyInput,
  ThermalAssemblyResult
} from './types';

/**
 * Calculates thermal assembly (shrink fit / expansion fit) expansion, contraction,
 * required heating/cooling temperatures, and handling clearance
 * conforming to DIN 7190-1 and small-strain thermal elasticity.
 */
export function calculateThermalAssembly(input: ThermalAssemblyInput): ThermalAssemblyResult {
  const {
    nominalDiameter,
    maxShaftDiameter,
    minHubBore,
    shaftThermalExpansion,
    hubThermalExpansion,
    referenceTemperatureC = 20,
    maxAllowableHubTempC = 250,
    minAllowableShaftTempC = -196
  } = input;

  const warnings: string[] = [];

  // Validations
  if (!Number.isFinite(nominalDiameter) || nominalDiameter <= 0) {
    throw new Error(`Nominal diameter must be positive, received: ${nominalDiameter}`);
  }
  if (!Number.isFinite(shaftThermalExpansion) || shaftThermalExpansion <= 0) {
    throw new Error(`Shaft thermal expansion coefficient must be positive, received: ${shaftThermalExpansion}`);
  }
  if (!Number.isFinite(hubThermalExpansion) || hubThermalExpansion <= 0) {
    throw new Error(`Hub thermal expansion coefficient must be positive, received: ${hubThermalExpansion}`);
  }

  // Initial maximum interference at reference temperature (mm)
  const initialMaxInterferenceMm = maxShaftDiameter - minHubBore;
  const initialMaxInterferenceUm = initialMaxInterferenceMm * 1000;

  // Target handling assembly clearance (default: 0.001 * d or at least 20 μm)
  const defaultTargetClearanceUm = Math.max(20, Math.round(nominalDiameter * 1.0));
  const targetAssemblyClearanceUm = input.targetAssemblyClearanceUm ?? defaultTargetClearanceUm;
  const targetAssemblyClearanceMm = targetAssemblyClearanceUm / 1000;

  // Total required dimensional change (mm)
  const totalExpansionRequiredMm = Math.max(0, initialMaxInterferenceMm) + targetAssemblyClearanceMm;
  const totalExpansionRequiredUm = totalExpansionRequiredMm * 1000;

  // Convert expansion coefficients from 10^-6 / K to 1 / K
  const alphaH = hubThermalExpansion * 1e-6;
  const alphaS = shaftThermalExpansion * 1e-6;

  // Option 1: Hub heating only (Shaft remains at reference temperature)
  // Delta d_h = d * alphaH * (T_h - T_ref) = totalExpansionRequiredMm
  const deltaTHub = totalExpansionRequiredMm / (nominalDiameter * alphaH);
  const calculatedHubTempForAssemblyC = referenceTemperatureC + deltaTHub;

  // Option 2: Shaft cooling only (Hub remains at reference temperature)
  // Delta d_s = - d * alphaS * (T_ref - T_s) = - totalExpansionRequiredMm
  const deltaTShaft = totalExpansionRequiredMm / (nominalDiameter * alphaS);
  const calculatedShaftTempForAssemblyC = referenceTemperatureC - deltaTShaft;

  // Optional user test values
  let hubExpansionAtInputTempUm: number | undefined;
  let shaftContractionAtInputTempUm: number | undefined;
  let resultingClearanceAtInputTempsUm: number | undefined;

  if (input.hubHeatingTempC !== undefined || input.shaftCoolingTempC !== undefined) {
    const Th = input.hubHeatingTempC ?? referenceTemperatureC;
    const Ts = input.shaftCoolingTempC ?? referenceTemperatureC;

    const deltaDhMm = nominalDiameter * alphaH * (Th - referenceTemperatureC);
    const deltaDsMm = nominalDiameter * alphaS * (Ts - referenceTemperatureC);

    hubExpansionAtInputTempUm = Number((deltaDhMm * 1000).toFixed(1));
    shaftContractionAtInputTempUm = Number((-deltaDsMm * 1000).toFixed(1));

    // Resulting assembly clearance under specified temperatures:
    // (Bore_min + deltaDh) - (Shaft_max + deltaDs) = deltaDh - deltaDs - initialInterference
    const clearanceMm = deltaDhMm - deltaDsMm - initialMaxInterferenceMm;
    resultingClearanceAtInputTempsUm = Number((clearanceMm * 1000).toFixed(1));

    if (resultingClearanceAtInputTempsUm < targetAssemblyClearanceUm) {
      warnings.push(
        `Specified temperatures (Hub: ${Th}°C, Shaft: ${Ts}°C) provide only ${resultingClearanceAtInputTempsUm.toFixed(
          1
        )} μm clearance, below the target handling clearance of ${targetAssemblyClearanceUm} μm. Risk of jamming during assembly.`
      );
    }
  }

  // Safety checks
  const isHubTempSafe = calculatedHubTempForAssemblyC <= maxAllowableHubTempC;
  const isShaftTempSafe = calculatedShaftTempForAssemblyC >= minAllowableShaftTempC;

  if (!isHubTempSafe) {
    warnings.push(
      `Required hub temperature for sole-heating assembly (${Math.round(
        calculatedHubTempForAssemblyC
      )} °C) exceeds allowable limit (${maxAllowableHubTempC} °C). Risk of tempering/softening. Use combined heating and cooling.`
    );
  }
  if (!isShaftTempSafe) {
    warnings.push(
      `Required shaft cooling temperature (${Math.round(
        calculatedShaftTempForAssemblyC
      )} °C) exceeds cryogenic handling limit (${minAllowableShaftTempC} °C).`
    );
  }

  let status: 'feasible' | 'elevated_temp_warning' | 'infeasible' = 'feasible';
  let statusMessage = '';
  let guidance = '';

  if (isHubTempSafe) {
    status = 'feasible';
    statusMessage = `Thermal shrink fit is feasible by heating hub to ${Math.round(
      calculatedHubTempForAssemblyC
    )} °C (at ${referenceTemperatureC} °C shaft).`;
    guidance = `Heat hub uniformly in an induction heater or convection oven to ${Math.round(
      calculatedHubTempForAssemblyC
    )} °C to achieve ${targetAssemblyClearanceUm} μm assembly clearance. Avoid direct flame torches.`;
  } else if (isShaftTempSafe && calculatedShaftTempForAssemblyC >= -78.5) {
    status = 'feasible';
    statusMessage = `Hub sole heating exceeds limit; use combined dry-ice shaft cooling (-78.5 °C) and moderate hub heating (${Math.round(
      referenceTemperatureC + (totalExpansionRequiredMm - nominalDiameter * alphaS * (referenceTemperatureC - (-78.5))) / (nominalDiameter * alphaH)
    )} °C).`;
    guidance = 'Combine dry ice or liquid nitrogen shaft cooling with moderate hub heating to avoid exceeding material tempering limits.';
  } else {
    status = 'elevated_temp_warning';
    statusMessage = `High interference requires elevated temperatures. Sole heating (${Math.round(
      calculatedHubTempForAssemblyC
    )} °C) exceeds ${maxAllowableHubTempC} °C.`;
    guidance = 'Employ combined thermal assembly: heat hub to permissible limit (e.g. 200–220 °C) and cool shaft in liquid nitrogen (-196 °C).';
  }

  const assumptions = [
    'Small-strain linear thermal expansion model (Delta d = d * alpha * Delta T).',
    'Uniform temperature distribution throughout each component during assembly insertion.',
    `Reference inspection temperature T_ref = ${referenceTemperatureC} °C per ISO 1.`,
    'Constant linear coefficient of thermal expansion over the temperature interval.'
  ];

  const limitations = [
    'Heating tempered or hardened steels above 250–300 °C will cause microstructural transformation, loss of hardness, and residual stress relaxation.',
    'Fast assembly required: Once parts make initial contact, rapid heat conduction will reduce clearance within seconds, creating jamming risk if not properly aligned.',
    'Thermal assembly requires certified PPE, calibrated heating baths/induction coils, and mechanical insertion guides.'
  ];

  return {
    initialMaxInterferenceUm: Number(initialMaxInterferenceUm.toFixed(1)),
    targetAssemblyClearanceUm: Number(targetAssemblyClearanceUm.toFixed(1)),
    totalExpansionRequiredUm: Number(totalExpansionRequiredUm.toFixed(1)),
    calculatedHubTempForAssemblyC: Number(calculatedHubTempForAssemblyC.toFixed(1)),
    calculatedShaftTempForAssemblyC: Number(calculatedShaftTempForAssemblyC.toFixed(1)),
    hubExpansionAtInputTempUm,
    shaftContractionAtInputTempUm,
    resultingClearanceAtInputTempsUm,
    isHubTempSafe,
    isShaftTempSafe,
    status,
    statusMessage,
    guidance,
    warnings,
    assumptions,
    limitations
  };
}
