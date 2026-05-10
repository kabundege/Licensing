import { describe, expect, it } from 'vitest';

import { RoleName } from '../../auth/entities';
import { userMayDownloadApplicationDocument } from '../documents.download-policy';

describe(`documents.download-policy`, () => {
  const applicantViewer = {
    id: `u1`,
    email: `a@b.c`,
    name: `Applicant`,
    roles: [RoleName.APPLICANT],
    permissions: [] as string[],
  };

  it(`allows the owning applicant`, () => {
    expect(userMayDownloadApplicationDocument(applicantViewer, `u1`)).toBe(true);
  });

  it(`denies another applicant`, () => {
    expect(userMayDownloadApplicationDocument(applicantViewer, `other`)).toBe(false);
  });

  it(`allows reviewers for any applicant`, () => {
    expect(
      userMayDownloadApplicationDocument(
        { ...applicantViewer, roles: [RoleName.REVIEWER] },
        `other`
      )
    ).toBe(true);
  });

  it(`allows approvers for any applicant`, () => {
    expect(
      userMayDownloadApplicationDocument(
        { ...applicantViewer, roles: [RoleName.APPROVER] },
        `other`
      )
    ).toBe(true);
  });
});
