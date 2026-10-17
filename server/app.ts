import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';
import { chatRouter } from './routes/chat.js';
import { router as projectRouter } from './routes/projects.js';
import { initDatabase, isTestMode } from './db/client.js';
import { ensureDefaultProjectSeeded } from './services/projectService.js';
import { createConversation, addMessage, getConversationsByProjectId } from './services/conversationService.js';

// Init DB
try {
  initDatabase();
  // Idempotently seed sample project on startup in development/production if DB has no projects
  if (!isTestMode()) {
    const seeded = ensureDefaultProjectSeeded();
    if (seeded) {
      const threadId = `thread-${seeded.id}-default`;
      if (getConversationsByProjectId(seeded.id).length === 0) {
        createConversation(threadId, seeded.id, 'Shaft Sizing & Verification', seeded.lastModified);
        addMessage(threadId, {
          id: `init-${seeded.id}`,
          role: 'assistant',
          content: `Initialized Copilot context for **${seeded.name}** (${seeded.type}). Parameters loaded: Torque=${seeded.parameters.torque} Nm, RPM=${seeded.parameters.rpm}, Material=${seeded.parameters.materialId}.`,
          timestamp: seeded.lastModified,
          type: 'general',
        });
      }
    }
  }
} catch (e) {
  console.error("Database initialization failed:", e);
}

const app = express();

// Middleware
app.use(cors({ origin: env.FRONTEND_URL }));
app.use(express.json({ limit: '100kb' }));
app.use(requestLogger);

// Routes
app.use('/api/health', healthRouter);
app.use('/api/chat', chatRouter);
app.use('/api/projects', projectRouter);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
