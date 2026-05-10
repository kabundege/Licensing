import { AppDataSource } from '../../src/database/data-source';
import { APPLICATION_APPROVE, USERS_MANAGE_USERS } from '../../src/modules/auth/app-permissions';
import { Permission, Role, RoleName } from '../../src/modules/auth/entities';

type RoleSeedDefinition = {
  name: RoleName;
  permissionPairs: readonly { readonly resource: string; readonly action: string }[];
};

export const seedPermissionsAndRoles = async (): Promise<Map<RoleName, Role>> => {
  const permRepo = AppDataSource.getRepository(Permission);
  const roleRepo = AppDataSource.getRepository(Role);

  const permissionPairs = [
    { resource: USERS_MANAGE_USERS.resource, action: USERS_MANAGE_USERS.action },
    { resource: APPLICATION_APPROVE.resource, action: APPLICATION_APPROVE.action },
  ];

  const permByKey = new Map<string, Permission>();
  for (const pair of permissionPairs) {
    let row = await permRepo.findOne({
      where: { resource: pair.resource, action: pair.action },
    });
    if (!row) {
      row = permRepo.create(pair);
      row = await permRepo.save(row);
    }
    permByKey.set(`${pair.resource}:${pair.action}`, row);
  }

  const defs: RoleSeedDefinition[] = [
    { name: RoleName.APPLICANT, permissionPairs: [] },
    { name: RoleName.REVIEWER, permissionPairs: [] },
    { name: RoleName.APPROVER, permissionPairs: [APPLICATION_APPROVE] },
    { name: RoleName.ADMIN, permissionPairs: [USERS_MANAGE_USERS] },
  ];

  const rolesByName = new Map<RoleName, Role>();

  for (const def of defs) {
    let role = await roleRepo.findOne({
      where: { name: def.name },
      relations: { permissions: true },
    });

    const nextPerms: Permission[] = [];
    for (const pair of def.permissionPairs) {
      const hit = permByKey.get(`${pair.resource}:${pair.action}`);
      if (hit) nextPerms.push(hit);
    }

    if (!role) {
      role = roleRepo.create({ name: def.name, permissions: nextPerms });
      role = await roleRepo.save(role);
      rolesByName.set(def.name, role);
      continue;
    }

    const merged = [...(role.permissions ?? [])];
    const seen = new Set(merged.map((p) => p.id));
    for (const p of nextPerms) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        merged.push(p);
      }
    }
    if (merged.length !== (role.permissions?.length ?? 0)) {
      role.permissions = merged;
      await roleRepo.save(role);
    }
    rolesByName.set(def.name, role);
  }

  return rolesByName;
};
