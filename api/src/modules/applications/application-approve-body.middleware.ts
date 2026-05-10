import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { restrictTo } from '../../middleware/auth.middleware';
import { AppPermission } from '../auth/app-permissions';
import type { ApplicationTransitionStatusBodyDto } from '../../validation/schemas';
import { ApplicationStatus } from './entities';

export const restrictToApprovePermissionWhenBodyTargetsApproved: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const body = req.body as ApplicationTransitionStatusBodyDto | undefined;
  if (body?.targetStatus !== ApplicationStatus.APPROVED) {
    next();
    return;
  }
  restrictTo(AppPermission.ApplicationApproveCompound)(req, res, next);
};
