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
  requireJwt,
  restrictTo(AppPermission.ManageUsers),
  validateQuery(adminUsersQuerySchema),
  listUsers,
);

router.patch(
  `/admin/promote/:userId`,
  requireJwt,
  restrictTo(AppPermission.ManageUsers),
  validateParams(promoteParamsSchema),
  validateBody(promoteBodySchema),
  promoteUser,
);

router.post(
  `/admin/create-reviewer`,
  requireJwt,
  restrictTo(AppPermission.ManageUsers),
  validateBody(createReviewerBodySchema),
  createReviewer,
);

router.get(`/me`, requireJwt, me);

export { router as authRouter };
