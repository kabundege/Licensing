import { Router } from 'express';

import { requireAdminRole, requireJwt } from '../../middleware/auth.middleware';

import { getRegulatorySummaryHandler } from './analytics.controller';

const router = Router();

router.get(
  `/summary`,
  requireJwt,
  requireAdminRole,
  getRegulatorySummaryHandler
);

export { router as analyticsRouter };
