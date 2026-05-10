import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppPermission } from '../../auth/app-permissions';
import type { LoadedAuthUser } from '../../auth/auth.types';
import { ApplicationStatus } from '../entities';
import { transitionStatus } from '../application.service';

const mocks = vi.hoisted(() => {
  const appRepo = {
    findOne: vi.fn(),
    save: vi.fn((r: unknown) => Promise.resolve(r)),
  };
  const auditRepo = {
    create: vi.fn((row: unknown) => row),
    save: vi.fn().mockResolvedValue(undefined),
  };
  const transactionalManagerStub = {
    getRepository(entity: unknown) {
      const name = (entity as { name?: string })?.name;
      if (name === `Application`) {
        return appRepo;
      }
      if (name === `AuditLog`) {
        return auditRepo;
      }
      throw new Error(`unexpected repository entity`);
    },
  };
  return {
    appRepo,
    auditRepo,
    transactionalManagerStub,
    runInTransaction: vi.fn(
      async (_ds: unknown, fn: (m: typeof transactionalManagerStub) => Promise<unknown>) =>
        fn(transactionalManagerStub)
    ),
  };
});

vi.mock(`../../../database/transaction`, () => ({
  runInTransaction: mocks.runInTransaction,
}));

vi.mock(`../../../database/data-source`, () => ({
  AppDataSource: {},
}));

vi.mock(`../../../config/env`, async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../../config/env")>();
  return { ...mod, env: { ...mod.env, nodeEnv: `test` } };
});

const actorWithApprove = {
  id: `approver-1`,
  email: `a@x.com`,
  roles: [],
  permissions: [AppPermission.ApplicationApproveCompound],
} satisfies LoadedAuthUser;

const actorWithSubmit = {
  id: `applicant-1`,
  email: `b@x.com`,
  roles: [],
  permissions: [`application:submit`],
} satisfies LoadedAuthUser;

describe(`application.service`, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runInTransaction.mockImplementation(async (_ds: unknown, fn) =>
      fn(mocks.transactionalManagerStub)
    );
  });

  describe(`transitionStatus`, () => {
    it(`persists audit row and bumps version on valid approve transition`, async () => {
      const row = {
        id: `app-1`,
        status: ApplicationStatus.FINAL_REVIEW,
        reviewer_id: `other`,
        approver_id: null,
        version: 3,
      };
      mocks.appRepo.findOne.mockResolvedValue(row);

      const saved = await transitionStatus({
        applicationId: `app-1`,
        targetStatus: ApplicationStatus.APPROVED,
        actor: actorWithApprove,
        expectedVersion: 3,
      });

      expect(saved.status).toBe(ApplicationStatus.APPROVED);
      expect(saved.version).toBe(4);
      expect(saved.approver_id).toBe(actorWithApprove.id);
      expect(mocks.auditRepo.save).toHaveBeenCalledTimes(1);
      expect(mocks.auditRepo.create).toHaveBeenCalledWith({
        application_id: `app-1`,
        actor_id: actorWithApprove.id,
        from_state: ApplicationStatus.FINAL_REVIEW,
        to_state: ApplicationStatus.APPROVED,
      });
      expect(mocks.runInTransaction).toHaveBeenCalledTimes(1);
    });

    it(`throws NOT_FOUND when application missing`, async () => {
      mocks.appRepo.findOne.mockResolvedValue(null);

      await expect(
        transitionStatus({
          applicationId: `missing`,
          targetStatus: ApplicationStatus.SUBMITTED,
          actor: actorWithSubmit,
          expectedVersion: 0,
        })
      ).rejects.toMatchObject({
        code: `NOT_FOUND`,
      });
      expect(mocks.auditRepo.save).not.toHaveBeenCalled();
    });

    it(`throws CONFLICT on version mismatch`, async () => {
      mocks.appRepo.findOne.mockResolvedValue({
        id: `app-1`,
        status: ApplicationStatus.DRAFT,
        reviewer_id: null,
        approver_id: null,
        version: 2,
      });

      await expect(
        transitionStatus({
          applicationId: `app-1`,
          targetStatus: ApplicationStatus.SUBMITTED,
          actor: actorWithSubmit,
          expectedVersion: 1,
        })
      ).rejects.toMatchObject({ code: `CONFLICT` });
    });

    it(`throws BAD_REQUEST on invalid transition`, async () => {
      mocks.appRepo.findOne.mockResolvedValue({
        id: `app-1`,
        status: ApplicationStatus.DRAFT,
        reviewer_id: null,
        approver_id: null,
        version: 0,
      });

      await expect(
        transitionStatus({
          applicationId: `app-1`,
          targetStatus: ApplicationStatus.APPROVED,
          actor: actorWithApprove,
          expectedVersion: 0,
        })
      ).rejects.toMatchObject({ code: `BAD_REQUEST` });
    });

    it(`throws UNAUTHORIZED when actor lacks transition permission`, async () => {
      mocks.appRepo.findOne.mockResolvedValue({
        id: `app-1`,
        status: ApplicationStatus.DRAFT,
        reviewer_id: null,
        approver_id: null,
        version: 0,
      });

      await expect(
        transitionStatus({
          applicationId: `app-1`,
          targetStatus: ApplicationStatus.SUBMITTED,
          actor: actorWithApprove,
          expectedVersion: 0,
        })
      ).rejects.toMatchObject({ code: `UNAUTHORIZED` });
    });

    it(`throws UNAUTHORIZED when approver is the assigned reviewer`, async () => {
      mocks.appRepo.findOne.mockResolvedValue({
        id: `app-1`,
        status: ApplicationStatus.FINAL_REVIEW,
        reviewer_id: actorWithApprove.id,
        approver_id: null,
        version: 0,
      });

      await expect(
        transitionStatus({
          applicationId: `app-1`,
          targetStatus: ApplicationStatus.APPROVED,
          actor: actorWithApprove,
          expectedVersion: 0,
        })
      ).rejects.toMatchObject({ code: `UNAUTHORIZED` });
    });
  });
});
