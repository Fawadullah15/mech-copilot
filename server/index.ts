import app from './app';
import { env } from './config/env';

const startServer = () => {
  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Mech-Copilot API running at http://localhost:${env.PORT}`);
    console.log(`🌐 Allowing CORS from frontend: ${env.FRONTEND_URL}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n🛑 Shutting down server gracefully...');
    server.close(() => {
      console.log('✅ Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer();
