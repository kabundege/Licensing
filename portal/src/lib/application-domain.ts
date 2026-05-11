export const ApplicationStatus = {
  DRAFT: `DRAFT`,
  SUBMITTED: `SUBMITTED`,
  UNDER_REVIEW: `UNDER_REVIEW`,
  PENDING_CLARIFICATION: `PENDING_CLARIFICATION`,
  FINAL_REVIEW: `FINAL_REVIEW`,
  APPROVED: `APPROVED`,
  REJECTED: `REJECTED`,
} as const;

export type ApplicationStatus =
  (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export const STAFF_ROLES = new Set([
  `REVIEWER`,
  `APPROVER`,
  `ADMIN`,
]);

export const userSeesGlobalApplicationQueue = (
  roles: string[] | undefined,
): boolean => (roles ?? []).some((r) => STAFF_ROLES.has(r));

export const userMayReadComplianceAuditApi = userSeesGlobalApplicationQueue;

export const applicationStatusLabel = (status: ApplicationStatus): string =>
  status.replaceAll(`_`, ` `);

export type ApplicationStatusBadgeTone = `neutral` | `info` | `warning` | `success` | `danger` | `accent`;

export const applicationStatusBadgeTone = (
  status: ApplicationStatus,
): ApplicationStatusBadgeTone => {
  switch (status) {
    case ApplicationStatus.DRAFT:
    case ApplicationStatus.SUBMITTED:
      return `neutral`;
    case ApplicationStatus.UNDER_REVIEW:
    case ApplicationStatus.PENDING_CLARIFICATION:
      return `warning`;
    case ApplicationStatus.FINAL_REVIEW:
      return `accent`;
    case ApplicationStatus.APPROVED:
      return `success`;
    case ApplicationStatus.REJECTED:
      return `danger`;
    default:
      return `neutral`;
  }
};

export const applicationStatusBadgeClassName = (
  status: ApplicationStatus,
): string => {
  const tone = applicationStatusBadgeTone(status);
  switch (tone) {
    case `warning`:
      return `border-amber-200/80 bg-amber-50 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100`;
    case `success`:
      return `border-emerald-200/80 bg-emerald-50 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100`;
    case `danger`:
      return `border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/50 dark:bg-destructive/15`;
    case `accent`:
      return `border-sky-200/80 bg-sky-50 text-sky-950 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-100`;
    case `info`:
      return `border-border bg-muted text-foreground`;
    default:
      return `border-border bg-muted/80 text-muted-foreground`;
  }
};
