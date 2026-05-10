import { In } from 'typeorm';

import { AppDataSource } from '../../database/data-source';
import { auditLogRepo, userRepo } from '../../repository';
import { AppError } from '../../shared/errors/AppError';
import {
  AUDIT_ACTION_DOCUMENT_UPLOADED,
  AUDIT_ACTION_DOCUMENT_VERSION_UPDATED,
} from '../audit/audit-actions';
import { RoleName } from '../auth/entities';
import { Document } from '../documents/entities/document.entity';

import { humanReadableAuditAction } from './audit-action-labels';
import { Application, ApplicationStatus, AuditLog } from './entities';

const DOCUMENT_AUDIT_ACTIONS = new Set<string>([
  AUDIT_ACTION_DOCUMENT_UPLOADED,
  AUDIT_ACTION_DOCUMENT_VERSION_UPDATED,
]);

const ROLE_RANK: Record<RoleName, number> = {
  [RoleName.APPLICANT]: 1,
  [RoleName.REVIEWER]: 2,
  [RoleName.APPROVER]: 3,
  [RoleName.ADMIN]: 4,
};

const highestSeniorityRole = (roleNames: RoleName[]): RoleName => {
  if (roleNames.length === 0) {
    return RoleName.APPLICANT;
  }
  return roleNames.reduce((best, r) => (ROLE_RANK[r] > ROLE_RANK[best] ? r : best));
};

export type ComplianceAuditLogEntry = {
  id: string;
  application_id: string;
  actor_id: string;
  actor: { name: string; role: RoleName };
  action_label: string;
  event_action: string | null;
  from_state: ApplicationStatus | null;
  to_state: ApplicationStatus | null;
  document_id: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: Date;
};

const enrichDocumentMetadata = (
  log: AuditLog,
  docById: Map<string, Document>
): Record<string, unknown> | null => {
  const action = log.event_action;
  if (
    !log.document_id ||
    (action !== AUDIT_ACTION_DOCUMENT_UPLOADED &&
      action !== AUDIT_ACTION_DOCUMENT_VERSION_UPDATED)
  ) {
    return log.metadata;
  }
  const doc = docById.get(log.document_id);
  if (!doc) {
    return log.metadata;
  }
  return {
    ...(log.metadata ?? {}),
    version: doc.version,
    original_name: doc.original_name,
  };
};

export const toComplianceAuditLogEntries = async (
  logs: AuditLog[]
): Promise<ComplianceAuditLogEntry[]> => {
  const actorIds = [...new Set(logs.map((l) => l.actor_id))];
  const userRows =
    actorIds.length === 0
      ? []
      : await userRepo.find({
          where: { id: In(actorIds) },
          relations: { roles: true },
        });
  const userById = new Map(userRows.map((u) => [u.id, u]));

  const docIds = [
    ...new Set(
      logs
        .filter(
          (l) =>
            Boolean(l.document_id) &&
            Boolean(l.event_action) &&
            DOCUMENT_AUDIT_ACTIONS.has(l.event_action!)
        )
        .map((l) => l.document_id!)
    ),
  ];
  const docRepo = AppDataSource.getRepository(Document);
  const documents =
    docIds.length === 0 ? [] : await docRepo.find({ where: { id: In(docIds) } });
  const docById = new Map(documents.map((d) => [d.id, d]));

  return logs.map((log) => {
    const row = userById.get(log.actor_id);
    const roleNames = (row?.roles ?? []).map((r) => r.name);
    return {
      id: log.id,
      application_id: log.application_id,
      actor_id: log.actor_id,
      actor: {
        name: row?.name ?? `Unknown user`,
        role: highestSeniorityRole(roleNames),
      },
      action_label: humanReadableAuditAction(log),
      event_action: log.event_action,
      from_state: log.from_state,
      to_state: log.to_state,
      document_id: log.document_id,
      metadata: enrichDocumentMetadata(log, docById),
      timestamp: log.timestamp,
    };
  });
};

export const listComplianceAuditLogs = async (
  applicationId: string
): Promise<ComplianceAuditLogEntry[]> => {
  const appRepo = AppDataSource.getRepository(Application);
  const exists = await appRepo.exist({ where: { id: applicationId } });
  if (!exists) {
    throw AppError.notFound(`Application not found`);
  }

  const logs = await auditLogRepo.find({
    where: { application_id: applicationId },
    order: { timestamp: `DESC` },
  });

  return toComplianceAuditLogEntries(logs);
};
