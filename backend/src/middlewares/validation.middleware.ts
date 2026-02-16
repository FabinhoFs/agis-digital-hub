import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware de validação usando Zod.
 * Valida body, query ou params conforme especificado.
 */
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        error.errors.forEach(err => {
          const field = err.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(err.message);
        });

        return res.status(422).json({
          status: 422,
          message: 'Erro de validação',
          errors,
        });
      }
      next(error);
    }
  };
}
