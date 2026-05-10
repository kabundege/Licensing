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
  validateParams(applicationDocumentParamsSchema),
  requireJwt,
  uploadSingleFileMiddleware,
  uploadDocumentForApplication
);

router.get(
  `/:id/download`,
  validateParams(documentDownloadParamsSchema),
  requireJwt,
  downloadDocumentById
);

export { router as documentsRouter };
