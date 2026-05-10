import type { Request, Response } from 'express';

import type {
  ApplicationStatusParamsDto,
  ApplicationTransitionStatusBodyDto,
} from '../../validation/schemas';
import { asyncHandler } from '../../shared/async-handler';
import type { ApplicationStatus } from './entities';
import { transitionStatus } from './application.service';

export const patchApplicationStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { applicationId } = req.params as unknown as ApplicationStatusParamsDto;
    const body = req.body as ApplicationTransitionStatusBodyDto;
    const actor = req.user!;

    const application = await transitionStatus({
      applicationId,
      targetStatus: body.targetStatus as ApplicationStatus,
      actor,
      expectedVersion: body.expectedVersion,
    });

    res.json({
      success: true,
      application: {
        id: application.id,
        status: application.status,
        reviewer_id: application.reviewer_id,
        approver_id: application.approver_id,
        version: application.version,
      },
    });
  }
);
