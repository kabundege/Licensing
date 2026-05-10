import { AppDataSource } from '../../database/data-source';
import { runInTransaction } from '../../database/transaction';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';
import type { LoadedAuthUser } from '../auth/auth.types';
import { actorHasPermissionPair } from '../auth/utils/permission-tokens';
import { assertApproverSeparationFromReviewer } from './application-approve.guard';
import {
  getRequiredPermissionForTransition,
  VALID_TRANSITIONS,
} from './application-transitions';
import { Application, ApplicationStatus, AuditLog } from './entities';

export type TransitionApplicationStatusParams = {
  applicationId: string;
  targetStatus: ApplicationStatus;
  actor: LoadedAuthUser;
  expectedVersion: number;
};

const assertTransitionAllowed = (
  from: ApplicationStatus,
  to: ApplicationStatus
): void => {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw AppError.badRequest(`Invalid status transition`);
  }
};

const assertActorMayPerformTransition = (
  actor: LoadedAuthUser,
  from: ApplicationStatus,
  to: ApplicationStatus
): void => {
  const required = getRequiredPermissionForTransition(from, to);
  if (!required) {
    throw AppError.badRequest(`Invalid status transition`);
  }
  if (
    !actorHasPermissionPair(actor.permissions, required.resource, required.action)
  ) {
    throw AppError.unauthorized(`Insufficient permissions`);
  }
};

const assertSeparationForFinalDecision = (
  actor: LoadedAuthUser,
  targetStatus: ApplicationStatus,
  reviewerId: string | null
): void => {
  if (
    targetStatus === ApplicationStatus.APPROVED ||
    targetStatus === ApplicationStatus.REJECTED
  ) {
    assertApproverSeparationFromReviewer(actor, reviewerId);
  }
};

export const transitionStatus = async (
  params: TransitionApplicationStatusParams
): Promise<Application> => {
  const { applicationId, targetStatus, actor, expectedVersion } = params;

  try {
    return await runInTransaction(AppDataSource, async (manager) => {
      const appRepo = manager.getRepository(Application);
      const auditRepo = manager.getRepository(AuditLog);

      const row = await appRepo.findOne({ where: { id: applicationId } });
      if (!row) {
        throw AppError.notFound(`Application not found`);
      }

      if (row.version !== expectedVersion) {
        throw AppError.conflict(`Application was modified by another request`);
      }

      assertTransitionAllowed(row.status, targetStatus);
      assertActorMayPerformTransition(actor, row.status, targetStatus);
      assertSeparationForFinalDecision(actor, targetStatus, row.reviewer_id);

      const fromState = row.status;

      await auditRepo.save(
        auditRepo.create({
          application_id: row.id,
          actor_id: actor.id,
          from_state: fromState,
          to_state: targetStatus,
        })
      );

      if (
        fromState === ApplicationStatus.SUBMITTED &&
        targetStatus === ApplicationStatus.UNDER_REVIEW
      ) {
        row.reviewer_id = actor.id;
      }

      if (
        targetStatus === ApplicationStatus.APPROVED ||
        targetStatus === ApplicationStatus.REJECTED
      ) {
        row.approver_id = actor.id;
      }

      row.status = targetStatus;
      row.version = expectedVersion + 1;

      return appRepo.save(row);
    });
  } catch (err) {
    if (env.nodeEnv === `development`) {
      console.error(`[ApplicationService.transitionStatus]`, err);
    }
    throw err;
  }
};
