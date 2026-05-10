import { Router } from 'express';

import { requireJwt } from '../../middleware/auth.middleware';
import {
  applicationIdParamsSchema,
  applicationTransitionStatusBodySchema,
  validateBody,
  validateParams,
} from '../../validation';

import { restrictToApprovePermissionWhenBodyTargetsApproved } from './application-approve-body.middleware';
import {
  createApplicationHandler,
  getApplicationByIdHandler,
  listApplicationsHandler,
  patchApplicationStatus,
} from './applications.controller';

const router = Router();

router.get(`/health`, (_req, res) =>
  res.json({ module: `applications`, status: `ok` })
);

router.use(requireJwt);

router.get(`/`, listApplicationsHandler);
router.post(`/`, createApplicationHandler);
router.get(
  `/:id`,
  validateParams(applicationIdParamsSchema),
  getApplicationByIdHandler
);
router.patch(
  `/:id/status`,
  validateParams(applicationIdParamsSchema),
  validateBody(applicationTransitionStatusBodySchema),
  restrictToApprovePermissionWhenBodyTargetsApproved,
  patchApplicationStatus
);

export { router as applicationRouter };
