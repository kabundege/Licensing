import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';

import type { LoadedAuthUser } from '../modules/auth/auth.types';
import type { AppPermission } from '../modules/auth/app-permissions';
import { RoleName, User } from '../modules/auth/entities';
import { permissionTokensFromRoles } from '../modules/auth/utils/permission-tokens';
import { getJwtSigningSecret } from '../config/env';
import { AppDataSource } from '../database/data-source';
import { AppError } from '../shared/errors/AppError';

export type AccessTokenJwtPayload = jwt.JwtPayload & {
  sub: string;
  email: string;
  roles: RoleName[];
  permissions: string[];
};

export type JwtPayload = AccessTokenJwtPayload | jwt.JwtPayload;

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenJwtPayload;
      user?: LoadedAuthUser;
    }
  }
}

const BEARER_PREFIX = /^Bearer\s+/i;

const sortedRoles = (names: RoleName[]): RoleName[] =>
  [...names].sort((a, b) => String(a).localeCompare(String(b)));

const toLoadedAuthUser = (record: User): LoadedAuthUser => ({
  id: record.id,
  email: record.email,
  roles: sortedRoles(record.roles?.map((r) => r.name) ?? []),
  permissions: permissionTokensFromRoles(record.roles ?? []),
});

const runRequireJwt = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith(`Bearer `)) {
    next(AppError.unauthorized(`Missing bearer token`));
    return;
  }
  const token = header.replace(BEARER_PREFIX, ``).trim();
  if (!token) {
    next(AppError.unauthorized(`Missing bearer token`));
    return;
  }

  let payload: AccessTokenJwtPayload;
  try {
    payload = jwt.verify(
      token,
      getJwtSigningSecret()
    ) as AccessTokenJwtPayload;
    req.auth = payload;
  } catch {
    next(AppError.unauthorized(`Invalid or expired token`));
    return;
  }

  const sub = payload.sub;
  if (!sub) {
    next(AppError.unauthorized(`Invalid or expired token`));
    return;
  }

  try {
    const userRepo = AppDataSource.getRepository(User);
    const record = await userRepo.findOne({
      where: { id: sub },
      relations: { roles: { permissions: true } },
    });

    if (!record) {
      next(AppError.unauthorized(`Invalid or expired token`));
      return;
    }

    req.user = toLoadedAuthUser(record);
    next();
  } catch (err) {
    next(err instanceof Error ? err : new Error(String(err)));
  }
};

export const requireJwt: RequestHandler = (req, res, next): void => {
  void runRequireJwt(req, res, next).catch(next);
};

const runOptionalJwt = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith(`Bearer `)) {
    next();
    return;
  }
  const token = header.replace(BEARER_PREFIX, ``).trim();
  try {
    const payload = jwt.verify(
      token,
      getJwtSigningSecret()
    ) as AccessTokenJwtPayload;
    req.auth = payload;
    const sub = payload.sub;
    if (!sub) {
      next();
      return;
    }
    const userRepo = AppDataSource.getRepository(User);
    const record = await userRepo.findOne({
      where: { id: sub },
      relations: { roles: { permissions: true } },
    });
    if (record) {
      req.user = toLoadedAuthUser(record);
    }
  } catch {
    /* ignore invalid optional tokens */
  }
  next();
};

export const optionalJwt: RequestHandler = (req, res, next): void => {
  void runOptionalJwt(req, res, next).catch(next);
};

export const restrictTo =
  (...required: AppPermission[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const caller = req.user as LoadedAuthUser | undefined;
    const tokens = caller?.permissions;
    const allowed = tokens ? new Set(tokens) : undefined;
    if (!allowed) {
      next(AppError.unauthorized(`Insufficient permissions`));
      return;
    }
    const missing = required.filter((permission) => !allowed.has(permission));
    if (missing.length > 0) {
      next(AppError.unauthorized(`Insufficient permissions`));
      return;
    }
    next();
  };
