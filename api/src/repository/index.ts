import type { DataSource, EntityManager } from 'typeorm';

import { AppDataSource } from '../database/data-source';
import { Role, User } from '../modules/auth/entities';

export type AuthRepositorySource = DataSource | EntityManager;

export const userRepo = AppDataSource.getRepository(User);
export const roleRepo = AppDataSource.getRepository(Role);

export const getUserRepository = (source: AuthRepositorySource = AppDataSource) => source.getRepository(User);
export const getRoleRepository = (source: AuthRepositorySource = AppDataSource) => source.getRepository(Role);

