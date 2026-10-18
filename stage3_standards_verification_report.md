# QUANTUM AI // Mechanical Engineering Design Copilot
# Stage 03 of 12: Standards Registry, Formula Verification & Calculation Transparency Report

**Date:** 2026-10-18  
**Roles:** Principal Mechanical Engineer, Engineering Verification Lead, Software Architect, and Standards Research Engineer  
**Repository:** `c:\Users\Pc\.gemini\antigravity\scratch\mech-copilot`  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

Stage 03 established an independently verified mathematical foundation and a typed, traceable engineering standards registry for the Quantum AI Mechanical Engineering Design Copilot.

All stage requirements and safety non-negotiables were satisfied:
1. **Preserved Existing Codebase & Data:** The development SQLite database (`data/mech-copilot.db`), Stage 2 baseline backup (`data/mech-copilot.backup-pristine.db`), and all uncommitted UI modernization files were preserved intact. Database integrity check passed `ok`.
2. **Formula Audit & Mathematical Verification:** Verified closed-form analytical equations for torsion, bending, combined multiaxial plane stress (Von Mises and Tresca criteria), midspan beam deflection, support slope, and rotational power transmission against recognized mechanical engineering references.
3. **Standards Registry (`src/standards/`):** Created a typed registry containing 8 standards with rigorous distinction between publication status (active/withdrawn) and software implementation verification (verified/draft/unverified).
4. **Correction of Misleading Standards References:** Removed false citations of ISO 10816 as a shaft sizing/stress standard. Documented ISO 10816 definitively as an operational vibration severity standard for non-rotating housings. Removed claims of certified PE stamps, certified report generators, and certified tolerances.
5. **Deterministic Behavior:** Replaced simulated `setTimeout` delays in `runAnalysis` and `ReportsPage` with instantaneous, deterministic calculation execution. Replaced static canned calculation explanations with dynamic analytical derivations evaluated from active parameters and material properties.
6. **Workstation Integration:** Created `StandardsRegistryView.tsx` and integrated a view tab switcher (`[Equations (5)] | [Standards Registry (8)]`) directly into `CalculationsPage.tsx`, along with links from `ReportsPage.tsx` and a dedicated command in `CommandPalette.tsx` (`G S`).
7. **Verification & Build Success:** Automated test suite expanded from 69 to **83 passing tests (100% pass rate)**. TypeScript validation and Vite production build completed with exit code 0.

---

## 2. Mathematical Audit & Benchmark Calculations

Governing formulas were verified against classical solid mechanics and machine design textbooks (*Shigley's Mechanical Engineering Design*, 11th Ed.; *Roark's Formulas for Stress and Strain*, 8th Ed.; *Gere & Goodno Mechanics of Materials*, 9th Ed.).

### Benchmark Scenario
- Geometry: Solid circular shaft, $d = 45\text{ mm}$, span $L = 320\text{ mm}$
- Applied Loads: Torque $T = 500\text{ N}\cdot\text{m}$, Central Transverse Force $F = 12,000\text{ N}$, Speed $n = 1450\text{ RPM}$
- Material: AISI 4140 Alloy Steel ($S_y = 655\text{ MPa}$, $S_{ut} = 1020\text{ MPa}$, $E = 205\text{ GPa}$)
- Target Safety Factor: $n_{\text{target}} = 2.0$

| Calculation | Governing Equation | Analytical Value | Software Output | Verification Status |
|---|---|---|---|---|
| **Polar Moment of Inertia** | $J = \frac{\pi d^4}{32}$ | $4.0257 \times 10^{-7}\text{ m}^4$ ($402,572\text{ mm}^4$) | $402,572.4\text{ mm}^4$ | **VERIFIED** |
| **Polar Section Modulus** | $Z_p = \frac{\pi d^3}{16}$ | $1.7892 \times 10^{-5}\text{ m}^3$ ($17,892.4\text{ mm}^3$) | $17,892.4\text{ mm}^3$ | **VERIFIED** |
| **Torsional Shear Stress** | $\tau = \frac{16T}{\pi d^3}$ | $27.94\text{ MPa}$ | $27.94\text{ MPa}$ | **VERIFIED** |
| **Allowable Shear Stress (Tresca)** | $\tau_{\text{allow}} = \frac{S_y}{2n}$ | $163.75\text{ MPa}$ | $163.75\text{ MPa}$ | **VERIFIED** |
| **Min. Diameter for Pure Torsion** | $d_{\min} = \left[\frac{16T}{\pi \tau_{\text{allow}}}\right]^{1/3}$ | **$24.96\text{ mm}$** *(corrected prototype typo of 42.27 mm)* | **$24.96\text{ mm}$** | **VERIFIED & CORRECTED** |
| **Bending Moment** | $M_{\max} = \frac{F \cdot L}{4}$ | $960.0\text{ N}\cdot\text{m}$ | $960.0\text{ N}\cdot\text{m}$ | **VERIFIED** |
| **Area Moment of Inertia** | $I = \frac{\pi d^4}{64}$ | $2.0129 \times 10^{-7}\text{ m}^4$ ($201,286\text{ mm}^4$) | $201,286.2\text{ mm}^4$ | **VERIFIED** |
| **Elastic Section Modulus** | $Z = \frac{\pi d^3}{32}$ | $8.9462 \times 10^{-6}\text{ m}^3$ ($8,946.2\text{ mm}^3$) | $8,946.2\text{ mm}^3$ | **VERIFIED** |
| **Bending Stress** | $\sigma_b = \frac{32M}{\pi d^3}$ | $107.31\text{ MPa}$ | $107.31\text{ MPa}$ | **VERIFIED** |
| **Von Mises Equivalent Stress** | $\sigma_{\text{VM}} = \sqrt{\sigma_b^2 + 3\tau^2}$ | $117.72\text{ MPa}$ | $117.72\text{ MPa}$ | **VERIFIED** |
| **Tresca Equivalent Stress** | $\sigma_{\text{Tresca}} = \sqrt{\sigma_b^2 + 4\tau^2}$ | $120.99\text{ MPa}$ | $120.99\text{ MPa}$ | **VERIFIED** |
| **Von Mises Factor of Safety** | $\text{FoS} = \frac{S_y}{\sigma_{\text{VM}}}$ | $5.56$ | $5.56$ | **VERIFIED** |
| **Tresca Factor of Safety** | $\text{FoS} = \frac{S_y}{\sigma_{\text{Tresca}}}$ | $5.41$ | $5.41$ | **VERIFIED** |
| **Midspan Deflection** | $\delta_{\max} = \frac{FL^3}{48EI}$ | $0.1985\text{ mm}$ | $0.1985\text{ mm}$ | **VERIFIED** |
| **Support Slope** | $\theta = \frac{FL^2}{16EI}$ | $0.00186\text{ rad}$ ($0.107^{\circ}$) | $0.00186\text{ rad}$ | **VERIFIED** |
| **Angular Velocity** | $\omega = \frac{2\pi n}{60}$ | $151.84\text{ rad/s}$ | $151.84\text{ rad/s}$ | **VERIFIED** |
| **Transmitted Power** | $P = T \cdot \omega$ | $75.92\text{ kW}$ ($101.81\text{ hp}$) | $75.92\text{ kW}$ ($101.81\text{ hp}$) | **VERIFIED** |

---

## 3. Standards Registry Inventory

The standards registry is implemented in `src/standards/registry.ts` and exports `EngineeringStandardRecord` entries with validated schema fields:

```ts
export type VerificationStatus = 'verified' | 'draft' | 'unverified';
```

### Registry Records
1. **SOLID-MECH-REF (Classical Solid Mechanics Core)**
   - Organization: ASME / Academic Reference Consensus
   - Status: Active
   - Verification: **Verified**
   - Scope: Closed-form equations for torsion, bending, combined multiaxial stress, beam deflection, and power transmission.
2. **ASTM A29/A29M-20**
   - Organization: ASTM
   - Status: Active
   - Verification: **Verified**
   - Scope: Hot-wrought carbon and alloy steel bar specifications and chemical composition baselines for AISI 1045, 4140, 4340.
3. **ASME B106.1M-1985 (R1991)**
   - Organization: ASME
   - Status: **Withdrawn (1994)**
   - Verification: **Draft**
   - Scope: Design of transmission shafting with empirical shock and fatigue factors ($C_m, C_t$).
   - Limitation: Officially withdrawn without direct replacement; software implements static Von Mises / Tresca criteria and simplified S-N endurance.
4. **DIN 6885-1:1993-10**
   - Organization: DIN
   - Status: Active
   - Verification: **Unverified (Reference Only)**
   - Scope: Parallel keys and keyway dimensions ($14\times 9\text{ mm}$ key for 44–50 mm shafts). Keyway stress concentration calculations deferred to Stage 07.
5. **ISO 281:2007**
   - Organization: ISO
   - Status: Active
   - Verification: **Unverified (Reference Only)**
   - Scope: Dynamic load rating and basic rating life ($L_{10}$) for rolling bearings. Bearing life calculations deferred to Stage 08.
6. **ISO 286-1:2010 & ISO 286-2:2010**
   - Organization: ISO
   - Status: Active
   - Verification: **Unverified (Reference Only)**
   - Scope: Limits and fits system and tolerance tables (e.g. $h6, k6$). Tolerance deviations deferred to Stage 06.
7. **ISO 10816-1:1995**
   - Organization: ISO
   - Status: **Withdrawn (Superseded by ISO 20816)**
   - Verification: **Unverified (Informational Clarification)**
   - Scope: Evaluation of broadband vibration severity on non-rotating machine bearing housings.
   - **Critical Clarification:** Explicitly notes that this standard governs operational vibration monitoring of bearing housings, NOT shaft structural strength, bending stress, or deflection sizing.

---

## 4. Corrections & Transparency Improvements

1. **Misleading ISO 10816 Citations:**
   - In `src/pages/ReportsPage.tsx`, removed headers claiming "DIN EN ISO 10816-1" and "formal ISO 10816 calculation sheets".
   - In `src/pages/CalculationsPage.tsx`, replaced `<span>ISO 10816 / ASME B106.1M Benchmark Core</span>` with a direct interactive link to the Standards Registry.
2. **False Certification Claims:**
   - Replaced "Certified Report Generator v2.4" with "Analytical Calculation Sheet • Classical Solid Mechanics Formulation".
   - Replaced "QUANTUM AI // MECHANICAL DESIGN CERTIFICATION" with "QUANTUM AI // MECHANICAL DESIGN VERIFICATION".
   - Updated disclaimer in Section 8 of the report to state: *"Algorithmic engineering evaluation based on classical solid mechanics and mechanics of materials formulations. This document does NOT constitute a certified Professional Engineer (PE) stamp, regulatory compliance approval, or manufacturing release."*
   - In `src/pages/AnalysisPage.tsx`, replaced "Within Certified Tolerances" with "Within Allowable Design Limits".
   - In `src/pages/SettingsPage.tsx`, replaced "certified calculation standard" with "standard engineering unit system".
3. **Deterministic Physics & Explanations:**
   - In `src/context/AppContext.tsx`, updated `runAnalysis` to execute `computeAnalysis(designParams)` immediately and synchronously, removing `await new Promise((r) => setTimeout(r, 800))`.
   - In `src/context/AppContext.tsx`, updated `explainCalculation` to call `generateCalculationExplanation(designParams, selectedMaterial)`, generating a dynamic step-by-step mathematical proof evaluated from active telemetry.
   - In `src/pages/ReportsPage.tsx`, updated `handleGenerate` to render the report immediately without simulated progress bar timers.

---

## 5. User Interface Integration

1. **`StandardsRegistryView.tsx` Component:**
   - Search bar filtering across standard code, organization, title, and scope.
   - Organization filter pills (`ALL`, `ASME`, `ISO`, `DIN`, `ASTM`).
   - Verification filter pills (`ALL`, `Verified In Software`, `Reference Only`).
   - Stat metric badges (Total Standards: 8, Verified Core: 2, Reference Only: 5).
   - High-contrast visual differentiation: verified standards receive teal border accents and checkmark badges; reference-only standards receive neutral border styling and warning badges.
   - Inspection modal showing full code, title, edition, publication status, engineering scope, supported calculations, governing physical assumptions, explicit limitations, and primary references.
2. **Sub-View Tab in `CalculationsPage.tsx`:**
   - Segmented control in CAD station header: `[Equations (5)] | [Standards Registry (8)]`.
   - Bottom disclaimer button allows one-click switching to the standards registry from the active calculation cards.
3. **Cross-Page Accessibility:**
   - Added direct inspection button in `ReportsPage.tsx` Section 8.
   - Added `G S` navigation shortcut in `CommandPalette.tsx` ("Standards Registry & Verification").

---

## 6. Automated Test Suite & Build Verification

Executed `npm test` across all suites:
```text
> mech-copilot@0.1.0 test
> npm run test:engineering && npm run test:server && npm run test:frontend

▶ test:engineering (34 tests)
  ✔ Engineering Unit Conversions (5 tests)
  ✔ Input Validation & Safeguards (3 tests)
  ✔ Torsional Stress (Textbook Verification) (2 tests)
  ✔ Bending Stress (Textbook Verification) (1 test)
  ✔ Combined Stress: Von Mises vs Tresca Criteria (2 tests)
  ✔ Shaft Deflection (Simply Supported Central Point Load) (2 tests)
  ✔ Power Transmission (1 test)
  ✔ Safety Factor Calculation (1 test)
  ✔ Composite Shaft Analysis & Copilot Tools (3 tests)
  ▶ Stage 03 Independent Formula Verification & Benchmark Cases (7 tests)
    ✔ Benchmark A: Solid circular shaft pure torsion formula & units
    ✔ Benchmark B: Solid circular shaft simply supported bending moment & normal stress
    ✔ Benchmark C: Combined Multiaxial Stress (Von Mises vs Tresca)
    ✔ Benchmark D: Beam midspan deflection and support slope
    ✔ Benchmark E: Power transmission, angular velocity, and horsepower conversion
    ✔ Benchmark F: Factor of safety deliberately handles zero, negative, and infinite stress
    ✔ Benchmark G: Deterministic explanation generator dynamically reflects active parameters
  ▶ Standards Registry Integrity & Traceability Tests (7 tests)
    ✔ every standard record has valid schema fields and substantiated references
    ✔ ASME B106.1M publication status is accurately recorded as withdrawn
    ✔ ISO 10816 explicitly documents vibration evaluation scope and not shaft sizing
    ✔ reference-only standards (ISO 281, ISO 286, DIN 6885) are marked unverified
    ✔ classical solid mechanics core is verified and backs key analytical calculations
    ✔ filtering functions accurately partition registry records
    ✔ no standards record makes false certification or manufacturing approval claims
  PASS: 34 / 34 (291ms)

▶ test:server (41 tests)
  ✔ AI Engineering Tools (4 tests)
  ✔ Backend API & Health (4 tests)
  ✔ Offline Chat 7 Prompt Suite (7 tests)
  ✔ Database Persistence Layer (9 tests)
  ✔ LLM Integration (Mocked API) (3 tests)
  ✔ SQLite Migration System (5 tests)
  ✔ Design Versions Persistence & API Tests (9 tests)
  PASS: 41 / 41 (1.44s)

▶ test:frontend (8 tests)
  ✔ Frontend chatApi tests (4 tests)
  ✔ Frontend Version API Service Tests (4 tests)
  PASS: 8 / 8 (229ms)

TOTAL: 83 / 83 PASS (100% pass rate)
```

Executed `npm run build` (`tsc && vite build`):
- TypeScript: Zero errors.
- Vite build: Bundle completed in 6.89s with exit code 0.

---

## 7. Modified & Created Files Summary

### Files Created
1. `src/standards/types.ts` — TypeScript definitions for standards records, organizations, and filters.
2. `src/standards/registry.ts` — Comprehensive standards registry containing 8 verified, draft, and reference standards.
3. `src/standards/index.ts` — Barrel export for the standards module.
4. `src/components/StandardsRegistryView.tsx` — Technical UI component for searching, filtering, and inspecting standards records.
5. `src/engineering/calculations/explanation.ts` — Dynamic, deterministic engineering explanation generator.
6. `src/standards/__tests__/standards.test.ts` — Automated standards registry schema and integrity test suite (7 tests).
7. `src/engineering/__tests__/verification.test.ts` — Independent mathematical benchmark verification test suite (7 tests).
8. `docs/engineering-verification.md` — Formal engineering verification dossier and mathematical derivations.
9. `stage3_standards_verification_report.md` — This comprehensive release report.

### Files Modified
1. `src/engineering/calculations/index.ts` — Re-exported `explanation.ts`.
2. `src/context/AppContext.tsx` — Replaced simulated `setTimeout` delays in `runAnalysis` and connected `explainCalculation` to `generateCalculationExplanation`; added `calculationsTab` state and `navigateToStandards`.
3. `src/pages/CalculationsPage.tsx` — Added sub-view tab switcher for Equations vs Standards Registry; replaced ISO 10816 banner with link to Standards Registry.
4. `src/pages/ReportsPage.tsx` — Removed ISO 10816 citations and false certification claims; added Standards Registry link and instant generation.
5. `src/pages/AnalysisPage.tsx` — Replaced "Certified Tolerances" with "Allowable Design Limits".
6. `src/pages/SettingsPage.tsx` — Replaced "certified" claims with "standard engineering" and "verified".
7. `src/components/CommandPalette.tsx` — Added `G S` command to navigate to the Standards Registry.
8. `server/services/versionService.ts` — Added secondary `rowid DESC` sort order for deterministic listing when timestamps match in unit tests.
9. `package.json` — Updated `test:engineering` script to execute verification and standards tests in CI.

---

## 8. Conclusion & Readiness

Stage 03 is complete. The application now possesses a transparent, independently verified mathematical kernel and an immutable, traceable standards registry with zero simulated delays or misleading certification claims. The codebase is verified, stable, and ready to proceed to **Stage 04 of 12**.
