/**
 * Robust numerical eigensolver for the generalized symmetric eigenvalue problem:
 *   K * phi = lambda * M * phi
 * where M is symmetric positive definite and K is symmetric positive semi-definite.
 *
 * Employs Cholesky factorization of M followed by cyclic Jacobi rotation of the transformed
 * symmetric matrix A = L^(-1) * K * L^(-T).
 */

export interface EigensolverOutput {
  eigenvalues: number[];        // lambda_i = omega_i^2 (rad/s)^2 in ascending order
  eigenvectors: number[][];     // phi_i (columns of size nActive)
  residuals: number[];          // ||K*phi - lambda*M*phi|| / (||K|| * ||phi||)
  sweeps: number;
  converged: boolean;
}

export function solveGeneralizedSymmetricEigen(
  K: number[][],
  M: number[][],
  maxSweeps: number = 60,
  tolerance: number = 1e-12
): EigensolverOutput {
  const n = K.length;
  if (n === 0 || M.length !== n) {
    throw new Error('Matrix dimension mismatch or empty matrix in generalized eigensolver.');
  }

  // 1. Cholesky Factorization of M: M = L * L^T (L is lower triangular)
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = M[i][j];
      for (let k = 0; k < j; k++) {
        sum -= L[i][k] * L[j][k];
      }

      if (i === j) {
        if (sum <= 0) {
          throw new Error(`Mass matrix M is not positive definite at index ${i} (pivot = ${sum.toExponential(4)}).`);
        }
        L[i][j] = Math.sqrt(sum);
      } else {
        L[i][j] = sum / L[j][j];
      }
    }
  }

  // 2. Invert lower-triangular matrix L: Linv = L^(-1)
  const Linv: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    Linv[i][i] = 1.0 / L[i][i];
    for (let j = 0; j < i; j++) {
      let sum = 0;
      for (let k = j; k < i; k++) {
        sum += L[i][k] * Linv[k][j];
      }
      Linv[i][j] = -sum / L[i][i];
    }
  }

  // 3. Form standard symmetric matrix A = Linv * K * Linv^T
  // Intermediate: B = K * Linv^T = (Linv * K^T)^T = (Linv * K)^T since K is symmetric
  const temp: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += Linv[i][k] * K[k][j];
      }
      temp[i][j] = sum;
    }
  }

  const A: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += temp[i][k] * Linv[j][k]; // Linv^T[k][j] = Linv[j][k]
      }
      A[i][j] = sum;
      A[j][i] = sum; // Force exact symmetry
    }
  }

  // 4. Cyclic Jacobi algorithm for symmetric matrix A: A * Y = Y * diag(lambda)
  const Y: number[][] = Array.from({ length: n }, (_, i) => {
    const row = new Array(n).fill(0);
    row[i] = 1.0;
    return row;
  });

  let sweeps = 0;
  let converged = false;

  for (; sweeps < maxSweeps; sweeps++) {
    // Measure off-diagonal Frobenius norm
    let offDiagNorm = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        offDiagNorm += A[i][j] * A[i][j];
      }
    }
    offDiagNorm = Math.sqrt(2 * offDiagNorm);

    if (offDiagNorm < tolerance) {
      converged = true;
      break;
    }

    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const App = A[p][p];
        const Aqq = A[q][q];
        const Apq = A[p][q];

        if (Math.abs(Apq) < 1e-18) continue;

        const tau = (Aqq - App) / (2 * Apq);
        let t: number;
        if (tau >= 0) {
          t = 1.0 / (tau + Math.sqrt(1 + tau * tau));
        } else {
          t = -1.0 / (-tau + Math.sqrt(1 + tau * tau));
        }

        const c = 1.0 / Math.sqrt(1 + t * t);
        const s = t * c;
        const s2 = s * s;
        const c2 = c * c;

        // In-place Jacobi similarity transformation: A' = J^T * A * J
        A[p][p] = c2 * App - 2 * s * c * Apq + s2 * Aqq;
        A[q][q] = s2 * App + 2 * s * c * Apq + c2 * Aqq;
        A[p][q] = 0;
        A[q][p] = 0;

        for (let k = 0; k < n; k++) {
          if (k !== p && k !== q) {
            const Akp = A[k][p];
            const Akq = A[k][q];
            A[k][p] = c * Akp - s * Akq;
            A[p][k] = A[k][p];
            A[k][q] = s * Akp + c * Akq;
            A[q][k] = A[k][q];
          }
        }

        // Accumulate eigenvectors: Y' = Y * J
        for (let k = 0; k < n; k++) {
          const Ykp = Y[k][p];
          const Ykq = Y[k][q];
          Y[k][p] = c * Ykp - s * Ykq;
          Y[k][q] = s * Ykp + c * Ykq;
        }
      }
    }
  }

  // 5. Back-transform eigenvectors: phi = Linv^T * Y
  // phi_column_j = Linv^T * Y_column_j
  const Phi: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += Linv[k][i] * Y[k][j]; // Linv^T[i][k] = Linv[k][i]
      }
      Phi[i][j] = sum;
    }
  }

  // 6. Collect and sort eigenvalues (ascending)
  const paired: { val: number; vec: number[] }[] = [];
  for (let j = 0; j < n; j++) {
    let lambda = A[j][j];
    // Numerical cleanup for zero or near-zero eigenvalues
    if (Math.abs(lambda) < 1e-12) {
      lambda = 0;
    } else if (lambda < 0 && lambda > -1e-8) {
      lambda = 0;
    }
    const colVec = Phi.map(row => row[j]);
    paired.push({ val: lambda, vec: colVec });
  }

  paired.sort((a, b) => a.val - b.val);

  const sortedEigenvalues = paired.map(p => p.val);
  const sortedEigenvectors: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      sortedEigenvectors[i][j] = paired[j].vec[i];
    }
  }

  // 7. Residual verification: ||K*phi_j - lambda_j*M*phi_j|| / (||K|| * ||phi_j||)
  const residuals: number[] = [];
  for (let j = 0; j < n; j++) {
    const phi = paired[j].vec;
    const lambda = paired[j].val;
    let resNormSq = 0;
    let kPhiNormSq = 0;
    let mPhiNormSq = 0;

    for (let i = 0; i < n; i++) {
      let kPhi_i = 0;
      let mPhi_i = 0;
      for (let k = 0; k < n; k++) {
        kPhi_i += K[i][k] * phi[k];
        mPhi_i += M[i][k] * phi[k];
      }
      const r_i = kPhi_i - lambda * mPhi_i;
      resNormSq += r_i * r_i;
      kPhiNormSq += kPhi_i * kPhi_i;
      mPhiNormSq += mPhi_i * mPhi_i;
    }

    const scale = Math.max(Math.sqrt(kPhiNormSq), lambda * Math.sqrt(mPhiNormSq), 1e-9);
    const relResidual = Math.sqrt(resNormSq) / scale;
    residuals.push(relResidual);
  }

  return {
    eigenvalues: sortedEigenvalues,
    eigenvectors: sortedEigenvectors,
    residuals,
    sweeps,
    converged,
  };
}
