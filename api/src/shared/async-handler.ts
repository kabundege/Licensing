import type { NextFunction, RequestHandler, Response } from 'express';

/** Express 4 does not unwrap promise rejections; forward async errors via `next`. */
export const asyncHandler =
  (
    handler: (
      req: Parameters<RequestHandler>[0],
      res: Response,
      next: NextFunction
    ) => Promise<void>
  ): RequestHandler =>
  (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
