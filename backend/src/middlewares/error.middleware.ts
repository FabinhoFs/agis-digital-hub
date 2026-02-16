import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const status = err.status || 500;
  const requestId = (req as any).requestId;

  const message = status === 500 && process.env.NODE_ENV === 'production'
    ? 'Erro interno do servidor'
    : err.message || 'Erro interno do servidor';

  if (status >= 500) {
    logger.error({ err, request_id: requestId, path: req.path, method: req.method }, 'Internal server error');
  }

  const response: any = { status, message };

  if (err.errors) {
    response.errors = err.errors;
  }

  // Nunca expor stack trace
  res.status(status).json(response);
}
