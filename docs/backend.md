# Backend Setup & Configuration

This document outlines the setup and configuration for the Mechanical Engineering Design Copilot backend.

## Requirements
- Node.js v24 or later
- npm

## Dependencies
- **Express**: Lightweight server framework.
- **Zod**: Input validation.
- **dotenv**: Environment variable management.
- **cors**: Cross-Origin Resource Sharing for the frontend.

## Configuration
1. Copy `.env.example` to `.env`.
2. Configure the variables:
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
LLM_PROVIDER=openai
OPENAI_API_KEY=
```

## Available Scripts
- `npm run dev` - Concurrently starts both frontend (Vite) and backend (Express) in watch mode.
- `npm run dev:server` - Starts only the backend.
- `npm run dev:client` - Starts only the frontend.
- `npm test` - Runs all tests (engineering + backend).

## Current API Contract
The backend currently exposes two endpoints:

### `GET /api/health`
Returns the health status of the backend API.
```json
{
  "status": "ok",
  "service": "mech-copilot-api"
}
```

### `POST /api/chat`
Endpoint for future LLM integration. Currently returns a `501 Not Implemented` error.

**Request body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Calculate the minimum shaft diameter for 1000 Nm torque."
    }
  ]
}
```

**Response:**
```json
{
  "error": "LLM integration is not implemented yet"
}
```

## Future Architecture
The backend will act as a secure proxy for the LLM. 
1. The frontend sends the chat history to the backend.
2. The backend securely communicates with the LLM.
3. If the LLM requests a tool call (e.g., `calculateRequiredShaftDiameter`), the backend will execute it using the existing deterministic calculations from `src/engineering` (which can be imported directly into the backend).
4. The result is returned to the LLM and the final output is sent to the frontend.
