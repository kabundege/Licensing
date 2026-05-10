export const USERS_MANAGE_USERS = {
  resource: `users`,
  action: `manage_users`,
} as const;

export const APPLICATION_APPROVE = {
  resource: `application`,
  action: `approve`,
} as const;

export const AppPermission = {
  ManageUsers: USERS_MANAGE_USERS.action,
  UsersManageUsers: `${USERS_MANAGE_USERS.resource}:${USERS_MANAGE_USERS.action}`,
  ApplicationApprove: APPLICATION_APPROVE.action,
  ApplicationApproveCompound: `${APPLICATION_APPROVE.resource}:${APPLICATION_APPROVE.action}`,
} as const;

export type AppPermission =
  (typeof AppPermission)[keyof typeof AppPermission];
