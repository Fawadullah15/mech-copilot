# QUANTUM AI // Mechanical Engineering Design Copilot
# Engineering Verification, Mathematical Foundations & Standards Dossier

**Author:** Principal Mechanical Engineer & Engineering Verification Lead  
**Repository:** `c:\Users\Pc\.gemini\antigravity\scratch\mech-copilot`  
**Status:** VERIFIED & TRACEABLE  
**Date:** 2026-10-18  

---

## 1. Executive Overview

This dossier establishes an independent mathematical verification and traceability framework for the calculation engine in the Quantum AI Mechanical Engineering Design Copilot.

Key milestones achieved in Stage 03:
1. **Mathematical Audit & Verification:** Validated governing closed-form equations for solid circular shaft torsion, pure bending, multiaxial plane stress (Von Mises and Tresca failure criteria), flexural beam deflection, angular velocity, and transmitted power against recognized mechanical engineering literature (Shigley, Roark, Gere & Goodno).
2. **Traceable Standards Registry:** Created an immutable, typed standards registry (`src/standards/registry.ts`) distinguishing verified calculation implementations from reference-only standards.
3. **Correction of Misleading Standards Citations:** Removed prototype mislabeling of shaft stress sheets as "ISO 10816" or "Certified PE Reports". ISO 10816 is definitively documented as an operational vibration severity standard for non-rotating housings, not a structural shaft strength or deflection standard.
4. **Deterministic Behavior:** Eliminated synthetic `setTimeout` mock analysis delays and static canned calculation responses in favor of dynamic, deterministic derivations evaluated directly from active telemetry.

---

## 2. Governing Equations & Mathematical Verification

### 2.1 Solid Circular Shaft Torsion
For a solid circular shaft under elastic pure torsion:
- **Polar Moment of Inertia:**
  $$J = \frac{\pi d^4}{32}$$
- **Polar Section Modulus:**
  $$Z_p = \frac{J}{r} = \frac{\pi d^3}{16}$$
- **Torsional Shear Stress:**
  $$\tau_{\max} = \frac{T \cdot r}{J} = \frac{16T}{\pi d^3}$$
- **Allowable Shear Stress (Tresca / MSS assumption):**
  $$\tau_{\text{allow}} = \frac{S_y}{2 \cdot n}$$
- **Minimum Required Diameter:**
  $$d_{\min} = \left[\frac{16T}{\pi \tau_{\text{allow}}}\right]^{1/3}$$

#### Benchmark Check:
- Inputs: $T = 500\text{ N}\cdot\text{m}$, $d = 45\text{ mm} = 0.045\text{ m}$, $S_y = 655\text{ MPa}$, $n = 2.0$.
- $J = \frac{\pi (0.045)^4}{32} = 4.0257 \times 10^{-7}\text{ m}^4 = 402,572\text{ mm}^4$.
- $Z_p = \frac{\pi (0.045)^3}{16} = 1.7892 \times 10^{-5}\text{ m}^3 = 17,892.35\text{ mm}^3$.
- $\tau_{\max} = \frac{500}{1.789235 \times 10^{-5}} = 27.94\text{ MPa}$.
- $\tau_{\text{allow}} = \frac{655}{2 \times 2.0} = 163.75\text{ MPa}$.
- $d_{\min} = \left[\frac{16 \times 500}{\pi \times 163.75 \times 10^6}\right]^{1/3} = 0.02496\text{ m} = \mathbf{24.96\text{ mm}}$ *(note: explicitly corrects earlier prototype report typo citing 42.27 mm)*.
- *Engine Output:* $\tau = 27.94\text{ MPa}$, $d_{\min} = 24.96\text{ mm}$. **Exact match.**

---

### 2.2 Solid Circular Shaft Bending
For a simply supported shaft of span $L$ carrying a concentrated central transverse force $F$:
- **Bending Moment:**
  $$M_{\max} = \frac{F \cdot L}{4}$$
- **Area Moment of Inertia:**
  $$I = \frac{\pi d^4}{64}$$
- **Elastic Section Modulus:**
  $$Z = \frac{I}{r} = \frac{\pi d^3}{32}$$
- **Bending Normal Stress:**
  $$\sigma_b = \frac{M}{Z} = \frac{32M}{\pi d^3}$$

#### Benchmark Check:
- Inputs: $F = 12,000\text{ N}$, $L = 320\text{ mm} = 0.32\text{ m}$, $d = 45\text{ mm} = 0.045\text{ m}$.
- $M = \frac{12,000 \times 0.32}{4} = 960\text{ N}\cdot\text{m}$.
- $I = \frac{\pi (0.045)^4}{64} = 2.0129 \times 10^{-7}\text{ m}^4 = 201,289\text{ mm}^4$.
- $Z = \frac{\pi (0.045)^3}{32} = 8.9462 \times 10^{-6}\text{ m}^3 = 8,946.18\text{ mm}^3$.
- $\sigma_b = \frac{960}{8.94618 \times 10^{-6}} = 107.31\text{ MPa}$.
- *Engine Output:* $M = 960\text{ N}\cdot\text{m}$, $\sigma_b = 107.31\text{ MPa}$. **Exact match.**

---

### 2.3 Combined Multiaxial Stress Criteria
At the critical surface element under simultaneous bending normal stress $\sigma_b$ and torsional shear stress $\tau$:
- **Principal Stresses (Mohr's Circle for Plane Stress):**
  $$\sigma_{1,2} = \frac{\sigma_b}{2} \pm \sqrt{\left(\frac{\sigma_b}{2}\right)^2 + \tau^2}$$
- **Maximum In-Plane Shear Stress:**
  $$\tau_{\max} = \sqrt{\left(\frac{\sigma_b}{2}\right)^2 + \tau^2}$$
- **Von Mises Equivalent Stress (Distortion Energy Theory):**
  $$\sigma_{\text{VM}} = \sqrt{\sigma_b^2 + 3\tau^2}$$
- **Tresca Equivalent Stress (Maximum Shear Stress Theory):**
  $$\sigma_{\text{Tresca}} = 2\tau_{\max} = \sqrt{\sigma_b^2 + 4\tau^2}$$
- **Factor of Safety against Yield:**
  $$\text{FoS} = \frac{S_y}{\sigma_{\text{equiv}}}$$

#### Benchmark Check:
- Inputs: $\sigma_b = 107.31\text{ MPa}$, $\tau = 27.94\text{ MPa}$, $S_y = 655\text{ MPa}$.
- Center: $\frac{107.31}{2} = 53.655\text{ MPa}$.
- Radius: $\sqrt{53.655^2 + 27.94^2} = \sqrt{2878.86 + 780.64} = 60.49\text{ MPa}$.
- $\sigma_1 = 53.655 + 60.49 = 114.15\text{ MPa}$; $\sigma_2 = 53.655 - 60.49 = -6.84\text{ MPa}$.
- $\sigma_{\text{VM}} = \sqrt{107.31^2 + 3(27.94)^2} = \sqrt{11,515.44 + 2,341.93} = 117.72\text{ MPa}$.
- $\text{FoS}_{\text{VM}} = \frac{655}{117.72} = 5.56$.
- $\sigma_{\text{Tresca}} = 2 \times 60.49 = 120.99\text{ MPa}$.
- $\text{FoS}_{\text{Tresca}} = \frac{655}{120.99} = 5.41$.
- *Engine Output:* $\sigma_{\text{VM}} = 117.72\text{ MPa}$, $\text{FoS}_{\text{VM}} = 5.56$; $\sigma_{\text{Tresca}} = 120.99\text{ MPa}$, $\text{FoS}_{\text{Tresca}} = 5.41$. **Exact match.**

---

### 2.4 Beam Deflection & Support Slope
For a simply supported beam with a central concentrated load:
- **Maximum Midspan Deflection:**
  $$\delta_{\max} = \frac{F \cdot L^3}{48 E I}$$
- **Support Slope (Magnitude at $x=0$ and $x=L$):**
  $$\theta_{\text{support}} = \frac{F \cdot L^2}{16 E I}$$

#### Benchmark Check:
- Inputs: $F = 12,000\text{ N}$, $L = 0.32\text{ m}$, $E = 205\text{ GPa} = 205 \times 10^9\text{ Pa}$, $d = 0.045\text{ m}$.
- $I = 2.01289 \times 10^{-7}\text{ m}^4$.
- $48 E I = 48 \times (205 \times 10^9) \times (2.01289 \times 10^{-7}) = 1.98068 \times 10^6\text{ N}\cdot\text{m}^2$.
- $F L^3 = 12,000 \times (0.32)^3 = 393.216\text{ N}\cdot\text{m}^3$.
- $\delta_{\max} = \frac{393.216}{1.98068 \times 10^6} = 0.00019852\text{ m} = 0.1985\text{ mm}$.
- $16 E I = \frac{48 E I}{3} = 660,228\text{ N}\cdot\text{m}^2$.
- $F L^2 = 12,000 \times 0.32^2 = 1,228.8\text{ N}\cdot\text{m}^2$.
- $\theta = \frac{1,228.8}{660,228} = 0.001861\text{ rad} \approx 0.107^{\circ}$.
- *Engine Output:* $\delta_{\max} = 0.1985\text{ mm}$, $\theta = 0.00186\text{ rad}$. **Exact match.**

---

### 2.5 Power Transmission & Speed
- **Angular Velocity:**
  $$\omega = \frac{2\pi n}{60} \quad [\text{rad/s}]$$
- **Transmitted Power:**
  $$P = T \cdot \omega \quad [\text{Watts}]$$
- **Kilowatts & Horsepower:**
  $$P_{\text{kW}} = \frac{P}{1000}, \qquad P_{\text{hp}} = \frac{P}{745.69987}$$

#### Benchmark Check:
- Inputs: $T = 500\text{ N}\cdot\text{m}$, $n = 1450\text{ RPM}$.
- $\omega = \frac{2\pi \times 1450}{60} = 151.8436\text{ rad/s}$.
- $P = 500 \times 151.8436 = 75,921.8\text{ W} = 75.92\text{ kW}$.
- $P_{\text{hp}} = \frac{75,921.8}{745.69987} = 101.81\text{ hp}$.
- *Engine Output:* $P = 75.92\text{ kW}$, $101.81\text{ hp}$, $\omega = 151.84\text{ rad/s}$. **Exact match.**

---

## 3. Engineering Standards Registry Inventory

The application maintains an immutable typed registry (`src/standards/registry.ts`) documenting verified codes, draft historical formulations, and reference-only standards.

| Standard Code | Org | Status | Software Verification | Primary Scope | Current Role in Software |
|---|---|---|---|---|---|
| **SOLID-MECH-REF** | ASME / Academic | Active | **Verified** | Classical mechanics of materials closed-form equations (Shigley, Roark) | Core physics kernel for torsion, bending, combined stress, deflection, power |
| **ASTM A29/A29M-20** | ASTM | Active | **Verified** | Carbon and alloy steel bar specifications and chemical composition baselines | Baseline room-temperature yield/tensile strengths for AISI 1045, 4140, 4340 |
| **ASME B106.1M-1985 (R1991)** | ASME | **Withdrawn (1994)** | Draft | Design of transmission shafting with empirical shock factors ($C_m, C_t$) | Historical baseline for combined fatigue equations; full $C_m/C_t$ matrix in draft |
| **DIN 6885-1:1993-10** | DIN | Active | **Unverified (Reference)** | Parallel keys and keyway dimensions for shaft-hub connections | Standard key size lookup ($14\times 9\text{ mm}$); stress checks deferred to Stage 07 |
| **ISO 281:2007** | ISO | Active | **Unverified (Reference)** | Rolling bearings dynamic load ratings and $L_{10}$ life estimation | Reference only; bearing selection and life calculations deferred to Stage 08 |
| **ISO 286-1:2010** | ISO | Active | **Unverified (Reference)** | Geometrical product specifications: ISO code system for tolerances and fits | Reference only; tolerance class deviations ($h6, k6$) deferred to Stage 06 |
| **ISO 286-2:2010** | ISO | Active | **Unverified (Reference)** | Tables of standard tolerance classes and limit deviations for holes and shafts | Reference only; limit deviation tables deferred to Stage 06 |
| **ISO 10816-1:1995** | ISO | **Withdrawn (Superseded by ISO 20816)** | **Unverified (Reference)** | Evaluation of broadband machine vibration on non-rotating housings | Informational clarification only. Corrected from misleading prototype citations |

---

## 4. Critical Correction: ISO 10816 Clarification

### 4.1 Prior Prototype Misconception
In earlier iterations, the report generator included titles such as `"DIN EN ISO 10816-1"` and `"Certified Report Generator v2.4"`. 

### 4.2 Engineering Reality
- **ISO 10816 (now ISO 20816)** specifies measurement protocols and operational vibration severity limits ($V_{\text{RMS}}$ in mm/s) on **non-rotating machine bearing pedestals and casings**.
- It is **NOT** a shaft structural design standard, stress sizing code, or deflection criterion.
- Claiming that shaft stress and deflection sheets are "certified to ISO 10816" is factually false and misleading.

### 4.3 Action Taken in Stage 03
1. Removed all references associating shaft calculation sheets with ISO 10816 in `ReportsPage.tsx` and `CalculationsPage.tsx`.
2. Documented ISO 10816 in `src/standards/registry.ts` with explicit status `withdrawn` and verification status `unverified (Reference Only)`, clearly articulating its vibration monitoring scope.
3. Removed claims of "Certified Report Generator", "Certified Tolerances", and "PE verification stamps".

---

## 5. Explicit Physical Assumptions & Limitations

### 5.1 Governing Assumptions
1. **Homogeneous, Isotropic Linear Elasticity:** Materials strictly follow Hooke’s Law ($\sigma = E\epsilon$, $\tau = G\gamma$) below yield.
2. **Solid Circular Section:** Calculations assume constant diameter $d$ over the assessed span length.
3. **Idealized Simple Supports:** Shaft bearings are modeled as knife-edge or self-aligning pin/roller supports at $x = 0$ and $x = L$.
4. **Small Deflections:** Euler-Bernoulli beam theory applies ($\delta \ll L$, rotation $\theta \ll 1\text{ rad}$).
5. **Static/Quasi-Static Peak Equivalence:** Dynamic fatigue duty cycles are modeled via unnotched endurance ratios; full alternating vs. mean stress envelopes (Goodman/Gerber) are evaluated in later stages.

### 5.2 Known Limitations
1. **No Stepped-Shaft Stress Concentrations ($K_t$):** Fillet radii at shoulders, retaining ring grooves, and snap ring recesses are not yet factored into stress calculations (scheduled for Stage 05).
2. **Transverse Shear Deformation:** Timoshenko shear deformation is neglected (valid for $L/d > 5$; for stubby shafts $L/d < 5$, deflection will be slightly underpredicted).
3. **Keyway Stress Derating:** DIN 6885-1 keyways induce localized stress concentration factors ($K_t \approx 2.0\text{--}3.0$) and reduce torsional stiffness by $\approx 5\text{--}10\%$, which must be evaluated in Stage 07.
4. **Elevated Temperature Derating:** Material properties assume nominal $20\,^{\circ}\text{C}$ room-temperature conditions; thermal degradation of yield strength above $150\,^{\circ}\text{C}$ is not yet parameterized.

---

## 6. Unresolved Questions & Next Stages Roadmap

1. **Stage 04 (Advanced Fatigue & S-N Formulations):** Implement full Marin modifying factors ($k_a$ surface, $k_b$ size, $k_c$ load, $k_d$ temperature, $k_e$ reliability) and ASME Elliptic / Modified Goodman failure lines for reversing bending combined with steady torsion.
2. **Stage 05 (Stepped Shafts & Discontinuity Kernel):** Implement Petrov-Galerkin or Macaulay's method for multi-diameter stepped shafts with fillet stress concentration lookups.
3. **Stage 06 (Tolerances & ISO 286 Fits):** Integrate numerical limit deviations for bearing journals and hub couplings.
4. **Stage 07 (Keyways & DIN 6885):** Implement torsional shear and hub bearing pressure calculations for parallel keys.
5. **Stage 08 (Rolling Bearings & ISO 281):** Implement dynamic bearing reactions and $L_{10}$ service life estimations.
