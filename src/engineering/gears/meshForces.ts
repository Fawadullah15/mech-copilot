import type {
  MeshForcesInput,
  MeshForcesResult,
  Force3D,
  Moment3D
} from './types';

const DEG_TO_RAD = Math.PI / 180;

/**
 * Calculates 3D gear mesh forces (tangential, radial, axial, normal) and
 * resolves global coordinate force and moment vectors acting on pinion and mating wheel
 * enforcing Newton's third law.
 */
export function calculateMeshForces(input: MeshForcesInput): MeshForcesResult {
  const {
    pinionTorqueNm,
    pinionPitchDiameterMm,
    normalPressureAngleDeg,
    transversePressureAngleDeg,
    helixAngleDeg,
    pinionHelixHand,
    pinionRotationDirection,
    meshOrientationAngleDeg = 90, // Default 90°: mating wheel on +y axis (above pinion)
    isPinionDriver = true
  } = input;

  const warnings: string[] = [];

  // Validation
  if (!Number.isFinite(pinionTorqueNm) || pinionTorqueNm <= 0) {
    throw new Error(
      `Pinion torque must be a positive number, received: ${pinionTorqueNm} N·m`
    );
  }
  if (!Number.isFinite(pinionPitchDiameterMm) || pinionPitchDiameterMm <= 0) {
    throw new Error(
      `Pinion pitch diameter must be positive, received: ${pinionPitchDiameterMm} mm`
    );
  }
  if (!Number.isFinite(normalPressureAngleDeg) || normalPressureAngleDeg <= 0) {
    throw new Error(
      `Normal pressure angle must be positive, received: ${normalPressureAngleDeg}°`
    );
  }

  const alphaNRad = normalPressureAngleDeg * DEG_TO_RAD;
  const alphaTRad = transversePressureAngleDeg * DEG_TO_RAD;
  const betaRad = helixAngleDeg * DEG_TO_RAD;

  // 1. Force Magnitudes (Scalar)
  // Tangential force: Ft = 2 * T1 / d1 (with T1 in N·mm and d1 in mm => 2000 * T1 / d1)
  const Ft = (2000 * pinionTorqueNm) / pinionPitchDiameterMm;

  // Radial separating force: Fr = Ft * tan(alphat) = Ft * tan(alphan) / cos(beta)
  const Fr = Ft * Math.tan(alphaTRad);

  // Axial thrust force: Fa = Ft * tan(beta)
  const Fa = helixAngleDeg > 0 ? Ft * Math.tan(betaRad) : 0;

  // Normal contact force: Fn = Ft / (cos(alphan) * cos(beta)) = sqrt(Ft^2 + Fr^2 + Fa^2)
  const Fn = Ft / (Math.cos(alphaNRad) * Math.cos(betaRad));

  // 2. Global Coordinate Vector Resolution
  // Coordinate frame:
  //   +x = Shaft longitudinal axis (Station A -> Station B)
  //   +y = Vertical radial axis (upward)
  //   +z = Horizontal transverse axis (right-hand rule: x x y = z)
  //
  // Mesh contact point location on pinion pitch cylinder:
  // theta_mesh = angle around shaft axis (0° = wheel on +z, 90° = wheel on +y, 180° = wheel on -z, 270° = wheel on -y)
  const thetaRad = meshOrientationAngleDeg * DEG_TO_RAD;
  const rContact = pinionPitchDiameterMm / 2; // mm
  const yContactMm = rContact * Math.sin(thetaRad);
  const zContactMm = rContact * Math.cos(thetaRad);

  // A. Radial force on pinion:
  // Pushes the pinion center away from the contact point towards the shaft center:
  // Vector points from contact point towards shaft center => (-sin(theta), -cos(theta))
  const Fry = -Fr * Math.sin(thetaRad);
  const Frz = -Fr * Math.cos(thetaRad);

  // B. Tangential force on pinion:
  // For driving pinion, resistance from driven wheel opposes motion.
  // Rotation CW (looking down +x): velocity vector at angle theta points towards theta - 90°.
  // Reaction force opposes motion, pointing towards theta + 90°: (cos(theta) j, -sin(theta) k).
  // Rotation CCW: velocity points towards theta + 90°, reaction points towards theta - 90°: (-cos(theta) j, +sin(theta) k).
  const rotFactor = pinionRotationDirection === 'CW' ? 1.0 : -1.0;
  const driverFactor = isPinionDriver ? 1.0 : -1.0;

  const Fty = Ft * rotFactor * driverFactor * Math.cos(thetaRad);
  const Ftz = -Ft * rotFactor * driverFactor * Math.sin(thetaRad);

  // Total transverse force components on pinion:
  const pinionFy = Fry + Fty;
  const pinionFz = Frz + Ftz;

  // C. Axial thrust force on pinion (helical gear):
  // Kinematic rule for driving gear:
  //   Right-hand helix (RH), CW rotation -> +x
  //   Right-hand helix (RH), CCW rotation -> -x
  //   Left-hand helix (LH), CW rotation -> -x
  //   Left-hand helix (LH), CCW rotation -> +x
  let axialDir = 0;
  if (helixAngleDeg > 0 && pinionHelixHand !== 'none') {
    if (pinionHelixHand === 'right') {
      axialDir = pinionRotationDirection === 'CW' ? 1.0 : -1.0;
    } else if (pinionHelixHand === 'left') {
      axialDir = pinionRotationDirection === 'CW' ? -1.0 : 1.0;
    }
    // Reverse if pinion is driven rather than driver
    if (!isPinionDriver) {
      axialDir = -axialDir;
    }
  }

  const pinionFx = Fa * axialDir;

  // D. Overturning moment from eccentric axial thrust:
  // The axial force Fx acts at offset (0, yContact, zContact) in meters:
  // r_contact = (0, yContactMm * 1e-3, zContactMm * 1e-3) m
  // F_axial = (pinionFx, 0, 0) N
  // M = r x F = (0, zContact * Fx, -yContact * Fx) in N·m
  const yContactM = yContactMm * 1e-3;
  const zContactM = zContactMm * 1e-3;
  const pinionMy = zContactM * pinionFx;
  const pinionMz = -yContactM * pinionFx;
  const pinionMx = 0; // Pure axial force produces 0 torque about x-axis

  const pinionForceGlobal: Force3D = {
    Fx: Number(pinionFx.toFixed(2)),
    Fy: Number(pinionFy.toFixed(2)),
    Fz: Number(pinionFz.toFixed(2))
  };

  const pinionOverturningMomentGlobal: Moment3D = {
    Mx: Number(pinionMx.toFixed(2)),
    My: Number(pinionMy.toFixed(3)),
    Mz: Number(pinionMz.toFixed(3))
  };

  // 3. Global vectors on mating Wheel (Newton's 3rd Law: action = -reaction)
  const wheelForceGlobal: Force3D = {
    Fx: Number((-pinionFx).toFixed(2)),
    Fy: Number((-pinionFy).toFixed(2)),
    Fz: Number((-pinionFz).toFixed(2))
  };

  const wheelOverturningMomentGlobal: Moment3D = {
    Mx: Number((-pinionMx).toFixed(2)),
    My: Number((-pinionMy).toFixed(3)),
    Mz: Number((-pinionMz).toFixed(3))
  };

  // Equilibrium check: sum of forces between mesh pair is 0
  const isEquilibriumEnforced =
    Math.abs(pinionForceGlobal.Fx + wheelForceGlobal.Fx) < 1e-4 &&
    Math.abs(pinionForceGlobal.Fy + wheelForceGlobal.Fy) < 1e-4 &&
    Math.abs(pinionForceGlobal.Fz + wheelForceGlobal.Fz) < 1e-4;

  const assumptions = [
    'Static tooth contact load decomposition based on pitch-line equilibrium.',
    'Uniform line load distribution across face width without dynamic overload factors.',
    'Rigid shaft and gear blank assumption; tooth deflection misalignment neglected.',
    'Common global coordinate frame: +x along shaft axis, +y vertical upward, +z horizontal transverse.'
  ];

  if (helixAngleDeg > 0 && Math.abs(pinionFx) > 500) {
    warnings.push(
      `Helical gear generates significant axial thrust (${Math.abs(pinionFx).toFixed(
        1
      )} N). Bearing support must incorporate a locating bearing with adequate axial dynamic load rating.`
    );
  }

  return {
    tangentialForceN: Number(Ft.toFixed(2)),
    radialForceN: Number(Fr.toFixed(2)),
    axialForceN: Number(Fa.toFixed(2)),
    normalForceN: Number(Fn.toFixed(2)),
    pinionForceGlobalN: pinionForceGlobal,
    pinionOverturningMomentGlobalNm: pinionOverturningMomentGlobal,
    wheelForceGlobalN: wheelForceGlobal,
    wheelOverturningMomentGlobalNm: wheelOverturningMomentGlobal,
    isEquilibriumEnforced,
    meshOrientationAngleDeg,
    coordinateConvention:
      '+x: longitudinal shaft axis, +y: vertical radial, +z: horizontal transverse',
    assumptions,
    warnings,
    standardReference: 'ISO 21771-1:2024 / Analytical Tooth Contact Mechanics'
  };
}
