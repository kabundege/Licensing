import type { Request, Response } from 'express';

import { asyncHandler } from '../../shared/async-handler';
import type { AdminAuditLogsQueryDto } from '../validation/schemas';

import { listAdminFilteredAuditLogs } from './admin-audit-logs.service';

export const listAdminAuditLogsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as AdminAuditLogsQueryDto;
    const data = await listAdminFilteredAuditLogs(query);
    res.json({
      success: true,
      data,
    });
  }
);
