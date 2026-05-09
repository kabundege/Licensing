import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import type { Repository } from 'typeorm';

import { getJwtSigningSecret } from '../../config/env';
import { AppDataSource } from '../../database/data-source';
import { runInTransaction } from '../../database/transaction';
import { AppError } from '../../shared/errors/AppError';
import { AuditService } from '../audit/audit.service';
import { Role, RoleName, User } from './entities';
import { permissionTokensFromPairs } from './utils/permission-tokens';

const BCRYPT_COST = 12;
const EMAIL_MAX = 320;

export const normalizeEmail = (email: unknown): string | null => {
  if (typeof email !== `string`) return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || trimmed.length > EMAIL_MAX) return null;
  return trimmed;
};

const assertSignupBody = (
  email: unknown,
  password: unknown,
  name: unknown
): { email: string; password: string; name: string } => {
  const normalized = normalizeEmail(email);
  if (!normalized || typeof password !== `string` || password.length < 8) {
    throw AppError.badRequest(`Invalid email or password`);
  }
  if (typeof name !== `string` || name.trim().length < 2) {
    throw AppError.badRequest(`Invalid name`);
  }
  return { email: normalized, password, name: name.trim() };
};

const loginBodyGuard = (
  email: unknown,
  password: unknown
): { email: string; password: string } => {
  const normalized = normalizeEmail(email);
  if (!normalized || typeof password !== `string`) {
    throw AppError.unauthorized(`Invalid credentials`);
  }
  return { email: normalized, password };
};

export const loadUserWithAccess = async (
  userRepo: Repository<User>,
  userId: string
): Promise<User | null> => {
  return userRepo.findOne({
    where: { id: userId },
    relations: { role: { permissions: true } },
  });
};

export const signupUser = async (body: unknown): Promise<User> => {
  const parsed =
    typeof body === `object` && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const { email, password, name } = assertSignupBody(
    parsed.email,
    parsed.password,
    parsed.name
  );

  const userRepo = AppDataSource.getRepository(User);
  const roleRepo = AppDataSource.getRepository(Role);

  const existing = await userRepo.findOne({ where: { email } });
  if (existing) {
    throw AppError.conflict(`Email already registered`);
  }

  const applicantRole = await roleRepo.findOne({
    where: { name: RoleName.APPLICANT },
  });
  if (!applicantRole) {
    throw new AppError(
      `SETUP_REQUIRED`,
      `Default roles missing — run the database seed.`,
      500
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const row = userRepo.create({
    email,
    password: passwordHash,
    name,
    roleId: applicantRole.id,
  });

  const saved = await userRepo.save(row);
  const hydrated = await loadUserWithAccess(userRepo, saved.id);
  if (!hydrated) {
    throw new AppError(`INTERNAL_ERROR`, `Failed to load signup user`, 500);
  }
  return hydrated;
};

export const loginUser = async (body: unknown): Promise<string> => {
  const parsed =
    typeof body === `object` && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const { email, password } = loginBodyGuard(parsed.email, parsed.password);

  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({
    where: { email },
    relations: { role: { permissions: true } },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw AppError.unauthorized(`Invalid credentials`);
  }

  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role.name,
    permissions: permissionTokensFromPairs(user.role.permissions ?? []),
  };
  const secret = getJwtSigningSecret();
  return jwt.sign(payload, secret, { expiresIn: `12h`, algorithm: `HS256` });
};

export const createReviewerAccount = async (body: unknown): Promise<User> => {
  const parsed =
    typeof body === `object` && body !== null
      ? (body as Record<string, unknown>)
      : {};
  const { email, password, name } = assertSignupBody(
    parsed.email,
    parsed.password,
    parsed.name
  );

  const userRepo = AppDataSource.getRepository(User);
  const roleRepo = AppDataSource.getRepository(Role);

  const existing = await userRepo.findOne({ where: { email } });
  if (existing) {
    throw AppError.conflict(`Email already registered`);
  }

  const reviewerRole = await roleRepo.findOne({
    where: { name: RoleName.REVIEWER },
    relations: { permissions: true },
  });
  if (!reviewerRole) {
    throw new AppError(
      `SETUP_REQUIRED`,
      `Default roles missing — run the database seed.`,
      500
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = userRepo.create({
    email,
    password: passwordHash,
    name,
    roleId: reviewerRole.id,
  });
  await userRepo.save(user);
  const hydrated = await loadUserWithAccess(userRepo, user.id);
  return hydrated ?? user;
};

export const promoteUserToReviewer = async (params: {
  targetUserId: string;
  performedByUserId: string;
}): Promise<User> =>
  runInTransaction(AppDataSource, async (manager) => {
    const userRepo = manager.getRepository(User);
    const roleRepo = manager.getRepository(Role);

    const reviewerRole = await roleRepo.findOne({
      where: { name: RoleName.REVIEWER },
      relations: { permissions: true },
    });
    if (!reviewerRole) {
      throw new AppError(
        `SETUP_REQUIRED`,
        `Default roles missing — run the database seed.`,
        500
      );
    }

    const record = await userRepo.findOne({
      where: { id: params.targetUserId },
      relations: { role: { permissions: true } },
    });
    if (!record) {
      throw AppError.notFound(`User not found`);
    }

    record.roleId = reviewerRole.id;
    await userRepo.save(record);

    const auditService = new AuditService(manager);
    await auditService.logPromotion({
      promotedUserId: record.id,
      performedByUserId: params.performedByUserId,
      newRole: RoleName.REVIEWER,
    });

    const hydrated = await userRepo.findOne({
      where: { id: record.id },
      relations: { role: { permissions: true } },
    });

    return hydrated ?? record;
  });
