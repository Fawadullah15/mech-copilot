# Shaft–Hub Connections: Parallel Keys, Interference Fits & Thermal Assembly

## 1. Executive Overview

Stage 09 implements a deterministic, traceable shaft–hub connection engineering subsystem in the **Mechanical Engineering Design Copilot**. The module addresses two fundamental mechanical methods for transmitting torque and axial thrust between rotating shafts and mounted components (gears, pulleys, sprockets, impellers, and couplings):

1. **Parallel-Key Connections (DIN 6885-1:2021-11):** Evaluates tangential driving force ($F_t = 2T/d$), key shear stress ($\tau_k = F_t / A_s$), flank crushing/bearing contact pressure ($p_b = F_t / A_b$), key geometry standards for Form A (round ends, $L_{\text{eff}} = L - b$) and Form B (square ends, $L_{\text{eff}} = L$), allowable stress limits governed by the weakest mating material ($0.80 \min(S_y) / n$), reversing torque dynamic de-ratings, and connection torque capacities.
2. **Cylindrical Interference Fits (DIN 7190-1:2017-02 / Lamé Thick-Walled Elasticity):** Evaluates dimensional interference bounds ($\delta_{\min}, \delta_{\max}$) linked to ISO 286 tolerance classes, Lamé elastic compliance for solid and hollow shafts in cylindrical hubs, interface contact pressure bounds ($p_{\min}, p_{\max}$), hub and shaft bore triaxial stress states, Von Mises yield criteria, friction-based torque and axial retention capacities, combined vector traction under simultaneous loading, and zero-interference clearance risk.
3. **Thermal Assembly Engine:** Solves required thermal dilation ($\Delta d = d \cdot \alpha \cdot \Delta T$) and assembly temperatures for hub heating, shaft sub-zero cooling, and combined assembly with standard clearance allowances, enforcing metallurgical tempering and cryogenic safety boundaries.

---

## 2. Parallel-Key Connections (DIN 6885-1:2021-11)

### 2.1 Standard Geometry & Profile Types
Standard drive keys conform to DIN 6885-1:2021-11 (metric parallel keys with deep pattern). For a shaft seat diameter $d$, standard key width $b$ and total height $h$, shaft keyway depth $t_1$, and hub keyway depth $t_2$ are standardized based on shaft diameter ranges:

| Shaft Diameter Range $d$ (mm) | Key Width $b$ (mm) | Key Height $h$ (mm) | Shaft Depth $t_1$ (mm) | Hub Depth $t_2$ (mm) |
|:---|:---:|:---:|:---:|:---:|
| $> 10 \le 12$ | 4 | 4 | 2.5 | 1.8 |
| $> 12 \le 17$ | 5 | 5 | 3.0 | 2.3 |
| $> 17 \le 22$ | 6 | 6 | 3.5 | 2.8 |
| $> 22 \le 30$ | 8 | 7 | 4.0 | 3.3 |
| $> 30 \le 38$ | 10 | 8 | 5.0 | 3.3 |
| $> 38 \le 44$ | 12 | 8 | 5.0 | 3.3 |
| $> 44 \le 50$ | 14 | 9 | 5.5 | 3.8 |
| $> 50 \le 58$ | 16 | 10 | 6.0 | 4.3 |
| $> 58 \le 65$ | 18 | 11 | 7.0 | 4.4 |
| $> 65 \le 75$ | 20 | 12 | 7.5 | 4.9 |
| $> 75 \le 85$ | 22 | 14 | 9.0 | 5.4 |
| $> 85 \le 95$ | 25 | 14 | 9.0 | 5.4 |
| $> 95 \le 110$ | 28 | 16 | 10.0 | 6.4 |
| $> 110 \le 130$ | 32 | 18 | 11.0 | 7.4 |

### 2.2 Effective Contact Length & Flank Contact Height
- **Form A (Round Ends):** Milled with an end-mill cutter matching key width. Semicircular ends ($r = b/2$) do not transmit hub contact pressure.
  $$L_{\text{eff}} = \max(0, L - b)$$
- **Form B (Square Ends):** Milled with a sled-runner slot or open ended. The entire nominal length transmits load.
  $$L_{\text{eff}} = L$$
- **Effective Flank Bearing Height ($h_{\text{eff}}$):**
  The flank height is governed by the minimum engagement between shaft and hub keyways:
  $$h_{\text{eff}} = \min(t_1, h - t_1)$$
  *(Typically $t_2 \approx h - t_1$. For standard proportions where $t_1 \approx 0.6h$, the hub contact depth is $\approx 0.4h$ and governs flank crushing).*

### 2.3 Stress Formulations & Load Equilibrium
For transmitted torque $T$ and dynamic load factor $K_A \ge 1.0$:
1. **Design Torque:**
   $$T_d = T \cdot K_A$$
2. **Tangential Force at Shaft Surface ($r = d/2$):**
   $$F_t = \frac{2 T_d}{d}$$
3. **Key Shear Stress:**
   Shear occurs across the horizontal junction plane ($A_s = b \cdot L_{\text{eff}}$):
   $$\tau_k = \frac{F_t}{A_s} = \frac{F_t}{b \cdot L_{\text{eff}}}$$
4. **Flank Crushing / Contact Pressure:**
   Compressive bearing stress occurs along the key flank ($A_b = h_{\text{eff}} \cdot L_{\text{eff}}$):
   $$p_b = \frac{F_t}{A_b} = \frac{F_t}{h_{\text{eff}} \cdot L_{\text{eff}}}$$

### 2.4 Weakest Mating Material Criterion & Safety Verification
- Allowable flank contact pressure is governed by the weakest component in the assembly:
  $$S_{y,\min} = \min(S_{y,\text{key}}, S_{y,\text{shaft}}, S_{y,\text{hub}})$$
  $$p_{\text{allow,base}} = \frac{0.80 \cdot S_{y,\min}}{n}$$
- **Reversing Torque De-rating:** Under alternating or reversing load cycles, keyways suffer fretting wear and local plastic pounding. An empirical 40% de-rating factor ($C_{\text{rev}} = 0.60$) is enforced:
  $$p_{\text{allow}} = p_{\text{allow,base}} \cdot 0.60 \quad (\text{if reversing})$$
- **Allowable Shear Stress:**
  $$\tau_{\text{allow}} = \frac{0.577 \cdot S_{y,\text{key}}}{n}$$
- **Connection Capacity & Safety Factors:**
  $$n_{\text{shear}} = \frac{\tau_{\text{allow}}}{\tau_k}, \quad n_{\text{crush}} = \frac{p_{\text{allow}}}{p_b}$$
  $$T_{\text{cap,shear}} = \frac{d}{2} \cdot \tau_{\text{allow}} \cdot b \cdot L_{\text{eff}}$$
  $$T_{\text{cap,flank}} = \frac{d}{2} \cdot p_{\text{allow}} \cdot h_{\text{eff}} \cdot L_{\text{eff}}$$
  $$T_{\text{capacity}} = \min(T_{\text{cap,shear}}, T_{\text{cap,flank}})$$

---

## 3. Cylindrical Interference Fits (DIN 7190-1:2017-02 & Lamé Elasticity)

### 3.1 Interference Bounds from ISO 286 Tolerances
Given shaft upper and lower limits ($d_{\max}, d_{\min}$) and hub bore limits ($D_{i,\max}, D_{i,\min}$):
$$\delta_{\max} = d_{\max} - D_{i,\min} \quad (\text{maximum interference / tightest fit})$$
$$\delta_{\min} = d_{\min} - D_{i,\max} \quad (\text{minimum interference / loosest fit})$$
If $\delta_{\min} \le 0$, the fit contains clearance conditions under extreme tolerance stack-up; an explicit clearance alert is raised.

### 3.2 Lamé Thick-Walled Elastic Compliance
Per Lamé thick-cylinder theory codified in DIN 7190-1:2017-02, the radial displacement per unit interface pressure ($p$) for isotropic materials is:
- **Hub Compliance ($C_h$):**
  For outer diameter $D_o$ and nominal bore $d$ with diameter ratio $q = d / D_o < 1$:
  $$C_h = \frac{1}{E_h} \left[ \frac{1 + q^2}{1 - q^2} + \nu_h \right]$$
- **Shaft Compliance ($C_s$):**
  For solid shaft ($d_i = 0$):
  $$C_s = \frac{1 - \nu_s}{E_s}$$
  For hollow shaft with inner bore $d_i$ and ratio $q_i = d_i / d < 1$:
  $$C_s = \frac{1}{E_s} \left[ \frac{1 + q_i^2}{1 - q_i^2} - \nu_s \right]$$
- **Total Assembly Compliance ($K$):**
  $$K = d \cdot (C_h + C_s)$$
- **Contact Pressure Bounds:**
  $$p_{\min} = \frac{\max(0, \delta_{\min})}{K}, \quad p_{\max} = \frac{\max(0, \delta_{\max})}{K}$$

### 3.3 Stress Distribution & Yield Safety
The most critical stress state occurs at the inner bore of the hub ($r = d/2$) at maximum interference $p_{\max}$:
1. **Hub Hoop Stress (Circumferential Tension):**
   $$\sigma_{t,h} = p_{\max} \frac{1 + q^2}{1 - q^2}$$
2. **Hub Radial Stress (Compression):**
   $$\sigma_{r,h} = - p_{\max}$$
3. **Hub Von Mises Equivalent Stress:**
   $$\sigma_{vM,h} = \sqrt{\sigma_{t,h}^2 - \sigma_{t,h} \sigma_{r,h} + \sigma_{r,h}^2} = p_{\max} \frac{\sqrt{3 + q^4}}{1 - q^2}$$
4. **Shaft Surface Stress:**
   For a solid shaft under uniform radial pressure $p_{\max}$, $\sigma_r = \sigma_t = -p_{\max}$, so $\sigma_{vM,s} = p_{\max}$.
5. **Yield Safety Factors:**
   $$n_{\text{yield,hub}} = \frac{S_{y,\text{hub}}}{\sigma_{vM,h}}, \quad n_{\text{yield,shaft}} = \frac{S_{y,\text{shaft}}}{\sigma_{vM,s}}$$

### 3.4 Torque, Axial & Combined Vector Capacity
Interface holding capacity relies on coulomb friction with coefficient $\mu$ (typically $0.12 - 0.18$ for dry steel/steel fits, $0.10$ for oiled fits):
1. **Torque Capacity ($T_{\text{cap}}$):**
   $$T_{\text{cap}} = \mu \cdot p_{\min} \cdot \pi \cdot d \cdot L \cdot \frac{d}{2} = \mu \cdot p_{\min} \cdot \frac{\pi d^2 L}{2}$$
2. **Axial Retention Force Capacity ($F_{\text{axial,cap}}$):**
   $$F_{\text{axial,cap}} = \mu \cdot p_{\min} \cdot \pi \cdot d \cdot L$$
3. **Simultaneous Combined Traction:**
   When torque $T$ and axial force $F_a$ act concurrently, interface friction is shared. The tangential driving force is $F_t = 2T / d$. The vector resultant traction is:
   $$F_{\text{res}} = \sqrt{F_t^2 + F_a^2}$$
   $$n_{\text{slip,combined}} = \frac{F_{\text{axial,cap}}}{F_{\text{res}}}$$

---

## 4. Thermal Assembly & Dilation Engine

### 4.1 Thermal Dilation Principles
To assemble an interference fit without destructive galling, scoring, or excessive hydraulic press forces, thermal expansion of the hub and/or thermal contraction of the shaft is required:
$$\Delta d = d \cdot \alpha \cdot \Delta T$$
Where $\alpha$ is the linear thermal expansion coefficient ($1/\text{K}$ or $1/^\circ\text{C}$).

### 4.2 Minimum Assembly Clearance Requirement
To ensure effortless positioning and avoid premature seizure during axial insertion:
$$c_{\text{assembly}} = \max(0.001 \cdot d, 0.020\text{ mm})$$
The required diametral clearance change is:
$$\Delta d_{\text{req}} = \delta_{\max} + c_{\text{assembly}}$$

### 4.3 Temperature Solutions
1. **Hub Heating Alone ($T_s = T_{\text{amb}}$):**
   $$\Delta T_h = \frac{\Delta d_{\text{req}}}{d \cdot \alpha_h} \implies T_h = T_{\text{amb}} + \Delta T_h$$
2. **Shaft Cryogenic Cooling Alone ($T_h = T_{\text{amb}}$):**
   $$\Delta T_s = \frac{\Delta d_{\text{req}}}{d \cdot \alpha_s} \implies T_s = T_{\text{amb}} - \Delta T_s$$
3. **Combined Heating & Cooling:**
   $$\Delta d_{\text{net}} = d \cdot (\alpha_h (T_h - T_{\text{amb}}) + \alpha_s (T_{\text{amb}} - T_s))$$
   $$\text{Clearance}_{\text{net}} = \Delta d_{\text{net}} - \delta_{\max}$$

### 4.4 Process Safety Safeguards
- **Tempering Limit Warning ($T_h > 250^\circ\text{C}$):** Heating hardened alloy steels beyond $250^\circ\text{C}$ risks un-tempering the martensitic matrix, drastically reducing yield strength and surface hardness.
- **Extreme Heating Hazard ($T_h > 350^\circ\text{C}$):** Severe oxidation, dimensional distortion, and annealing occur.
- **Cryogenic Embrittlement Limit ($T_s < -196^\circ\text{C}$):** Below liquid nitrogen boiling point, specialized cryogenic apparatus is required, and carbon steels exhibit ductile-to-brittle transition risks.

---

## 5. Standards Registry & Verification Traceability

| Standard ID | Title / Edition | Status | Scope & Verifications |
|:---|:---|:---:|:---|
| `din-6885-1` | Drive Type Fastenings without Taper Action — Parallel Keys (2021-11) | Verified | Sizing table $10 \le d \le 130$ mm, Form A vs B effective length, shear stress, flank crushing, weakest material criterion, reversing de-rating. |
| `din-7190-1` | Press Fits — Calculation and Design Rules, Part 1: Cylindrical Fits (2017-02) | Verified | Lamé thick-cylinder elasticity, contact pressure bounds, inner bore triaxial stress, friction slip capacity, vector traction, clearance detection. |
| `din-7190-2` | Press Fits — Part 2: Conical Fits (2017-02) | Unverified (Deferred) | Conical/tapered metallic press fits; explicitly documented as unsupported boundary. |
| `iso-286-1` | Geometrical product specifications (GPS) — ISO code system for tolerances on linear sizes (2010) | Verified | Hole/shaft fundamental tolerance grades and deviations powering interference limits. |
| `iso-281` | Rolling Bearings — Dynamic Load Ratings and Rating Life (2007) | Verified | Scope updated to clarify decoupling of bearing life from general shaft static equilibrium. |
