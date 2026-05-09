import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ObjectSchema } from 'yup';

import { mapYupError } from './yup-app-error';

export const validateParams =
  <T extends object>(schema: ObjectSchema<T>): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction): void => {
    schema
      .validate(req.params ?? {}, { abortEarly: false, stripUnknown: true })
      .then((parsed) => {
        Object.assign(req.params, parsed);
        next();
      })
      .catch((err: unknown) => {
        next(mapYupError(err, `badRequest`));
      });
  };
