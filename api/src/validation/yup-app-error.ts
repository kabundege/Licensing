import { ValidationError } from 'yup';

import { AppError } from '../shared/errors/AppError';

export type YupFailMode = `badRequest` | `unauthorized`;

export const mapYupError = (err: unknown, fail: YupFailMode): AppError => {
  if (err instanceof ValidationError) {
    const message = err.errors[0] ?? `Invalid request`;
    return fail === `unauthorized`
      ? AppError.unauthorized(message)
      : AppError.badRequest(message);
  }
  return err instanceof Error
    ? AppError.badRequest(err.message)
    : AppError.badRequest(`Invalid request`);
};
