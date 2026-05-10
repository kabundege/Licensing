import { describe, expect, it } from 'vitest';

import { applicationPublicShape, auditLogPublicShape } from '../application-response';
import { ApplicationStatus } from '../entities';

describe(`application-response`, () => {
  it(`applicationPublicShape exposes stable fields`, () => {
    const shaped = applicationPublicShape({
      id: `a1`,
      applicant_id: `u1`,
      status: ApplicationStatus.DRAFT,
      reviewer_id: null,
      approver_id: null,
      version: 0,
    } as never);

    expect(shaped).toEqual({
      id: `a1`,
      applicant_id: `u1`,
      status: ApplicationStatus.DRAFT,
      reviewer_id: null,
      approver_id: null,
      version: 0,
    });
  });

  it(`auditLogPublicShape exposes stable fields`, () => {
    const ts = new Date(`2026-02-01T00:00:00.000Z`);
    const shaped = auditLogPublicShape({
      id: `l1`,
      application_id: `a1`,
      actor_id: `u1`,
      from_state: ApplicationStatus.DRAFT,
      to_state: ApplicationStatus.SUBMITTED,
      timestamp: ts,
    } as never);

    expect(shaped).toEqual({
      id: `l1`,
      application_id: `a1`,
      actor_id: `u1`,
      from_state: ApplicationStatus.DRAFT,
      to_state: ApplicationStatus.SUBMITTED,
      timestamp: ts,
    });
  });
});
