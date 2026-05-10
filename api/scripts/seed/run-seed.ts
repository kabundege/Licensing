import { AppDataSource } from '../../src/database/data-source';
import { RoleName } from '../../src/modules/auth/entities';
import {
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_APPLICANT_PASSWORD,
  DEFAULT_REVIEWER_PASSWORD,
  DEFAULT_SUPER_PASSWORD,
} from './constants';
import { seedPermissionsAndRoles } from './rbac';
import {
  upsertAdminSeed,
  upsertApplicantSeed,
  upsertReviewerOnlySeed,
  upsertSuperUser,
} from './upsert-users';

export const runSeed = async (): Promise<void> => {
  await AppDataSource.initialize();

  try {
    const rolesByName = await seedPermissionsAndRoles();

    // SUPERUSER Seed (REVIEWER + APPROVER)
    const reviewer = rolesByName.get(RoleName.REVIEWER);
    const approver = rolesByName.get(RoleName.APPROVER);
    if (reviewer && approver) {
      const pwd = process.env.SEED_SUPERUSER_PASSWORD ?? DEFAULT_SUPER_PASSWORD;
      await upsertSuperUser(reviewer, approver, pwd);
    } else {
      console.warn(`Seed: SuperUser skipped — roles missing after bootstrap.`);
    }

    // ADMIN Seed
    const adminRole = rolesByName.get(RoleName.ADMIN);
    if (adminRole) {
      const adminPwd = process.env.SEED_ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;
      await upsertAdminSeed(adminRole, adminPwd);
    } else {
      console.warn(`Seed: admin account skipped — ADMIN role missing after bootstrap.`);
    }

    // APPLICANT Seed
    const applicantRole = rolesByName.get(RoleName.APPLICANT);
    if (applicantRole) {
      const pwd = process.env.SEED_APPLICANT_PASSWORD ?? DEFAULT_APPLICANT_PASSWORD;
      await upsertApplicantSeed(applicantRole, pwd);
    } else {
      console.warn(`Seed: applicant account skipped — APPLICANT role missing after bootstrap.`);
    }

    // REVIEWER Seed
    if (reviewer) {
      const pwd = process.env.SEED_REVIEWER_PASSWORD ?? DEFAULT_REVIEWER_PASSWORD;
      await upsertReviewerOnlySeed(reviewer, pwd);
    } else {
      console.warn(`Seed: reviewer account skipped — REVIEWER role missing after bootstrap.`);
    }

    console.log(`Seed: RBAC bootstrap complete.`);
  } finally {
    await AppDataSource.destroy();
  }
};
