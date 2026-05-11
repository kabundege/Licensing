import {
  ApplicationStatus,
  type ApplicationStatus as ApplicationStatusType,
} from "@/lib/application-domain";
import { transitionKey } from "@/lib/application-transitions";

const DOCUMENT_UPLOADED = `DOCUMENT_UPLOADED`;
const DOCUMENT_VERSION_UPDATED = `DOCUMENT_VERSION_UPDATED`;
const APPROVAL_BLOCKED_REVIEWER_IDENTITY =
  `APPROVAL_BLOCKED_REVIEWER_IDENTITY`;

const TRANSITION_LABELS: Record<string, string> = {
  [transitionKey(ApplicationStatus.DRAFT, ApplicationStatus.SUBMITTED)]:
    `Application submitted`,
  [transitionKey(ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW)]:
    `Review started`,
  [transitionKey(
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.PENDING_CLARIFICATION,
  )]: `Clarification requested`,
  [transitionKey(
    ApplicationStatus.PENDING_CLARIFICATION,
    ApplicationStatus.UNDER_REVIEW,
  )]: `Applicant resubmitted`,
  [transitionKey(
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.FINAL_REVIEW,
  )]: `Escalated to final review`,
  [transitionKey(
    ApplicationStatus.FINAL_REVIEW,
    ApplicationStatus.APPROVED,
  )]: `Final license approval`,
  [transitionKey(
    ApplicationStatus.FINAL_REVIEW,
    ApplicationStatus.REJECTED,
  )]: `Application rejected`,
};

const EVENT_ACTION_LABELS: Record<string, string> = {
  [DOCUMENT_UPLOADED]: `Document uploaded`,
  [DOCUMENT_VERSION_UPDATED]: `Document version updated`,
  [APPROVAL_BLOCKED_REVIEWER_IDENTITY]: `Approval blocked (reviewer cannot approve same case)`,
};

export type AuditLike = {
  event_action: string | null;
  from_state: ApplicationStatusType | null;
  to_state: ApplicationStatusType | null;
};

export const humanReadableAuditDescription = (input: AuditLike): string => {
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
    return (
      TRANSITION_LABELS[key] ??
      `Status changed (${input.from_state} → ${input.to_state})`
    );
  }
  return `Audit event`;
};
