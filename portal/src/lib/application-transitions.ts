import { ApplicationStatus } from "@/lib/application-domain";

export type ApplicationTransitionPermission = {
  readonly resource: string;
  readonly action: string;
};

const APPLICATION_SUBMIT: ApplicationTransitionPermission = {
  resource: `application`,
  action: `submit`,
};

const APPLICATION_START_REVIEW: ApplicationTransitionPermission = {
  resource: `application`,
  action: `start_review`,
};

const APPLICATION_REQUEST_CLARIFICATION: ApplicationTransitionPermission = {
  resource: `application`,
  action: `request_clarification`,
};

const APPLICATION_RESUBMIT: ApplicationTransitionPermission = {
  resource: `application`,
  action: `resubmit`,
};

const APPLICATION_ESCALATE_FINAL: ApplicationTransitionPermission = {
  resource: `application`,
  action: `escalate_final`,
};

const APPLICATION_APPROVE: ApplicationTransitionPermission = {
  resource: `application`,
  action: `approve`,
};

const APPLICATION_REJECT: ApplicationTransitionPermission = {
  resource: `application`,
  action: `reject`,
};

export const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> =
  {
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
  to: ApplicationStatus,
): string => `${from}->${to}`;

const REQUIRED_PERMISSION_BY_TRANSITION: Record<
  string,
  ApplicationTransitionPermission
> = {
  [transitionKey(ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED)]:
    APPLICATION_SUBMIT,
  [transitionKey(
    ApplicationStatus.SUBMITTED,
    ApplicationStatus.UNDER_REVIEW,
  )]: APPLICATION_START_REVIEW,
  [transitionKey(
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.PENDING_CLARIFICATION,
  )]: APPLICATION_REQUEST_CLARIFICATION,
  [transitionKey(
    ApplicationStatus.PENDING_CLARIFICATION,
    ApplicationStatus.UNDER_REVIEW,
  )]: APPLICATION_RESUBMIT,
  [transitionKey(
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.FINAL_REVIEW,
  )]: APPLICATION_ESCALATE_FINAL,
  [transitionKey(
    ApplicationStatus.FINAL_REVIEW,
    ApplicationStatus.APPROVED,
  )]: APPLICATION_APPROVE,
  [transitionKey(
    ApplicationStatus.FINAL_REVIEW,
    ApplicationStatus.REJECTED,
  )]: APPLICATION_REJECT,
};

export const ACTION_LABEL_BY_TARGET: Partial<
  Record<ApplicationStatus, string>
> = {
  [ApplicationStatus.SUBMITTED]: `Submit application`,
  [ApplicationStatus.UNDER_REVIEW]: `Start review`,
  [ApplicationStatus.PENDING_CLARIFICATION]: `Request clarification`,
  [ApplicationStatus.FINAL_REVIEW]: `Escalate to final review`,
  [ApplicationStatus.APPROVED]: `Approve`,
  [ApplicationStatus.REJECTED]: `Reject`,
};

export const getResubmitLabel = (): string => `Resubmit`;

export const getRequiredPermissionForTransition = (
  from: ApplicationStatus,
  to: ApplicationStatus,
): ApplicationTransitionPermission | undefined =>
  REQUIRED_PERMISSION_BY_TRANSITION[transitionKey(from, to)];
