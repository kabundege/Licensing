import { AppDataSource } from '../../src/database/data-source';
import {
  ANALYTICS_VIEW_DASHBOARD,
  APPLICATION_APPROVE,
  APPLICATION_ESCALATE_FINAL,
  APPLICATION_REJECT,
  APPLICATION_REQUEST_CLARIFICATION,
  APPLICATION_RESUBMIT,
  APPLICATION_START_REVIEW,
  APPLICATION_SUBMIT,
  USERS_MANAGE_USERS,
} from '../../src/modules/auth/app-permissions';
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
    {
      resource: ANALYTICS_VIEW_DASHBOARD.resource,
      action: ANALYTICS_VIEW_DASHBOARD.action,
    },
    { resource: APPLICATION_SUBMIT.resource, action: APPLICATION_SUBMIT.action },
    { resource: APPLICATION_START_REVIEW.resource, action: APPLICATION_START_REVIEW.action },
    {
      resource: APPLICATION_REQUEST_CLARIFICATION.resource,
      action: APPLICATION_REQUEST_CLARIFICATION.action,
    },
    { resource: APPLICATION_RESUBMIT.resource, action: APPLICATION_RESUBMIT.action },
    {
      resource: APPLICATION_ESCALATE_FINAL.resource,
      action: APPLICATION_ESCALATE_FINAL.action,
    },
    { resource: APPLICATION_APPROVE.resource, action: APPLICATION_APPROVE.action },
    { resource: APPLICATION_REJECT.resource, action: APPLICATION_REJECT.action },
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
    {
      name: RoleName.APPLICANT,
      permissionPairs: [APPLICATION_SUBMIT, APPLICATION_RESUBMIT],
    },
    {
      name: RoleName.REVIEWER,
      permissionPairs: [
        APPLICATION_START_REVIEW,
        APPLICATION_REQUEST_CLARIFICATION,
        APPLICATION_ESCALATE_FINAL,
      ],
    },
    {
      name: RoleName.APPROVER,
      permissionPairs: [APPLICATION_APPROVE, APPLICATION_REJECT, ANALYTICS_VIEW_DASHBOARD],
    },
    {
      name: RoleName.ADMIN,
      permissionPairs: [USERS_MANAGE_USERS, ANALYTICS_VIEW_DASHBOARD],
    },
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
