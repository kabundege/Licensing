import 'reflect-metadata';

import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, `..`, `.env`) });

import { AppDataSource } from '../src/database/data-source';
import {
  Permission,
  Role,
  RoleName,
} from '../src/modules/auth/entities';
import { USERS_MANAGE_USERS } from '../src/modules/auth/app-permissions';

const ADMIN_PERMISSION_RESOURCE = USERS_MANAGE_USERS.resource;
const ADMIN_PERMISSION_ACTION = USERS_MANAGE_USERS.action;

const seedRbacs = async (): Promise<void> => {
  const permRepo = AppDataSource.getRepository(Permission);
  const roleRepo = AppDataSource.getRepository(Role);

  let manageUsers = await permRepo.findOne({
    where: { resource: ADMIN_PERMISSION_RESOURCE, action: ADMIN_PERMISSION_ACTION },
  });
  if (!manageUsers) {
    manageUsers = permRepo.create({
      resource: ADMIN_PERMISSION_RESOURCE,
      action: ADMIN_PERMISSION_ACTION,
    });
    manageUsers = await permRepo.save(manageUsers);
  }

  const roleDefs: { name: RoleName; permissions: Permission[] }[] = [
    { name: RoleName.APPLICANT, permissions: [] },
    { name: RoleName.REVIEWER, permissions: [] },
    { name: RoleName.APPROVER, permissions: [] },
    { name: RoleName.ADMIN, permissions: [manageUsers] },
  ];

  for (const def of roleDefs) {
    const existing = await roleRepo.findOne({
      where: { name: def.name },
      relations: { permissions: true },
    });
    if (existing) {
      if (
        def.name === RoleName.ADMIN &&
        (!existing.permissions || existing.permissions.length === 0) &&
        def.permissions.length > 0
      ) {
        existing.permissions = def.permissions;
        await roleRepo.save(existing);
      }
      continue;
    }
    await roleRepo.save(roleRepo.create({ name: def.name, permissions: def.permissions }));
  }
};

/**
 * Idempotent RBAC bootstrap — verifies connectivity and installs default Role/Permission rows.
 */
const seed = async (): Promise<void> => {
  await AppDataSource.initialize();
  await seedRbacs();
  console.log(`Seed: RBAC bootstrap complete.`);

  await AppDataSource.destroy();
};

seed().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
