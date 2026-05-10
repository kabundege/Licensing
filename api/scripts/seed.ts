import 'reflect-metadata';

import path from 'path';

import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, `..`, `.env`) });

import { runSeed } from './seed/index';

runSeed().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
