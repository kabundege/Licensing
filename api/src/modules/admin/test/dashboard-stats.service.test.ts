import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Application, ApplicationStatus, AuditLog } from '../../applications/entities';
import { User } from '../../auth/entities';
import { getGlobalStats } from '../dashboard-stats.service';

const mockGetRawManyApp = vi.fn();
const mockGetRawManyUser = vi.fn();
const mockGetCount = vi.fn();
const mockGetRawOne = vi.fn();

const appQb = {
  select: vi.fn().mockReturnThis(),
  addSelect: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  getRawMany: mockGetRawManyApp,
};

const userQb = {
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  addSelect: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  addGroupBy: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  getRawMany: mockGetRawManyUser,
};

let auditBuilderPhase = 0;

const makeAuditSubQb = () => ({
  select: vi.fn().mockReturnThis(),
  addSelect: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  getQuery: vi.fn(() => `(subquery_${auditBuilderPhase})`),
  getParameters: vi.fn(() =>
    auditBuilderPhase === 1
      ? { submittedSt: ApplicationStatus.SUBMITTED }
      : { finalSt: ApplicationStatus.FINAL_REVIEW }
  ),
});

const securityCountQb = {
  where: vi.fn().mockReturnThis(),
  getCount: mockGetCount,
};

const managerQb = {
  select: vi.fn().mockReturnThis(),
  addSelect: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  setParameters: vi.fn().mockReturnThis(),
  getRawOne: mockGetRawOne,
};

const mocks = vi.hoisted(() => ({
  getRepository: vi.fn(),
}));

vi.mock(`../../../database/data-source`, () => ({
  AppDataSource: {
    getRepository: mocks.getRepository,
    manager: {
      createQueryBuilder: vi.fn(() => managerQb),
    },
  },
}));

describe(`getGlobalStats`, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditBuilderPhase = 0;
    mockGetRawManyApp.mockResolvedValue([
      { status: ApplicationStatus.DRAFT, cnt: `1` },
      { status: ApplicationStatus.SUBMITTED, cnt: `2` },
    ]);
    mockGetRawManyUser.mockResolvedValue([
      {
        userId: `u1`,
        userName: `Pat Reviewer`,
        userEmail: `pat@example.com`,
        assignedCount: `3`,
      },
    ]);
    mockGetCount.mockResolvedValue(5);
    mockGetRawOne.mockResolvedValue({ avgHours: `48.5`, sampleSize: `10` });

    mocks.getRepository.mockImplementation((entity: { name?: string }) => {
      if (entity?.name === `Application`) {
        return { createQueryBuilder: () => appQb };
      }
      if (entity?.name === `User`) {
        return { createQueryBuilder: () => userQb };
      }
      if (entity?.name === `AuditLog`) {
        return {
          createQueryBuilder: () => {
            auditBuilderPhase += 1;
            if (auditBuilderPhase <= 2) {
              return makeAuditSubQb();
            }
            return securityCountQb;
          },
        };
      }
      throw new Error(`unexpected entity ${entity?.name}`);
    });
  });

  it(`returns chart-oriented aggregates from query builders`, async () => {
    const out = await getGlobalStats();

    expect(out.statusDistribution.labels).toEqual(Object.values(ApplicationStatus));
    expect(out.statusDistribution.values[0]).toBe(1);
    expect(out.statusDistribution.byStatus[ApplicationStatus.SUBMITTED]).toBe(2);

    expect(out.reviewerWorkload.reviewers).toHaveLength(1);
    expect(out.reviewerWorkload.labels).toEqual([`Pat Reviewer`]);
    expect(out.reviewerWorkload.values).toEqual([3]);

    expect(out.submittedToFinalReview.averageHours).toBe(48.5);
    expect(out.submittedToFinalReview.sampleCount).toBe(10);
    expect(out.submittedToFinalReview.averageDays).not.toBeNull();

    expect(out.securityIntegrity.blockedApprovalIdentityConflictCount).toBe(5);

    expect(mocks.getRepository).toHaveBeenCalledWith(Application);
    expect(mocks.getRepository).toHaveBeenCalledWith(User);
    expect(mocks.getRepository).toHaveBeenCalledWith(AuditLog);
  });
});
