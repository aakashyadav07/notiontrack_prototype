import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { getEnv } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { attachUser } from './middleware/auth';
import routes from './routes';

const env = getEnv();

export function createApp(): express.Application {
  const app = express();

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  app.use(attachUser);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(env.API_PREFIX, routes);

  app.use(`${env.API_PREFIX}/docs`, express.static('docs'));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}