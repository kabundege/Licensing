import { AppDataSource } from '../database/data-source';
import { Role, User } from '../modules/auth/entities';

export const userRepo = AppDataSource.getRepository(User);
export const roleRepo = AppDataSource.getRepository(Role);
