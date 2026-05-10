import type { Express } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationStatus } from '../../applications/entities/application-status';
import { Application } from '../../applications/entities/application.entity';
import { AuditLog } from '../../applications/entities/audit-log.entity';
import {
  normalizeDocumentGroupKey,
  persistUploadedDocument,
} from '../documents.service';
import { Document } from '../entities/document.entity';

const fsMocks = vi.hoisted(() => ({
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock(`fs/promises`, () => ({
  default: fsMocks,
}));

const qbUpdateMocks = vi.hoisted(() => ({
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  andWhere: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue(undefined),
}));

const qbSelectMocks = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  andWhere: vi.fn().mockReturnThis(),
  getRawOne: vi.fn().mockResolvedValue({ maxv: `2` }),
}));

const mocks = vi.hoisted(() => {
  const txApplicationRepo = { findOne: vi.fn() };
  const txDocumentRepo = {
    create: vi.fn((r: unknown) => r),
    save: vi.fn(async (r: Record<string, unknown>) => ({
      ...r,
      id: `doc-new`,
    })),
    createQueryBuilder: vi.fn((alias?: string) =>
      alias === undefined ? qbUpdateMocks : qbSelectMocks
    ),
  };
  const txAuditRepo = {
    create: vi.fn((r: unknown) => r),
    save: vi.fn().mockResolvedValue(undefined),
  };

  const transactionalManagerStub = {
    getRepository(entity: unknown) {
      switch (entity) {
        case Application:
          return txApplicationRepo;
        case Document:
          return txDocumentRepo;
        case AuditLog:
          return txAuditRepo;
        default:
          throw new Error(`Unexpected repository entity`);
      }
    },
  };

  return {
    txApplicationRepo,
    txDocumentRepo,
    transactionalManagerStub,
    runInTransaction: vi.fn(async (_ds: unknown, fn: (m: typeof transactionalManagerStub) => Promise<unknown>) =>
      fn(transactionalManagerStub)
    ),
    logDocumentUploaded: vi.fn().mockResolvedValue(undefined),
    logDocumentVersionUpdated: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock(`../../../database/transaction`, () => ({
  runInTransaction: mocks.runInTransaction,
}));

vi.mock(`../../audit/audit.service`, () => ({
  AuditService: vi.fn(function AuditServiceMock() {
    return {
      logDocumentUploaded: mocks.logDocumentUploaded,
      logDocumentVersionUpdated: mocks.logDocumentVersionUpdated,
    };
  }),
}));

describe(`documents.service`, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runInTransaction.mockImplementation(async (_ds: unknown, fn) =>
      fn(mocks.transactionalManagerStub)
    );
    mocks.txDocumentRepo.createQueryBuilder.mockImplementation((alias?: string) =>
      alias === undefined ? qbUpdateMocks : qbSelectMocks
    );
    qbSelectMocks.getRawOne.mockResolvedValue({ maxv: `2` });
  });

  const multerFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
    fieldname: `file`,
    originalname: `license.pdf`,
    encoding: `7bit`,
    mimetype: `application/pdf`,
    destination: `/tmp`,
    filename: `uuid-stored.pdf`,
    path: `/tmp/uuid-stored.pdf`,
    size: 12,
    stream: undefined as never,
    buffer: Buffer.alloc(0),
    ...overrides,
  });

  it(`persists document and DOCUMENT_UPLOADED when group_key is absent`, async () => {
    mocks.txApplicationRepo.findOne.mockResolvedValue({
      id: `app-1`,
      applicant_id: `user-1`,
      status: ApplicationStatus.DRAFT,
    });

    const file = multerFile({ filename: `uuid-stored.pdf` });
    const saved = await persistUploadedDocument({
      applicationId: `app-1`,
      uploadedByUserId: `user-1`,
      file,
      groupKey: null,
    });

    expect(saved.id).toBe(`doc-new`);
    expect(mocks.txDocumentRepo.save).toHaveBeenCalled();
    expect(mocks.txDocumentRepo.createQueryBuilder).not.toHaveBeenCalled();
    expect(mocks.logDocumentUploaded).toHaveBeenCalledWith({
      applicationId: `app-1`,
      actorUserId: `user-1`,
      documentId: `doc-new`,
    });
    expect(mocks.logDocumentVersionUpdated).not.toHaveBeenCalled();
    expect(fsMocks.unlink).not.toHaveBeenCalled();
    expect(mocks.txDocumentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        group_key: null,
        version: 1,
        is_current: true,
      })
    );
  });

  it(`versions within group_key and logs DOCUMENT_VERSION_UPDATED metadata`, async () => {
    mocks.txApplicationRepo.findOne.mockResolvedValue({
      id: `app-1`,
      applicant_id: `user-1`,
      status: ApplicationStatus.PENDING_CLARIFICATION,
    });

    const file = multerFile({ filename: `v-next.pdf` });
    await persistUploadedDocument({
      applicationId: `app-1`,
      uploadedByUserId: `user-1`,
      file,
      groupKey: `financials`,
    });

    expect(mocks.txDocumentRepo.createQueryBuilder).toHaveBeenCalled();
    expect(qbUpdateMocks.execute).toHaveBeenCalled();
    expect(mocks.logDocumentVersionUpdated).toHaveBeenCalledWith({
      applicationId: `app-1`,
      actorUserId: `user-1`,
      documentId: `doc-new`,
      metadata: { group_key: `financials`, version: 3 },
    });
    expect(mocks.logDocumentUploaded).not.toHaveBeenCalled();
    expect(mocks.txDocumentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        group_key: `financials`,
        version: 3,
        is_current: true,
      })
    );
  });

  it(`removes the file from disk when upload is rejected by application state`, async () => {
    mocks.txApplicationRepo.findOne.mockResolvedValue({
      id: `app-1`,
      applicant_id: `user-1`,
      status: ApplicationStatus.UNDER_REVIEW,
    });

    const file = multerFile({ filename: `gone.pdf` });

    await expect(
      persistUploadedDocument({
        applicationId: `app-1`,
        uploadedByUserId: `user-1`,
        file,
        groupKey: null,
      })
    ).rejects.toMatchObject({ code: `UNAUTHORIZED` });

    expect(fsMocks.unlink).toHaveBeenCalled();
  });
});

describe(`normalizeDocumentGroupKey`, () => {
  it(`returns null for blank values`, () => {
    expect(normalizeDocumentGroupKey(undefined)).toBe(null);
    expect(normalizeDocumentGroupKey(`   `)).toBe(null);
    expect(normalizeDocumentGroupKey(1)).toBe(null);
  });

  it(`returns trimmed string capped at max length`, () => {
    expect(normalizeDocumentGroupKey(`  abc  `)).toBe(`abc`);
    const long = `x`.repeat(300);
    expect(normalizeDocumentGroupKey(long)!.length).toBe(256);
  });
});
