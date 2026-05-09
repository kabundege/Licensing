import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import { errorHandler } from './middleware/error-handler.middleware';
import { applicationsRouter } from './modules/applications/applications.routes';
import { auditRouter } from './modules/audit/audit.routes';
import { authRouter } from './modules/auth/auth.routes';
import { documentsRouter } from './modules/documents/documents.routes';
import { AppError } from './shared/errors/AppError';

export const createApp = (): express.Application => {
  const app = express();

  app.disable(`x-powered-by`);
  app.use(helmet());
  app.use(
    cors({
      origin:
        env.corsOrigin === `*`
          ? true
          : env.corsOrigin
            .split(`,`)
            .map((origin) => origin.trim())
            .filter(Boolean),
      credentials: true,
    })
  );
  app.use(express.json({ limit: `1mb` }));

  const uploadsDir = path.join(process.cwd(), `uploads`);
  app.use(`/uploads`, express.static(uploadsDir));

  app.get(`/health`, (_req, res) => {
    res.json({ ok: true, service: `bnr-licensing-api` });
  });

  app.use(`/api/auth`, authRouter);
  app.use(`/api/audit`, auditRouter);
  app.use(`/api/documents`, documentsRouter);
  app.use(`/api/applications`, applicationsRouter);

  app.use((_req, _res, next) => {
    next(AppError.notFound());
  });

  app.use(errorHandler);

  return app;
};
