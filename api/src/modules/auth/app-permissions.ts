/**
 * Canonical permission pairs (DB {@link Permission} rows). Used by the seed and to derive
 * {@link AppPermission} tokens for `restrictTo(...)` and JWT checks.
 */
export const USERS_MANAGE_USERS = {
  resource: `users`,
  action: `manage_users`,
} as const;

/**
 * Permission strings that `restrictTo(...)` accepts and that may appear on JWTs /
 * `LoadedAuthUser.permissionTokens` (via `permissionTokensFromPairs`).
 */
export const AppPermission = {
  ManageUsers: USERS_MANAGE_USERS.action,
  UsersManageUsers: `${USERS_MANAGE_USERS.resource}:${USERS_MANAGE_USERS.action}`,
} as const;

export type AppPermission =
  (typeof AppPermission)[keyof typeof AppPermission];
