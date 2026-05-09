import type { Permission } from '../entities';

/** Tokens used in JWT payloads and for `restrictTo(...)`. */
export const permissionTokensFromPairs = (
  permissions: Permission[] | undefined
): string[] => {
  if (!permissions?.length) return [];
  const tokens = new Set<string>();
  for (const p of permissions) {
    tokens.add(`${p.resource}:${p.action}`);
    tokens.add(p.action);
  }
  return [...tokens];
};
