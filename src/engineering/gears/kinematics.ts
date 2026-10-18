import type {
  GearKinematicsInput,
  GearKinematicsResult,
  RotationDirection
} from './types';

/**
 * Calculates gear-pair kinematics, rotational speeds, torque, power, and efficiency.
 */
export function calculateGearKinematics(
  input: GearKinematicsInput,
  pinionPitchDiameterMm?: number
): GearKinematicsResult {
  const {
    pinionSpeedRpm,
    transmittedPowerKw,
    pinionTorqueNm,
    pinionToothCount,
    wheelToothCount,
    efficiency = 0.98,
    pinionRotationDirection = 'CW'
  } = input;

  // Validation
  if (!Number.isFinite(pinionSpeedRpm) || pinionSpeedRpm === 0) {
    throw new Error(
      `Pinion speed must be a non-zero finite number, received: ${pinionSpeedRpm} rpm`
    );
  }
  if (!Number.isInteger(pinionToothCount) || pinionToothCount <= 0) {
    throw new Error(
      `Pinion tooth count must be a positive integer, received: ${pinionToothCount}`
    );
  }
  if (!Number.isInteger(wheelToothCount) || wheelToothCount <= 0) {
    throw new Error(
      `Wheel tooth count must be a positive integer, received: ${wheelToothCount}`
    );
  }
  if (!Number.isFinite(efficiency) || efficiency <= 0 || efficiency > 1.0) {
    throw new Error(
      `Mechanical efficiency must be between 0 and 1.0, received: ${efficiency}`
    );
  }

  // Either power or torque must be supplied
  let PinKw = transmittedPowerKw;
  let T1Nm = pinionTorqueNm;

  const n1 = Math.abs(pinionSpeedRpm);
  const omega1 = (2 * Math.PI * n1) / 60; // rad/s

  if (PinKw !== undefined && PinKw > 0) {
    // T = P / omega
    T1Nm = (PinKw * 1000) / omega1;
  } else if (T1Nm !== undefined && T1Nm > 0) {
    // P = T * omega
    PinKw = (T1Nm * omega1) / 1000;
  } else {
    throw new Error(
      'Either transmittedPowerKw (> 0) or pinionTorqueNm (> 0) must be specified.'
    );
  }

  // Gear ratio i = z2 / z1
  const gearRatio = wheelToothCount / pinionToothCount;

  // Wheel speed: external mesh counter-rotates
  const wheelSpeedMagnitude = n1 / gearRatio;
  const wheelSpeedSigned = -wheelSpeedMagnitude;
  const omega2 = (2 * Math.PI * wheelSpeedMagnitude) / 60;

  // Output torque accounting for mechanical efficiency
  const T2Nm = T1Nm * gearRatio * efficiency;

  // Power output and losses
  const PoutKw = PinKw * efficiency;
  const PlossKw = PinKw * (1 - efficiency);

  // Pitch line velocity v = omega1 * r1 = pi * d1 * n1 / 60,000 (m/s)
  let pitchLineVelocity = 0;
  if (pinionPitchDiameterMm && pinionPitchDiameterMm > 0) {
    pitchLineVelocity = (Math.PI * pinionPitchDiameterMm * n1) / 60000;
  }

  const wheelRotation: RotationDirection =
    pinionRotationDirection === 'CW' ? 'CCW' : 'CW';

  return {
    gearRatio: Number(gearRatio.toFixed(4)),
    pinionSpeedRpm: Number(pinionSpeedRpm.toFixed(2)),
    wheelSpeedRpm: Number(wheelSpeedSigned.toFixed(2)),
    wheelSpeedMagnitudeRpm: Number(wheelSpeedMagnitude.toFixed(2)),
    pinionAngularVelocityRadS: Number(omega1.toFixed(3)),
    wheelAngularVelocityRadS: Number(omega2.toFixed(3)),
    pinionTorqueNm: Number(T1Nm.toFixed(2)),
    wheelTorqueNm: Number(T2Nm.toFixed(2)),
    inputPowerKw: Number(PinKw.toFixed(3)),
    outputPowerKw: Number(PoutKw.toFixed(3)),
    powerLossKw: Number(PlossKw.toFixed(3)),
    efficiency: Number(efficiency.toFixed(4)),
    pitchLineVelocityMs: Number(pitchLineVelocity.toFixed(2)),
    pinionRotation: pinionRotationDirection,
    wheelRotation
  };
}
