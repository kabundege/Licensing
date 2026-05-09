import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ObjectSchema } from 'yup';

import type { YupFailMode } from './yup-app-error';
import { mapYupError } from './yup-app-error';

export const validateBody =
  <T extends object>(
    schema: ObjectSchema<T>,
    fail: YupFailMode = `badRequest`
  ): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    schema
      .validate(req.body ?? {}, { abortEarly: false, stripUnknown: true })
      .then((parsed) => {
        req.body = parsed;
        next();
      })
      .catch((err: unknown) => {
        next(mapYupError(err, fail));
      });
  };
