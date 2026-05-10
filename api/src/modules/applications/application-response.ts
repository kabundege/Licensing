import type { Application, AuditLog } from './entities';

export const applicationPublicShape = (application: Application) => ({
  id: application.id,
  applicant_id: application.applicant_id,
  status: application.status,
  reviewer_id: application.reviewer_id,
  approver_id: application.approver_id,
  version: application.version,
});

export const auditLogPublicShape = (log: AuditLog) => ({
  id: log.id,
  application_id: log.application_id,
  actor_id: log.actor_id,
  from_state: log.from_state,
  to_state: log.to_state,
  event_action: log.event_action,
  document_id: log.document_id,
  metadata: log.metadata,
  timestamp: log.timestamp,
});
