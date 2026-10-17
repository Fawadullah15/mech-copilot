# Mechanical Engineering Copilot

A real, testable platform for a mechanical engineering design copilot.

## Interview Demo

### Prerequisites
- Node.js (v24.19.0+)

### Setup
1. Clone the repository.
2. Copy `.env.example` to `.env` and add your OpenAI API Key.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Initialize the database with seed data:
   ```bash
   npm run db:seed
   ```
5. Start the application:
   ```bash
   npm run dev
   ```

### Demo Workflow
See [docs/demo-script.md](docs/demo-script.md) for a complete 5-10 minute presentation guide, covering parameter interactions, LLM integrations, and deterministic engineering calculations.

### Technical Architecture
This platform is designed to be a reliable bridge between nondeterministic AI and deterministic engineering math.

* **LLM**: Understands user intent and orchestrates workflow.
* **Engineering tools**: Strict, controlled function calling registry allowing the LLM to request mathematical operations.
* **Deterministic engineering layer**: Authoritative calculations written in raw TypeScript (`src/engineering`). The AI never performs math directly.
* **Backend**: Secure Express/Node boundary that hides the OpenAI API key, manages persistence, and blocks invalid payloads.
* **SQLite**: Lightning-fast local persistence layer using the built-in `node:sqlite` module, requiring zero compilation or external ORMs.
* **React**: Interactive frontend with an SVG visualizer that reacts instantly to design parameter changes and syncs debounced state back to the server.

### What is Not Supported (By Design)
To maintain the scope of a reliable, demonstrable MVP, this project does not include cloud deployment, multi-user accounts, file attachments, advanced 3D Three.js rendering, or dynamic external API scraping.

For database documentation, see [docs/database.md](docs/database.md).
