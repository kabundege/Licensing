import fs from 'fs/promises';
import path from 'path';
import type { Express } from 'express';

import { AppDataSource } from '../../database/data-source';
import { runInTransaction } from '../../database/transaction';
import { uploadsRoot } from '../../middleware/file-size-limit.middleware';
import { AppError } from '../../shared/errors/AppError';
import { Application } from '../applications/entities/application.entity';
import { AuditService } from '../audit/audit.service';
import { ALLOWED_DOCUMENT_UPLOAD_STATUSES } from './document-upload-status';
import { Document } from './entities/document.entity';

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
}): Promise<Document> {
  const { applicationId, uploadedByUserId, file } = input;

  try {
    return await runInTransaction(AppDataSource, async (manager) => {
      const appRepo = manager.getRepository(Application);
      const application = await appRepo.findOne({ where: { id: applicationId } });
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
      const row = docRepo.create({
        application_id: applicationId,
        file_path: path.basename(file.filename),
        original_name: originalLabel.slice(0, 512),
        mime_type: file.mimetype.slice(0, 255),
        size_bytes: file.size,
        uploader_id: uploadedByUserId,
      });
      const saved = await docRepo.save(row);

      const auditService = new AuditService(manager);
      await auditService.logDocumentUploaded({
        applicationId,
        actorUserId: uploadedByUserId,
        documentId: saved.id,
      });

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
