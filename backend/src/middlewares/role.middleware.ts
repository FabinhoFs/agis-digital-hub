import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthRequest } from './auth.middleware';
import { isRoleAtLeast } from '../utils/roles';

/**
 * Middleware que exige role mínima.
 * Deve ser usado APÓS requireAuth().
 * Retorna 403 (não 401) se o nível for insuficiente.
 */
export function requireRole(minRole: Role) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      const error = new Error('Usuário não autenticado');
      (error as any).status = 401;
      throw error;
    }

    if (!isRoleAtLeast(user.role as Role, minRole)) {
      console.log(
        `[AUDIT] ACCESS_DENIED user_id=${user.id} role=${user.role} required=${minRole} path=${req.method} ${req.originalUrl} at=${new Date().toISOString()}`,
      );
      const error = new Error('Acesso negado: permissão insuficiente');
      (error as any).status = 403;
      throw error;
    }

    next();
  };
}
