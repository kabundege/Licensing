import { Router } from 'express';

import { requireJwt, restrictTo } from '../../middleware/auth.middleware';
import { AppPermission } from '../auth/app-permissions';

import { getDashboardStatsHandler } from './admin.controller';

const router = Router();

router.get(
  `/dashboard-stats`,
  requireJwt,
  restrictTo(AppPermission.ViewDashboardStats),
  getDashboardStatsHandler
);

export { router as adminRouter };
