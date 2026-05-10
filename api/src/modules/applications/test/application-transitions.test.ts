import { describe, expect, it } from 'vitest';

import {
  APPLICATION_APPROVE,
  APPLICATION_ESCALATE_FINAL,
  APPLICATION_REJECT,
  APPLICATION_REQUEST_CLARIFICATION,
  APPLICATION_RESUBMIT,
  APPLICATION_START_REVIEW,
  APPLICATION_SUBMIT,
} from '../../auth/app-permissions';
import {
  getRequiredPermissionForTransition,
  transitionKey,
  VALID_TRANSITIONS,
} from '../application-transitions';
import { ApplicationStatus } from '../entities';

describe(`application-transitions`, () => {
  it(`transitionKey is stable`, () => {
    expect(transitionKey(ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED)).toBe(
      `DRAFT->SUBMITTED`
    );
  });

  it(`maps each legal edge to the expected permission pair`, () => {
    expect(
      getRequiredPermissionForTransition(
        ApplicationStatus.DRAFT,
        ApplicationStatus.SUBMITTED
      )
    ).toEqual(APPLICATION_SUBMIT);
    expect(
      getRequiredPermissionForTransition(
        ApplicationStatus.SUBMITTED,
        ApplicationStatus.UNDER_REVIEW
      )
    ).toEqual(APPLICATION_START_REVIEW);
    expect(
      getRequiredPermissionForTransition(
        ApplicationStatus.UNDER_REVIEW,
        ApplicationStatus.PENDING_CLARIFICATION
      )
    ).toEqual(APPLICATION_REQUEST_CLARIFICATION);
    expect(
      getRequiredPermissionForTransition(
        ApplicationStatus.PENDING_CLARIFICATION,
        ApplicationStatus.UNDER_REVIEW
      )
    ).toEqual(APPLICATION_RESUBMIT);
    expect(
      getRequiredPermissionForTransition(
        ApplicationStatus.UNDER_REVIEW,
        ApplicationStatus.FINAL_REVIEW
      )
    ).toEqual(APPLICATION_ESCALATE_FINAL);
    expect(
      getRequiredPermissionForTransition(
        ApplicationStatus.FINAL_REVIEW,
        ApplicationStatus.APPROVED
      )
    ).toEqual(APPLICATION_APPROVE);
    expect(
      getRequiredPermissionForTransition(
        ApplicationStatus.FINAL_REVIEW,
        ApplicationStatus.REJECTED
      )
    ).toEqual(APPLICATION_REJECT);
  });

  it(`terminal statuses expose no outbound transitions`, () => {
    expect(VALID_TRANSITIONS[ApplicationStatus.APPROVED]).toEqual([]);
    expect(VALID_TRANSITIONS[ApplicationStatus.REJECTED]).toEqual([]);
  });
});
