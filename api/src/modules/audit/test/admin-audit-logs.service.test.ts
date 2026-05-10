import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listAdminFilteredAuditLogs } from '../admin-audit-logs.service';
import { Application } from '../../applications/entities';

const mocks = vi.hoisted(() => ({
  createQueryBuilder: vi.fn(),
  toComplianceAuditLogEntries: vi.fn(),
}));

vi.mock(`../../../repository`, () => ({
  auditLogRepo: {
    createQueryBuilder: mocks.createQueryBuilder,
  },
}));

vi.mock(`../../applications/compliance-audit-logs.service`, () => ({
  toComplianceAuditLogEntries: mocks.toComplianceAuditLogEntries,
}));

describe(`listAdminFilteredAuditLogs`, () => {
  const getMany = vi.fn();
  const qb = {
    innerJoin: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getMany,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createQueryBuilder.mockReturnValue(qb);
    getMany.mockResolvedValue([]);
    mocks.toComplianceAuditLogEntries.mockResolvedValue([]);
  });

  it(`joins applications when filtering by applicant_id`, async () => {
    await listAdminFilteredAuditLogs({
      applicant_id: `550e8400-e29b-41d4-a716-446655440001`,
      limit: 100,
    });

    expect(qb.innerJoin).toHaveBeenCalledWith(
      Application,
      `app`,
      `app.id = al.application_id`
    );
    expect(qb.andWhere).toHaveBeenCalledWith(`app.applicant_id = :applicant_id`, {
      applicant_id: `550e8400-e29b-41d4-a716-446655440001`,
    });
    expect(qb.take).toHaveBeenCalledWith(100);
    expect(mocks.toComplianceAuditLogEntries).toHaveBeenCalledTimes(1);
  });

  it(`does not join applications when only document_id is set`, async () => {
    await listAdminFilteredAuditLogs({
      document_id: `550e8400-e29b-41d4-a716-446655440002`,
      limit: 30,
    });

    expect(qb.innerJoin).not.toHaveBeenCalled();
    expect(qb.andWhere).toHaveBeenCalledWith(`al.document_id = :document_id`, {
      document_id: `550e8400-e29b-41d4-a716-446655440002`,
    });
    expect(qb.take).toHaveBeenCalledWith(30);
  });
});
