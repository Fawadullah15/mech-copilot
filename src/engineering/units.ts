import type {
  LengthUnit,
  TorqueUnit,
  StressUnit,
  ForceUnit,
  PowerUnit,
  ValueWithUnit,
} from './types/engineering';

// ─── Conversion Factors to Normalized SI Base Units ─────────────────
// SI Base: Length (meters), Torque (N·m), Stress (Pa), Force (N), Power (W)

export const LENGTH_CONVERSIONS: Record<LengthUnit, number> = {
  m: 1,
  mm: 0.001,
  inch: 0.0254,
};

export const TORQUE_CONVERSIONS: Record<TorqueUnit, number> = {
  'N·m': 1,
  'N·mm': 0.001,
  'lb-ft': 1.3558179483314004,
};

export const STRESS_CONVERSIONS: Record<StressUnit, number> = {
  Pa: 1,
  MPa: 1e6,
  GPa: 1e9,
  psi: 6894.757293168361,
};

export const FORCE_CONVERSIONS: Record<ForceUnit, number> = {
  N: 1,
  kN: 1000,
  lbf: 4.4482216152605,
};

export const POWER_CONVERSIONS: Record<PowerUnit, number> = {
  W: 1,
  kW: 1000,
  hp: 745.6998715822702,
};

// ─── Normalization to SI Base ───────────────────────────────────────

export function toMeters(val: ValueWithUnit<LengthUnit> | number, defaultUnit: LengthUnit = 'mm'): number {
  if (typeof val === 'number') {
    return val * LENGTH_CONVERSIONS[defaultUnit];
  }
  return val.value * LENGTH_CONVERSIONS[val.unit];
}

export function fromMeters(meters: number, targetUnit: LengthUnit): number {
  return meters / LENGTH_CONVERSIONS[targetUnit];
}

export function toNewtonMeters(val: ValueWithUnit<TorqueUnit> | number, defaultUnit: TorqueUnit = 'N·m'): number {
  if (typeof val === 'number') {
    return val * TORQUE_CONVERSIONS[defaultUnit];
  }
  return val.value * TORQUE_CONVERSIONS[val.unit];
}

export function fromNewtonMeters(nm: number, targetUnit: TorqueUnit): number {
  return nm / TORQUE_CONVERSIONS[targetUnit];
}

export function toPascals(val: ValueWithUnit<StressUnit> | number, defaultUnit: StressUnit = 'MPa'): number {
  if (typeof val === 'number') {
    return val * STRESS_CONVERSIONS[defaultUnit];
  }
  return val.value * STRESS_CONVERSIONS[val.unit];
}

export function fromPascals(pa: number, targetUnit: StressUnit): number {
  return pa / STRESS_CONVERSIONS[targetUnit];
}

export function toNewtons(val: ValueWithUnit<ForceUnit> | number, defaultUnit: ForceUnit = 'N'): number {
  if (typeof val === 'number') {
    return val * FORCE_CONVERSIONS[defaultUnit];
  }
  return val.value * FORCE_CONVERSIONS[val.unit];
}

export function fromNewtons(n: number, targetUnit: ForceUnit): number {
  return n / FORCE_CONVERSIONS[targetUnit];
}

export function toWatts(val: ValueWithUnit<PowerUnit> | number, defaultUnit: PowerUnit = 'W'): number {
  if (typeof val === 'number') {
    return val * POWER_CONVERSIONS[defaultUnit];
  }
  return val.value * POWER_CONVERSIONS[val.unit];
}

export function fromWatts(w: number, targetUnit: PowerUnit): number {
  return w / POWER_CONVERSIONS[targetUnit];
}

// ─── Engineering Formatting Helpers ─────────────────────────────────

export function formatEngineeringValue(val: number, decimals = 2): string {
  if (!Number.isFinite(val)) return 'NaN';
  if (Math.abs(val) >= 1e6 || (Math.abs(val) < 0.001 && Math.abs(val) > 0)) {
    return val.toExponential(decimals);
  }
  return val.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

// ─── Direct Aliases for Engineering Normalization ────────────────────
export const normalizeLengthToM = toMeters;
export const normalizeTorqueToNm = toNewtonMeters;
export const normalizeStressToPa = toPascals;
export const normalizeForceToN = toNewtons;
export const normalizePowerToW = toWatts;
