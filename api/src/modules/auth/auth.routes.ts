import { Router } from 'express';
import {
  restrictTo,
  requireJwt,
} from '../../middleware/auth.middleware';
import {
  adminUsersQuerySchema,
  createReviewerBodySchema,
  loginBodySchema,
  promoteBodySchema,
  promoteParamsSchema,
  signupBodySchema,
  validateBody,
  validateParams,
  validateQuery,
} from '../../validation';
import { AppPermission } from './app-permissions';

import {
  createReviewer,
  listUsers,
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

router.post(`/signup`, validateBody(signupBodySchema), signup);
router.post(
  `/login`,
  validateBody(loginBodySchema, `unauthorized`),
  login,
);

router.get(
  `/admin/users`,
  validateQuery(adminUsersQuerySchema),
  requireJwt,
  restrictTo(AppPermission.ManageUsers),
  listUsers,
);

router.patch(
  `/admin/promote/:userId`,
  validateParams(promoteParamsSchema),
  validateBody(promoteBodySchema),
  requireJwt,
  restrictTo(AppPermission.ManageUsers),
  promoteUser,
);

router.post(
  `/admin/create-reviewer`,
  validateBody(createReviewerBodySchema),
  requireJwt,
  restrictTo(AppPermission.ManageUsers),
  createReviewer,
);

router.get(`/me`, requireJwt, me);

export { router as authRouter };
