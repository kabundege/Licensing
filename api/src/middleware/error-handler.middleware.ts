import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { env } from '../config/env';
import { MAX_UPLOAD_BYTES } from './file-size-limit.middleware';
import { AppError } from '../shared/errors/AppError';

type ErrorBody = { success: false; error: { code: string; message: string } };

export const sendJson = (res: Response, status: number, body: ErrorBody): void => {
  res.status(status).json(body);
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof MulterError && err.code === `LIMIT_FILE_SIZE`) {
    const mb = MAX_UPLOAD_BYTES / (1024 * 1024);
    sendJson(res, 413, {
      success: false,
      error: {
        code: `FILE_TOO_LARGE`,
        message: `File exceeds the maximum allowed size (${mb}MB).`,
      },
    });
    return;
  }

  if (err instanceof AppError && err.isOperational) {
    const { statusCode, code, message } = err;
    sendJson(res, statusCode, {
      success: false,
      error: { code, message },
    });
    return;
  }

  const isProd = env.nodeEnv === `production`;

  if (!isProd) {
    console.error(err);
  }

  const message =
    isProd ? `Internal server error` : err instanceof Error ? err.message : `Unknown error`;

  sendJson(res, 500, {
    success: false,
    error: {
      code: `INTERNAL_ERROR`,
      message,
    },
  });
};
