import { Router } from 'express';
import {
  restrictTo,
  requireJwt,
} from '../../middleware/auth.middleware';
import {
  createReviewerBodySchema,
  loginBodySchema,
  promoteParamsSchema,
  signupBodySchema,
  validateBody,
  validateParams,
} from '../../validation';

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

router.post(`/signup`, validateBody(signupBodySchema), signup);
router.post(
  `/login`,
  validateBody(loginBodySchema, `unauthorized`),
  login,
);

router.patch(
  `/admin/promote/:userId`,
  validateParams(promoteParamsSchema),
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
