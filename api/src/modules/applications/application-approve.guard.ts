import type { LoadedAuthUser } from '../auth/auth.types';
import { AppPermission } from '../auth/app-permissions';
import { AppError } from '../../shared/errors/AppError';

export type ApplicationApproveGuardInput = {
  reviewerUserId?: string | null;
};

export const userHasApplicationApprovePermission = (tokens: string[]): boolean => {
  const s = new Set(tokens);
  return (
    s.has(AppPermission.ApplicationApproveCompound) ||
    s.has(AppPermission.ApplicationApprove)
  );
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

  if (
    application.reviewerUserId != null &&
    application.reviewerUserId === actor.id
  ) {
    throw AppError.unauthorized(`Approval blocked for assigned reviewer`);
  }
};
