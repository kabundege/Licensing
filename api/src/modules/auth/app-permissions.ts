
export const USERS_MANAGE_USERS = {
  resource: `users`,
  action: `manage_users`,
} as const;


export const AppPermission = {
  ManageUsers: USERS_MANAGE_USERS.action,
  UsersManageUsers: `${USERS_MANAGE_USERS.resource}:${USERS_MANAGE_USERS.action}`,
} as const;

export type AppPermission =
  (typeof AppPermission)[keyof typeof AppPermission];
