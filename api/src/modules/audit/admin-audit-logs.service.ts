import { auditLogRepo } from '../../repository';
import type { AdminAuditLogsQueryDto } from '../../validation/schemas';
import {
  toComplianceAuditLogEntries,
  type ComplianceAuditLogEntry,
} from '../applications/compliance-audit-logs.service';
import { Application } from '../applications/entities';

export const listAdminFilteredAuditLogs = async (
  query: AdminAuditLogsQueryDto
): Promise<ComplianceAuditLogEntry[]> => {
  const needsApplicationJoin = Boolean(
    query.applicant_id ?? query.reviewer_id ?? query.approver_id
  );

  const qb = auditLogRepo.createQueryBuilder(`al`);

  if (needsApplicationJoin) {
    qb.innerJoin(Application, `app`, `app.id = al.application_id`);
  }
  if (query.applicant_id) {
    qb.andWhere(`app.applicant_id = :applicant_id`, {
      applicant_id: query.applicant_id,
    });
  }
  if (query.reviewer_id) {
    qb.andWhere(`app.reviewer_id = :reviewer_id`, {
      reviewer_id: query.reviewer_id,
    });
  }
  if (query.approver_id) {
    qb.andWhere(`app.approver_id = :approver_id`, {
      approver_id: query.approver_id,
    });
  }
  if (query.document_id) {
    qb.andWhere(`al.document_id = :document_id`, {
      document_id: query.document_id,
    });
  }

  qb.orderBy(`al.timestamp`, `DESC`).take(query.limit);

  const logs = await qb.getMany();
  return toComplianceAuditLogEntries(logs);
};
