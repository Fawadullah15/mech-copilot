# Cylindrical Gear Geometry, Kinematics & Mesh-Load Integration

**Standard References:** ISO 21771-1:2024, ISO 53:1998, ISO 6336 (Parts 1, 2, 3, 5 explicitly scoped as deferred rating standards)  
**Module:** `src/engineering/gears/`  
**Application:** Quantum AI Mechanical Engineering Design Copilot

---

## 1. Executive Summary & Engineering Scope

Stage 10 introduces a rigorous, typed cylindrical gear engineering subsystem to the Mechanical Engineering Design Copilot. The subsystem covers external involute spur and helical parallel-axis gear pairs, providing deterministic geometry generation, undercut and pointing verification, gear-pair kinematics, 3D mesh force resolution, and direct load transfer into the Stage 08 shaft and bearing reaction solver.

### Scope Boundaries & Standards Traceability
1. **Governing Geometry Standard:** ISO 21771-1:2024 (*Gears — Cylindrical involute gears and gear pairs — Concepts and geometry*).
2. **Basic Rack Standard:** ISO 53:1998 (*Cylindrical gears for general and heavy engineering — Standard basic rack tooth profile*):
   - Standard addendum coefficient: $h_a^* = 1.00$
   - Standard dedendum coefficient: $h_f^* = 1.25$
   - Standard bottom clearance coefficient: $c^* = 0.25$
   - Standard profile fillet radius coefficient: $\rho_f^* = 0.38$
3. **Explicit Boundary Limitation (ISO 6336):**
   - Stage 10 calculates geometric pitch diameters, transverse/normal parameters, center distances, contact ratios ($\varepsilon_\alpha, \varepsilon_\beta, \varepsilon_\gamma$), kinematics, and spatial static mesh forces ($F_t, F_r, F_a, F_n$).
   - Full tooth-bending fatigue rating ($S_F$ / $\sigma_F$) per ISO 6336-3 and pitting resistance / contact fatigue rating ($S_H$ / $\sigma_H$) per ISO 6336-2 require dynamic factor $K_v$, face load factor $K_{H\beta}$, transverse load factor $K_{H\alpha}$, life factor $Z_N$, and material endurance limits per ISO 6336-5. In accordance with strict engineering standards honesty, ISO 6336 is explicitly registered in `src/standards/registry.ts` with status `'active'` but calculation state `unverified` (deferred boundary), and is **not** misrepresented as fully evaluated.

---

## 2. Theoretical Formulation & Governing Equations

### 2.1 Single Gear Transverse & Normal Geometry (ISO 21771-1)

For a cylindrical involute gear with normal module $m_n$, tooth count $z$, normal pressure angle $\alpha_n$, helix angle $\beta$, and profile modification coefficient $x$:

1. **Transverse Module ($m_t$):**
   $$m_t = \frac{m_n}{\cos\beta}$$
   *(For spur gears with $\beta = 0^\circ$, $m_t = m_n$.)*

2. **Transverse Pressure Angle ($\alpha_t$):**
   $$\tan\alpha_t = \frac{\tan\alpha_n}{\cos\beta} \implies \alpha_t = \arctan\left(\frac{\tan\alpha_n}{\cos\beta}\right)$$

3. **Reference Pitch Diameter ($d$):**
   $$d = z \cdot m_t = \frac{z \cdot m_n}{\cos\beta}$$

4. **Base Diameter ($d_b$):**
   $$d_b = d \cdot \cos\alpha_t$$

5. **Standard Addendum ($h_a$) and Dedendum ($h_f$):**
   $$h_a = (h_a^* + x) \cdot m_n$$
   $$h_f = (h_f^* - x) \cdot m_n$$

6. **Tip Diameter ($d_a$) and Root Diameter ($d_f$):**
   $$d_a = d + 2h_a = d + 2(h_a^* + x)m_n$$
   $$d_f = d - 2h_f = d - 2(h_f^* - x)m_n$$

7. **Normal Pitch ($p_n$), Transverse Pitch ($p_t$), Base Pitch ($p_b$), and Axial Pitch ($p_x$):**
   $$p_n = \pi \cdot m_n$$
   $$p_t = \pi \cdot m_t = \frac{p_n}{\cos\beta}$$
   $$p_{bt} = p_t \cdot \cos\alpha_t$$
   $$p_{bn} = p_n \cdot \cos\alpha_n = p_{bt} \cdot \cos\beta$$
   $$p_x = \begin{cases} \dfrac{p_t}{\tan\beta} = \dfrac{\pi m_n}{\sin\beta}, & \text{if } \beta > 0 \\ \infty, & \text{if } \beta = 0 \end{cases}$$

8. **Normal Tooth Thickness on Reference Cylinder ($s_n$):**
   $$s_n = m_n \left(\frac{\pi}{2} + 2x \tan\alpha_n\right)$$

9. **Theoretical Undercut Limit ($z_{\min}$):**
   For standard rack profile ($h_a^* = 1.0$):
   $$z_{\min} = \frac{2 h_a^*}{\sin^2\alpha_t}$$
   For helical gears, considering the virtual equivalent tooth count $z_v = z / \cos^3\beta$:
   $$z_{v,\min} = \frac{2 h_a^*}{\sin^2\alpha_n} \implies z_{\min} = z_{v,\min} \cdot \cos^3\beta$$
   Minimum profile modification to prevent undercut:
   $$x_{\min} = \max\left(0, \; h_a^* \cdot \frac{z_{\min} - z}{z_{\min}}\right)$$

10. **Tooth Pointing Check (Top Land Thickness $s_{at}$):**
    The transverse involute function is defined as $\text{inv}(\alpha) = \tan\alpha - \alpha$.
    At the tip circle diameter $d_a$, the transverse pressure angle is:
    $$\alpha_{at} = \arccos\left(\frac{d_b}{d_a}\right)$$
    The transverse tooth thickness at the tip is:
    $$s_{at} = d_a \left(\frac{s_t}{d} + \text{inv}(\alpha_t) - \text{inv}(\alpha_{at})\right)$$
    Normal tip thickness $s_{an} \approx s_{at} \cdot \cos\beta_a$.
    If $s_{an} < 0.25 m_n$ (or $\le 0$), a warning or error is flagged for tooth crest pointing.

---

### 2.2 Gear-Pair Geometry & Engagement (Parallel-Axis External)

For a pinion (subscript 1) and wheel (subscript 2):

1. **Standard Center Distance ($a$):**
   $$a = \frac{d_1 + d_2}{2} = \frac{(z_1 + z_2) m_t}{2} = \frac{(z_1 + z_2) m_n}{2 \cos\beta}$$

2. **Operating (Working) Transverse Pressure Angle ($\alpha_{wt}$):**
   If profile shifts $x_1, x_2 \neq 0$, the operating center distance $a_w$ is determined from the involute relationship:
   $$\text{inv}(\alpha_{wt}) = \text{inv}(\alpha_t) + 2 \cdot \frac{x_1 + x_2}{z_1 + z_2} \tan\alpha_n$$
   $$a_w = a \cdot \frac{\cos\alpha_t}{\cos\alpha_{wt}}$$
   Operating pitch diameters:
   $$d_{w1} = \frac{2 a_w \cdot z_1}{z_1 + z_2}, \quad d_{w2} = \frac{2 a_w \cdot z_2}{z_1 + z_2}$$
   *(For zero-shift gears $x_1 + x_2 = 0$, $a_w = a$, $\alpha_{wt} = \alpha_t$, and $d_{w} = d$.)*

3. **Transverse Contact Ratio ($\varepsilon_\alpha$):**
   The length of the path of contact $g_\alpha$ in the transverse plane:
   $$g_\alpha = \frac{1}{2} \left(\sqrt{d_{a1}^2 - d_{b1}^2} + \sqrt{d_{a2}^2 - d_{b2}^2}\right) - a_w \sin\alpha_{wt}$$
   $$\varepsilon_\alpha = \frac{g_\alpha}{p_{bt}} = \frac{g_\alpha}{\pi m_t \cos\alpha_t}$$
   *Design requirement:* $\varepsilon_\alpha \ge 1.20$ to maintain continuous mesh.

4. **Overlap Ratio (Face Contact Ratio $\varepsilon_\beta$):**
   For common face width $b = \min(b_1, b_2)$:
   $$\varepsilon_\beta = \frac{b \cdot \sin\beta}{\pi m_n}$$
   *(For spur gears $\beta = 0 \implies \varepsilon_\beta = 0$.)*

5. **Total Contact Ratio ($\varepsilon_\gamma$):**
   $$\varepsilon_\gamma = \varepsilon_\alpha + \varepsilon_\beta$$

---

### 2.3 Kinematics & Power Transmission

1. **Kinematic Gear Ratio ($i$):**
   $$i = \frac{z_2}{z_1} = \frac{d_2}{d_1} = \frac{\omega_1}{\omega_2} = \frac{n_1}{n_2}$$

2. **Driven Speed ($n_2$):**
   $$n_2 = \frac{n_1}{i} = n_1 \cdot \frac{z_1}{z_2}$$

3. **Angular Velocities ($\omega_1, \omega_2$):**
   $$\omega_1 = \frac{2 \pi n_1}{60}, \quad \omega_2 = \frac{2 \pi n_2}{60} = \frac{\omega_1}{i}$$

4. **Pitch-Line Linear Velocity ($v$):**
   $$v = \frac{\pi \cdot d_1 \cdot n_1}{60 \cdot 1000} = \frac{\omega_1 \cdot d_1}{2000} \quad [\text{m/s}]$$

5. **Torques & Efficiency ($T_1, T_2, \eta$):**
   Given input power $P_{\text{in}}$ (kW) and input speed $n_1$ (rpm):
   $$T_1 = \frac{P_{\text{in}} \cdot 1000}{\omega_1} = \frac{9549.297 \cdot P_{\text{in}}}{n_1} \quad [\text{N}\cdot\text{m}]$$
   Output power:
   $$P_{\text{out}} = P_{\text{in}} \cdot \eta, \quad P_{\text{loss}} = P_{\text{in}} \cdot (1 - \eta)$$
   Output torque:
   $$T_2 = T_1 \cdot i \cdot \eta \quad [\text{N}\cdot\text{m}]$$

---

### 2.4 3D Mesh Force Resolution & Coordinate Conventions

Forces acting at the pitch point on the driving pinion:

1. **Tangential Force ($F_t$):**
   $$F_t = \frac{2000 \cdot T_1}{d_1} \quad [\text{N}]$$

2. **Radial Separating Force ($F_r$):**
   $$F_r = F_t \cdot \frac{\tan\alpha_n}{\cos\beta} = F_t \cdot \tan\alpha_t \quad [\text{N}]$$

3. **Axial Thrust Force ($F_a$):**
   $$F_a = F_t \cdot \tan\beta \quad [\text{N}]$$
   *(For spur gears $\beta = 0 \implies F_a = 0$.)*

4. **Normal Resultant Force ($F_n$):**
   $$F_n = \frac{F_t}{\cos\alpha_n \cdot \cos\beta} = \sqrt{F_t^2 + F_r^2 + F_a^2} \quad [\text{N}]$$

#### Global 3D Spatial Vector Resolution & Newton's Third Law
Let the shaft axis be aligned with the Global $X$-axis ($+X$ pointing along shaft length).
Let the centerline between gear centers be along the Global $Y$-axis.
Let the transverse tangential direction be along the Global $Z$-axis.

- **Axial Force Vector ($F_x$):**
  $$F_x = \text{sign}_{\text{thrust}} \cdot F_a$$
  where $\text{sign}_{\text{thrust}}$ is determined by the combination of helix hand (Right-Hand vs Left-Hand) and rotation direction (Clockwise vs Counter-Clockwise).
- **Radial Force Vector ($F_y$):**
  Acts along the centerline toward the shaft center (separating force):
  $$\vec{F}_{\text{radial}} = -F_r \cdot \hat{u}_{\text{radial}}$$
- **Tangential Force Vector ($F_z$):**
  Acts perpendicular to the center distance plane opposing pinion motion:
  $$\vec{F}_{\text{tangential}} = -F_t \cdot \hat{u}_{\text{tangential}}$$

**Newton's Third Law Equilibrium:**
At the pitch mesh contact:
$$\vec{F}_{\text{wheel}} = -\vec{F}_{\text{pinion}}$$
$$F_{t2} = F_{t1}, \quad F_{r2} = F_{r1}, \quad F_{a2} = F_{a1}$$

#### Eccentric Overturning Moment on Shaft
Because the axial thrust $F_a$ acts at the pitch cylinder radius $r = d_1 / 2$ rather than the shaft centerline:
$$\vec{r} = (0, r_y, r_z)$$
$$\vec{M}_{\text{overturning}} = \vec{r} \times \vec{F}_{\text{axial}} = (0, y, z) \times (F_x, 0, 0) = (0, z F_x, -y F_x)$$
This overturning bending moment is directly applied to the shaft at the gear mounting station $x_{\text{gear}}$, producing significant additional radial reactions at the supporting bearings.

---

## 3. Architecture & Module Structure

```
src/engineering/gears/
├── types.ts              # Data contracts: GearDefinition, GearPairDefinition, MeshForces, ShaftLoad
├── geometry.ts           # Single gear geometry (d, db, da, df, pitches, undercut, pointing)
├── gearPair.ts           # Pair geometry (a, aw, transverse & overlap contact ratios, warnings)
├── kinematics.ts         # Speed, torque, power transmission, pitch-line velocity
├── meshForces.ts         # 3D force resolution, spatial vector transformation, equilibrium balance
├── shaftIntegration.ts   # Mapping gear forces to Stage 08 3D point loads and bearing reaction solver
└── index.ts              # Centralized export barrel
```

---

## 4. Workstation Interface (`src/pages/GearsPage.tsx`)

The Gear Design Workstation provides:
1. **Interactive Inputs:** Normal module $m_n$, tooth counts $z_1, z_2$, normal pressure angle $\alpha_n$, helix angle $\beta$, helix hand, face widths $b_1, b_2$, profile shifts $x_1, x_2$, input speed $n_1$, power $P_{\text{in}}$, efficiency $\eta$, and shaft mounting position.
2. **Real-time Diagnostic Badges:** Undercut status ($z < z_{\min}$), pointing status ($s_{an} < 0.25 m_n$), contact ratio verification ($\varepsilon_\alpha \ge 1.20$), and helix hand compatibility.
3. **Parametric SVG Visualization:** Proportional 2D transverse pitch/base/tip circle schematic with animated center distance and mesh pitch point.
4. **Shaft & Bearing Transfer:** 1-click evaluation of bearing radial and axial reactions ($F_{rA}, F_{rB}, F_{aA}$) and dynamic rating life ($L_{10h}$).
5. **Traceable Engineering Dossier:** Real-time generation of an auditable engineering report in GitHub-flavored Markdown.

---

## 5. Verification & Test Coverage

The subsystem is validated through 14 comprehensive numerical benchmarks in `src/engineering/__tests__/gear_geometry.test.ts`:
- **Benchmark 1:** Standard spur gear geometry ($m=4\text{ mm}, z=20, \alpha=20^\circ, \beta=0^\circ$).
- **Benchmark 2:** Standard helical gear geometry ($m_n=3\text{ mm}, z=24, \alpha_n=20^\circ, \beta=15^\circ$).
- **Benchmark 3:** Undercut prevention limit check ($z=14 < z_{\min} \approx 17.1$, $x_{\min} = 0.181$).
- **Benchmark 4:** Tooth pointing check with large positive profile shift.
- **Benchmark 5:** Spur gear-pair center distance and contact ratio ($\varepsilon_\alpha \approx 1.68$).
- **Benchmark 6:** Helical gear-pair overlap and total contact ratio ($\varepsilon_\beta > 1.0, \varepsilon_\gamma > 2.5$).
- **Benchmark 7:** Incompatible helix hand rejection (external pair with same hand).
- **Benchmark 8:** Gear-pair kinematics, speeds, and torques ($95.49\text{ N}\cdot\text{m} \to 280.75\text{ N}\cdot\text{m}$).
- **Benchmark 9:** Spur gear mesh forces ($F_a = 0, F_t = 2387.32\text{ N}, F_r = 868.90\text{ N}$).
- **Benchmark 10:** Helical gear 3D mesh forces with axial thrust ($F_a = 639.68\text{ N}$).
- **Benchmark 11:** Newton's third law balance ($\vec{F}_{\text{wheel}} = -\vec{F}_{\text{pinion}}$).
- **Benchmark 12:** Integration with shaft reactions (point load transfer).
- **Benchmark 13:** Bearing reaction and $L_{10h}$ life impact under combined gear loads.
- **Benchmark 14:** Overturning moment verification from pitch radius axial thrust offset.
