# Stage 07: Stress Concentrations, Notch Sensitivity & Dynamic Fatigue S–N Curves Report

## 1. Executive Summary & Verification Overview

Stage 07 of the 12-stage development program has successfully implemented and independently verified an engineering-grade **Stress Concentration**, **Notch Sensitivity**, and **Dynamic Fatigue S–N Engine** for the Quantum AI Mechanical Engineering Design Copilot.

All requirements were accomplished while preserving:
- All source files, Stages 01–06 deliverables, and previous reports.
- The development database (`data/mech-copilot.db`), with verified SQLite integrity (`ok`).
- The full automated test suite, expanding from 122 tests to **144 / 144 passing tests (100%)**.
- Clean production builds (`tsc && vite build`) completing with Exit Code 0 in 17.35s.

---

## 2. Deliverables & Technical Changes

### A. Data Models & Public API (`src/engineering/fatigue/types.ts`, `src/engineering/fatigue/index.ts`)
- Defined strict TypeScript interfaces for:
  - `LoadingMode`: `'bending'`, `'torsion'`, `'axial'`, `'combined'`.
  - `NotchType`: `'stepped_shoulder_fillet'`, `'profile_keyway'`, `'sled_runner_keyway'`.
  - `SteppedShaftFilletGeometry` & `KeywayGeometry`: Small diameter $d$, large diameter $D$, fillet radius $r$, keyway corner radius $r_k$, carrying provenance for every input (`imported`, `user-entered`, `calculated`, `assumed`).
  - `StressConcentrationResult`: $K_t, K_{ts}$, domain validity flags, out-of-range diagnostics, and source references.
  - `NotchSensitivityResult`: $q, q_s, K_f, K_{fs}$, Peterson constant $a$, and limiting-case notes.
  - `MaterialFatigueData`: Condition-specific tensile strength, yield strength, endurance limit, plateau indicator, Basquin parameters $A$ and $b$, and experimental S-N points.
  - `MarinFactors`: Surface finish $k_a$, size $k_b$, loading $k_c$, temperature $k_d$, reliability $k_e$, and fully corrected endurance limit $S_e$.
  - `FatigueEvaluationResult`: Alternating/mean stresses, stress ratio $R$, criteria comparisons (Goodman, Gerber, Soderberg, ASME), fatigue safety factor $n_f$, static yield margin $n_y$, life cycles $N$, and service hours.

### B. Stress Concentration Engine (`src/engineering/fatigue/stressConcentration.ts`)
- Implemented Peterson (4th Ed., 2020) and Shigley (11th Ed., 2020) formulations:
  - Stepped shaft in bending: $K_t = A(r/d)^b$ (Table A-15-9).
  - Stepped shaft in torsion: $K_{ts} = A_s(r/d)^{b_s}$ (Table A-15-8).
  - Keyways: Profile end-milled ($K_t = 2.14, K_{ts} = 3.00$) vs sled-runner ($K_t = 1.70, K_{ts} = 2.40$).
  - Enforced strict domain boundary checks ($1.01 \le D/d \le 3.0, 0.02 \le r/d \le 0.30$), rejecting non-physical or out-of-domain inputs without silent extrapolation.

### C. Notch Sensitivity Engine (`src/engineering/fatigue/notchSensitivity.ts`)
- Implemented Peterson's notch sensitivity relationship:
  $$q = \frac{1}{1 + a / r}, \quad q_s = \frac{1}{1 + 0.6a / r}$$
  $$K_f = 1 + q(K_t - 1), \quad K_{fs} = 1 + q_s(K_{ts} - 1)$$
  - Evaluates Peterson constant $a$ separately for steels ($a = 0.0254(2070/S_{ut})^{1.8}$) and aluminum alloys ($a = 0.0254(345/S_{ut})^2$).
  - Validates limiting cases: as $r \to \infty, q \to 1 \implies K_f \to K_t$; when $K_t = 1, K_f = 1$.
  - Enforces the prevention of double-counting: $K_f$ is applied to cyclic alternating stress amplitude ($\sigma_a = K_f \sigma_{a0}$); $K_t$ and $K_f$ are never multiplied together.

### D. Material Fatigue Intelligence & S–N Curve Fitting (`src/engineering/fatigue/fatigueData.ts`)
- Configured verified condition-specific fatigue properties for all 10 materials.
- Preserved fundamental metallurgical reality:
  - Ferrous steels (AISI 4140, AISI 1045, AISI 4340, SS 304, SS 316) exhibit an endurance plateau at $\approx 10^6$ cycles ($S'_e = 0.5 S_{ut}$).
  - Aluminum alloys (6061-T6, 7075-T6) do NOT exhibit an endurance plateau; fatigue threshold is specified at $5 \times 10^8$ cycles.
- Basquin power-law engine ($S_a = A N^b$):
  - Linear regression on $\log_{10}(N)$ vs $\log_{10}(S_a)$ with $R^2$ validation.
  - Rejection of degenerate or invalid datasets ($< 2$ points, non-positive cycles).

### E. Marin Endurance Modification Factors (`src/engineering/fatigue/marinFactors.ts`)
- Computes surface factor $k_a$ (Ground, Machined, Hot-rolled, As-forged).
- Computes size factor $k_b$ for rotating shafts up to $254\text{ mm}$.
- Computes loading factor $k_c$ (Bending 1.0, Axial 0.85, Torsion 0.59, Combined 1.0).
- Computes temperature factor $k_d$ ($T \le 450^\circ\text{C}$).
- Computes reliability factor $k_e$ (50% to 99.99%).

### F. Cyclic Stress & Mean-Stress Criteria (`src/engineering/fatigue/fatigueEvaluation.ts`)
- Evaluates Modified Goodman, Gerber, Soderberg, and ASME Elliptic criteria.
- Computes first-cycle static yield factor of safety ($n_y = S_y / \sigma_{\text{max,unrelaxed}}$) to detect gross yielding before cyclic life is reached.
- Accurately accounts for compressive mean stress ($\sigma_m \le 0$) as non-damaging ($n_f = S_e / \sigma_a$).
- Evaluates finite life cycles $N$ via Basquin model and operating hours at design RPM.
- Flags Low-Cycle Fatigue (LCF) out of domain when $N < 1000$ cycles.

### G. Standards Registry Follow-Up & Updates (`src/standards/registry.ts`)
- **ISO 5459 Follow-Up**: Resolved discrepancy noted in prompt; updated ISO 5459:2011 status to `historical` (superseded by ISO 5459:2024), and registered `iso-5459-2024` as `active`.
- **ISO 1099:2017**: Registered axial fatigue testing standard with explicit limitation that it covers specimen testing, not whole-component qualification.
- **ISO 12107:2012**: Registered statistical S-N regression and Basquin fitting standard.
- **ASTM E466-21**: Registered force-controlled constant amplitude axial fatigue testing.
- **ASTM E739**: Recorded publication status as `withdrawn` (May 2024) without replacement.

### H. Interactive S–N Fatigue Workstation UI (`src/pages/FatiguePage.tsx`)
- Dimensioned technical SVG schematic of stepped shaft and notch root.
- Real-time parameter extraction from active project design parameters.
- Recharts log-log S–N plot displaying specimen curve, component derated curve, endurance limit line, and operating design point.
- Interactive controls for geometry, surface finish, reliability, and mean-stress criteria.
- JSON engineering report export.
- Integrated into `App.tsx`, `Sidebar.tsx` (shortcut `7`), and `CommandPalette.tsx` (shortcut `G F`).

---

## 3. Automated Test Verification Matrix

All 144 tests across the entire repository pass with zero failures:

| Test Suite | File | Tests Passing | Duration |
| :--- | :--- | :--- | :--- |
| **Engineering Core** | `src/engineering/__tests__/engineering.test.ts` | 13 / 13 | ~120ms |
| **Stage 03 Verification** | `src/engineering/__tests__/verification.test.ts` | 7 / 7 | ~50ms |
| **Standards Registry** | `src/standards/__tests__/standards.test.ts` | 8 / 8 | ~25ms |
| **Materials & Constraints** | `src/engineering/__tests__/materials_constraints.test.ts` | 9 / 9 | ~15ms |
| **Tolerances & Fits (Stage 05)**| `src/engineering/__tests__/tolerances_fits.test.ts` | 18 / 18 | ~26ms |
| **GD&T Integration (Stage 06)**| `src/engineering/__tests__/gdt.test.ts` | 18 / 18 | ~28ms |
| **Stress Concentrations & Fatigue (Stage 07)**| `src/engineering/__tests__/stress_concentration_fatigue.test.ts` | **22 / 22** | ~25ms |
| **Server & Database APIs** | `server/__tests__/*.test.ts` (6 suites) | 41 / 41 | ~2.6s |
| **Frontend API Clients** | `src/services/__tests__/*.test.ts` (2 suites)| 8 / 8 | ~470ms |
| **Total Test Suite** | **13 Suites** | **144 / 144** | **~3.4s** |

---

## 4. Production Build & Database Integrity Verification

1. **Vite Production Build**:
   ```
   vite v6.4.3 building for production...
   transforming...
   ✓ 2277 modules transformed.
   rendering chunks...
   computing gzip size...
   dist/index.html                     0.72 kB │ gzip:   0.41 kB
   dist/assets/index-COv0ZzhA.css     53.55 kB │ gzip:   9.80 kB
   dist/assets/index-BUwz8eR-.js   1,607.40 kB │ gzip: 347.20 kB
   ✓ built in 17.35s
   ```
   **Result: Exit Code 0**.

2. **SQLite Integrity Check**:
   ```
   PRAGMA integrity_check: { integrity_check: 'ok' }
   ```
   **Result: Verified 'ok'**.

3. **Database Backup**:
   - Preserved `data/mech-copilot.backup-stage7-2026-10-18T13-29-21-975Z.db`.

---

## 5. Conclusion & Transition to Stage 08

Stage 07 is fully implemented, verified, and integrated into the Mechanical Engineering Design Copilot. The application now provides a bounded, defensible stress-life (S-N) fatigue workflow with traceable theoretical stress concentrations, notch sensitivity, and mean-stress correction.

Execution halts here per stage instructions. Ready to proceed to **Stage 08: Bearings, Bearing Reactions & Dynamic L10 Rating Life** when requested.
