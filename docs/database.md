# Database Persistence Layer

## Overview

The backend uses a local SQLite database to persist `Projects`, `Conversations`, and `Messages`. 
This allows users to maintain state across application restarts while preserving their design parameters, chat history, and engineering tool execution results.

Instead of heavy ORMs or compiling native binaries which can be fragile on Windows environments, the architecture leverages Node.js 22+ built-in native module `node:sqlite`. This provides excellent performance, zero external dependencies, and robust query capabilities out-of-the-box.

## Schema

### Projects
- `id` (TEXT, PRIMARY KEY): Unique identifier.
- `name` (TEXT): Name of the project.
- `description` (TEXT): Description of the project goal.
- `type` (TEXT): E.g., 'Power Transmission'.
- `status` (TEXT): Current project status.
- `progress` (INTEGER): Completion percentage.
- `lastModified` (TEXT): ISO 8601 timestamp.
- `created` (TEXT): ISO 8601 timestamp.
- `parameters` (TEXT): JSON-serialized `DesignParameters`.
- `tags` (TEXT): JSON-serialized array of tags.

### Conversations
- `id` (TEXT, PRIMARY KEY): Unique thread identifier.
- `projectId` (TEXT, FOREIGN KEY): Reference to the project, with `ON DELETE CASCADE`.
- `title` (TEXT): Title of the conversation.
- `createdAt` (TEXT): ISO 8601 timestamp.

### Messages
- `id` (TEXT, PRIMARY KEY): Unique message identifier.
- `conversationId` (TEXT, FOREIGN KEY): Reference to the conversation, with `ON DELETE CASCADE`.
- `role` (TEXT): 'user', 'system', or 'assistant'.
- `content` (TEXT): Message markdown text.
- `timestamp` (TEXT): ISO 8601 timestamp.
- `type` (TEXT): Optional. Message type, e.g., 'calculation', 'general'.
- `structuredData` (TEXT): JSON-serialized structured metadata.
- `engineeringResult` (TEXT): JSON-serialized `EngineeringResult` object containing tool inputs and deterministic calculations.
- `saved` (INTEGER): Boolean flag indicating if the message is saved/bookmarked.

## Configuration
The DB URL can be configured in `.env` using `DATABASE_URL`. The default path is `file:./data/mech-copilot.db`.

## Migrations & Seeding
- `npm run db:seed`: Clears the database and populates it with a default demo project and starting context.
- Ensure the database is initialized automatically via the main `server/app.ts` file upon boot.

## API Integration
The `/api/chat` route has been augmented to intercept message histories:
1. When a user requests an LLM turn, their message is immediately persisted.
2. The conversation thread is automatically created if it doesn't already exist.
3. The LLM executes, invokes tools if necessary.
4. Upon successful LLM generation, the assistant response, along with its structured `engineeringResult` data, is persisted in the database.

## Testing Strategy
Tests are located in `server/__tests__/db.test.ts`. Because SQLite operations are fast, we utilize an isolated, temporary memory database during testing by modifying `initDatabase` before and after tests without calling external AI providers.
