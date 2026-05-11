"use client";

import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createReviewerAccount,
  fetchAdminAuditLogs,
  fetchAdminUsers,
  fetchDashboardStats,
  fetchRegulatorySummary,
  promoteAdminUser,
} from "@/lib/api/admin-api";
import type {
  AdminAuditLogsQuery,
  DashboardGlobalStatsDto,
  RegulatorySummaryDto,
} from "@/lib/api/admin-portal-types";
import type { ComplianceAuditEntryDto } from "@/lib/api/applications-types";
import { NAV_PERMISSIONS, actorHasAnyToken } from "@/lib/permissions";
import { adminPortalKeys } from "@/lib/query-keys";
import { useSession } from "next-auth/react";

export const useDashboardStatsQuery = () => {
  const { status, data } = useSession();
  const tokens = data?.user?.permissions;
  const allowed = actorHasAnyToken(tokens, [...NAV_PERMISSIONS.viewDashboardStats]);
  return useQuery<DashboardGlobalStatsDto>({
    queryKey: adminPortalKeys.dashboardStats(),
    queryFn: fetchDashboardStats,
    enabled: status === `authenticated` && allowed,
  });
};

export const useRegulatorySummaryQuery = () => {
  const { status, data } = useSession();
  const adminRole = (data?.user?.roles ?? []).includes(`ADMIN`);
  return useQuery<RegulatorySummaryDto>({
    queryKey: adminPortalKeys.regulatorySummary(),
    queryFn: fetchRegulatorySummary,
    enabled: status === `authenticated` && adminRole,
  });
};

export const auditLogsSignature = (query: AdminAuditLogsQuery): string =>
  JSON.stringify({
    applicant_id: query.applicant_id ?? ``,
    reviewer_id: query.reviewer_id ?? ``,
    approver_id: query.approver_id ?? ``,
    document_id: query.document_id ?? ``,
    limit: query.limit ?? 500,
  });

export const useAdminAuditLogsQuery = (
  query: AdminAuditLogsQuery,
  enabled: boolean,
) => {
  const { status, data } = useSession();
  const adminRole = (data?.user?.roles ?? []).includes(`ADMIN`);
  const sig = auditLogsSignature(query);
  return useQuery<ComplianceAuditEntryDto[]>({
    queryKey: adminPortalKeys.auditLogs(sig),
    queryFn: () => fetchAdminAuditLogs(query),
    enabled: status === `authenticated` && adminRole && enabled,
  });
};

export const useAdminUsersQuery = (page: number, limit: number) => {
  const { status, data } = useSession();
  const allowed = actorHasAnyToken(data?.user?.permissions, [
    ...NAV_PERMISSIONS.adminDashboard,
  ]);
  return useQuery({
    queryKey: adminPortalKeys.users(page, limit),
    queryFn: () => fetchAdminUsers({ page, limit }),
    enabled: status === `authenticated` && allowed,
  });
};

export const usePromoteUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: `REVIEWER` | `APPROVER`;
    }) => promoteAdminUser(userId, role),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminPortalKeys.all });
      toast.success(`Role updated.`);
    },
    onError: (err: unknown) => {
      const message =
        isAxiosError(err) &&
        err.response?.data &&
        typeof err.response.data === `object` &&
        err.response.data !== null &&
        `message` in err.response.data &&
        typeof (err.response.data as { message: unknown }).message === `string`
          ? (err.response.data as { message: string }).message
          : err instanceof Error
            ? err.message
            : `Promotion failed.`;
      toast.error(message);
    },
  });
};

export const useCreateReviewerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string; name: string }) =>
      createReviewerAccount(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminPortalKeys.all });
      toast.success(`Reviewer account created.`);
    },
    onError: (err: unknown) => {
      const message =
        isAxiosError(err) &&
        err.response?.data &&
        typeof err.response.data === `object` &&
        err.response.data !== null &&
        `message` in err.response.data &&
        typeof (err.response.data as { message: unknown }).message === `string`
          ? (err.response.data as { message: string }).message
          : err instanceof Error
            ? err.message
            : `Could not create reviewer.`;
      toast.error(message);
    },
  });
};
