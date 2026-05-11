import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import type { Repository } from 'typeorm';

import { getJwtSigningSecret } from '../../config/env';
import { AppDataSource } from '../../database/data-source';
import { runInTransaction } from '../../database/transaction';
import { AppError } from '../../shared/errors/AppError';
import type {
  CreateReviewerBodyDto,
  LoginBodyDto,
  SignupBodyDto,
} from '../../validation/schemas';
import { Role, RoleName, User } from './entities';
import { permissionTokensFromRoles } from './utils/permission-tokens';
import { roleRepo, userRepo } from '../../repository';

const BCRYPT_COST = 12;

const sortedJwtRoles = (roles: Role[] | undefined): RoleName[] =>
  [...(roles ?? [])].map((r) => r.name).sort((a, b) => String(a).localeCompare(String(b)));

export const loadUserWithAccess = async (
  repo: Repository<User>,
  userId: string
): Promise<User | null> => {
  return repo.findOne({
    where: { id: userId },
    relations: { roles: { permissions: true } },
  });
};

export const signupUser = async (body: SignupBodyDto): Promise<User> => {
  const { email, password, name } = body;

  const existing = await userRepo.findOne({ where: { email } });
  if (existing) {
    throw AppError.conflict(`Email already registered`);
  }

  const applicantRole = await roleRepo.findOne({
    where: { name: RoleName.APPLICANT },
    relations: { permissions: true },
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
    roles: [applicantRole],
  });

  const saved = await userRepo.save(row);
  const hydrated = await loadUserWithAccess(userRepo, saved.id);
  if (!hydrated) {
    throw new AppError(`INTERNAL_ERROR`, `Failed to load signup user`, 500);
  }
  return hydrated;
};

export const loginUser = async (body: LoginBodyDto): Promise<string> => {
  const { email, password } = body;

  const user = await userRepo.findOne({
    where: { email },
    relations: { roles: { permissions: true } },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw AppError.unauthorized(`Invalid credentials`);
  }

  const payload = {
    sub: user.id,
    email: user.email,
    roles: sortedJwtRoles(user.roles),
    permissions: permissionTokensFromRoles(user.roles ?? []),
  };
  const secret = getJwtSigningSecret();
  return jwt.sign(payload, secret, { expiresIn: `12h`, algorithm: `HS256` });
};

export const createReviewerAccount = async (
  body: CreateReviewerBodyDto
): Promise<User> => {
  const { email, password, name } = body;

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
    roles: [reviewerRole],
  });
  await userRepo.save(user);
  const hydrated = await loadUserWithAccess(userRepo, user.id);
  return hydrated ?? user;
};

export const addPromotionRoleToUser = async (params: {
  targetUserId: string;
  performedByUserId: string;
  roleName: RoleName.REVIEWER | RoleName.APPROVER;
}): Promise<User> =>
  runInTransaction(AppDataSource, async (manager) => {
    const userRepository = manager.getRepository(User);
    const roleRepository = manager.getRepository(Role);

    const targetRoleEntity = await roleRepository.findOne({
      where: { name: params.roleName },
      relations: { permissions: true },
    });
    if (!targetRoleEntity) {
      throw new AppError(
        `SETUP_REQUIRED`,
        `Default roles missing — run the database seed.`,
        500
      );
    }

    const record = await userRepository.findOne({
      where: { id: params.targetUserId },
      relations: { roles: { permissions: true } },
    });
    if (!record) {
      throw AppError.notFound(`User not found`);
    }

    const hasRole =
      record.roles?.some((r) => r.id === targetRoleEntity.id) ?? false;
    if (!hasRole) {
      record.roles = [...(record.roles ?? []), targetRoleEntity];
      await userRepository.save(record);
    }

    const hydrated = await userRepository.findOne({
      where: { id: record.id },
      relations: { roles: { permissions: true } },
    });

    return hydrated ?? record;
  });

export const listUsersForAdmin = async (opts: {
  page: number;
  limit: number;
}): Promise<{ users: User[]; total: number }> => {
  const skip = (opts.page - 1) * opts.limit;
  const [users, total] = await userRepo.findAndCount({
    relations: { roles: true },
    order: { email: `ASC` },
    skip,
    take: opts.limit,
  });
  return { users, total };
};
