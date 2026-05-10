import type { NextFunction, Request, Response } from 'express';

import type { LoadedAuthUser } from './auth.types';
import { asyncHandler } from '../../shared/async-handler';
import { loginUser, signupUser } from './auth.service';

const sortedRoleLabels = (
  roles: readonly { name: string }[] | undefined
): string[] => {
  const unique = [...new Set((roles ?? []).map((r) => r.name))];
  unique.sort((a, b) => String(a).localeCompare(String(b)));
  return unique;
};

const toPublicUser = (user: {
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

export const signup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await signupUser(req.body);
  res.status(201).json({ success: true, user: toPublicUser(user) });
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const token = await loginUser(req.body);
  res.json({ success: true, token });
});

export const me = (req: Request, res: Response, _next: NextFunction): void => {
  const u = req.user as LoadedAuthUser | undefined;
  res.json({
    success: true,
    user: u
      ? {
          id: u.id,
          email: u.email,
          roles: u.roles,
          permissions: u.permissions,
        }
      : null,
  });
};
