import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUDIT_ACTION_DOCUMENT_UPLOADED } from '../../audit/audit-actions';
import { RoleName } from '../../auth/entities';
import { listComplianceAuditLogs } from '../compliance-audit-logs.service';
import { ApplicationStatus } from '../entities';

const mocks = vi.hoisted(() => ({
  auditFind: vi.fn(),
  userFind: vi.fn(),
  appExist: vi.fn(),
  docFind: vi.fn(),
}));

vi.mock(`../../../repository`, () => ({
  auditLogRepo: { find: mocks.auditFind },
  userRepo: { find: mocks.userFind },
}));

vi.mock(`../../../database/data-source`, () => ({
  AppDataSource: {
    getRepository: vi.fn((entity: unknown) => {
      const name = (entity as { name?: string }).name;
      if (name === `Application`) {
        return { exist: mocks.appExist };
      }
      if (name === `Document`) {
        return { find: mocks.docFind };
      }
      throw new Error(`unexpected repository entity ${String(name)}`);
    }),
  },
}));

describe(`listComplianceAuditLogs`, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.appExist.mockResolvedValue(true);
    mocks.auditFind.mockResolvedValue([]);
    mocks.userFind.mockResolvedValue([]);
    mocks.docFind.mockResolvedValue([]);
  });

  it(`returns 404 when the application does not exist`, async () => {
    mocks.appExist.mockResolvedValue(false);
    await expect(listComplianceAuditLogs(`550e8400-e29b-41d4-a716-446655440000`)).rejects.toMatchObject({
      code: `NOT_FOUND`,
    });
    expect(mocks.auditFind).not.toHaveBeenCalled();
  });

  it(`returns rows newest-first with transition labels and highest-seniority actor role`, async () => {
    const tOld = new Date(`2024-01-01T12:00:00.000Z`);
    const tNew = new Date(`2024-02-01T12:00:00.000Z`);
    mocks.auditFind.mockResolvedValue([
      {
        id: `log-new`,
        application_id: `app-1`,
        actor_id: `actor-1`,
        from_state: ApplicationStatus.FINAL_REVIEW,
        to_state: ApplicationStatus.APPROVED,
        event_action: null,
        document_id: null,
        metadata: null,
        timestamp: tNew,
      },
      {
        id: `log-old`,
        application_id: `app-1`,
        actor_id: `actor-1`,
        from_state: ApplicationStatus.DRAFT,
        to_state: ApplicationStatus.SUBMITTED,
        event_action: null,
        document_id: null,
        metadata: null,
        timestamp: tOld,
      },
    ]);
    mocks.userFind.mockResolvedValue([
      {
        id: `actor-1`,
        name: `Pat Staff`,
        roles: [{ name: RoleName.REVIEWER }, { name: RoleName.ADMIN }],
      },
    ]);

    const out = await listComplianceAuditLogs(`app-1`);
    expect(out.map((r) => r.action_label)).toEqual([
      `Final License Approval`,
      `Application Submitted`,
    ]);
    expect(out[0]?.actor).toEqual({ name: `Pat Staff`, role: RoleName.ADMIN });
    expect(mocks.userFind).toHaveBeenCalledTimes(1);
    expect(mocks.docFind).toHaveBeenCalledTimes(0);
  });

  it(`enriches document upload metadata with version and original_name`, async () => {
    mocks.auditFind.mockResolvedValue([
      {
        id: `log-doc`,
        application_id: `app-1`,
        actor_id: `actor-1`,
        from_state: null,
        to_state: null,
        event_action: AUDIT_ACTION_DOCUMENT_UPLOADED,
        document_id: `doc-1`,
        metadata: null,
        timestamp: new Date(`2024-03-01T10:00:00.000Z`),
      },
    ]);
    mocks.userFind.mockResolvedValue([
      {
        id: `actor-1`,
        name: `Uploader`,
        roles: [{ name: RoleName.APPLICANT }],
      },
    ]);
    mocks.docFind.mockResolvedValue([
      {
        id: `doc-1`,
        version: 3,
        original_name: `license.pdf`,
      },
    ]);

    const out = await listComplianceAuditLogs(`app-1`);
    expect(out[0]?.metadata).toEqual({
      version: 3,
      original_name: `license.pdf`,
    });
  });
});
