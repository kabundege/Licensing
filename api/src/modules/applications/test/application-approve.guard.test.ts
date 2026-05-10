import { describe, expect, it } from 'vitest';

import type { LoadedAuthUser } from '../../auth/auth.types';
import { RoleName } from '../../auth/entities';
import {
  assertUserMayApproveApplication,
  userHasApplicationApprovePermission,
} from '../application-approve.guard';

const actorWithApprove: LoadedAuthUser = {
  id: `caller-1`,
  email: `c@example.com`,
  roles: [RoleName.APPROVER],
  permissions: [`application:approve`, `approve`],
};

describe(`application approve guard`, () => {
  it(`detects approve permission tokens`, () => {
    expect(userHasApplicationApprovePermission([`application:approve`])).toBe(true);
    expect(userHasApplicationApprovePermission([`approve`])).toBe(true);
    expect(userHasApplicationApprovePermission([`manage_users`])).toBe(false);
  });

  it(`rejects reviewer self-approve`, () => {
    expect(() =>
      assertUserMayApproveApplication(actorWithApprove, { reviewerUserId: actorWithApprove.id })
    ).toThrow(
      expect.objectContaining({
        code: `UNAUTHORIZED`,
      })
    );
  });

  it(`allows approver without reviewer mismatch`, () => {
    expect(() =>
      assertUserMayApproveApplication(actorWithApprove, { reviewerUserId: `other-user` })
    ).not.toThrow();
  });

  it(`requires application:approve (or approve action token)`, () => {
    const noPermUser: LoadedAuthUser = {
      ...actorWithApprove,
      permissions: [],
    };
    expect(() =>
      assertUserMayApproveApplication(noPermUser, { reviewerUserId: null })
    ).toThrow(
      expect.objectContaining({
        code: `UNAUTHORIZED`,
      })
    );
  });

  it(`allows null reviewer id`, () => {
    expect(() => assertUserMayApproveApplication(actorWithApprove, { reviewerUserId: null })).not.toThrow();
  });
});
