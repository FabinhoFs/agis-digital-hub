import argon2 from 'argon2';
import { Role } from '@prisma/client';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDTO, UpdateUserDTO, UserResponse, PaginationQuery, PaginatedResponse } from '../types';
import { toLocalISO } from '../utils/timezone';
import { getRoleLevel, isRoleAbove } from '../utils/roles';
import { User } from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

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

  async create(dto: CreateUserDTO, actor: AuthenticatedUser): Promise<UserResponse> {
    const actorRole = actor.role as Role;
    const targetRole = dto.role || 'USUARIO';

    // Impedir criação de role superior ou igual ao ator (exceto ADMIN criando ADMIN)
    this.assertCanAssignRole(actorRole, targetRole as Role, 'criar');

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

    console.log(
      `[AUDIT] USER_CREATED actor=${actor.id} target=${user.id} role=${targetRole} at=${new Date().toISOString()}`,
    );

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

  async update(id: string, dto: UpdateUserDTO, actor: AuthenticatedUser): Promise<UserResponse> {
    const actorRole = actor.role as Role;

    const existing = await this.userRepository.findById(id);
    if (!existing) {
      const error = new Error('Usuário não encontrado');
      (error as any).status = 404;
      throw error;
    }

    // Não pode alterar usuário com role >= à sua (exceto ADMIN)
    if (!isRoleAbove(actorRole, existing.role) && actorRole !== 'ADMIN') {
      console.log(
        `[AUDIT] ESCALATION_BLOCKED actor=${actor.id}(${actorRole}) tried to update target=${id}(${existing.role}) at=${new Date().toISOString()}`,
      );
      const error = new Error('Não é possível alterar usuário com permissão igual ou superior');
      (error as any).status = 403;
      throw error;
    }

    // Se está alterando role, verificar se pode atribuir a nova role
    if (dto.role) {
      this.assertCanAssignRole(actorRole, dto.role as Role, 'promover');

      // Impedir rebaixamento do último ADMIN
      if (existing.role === 'ADMIN' && dto.role !== 'ADMIN') {
        const activeAdmins = await this.userRepository.countByRole('ADMIN', true);
        if (activeAdmins <= 1) {
          const error = new Error('Não é possível remover o último ADMIN do sistema');
          (error as any).status = 403;
          throw error;
        }
      }

      if (dto.role !== existing.role) {
        console.log(
          `[AUDIT] ROLE_CHANGED actor=${actor.id} target=${id} from=${existing.role} to=${dto.role} at=${new Date().toISOString()}`,
        );
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

    // Não pode desativar a si mesmo
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

    // Não pode desativar usuário com role >= à sua (exceto ADMIN com target não-ADMIN)
    if (!isRoleAbove(actorRole, existing.role) && !(actorRole === 'ADMIN' && existing.role !== 'ADMIN')) {
      console.log(
        `[AUDIT] DEACTIVATION_BLOCKED actor=${actor.id}(${actorRole}) target=${id}(${existing.role}) at=${new Date().toISOString()}`,
      );
      const error = new Error('Não é possível desativar usuário com permissão igual ou superior');
      (error as any).status = 403;
      throw error;
    }

    // Impedir remoção do último ADMIN ativo
    if (existing.role === 'ADMIN') {
      const activeAdmins = await this.userRepository.countByRole('ADMIN', true);
      if (activeAdmins <= 1) {
        const error = new Error('Não é possível desativar o último ADMIN do sistema');
        (error as any).status = 403;
        throw error;
      }
    }

    const user = await this.userRepository.softDelete(id);

    console.log(
      `[AUDIT] USER_DEACTIVATED actor=${actor.id} target=${id} role=${existing.role} at=${new Date().toISOString()}`,
    );

    return this.toResponse(user);
  }

  /**
   * Verifica se o ator pode atribuir a role alvo.
   * - ADMIN pode atribuir qualquer role (incluindo ADMIN).
   * - Demais só podem atribuir roles estritamente inferiores à sua.
   */
  private assertCanAssignRole(actorRole: Role, targetRole: Role, action: string): void {
    if (actorRole === 'ADMIN') return; // ADMIN pode tudo

    if (getRoleLevel(targetRole) >= getRoleLevel(actorRole)) {
      console.log(
        `[AUDIT] ESCALATION_BLOCKED role=${actorRole} tried to ${action} role=${targetRole} at=${new Date().toISOString()}`,
      );
      const error = new Error(`Não é possível ${action} usuário com role igual ou superior à sua`);
      (error as any).status = 403;
      throw error;
    }
  }
}
