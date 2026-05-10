import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationStatus } from '../../applications/entities';
import { getRegulatorySummary } from '../regulatory-summary.service';

const mocks = vi.hoisted(() => ({
  getRawMany: vi.fn(),
  query: vi.fn(),
  createQueryBuilder: vi.fn(),
}));

vi.mock(`../../../database/data-source`, () => ({
  AppDataSource: {
    getRepository: vi.fn(() => ({
      createQueryBuilder: mocks.createQueryBuilder,
    })),
    query: mocks.query,
  },
}));

describe(`getRegulatorySummary`, () => {
  const qb = {
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    getRawMany: mocks.getRawMany,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createQueryBuilder.mockReturnValue(qb);
    mocks.getRawMany.mockResolvedValue([]);
    mocks.query
      .mockResolvedValueOnce([{ avg_seconds: null, cnt: 0 }])
      .mockResolvedValueOnce([]);
  });

  it(`returns zero-filled status counts when no applications exist`, async () => {
    const fixed = new Date(`2026-05-10T12:00:00.000Z`);
    const summary = await getRegulatorySummary(fixed);

    expect(summary.asOf).toBe(fixed.toISOString());
    for (const s of Object.values(ApplicationStatus)) {
      expect(summary.applicationsByStatus[s]).toBe(0);
    }
    expect(summary.underReview).toEqual({
      averageDurationSeconds: null,
      completedCyclesCount: 0,
    });
    expect(summary.topPendingBottlenecks).toEqual([]);
  });

  it(`merges grouped counts into applicationsByStatus`, async () => {
    mocks.getRawMany.mockResolvedValue([
      { status: ApplicationStatus.DRAFT, count: 2 },
      { status: ApplicationStatus.UNDER_REVIEW, count: 1 },
    ]);
    mocks.query
      .mockReset()
      .mockResolvedValueOnce([{ avg_seconds: `120.5`, cnt: 4 }])
      .mockResolvedValueOnce([]);

    const summary = await getRegulatorySummary(new Date(`2026-05-10T12:00:00.000Z`));

    expect(summary.applicationsByStatus[ApplicationStatus.DRAFT]).toBe(2);
    expect(summary.applicationsByStatus[ApplicationStatus.UNDER_REVIEW]).toBe(1);
    expect(summary.applicationsByStatus[ApplicationStatus.SUBMITTED]).toBe(0);
    expect(summary.underReview).toEqual({
      averageDurationSeconds: 120.5,
      completedCyclesCount: 4,
    });
  });

  it(`maps bottleneck rows with ageSeconds from firstAuditAt`, async () => {
    mocks.query
      .mockReset()
      .mockResolvedValueOnce([{ avg_seconds: null, cnt: 0 }])
      .mockResolvedValueOnce([
        {
          applicationId: `550e8400-e29b-41d4-a716-446655440001`,
          applicantId: `550e8400-e29b-41d4-a716-446655440002`,
          status: ApplicationStatus.SUBMITTED,
          firstActivityAt: new Date(`2026-05-10T10:00:00.000Z`),
        },
      ]);

    const summary = await getRegulatorySummary(new Date(`2026-05-10T12:00:00.000Z`));

    expect(summary.topPendingBottlenecks).toHaveLength(1);
    expect(summary.topPendingBottlenecks[0]).toMatchObject({
      applicationId: `550e8400-e29b-41d4-a716-446655440001`,
      applicantId: `550e8400-e29b-41d4-a716-446655440002`,
      status: ApplicationStatus.SUBMITTED,
      ageSeconds: 7200,
    });
    expect(summary.topPendingBottlenecks[0]?.firstAuditAt).toBe(
      `2026-05-10T10:00:00.000Z`
    );
  });
});
