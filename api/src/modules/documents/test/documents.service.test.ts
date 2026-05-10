import type { Express } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationStatus } from '../../applications/entities/application-status';
import { Application } from '../../applications/entities/application.entity';
import { AuditLog } from '../../applications/entities/audit-log.entity';
import { persistUploadedDocument } from '../documents.service';
import { Document } from '../entities/document.entity';

const fsMocks = vi.hoisted(() => ({
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock(`fs/promises`, () => ({
  default: fsMocks,
}));

const mocks = vi.hoisted(() => {
  const txApplicationRepo = { findOne: vi.fn() };
  const txDocumentRepo = {
    create: vi.fn((r: unknown) => r),
    save: vi.fn(async (r: Record<string, unknown>) => ({
      ...r,
      id: `doc-new`,
    })),
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
  };
});

vi.mock(`../../../database/transaction`, () => ({
  runInTransaction: mocks.runInTransaction,
}));

vi.mock(`../../audit/audit.service`, () => ({
  AuditService: vi.fn(function AuditServiceMock() {
    return {
      logDocumentUploaded: mocks.logDocumentUploaded,
    };
  }),
}));

describe(`documents.service`, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runInTransaction.mockImplementation(async (_ds: unknown, fn) =>
      fn(mocks.transactionalManagerStub)
    );
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

  it(`persists document and audit inside a transaction`, async () => {
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
    });

    expect(saved.id).toBe(`doc-new`);
    expect(mocks.txDocumentRepo.save).toHaveBeenCalled();
    expect(mocks.logDocumentUploaded).toHaveBeenCalledWith({
      applicationId: `app-1`,
      actorUserId: `user-1`,
      documentId: `doc-new`,
    });
    expect(fsMocks.unlink).not.toHaveBeenCalled();
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
      })
    ).rejects.toMatchObject({ code: `UNAUTHORIZED` });

    expect(fsMocks.unlink).toHaveBeenCalled();
  });
});
