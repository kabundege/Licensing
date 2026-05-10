import type { EntityManager } from 'typeorm';

import { AuditLog } from '../applications/entities/audit-log.entity';
import { AppError } from '../../shared/errors/AppError';
import {
  AUDIT_ACTION_DOCUMENT_UPLOADED,
  AUDIT_ACTION_DOCUMENT_VERSION_UPDATED,
} from './audit-actions';

export type PromotionAuditPayload = {
  promotedUserId: string;
  performedByUserId: string;
  addedRole: string;
};

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
  constructor(private readonly _manager?: EntityManager) {}

  async logPromotion(payload: PromotionAuditPayload): Promise<void> {
    void this._manager;
    if (process.env.NODE_ENV !== `production`) {
      console.log(`[AuditService] logPromotion`, payload);
    }
  }

  async logDocumentUploaded(payload: DocumentUploadedAuditPayload): Promise<void> {
    const mgr = this._manager;
    if (!mgr) {
      throw new AppError(
        `INTERNAL_ERROR`,
        `Transactional EntityManager required for audit persistence`,
        500
      );
    }
    const auditRepo = mgr.getRepository(AuditLog);
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
    const mgr = this._manager;
    if (!mgr) {
      throw new AppError(
        `INTERNAL_ERROR`,
        `Transactional EntityManager required for audit persistence`,
        500
      );
    }
    const auditRepo = mgr.getRepository(AuditLog);
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
