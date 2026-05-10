import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ObjectSchema } from 'yup';

import { mapYupError } from './yup-app-error';

export const validateQuery =
  <T extends object>(schema: ObjectSchema<T>): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    schema
      .validate(req.query ?? {}, { abortEarly: false, stripUnknown: true })
      .then((parsed) => {
        Object.assign(req.query, parsed as object);
        next();
      })
      .catch((err: unknown) => {
        next(mapYupError(err, `badRequest`));
      });
  };
