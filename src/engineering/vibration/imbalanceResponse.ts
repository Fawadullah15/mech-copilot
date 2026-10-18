import {
  ImbalanceResponseInput,
  ImbalanceResponseResult,
  ImbalanceSweepPoint,
  ModalAnalysisResult
} from './types';

export function calculateImbalanceResponse(
  input: ImbalanceResponseInput,
  modal?: ModalAnalysisResult
): ImbalanceResponseResult {
  const U_gmm = input.unbalanceGMm;
  if (U_gmm < 0) {
    throw new Error(`Unbalance magnitude cannot be negative (received ${U_gmm} g·mm).`);
  }
  const U_kgm = U_gmm * 1e-6; // g*mm to kg*m

  const zeta = input.dampingRatio ?? 0.03; // default 3% viscous damping
  if (zeta <= 0 || zeta >= 1) {
    throw new Error(`Damping ratio zeta must be between 0 and 1 (received ${zeta}).`);
  }
  const Q = 1 / (2 * zeta);

  // Extract or default effective mass and stiffness from the fundamental bending mode
  let k_eff = input.effectiveStiffnessNM;
  let m_eff = input.effectiveMassKg;

  if ((!k_eff || !m_eff) && modal) {
    const firstFlexibleMode = modal.modes.find(m => !m.isRigidBody);
    if (firstFlexibleMode) {
      m_eff = m_eff ?? firstFlexibleMode.modalMassKg;
      k_eff = k_eff ?? firstFlexibleMode.modalStiffnessNM;
    }
  }

  // Fallbacks if not provided
  m_eff = m_eff ?? 10.0;
  k_eff = k_eff ?? 1e6;

  const omega_n = Math.sqrt(k_eff / m_eff);
  const fn_hz = omega_n / (2 * Math.PI);
  const resonantSpeedRpm = 60 * fn_hz;

  const c_eff = 2 * zeta * Math.sqrt(k_eff * m_eff);
  const e_eccentricity_m = m_eff > 0 ? U_kgm / m_eff : 0; // e = U / m

  const speedRange = input.speedRangeRpm;
  const startRpm = Math.max(0, speedRange[0]);
  const stopRpm = Math.max(startRpm + 100, speedRange[1]);
  const stepRpm = input.speedStepRpm ?? Math.max(20, Math.round((stopRpm - startRpm) / 100));

  const sweep: ImbalanceSweepPoint[] = [];
  let peakAmpUm = 0;
  let peakForceN = 0;

  for (let n = startRpm; n <= stopRpm; n += stepRpm) {
    const omega = (2 * Math.PI * n) / 60;
    const r = omega_n > 0 ? omega / omega_n : 0;

    // Excitation force Fu = U * Omega^2
    const Fu = U_kgm * omega * omega;

    // Jeffcott displacement amplitude: X = Fu / sqrt((k - m*Omega^2)^2 + (c*Omega)^2)
    const denom = Math.sqrt(
      Math.pow(k_eff - m_eff * omega * omega, 2) + Math.pow(c_eff * omega, 2)
    );
    const ampM = denom > 0 ? Fu / denom : 0;
    const ampUm = ampM * 1e6;
    const ampMm = ampM * 1000;

    // Phase lag: phi = atan2(c*Omega, k - m*Omega^2)
    const phaseRad = Math.atan2(c_eff * omega, k_eff - m_eff * omega * omega);
    const phaseDeg = (phaseRad * 180) / Math.PI;

    if (ampUm > peakAmpUm) {
      peakAmpUm = ampUm;
    }
    if (Fu > peakForceN) {
      peakForceN = Fu;
    }

    sweep.push({
      speedRpm: n,
      frequencyHz: Number((n / 60).toFixed(2)),
      angularVelocityRadS: Number(omega.toFixed(2)),
      excitationForceN: Number(Fu.toFixed(4)),
      amplitudeUm: Number(ampUm.toFixed(2)),
      amplitudeMm: Number(ampMm.toFixed(4)),
      phaseDeg: Number(phaseDeg.toFixed(1)),
    });
  }

  const governingEquation = 'X(Omega) = (U * Omega^2) / sqrt((k_eff - m_eff * Omega^2)^2 + (c_eff * Omega)^2)';

  const assumptions = [
    'Single-degree-of-freedom Jeffcott-type rotor forced vibration response',
    `Modal effective mass m_eff = ${m_eff.toFixed(2)} kg, stiffness k_eff = ${(k_eff / 1000).toFixed(1)} kN/m`,
    `Viscous damping ratio zeta = ${(zeta * 100).toFixed(1)}% (Dynamic magnification factor Q = ${Q.toFixed(1)})`,
    'Steady-state synchronous harmonic excitation Fu = U * Omega^2',
  ];

  const limitations = [
    'BOUNDED JEFFCOTT APPROXIMATION: Evaluates primary bending mode resonance response; higher bending modes and multi-plane unbalance phase interactions are not included in this SDOF response.',
    'DAMPING INPUT SENSITIVITY: Peak amplitude at resonance scales inversely with damping ratio (X_peak = e / (2*zeta)). Assumed damping requires experimental modal validation.',
    'NONLINEARITIES OMITTED: Bearing clearance dead-bands, oil whip/whirl instability, and rub-impact dynamics are not modeled.',
  ];

  return {
    unbalanceMagnitudeGMm: U_gmm,
    unbalanceMagnitudeKgM: U_kgm,
    dampingRatio: zeta,
    amplificationFactorQ: Number(Q.toFixed(2)),
    resonantSpeedRpm: Number(resonantSpeedRpm.toFixed(1)),
    peakAmplitudeUm: Number(peakAmpUm.toFixed(2)),
    peakExcitationForceN: Number(peakForceN.toFixed(2)),
    sweep,
    governingEquation,
    assumptions,
    limitations,
  };
}
