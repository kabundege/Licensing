import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addPromotionRoleToUser,
  createReviewerAccount,
  loginUser,
  signupUser,
} from '../auth.service';
import type { Permission } from '../entities';
import { Role, RoleName, User } from '../entities';

const mocks = vi.hoisted(() => {
  const userRepoMocks = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };
  const roleRepoMocks = {
    findOne: vi.fn(),
  };
  const txUserRepo = {
    findOne: vi.fn(),
    save: vi.fn((r: unknown) => Promise.resolve(r)),
  };
  const txRoleRepo = {
    findOne: vi.fn(),
  };
  const logPromotion = vi.fn().mockResolvedValue(undefined);

  const transactionalManagerStub = {
    getRepository(entity: typeof User | typeof Role) {
      return entity === User ? txUserRepo : txRoleRepo;
    },
  };

  return {
    userRepoMocks,
    roleRepoMocks,
    txUserRepo,
    txRoleRepo,
    transactionalManagerStub,
    runInTransaction: vi.fn(async (_ds: unknown, fn: (m: typeof transactionalManagerStub) => Promise<unknown>) =>
      fn(transactionalManagerStub)
    ),
    AuditService: vi.fn(function () {
      return { logPromotion };
    }),
    logPromotion,
  };
});

vi.mock(`../../../repository`, () => ({
  userRepo: mocks.userRepoMocks,
  roleRepo: mocks.roleRepoMocks,
}));

vi.mock(`../../../database/transaction`, () => ({
  runInTransaction: mocks.runInTransaction,
}));

vi.mock(`../../audit/audit.service`, () => ({
  AuditService: mocks.AuditService,
}));

vi.mock(`../../../config/env`, async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../../config/env")>();
  return {
    ...mod,
    getJwtSigningSecret: () => `test-secret-at-least-thirty-two-chars-xx`,
  };
});

describe(`auth.service`, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runInTransaction.mockImplementation(async (_ds: unknown, fn) =>
      fn(mocks.transactionalManagerStub)
    );
  });

  describe(`signupUser`, () => {
    it(`creates applicant when roles exist`, async () => {
      const applicantRole = {
        id: `role-applicant`,
        name: RoleName.APPLICANT,
        permissions: [],
      };
      const payload = {
        email: `new@example.com`,
        password: `password12`,
        name: `Test User`,
      };
      const saved = {
        id: `user-1`,
        ...payload,
        password: `hashed`,
        roles: [applicantRole],
      };
      const hydrated = saved;
      mocks.userRepoMocks.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(hydrated as never);
      mocks.roleRepoMocks.findOne.mockResolvedValue(applicantRole as never);
      mocks.userRepoMocks.create.mockReturnValue(saved as never);
      mocks.userRepoMocks.save.mockResolvedValue(saved as never);
      vi.spyOn(bcrypt, `hash`).mockResolvedValue(`hashed` as never);

      const u = await signupUser(payload);

      expect(u.id).toBe(`user-1`);
      expect(bcrypt.hash).toHaveBeenCalled();
      expect(mocks.userRepoMocks.save).toHaveBeenCalled();
      expect(u.roles.some((r) => r.name === RoleName.APPLICANT)).toBe(true);
    });

    it(`throws CONFLICT when email exists`, async () => {
      mocks.userRepoMocks.findOne.mockResolvedValue({ id: `x` } as never);
      await expect(
        signupUser({
          email: `taken@example.com`,
          password: `password12`,
          name: `Ada`,
        })
      ).rejects.toMatchObject({ code: `CONFLICT` });
    });
  });

  describe(`loginUser`, () => {
    it(`returns jwt when password matches (roles + merged permissions)`, async () => {
      const approvePerm = {
        resource: `application`,
        action: `approve`,
      } as Permission;
      const reviewerRole = {
        id: `r1`,
        name: RoleName.REVIEWER,
        permissions: [],
      };
      const approverRole = {
        id: `r2`,
        name: RoleName.APPROVER,
        permissions: [approvePerm],
      };

      const stored = {
        id: `u1`,
        email: `a@b.com`,
        password: `hash-in-db`,
        roles: [reviewerRole, approverRole],
      };
      mocks.userRepoMocks.findOne.mockResolvedValue(stored as never);
      vi.spyOn(bcrypt, `compare`).mockResolvedValue(true as never);
      vi.spyOn(jwt, `sign`).mockReturnValue(`token` as never);

      const tok = await loginUser({ email: stored.email, password: `plaintext` });

      expect(tok).toBe(`token`);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: `u1`,
          email: stored.email,
          roles: [RoleName.APPROVER, RoleName.REVIEWER],
          permissions: expect.arrayContaining([`approve`, `application:approve`]),
        }),
        expect.any(String),
        expect.objectContaining({ expiresIn: `12h`, algorithm: `HS256` })
      );
    });

    it(`throws UNAUTHORIZED when compare fails`, async () => {
      mocks.userRepoMocks.findOne.mockResolvedValue({
        id: `u1`,
        email: `a@b.com`,
        password: `h`,
        roles: [
          {
            name: RoleName.APPLICANT,
            permissions: [],
          },
        ],
      } as never);
      vi.spyOn(bcrypt, `compare`).mockResolvedValue(false as never);
      await expect(
        loginUser({ email: `a@b.com`, password: `wrong` })
      ).rejects.toMatchObject({ code: `UNAUTHORIZED` });
    });
  });

  describe(`createReviewerAccount`, () => {
    it(`persists reviewer role assignment`, async () => {
      const reviewerRole = {
        id: `rv`,
        name: RoleName.REVIEWER,
        permissions: [],
      };
      const created = {
        id: `u2`,
        email: `r@x.com`,
        name: `R`,
        password: `x`,
        roles: [reviewerRole],
      };
      mocks.userRepoMocks.findOne.mockResolvedValueOnce(null);
      mocks.roleRepoMocks.findOne.mockResolvedValue(reviewerRole as never);
      mocks.userRepoMocks.create.mockReturnValue(created as never);
      mocks.userRepoMocks.save.mockResolvedValue(created as never);
      mocks.userRepoMocks.findOne.mockResolvedValueOnce(created as never);
      vi.spyOn(bcrypt, `hash`).mockResolvedValue(`h` as never);

      const u = await createReviewerAccount({
        email: `r@x.com`,
        password: `longpassword`,
        name: `R`,
      });

      expect(u.roles.map((r) => r.name)).toContain(RoleName.REVIEWER);
      expect(bcrypt.hash).toHaveBeenCalled();
    });
  });

  describe(`addPromotionRoleToUser`, () => {
    it(`runs in transaction and logs audit when reviewer added`, async () => {
      const reviewerRole = {
        id: `rv`,
        name: RoleName.REVIEWER,
        permissions: [],
      };
      const record = {
        id: `target`,
        email: `t@x.com`,
        name: `T`,
        password: `p`,
        roles: [{ name: RoleName.APPLICANT, permissions: [] }],
      };
      const after = {
        ...record,
        roles: [...record.roles, reviewerRole],
      };
      mocks.txRoleRepo.findOne.mockResolvedValue(reviewerRole as never);
      mocks.txUserRepo.findOne
        .mockResolvedValueOnce(record as never)
        .mockResolvedValueOnce(after as never);

      const out = await addPromotionRoleToUser({
        targetUserId: `target`,
        performedByUserId: `admin`,
        roleName: RoleName.REVIEWER,
      });

      expect(out.roles.some((r) => r.name === RoleName.REVIEWER)).toBe(true);
      expect(mocks.txUserRepo.save).toHaveBeenCalled();
      expect(mocks.runInTransaction).toHaveBeenCalled();
      expect(mocks.logPromotion).toHaveBeenCalledWith({
        promotedUserId: `target`,
        performedByUserId: `admin`,
        addedRole: RoleName.REVIEWER,
      });
    });

    it(`skips audit when role already assigned`, async () => {
      const reviewerRole = {
        id: `rv`,
        name: RoleName.REVIEWER,
        permissions: [],
      };
      const record = {
        id: `target`,
        email: `t@x.com`,
        name: `T`,
        password: `p`,
        roles: [reviewerRole],
      };

      mocks.txRoleRepo.findOne.mockResolvedValue(reviewerRole as never);
      mocks.txUserRepo.findOne
        .mockResolvedValueOnce(record as never)
        .mockResolvedValueOnce(record as never);

      await addPromotionRoleToUser({
        targetUserId: `target`,
        performedByUserId: `admin`,
        roleName: RoleName.REVIEWER,
      });

      expect(mocks.txUserRepo.save).not.toHaveBeenCalled();
      expect(mocks.logPromotion).not.toHaveBeenCalled();
    });
  });
});
