import { z } from 'zod';

/**
 * Schema Zod para validação estrita de variáveis de ambiente.
 * Se faltar alguma obrigatória, a aplicação não sobe.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  APP_TIMEZONE: z.string().default('America/Sao_Paulo'),
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN é obrigatória'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter ao menos 32 caracteres'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  REFRESH_TOKEN_SECRET: z.string().min(32, 'REFRESH_TOKEN_SECRET deve ter ao menos 32 caracteres'),
  JWT_ISSUER: z.string().default('agis-digital'),
  JWT_AUDIENCE: z.string().default('agis-digital-api'),
  LOGIN_RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(900000),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  GLOBAL_RATE_LIMIT_WINDOW: z.coerce.number().int().positive().default(900000),
  GLOBAL_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map(e => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    console.error(`\n❌ Variáveis de ambiente inválidas:\n${errors}\n`);
    process.exit(1);
  }

  return result.data;
}

const env = validateEnv();

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
  appTimezone: env.APP_TIMEZONE,
  corsOrigin: env.CORS_ORIGIN,

  // JWT
  jwtSecret: env.JWT_SECRET,
  jwtAccessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  jwtIssuer: env.JWT_ISSUER,
  jwtAudience: env.JWT_AUDIENCE,

  // Refresh Token HMAC
  refreshTokenSecret: env.REFRESH_TOKEN_SECRET,

  // Rate limit
  loginRateLimitWindow: env.LOGIN_RATE_LIMIT_WINDOW,
  loginRateLimitMax: env.LOGIN_RATE_LIMIT_MAX,
  globalRateLimitWindow: env.GLOBAL_RATE_LIMIT_WINDOW,
  globalRateLimitMax: env.GLOBAL_RATE_LIMIT_MAX,

  // Logging
  logLevel: env.LOG_LEVEL,
} as const;
