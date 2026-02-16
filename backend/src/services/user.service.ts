import argon2 from 'argon2';
import { Role } from '@prisma/client';
import { UserRepository } from '../repositories/user.repository';
import { AuditService } from './audit.service';
import { CreateUserDTO, UpdateUserDTO, UserResponse, PaginationQuery, PaginatedResponse } from '../types';
import { toLocalISO } from '../utils/timezone';
import { getRoleLevel, isRoleAbove } from '../utils/roles';
import { logger } from '../utils/logger';
import { User } from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

export class UserService {
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly auditService = new AuditService(),
  ) {}

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

  async create(dto: CreateUserDTO, actor: AuthenticatedUser): Promise<UserResponse> {
    const actorRole = actor.role as Role;
    const targetRole = dto.role || 'USUARIO';

    this.assertCanAssignRole(actorRole, targetRole as Role, 'criar', actor.id);

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
      role: targetRole as Role,
      company_id: dto.company_id,
    });

    logger.info({ actor_id: actor.id, target_id: user.id, role: targetRole }, 'USER_CREATED');
    await this.auditService.log({
      user_id: actor.id,
      action: 'USER_CREATED',
      entity: 'user',
      entity_id: user.id,
      metadata: { role: targetRole, email: user.email },
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
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(id: string, dto: UpdateUserDTO, actor: AuthenticatedUser): Promise<UserResponse> {
    const actorRole = actor.role as Role;

    const existing = await this.userRepository.findById(id);
    if (!existing) {
      const error = new Error('Usuário não encontrado');
      (error as any).status = 404;
      throw error;
    }

    if (!isRoleAbove(actorRole, existing.role) && actorRole !== 'ADMIN') {
      logger.warn({ actor_id: actor.id, actor_role: actorRole, target_id: id, target_role: existing.role }, 'ESCALATION_BLOCKED');
      await this.auditService.log({
        user_id: actor.id,
        action: 'ESCALATION_BLOCKED',
        entity: 'user',
        entity_id: id,
        metadata: { actor_role: actorRole, target_role: existing.role, operation: 'update' },
      });
      const error = new Error('Não é possível alterar usuário com permissão igual ou superior');
      (error as any).status = 403;
      throw error;
    }

    if (dto.role) {
      this.assertCanAssignRole(actorRole, dto.role as Role, 'promover', actor.id);

      if (existing.role === 'ADMIN' && dto.role !== 'ADMIN') {
        const activeAdmins = await this.userRepository.countByRole('ADMIN', true);
        if (activeAdmins <= 1) {
          const error = new Error('Não é possível remover o último ADMIN do sistema');
          (error as any).status = 403;
          throw error;
        }
      }

      if (dto.role !== existing.role) {
        logger.info({ actor_id: actor.id, target_id: id, from: existing.role, to: dto.role }, 'ROLE_CHANGED');
        await this.auditService.log({
          user_id: actor.id,
          action: 'ROLE_CHANGED',
          entity: 'user',
          entity_id: id,
          metadata: { from: existing.role, to: dto.role },
        });
      }
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

  async deactivate(id: string, actor: AuthenticatedUser): Promise<UserResponse> {
    const actorRole = actor.role as Role;

    if (actor.id === id) {
      const error = new Error('Não é possível desativar o próprio usuário');
      (error as any).status = 403;
      throw error;
    }

    const existing = await this.userRepository.findById(id);
    if (!existing) {
      const error = new Error('Usuário não encontrado');
      (error as any).status = 404;
      throw error;
    }

    if (!isRoleAbove(actorRole, existing.role) && !(actorRole === 'ADMIN' && existing.role !== 'ADMIN')) {
      logger.warn({ actor_id: actor.id, actor_role: actorRole, target_id: id, target_role: existing.role }, 'DEACTIVATION_BLOCKED');
      await this.auditService.log({
        user_id: actor.id,
        action: 'DEACTIVATION_BLOCKED',
        entity: 'user',
        entity_id: id,
        metadata: { actor_role: actorRole, target_role: existing.role },
      });
      const error = new Error('Não é possível desativar usuário com permissão igual ou superior');
      (error as any).status = 403;
      throw error;
    }

    if (existing.role === 'ADMIN') {
      const activeAdmins = await this.userRepository.countByRole('ADMIN', true);
      if (activeAdmins <= 1) {
        const error = new Error('Não é possível desativar o último ADMIN do sistema');
        (error as any).status = 403;
        throw error;
      }
    }

    const user = await this.userRepository.softDelete(id);

    logger.info({ actor_id: actor.id, target_id: id, target_role: existing.role }, 'USER_DEACTIVATED');
    await this.auditService.log({
      user_id: actor.id,
      action: 'USER_DEACTIVATED',
      entity: 'user',
      entity_id: id,
      metadata: { role: existing.role, email: existing.email },
    });

    return this.toResponse(user);
  }

  private assertCanAssignRole(actorRole: Role, targetRole: Role, action: string, actorId: string): void {
    if (actorRole === 'ADMIN') return;

    if (getRoleLevel(targetRole) >= getRoleLevel(actorRole)) {
      logger.warn({ actor_id: actorId, actor_role: actorRole, target_role: targetRole }, 'ESCALATION_BLOCKED');
      this.auditService.log({
        user_id: actorId,
        action: 'ESCALATION_BLOCKED',
        entity: 'user',
        metadata: { actor_role: actorRole, target_role: targetRole, operation: action },
      });
      const error = new Error(`Não é possível ${action} usuário com role igual ou superior à sua`);
      (error as any).status = 403;
      throw error;
    }
  }
}
