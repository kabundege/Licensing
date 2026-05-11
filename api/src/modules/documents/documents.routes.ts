import { Router } from 'express';

import { requireJwt } from '../../middleware/auth.middleware';
import { uploadSingleFileMiddleware } from '../../middleware/file-size-limit.middleware';
import {
  applicationDocumentParamsSchema,
  documentDownloadParamsSchema,
  validateParams,
} from '../../validation';
import { downloadDocumentById, uploadDocumentForApplication } from './documents.controller';

const router = Router();

router.get(`/health`, (_req, res) =>
  res.json({ module: `documents`, status: `ok` })
);

router.post(
  `/:applicationId`,
  requireJwt,
  validateParams(applicationDocumentParamsSchema),
  uploadSingleFileMiddleware,
  uploadDocumentForApplication
);

router.get(
  `/:id/download`,
  requireJwt,
  validateParams(documentDownloadParamsSchema),
  downloadDocumentById
);

export { router as documentsRouter };
