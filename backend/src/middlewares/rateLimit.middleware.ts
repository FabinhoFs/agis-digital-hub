import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (substituir por Redis em produção se necessário)
const store = new Map<string, RateLimitEntry>();

export function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.loginRateLimitWindow });
    return next();
  }

  if (entry.count >= config.loginRateLimitMax) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      status: 429,
      message: 'Muitas tentativas de login. Tente novamente mais tarde.',
    });
    return;
  }

  entry.count++;
  next();
}

// Limpeza periódica (a cada 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 300_000);
