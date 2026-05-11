import type { EntityManager } from 'typeorm';

import { AuditLog } from '../applications/entities/audit-log.entity';
import {
  AUDIT_ACTION_DOCUMENT_UPLOADED,
  AUDIT_ACTION_DOCUMENT_VERSION_UPDATED,
} from './audit-actions';

export type DocumentUploadedAuditPayload = {
  applicationId: string;
  actorUserId: string;
  documentId: string;
};

export type DocumentVersionUpdatedAuditPayload = {
  applicationId: string;
  actorUserId: string;
  documentId: string;
  metadata: { group_key: string; version: number };
};

export class AuditService {
  constructor(private readonly manager: EntityManager) {}

  async logDocumentUploaded(payload: DocumentUploadedAuditPayload): Promise<void> {
    const auditRepo = this.manager.getRepository(AuditLog);
    await auditRepo.save(
      auditRepo.create({
        application_id: payload.applicationId,
        actor_id: payload.actorUserId,
        from_state: null,
        to_state: null,
        event_action: AUDIT_ACTION_DOCUMENT_UPLOADED,
        document_id: payload.documentId,
        metadata: null,
      })
    );
  }

  async logDocumentVersionUpdated(payload: DocumentVersionUpdatedAuditPayload): Promise<void> {
    const auditRepo = this.manager.getRepository(AuditLog);
    await auditRepo.save(
      auditRepo.create({
        application_id: payload.applicationId,
        actor_id: payload.actorUserId,
        from_state: null,
        to_state: null,
        event_action: AUDIT_ACTION_DOCUMENT_VERSION_UPDATED,
        document_id: payload.documentId,
        metadata: {
          group_key: payload.metadata.group_key,
          version: payload.metadata.version,
        },
      })
    );
  }
}
