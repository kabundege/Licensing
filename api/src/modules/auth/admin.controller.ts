import type { Request, Response } from 'express';

import type { LoadedAuthUser } from './auth.types';
import { asyncHandler } from '../../shared/async-handler';
import { AppError } from '../../shared/errors/AppError';
import { createReviewerAccount, promoteUserToReviewer } from './auth.service';

const reviewerPublicShape = (user: {
  id: string;
  email: string;
  name: string;
  role: { name: string };
}): { id: string; email: string; name: string; role: string } => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role.name,
});

export const promoteUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params as { userId: string };
    const caller = req.user as LoadedAuthUser | undefined;
    if (!caller) {
      throw AppError.unauthorized(`Invalid session`);
    }
    const promoted = await promoteUserToReviewer({
      targetUserId: userId,
      performedByUserId: caller.id,
    });

    res.json({ success: true, user: reviewerPublicShape(promoted) });
  }
);

export const createReviewer = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const reviewer = await createReviewerAccount(req.body);
    res.status(201).json({
      success: true,
      user: reviewerPublicShape(reviewer),
    });
  }
);
