import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';
import { chatRouter } from './routes/chat.js';
import { router as projectRouter } from './routes/projects.js';
import { initDatabase } from './db/client.js';

// Init DB
try {
  initDatabase();
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
