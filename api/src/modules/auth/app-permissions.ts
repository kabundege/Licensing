export const USERS_MANAGE_USERS = {
  resource: `users`,
  action: `manage_users`,
} as const;

export const ANALYTICS_VIEW_DASHBOARD = {
  resource: `analytics`,
  action: `view_dashboard`,
} as const;

export const APPLICATION_APPROVE = {
  resource: `application`,
  action: `approve`,
} as const;

export const APPLICATION_SUBMIT = {
  resource: `application`,
  action: `submit`,
} as const;

export const APPLICATION_START_REVIEW = {
  resource: `application`,
  action: `start_review`,
} as const;

export const APPLICATION_REQUEST_CLARIFICATION = {
  resource: `application`,
  action: `request_clarification`,
} as const;

export const APPLICATION_RESUBMIT = {
  resource: `application`,
  action: `resubmit`,
} as const;

export const APPLICATION_ESCALATE_FINAL = {
  resource: `application`,
  action: `escalate_final`,
} as const;

export const APPLICATION_REJECT = {
  resource: `application`,
  action: `reject`,
} as const;

export const AppPermission = {
  ManageUsers: USERS_MANAGE_USERS.action,
  UsersManageUsers: `${USERS_MANAGE_USERS.resource}:${USERS_MANAGE_USERS.action}`,
  ViewDashboardStats: `${ANALYTICS_VIEW_DASHBOARD.resource}:${ANALYTICS_VIEW_DASHBOARD.action}`,
  ApplicationApprove: APPLICATION_APPROVE.action,
  ApplicationApproveCompound: `${APPLICATION_APPROVE.resource}:${APPLICATION_APPROVE.action}`,
  ApplicationReject: APPLICATION_REJECT.action,
  ApplicationRejectCompound: `${APPLICATION_REJECT.resource}:${APPLICATION_REJECT.action}`,
} as const;

export type AppPermission =
  (typeof AppPermission)[keyof typeof AppPermission];
