import { RotorSystemInput, ShaftSegmentInput, BearingSupportInput, LumpedMassInput } from './types';
import { materials } from '../../data/materials';

export interface BeamNode {
  index: number;
  z: number; // m
}

export interface BeamElement {
  node1: number;
  node2: number;
  length: number;       // m
  outerDiameter: number;// m
  innerDiameter: number;// m
  area: number;         // m²
  inertia: number;      // m⁴
  elasticModulus: number;// Pa
  density: number;      // kg/m³
  mass: number;         // kg
}

export interface AssembledSystem {
  nodes: BeamNode[];
  elements: BeamElement[];
  totalDof: number;
  activeDofIndices: number[];
  constrainedDofIndices: number[];
  K_active: number[][];
  M_active: number[][];
  K_global: number[][];
  M_global: number[][];
  totalMassKg: number;
  centerOfGravityZM: number;
  totalLengthM: number;
  nodePositionsM: number[];
}

/**
 * Discretizes a multi-segment shaft and assembles global/active K and M matrices.
 * Units internally: SI (meters, kilograms, seconds, Newtons, Pascals).
 */
export function assembleBeamSystem(rotor: RotorSystemInput): AssembledSystem {
  if (!rotor.segments || rotor.segments.length === 0) {
    throw new Error('Rotor system must contain at least one shaft segment.');
  }

  const maxElementLenM = (rotor.meshElementMaxLenMm ?? 20) / 1000;
  const nodes: BeamNode[] = [];
  const elements: BeamElement[] = [];

  let currentZ = 0;
  nodes.push({ index: 0, z: currentZ });

  let totalShaftMass = 0;
  let massMomentSum = 0;

  for (const seg of rotor.segments) {
    if (seg.length <= 0 || seg.outerDiameter <= 0) {
      throw new Error(`Invalid segment geometry: length=${seg.length} mm, diameter=${seg.outerDiameter} mm must be positive.`);
    }

    const segLenM = seg.length / 1000;
    const doM = seg.outerDiameter / 1000;
    const diM = (seg.innerDiameter ?? 0) / 1000;

    if (diM >= doM) {
      throw new Error(`Inner diameter (${seg.innerDiameter} mm) must be less than outer diameter (${seg.outerDiameter} mm).`);
    }

    // Material properties lookup with explicit overrides
    let E = seg.elasticModulus ? seg.elasticModulus * 1e9 : undefined;
    let rho = seg.density;

    if (!E || !rho) {
      const mat = materials.find(m => m.id === seg.materialId);
      if (!mat) {
        throw new Error(`Material ID '${seg.materialId}' not found in materials database.`);
      }
      if (!E) E = mat.elasticModulus * 1e9; // GPa to Pa
      if (!rho) rho = mat.density;           // kg/m³
    }

    const area = (Math.PI * (doM * doM - diM * diM)) / 4;
    const inertia = (Math.PI * (Math.pow(doM, 4) - Math.pow(diM, 4))) / 64;

    // Subdivide segment into uniform elements of length <= maxElementLenM
    const numSubElements = Math.max(1, Math.ceil(segLenM / maxElementLenM));
    const elemLenM = segLenM / numSubElements;

    for (let e = 0; e < numSubElements; e++) {
      const startNodeIdx = nodes.length - 1;
      currentZ += elemLenM;
      const endNodeIdx = nodes.length;
      nodes.push({ index: endNodeIdx, z: currentZ });

      const elemMass = rho * area * elemLenM;
      totalShaftMass += elemMass;
      const elemCenterZ = currentZ - elemLenM / 2;
      massMomentSum += elemMass * elemCenterZ;

      elements.push({
        node1: startNodeIdx,
        node2: endNodeIdx,
        length: elemLenM,
        outerDiameter: doM,
        innerDiameter: diM,
        area,
        inertia,
        elasticModulus: E,
        density: rho,
        mass: elemMass,
      });
    }
  }

  const numNodes = nodes.length;
  const totalDof = numNodes * 2; // 2 DOFs per node: [v, theta]

  // Initialize global matrices (zero-filled)
  const K_global: number[][] = Array.from({ length: totalDof }, () => new Array(totalDof).fill(0));
  const M_global: number[][] = Array.from({ length: totalDof }, () => new Array(totalDof).fill(0));

  // Assemble element stiffness and consistent mass matrices
  for (const elem of elements) {
    const L = elem.length;
    const L2 = L * L;
    const L3 = L2 * L;
    const EI = elem.elasticModulus * elem.inertia;
    const kFactor = EI / L3;

    // 4x4 Hermite beam element stiffness matrix
    const ke = [
      [12 * kFactor, 6 * L * kFactor, -12 * kFactor, 6 * L * kFactor],
      [6 * L * kFactor, 4 * L2 * kFactor, -6 * L * kFactor, 2 * L2 * kFactor],
      [-12 * kFactor, -6 * L * kFactor, 12 * kFactor, -6 * L * kFactor],
      [6 * L * kFactor, 2 * L2 * kFactor, -6 * L * kFactor, 4 * L2 * kFactor],
    ];

    // 4x4 Hermite beam element consistent mass matrix
    const mFactor = (elem.density * elem.area * L) / 420;
    const me = [
      [156 * mFactor, 22 * L * mFactor, 54 * mFactor, -13 * L * mFactor],
      [22 * L * mFactor, 4 * L2 * mFactor, 13 * L * mFactor, -3 * L2 * mFactor],
      [54 * mFactor, 13 * L * mFactor, 156 * mFactor, -22 * L * mFactor],
      [-13 * L * mFactor, -3 * L2 * mFactor, -22 * L * mFactor, 4 * L2 * mFactor],
    ];

    // Global DOF indices: node1 has [2*n1, 2*n1+1], node2 has [2*n2, 2*n2+1]
    const dofs = [
      elem.node1 * 2,
      elem.node1 * 2 + 1,
      elem.node2 * 2,
      elem.node2 * 2 + 1,
    ];

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        K_global[dofs[r]][dofs[c]] += ke[r][c];
        M_global[dofs[r]][dofs[c]] += me[r][c];
      }
    }
  }

  // Integrate lumped masses
  let totalLumpedMass = 0;
  if (rotor.lumpedMasses && rotor.lumpedMasses.length > 0) {
    for (const lm of rotor.lumpedMasses) {
      if (lm.mass <= 0) continue;
      const targetZM = lm.stationZ / 1000;
      const closestNode = findClosestNode(nodes, targetZM);
      const vDof = closestNode.index * 2;
      const thetaDof = vDof + 1;

      M_global[vDof][vDof] += lm.mass;
      if (lm.diametralInertia && lm.diametralInertia > 0) {
        M_global[thetaDof][thetaDof] += lm.diametralInertia;
      }

      totalLumpedMass += lm.mass;
      massMomentSum += lm.mass * closestNode.z;
    }
  }

  // Identify constrained DOFs and flexible spring supports
  const constrainedSet = new Set<number>();

  if (rotor.supports && rotor.supports.length > 0) {
    for (const sup of rotor.supports) {
      const targetZM = sup.stationZ / 1000;
      const closestNode = findClosestNode(nodes, targetZM);
      const vDof = closestNode.index * 2;
      const thetaDof = vDof + 1;

      if (sup.type === 'rigid_pinned') {
        constrainedSet.add(vDof); // Zero lateral deflection v = 0
      } else if (sup.type === 'rigid_fixed') {
        constrainedSet.add(vDof);     // v = 0
        constrainedSet.add(thetaDof); // theta = 0
      } else if (sup.type === 'flexible_spring') {
        if (sup.radialStiffness <= 0) {
          throw new Error(`Flexible spring support at ${sup.stationZ} mm must have positive radial stiffness.`);
        }
        K_global[vDof][vDof] += sup.radialStiffness;
      }
      // 'free' support applies no constraints
    }
  }

  const constrainedDofIndices = Array.from(constrainedSet).sort((a, b) => a - b);
  const activeDofIndices: number[] = [];
  for (let d = 0; d < totalDof; d++) {
    if (!constrainedSet.has(d)) {
      activeDofIndices.push(d);
    }
  }

  const numActive = activeDofIndices.length;
  if (numActive === 0) {
    throw new Error('All degrees of freedom are fully constrained; no dynamic modal response possible.');
  }

  // Extract active matrices
  const K_active: number[][] = Array.from({ length: numActive }, () => new Array(numActive).fill(0));
  const M_active: number[][] = Array.from({ length: numActive }, () => new Array(numActive).fill(0));

  for (let i = 0; i < numActive; i++) {
    const rGlobal = activeDofIndices[i];
    for (let j = 0; j < numActive; j++) {
      const cGlobal = activeDofIndices[j];
      K_active[i][j] = K_global[rGlobal][cGlobal];
      M_active[i][j] = M_global[rGlobal][cGlobal];
    }
  }

  const totalMassKg = totalShaftMass + totalLumpedMass;
  const centerOfGravityZM = totalMassKg > 0 ? massMomentSum / totalMassKg : 0;
  const totalLengthM = currentZ;

  return {
    nodes,
    elements,
    totalDof,
    activeDofIndices,
    constrainedDofIndices,
    K_active,
    M_active,
    K_global,
    M_global,
    totalMassKg,
    centerOfGravityZM,
    totalLengthM,
    nodePositionsM: nodes.map(n => n.z),
  };
}

function findClosestNode(nodes: BeamNode[], targetZ: number): BeamNode {
  let closest = nodes[0];
  let minDiff = Math.abs(nodes[0].z - targetZ);

  for (let i = 1; i < nodes.length; i++) {
    const diff = Math.abs(nodes[i].z - targetZ);
    if (diff < minDiff) {
      minDiff = diff;
      closest = nodes[i];
    }
  }

  return closest;
}
