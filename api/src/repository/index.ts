import { AppDataSource } from '../database/data-source';
import { Role, User } from '../modules/auth/entities';
import { AuditLog } from '../modules/applications/entities';

export const userRepo = AppDataSource.getRepository(User);
export const roleRepo = AppDataSource.getRepository(Role);
export const auditLogRepo = AppDataSource.getRepository(AuditLog);
