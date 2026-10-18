# Mechanical Engineering Copilot

> A traceable, standards-governed engineering copilot bridging generative AI interaction with deterministic machine-element calculations.

[![NYLP AI Hackathon 2026](https://img.shields.io/badge/NYLP%20AI%20Hackathon-2026-004a80?style=flat-square)](https://nylp-hackathon-rulebook.lovable.app/)
[![Automated Tests](https://img.shields.io/badge/Tests-214%20Passing-22c55e?style=flat-square)](file:///c:/Users/Pc/.gemini/antigravity/scratch/mech-copilot/stage12_comprehensive_verification_report.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-v22%2B%20%7C%20v24-339933?style=flat-square&logo=node.js)](https://nodejs.org/)

**Mechanical Engineering Copilot** is a specialized design workstation for mechanical engineers, machine designers, and robotics teams sizing rotating shafts, power-transmission elements, and mechanical connections. It couples an interactive browser workstation with an LLM that reasons over engineering intent while routing all physics, stress checks, and standards evaluations to **100% deterministic, closed-form TypeScript calculation engines**.

---

## 1. Problem

Mechanical engineers often need to do calculations, check design details, and work with different tools when designing machine parts. These tasks can take time and require careful checking.

When designing parts like rotating shafts, engineers must make sure the part is strong enough not to break or bend too much under heavy loads. Usually, engineers have to switch between paper formulas, spreadsheets, and complex software. General AI chatbots can answer questions, but they often make math mistakes or guess numbers. This makes it hard to quickly test ideas while being sure the math is right.

---

## 2. Solution

Mechanical Engineering Copilot is an AI-powered tool that helps users with supported mechanical design tasks.

Users can enter design details and ask questions in plain English. The application helps them understand the design and runs supported engineering calculations through its built-in calculation system. While the AI assists with explanations and suggestions, users still need to review and verify engineering results before making final design decisions.

```mermaid
flowchart LR
    User([User]) <--> UI[Web App & Visual Drawing]
    UI <--> Backend[Backend System]
    Backend <--> AI[AI Assistant\n(Helps with Questions)]
    Backend <--> Calc[Engineering Math Engine\n(Runs the Calculations)]
    Backend <--> DB[(Local Database\nSaves Your Work)]
```

---

## 3. Features

* **Ask questions:** Ask the AI about supported mechanical design tasks and get clear, everyday explanations.
* **Enter design details:** Change values like part size, length, applied force, and speed to see how they affect the design.
* **Run calculations:** Get immediate math results for stress, bending, and safety margins from the built-in calculation system.
* **View the design:** See a visual drawing of the machine part that updates live whenever you change numbers.
* **See helpful charts:** Look at visual graphs that show stress distribution, fatigue life curves, and safe operating speeds.
* **Compare materials:** Look up different metals like alloy steel, stainless steel, and titanium to see which fits your part best.
* **Save your work:** Keep project details, conversation history, and design versions saved locally on your computer.
* **Generate reports:** Create clean design summaries with one click to review and share your work.

> **Note on Scope:** This tool provides preliminary design guidance for supported rotating parts. It is intended for initial sizing, planning, and learning, and does not replace official physical testing or certified engineering reviews.

---

## 4. Tech Stack

| Layer | Technology | Role in System |
| :--- | :--- | :--- |
| **Frontend** | React 18.3.1, TypeScript 5.7 | Component architecture, application state, and typed UI bindings. |
| **Build & Tooling** | Vite 6.0.7, Tailwind CSS 3.4 | Development server, fast HMR, and utility-first styling. |
| **Visualizations** | SVG, Recharts 2.15, Lucide React | Reactive CAD geometry rendering, stress area charts, and S-N curves. |
| **Backend API** | Node.js (v22+), Express 5.2 | REST endpoints (`/api/projects`, `/api/chat`), CORS, and error handling. |
| **Persistence** | Native `node:sqlite` | Zero-dependency, C-speed embedded SQLite database with schema migrations. |
| **AI Integration** | OpenAI SDK 7.20 (`gpt-4o-mini`) | Language understanding, prompt guardrails, and structured function calling. |
| **Validation** | Zod 4.6.5 | Runtime schema enforcement for API payloads and environment variables. |
| **Testing** | Node Test Runner (`tsx --test`), Playwright | Unit, integration, and end-to-end browser verification. |

---

## 5. AI / API Usage

The system architecture cleanly separates nondeterministic language orchestration from numerical evaluation:

* **Model Configuration:** Configured to use `gpt-4o-mini` by default (customizable via `OPENAI_MODEL` in `.env`).
* **Prompt Guardrails (`server/services/llm.ts`):** The system prompt instructs the assistant:
  > *"Use the available engineering tools whenever the user asks for a calculation that those tools can perform. Do not invent engineering calculations when a deterministic tool exists. Do not fabricate numerical results."*
* **Tool Calling Schema:** Two primary tools are exposed via OpenAI Function Calling:
  1. `calculate_required_shaft_diameter`: Accepts torque, material yield strength, and target safety factor $\to$ computes exact minimum diameter via Tresca criterion.
  2. `run_full_shaft_analysis`: Accepts 3D load vectors, geometry, RPM, and material properties $\to$ evaluates equivalent stress, bending moments, deflection, and pass/fail status.
* **Deterministic Execution Flow:** When the LLM emits a tool call, the backend intercepts the JSON arguments, executes the corresponding TypeScript engine in `src/engineering`, and returns the verified numerical result to the LLM. The LLM then formats the final conversational response referencing the authoritative calculation.
* **Zero-API-Key Offline Fallback:** If `OPENAI_API_KEY` is omitted, `processOfflineChatRequest` intercepts incoming queries, executes pattern-matched deterministic tools, and returns LaTeX-formatted engineering responses with identical result cards.

---

## 6. Setup Instructions

### Prerequisites
* **Node.js:** v22.0.0 or higher (v22.20+ or v24.x recommended for native `node:sqlite`)
* **npm:** v10.0.0 or higher
* **Git:** Installed in your terminal

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Fawadullah15/mech-copilot.git
   cd mech-copilot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   # Windows PowerShell
   Copy-Item .env.example .env

   # Linux / macOS
   cp .env.example .env
   ```
   *(Optional)* Add your `OPENAI_API_KEY` in `.env`. If left empty, the application automatically runs in full offline deterministic mode.

4. **Initialize and seed the database:**
   ```bash
   npm run db:seed
   ```
   *Creates `data/mech-copilot.db` and provisions a default "Gearbox Assembly" project with baseline design parameters.*

5. **Start the application:**
   ```bash
   npm run dev
   ```
   *Runs the Vite client (`http://localhost:5173`) and Express server (`http://localhost:3001`) concurrently.*

6. **Verify the Main Workflow:**
   * Open `http://localhost:5173` and click the **Gearbox Assembly** project.
   * Modify the shaft diameter or torque in the right-hand panel and observe the SVG CAD visualizer update live.
   * Open the **Engineering Copilot** panel on the right.
   * Enter: `"What diameter do I need for FoS 2.5?"`
   * Observe the structured **Engineering Result Card** returned by the tool, click **"Apply"** to update your design parameters, and refresh the browser to verify database persistence.

For a guided walkthrough, refer to [docs/demo-script.md](docs/demo-script.md). For schema details, see [docs/database.md](docs/database.md).

### Verification & Testing Commands

```bash
# Run complete automated test suite (214 tests across engineering, server, and client)
npm test

# Run multi-stage physical integration workflows (Gears -> Loads -> Fatigue -> Balancing)
npx tsx scripts/verify-all-workflows.ts

# Run production build compilation
npm run build
```

---

## 7. Screenshots

| View | Screenshot | Description |
| :--- | :---: | :--- |
| **Interactive CAD Workspace** | ![CAD Workspace](docs/screenshots/stage5_01_workspace_desktop.png) | Reactive 2D/3D SVG visualizer with live dimension callouts, material overlay, and parameter controls. |
| **Dynamic Analysis & S-N Curves** | ![Analysis Charts](docs/screenshots/stage5_04_analysis_charts.png) | Recharts stress distribution areas and logarithmic S-N fatigue endurance life curves. |
| **Engineering Calculation Cards** | ![Calculation Cards](docs/screenshots/stage5_05_calculations.png) | Transparent mathematical derivation cards with substituted variables, formulas, and safety margins. |
| **AI Copilot Tool Execution** | ![AI Copilot](docs/screenshots/stage5_09_copilot_result.png) | Docked Engineering Copilot executing deterministic tool calls and rendering structured recommendation cards. |

---

## Team Contributions

* **Fawadullah Imraj:** Team Lead, Product Direction and AI Integration.
* **Fahad Khan:** Technical Lead, Backend and System Architecture.
* **Laiba Ikram:** UI/UX Design and User Research.
* **Ujala Gull:** Documentation and Presentation.
* **Noor Us Saba:** Research, Testing and Quality Assurance.
* **Ayesha Khan:** Frontend Development and User Experience.

> [!NOTE]
> **Team Eligibility Review Note:**
> The project team contains six members as listed above. Section 3 of the NYLP AI Hackathon 2026 Rulebook stipulates a maximum of 5 members per team, and the official submission form dropdown enforces this limit. This discrepancy is flagged for confirmation by the Team Lead with the hackathon organizing committee prior to final submission.
