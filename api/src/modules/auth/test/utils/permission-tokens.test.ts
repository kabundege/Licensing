import { describe, expect, it } from 'vitest';

import type { Permission } from '../../entities';
import { permissionTokensFromPairs } from '../../utils/permission-tokens';

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
