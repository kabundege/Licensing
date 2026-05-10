import {
  APPLICATION_APPROVE,
  APPLICATION_ESCALATE_FINAL,
  APPLICATION_REJECT,
  APPLICATION_REQUEST_CLARIFICATION,
  APPLICATION_RESUBMIT,
  APPLICATION_START_REVIEW,
  APPLICATION_SUBMIT,
} from '../auth/app-permissions';
import { ApplicationStatus } from './entities';

export type ApplicationTransitionPermission = {
  readonly resource: string;
  readonly action: string;
};

export const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.DRAFT]: [ApplicationStatus.SUBMITTED],
  [ApplicationStatus.SUBMITTED]: [ApplicationStatus.UNDER_REVIEW],
  [ApplicationStatus.UNDER_REVIEW]: [
    ApplicationStatus.PENDING_CLARIFICATION,
    ApplicationStatus.FINAL_REVIEW,
  ],
  [ApplicationStatus.PENDING_CLARIFICATION]: [ApplicationStatus.UNDER_REVIEW],
  [ApplicationStatus.FINAL_REVIEW]: [
    ApplicationStatus.APPROVED,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.APPROVED]: [],
  [ApplicationStatus.REJECTED]: [],
};

export const transitionKey = (
  from: ApplicationStatus,
  to: ApplicationStatus
): string => `${from}->${to}`;

export const REQUIRED_PERMISSION_BY_TRANSITION: Record<
  string,
  ApplicationTransitionPermission
> = {
  [transitionKey(ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED)]: APPLICATION_SUBMIT,
  [transitionKey(ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW)]:
    APPLICATION_START_REVIEW,
  [transitionKey(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.PENDING_CLARIFICATION)]:
    APPLICATION_REQUEST_CLARIFICATION,
  [transitionKey(ApplicationStatus.PENDING_CLARIFICATION, ApplicationStatus.UNDER_REVIEW)]:
    APPLICATION_RESUBMIT,
  [transitionKey(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.FINAL_REVIEW)]:
    APPLICATION_ESCALATE_FINAL,
  [transitionKey(ApplicationStatus.FINAL_REVIEW, ApplicationStatus.APPROVED)]:
    APPLICATION_APPROVE,
  [transitionKey(ApplicationStatus.FINAL_REVIEW, ApplicationStatus.REJECTED)]:
    APPLICATION_REJECT,
};

export const getRequiredPermissionForTransition = (
  from: ApplicationStatus,
  to: ApplicationStatus
): ApplicationTransitionPermission | undefined =>
  REQUIRED_PERMISSION_BY_TRANSITION[transitionKey(from, to)];
