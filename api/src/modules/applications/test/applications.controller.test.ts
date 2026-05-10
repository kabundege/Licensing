import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApplicationStatus } from '../entities';

const mocks = vi.hoisted(() => ({
  transitionStatus: vi.fn(),
  listApplications: vi.fn(),
  getApplicationWithAuditLogs: vi.fn(),
  createApplication: vi.fn(),
}));

vi.mock(`../application.service`, () => ({
  transitionStatus: mocks.transitionStatus,
  listApplications: mocks.listApplications,
  getApplicationWithAuditLogs: mocks.getApplicationWithAuditLogs,
  createApplication: mocks.createApplication,
}));

import {
  createApplicationHandler,
  getApplicationByIdHandler,
  listApplicationsHandler,
  patchApplicationStatus,
} from '../applications.controller';

const flushAsync = (): Promise<void> =>
  new Promise<void>((r) => {
    setImmediate(r);
  });

const baseUser = {
  id: `user-1`,
  email: `u@x.com`,
  roles: [],
  permissions: [],
};

describe(`applications.controller`, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe(`listApplicationsHandler`, () => {
    it(`responds with mapped applications in data`, async () => {
      mocks.listApplications.mockResolvedValue([
        {
          id: `app-1`,
          applicant_id: `user-1`,
          status: ApplicationStatus.DRAFT,
          reviewer_id: null,
          approver_id: null,
          version: 0,
        },
      ]);

      const json = vi.fn();
      const req = { user: baseUser } as unknown as Request;

      listApplicationsHandler(req, { json } as Pick<Response, `json`> as Response, vi.fn());
      await flushAsync();

      expect(json).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            id: `app-1`,
            applicant_id: `user-1`,
            status: ApplicationStatus.DRAFT,
            reviewer_id: null,
            approver_id: null,
            version: 0,
          },
        ],
      });
      expect(mocks.listApplications).toHaveBeenCalledWith(baseUser);
    });
  });

  describe(`getApplicationByIdHandler`, () => {
    it(`returns application snapshot with auditLogs`, async () => {
      const ts = new Date(`2026-03-01T12:00:00.000Z`);
      mocks.getApplicationWithAuditLogs.mockResolvedValue({
        application: {
          id: `app-1`,
          applicant_id: `user-1`,
          status: ApplicationStatus.SUBMITTED,
          reviewer_id: null,
          approver_id: null,
          version: 1,
        },
        auditLogs: [
          {
            id: `log-1`,
            application_id: `app-1`,
            actor_id: `user-1`,
            from_state: ApplicationStatus.DRAFT,
            to_state: ApplicationStatus.SUBMITTED,
            timestamp: ts,
          },
        ],
      });

      const json = vi.fn();
      const req = {
        params: { id: `550e8400-e29b-41d4-a716-446655440000` },
        user: baseUser,
      } as unknown as Request;

      getApplicationByIdHandler(req, { json } as Pick<Response, `json`> as Response, vi.fn());
      await flushAsync();

      expect(json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: `app-1`,
          applicant_id: `user-1`,
          status: ApplicationStatus.SUBMITTED,
          reviewer_id: null,
          approver_id: null,
          version: 1,
          auditLogs: [
            {
              id: `log-1`,
              application_id: `app-1`,
              actor_id: `user-1`,
              from_state: ApplicationStatus.DRAFT,
              to_state: ApplicationStatus.SUBMITTED,
              timestamp: ts,
            },
          ],
        },
      });
      expect(mocks.getApplicationWithAuditLogs).toHaveBeenCalledWith(
        `550e8400-e29b-41d4-a716-446655440000`,
        baseUser
      );
    });
  });

  describe(`createApplicationHandler`, () => {
    it(`returns 201 with created draft payload`, async () => {
      mocks.createApplication.mockResolvedValue({
        id: `new-id`,
        applicant_id: `user-1`,
        status: ApplicationStatus.DRAFT,
        reviewer_id: null,
        approver_id: null,
        version: 0,
      });

      const json = vi.fn();
      const status = vi.fn().mockReturnValue({ json });
      const req = { user: baseUser } as unknown as Request;

      createApplicationHandler(req, { status, json } as unknown as Response, vi.fn());
      await flushAsync();

      expect(status).toHaveBeenCalledWith(201);
      expect(json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: `new-id`,
          applicant_id: `user-1`,
          status: ApplicationStatus.DRAFT,
          reviewer_id: null,
          approver_id: null,
          version: 0,
        },
      });
      expect(mocks.createApplication).toHaveBeenCalledWith(baseUser);
    });
  });

  describe(`patchApplicationStatus`, () => {
    it(`calls transitionStatus and responds with data envelope`, async () => {
      mocks.transitionStatus.mockResolvedValue({
        id: `app-1`,
        applicant_id: `owner-1`,
        status: ApplicationStatus.APPROVED,
        reviewer_id: `rev-1`,
        approver_id: `apr-1`,
        version: 4,
      });

      const json = vi.fn();
      const res = { json } as Pick<Response, `json`>;
      const next = vi.fn();
      const req = {
        params: { id: `550e8400-e29b-41d4-a716-446655440000` },
        body: {
          targetStatus: ApplicationStatus.APPROVED,
          expectedVersion: 3,
        },
        user: {
          id: `apr-1`,
          email: `a@b.com`,
          roles: [],
          permissions: [`application:approve`],
        },
      } as unknown as Request;

      patchApplicationStatus(req, res as Response, next);
      await flushAsync();

      expect(next).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: `app-1`,
          applicant_id: `owner-1`,
          status: ApplicationStatus.APPROVED,
          reviewer_id: `rev-1`,
          approver_id: `apr-1`,
          version: 4,
        },
      });
      expect(mocks.transitionStatus).toHaveBeenCalledWith(
        `550e8400-e29b-41d4-a716-446655440000`,
        ApplicationStatus.APPROVED,
        req.user,
        3
      );
    });

    it(`forwards errors via next`, async () => {
      const err = new Error(`boom`);
      mocks.transitionStatus.mockRejectedValue(err);

      const json = vi.fn();
      const res = { json } as Pick<Response, `json`>;
      const next = vi.fn();
      const req = {
        params: { id: `550e8400-e29b-41d4-a716-446655440000` },
        body: {
          targetStatus: ApplicationStatus.SUBMITTED,
          expectedVersion: 0,
        },
        user: {
          id: `u1`,
          email: `u@b.com`,
          roles: [],
          permissions: [],
        },
      } as unknown as Request;

      patchApplicationStatus(req, res as Response, next);
      await flushAsync();

      expect(json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
