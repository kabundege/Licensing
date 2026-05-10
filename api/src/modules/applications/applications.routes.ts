import { Router } from 'express';

import { requireJwt } from '../../middleware/auth.middleware';
import {
  applicationStatusParamsSchema,
  applicationTransitionStatusBodySchema,
  validateBody,
  validateParams,
} from '../../validation';

import { patchApplicationStatus } from './applications.controller';

const router = Router();

router.get(`/health`, (_req, res) =>
  res.json({ module: `applications`, status: `ok` })
);

router.patch(
  `/:applicationId/status`,
  validateParams(applicationStatusParamsSchema),
  validateBody(applicationTransitionStatusBodySchema),
  requireJwt,
  patchApplicationStatus
);

export { router as applicationsRouter };
