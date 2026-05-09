import 'reflect-metadata';

import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, `..`, `.env`) });

import { AppDataSource } from '../src/database/data-source';

/**
 * Placeholder seed entrypoint — verifies DB connectivity.
 * Extend with transactional inserts once entities and RBAC data exist.
 */
const seed = async (): Promise<void> => {
  await AppDataSource.initialize();
  await AppDataSource.query(`SELECT 1 AS ok`);
  console.log(`Seed: database connection OK (no domain seeds in boilerplate).`);
  await AppDataSource.destroy();
};

seed().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
