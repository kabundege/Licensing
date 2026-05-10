import fs from 'fs/promises';
import path from 'path';
import type { Express } from 'express';

import { AppDataSource } from '../../database/data-source';
import { runInTransaction } from '../../database/transaction';
import { uploadsRoot } from '../../middleware/file-size-limit.middleware';
import { AppError } from '../../shared/errors/AppError';
import type { LoadedAuthUser } from '../auth/auth.types';
import { assertCanReadApplication } from '../applications/application.service';
import { Application } from '../applications/entities/application.entity';
import { AuditService } from '../audit/audit.service';
import { ALLOWED_DOCUMENT_UPLOAD_STATUSES } from './document-upload-status';
import { Document } from './entities/document.entity';

const GROUP_KEY_MAX_LEN = 256;

export function normalizeDocumentGroupKey(raw: unknown): string | null {
  if (typeof raw !== `string`) {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed.slice(0, GROUP_KEY_MAX_LEN);
}

export async function removeUploadedBasename(filename: string): Promise<void> {
  const safeName = path.basename(filename);
  const target = path.join(uploadsRoot, safeName);
  try {
    await fs.unlink(target);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== `ENOENT`) {
      throw err;
    }
  }
}

export async function persistUploadedDocument(input: {
  applicationId: string;
  uploadedByUserId: string;
  file: Express.Multer.File;
  groupKey: string | null;
}): Promise<Document> {
  const { applicationId, uploadedByUserId, file, groupKey } = input;

  try {
    return await runInTransaction(AppDataSource, async (manager) => {
      const appRepo = manager.getRepository(Application);
      const application = await appRepo.findOne({
        where: { id: applicationId },
        lock: { mode: `pessimistic_write` },
      });
      if (!application) {
        throw AppError.notFound(`Application not found`);
      }
      if (application.applicant_id !== uploadedByUserId) {
        throw AppError.unauthorized();
      }
      if (!ALLOWED_DOCUMENT_UPLOAD_STATUSES.has(application.status)) {
        throw AppError.unauthorized();
      }

      const docRepo = manager.getRepository(Document);
      const originalLabel =
        file.originalname && file.originalname.length > 0 ? file.originalname : `upload`;

      let nextVersion = 1;
      if (groupKey !== null) {
        await docRepo
          .createQueryBuilder()
          .update(Document)
          .set({ is_current: false })
          .where(`application_id = :aid`, { aid: applicationId })
          .andWhere(`group_key = :gk`, { gk: groupKey })
          .execute();

        const rawMax = await docRepo
          .createQueryBuilder(`d`)
          .select(`COALESCE(MAX(d.version), 0)`, `maxv`)
          .where(`d.application_id = :aid`, { aid: applicationId })
          .andWhere(`d.group_key = :gk`, { gk: groupKey })
          .getRawOne<{ maxv: string | number | null }>();

        const maxExisting = Number(rawMax?.maxv ?? 0);
        nextVersion = Number.isFinite(maxExisting) ? maxExisting + 1 : 1;
      }

      const row = docRepo.create({
        application_id: applicationId,
        group_key: groupKey,
        version: nextVersion,
        is_current: true,
        file_path: path.basename(file.filename),
        original_name: originalLabel.slice(0, 512),
        mime_type: file.mimetype.slice(0, 255),
        size_bytes: file.size,
        uploader_id: uploadedByUserId,
      });
      const saved = await docRepo.save(row);

      const auditService = new AuditService(manager);
      if (groupKey !== null) {
        await auditService.logDocumentVersionUpdated({
          applicationId,
          actorUserId: uploadedByUserId,
          documentId: saved.id,
          metadata: { group_key: groupKey, version: nextVersion },
        });
      } else {
        await auditService.logDocumentUploaded({
          applicationId,
          actorUserId: uploadedByUserId,
          documentId: saved.id,
        });
      }

      return saved;
    });
  } catch (err) {
    await removeUploadedBasename(file.filename);
    throw err;
  }
}

export async function loadDocumentDownloadContext(documentId: string): Promise<{
  doc: Document;
  applicant_id: string;
} | null> {
  const docRepo = AppDataSource.getRepository(Document);
  const appRepo = AppDataSource.getRepository(Application);
  const doc = await docRepo.findOne({ where: { id: documentId } });
  if (!doc) {
    return null;
  }
  const application = await appRepo.findOne({ where: { id: doc.application_id } });
  if (!application) {
    return null;
  }
  return { doc, applicant_id: application.applicant_id };
}

export async function listDocumentsForApplication(
  applicationId: string,
  actor: LoadedAuthUser,
  includeHistory: boolean
): Promise<Document[]> {
  const appRepo = AppDataSource.getRepository(Application);
  const row = await appRepo.findOne({ where: { id: applicationId } });
  if (!row) {
    throw AppError.notFound(`Application not found`);
  }
  assertCanReadApplication(actor, row);

  const docRepo = AppDataSource.getRepository(Document);
  const qb = docRepo
    .createQueryBuilder(`d`)
    .where(`d.application_id = :aid`, { aid: applicationId })
    .orderBy(`d.group_key`, `ASC`, `NULLS LAST`)
    .addOrderBy(`d.version`, `ASC`);

  if (!includeHistory) {
    qb.andWhere(`d.is_current = :cur`, { cur: true });
  }

  return qb.getMany();
}
