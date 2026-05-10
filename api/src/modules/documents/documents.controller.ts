import path from 'path';
import type { RequestHandler } from 'express';

import { uploadsRoot } from '../../middleware/file-size-limit.middleware';
import { AppError } from '../../shared/errors/AppError';
import { loadDocumentDownloadContext, persistUploadedDocument } from './documents.service';
import { userMayDownloadApplicationDocument } from './documents.download-policy';

export const uploadDocumentForApplication: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      next(AppError.unauthorized(`Invalid session`));
      return;
    }
    if (!req.file) {
      next(AppError.badRequest(`File is required`));
      return;
    }

    const saved = await persistUploadedDocument({
      applicationId: req.params.applicationId!,
      uploadedByUserId: user.id,
      file: req.file,
    });

    res.status(201).json({
      success: true,
      data: {
        id: saved.id,
        application_id: saved.application_id,
        file_path: saved.file_path,
        original_name: saved.original_name,
        mime_type: saved.mime_type,
        size_bytes: saved.size_bytes,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const downloadDocumentById: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      next(AppError.unauthorized(`Invalid session`));
      return;
    }

    const ctx = await loadDocumentDownloadContext(req.params.id!);
    if (!ctx) {
      next(AppError.notFound(`Document not found`));
      return;
    }

    if (!userMayDownloadApplicationDocument(user, ctx.applicant_id)) {
      next(AppError.unauthorized());
      return;
    }

    const diskPath = path.join(uploadsRoot, path.basename(ctx.doc.file_path));
    res.download(diskPath, ctx.doc.original_name);
  } catch (err) {
    next(err);
  }
};
