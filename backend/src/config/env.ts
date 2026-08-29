import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PREFIX: z.string().default('/api'),
  PYTHON_SERVICE_URL: z.string().url().default('http://localhost:8000'),
  PYTHON_SERVICE_API_KEY: z.string().min(16),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  MAX_FILE_SIZE: z.coerce.number().default(10485760),
  NOTION_API_KEY: z.string().optional(),
  NOTION_DATABASE_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

export function loadEnv(): Env {
  if (env) return env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }

  env = result.data;
  return env;
}

export function getEnv(): Env {
  if (!env) {
    return loadEnv();
  }
  return env;
}