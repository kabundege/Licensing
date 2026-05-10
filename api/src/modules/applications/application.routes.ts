import { Router } from 'express';

import { requireJwt, requireStaffComplianceAuditAccess } from '../../middleware/auth.middleware';
import {
  applicationDocumentsQuerySchema,
  applicationIdParamsSchema,
  applicationTransitionStatusBodySchema,
  validateBody,
  validateParams,
  validateQuery,
} from '../../validation';

import { restrictToApprovePermissionWhenBodyTargetsApproved } from './application-approve-body.middleware';
import {
  createApplicationHandler,
  getApplicationByIdHandler,
  listApplicationAuditLogsHandler,
  listApplicationDocumentsHandler,
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
  `/:id/audit-logs`,
  requireStaffComplianceAuditAccess,
  validateParams(applicationIdParamsSchema),
  listApplicationAuditLogsHandler
);
router.get(
  `/:id`,
  validateParams(applicationIdParamsSchema),
  getApplicationByIdHandler
);
router.get(
  `/:id/documents`,
  validateParams(applicationIdParamsSchema),
  validateQuery(applicationDocumentsQuerySchema),
  listApplicationDocumentsHandler
);
router.patch(
  `/:id/status`,
  validateParams(applicationIdParamsSchema),
  validateBody(applicationTransitionStatusBodySchema),
  restrictToApprovePermissionWhenBodyTargetsApproved,
  patchApplicationStatus
);

export { router as applicationRouter };
