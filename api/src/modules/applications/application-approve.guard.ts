import type { LoadedAuthUser } from '../auth/auth.types';
import { APPLICATION_APPROVE } from '../auth/app-permissions';
import { actorHasPermissionPair } from '../auth/utils/permission-tokens';
import { AppError } from '../../shared/errors/AppError';

export type ApplicationApproveGuardInput = {
  reviewerUserId?: string | null;
};

export const APPROVAL_BLOCKED_FOR_ASSIGNED_REVIEWER_MESSAGE =
  `Approval blocked for assigned reviewer`;

export const userHasApplicationApprovePermission = (tokens: string[]): boolean =>
  actorHasPermissionPair(tokens, APPLICATION_APPROVE.resource, APPLICATION_APPROVE.action);

export const assertApproverSeparationFromReviewer = (
  actor: LoadedAuthUser,
  reviewerUserId: string | null | undefined
): void => {
  if (reviewerUserId != null && reviewerUserId === actor.id) {
    throw AppError.unauthorized(APPROVAL_BLOCKED_FOR_ASSIGNED_REVIEWER_MESSAGE);
  }
};

export const assertUserMayApproveApplication = (
  actor: LoadedAuthUser | undefined,
  application: ApplicationApproveGuardInput
): void => {
  if (!actor) {
    throw AppError.unauthorized(`Invalid session`);
  }

  if (!userHasApplicationApprovePermission(actor.permissions)) {
    throw AppError.unauthorized(`Insufficient permissions`);
  }

  assertApproverSeparationFromReviewer(actor, application.reviewerUserId);
};
