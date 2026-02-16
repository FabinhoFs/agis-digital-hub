import { Role } from '@prisma/client';

// DTO para criação de usuário
export interface CreateUserDTO {
  nome: string;
  email: string;
  senha: string;
  role?: Role;
  company_id?: string;
}

// DTO para atualização de usuário
export interface UpdateUserDTO {
  nome?: string;
  email?: string;
  senha?: string;
  role?: Role;
  company_id?: string | null;
}

// Resposta pública do usuário (sem senha_hash)
export interface UserResponse {
  id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

// Paginação
export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: Role;
  ativo?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Erro padronizado
export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}
