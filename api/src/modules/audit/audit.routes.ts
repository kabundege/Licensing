import { Router } from 'express';

import { requireJwt, requireAdminRole } from '../../middleware/auth.middleware';
import {
    validateQuery,
    adminAuditLogsQuerySchema,
} from '../../validation';

import { listAdminAuditLogsHandler } from './audit.controller';

const router = Router();

router.get(`/health`, (_req, res) => res.json({ module: `audit`, status: `stub` }));

router.get(
    `/logs`,
    requireJwt,
    requireAdminRole,
    validateQuery(adminAuditLogsQuerySchema),
    listAdminAuditLogsHandler
);

export { router as auditRouter };
