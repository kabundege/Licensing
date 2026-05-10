import type { Permission } from '../entities';

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

const mergePermissionsFromRoles = (
  roles: { permissions?: Permission[] }[] | undefined
): Permission[] => {
  if (!roles?.length) return [];
  const merged: Permission[] = [];
  const seen = new Set<string>();
  for (const role of roles) {
    for (const p of role.permissions ?? []) {
      const key = `${p.resource}:${p.action}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(p);
      }
    }
  }
  return merged;
};

export const permissionTokensFromRoles = (
  roles: { permissions?: Permission[] }[] | undefined
): string[] => permissionTokensFromPairs(mergePermissionsFromRoles(roles));
