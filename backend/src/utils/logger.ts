import pino from 'pino';
import { config } from '../config';

export const logger = pino({
  level: config.logLevel,
  transport:
    config.nodeEnv === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['senha', 'senha_hash', 'password', 'token', 'refresh_token', 'authorization', 'req.headers.authorization'],
    censor: '[REDACTED]',
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

/**
 * Cria child logger com contexto de request (request_id, user_id).
 */
export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({ request_id: requestId, user_id: userId });
}
