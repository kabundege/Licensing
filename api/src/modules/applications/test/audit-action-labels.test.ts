import { describe, expect, it } from 'vitest';

import { humanReadableAuditAction } from '../audit-action-labels';
import { ApplicationStatus } from '../entities';

describe(`humanReadableAuditAction`, () => {
  it(`maps final approval transition to Final License Approval`, () => {
    expect(
      humanReadableAuditAction({
        event_action: null,
        from_state: ApplicationStatus.FINAL_REVIEW,
        to_state: ApplicationStatus.APPROVED,
      })
    ).toBe(`Final License Approval`);
  });
});
