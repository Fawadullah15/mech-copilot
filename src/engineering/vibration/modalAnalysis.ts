import {
  RotorSystemInput,
  ModalAnalysisResult,
  NaturalModeResult,
  ModeShapePoint,
  AnalyticalBenchmarks
} from './types';
import { assembleBeamSystem, AssembledSystem } from './matrixAssembly';
import { solveGeneralizedSymmetricEigen } from './eigensolver';

export function runModalAnalysis(rotor: RotorSystemInput): ModalAnalysisResult {
  const assembled = assembleBeamSystem(rotor);
  const nActive = assembled.activeDofIndices.length;

  const eigenResult = solveGeneralizedSymmetricEigen(
    assembled.K_active,
    assembled.M_active
  );

  const totalNodes = assembled.nodes.length;
  const modes: NaturalModeResult[] = [];

  // Map active eigenvectors back to full 2*N DOFs
  for (let m = 0; m < nActive; m++) {
    const lambda = eigenResult.eigenvalues[m];
    const activePhi = eigenResult.eigenvectors.map(row => row[m]);

    const fullVector = new Array(assembled.totalDof).fill(0);
    for (let i = 0; i < nActive; i++) {
      const globalDof = assembled.activeDofIndices[i];
      fullVector[globalDof] = activePhi[i];
    }

    const omega = Math.sqrt(Math.max(0, lambda));
    const fHz = omega / (2 * Math.PI);
    const nSyncRpm = 60 * fHz;
    const isRigidBody = omega < 0.5; // < 0.08 Hz flagged as rigid-body mode

    // Extract node deflections (DOF 2*node)
    let maxDefl = 0;
    let signAtMax = 1;

    for (let n = 0; n < totalNodes; n++) {
      const defl = fullVector[2 * n];
      if (Math.abs(defl) > maxDefl) {
        maxDefl = Math.abs(defl);
        signAtMax = defl >= 0 ? 1 : -1;
      }
    }

    // Normalized mode shape array
    const normFactor = maxDefl > 1e-12 ? maxDefl * signAtMax : 1.0;
    const modeShapePoints: ModeShapePoint[] = [];

    for (let n = 0; n < totalNodes; n++) {
      const zMm = assembled.nodes[n].z * 1000;
      const defl = fullVector[2 * n] / normFactor;
      const slope = fullVector[2 * n + 1] / normFactor;
      modeShapePoints.push({
        z: zMm,
        deflection: Number(defl.toFixed(6)),
        slope: Number(slope.toFixed(6)),
      });
    }

    // Modal mass and stiffness in SI: phi^T * M * phi and phi^T * K * phi
    let phiMphi = 0;
    let phiKphi = 0;

    for (let i = 0; i < nActive; i++) {
      for (let j = 0; j < nActive; j++) {
        phiMphi += activePhi[i] * assembled.M_active[i][j] * activePhi[j];
        phiKphi += activePhi[i] * assembled.K_active[i][j] * activePhi[j];
      }
    }

    const rayleighOmega = phiMphi > 0 ? Math.sqrt(phiKphi / phiMphi) : 0;
    const rayleighHz = rayleighOmega / (2 * Math.PI);

    modes.push({
      modeNumber: m + 1,
      angularFrequencyRadS: Number(omega.toFixed(3)),
      frequencyHz: Number(fHz.toFixed(3)),
      synchronousSpeedRpm: Number(nSyncRpm.toFixed(1)),
      isRigidBody,
      modalMassKg: Number(phiMphi.toFixed(6)),
      modalStiffnessNM: Number(phiKphi.toFixed(3)),
      rayleighFrequencyHz: Number(rayleighHz.toFixed(3)),
      modeShape: modeShapePoints,
    });
  }

  // Analytical Benchmarks for Simply Supported Beam
  const benchmarks = computeAnalyticalBenchmarks(rotor, assembled);

  return {
    modes,
    benchmarks,
    solverDiagnostics: {
      totalElements: assembled.elements.length,
      totalNodes: assembled.nodes.length,
      totalDof: assembled.totalDof,
      constrainedDof: assembled.constrainedDofIndices.length,
      activeDof: nActive,
      jacobiSweeps: eigenResult.sweeps,
      maxResidual: Math.max(...eigenResult.residuals),
      matrixConditionOk: eigenResult.converged,
    },
    totalRotorMassKg: Number(assembled.totalMassKg.toFixed(4)),
    totalLengthMm: Number((assembled.totalLengthM * 1000).toFixed(2)),
    centerOfGravityZMm: Number((assembled.centerOfGravityZM * 1000).toFixed(2)),
  };
}

function computeAnalyticalBenchmarks(rotor: RotorSystemInput, assembled: AssembledSystem): AnalyticalBenchmarks {
  const L = assembled.totalLengthM;
  if (L <= 0 || assembled.elements.length === 0) {
    return { simplySupportedFirstModeHz: 0, rayleighFirstModeHz: 0 };
  }

  // Baseline properties from first element or weighted average
  let sumEI = 0;
  let sumMass = 0;
  for (const elem of assembled.elements) {
    sumEI += elem.elasticModulus * elem.inertia * elem.length;
    sumMass += elem.density * elem.area * elem.length;
  }
  const avgEI = sumEI / L;
  const avgRhoA = sumMass / L;

  // 1. Classical continuous Euler-Bernoulli simply supported beam formula:
  // omega_1 = (pi^2 / L^2) * sqrt(EI / rho*A)
  const omega1_theory = (Math.PI * Math.PI / (L * L)) * Math.sqrt(avgEI / avgRhoA);
  const f1_theory = omega1_theory / (2 * Math.PI);

  // 2. Rayleigh static deflection under uniform self-weight w = rho*A*g:
  // delta_max = (5 * w * L^4) / (384 * E * I)
  // f_R = (1 / 2*pi) * sqrt(g / (0.7656 * delta_max))
  const g = 9.80665;
  const w = avgRhoA * g;
  const deltaMax = (5 * w * Math.pow(L, 4)) / (384 * avgEI);
  const omega_rayleigh = Math.sqrt(g / (deltaMax * (49 / 64)));
  const f_rayleigh = omega_rayleigh / (2 * Math.PI);

  // 3. Dunkerley lower bound for shaft + lumped masses
  let dunkerleyFirstModeHz: number | undefined;

  if (rotor.lumpedMasses && rotor.lumpedMasses.length > 0) {
    let invOmegaSqSum = 1 / (omega1_theory * omega1_theory);

    for (const lm of rotor.lumpedMasses) {
      if (lm.mass <= 0) continue;
      const a = (lm.stationZ / 1000);
      const b = L - a;
      if (a > 0 && b > 0) {
        // Simply supported beam point load stiffness at distance a, b:
        // delta = P * a^2 * b^2 / (3 * E * I * L) => k = 3 * E * I * L / (a^2 * b^2)
        const kPoint = (3 * avgEI * L) / (a * a * b * b);
        const omegaMass = Math.sqrt(kPoint / lm.mass);
        invOmegaSqSum += 1 / (omegaMass * omegaMass);
      }
    }

    const omega_dunk = Math.sqrt(1 / invOmegaSqSum);
    dunkerleyFirstModeHz = Number((omega_dunk / (2 * Math.PI)).toFixed(3));
  }

  return {
    simplySupportedFirstModeHz: Number(f1_theory.toFixed(3)),
    rayleighFirstModeHz: Number(f_rayleigh.toFixed(3)),
    dunkerleyFirstModeHz,
  };
}
