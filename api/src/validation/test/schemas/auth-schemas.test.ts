import { describe, expect, it } from 'vitest';

import {
  createReviewerBodySchema,
  loginBodySchema,
  promoteParamsSchema,
  signupBodySchema,
} from '../../schemas/index';

describe('signupBodySchema', () => {
  it('accepts valid payload', async () => {
    const v = await signupBodySchema.validate({
      email: `User@Example.com `,
      password: `password-long`,
      name: `  Ada Lovelace `,
    });
    expect(v.email).toBe(`user@example.com`);
    expect(v.password).toBe(`password-long`);
    expect(v.name).toBe(`Ada Lovelace`);
  });

  it('rejects short password', async () => {
    await expect(
      signupBodySchema.validate({
        email: `a@b.com`,
        password: `short`,
        name: `Name`,
      })
    ).rejects.toThrow();
  });
});

describe('loginBodySchema', () => {
  it('rejects missing or blank password', async () => {
    await expect(loginBodySchema.validate({ email: `a@b.com`, password: `` })).rejects.toThrow();
    await expect(loginBodySchema.validate({ email: `a@b.com` })).rejects.toThrow();
  });

  it('accepts credential payload', async () => {
    const v = await loginBodySchema.validate({
      email: `  A@B.COM `,
      password: `secret`,
    });
    expect(v.email).toBe(`a@b.com`);
    expect(v.password).toBe(`secret`);
  });
});

describe('promoteParamsSchema', () => {
  it('requires uuid userId', async () => {
    await expect(promoteParamsSchema.validate({ userId: `not-a-uuid` })).rejects.toThrow();
    await expect(
      promoteParamsSchema.validate({ userId: `550e8400-e29b-41d4-a716-446655440000` })
    ).resolves.toMatchObject({
      userId: `550e8400-e29b-41d4-a716-446655440000`,
    });
  });
});

describe('createReviewerBodySchema', () => {
  it('mirrors signup rules', async () => {
    await expect(
      createReviewerBodySchema.validate({
        email: `r@v.com`,
        password: `longenough`,
        name: `Rev`,
      })
    ).resolves.toMatchObject({
      email: `r@v.com`,
      name: `Rev`,
    });
  });
});
