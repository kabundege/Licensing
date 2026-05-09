import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSigningSecret } from '../config/env';
import { AppError } from '../shared/errors/AppError';

export type JwtPayload = jwt.JwtPayload & {
  sub?: string;
};

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

const BEARER_PREFIX = /^Bearer\s+/i;


export const requireJwt = (req: Request, _res: Response, next: NextFunction): void => {
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
  try {
    req.auth = jwt.verify(token, getJwtSigningSecret()) as JwtPayload;
    next();
  } catch {
    next(AppError.unauthorized(`Invalid or expired token`));
  }
};

export const optionalJwt = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith(`Bearer `)) {
    next();
    return;
  }
  const token = header.replace(BEARER_PREFIX, ``).trim();
  try {
    req.auth = jwt.verify(token, getJwtSigningSecret()) as JwtPayload;
  } catch {
    /* ignore invalid optional tokens */
  }
  next();
};
