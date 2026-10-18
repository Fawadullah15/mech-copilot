import {
  ModalAnalysisResult,
  CriticalSpeedAssessment,
  CriticalSpeedCheck
} from './types';

export interface CriticalSpeedOptions {
  operatingSpeedRpm: number;
  operatingRangeRpm?: [number, number];
  recommendedMarginPercent?: number; // default 15%
}

export function evaluateCriticalSpeeds(
  modal: ModalAnalysisResult,
  options: CriticalSpeedOptions
): CriticalSpeedAssessment {
  const opSpeed = options.operatingSpeedRpm;
  const range: [number, number] = options.operatingRangeRpm ?? [
    Math.max(0, Math.round(opSpeed * 0.8)),
    Math.round(opSpeed * 1.2),
  ];
  const recMargin = options.recommendedMarginPercent ?? 15.0;

  if (opSpeed <= 0) {
    throw new Error(`Operating speed must be positive (received ${opSpeed} rpm).`);
  }
  if (range[0] >= range[1] || range[0] < 0) {
    throw new Error(`Invalid operating speed range: [${range[0]}, ${range[1]}] rpm.`);
  }

  const checks: CriticalSpeedCheck[] = [];
  let worstStatus: 'safe' | 'warning' | 'critical' = 'safe';

  // Screen the first 5 flexible bending modes
  const flexibleModes = modal.modes.filter(m => !m.isRigidBody).slice(0, 5);

  for (const mode of flexibleModes) {
    const nc = mode.synchronousSpeedRpm;
    const deltaRpm = Math.abs(opSpeed - nc);
    const separationPct = nc > 0 ? (deltaRpm / nc) * 100 : 0;
    const crossesRange = nc >= range[0] && nc <= range[1];

    let status: 'safe' | 'warning' | 'critical' = 'safe';
    let message = '';

    if (crossesRange) {
      status = 'critical';
      worstStatus = 'critical';
      message = `Critical speed ${nc.toFixed(0)} rpm falls DIRECTLY inside operating speed range [${range[0]}, ${range[1]}] rpm. High resonance risk.`;
    } else if (separationPct < recMargin) {
      status = 'warning';
      if (worstStatus !== 'critical') worstStatus = 'warning';
      message = `Operating speed ${opSpeed} rpm is within ${separationPct.toFixed(1)}% of critical speed ${nc.toFixed(0)} rpm (recommended >= ${recMargin}% separation).`;
    } else {
      status = 'safe';
      message = `Adequate separation margin of ${separationPct.toFixed(1)}% from critical speed ${nc.toFixed(0)} rpm.`;
    }

    checks.push({
      modeNumber: mode.modeNumber,
      criticalSpeedRpm: Number(nc.toFixed(1)),
      frequencyHz: mode.frequencyHz,
      operatingSpeedRpm: opSpeed,
      deltaRpm: Number(deltaRpm.toFixed(1)),
      separationPercent: Number(separationPct.toFixed(2)),
      status,
      crossesOperatingRange: crossesRange,
      message,
    });
  }

  const assumptions = [
    'Synchronous 1X unbalance excitation model: nc = 60 * fn assumes undamped stationary beam modal frequencies',
    'Linear lateral flexural bending behavior under small shaft deflections',
    'Symmetric support stiffness without cross-coupled bearing dynamic coefficients',
    `User-specified operating speed range [${range[0]}, ${range[1]}] rpm with ${recMargin}% separation criteria`,
  ];

  const omissionsAndWarnings = [
    'GYROSCOPIC COUPLING OMISSION: High-speed spinning disk gyroscopic stiffening / softening and forward/backward whirl bifurcation are omitted in this linear stationary model.',
    'BEARING COEFFICIENT DYNAMICS: Speed-dependent hydro-dynamic oil film stiffness (Kxx, Kxy, Kyx, Kyy) and damping matrices are not modeled; stationary linear spring supports are assumed.',
    'APPLICATION BOUNDARY: This screening estimate identifies potential synchronous resonance bands; it does not replace a comprehensive multi-plane rotordynamic Campbell diagram or condition-monitoring test.',
  ];

  return {
    checks,
    operatingSpeedRpm: opSpeed,
    operatingRangeRpm: range,
    recommendedMarginPercent: recMargin,
    overallStatus: worstStatus,
    assumptions,
    omissionsAndWarnings,
  };
}
