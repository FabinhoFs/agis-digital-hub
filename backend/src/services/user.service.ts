import argon2 from 'argon2';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDTO, UpdateUserDTO, UserResponse, PaginationQuery, PaginatedResponse } from '../types';
import { toLocalISO } from '../utils/timezone';
import { User } from '@prisma/client';

export class UserService {
  constructor(private readonly userRepository = new UserRepository()) {}

  private toResponse(user: User): UserResponse {
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      ativo: user.ativo,
      company_id: user.company_id,
      created_at: toLocalISO(user.created_at),
      updated_at: toLocalISO(user.updated_at),
    };
  }

  async create(dto: CreateUserDTO): Promise<UserResponse> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      const error = new Error('Email já cadastrado');
      (error as any).status = 409;
      throw error;
    }

    const senha_hash = await argon2.hash(dto.senha, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const user = await this.userRepository.create({
      nome: dto.nome,
      email: dto.email.toLowerCase().trim(),
      senha_hash,
      role: dto.role,
      company_id: dto.company_id,
    });

    return this.toResponse(user);
  }

  async findById(id: string): Promise<UserResponse> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      const error = new Error('Usuário não encontrado');
      (error as any).status = 404;
      throw error;
    }
    return this.toResponse(user);
  }

  async findMany(query: PaginationQuery): Promise<PaginatedResponse<UserResponse>> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    const { users, total } = await this.userRepository.findMany({ ...query, page, limit });

    return {
      data: users.map(u => this.toResponse(u)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, dto: UpdateUserDTO): Promise<UserResponse> {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      const error = new Error('Usuário não encontrado');
      (error as any).status = 404;
      throw error;
    }

    if (dto.email && dto.email !== existing.email) {
      const emailTaken = await this.userRepository.findByEmail(dto.email);
      if (emailTaken) {
        const error = new Error('Email já cadastrado');
        (error as any).status = 409;
        throw error;
      }
    }

    const updateData: any = {};
    if (dto.nome) updateData.nome = dto.nome;
    if (dto.email) updateData.email = dto.email.toLowerCase().trim();
    if (dto.role) updateData.role = dto.role;
    if (dto.company_id !== undefined) updateData.company_id = dto.company_id;

    if (dto.senha) {
      updateData.senha_hash = await argon2.hash(dto.senha, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });
    }

    const user = await this.userRepository.update(id, updateData);
    return this.toResponse(user);
  }

  async deactivate(id: string): Promise<UserResponse> {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      const error = new Error('Usuário não encontrado');
      (error as any).status = 404;
      throw error;
    }

    const user = await this.userRepository.softDelete(id);
    return this.toResponse(user);
  }
}
