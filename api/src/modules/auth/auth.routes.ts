import { Router } from 'express';
import {
  restrictTo,
  requireJwt,
} from '../../middleware/auth.middleware';

import { AppPermission } from './app-permissions';

import {
  createReviewer,
  promoteUser,
} from './admin.controller';

import {
  signup,
  login,
  me,
} from './auth.controller';

const router = Router();

router.get(`/health`, (_req, res) =>
  res.json({ module: `auth`, status: `ok` })
);

router.post(`/signup`, signup);
router.post(`/login`, login);

router.patch(
  `/admin/promote/:userId`,
  requireJwt,
  restrictTo(AppPermission.ManageUsers),
  promoteUser,
);

router.post(
  `/admin/create-reviewer`,
  requireJwt,
  restrictTo(AppPermission.ManageUsers),
  createReviewer,
);

router.get(`/me`, requireJwt, me);

export { router as authRouter };
