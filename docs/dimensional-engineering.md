# Dimensional Engineering, Tolerances & Fits Dossier
## Quantum AI Mechanical Engineering Design Copilot

**Version:** 1.0.0 (Stage 05 Release)  
**Governing Standards:** ISO 286-1:2010, ISO 286-2:2010, ISO 1:2016  
**Reference Temperature:** 20 °C (Standard reference temperature for geometrical product specification per ISO 1)

---

## 1. Executive Overview

Stage 05 introduces an integrated, deterministic dimensional engineering module providing:
1. **ISO 286 Limits and Fits Engine**: Exact limit deviations, minimum/maximum component dimensions, clearance and interference calculations, and deterministic fit classification for cylindrical mating features up to 500 mm nominal diameter.
2. **1D Dimensional Tolerance Stack-Up Analyzer**: Linear vector chain analysis computing both absolute Worst-Case (arithmetic) assembly boundaries and statistical Root-Sum-Square (RSS) distributions with component driver attribution.
3. **Manufacturing & Assembly Decision Support**: Actionable assembly guidance, functional fit descriptions, and explicit physical boundaries (distinguishing limit dimensions from contact pressure and thermal shrink models).

---

## 2. ISO 286 Limits & Fits Mathematical Formulation

### 2.1 Diameter Step Partitioning
Per ISO 286-1:2010 Table 1, nominal diameters $0 < D \le 500\text{ mm}$ are partitioned into 13 discrete steps to establish standard tolerance values ($IT$):

| Step Index | Nominal Range ($D$) | Boundary Rule | Label |
| :---: | :---: | :---: | :--- |
| 0 | $0 < D \le 3\text{ mm}$ | $(0, 3]$ | Up to 3 mm |
| 1 | $3 < D \le 6\text{ mm}$ | $(3, 6]$ | Over 3 up to 6 mm |
| 2 | $6 < D \le 10\text{ mm}$ | $(6, 10]$ | Over 6 up to 10 mm |
| 3 | $10 < D \le 18\text{ mm}$ | $(10, 18]$ | Over 10 up to 18 mm |
| 4 | $18 < D \le 30\text{ mm}$ | $(18, 30]$ | Over 18 up to 30 mm |
| 5 | $30 < D \le 50\text{ mm}$ | $(30, 50]$ | Over 30 up to 50 mm |
| 6 | $50 < D \le 80\text{ mm}$ | $(50, 80]$ | Over 50 up to 80 mm |
| 7 | $80 < D \le 120\text{ mm}$ | $(80, 120]$ | Over 80 up to 120 mm |
| 8 | $120 < D \le 180\text{ mm}$ | $(120, 180]$ | Over 120 up to 180 mm |
| 9 | $180 < D \le 250\text{ mm}$ | $(180, 250]$ | Over 180 up to 250 mm |
| 10 | $250 < D \le 315\text{ mm}$ | $(250, 315]$ | Over 250 up to 315 mm |
| 11 | $315 < D \le 400\text{ mm}$ | $(315, 400]$ | Over 315 up to 400 mm |
| 12 | $400 < D \le 500\text{ mm}$ | $(400, 500]$ | Over 400 up to 500 mm |

> [!IMPORTANT]
> Diameters exceeding 500 mm (up to 3150 mm) are intentionally marked **unsupported** in this release rather than extrapolated, ensuring that unverified values are never generated.

---

### 2.2 Standard Tolerance Grades ($IT$)
Tabulated values (in micrometers, $\mu\text{m}$) per ISO 286-1:2010 Table 1:

| Step | Range (mm) | IT5 | IT6 | IT7 | IT8 | IT9 | IT10 | IT11 |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 0 | $\le 3$ | 4 | 6 | 10 | 14 | 25 | 40 | 60 |
| 1 | $3 < D \le 6$ | 5 | 8 | 12 | 18 | 30 | 48 | 75 |
| 2 | $6 < D \le 10$ | 6 | 9 | 15 | 22 | 36 | 58 | 90 |
| 3 | $10 < D \le 18$ | 8 | 11 | 18 | 27 | 43 | 70 | 110 |
| 4 | $18 < D \le 30$ | 9 | 13 | 21 | 33 | 52 | 84 | 130 |
| 5 | $30 < D \le 50$ | 11 | 16 | 25 | 39 | 62 | 100 | 160 |
| 6 | $50 < D \le 80$ | 13 | 19 | 30 | 46 | 74 | 120 | 190 |
| 7 | $80 < D \le 120$ | 15 | 22 | 35 | 54 | 87 | 140 | 220 |
| 8 | $120 < D \le 180$ | 18 | 25 | 40 | 63 | 100 | 160 | 250 |
| 9 | $180 < D \le 250$ | 20 | 29 | 46 | 72 | 115 | 185 | 290 |
| 10 | $250 < D \le 315$ | 23 | 32 | 52 | 81 | 130 | 210 | 320 |
| 11 | $315 < D \le 400$ | 25 | 36 | 57 | 89 | 140 | 230 | 360 |
| 12 | $400 < D \le 500$ | 27 | 40 | 63 | 97 | 155 | 250 | 400 |

---

### 2.3 Limit Deviations and Dimensions

#### Hole Calculations (Hole-Basis System):
For standard basic hole class **H**:
- Lower deviation: $EI = 0\text{ }\mu\text{m}$
- Upper deviation: $ES = +IT_n\text{ }\mu\text{m}$
- Minimum hole size: $D_{\min} = D_{\text{nominal}} + \frac{EI}{1000}\text{ mm} = D_{\text{nominal}}$
- Maximum hole size: $D_{\max} = D_{\text{nominal}} + \frac{ES}{1000}\text{ mm}$

For symmetrical hole class **JS**:
- $ES = +\frac{IT_n}{2}\text{ }\mu\text{m}, \quad EI = -\frac{IT_n}{2}\text{ }\mu\text{m}$

#### Shaft Calculations:
For clearance shafts with negative fundamental upper deviation $es$ (e.g. $g, f, e, d$):
- $es = \text{tabulated fundamental deviation} \le 0$
- $ei = es - IT_n$
- $d_{\max} = D_{\text{nominal}} + \frac{es}{1000}\text{ mm}, \quad d_{\min} = D_{\text{nominal}} + \frac{ei}{1000}\text{ mm}$

For basic shaft **h**:
- $es = 0\text{ }\mu\text{m}, \quad ei = -IT_n\text{ }\mu\text{m}$

For transition / interference shafts with positive lower deviation $ei$ (e.g. $k, m, n, p, r, s$):
- $ei = \text{tabulated fundamental deviation} \ge 0$
- $es = ei + IT_n$
- $d_{\min} = D_{\text{nominal}} + \frac{ei}{1000}\text{ mm}, \quad d_{\max} = D_{\text{nominal}} + \frac{es}{1000}\text{ mm}$

---

### 2.4 Fit Classification Criteria

Let:
$$\text{Minimum Clearance } C_{\min} = D_{\min} - d_{\max}$$
$$\text{Maximum Clearance } C_{\max} = D_{\max} - d_{\min}$$
$$\text{Minimum Interference } I_{\min} = d_{\min} - D_{\max} = -C_{\max}$$
$$\text{Maximum Interference } I_{\max} = d_{\max} - D_{\min} = -C_{\min}$$

Deterministic Classification:
1. **Clearance Fit**: $C_{\min} \ge 0$ ($D_{\min} \ge d_{\max}$). The shaft is always smaller than the hole.
2. **Interference Fit**: $I_{\min} \ge 0$ ($d_{\min} \ge D_{\max}$, or $C_{\max} \le 0$). The shaft is always larger than the hole.
3. **Transition Fit**: $C_{\max} > 0$ and $I_{\max} > 0$. Assembly may result in either a small clearance or a small interference depending on part lot variations.

---

## 3. 1D Dimensional Stack-Up Formulation

### 3.1 Linear Vector Assembly
For a 1D chain of $N$ component dimensions $x_i$ with upper tolerance $t_{i,\text{upper}}$ and lower tolerance $t_{i,\text{lower}}$:
$$x_{i,\max} = x_i + t_{i,\text{upper}}, \quad x_{i,\min} = x_i + t_{i,\text{lower}}$$
$$\text{Individual Tolerance Band } T_i = |t_{i,\text{upper}} - t_{i,\text{lower}}|$$

The assembly vector direction $d_i \in \{+1, -1\}$ indicates whether increasing component $i$ enlarges ($+1$) or closes ($-1$) the assembly gap:
$$X_{\text{nominal}} = \sum_{i=1}^N d_i \cdot x_i$$

### 3.2 Worst-Case (Arithmetic) Method
Provides 100% deterministic physical assembly limits:
$$X_{\max} = \sum_{d_i = +1} x_{i,\max} - \sum_{d_i = -1} x_{i,\min}$$
$$X_{\min} = \sum_{d_i = +1} x_{i,\min} - \sum_{d_i = -1} x_{i,\max}$$
$$\text{Total Worst-Case Variation } T_{\text{wc}} = X_{\max} - X_{\min} = \sum_{i=1}^N T_i$$

**Worst-Case Contribution Factor:**
$$\text{Contr}_{i,\text{wc}} = \frac{T_i}{T_{\text{wc}}} \times 100\%$$

### 3.3 Statistical Root-Sum-Square (RSS) Method
Under the assumption that component variations are independent, normally distributed, and centered at nominal ($\pm 3\sigma$, $C_p \ge 1.0$):
$$\text{RSS Variation } T_{\text{rss}} = \sqrt{\sum_{i=1}^N T_i^2}$$
$$X_{\text{rss},\max} = X_{\text{nominal}} + \frac{T_{\text{rss}}}{2}, \quad X_{\text{rss},\min} = X_{\text{nominal}} - \frac{T_{\text{rss}}}{2}$$

**RSS Variance Contribution:**
$$\text{VarianceContr}_{i,\text{rss}} = \frac{T_i^2}{\sum_{j=1}^N T_j^2} \times 100\%$$

> [!WARNING]
> Statistical RSS is a probabilistic estimate predicting ~99.73% assembly yield under ideal centering. It is **NOT** a guaranteed physical bound. For mission-critical zero-defect assemblies, Worst-Case arithmetic limits must govern.

---

## 4. Manufacturing & Assembly Guidance Reference

| Fit | Category | Typical Application | Recommended Assembly Method |
| :--- | :--- | :--- | :--- |
| **H7/h6** | Clearance | Spigots, removable couplings, precise location without play | Hand assembly without tools; slides smoothly at 20°C |
| **H7/g6** | Clearance | Precision running fit with thin lubricant film, idler gears | Slides easily by hand; requires clean oil lubrication |
| **H7/f7** | Clearance | Journal bearings, shaft bushings under moderate speeds | Assembles freely by hand; provides running lubricant pocket |
| **H8/f7** | Clearance | General industrial gearbox shafts, pump sleeves | Free hand assembly; cost-effective commercial tolerances |
| **H8/e8** | Clearance | High-temperature conveyors, long shafts subject to thermal expansion | Loose assembly; large radial clearance prevents seizure |
| **H7/js6** | Transition | Precision locating dowel pins, accurate alignment sleeves | Hand pressure or light tapping with soft-face mallet |
| **H7/k6** | Transition | Keyed gears and pulleys under reversing torque | Firm tapping with mallet or light arbor press; disassemblable |
| **H7/m6** | Transition | Rolling bearing inner rings on rotating shafts under light loads | Mechanical arbor press or heating inner ring to 60°C–80°C |
| **H7/n6** | Transition | Heavy vibratory shafts, tight permanent transmission fits | Steady mechanical or hydraulic press; semi-permanent |
| **H7/p6** | Interference | Light press fit, keyless bushings under light torque | Hydraulic press or heating hub to 100°C–120°C |
| **H7/r6** | Interference | Medium press fit for steel and cast iron gear hubs | Induction heating (150°C–180°C) or heavy hydraulic ram |
| **H7/s6** | Interference | Heavy permanent shrink fit, keyless high-torque couplings | Thermal shrink fit (heating hub 250°C+ and/or freezing shaft) |
