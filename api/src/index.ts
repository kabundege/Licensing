import 'reflect-metadata';

import dotenv from 'dotenv';

dotenv.config();

import { createApp } from './app';
import { assertEnvForRuntime, env } from './config/env';
import { AppDataSource } from './database/data-source';

const bootstrap = async (): Promise<void> => {
  assertEnvForRuntime();
  await AppDataSource.initialize();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`BNR Licensing API listening on http://localhost:${env.port}`);
  });
};

bootstrap().catch((err: unknown) => {
  console.error(`Failed to start server`, err);
  process.exit(1);
});
