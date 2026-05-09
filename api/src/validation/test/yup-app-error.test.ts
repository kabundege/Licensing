import { ValidationError } from 'yup';
import { describe, expect, it } from 'vitest';

import { AppError } from '../../shared/errors/AppError';

import { mapYupError } from '../yup-app-error';

describe('mapYupError', () => {
  it('maps ValidationError to badRequest when fail is badRequest', () => {
    const ve = new ValidationError(`Must be email`, `email`, `email`);
    const err = mapYupError(ve, `badRequest`);
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe(`BAD_REQUEST`);
  });

  it('maps ValidationError to unauthorized when fail is unauthorized', () => {
    const ve = new ValidationError(`Invalid credentials`);
    const err = mapYupError(ve, `unauthorized`);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe(`UNAUTHORIZED`);
    expect(err.message).toContain(`credentials`);
  });

  it('maps generic Error message to badRequest', () => {
    const err = mapYupError(new Error(`boom`), `badRequest`);
    expect(err.message).toBe(`boom`);
    expect(err.statusCode).toBe(400);
  });

  it('maps unknown to generic badRequest', () => {
    const err = mapYupError(123, `badRequest`);
    expect(err.message).toBe(`Invalid request`);
  });
});
