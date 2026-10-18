# Rolling Bearings, Support Reactions & Dynamic L10 Rating Life

## 1. Executive Overview

Stage 08 implements a deterministic rolling bearing engineering subsystem within the **Mechanical Engineering Design Copilot**. The module resolves 3D static equilibrium reaction forces on simply supported shafts carrying point transverse loads in two orthogonal radial planes ($F_y, F_z$), axial thrust loads ($F_a$), and applied moments. It models real locating-floating and cross-located bearing arrangements without arbitrary load splitting, evaluates ISO 281:2007 equivalent dynamic loads ($P = X F_r + Y F_a$), computes basic dynamic rating life ($L_{10}$ in millions of revolutions and operating hours), and verifies static load safety ($s_0 = C_0 / P_0$) against plastic raceway brinelling per ISO 76:2006.

---

## 2. 3D Static Equilibrium Reaction Solver

### 2.1 Coordinate Conventions & Support Locations
- Shaft axis is along the horizontal $x$-direction ($0 \le x \le L$).
- Vertical plane is the $xy$-plane ($+y$ upward).
- Horizontal transverse plane is the $xz$-plane ($+z$ orthogonal).
- Bearing support stations are placed at $x_A$ and $x_B$ ($0 \le x_A < x_B \le L$), defining span $L_{\text{span}} = x_B - x_A > 0$.

### 2.2 Analytical Equilibrium Formulations
For $N$ transverse point loads applied at axial stations $x_i$:

1. **Vertical Plane Moment Equilibrium ($\sum M_{z@A} = 0$):**
   $$R_{yB} \cdot (x_B - x_A) + \sum_{i=1}^{N} \left[ F_{y,i} \cdot (x_i - x_A) + M_{z,i} \right] = 0$$
   $$R_{yB} = - \frac{\sum_{i=1}^{N} \left[ F_{y,i} \cdot (x_i - x_A) + M_{z,i} \right]}{x_B - x_A}$$

2. **Vertical Plane Force Equilibrium ($\sum F_y = 0$):**
   $$R_{yA} + R_{yB} + \sum_{i=1}^{N} F_{y,i} = 0 \implies R_{yA} = - \sum_{i=1}^{N} F_{y,i} - R_{yB}$$

3. **Horizontal Plane Moment Equilibrium ($\sum M_{y@A} = 0$):**
   $$R_{zB} = - \frac{\sum_{i=1}^{N} \left[ F_{z,i} \cdot (x_i - x_A) \right] - \sum_{i=1}^{N} M_{y,i}}{x_B - x_A}$$

4. **Horizontal Plane Force Equilibrium ($\sum F_z = 0$):**
   $$R_{zA} = - \sum_{i=1}^{N} F_{z,i} - R_{zB}$$

5. **Resultant Radial Loads on Bearings:**
   $$F_{rA} = \sqrt{R_{yA}^2 + R_{zA}^2}, \quad F_{rB} = \sqrt{R_{yB}^2 + R_{zB}^2}$$

6. **Equilibrium Residual Verification:**
   $$\varepsilon_F = \max\left(\left|\sum F_y\right|, \left|\sum F_z\right|\right) \le 10^{-5}\text{ N}$$
   $$\varepsilon_M = \max\left(\left|\sum M_{z@A}\right|, \left|\sum M_{y@A}\right|\right) \le 10^{-5}\text{ N}\cdot\text{mm}$$

### 2.3 Axial Thrust Load Allocation
- **Locating-Floating Arrangement:**
  - One bearing is clamped axially to fix shaft position; the other is free to float axially (e.g., cylindrical roller NU type or loose housing fit) to accommodate thermal growth.
  - Locating bearing carries $100\%$ of external axial thrust: $F_a = |F_{a,\text{total}}|$.
  - Floating bearing carries zero axial load: $F_a = 0$.
  - Arbitrary 50/50 splitting of axial load without kinematic modeling is strictly disallowed.
- **Cross-Located Arrangement:**
  - Opposite bearings resist opposing directional thrust (e.g., paired tapered roller or angular contact bearings).

---

## 3. Equivalent Dynamic Bearing Load Engine (ISO 281:2007)

The basic equivalent dynamic radial load $P$ combines radial load $F_r$ and axial load $F_a$:
$$P = X F_r + Y F_a$$

### 3.1 Deep Groove Ball Bearings (DGBB)
- When $F_a = 0$ or $F_a / F_r \le e$:
  $$X = 1.0, \quad Y = 0 \implies P = F_r$$
- When $F_a / F_r > e$:
  $$X = 0.56, \quad Y = f(F_a / C_0)$$
  where limiting factor $e$ and axial factor $Y$ are interpolated linearly from ISO 281:2007 Table 3:
  | $F_a / C_0$ | $e$ | $Y$ |
  |---|---|---|
  | 0.014 | 0.19 | 2.30 |
  | 0.028 | 0.22 | 1.99 |
  | 0.056 | 0.26 | 1.71 |
  | 0.084 | 0.28 | 1.55 |
  | 0.110 | 0.30 | 1.45 |
  | 0.170 | 0.34 | 1.31 |
  | 0.280 | 0.38 | 1.15 |
  | 0.420 | 0.42 | 1.04 |
  | 0.560 | 0.44 | 1.00 |

### 3.2 Cylindrical Roller Bearings (CRB, Radial NU/N Type)
- Pure radial support: $X = 1.0, Y = 0 \implies P = F_r$.
- If axial load $F_a > 0$ is applied, the engine returns an explicit technical warning stating that separable NU/N roller bearings cannot sustain axial thrust without NJ/NUP thrust flanges or an adjacent locating bearing.

### 3.3 Angular Contact Ball Bearings (ACBB, $40^\circ$ Contact Angle)
- $e = 1.14$.
- If $F_a / F_r \le 1.14$: $X = 1.0, Y = 0 \implies P = F_r$.
- If $F_a / F_r > 1.14$: $X = 0.35, Y = 0.57 \implies P = 0.35 F_r + 0.57 F_a$.

### 3.4 Tapered Roller Bearings (TRB, ISO 355 Series)
- Catalog limiting factor $e \approx 0.37$ to $0.40$ and axial factor $Y \approx 1.50$ to $1.60$.
- If $F_a / F_r \le e$: $X = 1.0, Y = 0 \implies P = F_r$.
- If $F_a / F_r > e$: $X = 0.40, Y = Y_{\text{catalog}} \implies P = 0.40 F_r + Y F_a$.

---

## 4. Dynamic Rating Life Engine (ISO 281:2007)

### 4.1 Rating Life in Millions of Revolutions ($L_{10}$)
$$L_{10} = \left(\frac{C}{P}\right)^p \quad [10^6 \text{ revolutions}]$$
where:
- $C$ is the basic dynamic load rating from the bearing standard/catalog (N).
- $P$ is the equivalent dynamic load (N).
- $p = 3$ for ball bearings (point contact, deep groove and angular contact).
- $p = 10/3 \approx 3.3333$ for roller bearings (line contact, cylindrical and tapered roller).

### 4.2 Operating Hours Conversion ($L_{10h}$)
$$L_{10h} = \frac{10^6}{60 \cdot n} \cdot L_{10} = \frac{10^6}{60 \cdot n} \cdot \left(\frac{C}{P}\right)^p \quad [\text{operating hours}]$$
where $n$ is rotational shaft speed in rev/min (RPM).

### 4.3 Industrial Evaluation Thresholds
- **Adequate ($\ge 20,000$ hours):** Exceeds general industrial continuous machinery design target (fans, pumps, gearboxes, industrial drives).
- **Marginal ($5,000$ to $20,000$ hours):** Acceptable for intermittent, moderate, or light-duty machinery; requires periodic vibration monitoring.
- **Inadequate ($< 5,000$ hours):** High risk of subsurface contact fatigue flaking/spalling during required service life.

---

## 5. Static Load Safety Factor (ISO 76:2006 + Amd 1:2017)

### 5.1 Static Equivalent Load ($P_0$)
$$P_0 = \max(X_0 F_r + Y_0 F_a, \, F_r)$$
- **Deep Groove Ball:** $X_0 = 0.60, Y_0 = 0.50$
- **Cylindrical Roller:** $X_0 = 1.0, Y_0 = 0$
- **Angular Contact ($40^\circ$):** $X_0 = 0.50, Y_0 = 0.26$
- **Tapered Roller:** $X_0 = 0.50, Y_0 \approx 0.88$

### 5.2 Static Safety Factor ($s_0$)
$$s_0 = \frac{C_0}{P_0}$$
- **$s_0 \ge 1.5$ (Safe):** Required for smooth, quiet, low-noise rotational operation free from permanent plastic indentations.
- **$1.0 \le s_0 < 1.5$ (Caution):** Standard industrial machinery under moderate operation; verify absence of severe shock impacts.
- **$s_0 < 1.0$ (Brinelling Risk):** Static peak load exceeds basic static capacity $C_0$. Permanent plastic brinelling of raceways and rolling elements will induce severe rotational vibration and rapid failure.

---

## 6. Standards Demarcation & Advanced Boundaries

### 6.1 ISO 281:2007 vs ISO 16281:2025
- **Verified Software Boundary:** ISO 281:2007 provides basic rating life corresponding to $90\%$ survival probability under clean mineral oil/grease elastohydrodynamic lubrication ($a_{\text{ISO}} = 1.0$) and rigid bearing seats without significant angular slope ($\theta < 2 \text{ to } 10\text{ arcmin}$).
- **Deferred Advanced Boundary (ISO 16281:2025):** ISO 16281 calculates modified reference rating life using discrete sliced contact stress distribution, internal radial/axial clearance, raceway profile crowning, and housing elastic compliance. Because proprietary internal contact micro-geometry is not published in standard general catalogs, simulating ISO 16281 without verified manufacturer geometry would introduce misleading false precision. ISO 16281:2025 is formally recorded in the Standards Registry with active but unverified status.
