import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { healthRouter } from './routes/health';
import { chatRouter } from './routes/chat.js';
import { router as projectRouter } from './routes/projects.js';
import { productsRouter } from './routes/products.js';
import { bomsRouter } from './routes/boms.js';
import { initDatabase } from './db/client.js';
// Init DB
try {
  initDatabase();
} catch (e) {
  console.error("Database initialization failed:", e);
}

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin === env.FRONTEND_URL || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json({ limit: '100kb' }));
app.use(requestLogger);

// Routes
app.use('/api/health', healthRouter);
app.use('/api/chat', chatRouter);
app.use('/api/projects', projectRouter);
app.use('/api/products', productsRouter);
app.use('/api/boms', bomsRouter);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
