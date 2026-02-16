import { prisma } from '../config/prisma';

export interface CreateAuditLogData {
  user_id?: string;
  action: string;
  entity: string;
  entity_id?: string;
  metadata?: Record<string, any>;
}

export class AuditRepository {
  async create(data: CreateAuditLogData): Promise<void> {
    await prisma.auditLog.create({
      data: {
        user_id: data.user_id,
        action: data.action,
        entity: data.entity,
        entity_id: data.entity_id,
        metadata: data.metadata ?? {},
      },
    });
  }
}
