import type { Request, Response } from 'express';

import { asyncHandler } from '../../shared/async-handler';

import { getGlobalStats } from './dashboard-stats.service';

export const getDashboardStatsHandler = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const data = await getGlobalStats();
    res.json({ success: true, data });
  }
);
