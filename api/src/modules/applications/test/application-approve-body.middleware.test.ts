import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppPermission } from '../../auth/app-permissions';
import { restrictTo } from '../../../middleware/auth.middleware';
import { ApplicationStatus } from '../entities';
import { restrictToApprovePermissionWhenBodyTargetsApproved } from '../application-approve-body.middleware';

vi.mock(`../../../middleware/auth.middleware`, () => ({
  restrictTo: vi.fn(() => vi.fn()),
}));

describe(`restrictToApprovePermissionWhenBodyTargetsApproved`, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(`skips restrictTo when targetStatus is not APPROVED`, () => {
    const next = vi.fn();
    const req = {
      body: { targetStatus: ApplicationStatus.SUBMITTED },
    } as Request;

    restrictToApprovePermissionWhenBodyTargetsApproved(
      req,
      {} as Response,
      next as NextFunction
    );

    expect(next).toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledTimes(1);
    expect(restrictTo).not.toHaveBeenCalled();
  });

  it(`delegates to restrictTo(ApplicationApproveCompound) when targeting APPROVED`, () => {
    const inner = vi.fn();
    vi.mocked(restrictTo).mockReturnValue(inner as never);

    const next = vi.fn();
    const req = {
      body: { targetStatus: ApplicationStatus.APPROVED },
    } as Request;
    const res = {} as Response;

    restrictToApprovePermissionWhenBodyTargetsApproved(req, res, next);

    expect(restrictTo).toHaveBeenCalledWith(AppPermission.ApplicationApproveCompound);
    expect(inner).toHaveBeenCalledWith(req, res, next);
  });
});
