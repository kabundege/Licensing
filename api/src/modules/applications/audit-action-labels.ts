import {
  AUDIT_ACTION_DOCUMENT_UPLOADED,
  AUDIT_ACTION_DOCUMENT_VERSION_UPDATED,
} from '../audit/audit-actions';
import { transitionKey } from './application-transitions';
import { ApplicationStatus } from './entities';

const TRANSITION_LABELS: Record<string, string> = {
  [transitionKey(ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED)]: `Application Submitted`,
  [transitionKey(ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW)]: `Review Started`,
  [transitionKey(
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.PENDING_CLARIFICATION
  )]: `Clarification Requested`,
  [transitionKey(
    ApplicationStatus.PENDING_CLARIFICATION,
    ApplicationStatus.UNDER_REVIEW
  )]: `Applicant Resubmitted`,
  [transitionKey(ApplicationStatus.UNDER_REVIEW, ApplicationStatus.FINAL_REVIEW)]:
    `Escalated to Final Review`,
  [transitionKey(ApplicationStatus.FINAL_REVIEW, ApplicationStatus.APPROVED)]:
    `Final License Approval`,
  [transitionKey(ApplicationStatus.FINAL_REVIEW, ApplicationStatus.REJECTED)]:
    `Application Rejected`,
};

const EVENT_ACTION_LABELS: Record<string, string> = {
  [AUDIT_ACTION_DOCUMENT_UPLOADED]: `Document Uploaded`,
  [AUDIT_ACTION_DOCUMENT_VERSION_UPDATED]: `Document Version Updated`,
};

export const humanReadableAuditAction = (input: {
  event_action: string | null;
  from_state: ApplicationStatus | null;
  to_state: ApplicationStatus | null;
}): string => {
  if (input.event_action) {
    return (
      EVENT_ACTION_LABELS[input.event_action] ??
      input.event_action
        .split(`_`)
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(` `)
    );
  }
  if (input.from_state !== null && input.to_state !== null) {
    const key = transitionKey(input.from_state, input.to_state);
    return TRANSITION_LABELS[key] ?? `Status changed (${input.from_state} → ${input.to_state})`;
  }
  return `Audit event`;
};
