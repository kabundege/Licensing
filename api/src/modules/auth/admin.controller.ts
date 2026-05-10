import type { Request, Response } from 'express';

import type { LoadedAuthUser } from './auth.types';
import type { RoleName } from './entities';
import { asyncHandler } from '../../shared/async-handler';
import { AppError } from '../../shared/errors/AppError';
import type { AdminUsersQueryDto } from '../../validation/schemas';
import { addPromotionRoleToUser, createReviewerAccount, listUsersForAdmin } from './auth.service';

const sortedRoleLabels = (
  roles: readonly { name: string }[] | undefined
): string[] => {
  const unique = [...new Set((roles ?? []).map((r) => r.name))];
  unique.sort((a, b) => String(a).localeCompare(String(b)));
  return unique;
};

const publicUserShape = (user: {
  id: string;
  email: string;
  name: string;
  roles: { name: string }[];
}): { id: string; email: string; name: string; roles: string[] } => ({
  id: user.id,
  email: user.email,
  name: user.name,
  roles: sortedRoleLabels(user.roles ?? []),
});

export const listUsers = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = req.query as unknown as AdminUsersQueryDto;
    const { users, total } = await listUsersForAdmin({ page, limit });
    res.json({
      success: true,
      users: users.map(publicUserShape),
      page,
      limit,
      total,
    });
  }
);

export const promoteUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params as { userId: string };
    const { role } = req.body as { role: RoleName.REVIEWER | RoleName.APPROVER };
    const caller = req.user as LoadedAuthUser | undefined;
    if (!caller) {
      throw AppError.unauthorized(`Invalid session`);
    }
    const promoted = await addPromotionRoleToUser({
      targetUserId: userId,
      performedByUserId: caller.id,
      roleName: role,
    });

    res.json({ success: true, user: publicUserShape(promoted) });
  }
);

export const createReviewer = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const reviewer = await createReviewerAccount(req.body);
    res.status(201).json({
      success: true,
      user: publicUserShape(reviewer),
    });
  }
);
