import { userSeesGlobalApplicationQueue } from "@/lib/application-domain";

const asSet = (tokens: string[] | undefined): Set<string> =>
  new Set(tokens ?? []);

export const actorHasAnyToken = (
  tokens: string[] | undefined,
  candidates: readonly string[]
): boolean => {
  const s = asSet(tokens);
  return candidates.some((c) => s.has(c));
};

export const actorHasAllTokens = (
  tokens: string[] | undefined,
  required: readonly string[]
): boolean => {
  const s = asSet(tokens);
  return required.every((c) => s.has(c));
};

/** Matches API `actorHasPermissionPair` — JWT may include `resource:action` or `action` only. */
export const actorHasPermissionPair = (
  tokens: string[] | undefined,
  resource: string,
  action: string,
): boolean => {
  const s = asSet(tokens);
  return s.has(`${resource}:${action}`) || s.has(action);
};

export const NAV_PERMISSIONS = {
  newApplication: [`application:create`, `application:submit`],
  staffReviewQueue: [`application:review`, `application:start_review`],
  adminDashboard: [`manage_users`, `users:manage_users`],
} as const;

export const MIDDLEWARE_RULES = {
  staffArea: NAV_PERMISSIONS.staffReviewQueue,
  adminArea: NAV_PERMISSIONS.adminDashboard,
} as const;

/** Staff may take ownership of SUBMITTED cases (API uses `application:start_review`; JWT may expose `application:review`). */
export const userMayClaimSubmittedApplication = (
  tokens: string[] | undefined,
): boolean =>
  actorHasPermissionPair(tokens, `application`, `review`) ||
  actorHasPermissionPair(tokens, `application`, `start_review`);

/** Row-level quick action: open case detail (applicant on file or staff queue role). */
export const userMayViewApplicationCase = ({
  sessionUserId,
  applicantId,
  roles,
}: {
  sessionUserId: string | undefined;
  applicantId: string;
  roles: string[] | undefined;
}): boolean => {
  if (typeof sessionUserId === `string` && sessionUserId === applicantId) {
    return true;
  }
  return userSeesGlobalApplicationQueue(roles);
};
