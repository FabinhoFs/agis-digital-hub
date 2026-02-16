import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

function createRateLimiter(opts: { window: number; max: number; message: string }) {
  // In-memory store (substituir por Redis em produção se necessário)
  const store = new Map<string, RateLimitEntry>();

  // Limpeza periódica (a cada 5 min)
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 300_000);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + opts.window });
      return next();
    }

    if (entry.count >= opts.max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({
        status: 429,
        message: opts.message,
      });
      return;
    }

    entry.count++;
    next();
  };
}

export const loginRateLimit = createRateLimiter({
  window: config.loginRateLimitWindow,
  max: config.loginRateLimitMax,
  message: 'Muitas tentativas de login. Tente novamente mais tarde.',
});

export const globalRateLimit = createRateLimiter({
  window: config.globalRateLimitWindow,
  max: config.globalRateLimitMax,
  message: 'Muitas requisições. Tente novamente mais tarde.',
});
