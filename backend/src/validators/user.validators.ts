import { z } from 'zod';

const roles = ['ADMIN', 'GERENTE', 'SUPERVISOR', 'COLABORADOR', 'USUARIO'] as const;

export const createUserSchema = z.object({
  nome: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(255),
  email: z.string().trim().email('Email inválido').max(255),
  senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres').max(128),
  role: z.enum(roles).optional(),
  company_id: z.string().uuid('company_id deve ser UUID válido').optional(),
});

export const updateUserSchema = z.object({
  nome: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').max(255).optional(),
  email: z.string().trim().email('Email inválido').max(255).optional(),
  senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres').max(128).optional(),
  role: z.enum(roles).optional(),
  company_id: z.string().uuid('company_id deve ser UUID válido').nullable().optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().max(255).optional(),
  role: z.enum(roles).optional(),
  ativo: z.preprocess(val => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean().optional()),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid('ID deve ser UUID válido'),
});
