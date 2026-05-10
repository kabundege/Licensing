import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppPermission } from '../../auth/app-permissions';
import type { LoadedAuthUser } from '../../auth/auth.types';
import { RoleName } from '../../auth/entities';
import {
  actorSeesAllApplications,
  createApplication,
  getApplicationWithAuditLogs,
  listApplications,
  transitionStatus,
} from '../application.service';
import { AUDIT_ACTION_APPROVAL_BLOCKED_REVIEWER_IDENTITY } from '../../audit/audit-actions';
import { ApplicationStatus } from '../entities';

const mocks = vi.hoisted(() => {
  const txAppRepo = {
    findOne: vi.fn(),
    save: vi.fn((r: unknown) => Promise.resolve(r)),
  };
  const txAuditRepo = {
    create: vi.fn((row: unknown) => row),
    save: vi.fn().mockResolvedValue(undefined),
  };
  const dsApplicationRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn((x: unknown) => x),
    save: vi.fn((x: unknown) => Promise.resolve(x)),
  };
  const dsAuditRepo = {
    find: vi.fn(),
    create: vi.fn((x: unknown) => x),
    save: vi.fn().mockResolvedValue(undefined),
  };
  const transactionalManagerStub = {
    getRepository(entity: unknown) {
      const name = (entity as { name?: string })?.name;
      if (name === `Application`) {
        return txAppRepo;
      }
      if (name === `AuditLog`) {
        return txAuditRepo;
      }
      throw new Error(`unexpected transactional repository entity`);
    },
  };
  return {
    txAppRepo,
    txAuditRepo,
    dsApplicationRepo,
    dsAuditRepo,
    transactionalManagerStub,
    runInTransaction: vi.fn(
      async (_ds: unknown, fn: (m: typeof transactionalManagerStub) => Promise<unknown>) =>
        fn(transactionalManagerStub)
    ),
    getRepository: vi.fn((entity: unknown) => {
      const name = (entity as { name?: string })?.name;
      if (name === `Application`) {
        return dsApplicationRepo;
      }
      if (name === `AuditLog`) {
        return dsAuditRepo;
      }
      throw new Error(`unexpected AppDataSource repository entity`);
    }),
  };
});

vi.mock(`../../../database/transaction`, () => ({
  runInTransaction: mocks.runInTransaction,
}));

vi.mock(`../../../database/data-source`, () => ({
  AppDataSource: {
    getRepository: mocks.getRepository,
  },
}));

vi.mock(`../../../repository`, () => ({
  auditLogRepo: mocks.dsAuditRepo,
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

const applicantActor = {
  id: `user-applicant`,
  email: `app@x.com`,
  roles: [RoleName.APPLICANT],
  permissions: [],
} satisfies LoadedAuthUser;

const reviewerActor = {
  id: `user-reviewer`,
  email: `rev@x.com`,
  roles: [RoleName.REVIEWER],
  permissions: [],
} satisfies LoadedAuthUser;

describe(`application.service`, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runInTransaction.mockImplementation(async (_ds: unknown, fn) =>
      fn(mocks.transactionalManagerStub)
    );
  });

  describe(`actorSeesAllApplications`, () => {
    it(`is false for applicant-only principals`, () => {
      expect(actorSeesAllApplications(applicantActor)).toBe(false);
    });

    it(`is true for reviewer, approver, and admin roles`, () => {
      expect(
        actorSeesAllApplications({
          ...reviewerActor,
          roles: [RoleName.REVIEWER],
        })
      ).toBe(true);
      expect(
        actorSeesAllApplications({
          ...reviewerActor,
          roles: [RoleName.APPROVER],
        })
      ).toBe(true);
      expect(
        actorSeesAllApplications({
          ...reviewerActor,
          roles: [RoleName.ADMIN],
        })
      ).toBe(true);
    });
  });

  describe(`listApplications`, () => {
    it(`filters by applicant_id for non-staff actors`, async () => {
      mocks.dsApplicationRepo.find.mockResolvedValue([
        { id: `a1`, applicant_id: applicantActor.id },
      ]);

      const rows = await listApplications(applicantActor);

      expect(rows).toHaveLength(1);
      expect(mocks.dsApplicationRepo.find).toHaveBeenCalledWith({
        where: { applicant_id: applicantActor.id },
        order: { id: `ASC` },
      });
    });

    it(`returns all rows for reviewer principals`, async () => {
      mocks.dsApplicationRepo.find.mockResolvedValue([
        { id: `a1`, applicant_id: `other` },
        { id: `a2`, applicant_id: `x` },
      ]);

      const rows = await listApplications(reviewerActor);

      expect(rows).toHaveLength(2);
      expect(mocks.dsApplicationRepo.find).toHaveBeenCalledWith({
        order: { id: `ASC` },
      });
    });
  });

  describe(`getApplicationWithAuditLogs`, () => {
    it(`throws NOT_FOUND when id does not exist`, async () => {
      mocks.dsApplicationRepo.findOne.mockResolvedValue(null);

      await expect(
        getApplicationWithAuditLogs(`550e8400-e29b-41d4-a716-446655440000`, applicantActor)
      ).rejects.toMatchObject({ code: `NOT_FOUND` });
      expect(mocks.dsAuditRepo.find).not.toHaveBeenCalled();
    });

    it(`throws UNAUTHORIZED when applicant reads another user's application`, async () => {
      mocks.dsApplicationRepo.findOne.mockResolvedValue({
        id: `app-x`,
        applicant_id: `someone-else`,
        status: ApplicationStatus.DRAFT,
        reviewer_id: null,
        approver_id: null,
        version: 0,
      });

      await expect(getApplicationWithAuditLogs(`app-x`, applicantActor)).rejects.toMatchObject({
        code: `UNAUTHORIZED`,
      });
      expect(mocks.dsAuditRepo.find).not.toHaveBeenCalled();
    });

    it(`returns application and ordered audit logs for owner`, async () => {
      const applicationRow = {
        id: `app-own`,
        applicant_id: applicantActor.id,
        status: ApplicationStatus.SUBMITTED,
        reviewer_id: null,
        approver_id: null,
        version: 1,
      };
      const logs = [
        {
          id: `log-1`,
          application_id: `app-own`,
          actor_id: applicantActor.id,
          from_state: ApplicationStatus.DRAFT,
          to_state: ApplicationStatus.SUBMITTED,
          timestamp: new Date(`2026-01-02`),
        },
      ];
      mocks.dsApplicationRepo.findOne.mockResolvedValue(applicationRow);
      mocks.dsAuditRepo.find.mockResolvedValue(logs);

      const detail = await getApplicationWithAuditLogs(`app-own`, applicantActor);

      expect(detail.application).toEqual(applicationRow);
      expect(detail.auditLogs).toEqual(logs);
      expect(mocks.dsAuditRepo.find).toHaveBeenCalledWith({
        where: { application_id: `app-own` },
        order: { timestamp: `ASC` },
      });
    });

    it(`allows reviewers to load another applicant's application`, async () => {
      mocks.dsApplicationRepo.findOne.mockResolvedValue({
        id: `app-other`,
        applicant_id: `not-reviewer`,
        status: ApplicationStatus.UNDER_REVIEW,
        reviewer_id: reviewerActor.id,
        approver_id: null,
        version: 2,
      });
      mocks.dsAuditRepo.find.mockResolvedValue([]);

      await expect(
        getApplicationWithAuditLogs(`app-other`, reviewerActor)
      ).resolves.toMatchObject({
        application: expect.objectContaining({ id: `app-other` }),
        auditLogs: [],
      });
    });
  });

  describe(`createApplication`, () => {
    it(`creates DRAFT owned by the actor`, async () => {
      const saved = {
        id: `new-app`,
        applicant_id: applicantActor.id,
        status: ApplicationStatus.DRAFT,
        reviewer_id: null,
        approver_id: null,
        version: 0,
      };
      mocks.dsApplicationRepo.save.mockResolvedValue(saved);

      const row = await createApplication(applicantActor);

      expect(row).toEqual(saved);
      expect(mocks.dsApplicationRepo.create).toHaveBeenCalledWith({
        applicant_id: applicantActor.id,
        status: ApplicationStatus.DRAFT,
        reviewer_id: null,
        approver_id: null,
        version: 0,
      });
      expect(mocks.dsApplicationRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe(`transitionStatus`, () => {
    it(`persists audit row and bumps version on valid approve transition`, async () => {
      const row = {
        id: `app-1`,
        applicant_id: `app-1-owner`,
        status: ApplicationStatus.FINAL_REVIEW,
        reviewer_id: `other`,
        approver_id: null,
        version: 3,
      };
      mocks.txAppRepo.findOne.mockResolvedValue(row);

      const saved = await transitionStatus(
        `app-1`,
        ApplicationStatus.APPROVED,
        actorWithApprove,
        3
      );

      expect(saved.status).toBe(ApplicationStatus.APPROVED);
      expect(saved.version).toBe(4);
      expect(saved.approver_id).toBe(actorWithApprove.id);
      expect(mocks.txAuditRepo.save).toHaveBeenCalledTimes(1);
      expect(mocks.txAuditRepo.create).toHaveBeenCalledWith({
        application_id: `app-1`,
        actor_id: actorWithApprove.id,
        from_state: ApplicationStatus.FINAL_REVIEW,
        to_state: ApplicationStatus.APPROVED,
        event_action: null,
        document_id: null,
        metadata: null,
      });
      expect(mocks.runInTransaction).toHaveBeenCalledTimes(1);
    });

    it(`throws NOT_FOUND when application missing`, async () => {
      mocks.txAppRepo.findOne.mockResolvedValue(null);

      await expect(
        transitionStatus(`missing`, ApplicationStatus.SUBMITTED, actorWithSubmit, 0)
      ).rejects.toMatchObject({
        code: `NOT_FOUND`,
      });
      expect(mocks.txAuditRepo.save).not.toHaveBeenCalled();
    });

    it(`throws CONFLICT on version mismatch`, async () => {
      mocks.txAppRepo.findOne.mockResolvedValue({
        id: `app-1`,
        applicant_id: `a`,
        status: ApplicationStatus.DRAFT,
        reviewer_id: null,
        approver_id: null,
        version: 2,
      });

      await expect(
        transitionStatus(`app-1`, ApplicationStatus.SUBMITTED, actorWithSubmit, 1)
      ).rejects.toMatchObject({ code: `CONFLICT` });
    });

    it(`throws BAD_REQUEST on invalid transition`, async () => {
      mocks.txAppRepo.findOne.mockResolvedValue({
        id: `app-1`,
        applicant_id: `a`,
        status: ApplicationStatus.DRAFT,
        reviewer_id: null,
        approver_id: null,
        version: 0,
      });

      await expect(
        transitionStatus(`app-1`, ApplicationStatus.APPROVED, actorWithApprove, 0)
      ).rejects.toMatchObject({ code: `BAD_REQUEST` });
    });

    it(`throws UNAUTHORIZED when actor lacks transition permission`, async () => {
      mocks.txAppRepo.findOne.mockResolvedValue({
        id: `app-1`,
        applicant_id: `a`,
        status: ApplicationStatus.DRAFT,
        reviewer_id: null,
        approver_id: null,
        version: 0,
      });

      await expect(
        transitionStatus(`app-1`, ApplicationStatus.SUBMITTED, actorWithApprove, 0)
      ).rejects.toMatchObject({ code: `UNAUTHORIZED` });
    });

    it(`throws UNAUTHORIZED when approver is the assigned reviewer`, async () => {
      const row = {
        id: `app-1`,
        applicant_id: `a`,
        status: ApplicationStatus.FINAL_REVIEW,
        reviewer_id: actorWithApprove.id,
        approver_id: null,
        version: 0,
      };
      mocks.txAppRepo.findOne.mockResolvedValue(row);
      mocks.dsApplicationRepo.findOne.mockResolvedValue(row);

      await expect(
        transitionStatus(`app-1`, ApplicationStatus.APPROVED, actorWithApprove, 0)
      ).rejects.toMatchObject({ code: `UNAUTHORIZED` });

      expect(mocks.dsAuditRepo.save).toHaveBeenCalledTimes(1);
      expect(mocks.dsAuditRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_action: AUDIT_ACTION_APPROVAL_BLOCKED_REVIEWER_IDENTITY,
          application_id: `app-1`,
        })
      );
    });
  });
});
