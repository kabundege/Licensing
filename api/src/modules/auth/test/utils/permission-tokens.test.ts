import { describe, expect, it } from 'vitest';

import type { Permission } from '../../entities';
import { permissionTokensFromPairs, permissionTokensFromRoles } from '../../utils/permission-tokens';

describe('permissionTokensFromPairs', () => {
  it('returns empty array for missing or empty permissions', () => {
    expect(permissionTokensFromPairs(undefined)).toEqual([]);
    expect(permissionTokensFromPairs([])).toEqual([]);
  });

  it('adds resource:action and action for each permission', () => {
    const perms = [
      { resource: `users`, action: `manage_users` },
    ] as Permission[];
    const out = permissionTokensFromPairs(perms);
    expect(out.sort()).toEqual([`manage_users`, `users:manage_users`].sort());
  });
});

describe('permissionTokensFromRoles', () => {
  it('dedupes permissions across roles before token expansion', () => {
    const p = {
      resource: `application`,
      action: `approve`,
    } as Permission;
    const roles = [
      { permissions: [] },
      { permissions: [p] },
      { permissions: [p] },
    ];
    const out = permissionTokensFromRoles(roles);
    expect(out.sort()).toEqual([`approve`, `application:approve`].sort());
  });
});
