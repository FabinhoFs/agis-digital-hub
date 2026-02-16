import { AuditRepository, CreateAuditLogData } from '../repositories/audit.repository';
import { logger } from '../utils/logger';

export class AuditService {
  constructor(private readonly auditRepository = new AuditRepository()) {}

  async log(data: CreateAuditLogData): Promise<void> {
    try {
      await this.auditRepository.create(data);
    } catch (err) {
      // Auditoria não deve impedir o fluxo principal
      logger.error({ err, audit: data }, 'Failed to persist audit log');
    }
  }
}
