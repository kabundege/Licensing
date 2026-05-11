import type { ApplicationStatus } from "@/lib/application-domain";

export type DashboardGlobalStatsDto = {
  statusDistribution: {
    labels: ApplicationStatus[];
    values: number[];
    byStatus: Record<ApplicationStatus, number>;
  };
  reviewerWorkload: {
    labels: string[];
    values: number[];
    reviewers: Array<{
      userId: string;
      name: string;
      email: string;
      assignedCount: number;
    }>;
  };
  submittedToFinalReview: {
    averageHours: number | null;
    averageDays: number | null;
    sampleCount: number;
  };
  securityIntegrity: {
    blockedApprovalIdentityConflictCount: number;
  };
};

export type RegulatoryPendingBottleneckDto = {
  applicationId: string;
  applicantId: string;
  status: ApplicationStatus;
  firstAuditAt: string;
  ageSeconds: number;
};

export type RegulatorySummaryDto = {
  asOf: string;
  applicationsByStatus: Record<ApplicationStatus, number>;
  underReview: {
    averageDurationSeconds: number | null;
    completedCyclesCount: number;
  };
  topPendingBottlenecks: RegulatoryPendingBottleneckDto[];
};

export type AdminUserRowDto = {
  id: string;
  email: string;
  name: string;
  roles: string[];
};

export type AdminUsersListPayload = {
  success?: boolean;
  users: AdminUserRowDto[];
  page: number;
  limit: number;
  total: number;
};

export type AdminAuditLogsQuery = {
  applicant_id?: string;
  reviewer_id?: string;
  approver_id?: string;
  document_id?: string;
  limit?: number;
};
