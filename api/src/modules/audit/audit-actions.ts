export const AUDIT_ACTION_DOCUMENT_UPLOADED = `DOCUMENT_UPLOADED` as const;
export const AUDIT_ACTION_DOCUMENT_VERSION_UPDATED = `DOCUMENT_VERSION_UPDATED` as const;
/** Logged when an approver attempts final approval/rejection but is the assigned reviewer (separation of duties). */
export const AUDIT_ACTION_APPROVAL_BLOCKED_REVIEWER_IDENTITY =
  `APPROVAL_BLOCKED_REVIEWER_IDENTITY` as const;
