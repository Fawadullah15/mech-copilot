# QUANTUM AI // MECHANICAL ENGINEERING DESIGN COPILOT
# Stage 1: Full System Audit and Product Completion Plan

**Document ID:** QA-ME-AUDIT-2026-001  
**Program:** 12-Stage Mechanical Engineering Product Development Program  
**Stage:** 01 of 12 (Audit & Roadmap)  
**Date:** October 18, 2026  
**Auditor Roles:** Principal Software Architect, Senior Mechanical Software Engineer, CAD Systems Engineer, Verification Lead  
**Target Repository:** `c:\Users\Pc\.gemini\antigravity\scratch\mech-copilot`  

---

## Executive Overview

This audit establishes a factual baseline of the Quantum AI Mechanical Engineering Design Copilot. It inspects the real code, dependencies, calculation modules, user workflows, persistence layer, and visual interfaces. 

The software has a functional core: deterministic closed-form calculations for solid circular shafts, an offline rule-based AI Copilot, SQLite persistence, Recharts-based stress plots, and an SVG orthographic drafting workstation. However, significant product gaps exist between the current prototype state and an industrial-grade mechanical design tool. 

Key findings:
1. **2D vs 3D:** The current workstation is strictly a 2D SVG canvas. No interactive 3D WebGL viewport or mesh geometry exists.
2. **Simulation vs Real Execution:** Key features (document ingestion in `FileUploadModal`, optimization options in `OptimizationModal`, calculation explanations, and `runAnalysis` latency) rely on `setTimeout` delays or static preset data rather than dynamic solvers.
3. **Persistence Scope:** Design version snapshots (`designVersions`) are held in ephemeral React component state and vanish upon page reload, while projects, conversations, and messages persist in SQLite.
4. **Engineering Scope:** The calculation engine solves classical uniform shaft torsion, bending, Von Mises/Tresca multiaxial stress, and Euler-Bernoulli deflection for a single concentrated load. It lacks stepped shaft shoulders, stress concentration factors ($K_t, K_{ts}, K_f$), Marin fatigue endurance deratings, multi-load statics, ISO 281 bearing life, and critical speed dynamics.
5. **Baseline Quality:** The repository is clean: 51/51 automated tests pass, strict TypeScript compiles with 0 errors, and the production Vite bundle builds cleanly in 18.11 seconds.

---

## 1. Repository and Environment Audit

### 1.1 Source Tree & Configuration
- **Root Directory:** `c:\Users\Pc\.gemini\antigravity\scratch\mech-copilot`
- **Git Branch & Status:** Branch `master`. Uncommitted modifications exist from the recent Stage 5 UI modernization. All existing work is preserved.
- **Environment:** Node.js v22.20.3 on Windows x64.
- **Node Modules & Bundler:** Vite 6.0.7 with `@vitejs/plugin-react` 4.3.4. Fast HMR and ES module bundling.
- **Type System:** TypeScript 5.7.3 (`tsconfig.json` configured with `strict: true`, `target: ES2022`, `moduleResolution: Bundler`).

### 1.2 Frontend Architecture
- **Framework:** React 18.3.1 (`react`, `react-dom`).
- **Routing:** Single-Page Application (SPA) driven by stateful active-page switching in `AppContext.tsx` (`activePage: 'dashboard' | 'projects' | 'workspace' | 'analysis' | 'materials' | 'calculations' | 'reports' | 'settings'`).
- **Styling & Design System:** Tailwind CSS 3.4.17 configured with dark workstation tokens:
  - Canvas: `#111315`
  - Surface: `#191C1F`
  - Header / Raised: `#22262A`
  - Inset / Input: `#14171A`
  - Borders: `#34393F` / `#2A2E35`
  - Accent Cyan: `#64D6C5`
- **Icons & Graphics:** `lucide-react` 0.468.0 for technical vector iconography. Custom SVG elements for technical drafting witness lines, arrow markers, dimension callouts, and ISO title blocks.
- **Data Visualization:** `recharts` 2.15.0 for multiaxial stress area plots and fatigue S-N Wöhler curves.

### 1.3 Backend Architecture & APIs
- **Framework:** Express 5.2.1 running on port 3001 via `tsx --watch server/index.ts`.
- **API Endpoints:**
  - `GET /api/health` -> Health probe (returns `{ status: 'ok', timestamp }`).
  - `GET /api/projects` -> Lists all stored engineering projects.
  - `GET /api/projects/:id` -> Retrieves project details, parameters, and associated conversation history.
  - `POST /api/projects` -> Creates new engineering project.
  - `PUT /api/projects/:id` -> Updates project metadata and design parameters.
  - `DELETE /api/projects/:id` -> Deletes project (cascades to conversations and messages).
  - `POST /api/chat` -> AI Copilot conversational endpoint. Handles OpenAI API tool-calling when `OPENAI_API_KEY` is present; gracefully falls back to deterministic rule-based offline tools when offline or unauthenticated.
- **Middleware:** `requestLogger.ts`, `errorHandler.ts`, `cors` 2.8.6.
- **Validation:** `zod` 4.6.5 schemas validating tool arguments (`calculateRequiredShaftDiameterSchema`, `runFullShaftAnalysisSchema`) and API payloads.

### 1.4 Database & Persistence Layer
- **Engine:** Built-in Node.js `node:sqlite` (`DatabaseSync`). Zero external C++ native build dependencies.
- **Database File:** `data/mech-copilot.db` (verified size: 40,960 bytes).
- **Foreign Key Enforcement:** `PRAGMA foreign_keys = ON;`.
- **Tables:**
  - `projects`: `id`, `name`, `description`, `type`, `status`, `progress`, `lastModified`, `created`, `parameters`, `tags`.
  - `conversations`: `id`, `projectId`, `title`, `createdAt`.
  - `messages`: `id`, `conversationId`, `role`, `content`, `timestamp`, `type`, `structuredData`, `actions`, `reasoningChain`, `saved`, `engineeringResult`.
- **Safety Safeguard:** `server/db/client.ts` contains an explicit runtime safeguard: `resetDatabase()` throws an unrecoverable exception if called outside automated test mode (`NODE_ENV === 'test'` or `:memory:`), strictly preventing accidental data erasure.

---

## 2. Current Functionality Inventory

The table below provides an evidence-based inventory of all major controls, user workflows, and screens in the application:

| Feature / Control | User Expectation | Actual Implementation | Source Files | Test Evidence | Limitations / Defects | Status |
|---|---|---|---|---|---|---|
| **Navigation Rail** | Navigate between 8 core engineering modules | Sets `activePage` in `AppContext` and updates active UI view | `Sidebar.tsx` | Visual verification via Playwright | Bottom utility buttons trigger modals cleanly | **Ready** |
| **TopBar Telemetry** | View active project, sync state, export, trigger Copilot | Displays name, type, "SQLite Synced", quick-mode switcher, Copilot toggle | `TopBar.tsx` | Visual & integration tests | Export menu triggers JSON download and print | **Ready** |
| **CAD Drafting Canvas** | Interactive CAD representation of mechanical shaft | 2D SVG canvas with zoom, pan, witness lines, dimension text, ISO title block | `DesignWorkspacePage.tsx` | Visual Edge verification | Strictly 2D SVG; no 3D WebGL meshes or orbital camera | **Incomplete (2D Only)** |
| **Parameter Inspector** | Edit geometry, loads, and material; update live model | Form inputs update `designParams` in `AppContext`; SVG scales reactively | `DesignWorkspacePage.tsx` | Automated integration tests | Step shoulders, multiple spans, and keyway dimensions cannot be edited | **Ready** |
| **Docked Telemetry Strip** | Live stress, FoS, deflection, mass, power readout | Evaluates closed-form formulas inline on every parameter change | `DesignWorkspacePage.tsx` | Verified against textbook formulas | Evaluates single uniform cross-section | **Ready** |
| **Copilot Chat (Offline)** | Engineering design assistance and validation | Deterministic offline parser detects prompt intent, calls engineering tools | `CopilotPanel.tsx`, `llm.ts`, `engineeringTools.ts` | 7-prompt integration test suite | Covers only shaft sizing and composite analysis | **Ready** |
| **Copilot "Apply to Model"** | Apply Copilot-recommended diameter/material to CAD | Updates `designParams` and pushes confirmation message to thread | `EngineeringResultCard.tsx`, `AppContext.tsx` | Visual & unit tests | Only diameter and material are currently supported for auto-application | **Ready** |
| **Stress Distribution Chart** | View stress variation across shaft span | Recharts AreaChart plotting Von Mises, shear, and bending stress | `AnalysisPage.tsx`, `analysisResults.ts` | Visual Playwright test | Bending moment assumes single center load $M = FL/4$ | **Ready** |
| **Fatigue Life (S-N Curve)** | Accurate high-cycle fatigue life prediction | Recharts LineChart showing stress vs cycles with endurance line | `AnalysisPage.tsx`, `analysisResults.ts` | Visual Playwright test | Uses simplified Basquin formula without Marin factors ($k_a \dots k_e$) | **Incomplete** |
| **Engineering Calculations** | Transparent mathematical proofs with live values | Cards displaying symbolic formulas, numerical substitution, and pass/fail | `CalculationsPage.tsx` | Unit tests (`engineering.test.ts`) | Only 5 core equations displayed | **Ready** |
| **Criterion Toggle (Von Mises vs Tresca)** | Switch failure theory and compare safety margins | Updates `criterion` in state; recalculates equivalent stress and FoS | `CalculationsPage.tsx`, `combinedStress.ts` | Unit test enforces Tresca $\ge$ Von Mises | Verified mathematically | **Ready** |
| **Engineering Report Generator** | Formal calculation report with export/print | Generates ISO specification sheet preview; triggers `window.print()` | `ReportsPage.tsx` | Browser Playwright test | Titled "ISO 10816 Calculation Sheet", which is technically a vibration standard | **Incomplete (Labeling)** |
| **Materials Database** | Search, filter, and apply 10 engineering alloys | Filterable matrix with yield slider, property table, and "Apply to Model" | `MaterialsPage.tsx`, `materials.ts` | Visual Playwright test | Alloy properties are static; lacks temperature-dependent modulus/yield curves | **Ready** |
| **Design Version History** | Snapshot and restore previous engineering iterations | Creates snapshot and allows restoration to active model | `VersionHistoryDrawer.tsx`, `AppContext.tsx` | Manual UI verification | **Stored in React memory only (`useState`)! Lost on browser refresh.** | **Incomplete (Persistence)** |
| **Specification Ingestion** | Upload engineering drawings or PDF spec sheets | Shows upload modal, simulates progress, and loads preset specs | `FileUploadModal.tsx`, `engineeringRules.ts` | None | **Simulated delay (`setTimeout`); uses static preset data. No real OCR/PDF parser.** | **Placeholder** |
| **Design Optimization Modal** | Automatic multi-objective trade-off solver | Shows weight, cost, strength, and fatigue optimization cards | `OptimizationModal.tsx`, `engineeringRules.ts` | None | **Hardcoded weights and FoS in `generateOptimizationOptions`. Not computed dynamically.** | **Placeholder** |
| **Calculation Explanation** | Copilot explains engineering calculations | Appends explanation message to active thread | `AppContext.tsx` (`explainCalculation`) | None | **Inserts static mock object `explanationResponse`. Does not evaluate active inputs.** | **Placeholder** |
| **Analysis Execution** | Run deep simulation solver | Sets loading state, delays 800ms, navigates to `/analysis` | `AppContext.tsx` (`runAnalysis`) | None | **Simulated delay (`setTimeout(800)`). No asynchronous worker or background solver.** | **Placeholder** |
| **Settings: Unit System** | Switch between SI (Metric) and Imperial units | UI toggle between SI and Imperial | `SettingsPage.tsx` | None | **Visual only. Does not convert values across the application.** | **Placeholder** |

---

## 3. 3D CAD Capability Audit

### 3.1 Current Reality: 2D SVG Drafting vs 3D CAD
The current workspace (`DesignWorkspacePage.tsx`) implements a **2D SVG orthographic projection**. 
- It uses SVG `<rect>`, `<path>`, `<marker>`, and coordinate scaling.
- The "Front", "Side", and "Iso" buttons do not rotate a 3D camera. "Front" displays a 2D side cross-section, "Side" displays a circular end-face projection, and "Iso" toggles an isometric-styled 2D projection angle.
- There are no 3D vertices, faces, polygonal meshes, scene graphs, or WebGL contexts.
- `package.json` does not include Three.js, `@react-three/fiber`, or `@react-three/drei`.

### 3.2 3D Browser Architecture Feasibility
Integrating interactive 3D geometry into the existing stack is technically viable and high impact:
1. **Compatibility:** React 18.3.1 and Vite 6.0.7 support Three.js (`three` + `@types/three`) or React Three Fiber (`@react-three/fiber` + `@react-three/drei`).
2. **Performance:** A Three.js viewport rendering machine element primitives (cylinders, keyways, shoulders, bearings) incurs negligible CPU/GPU overhead (<2 MB bundle overhead when tree-shaken, 60 FPS on standard integrated GPUs).
3. **Core Features Achievable with Polygonal Mesh Geometry:**
   - Interactive orbit, pan, zoom, and fit-to-model via `OrbitControls`.
   - Dual camera modes: Perspective camera (realistic inspection) and Orthographic camera (engineering blueprint view).
   - Dynamic procedural geometry: Generating parametric stepped cylinders (`CylinderGeometry`), keyway slots (`ExtrudeGeometry` with 2D rounded path), and bearing rings based on `designParams`.
   - Material shading: PBR metallic roughness (`MeshStandardMaterial` / `MeshPhysicalMaterial`) reflecting steel, aluminum, and bronze finishes with directional studio lighting.
   - Interactive raycasting: Clicking a 3D part (shaft body, bearing, keyway, gear hub) selects the component and highlights its parameters in the inspector.
   - Coordinate gizmos and 3D dimension arrows.

### 3.3 Mesh Geometry vs True B-Rep CAD Kernel
It is critical to distinguish between a **3D Mesh Viewer** and a **Parametric B-Rep CAD Modeling Kernel**:
- **Polygonal Mesh (Three.js):**
  - Geometry is represented as triangular surface facets ($\sim 10^3 - 10^5$ triangles).
  - Ideal for browser rendering, interactive inspection, visual stress coloring (vertex color heatmaps), and lightweight STL export.
  - Cannot compute exact analytic surface intersections, true cylindrical fillets, or export standard lossless CAD exchange formats (STEP AP203/AP214, IGES).
- **Boundary Representation (B-Rep CAD Kernel):**
  - Geometry is defined mathematically by exact surfaces (NURBS, planes, cylinders, tori) bounded by topological edges and vertices.
  - Required for manufacturing-ready STEP file export, geometric dimensioning and tolerancing (GD&T), and precise CNC toolpath generation.
  - Implementation requires a compiled C++ CAD kernel compiled to WebAssembly (such as `opencascade.js` / Open CASCADE Technology) or a backend modeling microservice (Python + `pythonocc` / `cadquery` / `build123d`).
- **Audit Recommendation:**
  - **Stage 8 & 9:** Build an interactive Three.js WebGL viewport for real-time parametric mesh rendering, component raycasting, and STL export, retaining the 2D SVG canvas as an instant "Engineering Drafting Mode".
  - **Stage 11:** Implement backend STEP export using a dedicated geometric worker.

---

## 4. Engineering Coverage Audit

### 4.1 Existing Formula Inventory
The calculation kernel (`src/engineering/`) contains 6 verified analytical routines:

1. **Shaft Pure Torsion (`torsion.ts`):**
   - Domain: Solid mechanics, circular shaft torsion.
   - Governing Equation: $\tau = \frac{T \cdot r}{J} = \frac{16T}{\pi d^3}$, $J = \frac{\pi d^4}{32}$, $Z_p = \frac{\pi d^3}{16}$.
   - Allowable Shear Stress: $\tau_{\text{allow}} = \frac{S_y}{2 \cdot n}$ (Tresca maximum shear hypothesis).
   - Analytical Sizing: $d_{\min} = \left[ \frac{16T}{\pi \cdot \tau_{\text{allow}}} \right]^{1/3}$.
   - Validation: Enforces $d > 0$, $T \ge 0$, and valid numeric types.

2. **Shaft Transverse Bending (`bending.ts`):**
   - Domain: Euler-Bernoulli beam bending.
   - Governing Equation: $\sigma_b = \frac{M \cdot c}{I} = \frac{32M}{\pi d^3}$, $I = \frac{\pi d^4}{64}$, $Z = \frac{\pi d^3}{32}$.
   - Moment Model: Simply supported beam with central concentrated point load $M = \frac{F \cdot L}{4}$.
   - Validation: Rejects $d \le 0$, $L \le 0$, $F < 0$.

3. **Combined Multiaxial Stress (`combinedStress.ts`):**
   - Domain: Multiaxial yield criteria, Mohr's circle.
   - Principal Stresses: $\sigma_{1,2} = \frac{\sigma_b}{2} \pm \sqrt{\left(\frac{\sigma_b}{2}\right)^2 + \tau^2}$.
   - Maximum Shear Stress (Tresca): $\tau_{\max} = \sqrt{\left(\frac{\sigma_b}{2}\right)^2 + \tau^2}$, $\sigma_{\text{equiv}} = 2\tau_{\max} = \sqrt{\sigma_b^2 + 4\tau^2}$.
   - Distortion Energy Theory (Von Mises): $\sigma_{\text{vm}} = \sqrt{\sigma_b^2 + 3\tau^2}$.
   - Factor of Safety: $\text{FoS} = \frac{S_y}{\sigma_{\text{equiv}}}$.
   - Validation: Enforces $S_y > 0$, $\text{FoS}_{\text{target}} > 0$.

4. **Shaft Centerline Deflection (`deflection.ts`):**
   - Domain: Elastic beam deflection (Euler-Bernoulli).
   - Midspan Deflection: $\delta_{\max} = \frac{F \cdot L^3}{48 E I}$.
   - Support Angle (Slope): $\theta_{\text{supports}} = \frac{F \cdot L^2}{16 E I}$.
   - Allowable Deflection Benchmark: Machine design rule of thumb $\delta_{\text{allow}} = 0.001 \cdot L$.
   - Validation: Enforces $E > 0$, valid geometry.

5. **Power Transmission Dynamics (`power.ts`):**
   - Domain: Rotational mechanics.
   - Equations: $\omega = \frac{2\pi \cdot n}{60}$, $P = T \cdot \omega$, $\text{HP} = \frac{P}{745.699872}$.
   - Validation: Rejects negative RPM or torque.

6. **Safety Factor & Margin (`safetyFactor.ts`):**
   - Domain: Structural safety margins.
   - Equations: $\text{FoS} = \frac{S_{\text{strength}}}{\sigma_{\text{applied}}}$, $\text{Margin \%} = \left(\frac{\text{FoS}}{\text{FoS}_{\text{target}}} - 1\right) \times 100$.

### 4.2 Comprehensive 14-Domain Roadmap & Gaps

| Domain | Current Coverage | Missing Capabilities / Gaps | Priority |
|---|---|---|---|
| **1. Statics & Free Body Equilibrium** | Single symmetric point load ($M = FL/4$) | Multi-point loads, overhung gears/pulleys, distributed shaft weight, 3D vector reactions ($F_x, F_y, F_z$) | **High** |
| **2. Strength of Materials & Stress** | Torsion, bending, Mohr's circle | Axial loads ($P/A$), transverse shear stress distribution, hollow shaft geometry ($d_o, d_i$), combined triaxial stress | **High** |
| **3. Shaft Design (Torsion & Bending)** | Uniform solid circular shaft | Stepped shafts, shoulder fillet stress concentrations ($K_t, K_{ts}$ via Peterson), keyway notch sensitivity ($K_f$), ASME shaft equations | **Critical** |
| **4. Deflection & Stiffness** | Uniform beam midspan deflection | Stepped beam deflection (Macaulay's method or numerical integration), slope at bearing seats ($\theta \le 1\text{ mrad}$ limit) | **High** |
| **5. Fatigue & Endurance** | Simplified Basquin formula | Marin factors ($k_a$ surface, $k_b$ size, $k_c$ load, $k_d$ temp, $k_e$ reliability), Goodman/Gerber mean stress criteria, cumulative damage (Miner's rule) | **Critical** |
| **6. Springs, Fasteners & Joints** | None | Bolted joint preloads, bolt torque-tension relation ($T = K F d$), helical compression spring rates and stresses | **Medium** |
| **7. Bearings & Power Transmission** | Visual bearing symbols only | ISO 281 basic rating life $L_{10h} = \frac{10^6}{60n}(C/P)^p$, equivalent dynamic radial load $P = X F_r + Y F_a$, bearing catalog selection | **High** |
| **8. Gears & Machine Elements** | Visual gear silhouette only | AGMA 2001-D04 spur/helical gear bending stress ($\sigma_F$) and pitting contact stress ($\sigma_H$), gear geometry generator | **Medium** |
| **9. Fits, Tolerances & Inspection** | None | ISO 286 limit fits (e.g., H7/k6, H7/h6), clearance/interference bounds, GD&T runout callouts | **Medium** |
| **10. Buckling & Stability** | Slenderness ratio warning ($L/d > 40$) | Euler column buckling ($P_{cr} = \pi^2 E I / L_e^2$), Johnson parabolic formula for intermediate columns | **Low** |
| **11. Thermal Analysis** | Simple temperature warning | Linear thermal expansion ($\Delta L = \alpha L \Delta T$), interference fit assembly temperature differential, thermal stress | **Medium** |
| **12. Fluid Mechanics & Pressure** | Out of scope | Pressure vessel hoop and longitudinal stresses (thin/thick wall Lamé equations) | **Low** |
| **13. Vibration & Dynamics** | Constant RPM power | First lateral critical speed (whirling) via Dunkerley's equation and Rayleigh-Ritz method ($\omega_{cr} = \sqrt{g / \delta}$) | **High** |
| **14. Finite Element Analysis (FEA)** | 1D analytical beam equations | 1D frame/beam FEA solver for multi-support stepped shafts; vertex displacement heatmaps | **Medium** |

---

## 5. Engineering Standards and Source Control

### 5.1 Standards Review and Feasibility
To ensure technical credibility, every standard referenced in the software must have a documented scope and publicly available mathematical formulation:

1. **ASME B106.1M ("Design of Transmission Shafting"):**
   - *Status:* Withdrawn by ASME, but remains the foundational benchmark in textbook machine design (e.g., Shigley's Mechanical Engineering Design, Chapter 7).
   - *Governing Equation:* $\sigma_a' = \sqrt{(K_f \sigma_{b,a})^2 + 3(K_{fs} \tau_{a})^2}$, $\sigma_m' = \sqrt{(K_f \sigma_{b,m})^2 + 3(K_{fs} \tau_{m})^2}$.
   - *Feasibility:* Complete, fully documented, and legal to implement as an analytical formulation.

2. **DIN 6885-1:1993 ("Drive Type Fastenings without Taper Action — Parallel Keys"):**
   - *Status:* Active German/International standard.
   - *Application:* Standard key dimensions ($b \times h$), keyway depth ($t_1, t_2$), and allowable compressive bearing stress on key faces: $\sigma_c = \frac{2T}{d \cdot l \cdot (h - t_1)} \le \sigma_{\text{allow}}$.
   - *Feasibility:* Standard tables and equations are published in public mechanical engineering handbooks.

3. **ISO 281:2007 ("Rolling Bearings — Dynamic Load Ratings and Rating Life"):**
   - *Status:* Active international standard.
   - *Governing Equations:* Basic rating life $L_{10} = (C/P)^p$ million revolutions ($p = 3$ for ball, $10/3$ for roller). Life in operating hours: $L_{10h} = \frac{10^6}{60 \cdot n} \left(\frac{C}{P}\right)^p$.
   - *Feasibility:* Formulas are universally available in manufacturer engineering catalogs (SKF, NSK, Timken).

4. **ISO 286-1 / ISO 286-2 ("ISO Code System for Tolerances on Linear Sizes"):**
   - *Status:* Active international standard.
   - *Application:* Fundamental deviations and standard tolerance grades (IT6, IT7, IT8) for shaft fits (h6, k5, m6) and hole fits (H7).
   - *Feasibility:* Formulaic calculation of tolerance unit $i = 0.45 \sqrt[3]{D} + 0.001 D$ is public domain.

5. **Clarification on ISO 10816:**
   - *Current Bug in App:* `ReportsPage.tsx` titles its document "ISO 10816 Calculation Sheet". ISO 10816 is strictly "Mechanical vibration — Evaluation of machine vibration by measurements on non-rotating parts". It is not a shaft stress standard. The report title must be corrected to "Mechanical Power Transmission Shaft Calculation Sheet (Ref: ASME B106.1M / DIN 6885)".

### 5.2 Proposed Standards Registry Architecture
Create `src/standards/registry.ts` defining a typed, inspectable standards directory:
```typescript
export interface EngineeringStandardRecord {
  id: string;
  code: string;
  title: string;
  organization: 'ISO' | 'ASME' | 'DIN' | 'AGMA' | 'ASTM';
  edition: string;
  scope: string;
  supportedCalculations: string[];
  verificationStatus: 'verified' | 'draft' | 'unverified';
  referenceFormulas: string[];
  assumptions: string[];
}
```

---

## 6. Product and UX Audit

### 6.1 Strengths of Current Interface
Following the Stage 5 modernization, the visual presentation has improved substantially:
- The 52px mechanical navigation rail maximizes horizontal drafting space.
- The dark workstation palette (`#111315`, `#191C1F`, `#34393F`, `#64D6C5`) looks restrained and professional.
- The docked 48px telemetry strip provides immediate feedback without obscuring geometry.
- SVG dimension witness lines scale dynamically with parameter inputs.

### 6.2 Identified UX Problems & Weaknesses
1. **Lack of True 3D Depth:** The 2D SVG canvas looks like an engineering sketch, but cannot be orbited in 3D. Users attempting to inspect bearing seats or keyway depths find the view static.
2. **Ephemeral Version Snapshots:** When an engineer takes a design snapshot in `VersionHistoryDrawer.tsx`, refreshes the page, and opens the drawer, the snapshot is gone. This undermines user confidence in data integrity.
3. **Simulated Delays:** Clicking "Run Analysis" in the workspace triggers a synthetic 800ms `setTimeout`, and "Upload Spec" triggers staggered delays. Experienced engineers recognize these artificial states.
4. **Modal Proliferation:** Secondary features (`OptimizationModal`, `ProblemInputModal`, `FileUploadModal`, `DesignCompareModal`) open as large floating dialogs rather than integrated contextual inspectors.
5. **Project Creation Workflow:** Clicking "+ New Project" in `ProjectsPage.tsx` lacks a guided assembly wizard for defining shaft support configurations (e.g., straddle-mounted, cantilever/overhung, hollow drive shaft).

---

## 7. Product Architecture and Risks

### 7.1 Target Product Architecture

```
+-------------------------------------------------------------------------------+
|                           REACT WORKSTATION CLIENT                             |
|  +--------------------+  +----------------------+  +-----------------------+  |
|  | 52px Nav Rail      |  | TopBar Telemetry     |  | Offline / Cloud       |  |
|  | - Command Center   |  | - Sync Status        |  | Copilot Panel         |  |
|  | - CAD Workspace    |  | - Mode Switcher      |  | - Tool Calling Traces |  |
|  | - Analysis/Calcs   |  | - Export Engine      |  | - Action Cards        |  |
|  +--------------------+  +----------------------+  +-----------------------+  |
|                                                                               |
|  +-------------------------------------------------------------------------+  |
|  | DUAL CAD WORKSPACE VIEWPORT                                              |  |
|  | [3D WebGL Workstation (Three.js)]   <--->   [2D Drafting Canvas (SVG)]  |  |
|  | - Dynamic Stepped Meshes                    - Dimension Witness Lines   |  |
|  | - Orbit / Pan / Zoom / Raycasting           - ISO Title Block           |  |
|  +-------------------------------------------------------------------------+  |
|                                                                               |
|  +-------------------------------------------------------------------------+  |
|  | PARAMETER & COMPONENT INSPECTOR                                         |  |
|  | - Multi-Segment Geometry    - Point Loads & Torques    - Material Alloy |  |
|  +-------------------------------------------------------------------------+  |
|                                                                               |
|  +-------------------------------------------------------------------------+  |
|  | PERSISTENT 48px DOCKED TELEMETRY INSTRUMENT STRIP                       |  |
|  | Von Mises | Safety Factor | Max Deflection | Whirling Speed | Mass      |  |
|  +-------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------+
                                      |
                         REST APIs / Web Workers
                                      |
+-------------------------------------------------------------------------------+
|                     ENGINEERING COMPUTATION KERNEL                            |
|  +------------------+  +------------------+  +-----------------------------+  |
|  | Solid Mechanics  |  | Machine Elements |  | Dynamics & Vibrations       |  |
|  | - Torsion / Bend |  | - ISO 281 Bearing|  | - Rayleigh-Ritz Whirling    |  |
|  | - Marin Fatigue  |  | - DIN 6885 Keys  |  | - Critical Speeds           |  |
|  | - Stepped Beams  |  | - ISO 286 Fits   |  | - Torsional Resonance       |  |
|  +------------------+  +------------------+  +-----------------------------+  |
|  +-------------------------------------------------------------------------+  |
|  | STANDARDS REGISTRY (ASME B106.1M, DIN 6885, ISO 281, ISO 286, ASTM)     |  |
|  +-------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------+
                                      |
+-------------------------------------------------------------------------------+
|                    PERSISTENCE LAYER (Node.js SQLite)                         |
|  - projects    - snapshots / versions    - conversations    - audit logs      |
+-------------------------------------------------------------------------------+
```

### 7.2 Risk Assessment Matrix

| Risk Factor | Severity | Probability | Mitigation Strategy |
|---|---|---|---|
| **R1: 3D CAD Bundle Bloat & WebGL Failure** | High | Low | Tree-shake Three.js; isolate 3D viewport behind a lazy-loaded boundary; provide seamless 2D SVG drafting fallback. |
| **R2: Database Schema Incompatibility** | High | Medium | Implement explicit SQLite migration runner (`server/db/migrations.ts`) with versioned schema tracking. |
| **R3: Mathematical Accuracy & Engineering Liability** | Critical | Low | Comprehensive automated unit test suite verifying against textbook reference problems; explicit disclaimer headers. |
| **R4: LLM Hallucinations on Calculations** | Critical | Medium | Zero math done by LLM tokens: prompt architecture strictly forces tool execution with deterministic Zod schema validation. |
| **R5: Performance with Stepped Beam Deflection** | Medium | Low | Closed-form Macaulay's equations or lightweight matrix discretization (<50 elements) executes in <2 ms in JavaScript. |

---

## 8. Baseline Verification Results

The baseline checks were executed on the active codebase with the development database safeguarded:

### 8.1 Automated Test Suite (`npm test`)
- **Execution Command:** `npm test` (`npm run test:engineering && npm run test:server && npm run test:frontend`)
- **Exit Code:** `0` (Success)
- **Results Breakdown:**
  - `src/engineering/__tests__/engineering.test.ts`: **20/20 PASS** (duration: 84.7 ms)
  - `server/__tests__/`: **27/27 PASS** (duration: 2,132 ms)
    - `ai.test.ts`: 4 passed (parameter validation & tool execution)
    - `api.test.ts`: 11 passed (health, invalid body, offline 7-prompt chat suite)
    - `db.test.ts`: 9 passed (in-memory SQLite CRUD & cascading deletes)
    - `llm.integration.test.ts`: 3 passed (mocked tool calling)
  - `src/services/__tests__/chatApi.test.ts`: **4/4 PASS** (duration: 607.7 ms)
- **Total Passing Tests:** **51 / 51 tests (100% passing)**

### 8.2 TypeScript Strict Validation (`npx tsc --noEmit`)
- **Execution Command:** `npx tsc --noEmit`
- **Exit Code:** `0` (Success)
- **Diagnostics:** 0 errors, 0 warnings.

### 8.3 Production Bundle Build (`npm run build`)
- **Execution Command:** `npm run build` (`tsc && vite build`)
- **Exit Code:** `0` (Success)
- **Build Duration:** 18.11 seconds
- **Generated Assets:**
  - `dist/index.html`: 0.72 kB (gzip: 0.41 kB)
  - `dist/assets/index-BXEYXYf_.css`: 46.58 kB (gzip: 8.37 kB)
  - `dist/assets/index-DDGlMH0l.js`: 1,284.31 kB (gzip: 290.28 kB)

### 8.4 Database Integrity Verification
- **File:** `data/mech-copilot.db`
- **Size:** 40,960 bytes
- **Integrity:** Untouched, schema intact, zero data corruption.

---

## 9. Prioritized 12-Stage Implementation Roadmap

The 12-stage engineering product roadmap is structured to eliminate placeholders, harden persistence, expand mathematical rigor, introduce 3D CAD capabilities, and deliver a production-ready application:

```
[Stage 1: Audit & Plan] (Complete)
       |
[Stage 2: Database & Version History Hardening]
       |
[Stage 3: Standards Registry & Engineering Verification]
       |
[Stage 4: Advanced Solid Mechanics & Marin Fatigue]
       |
[Stage 5: Stepped Shafts & Macaulay Deflection]
       |
[Stage 6: Machine Elements Kernel (Bearings & Keys)]
       |
[Stage 7: Critical Speed & Whirling Dynamics]
       |
[Stage 8: Interactive 3D WebGL Viewport (Three.js)]
       |
[Stage 9: Parametric 3D Assembly & Raycasting]
       |
[Stage 10: Real Spec Ingestion & PDF Parser]
       |
[Stage 11: Async Calculation Worker & STEP Export]
       |
[Stage 12: Production Hardening & Final Release]
```

### Stage-by-Stage Plan:
- **Stage 01: Full System Audit and Product Completion Plan** *(Current)*
  - Establish baseline, record findings, audit 3D/engineering coverage, create roadmap.
- **Stage 02: Database Persistence & Version History Hardening**
  - Migrate `designVersions` snapshot history into SQLite database table.
  - Implement real snapshot save, restore, tag, and export across page reloads.
  - Add SQLite schema migration manager.
- **Stage 03: Standards Registry & Engineering Verification**
  - Implement `src/standards/registry.ts` with ASME, DIN, ISO, and ASTM definitions.
  - Fix report naming from ISO 10816 to standard shaft certification format.
  - Eliminate simulated delays in `runAnalysis` and `explainCalculation`.
- **Stage 04: Advanced Solid Mechanics & Marin Fatigue**
  - Implement full Marin endurance limit modification factors ($k_a, k_b, k_c, k_d, k_e$).
  - Implement Peterson stress concentration factor calculator ($K_t, K_{ts}$) and notch sensitivity ($q$).
  - Add Goodman, Gerber, and ASME Elliptic fatigue safety criteria.
- **Stage 05: Stepped Shaft Statics & Macaulay Beam Deflection**
  - Multi-segment stepped shaft geometry support ($d_1, L_1, d_2, L_2, d_3, L_3$).
  - 2D statics solver for multiple point loads and reaction forces ($R_1, R_2$).
  - Macaulay's method for exact piecewise stepped beam deflection and slope.
- **Stage 06: Machine Elements Kernel (Bearings & Keys)**
  - ISO 281 rolling bearing rating life calculator ($L_{10h}$).
  - DIN 6885 parallel keyway sizing and shear/bearing stress checks.
  - ISO 286 shaft/bearing seat tolerance fit calculator (e.g., k5, m6).
- **Stage 07: Critical Speed & Whirling Dynamics**
  - First lateral critical speed (whirling) calculation via Dunkerley's equation.
  - Rayleigh-Ritz fundamental natural frequency calculator.
  - Dynamic magnification and operating speed safety margin ($n / n_{cr} < 0.8$ or $> 1.2$).
- **Stage 08: Interactive 3D WebGL Workstation Viewport**
  - Install Three.js and configure WebGL canvas in `src/components/cad/`.
  - Implement OrbitControls (orbit, pan, zoom, fit to model, view cube).
  - Procedural 3D cylindrical mesh generation with studio lighting and PBR steel materials.
  - Toggle between 3D View and 2D Orthographic Drafting Mode.
- **Stage 09: Parametric 3D Assembly & Interactive Raycasting**
  - 3D rendering of stepped segments, bearing rings, keyway cutouts, and gear hubs.
  - Interactive mouse raycasting: clicking a 3D component selects it in the parameter inspector.
  - Live dimensional witness lines rendered in 3D scene space.
- **Stage 10: Real Document & Specification Ingestion**
  - Replace `FileUploadModal` mock presets with a real JSON/CSV boundary spec parser.
  - Client-side PDF text extraction for standard equipment data sheets.
  - Dynamic multi-objective optimization solver (computing real mass and FoS per option).
- **Stage 11: Asynchronous Solver Architecture & CAD Export**
  - Offload heavy calculations to a Web Worker or async backend queue.
  - Client-side STL mesh export and server-side STEP/DXF wireframe generator.
- **Stage 12: Production Hardening, Certification Dossier & Final Release**
  - End-to-end Playwright test suite covering all 12 stages.
  - Comprehensive documentation, user manual, and verified engineering test matrix.

---

## 10. Acceptance Criteria for Each Stage

| Stage | Acceptance Criteria |
|---|---|
| **Stage 02** | Design versions persist across browser restart in SQLite; deleting a project removes snapshots; test coverage for version CRUD. |
| **Stage 03** | Standards registry accessible via UI; verified ASME/DIN/ISO references; zero `setTimeout` delays in calculations; corrected report titles. |
| **Stage 04** | Marin factors modify $S_e$; $K_t$ calculated for shaft shoulder fillets; Goodman/Gerber lines plotted in S-N curve; 100% textbook verified. |
| **Stage 05** | Stepped shafts with $\ge 3$ segments supported; Macaulay deflection matches textbook test cases within 0.5%; slope at bearing seats verified. |
| **Stage 06** | ISO 281 computes $L_{10h}$ for deep groove ball bearings; DIN 6885 checks key shear and bearing pressure; ISO 286 gives upper/lower tolerance deviations in $\mu\text{m}$. |
| **Stage 07** | Dunkerley critical speed $\omega_{cr}$ calculated in RPM; operating speed warning triggered within $\pm 20\%$ of critical speed; verified against textbook benchmark. |
| **Stage 08** | Three.js WebGL viewport runs at 60 FPS; orbit, pan, zoom, reset controls operate smoothly; 2D/3D mode switch preserves camera state; zero memory leaks. |
| **Stage 09** | Stepped shaft, keyway, and bearing geometry rendered accurately in 3D; clicking 3D mesh selects component in sidebar; parameters update mesh in $<16\text{ ms}$. |
| **Stage 10** | Users can upload actual JSON/CSV spec files; optimization modal calculates real mass and FoS for every option based on active geometry; zero hardcoded mock options. |
| **Stage 11** | Heavy calculations execute asynchronously without UI freeze; STL export downloads valid 3D mesh readable by standard slicer/CAD software. |
| **Stage 12** | All 12 stages pass automated test suite; zero TypeScript errors; production build clean; end-to-end verification video/screenshot package recorded. |

---

## 11. Top 10 Highest Priority Issues

Ranked strictly by severity and architectural dependency order:

1. **[SEV-1] Ephemeral Design Version History (Data Loss Risk):**  
   `designVersions` is held purely in React `useState`. Snapshots are wiped out on browser reload.  
   *Action:* Create `design_versions` table in SQLite; wire `saveDesignVersion` and `restoreDesignVersion` through API.
2. **[SEV-2] Simulated Optimization Solver (`OptimizationModal.tsx`):**  
   `generateOptimizationOptions` returns hardcoded numbers (`weightKg: 2.65, safetyFactor: 2.52`) regardless of input length or load.  
   *Action:* Compute mass ($\rho \cdot V$) and FoS dynamically using active parameters.
3. **[SEV-3] Simulated Document Ingestion (`FileUploadModal.tsx`):**  
   Modal relies on `setTimeout` delays and mock preset files. No real file parser exists.  
   *Action:* Implement structured JSON/CSV boundary spec ingestion with real client validation.
4. **[SEV-4] Absence of Interactive 3D CAD Geometry:**  
   Application currently only has 2D SVG drafting; marketing claims and user expectation require true 3D inspection.  
   *Action:* Integrate Three.js WebGL canvas with parametric cylindrical geometry and OrbitControls.
5. **[SEV-5] Missing Shoulder Fillets & Stress Concentrations ($K_t, K_f$):**  
   Current shaft analysis treats the shaft as a notch-free uniform cylinder, which is unsafe for real stepped transmission shafts.  
   *Action:* Implement Peterson shoulder fillet stress concentration formulas and Marin fatigue factors.
6. **[SEV-6] Single Midspan Point Load Limitation:**  
   Bending is hardcoded to $M = FL/4$; cannot model overhung pulleys, multiple gear meshes, or distributed shaft weight.  
   *Action:* Build a 2D statics solver supporting arbitrary point loads, distributed loads, and reaction solving.
7. **[SEV-7] Static Calculation Explanation in Copilot:**  
   `explainCalculation` inserts hardcoded static text from `aiResponses.ts` rather than evaluating active inputs.  
   *Action:* Wire calculation explanation to deterministic formula synthesizer.
8. **[SEV-8] ISO 10816 Standard Labeling Inaccuracy:**  
   Report sheet is titled "ISO 10816 Calculation Sheet" (vibration standard) instead of ASME B106.1M shaft stress standard.  
   *Action:* Correct standard reference to ASME B106.1M / DIN 6885 and implement typed Standards Registry.
9. **[SEV-9] Non-Functional Unit System Preferences:**  
   Selecting Imperial units in `SettingsPage.tsx` does not convert units across the application.  
   *Action:* Integrate `src/engineering/units.ts` into a global unit display provider.
10. **[SEV-10] Lack of Machine Elements & Bearing Life Calculations:**  
    Bearings are merely visual drawings; no $L_{10h}$ bearing life or DIN 6885 keyway capacity is evaluated.  
    *Action:* Implement ISO 281 rolling bearing rating life and DIN 6885 key stress validation.

---

## 12. Verification & Sign-off

- **Automated Tests:** 51 / 51 Passing (100%)
- **TypeScript:** 0 Errors (`tsc --noEmit` clean)
- **Vite Production Build:** Success (built in 18.11s)
- **Development Database:** Verified safe (`data/mech-copilot.db`, 40,960 bytes)
- **Status:** **STAGE 01 AUDIT & COMPLETION PLAN CERTIFIED COMPLETE**
