import type { Request, Response } from 'express';

import type {
  ApplicationDocumentsQueryDto,
  ApplicationIdParamsDto,
  ApplicationTransitionStatusBodyDto,
} from '../../validation/schemas';
import { asyncHandler } from '../../shared/async-handler';
import {
  applicationPublicShape,
  auditLogPublicShape,
} from './application-response';
import {
  createApplication,
  getApplicationWithAuditLogs,
  listApplications,
  transitionStatus,
} from './application.service';
import type { ApplicationStatus } from './entities';
import { documentPublicShape } from '../documents/document-response';
import { listDocumentsForApplication } from '../documents/documents.service';

export const listApplicationsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const applications = await listApplications(req.user!);
    res.json({
      success: true,
      data: applications.map(applicationPublicShape),
    });
  }
);

export const getApplicationByIdHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as unknown as ApplicationIdParamsDto;
    const { application, auditLogs } = await getApplicationWithAuditLogs(
      id,
      req.user!
    );

    res.json({
      success: true,
      data: {
        ...applicationPublicShape(application),
        auditLogs: auditLogs.map(auditLogPublicShape),
      },
    });
  }
);

export const listApplicationDocumentsHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as unknown as ApplicationIdParamsDto;
    const { includeHistory } = req.query as unknown as ApplicationDocumentsQueryDto;
    const docs = await listDocumentsForApplication(id, req.user!, includeHistory);
    res.json({
      success: true,
      data: docs.map(documentPublicShape),
    });
  }
);

export const createApplicationHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const application = await createApplication(req.user!);
    res.status(201).json({
      success: true,
      data: applicationPublicShape(application),
    });
  }
);

export const patchApplicationStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as unknown as ApplicationIdParamsDto;
    const body = req.body as ApplicationTransitionStatusBodyDto;
    const actor = req.user!;

    const application = await transitionStatus(
      id,
      body.targetStatus as ApplicationStatus,
      actor,
      body.expectedVersion
    );

    res.json({
      success: true,
      data: applicationPublicShape(application),
    });
  }
);
