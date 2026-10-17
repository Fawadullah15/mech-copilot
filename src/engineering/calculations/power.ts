import type {
  PowerInputs,
  PowerResultData,
  EngineeringCalculationResult,
  CalculationStatus,
} from '../types/engineering';
import { toNewtonMeters, formatEngineeringValue } from '../units';

/**
 * Calculate power transmission and angular velocity for rotating machinery.
 *
 * Governing Equations:
 * Angular velocity: ω = 2·π·N / 60  (rad/s)
 * Power: P = T·ω  (Watts)
 * Power in kW: P_kW = P / 1000
 * Power in hp: P_hp = P / 745.69987
 */
export function calculatePowerTransmission(
  inputs: PowerInputs
): EngineeringCalculationResult<PowerResultData> {
  const T_Nm = toNewtonMeters(inputs.torque, 'N·m');
  const N_rpm = inputs.rpm;

  const warnings: string[] = [];

  if (N_rpm < 0) {
    warnings.push('Negative rotational speed specified. Using absolute magnitude for power transmission.');
  }

  const absRpm = Math.abs(N_rpm);
  const omega_rad_s = (2 * Math.PI * absRpm) / 60;
  const power_W = T_Nm * omega_rad_s;
  const power_kW = power_W / 1000;
  const power_hp = power_W / 745.6998715822702;

  let status: CalculationStatus = 'pass';
  if (power_kW > 1000) {
    warnings.push('Power rating exceeds 1 MW. High power industrial drivetrain considerations apply.');
  }

  return {
    calculationType: 'powerTransmission',
    name: 'Power Transmission & Angular Velocity',
    model: 'Rotational Mechanical Work Rate',
    formula: 'P = T·ω = T·(2πN / 60)',
    inputs: {
      torque: inputs.torque,
      rpm: inputs.rpm,
    },
    normalizedInputsSI: {
      torqueNm: T_Nm,
      rpm: absRpm,
      angularVelocityRadS: omega_rad_s,
    },
    result: {
      angularVelocityRadS: omega_rad_s,
      powerWatts: power_W,
      powerKW: power_kW,
      powerHp: power_hp,
    },
    displayValue: `${formatEngineeringValue(power_kW, 2)} kW (${formatEngineeringValue(power_hp, 1)} hp)`,
    displayUnit: 'kW',
    assumptions: [
      'Steady-state continuous rotational speed',
      'No mechanical transmission efficiency losses (η = 1.0 ideal)',
      'Constant torque output across angular revolution',
    ],
    warnings,
    disclaimer: 'Engineering calculation — Simplified model — Engineer review required.',
    status,
  };
}
