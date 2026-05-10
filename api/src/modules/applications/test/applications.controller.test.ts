import type { Request, Response } from 'express';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ApplicationStatus } from '../entities';

const mocks = vi.hoisted(() => ({
  transitionStatus: vi.fn(),
}));

vi.mock(`../application.service`, () => ({
  transitionStatus: mocks.transitionStatus,
}));

import { patchApplicationStatus } from '../applications.controller';

describe(`applications.controller`, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(`calls transitionStatus and responds with application snapshot`, async () => {
    mocks.transitionStatus.mockResolvedValue({
      id: `app-1`,
      status: ApplicationStatus.APPROVED,
      reviewer_id: `rev-1`,
      approver_id: `apr-1`,
      version: 4,
    });

    const json = vi.fn();
    const res = { json } as Pick<Response, `json`>;
    const next = vi.fn();
    const req = {
      params: { applicationId: `550e8400-e29b-41d4-a716-446655440000` },
      body: {
        targetStatus: ApplicationStatus.APPROVED,
        expectedVersion: 3,
      },
      user: {
        id: `apr-1`,
        email: `a@b.com`,
        roles: [],
        permissions: [`application:approve`],
      },
    } as unknown as Request;

    patchApplicationStatus(req, res as Response, next);
    await new Promise<void>((r) => {
      setImmediate(r);
    });

    expect(next).not.toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith({
      success: true,
      application: {
        id: `app-1`,
        status: ApplicationStatus.APPROVED,
        reviewer_id: `rev-1`,
        approver_id: `apr-1`,
        version: 4,
      },
    });
    expect(mocks.transitionStatus).toHaveBeenCalledWith({
      applicationId: `550e8400-e29b-41d4-a716-446655440000`,
      targetStatus: ApplicationStatus.APPROVED,
      actor: req.user,
      expectedVersion: 3,
    });
  });

  it(`forwards errors via next`, async () => {
    const err = new Error(`boom`);
    mocks.transitionStatus.mockRejectedValue(err);

    const json = vi.fn();
    const res = { json } as Pick<Response, `json`>;
    const next = vi.fn();
    const req = {
      params: { applicationId: `550e8400-e29b-41d4-a716-446655440000` },
      body: {
        targetStatus: ApplicationStatus.SUBMITTED,
        expectedVersion: 0,
      },
      user: {
        id: `u1`,
        email: `u@b.com`,
        roles: [],
        permissions: [],
      },
    } as unknown as Request;

    patchApplicationStatus(req, res as Response, next);
    await new Promise<void>((r) => {
      setImmediate(r);
    });

    expect(json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(err);
  });
});
