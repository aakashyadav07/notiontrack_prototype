import { createApp } from './app';
import { getEnv } from './config/env';
import { prisma } from './config/database';
import './jobs/timetableJob';
import './jobs/seatAllocationJob';
import './jobs/invigilatorJob';

const env = getEnv();

async function startServer(): Promise<void> {
  const app = createApp();

  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT}`);
      console.log(`📚 API docs available at http://localhost:${env.PORT}${env.API_PREFIX}/docs`);
      console.log(`🌍 Environment: ${env.NODE_ENV}`);
    });

    const gracefulShutdown = async (signal: string): Promise<void> => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('✅ Database disconnected');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('❌ Forced shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();