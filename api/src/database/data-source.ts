import { DataSource } from 'typeorm';
import { env } from '../config/env';
import {
  Permission,
  Role,
  User,
} from '../modules/auth/entities';
import { Application, AuditLog } from '../modules/applications/entities';

export const AppDataSource = new DataSource({
  type: `postgres`,
  host: env.postgres.host,
  port: env.postgres.port,
  username: env.postgres.username,
  password: env.postgres.password,
  database: env.postgres.database,
  extra: {
    max: env.pgPoolMax,
  },
  synchronize: env.nodeEnv !== `production`,
  logging: env.nodeEnv === `development`,
  entities: [User, Role, Permission, Application, AuditLog],
  migrations: [],
  subscribers: [],
});
