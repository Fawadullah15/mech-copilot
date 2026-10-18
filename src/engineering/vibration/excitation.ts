import {
  ExcitationOrdersResult,
  ExcitationOrder,
  ModalAnalysisResult
} from './types';

export interface ExcitationOptions {
  operatingSpeedRpm: number;
  gearToothCount?: number;
  userHarmonics?: number[]; // e.g. [1, 2, 3, 4]
  modal?: ModalAnalysisResult;
}

export function evaluateExcitationOrders(
  options: ExcitationOptions
): ExcitationOrdersResult {
  const n = options.operatingSpeedRpm;
  if (n <= 0) {
    throw new Error(`Operating speed must be positive (received ${n} rpm).`);
  }

  const f1X = n / 60; // 1X running frequency in Hz
  const harmonics = options.userHarmonics ?? [1, 2, 3, 4];
  const orders: ExcitationOrder[] = [];

  const flexibleModes = options.modal?.modes.filter(m => !m.isRigidBody) ?? [];

  for (const h of harmonics) {
    const fHarmonic = h * f1X;
    const orderName = h === 1 ? '1X (Running Speed Unbalance)' : `${h}X (Harmonic)`;

    // Check proximity to natural frequencies
    let nearMode: number | undefined;
    let minMarginPct: number | undefined;

    for (const mode of flexibleModes) {
      const marginPct = (Math.abs(fHarmonic - mode.frequencyHz) / mode.frequencyHz) * 100;
      if (marginPct <= 10.0) {
        nearMode = mode.modeNumber;
        minMarginPct = Number(marginPct.toFixed(1));
        break;
      }
    }

    orders.push({
      orderName,
      multiplier: h,
      frequencyHz: Number(fHarmonic.toFixed(2)),
      speedRpm: n,
      nearResonanceWithMode: nearMode,
      frequencyMarginPercent: minMarginPct,
    });
  }

  // Gear mesh frequency if tooth count provided
  let gearMeshFrequencyHz: number | undefined;
  if (options.gearToothCount && options.gearToothCount > 0) {
    const z = options.gearToothCount;
    gearMeshFrequencyHz = Number(((z * n) / 60).toFixed(2));

    let nearMode: number | undefined;
    let minMarginPct: number | undefined;

    for (const mode of flexibleModes) {
      const marginPct = (Math.abs(gearMeshFrequencyHz - mode.frequencyHz) / mode.frequencyHz) * 100;
      if (marginPct <= 10.0) {
        nearMode = mode.modeNumber;
        minMarginPct = Number(marginPct.toFixed(1));
        break;
      }
    }

    orders.push({
      orderName: `Gear Mesh (${z}X Tooth Passing)`,
      multiplier: z,
      frequencyHz: gearMeshFrequencyHz,
      speedRpm: n,
      nearResonanceWithMode: nearMode,
      frequencyMarginPercent: minMarginPct,
    });
  }

  return {
    operatingSpeedRpm: n,
    runningFrequencyHz: Number(f1X.toFixed(2)),
    orders,
    gearMeshFrequencyHz,
    gearToothCount: options.gearToothCount,
  };
}
