import { AppDataSource } from '../../database/data-source';
import { runInTransaction } from '../../database/transaction';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';
import type { LoadedAuthUser } from '../auth/auth.types';
import { RoleName } from '../auth/entities';
import { actorHasPermissionPair } from '../auth/utils/permission-tokens';
import { assertApproverSeparationFromReviewer } from './application-approve.guard';
import {
  getRequiredPermissionForTransition,
  VALID_TRANSITIONS,
} from './application-transitions';
import { Application, ApplicationStatus, AuditLog } from './entities';

export const actorSeesAllApplications = (actor: LoadedAuthUser): boolean =>
  actor.roles.some(
    (r) =>
      r === RoleName.REVIEWER ||
      r === RoleName.APPROVER ||
      r === RoleName.ADMIN
  );

export const assertCanReadApplication = (actor: LoadedAuthUser, row: Application): void => {
  if (actorSeesAllApplications(actor)) {
    return;
  }
  if (row.applicant_id === actor.id) {
    return;
  }
  throw AppError.unauthorized(`Insufficient permissions`);
};

export const listApplications = async (
  actor: LoadedAuthUser
): Promise<Application[]> => {
  const repo = AppDataSource.getRepository(Application);
  if (actorSeesAllApplications(actor)) {
    return repo.find({ order: { id: `ASC` } });
  }
  return repo.find({
    where: { applicant_id: actor.id },
    order: { id: `ASC` },
  });
};

export type ApplicationDetail = {
  application: Application;
  auditLogs: AuditLog[];
};

export const getApplicationWithAuditLogs = async (
  id: string,
  actor: LoadedAuthUser
): Promise<ApplicationDetail> => {
  const appRepo = AppDataSource.getRepository(Application);
  const auditRepo = AppDataSource.getRepository(AuditLog);

  const row = await appRepo.findOne({ where: { id } });
  if (!row) {
    throw AppError.notFound(`Application not found`);
  }
  assertCanReadApplication(actor, row);

  const auditLogs = await auditRepo.find({
    where: { application_id: id },
    order: { timestamp: `ASC` },
  });

  return { application: row, auditLogs };
};

export const createApplication = async (
  actor: LoadedAuthUser
): Promise<Application> => {
  const repo = AppDataSource.getRepository(Application);
  const row = repo.create({
    applicant_id: actor.id,
    status: ApplicationStatus.DRAFT,
    reviewer_id: null,
    approver_id: null,
    version: 0,
  });
  return repo.save(row);
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
  applicationId: string,
  targetStatus: ApplicationStatus,
  actor: LoadedAuthUser,
  expectedVersion: number
): Promise<Application> => {
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
          event_action: null,
          document_id: null,
          metadata: null,
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
