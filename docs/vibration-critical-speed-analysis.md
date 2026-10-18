# Vibration, Critical Speeds & Dynamic Rotor Analysis

**Standard References:** ISO 20816-1:2016, ISO 20816-3:2022, ISO 21940-11:2016 (Amd 1:2022), ISO 21940-12:2016  
**Module:** `src/engineering/vibration/`  
**Application:** Quantum AI Mechanical Engineering Design Copilot

---

## 1. Executive Summary & Engineering Scope

Stage 11 integrates a rigorous, finite-element lateral vibration, critical-speed screening, forced unbalance response, and rigid-rotor balancing subsystem into the Mechanical Engineering Design Copilot. The subsystem provides deterministic solutions for multi-station stepped shafts, flexible or rigid bearing supports, and mounted disk elements (such as gears or couplings).

### Scope Boundaries & Standards Provenance
1. **Governing Lateral Modal Theory:** Euler–Bernoulli beam finite element formulation with consistent mass matrices (Hermite cubic shape functions) for transverse bending.
2. **Governing Balancing Standard:** ISO 21940-11:2016 (*Mechanical vibration — Rotor balancing — Part 11: Procedures and tolerances for rotors with rigid behaviour*, incorporating Amendment 1:2020).
   - Verifies balance quality grades ($G0.4$ through $G40$), permissible specific unbalance ($e_{\text{per}}$), permissible residual unbalance ($U_{\text{per}}$), and dynamic correction-plane allocation.
3. **Condition Monitoring Clarification & Standards Honesty (ISO 20816 Series):**
   - ISO 20816-1:2016 and ISO 20816-3:2022 govern in-service vibration measurement on physical bearing housings and running shafts.
   - *Publication Status Audit:* As of October 2026, revisions ISO 20816-1:2026 and ISO 20816-3:2026 are under publication (stage 60.00 / DIS/FDIS) and will supersede the 2016/2022 editions upon release.
   - The software provides predictive analytical model calculations, **not** certified in-situ vibration sensor diagnostics or legal condition-monitoring approval. Both standards are registered with verification status `unverified` to prevent misleading claims.
4. **Flexible Rotor Balancing Boundary (ISO 21940-12:2016):**
   - Multi-plane modal balancing and experimental influence coefficient calculations across resonance bands are explicitly scoped as deferred boundaries (`unverified`).

---

## 2. Theoretical Formulation & Governing Equations

### 2.1 Beam Finite-Element Model (Hermite Cubic Formulation)

For each 2-node beam element of length $L_e$, outer diameter $d_o$, inner diameter $d_i$, elastic modulus $E$, and mass density $\rho$:
- Cross-sectional area:
  $$A = \frac{\pi (d_o^2 - d_i^2)}{4}$$
- Second moment of area:
  $$I = \frac{\pi (d_o^4 - d_i^4)}{64}$$
- Mass per unit length:
  $$m' = \rho A$$

Each node possesses two degrees of freedom: transverse lateral deflection $v$ and cross-sectional rotation (bending slope) $\theta = \frac{dv}{dx}$.

#### Element Stiffness Matrix ($K_e$)
$$K_e = \frac{EI}{L_e^3} \begin{bmatrix}
12 & 6 L_e & -12 & 6 L_e \\
6 L_e & 4 L_e^2 & -6 L_e & 2 L_e^2 \\
-12 & -6 L_e & 12 & -6 L_e \\
6 L_e & 2 L_e^2 & -6 L_e & 4 L_e^2
\end{bmatrix}$$

#### Element Consistent Mass Matrix ($M_e$)
$$M_e = \frac{\rho A L_e}{420} \begin{bmatrix}
156 & 22 L_e & 54 & -13 L_e \\
22 L_e & 4 L_e^2 & 13 L_e & -3 L_e^2 \\
54 & 13 L_e & 156 & -22 L_e \\
-13 L_e & -3 L_e^2 & -22 L_e & 4 L_e^2
\end{bmatrix}$$

#### Discrete Lumped Masses & Flexible Bearing Supports
- **Lumped Mass (Gear / Flywheel Disk):** At the node closest to axial coordinate $z_{\text{disk}}$, the lumped mass $m_{\text{disk}}$ is added to the translational mass diagonal $M(2j, 2j) \mathrel{+}= m_{\text{disk}}$. If diametral tilt inertia $I_d$ is specified, $M(2j+1, 2j+1) \mathrel{+}= I_d$.
- **Flexible Bearing Support:** At the node closest to bearing station $z_{\text{bearing}}$, support radial stiffness $k_r$ is added to the translational stiffness diagonal $K(2j, 2j) \mathrel{+}= k_r$.
- **Rigid Constraints:** Pinned supports enforce $v_j = 0$ (DOF row and column eliminated); fixed supports enforce $v_j = 0$ and $\theta_j = 0$.

---

### 2.2 Generalized Symmetric Eigensolution

The stationary undamped lateral modal equation:
$$\mathbf{K}_{\text{active}} \boldsymbol{\phi} = \omega^2 \mathbf{M}_{\text{active}} \boldsymbol{\phi}$$

#### Solution Procedure:
1. **Cholesky Factorization:** $\mathbf{M} = \mathbf{L} \mathbf{L}^T$, where $\mathbf{L}$ is a lower-triangular matrix with strictly positive diagonal pivots.
2. **Standard Transformation:** $\tilde{\mathbf{A}} = \mathbf{L}^{-1} \mathbf{K} (\mathbf{L}^{-1})^T$. $\tilde{\mathbf{A}}$ is an exact real symmetric matrix.
3. **Cyclic Jacobi Rotation:** Numerically stable orthogonal Givens rotations diagonalize $\tilde{\mathbf{A}}$ to within machine precision ($< 10^{-12}$ off-diagonal norm), yielding eigenvalues $\lambda_i = \omega_i^2$ and transformed eigenvectors $\mathbf{Y}$.
4. **Eigenvector Recovery & Normalization:**
   $$\boldsymbol{\phi}_i = (\mathbf{L}^{-1})^T \mathbf{Y}_{*, i}$$
   Eigenvectors satisfy exact mass-orthogonality: $\boldsymbol{\phi}_i^T \mathbf{M} \boldsymbol{\phi}_j = \delta_{ij}$.
5. **Frequency Extraction:**
   $$\omega_i = \sqrt{\max(0, \lambda_i)} \quad [\text{rad/s}]$$
   $$f_i = \frac{\omega_i}{2\pi} \quad [\text{Hz}]$$
   $$n_{\text{sync}, i} = 60 \cdot f_i \quad [\text{rpm}]$$
6. **Rigid-Body Identification:** Frequencies with $\omega < 0.5\text{ rad/s}$ ($f < 0.08\text{ Hz}$) represent physical unconstrained rigid-body motion (e.g. in free-free rotors) and are flagged accordingly.

---

### 2.3 Independent Analytical Benchmarks

#### 1. Simply Supported Uniform Continuous Beam (Classical Euler-Bernoulli):
For a uniform beam of length $L$, diameter $d$, and span ends simply supported:
$$\omega_n = \frac{n^2 \pi^2}{L^2} \sqrt{\frac{EI}{\rho A}}, \quad f_n = \frac{n^2 \pi}{2 L^2} \sqrt{\frac{EI}{\rho A}}$$
- Mode 1: $f_1 = \frac{\pi}{2 L^2} \sqrt{\frac{EI}{\rho A}}$
- Mode 2: $f_2 = 4 \cdot f_1$
- Mode 3: $f_3 = 9 \cdot f_1$

#### 2. Cantilever (Fixed-Free) Continuous Beam:
$$\omega_1 = \frac{1.8751^2}{L^2} \sqrt{\frac{EI}{\rho A}} = \frac{3.5160}{L^2} \sqrt{\frac{EI}{\rho A}}, \quad f_1 = \frac{3.5160}{2\pi L^2} \sqrt{\frac{EI}{\rho A}}$$

#### 3. Rayleigh Static Deflection Quotient:
Under uniform gravitational self-weight $w = \rho A g$:
$$\delta_{\max} = \frac{5 w L^4}{384 E I}$$
$$\omega_R \approx \sqrt{\frac{g}{\delta_{\max} \cdot \frac{49}{64}}}, \quad f_R = \frac{\omega_R}{2\pi}$$

#### 4. Dunkerley Lower-Bound Approximation:
For a shaft with lumped masses:
$$\frac{1}{f_{\text{Dunk}}^2} = \frac{1}{f_{\text{shaft}}^2} + \sum \frac{1}{f_{\text{mass}, i}^2}$$
where $f_{\text{mass}, i} = \frac{1}{2\pi} \sqrt{\frac{k_i}{m_i}}$ and $k_i = \frac{3 E I L}{a^2 b^2}$.

---

### 2.4 Synchronous Critical Speeds & Operating Range Separation

Synchronous unbalance excitation occurs at running speed:
$$f_{1X} = \frac{n}{60} \quad [\text{Hz}]$$
A synchronous critical-speed intersection occurs when running speed coincides with a lateral natural frequency:
$$n_{c,i} \approx 60 \cdot f_{n,i} \quad [\text{rpm}]$$

#### Operating Margin Criteria:
For operating range $[n_{\min}, n_{\max}]$ and nominal speed $n_{\text{op}}$:
$$\Delta n = |n_{\text{op}} - n_{c,i}|$$
$$\text{Separation Margin (\%)} = \frac{\Delta n}{n_{c,i}} \times 100\%$$
- **Safe:** Separation $\ge 15.0\%$ and $n_{c,i} \notin [n_{\min}, n_{\max}]$.
- **Warning:** Separation $< 15.0\%$ but does not cross range.
- **Critical:** $n_{\min} \le n_{c,i} \le n_{\max}$ (critical speed lies directly inside operating range).

---

### 2.5 Forced Unbalance & Jeffcott Rotor Dynamic Response

For residual mass-unbalance magnitude $U = m \cdot e$ [$\text{g}\cdot\text{mm}$ or $\text{kg}\cdot\text{m}$]:
- Centrifugal unbalance excitation force:
  $$F_u(\Omega) = U \cdot \Omega^2 \quad [\text{N}]$$
  where $\Omega = \frac{2\pi n}{60}$ [rad/s].
- Steady-state displacement amplitude (Jeffcott single-degree-of-freedom formulation):
  $$X(\Omega) = \frac{F_u(\Omega)}{\sqrt{(k_{\text{eff}} - m_{\text{eff}} \Omega^2)^2 + (c_{\text{eff}} \Omega)^2}} \quad [\text{m}]$$
  where:
  - $m_{\text{eff}}, k_{\text{eff}}$ are the fundamental modal mass and stiffness.
  - Viscous damping $c_{\text{eff}} = 2 \zeta \sqrt{k_{\text{eff}} m_{\text{eff}}}$.
  - Dynamic magnification / quality factor at resonance:
    $$Q = \frac{1}{2\zeta}$$
  - Phase lag angle:
    $$\phi(\Omega) = \arctan\left(\frac{c_{\text{eff}} \Omega}{k_{\text{eff}} - m_{\text{eff}} \Omega^2}\right) \quad [^\circ]$$
    ($0^\circ$ at low speeds $\to 90^\circ$ at resonance $\to 180^\circ$ at supercritical speeds).

---

### 2.6 Rotational Excitation Orders & Gear Meshing

- Synchronous orders: $1X = n/60$, $2X = 2n/60$, $3X = 3n/60$, $4X = 4n/60$.
- Gear-mesh tooth passing frequency (for gear with $z$ teeth rotating at $n$ rpm):
  $$f_{\text{mesh}} = \frac{z \cdot n}{60} \quad [\text{Hz}]$$
- Resonant harmonic screening: Flags any excitation order within $\pm 10\%$ of an undamped natural frequency.

---

### 2.7 Bounded Rigid-Rotor Balancing (ISO 21940-11:2016)

For rotors with rigid behavior ($n < 0.5 n_{c1}$):
- **Balance Quality Grade ($G$):** $G0.4, G1, G2.5, G6.3, G16, G40$ [$\text{mm/s}$].
- **Permissible Specific Residual Unbalance ($e_{\text{per}}$):**
  $$e_{\text{per}} = \frac{1000 \cdot G}{\Omega} \quad [\mu\text{m} \text{ or g}\cdot\text{mm/kg}]$$
- **Total Permissible Residual Unbalance ($U_{\text{per}}$):**
  $$U_{\text{per}} = e_{\text{per}} \cdot M_{\text{rotor}} \quad [\text{g}\cdot\text{mm}]$$
- **Correction-Plane Allocation:**
  - Single plane for thin disk rotors ($b < 0.2 d$).
  - Two-plane dynamic allocation for general rotors (symmetric 50/50 split or plane moment arm distribution).

---

## 3. Module Architecture

```
src/engineering/vibration/
├── types.ts              # Data contracts: RotorSystemInput, ModalResult, CriticalSpeed, ImbalanceResponse, Balancing
├── matrixAssembly.ts     # Hermite cubic beam finite element K and M assembly, lumped masses, spring supports
├── eigensolver.ts        # Cholesky factorization + cyclic Jacobi eigensolver for generalized symmetric problems
├── modalAnalysis.ts      # Natural frequencies, mode shapes, Rayleigh & Dunkerley analytical benchmarks
├── criticalSpeed.ts      # Campbell critical-speed screening, separation margins, operating range crossing detection
├── imbalanceResponse.ts  # Centrifugal unbalance excitation, Jeffcott forced response, speed sweep, Q-factor
├── balancing.ts          # ISO 21940-11:2016 rigid rotor balancing calculations & plane allocation
├── excitation.ts         # Rotational harmonic orders (1X, 2X, ...) and gear-mesh frequency screening
└── index.ts              # Centralized re-export barrel
```

---

## 4. Workstation Interface (`src/pages/VibrationPage.tsx`)

The dedicated Vibration & Dynamic Rotor Workstation provides:
1. **Interactive Parameters Panel:** Shaft length, outer/inner diameters, material selection, bearing support positions and spring stiffness, lumped disk mass and location, operational speeds, damping ratio, unbalance magnitude, and ISO balance grade.
2. **Resonance Status Banner:** Color-coded alert badge (Safe / Warning / Critical) displaying immediate separation margins from the first critical speed.
3. **Parametric SVG Mode Shape Canvas:** Displays the solved continuous deflection shape $\phi_i(z)$ for Modes 1 to 4 with bearing support and disk markers.
4. **Critical Speed Screening Table:** Full numerical tabular breakdown of frequencies, critical speeds, operating separation margins, and crossing warnings.
5. **Forced Vibration Response Curve:** SVG speed sweep plot showing vibration amplitude vs rotational speed, peak resonance readout, and phase progression.
6. **Rotational Orders & Gear Mesh:** Immediate proximity check between excitation frequencies and structural resonances.
7. **ISO 21940-11 Balance Readout:** Computed $e_{\text{per}}$, $U_{\text{per}}$, and plane allocation.
8. **1-Click Audit Report Generator:** Instant clipboard export of the full engineering report in GitHub-flavored Markdown.

---

## 5. Verification Benchmarks

The subsystem is validated through 14 comprehensive numerical benchmarks in `src/engineering/__tests__/vibration.test.ts`:
- **Benchmark 1:** Uniform Simply Supported Beam 1st Lateral Mode matches analytical Euler-Bernoulli solution ($101.56\text{ Hz}$ theory vs $101.56\text{ Hz}$ FEA, $< 0.1\%$ error).
- **Benchmark 2:** Higher bending modes conform to integer-squared harmonic ratios ($f_2 \approx 4 f_1$, $f_3 \approx 9 f_1$).
- **Benchmark 3:** Cantilever (Fixed-Free) beam matches continuous mechanics ($36.18\text{ Hz}$).
- **Benchmark 4:** Free-free unconstrained rotor model has 2 rigid-body modes near zero frequency ($\omega < 0.05\text{ rad/s}$).
- **Benchmark 5:** Rayleigh static quotient and Dunkerley approximations provide consistent upper and lower bounds.
- **Benchmark 6:** Lumped central mass lowers fundamental frequency predictably ($10\text{ kg}$ disk drops $f_1$ to $66.84\text{ Hz}$, matching analytical Rayleigh-Ritz).
- **Benchmark 7:** Flexible bearing support compliance reduces natural frequency relative to rigid mounts.
- **Benchmark 8:** Centrifugal unbalance force scales quadratically with speed ($F_u = U \Omega^2$, ratio $(2000/1000)^2 = 4.0$).
- **Benchmark 9:** Jeffcott forced response demonstrates resonant peak and $0^\circ \to 90^\circ \to 180^\circ$ phase lag.
- **Benchmark 10:** Dynamic magnification factor $Q = 1 / (2\zeta)$ and peak amplitude scale inversely with damping ratio.
- **Benchmark 11:** Critical speed separation margins and resonance crossing detection (safe, warning, critical).
- **Benchmark 12:** Rotational excitation orders and gear-mesh frequency screening ($f_{\text{mesh}} = z \cdot n / 60$).
- **Benchmark 13:** ISO 21940-11 rigid-rotor balance tolerances ($G2.5$, $M=20\text{ kg}$, $n=3000\text{ rpm} \implies e_{\text{per}} = 7.958\text{ }\mu\text{m}, U_{\text{per}} = 159.15\text{ g}\cdot\text{mm}$).
- **Benchmark 14:** Matrix symmetry, positive-definiteness, and dimensionless eigenvalue relative residuals ($< 10^{-6}$).
