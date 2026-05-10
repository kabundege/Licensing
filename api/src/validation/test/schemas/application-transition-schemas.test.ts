import { describe, expect, it } from 'vitest';

import {
  applicationIdParamsSchema,
  applicationTransitionStatusBodySchema,
} from '../../schemas/index';
import { ApplicationStatus } from '../../../modules/applications/entities';

describe(`applicationIdParamsSchema`, () => {
  it(`requires uuid id`, async () => {
    await expect(applicationIdParamsSchema.validate({ id: `not-uuid` })).rejects.toThrow();
    await expect(
      applicationIdParamsSchema.validate({
        id: `550e8400-e29b-41d4-a716-446655440000`,
      })
    ).resolves.toMatchObject({
      id: `550e8400-e29b-41d4-a716-446655440000`,
    });
  });
});

describe(`applicationTransitionStatusBodySchema`, () => {
  it(`accepts valid transition payload`, async () => {
    const v = await applicationTransitionStatusBodySchema.validate({
      targetStatus: ApplicationStatus.DRAFT,
      expectedVersion: 0,
    });
    expect(v).toEqual({
      targetStatus: ApplicationStatus.DRAFT,
      expectedVersion: 0,
    });
  });

  it(`rejects unknown status labels`, async () => {
    await expect(
      applicationTransitionStatusBodySchema.validate({
        targetStatus: `NOT_A_STATE`,
        expectedVersion: 0,
      })
    ).rejects.toThrow();
  });

  it(`rejects negative expectedVersion`, async () => {
    await expect(
      applicationTransitionStatusBodySchema.validate({
        targetStatus: ApplicationStatus.SUBMITTED,
        expectedVersion: -1,
      })
    ).rejects.toThrow();
  });
});
