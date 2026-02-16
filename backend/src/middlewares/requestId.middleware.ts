import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Middleware que gera um request_id único para cada requisição.
 * Injeta no req e no header de resposta.
 */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const id = crypto.randomUUID();
  (req as any).requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
