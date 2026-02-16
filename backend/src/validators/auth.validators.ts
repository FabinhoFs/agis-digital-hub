import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255),
  senha: z.string().min(1, 'Senha é obrigatória').max(128),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token é obrigatório'),
});

export const logoutSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token é obrigatório'),
});
