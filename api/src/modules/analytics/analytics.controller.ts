import type { Request, Response } from 'express';

import { asyncHandler } from '../../shared/async-handler';

import { getRegulatorySummary } from './regulatory-summary.service';

export const getRegulatorySummaryHandler = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const data = await getRegulatorySummary();
    res.json({
      success: true,
      data,
    });
  }
);
