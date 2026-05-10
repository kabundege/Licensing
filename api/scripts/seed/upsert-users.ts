import bcrypt from 'bcrypt';

import { AppDataSource } from '../../src/database/data-source';
import type { Role } from '../../src/modules/auth/entities';
import { User } from '../../src/modules/auth/entities';
import {
  ADMIN_SEED_EMAIL,
  ADMIN_SEED_NAME,
  APPLICANT_SEED_EMAIL,
  APPLICANT_SEED_NAME,
  BCRYPT_COST,
  REVIEWER_SEED_EMAIL,
  REVIEWER_SEED_NAME,
  SUPERUSER_EMAIL,
  SUPERUSER_NAME,
} from './constants';

export const upsertSuperUser = async (
  reviewer: Role,
  approver: Role,
  passwordPlain: string
): Promise<void> => {
  const userRepo = AppDataSource.getRepository(User);

  let user = await userRepo.findOne({
    where: { email: SUPERUSER_EMAIL },
    relations: { roles: true },
  });

  const passwordHash = await bcrypt.hash(passwordPlain, BCRYPT_COST);

  if (!user) {
    const created = userRepo.create({
      email: SUPERUSER_EMAIL,
      name: SUPERUSER_NAME,
      password: passwordHash,
      roles: [reviewer, approver],
    });
    await userRepo.save(created);
    console.log(`Seed: created ${SUPERUSER_NAME} (${SUPERUSER_EMAIL}) with REVIEWER + APPROVER.`);
    return;
  }

  const mergedRoles = [...(user.roles ?? [])];
  const byId = new Set(mergedRoles.map((r) => r.id));
  let changed = false;
  if (!byId.has(reviewer.id)) {
    mergedRoles.push(reviewer);
    byId.add(reviewer.id);
    changed = true;
  }
  if (!byId.has(approver.id)) {
    mergedRoles.push(approver);
    byId.add(approver.id);
    changed = true;
  }

  if (changed || user.roles.length !== mergedRoles.length) {
    user.roles = mergedRoles;
    await userRepo.save(user);
    console.log(`Seed: ensured ${SUPERUSER_NAME} has REVIEWER + APPROVER.`);
    return;
  }

  console.log(`Seed: ${SUPERUSER_NAME} already configured.`);
};

export const upsertAdminSeed = async (adminRole: Role, passwordPlain: string): Promise<void> => {
  const userRepo = AppDataSource.getRepository(User);

  let user = await userRepo.findOne({
    where: { email: ADMIN_SEED_EMAIL },
    relations: { roles: true },
  });

  const passwordHash = await bcrypt.hash(passwordPlain, BCRYPT_COST);

  if (!user) {
    const created = userRepo.create({
      email: ADMIN_SEED_EMAIL,
      name: ADMIN_SEED_NAME,
      password: passwordHash,
      roles: [adminRole],
    });
    await userRepo.save(created);
    console.log(
      `Seed: created ${ADMIN_SEED_NAME} (${ADMIN_SEED_EMAIL}) with ADMIN (manage_users).`
    );
    return;
  }

  const mergedRoles = [...(user.roles ?? [])];
  const byId = new Set(mergedRoles.map((r) => r.id));
  let changed = false;
  if (!byId.has(adminRole.id)) {
    mergedRoles.push(adminRole);
    byId.add(adminRole.id);
    changed = true;
  }

  if (changed || user.roles.length !== mergedRoles.length) {
    user.roles = mergedRoles;
    await userRepo.save(user);
    console.log(`Seed: ensured ${ADMIN_SEED_EMAIL} has ADMIN.`);
    return;
  }

  console.log(`Seed: ${ADMIN_SEED_NAME} (${ADMIN_SEED_EMAIL}) already configured.`);
};

export const upsertApplicantSeed = async (
  applicantRole: Role,
  passwordPlain: string
): Promise<void> => {
  const userRepo = AppDataSource.getRepository(User);

  let user = await userRepo.findOne({
    where: { email: APPLICANT_SEED_EMAIL },
    relations: { roles: true },
  });

  const passwordHash = await bcrypt.hash(passwordPlain, BCRYPT_COST);

  if (!user) {
    const created = userRepo.create({
      email: APPLICANT_SEED_EMAIL,
      name: APPLICANT_SEED_NAME,
      password: passwordHash,
      roles: [applicantRole],
    });
    await userRepo.save(created);
    console.log(
      `Seed: created ${APPLICANT_SEED_NAME} (${APPLICANT_SEED_EMAIL}) with APPLICANT.`
    );
    return;
  }

  const mergedRoles = [...(user.roles ?? [])];
  const byId = new Set(mergedRoles.map((r) => r.id));
  let changed = false;
  if (!byId.has(applicantRole.id)) {
    mergedRoles.push(applicantRole);
    byId.add(applicantRole.id);
    changed = true;
  }

  if (changed || user.roles.length !== mergedRoles.length) {
    user.roles = mergedRoles;
    await userRepo.save(user);
    console.log(`Seed: ensured ${APPLICANT_SEED_EMAIL} has APPLICANT.`);
    return;
  }

  console.log(`Seed: ${APPLICANT_SEED_NAME} (${APPLICANT_SEED_EMAIL}) already configured.`);
};

export const upsertReviewerOnlySeed = async (
  reviewerRole: Role,
  passwordPlain: string
): Promise<void> => {
  const userRepo = AppDataSource.getRepository(User);

  let user = await userRepo.findOne({
    where: { email: REVIEWER_SEED_EMAIL },
    relations: { roles: true },
  });

  const passwordHash = await bcrypt.hash(passwordPlain, BCRYPT_COST);

  if (!user) {
    const created = userRepo.create({
      email: REVIEWER_SEED_EMAIL,
      name: REVIEWER_SEED_NAME,
      password: passwordHash,
      roles: [reviewerRole],
    });
    await userRepo.save(created);
    console.log(
      `Seed: created ${REVIEWER_SEED_NAME} (${REVIEWER_SEED_EMAIL}) with REVIEWER.`
    );
    return;
  }

  const mergedRoles = [...(user.roles ?? [])];
  const byId = new Set(mergedRoles.map((r) => r.id));
  let changed = false;
  if (!byId.has(reviewerRole.id)) {
    mergedRoles.push(reviewerRole);
    byId.add(reviewerRole.id);
    changed = true;
  }

  if (changed || user.roles.length !== mergedRoles.length) {
    user.roles = mergedRoles;
    await userRepo.save(user);
    console.log(`Seed: ensured ${REVIEWER_SEED_EMAIL} has REVIEWER.`);
    return;
  }

  console.log(`Seed: ${REVIEWER_SEED_NAME} (${REVIEWER_SEED_EMAIL}) already configured.`);
};
