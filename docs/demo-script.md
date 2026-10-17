# Mechanical Engineering Copilot - Demo Script

This script is designed for a 5-10 minute demonstration to an interviewer, proving the architecture, persistence, and reliability of the platform.

## Setup Before Demo
1. Run `npm install`
2. Create `.env` from `.env.example` and add your OpenAI API key.
3. Run `npm run db:seed` to provision a clean "Gearbox Assembly" project.
4. Start the application with `npm run dev`.

## The Demo Flow

**1. Project Discovery**
* Open `http://localhost:5173`.
* Explain: "This is a local React frontend communicating with an Express backend, backed by a native Node.js SQLite database."
* Click on the seeded **Gearbox Assembly** project.

**2. Visualizer and Parameters**
* Show the main workspace.
* Highlight the deterministic engineering UI (left panel) and the interactive SVG visualization (center).
* Point out that the initial design parameters (e.g., Torque = 500 N·m) were successfully restored from the database.

**3. Copilot Interaction**
* Open the Copilot sidebar.
* Type: *"What is the required shaft diameter for this setup to achieve our safety factor?"*
* Explain what happens behind the scenes: 
  > *"The backend receives the context, parses the intent via OpenAI, and realizes it needs hard engineering math. It executes an explicitly registered, deterministic Node.js tool (`calculate_required_shaft_diameter`) against our actual engineering core, effectively blocking the LLM from hallucinating math."*

**4. Engineering Result Card**
* Point to the structured "Engineering Result Card" that appears in the chat. 
* Contrast the conversational explanation provided by the AI with the rigid, JSON-driven engineering outputs. 

**5. Apply Action (Mutation & Reactivity)**
* Click the **"Apply X mm"** button inside the Result Card.
* Show the SVG Visualizer instantly re-rendering with the new diameter. 
* Explain: *"The AI does not unilaterally change your CAD file. You are in control. Clicking Apply safely triggers a React Context mutation, which is debounced to the SQLite DB."*

**6. Persistence Verification**
* Refresh the browser completely.
* Show that:
  - The updated diameter is still applied.
  - The entire conversation thread is still present in the exact order.
  - The structured engineering result card is re-rendered correctly from the database JSON snapshot.

**7. Follow-Up Queries**
* Ask the Copilot a generic question (e.g., *"What is the difference between Von Mises and Tresca stresses?"*) to show that standard conversational AI capabilities gracefully degrade to normal chat when no engineering tool is required.
