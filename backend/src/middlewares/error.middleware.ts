import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || 500;
  const message = status === 500 && process.env.NODE_ENV === 'production'
    ? 'Erro interno do servidor'
    : err.message || 'Erro interno do servidor';

  const response: ApiError = { status, message };

  if (err.errors) {
    response.errors = err.errors;
  }

  if (process.env.NODE_ENV === 'development' && status === 500) {
    console.error('[ERROR]', err);
  }

  res.status(status).json(response);
}
