import api from "@/lib/api";
import type {
  AdminAuditLogsQuery,
  AdminUsersListPayload,
  AdminUserRowDto,
  DashboardGlobalStatsDto,
  RegulatorySummaryDto,
} from "@/lib/api/admin-portal-types";
import type { ComplianceAuditEntryDto } from "@/lib/api/applications-types";

export const fetchDashboardStats = async (): Promise<DashboardGlobalStatsDto> => {
  const res = await api.get<{ success?: boolean; data: DashboardGlobalStatsDto }>(
    `/api/admin/dashboard-stats`,
  );
  return res.data.data;
};

export const fetchRegulatorySummary = async (): Promise<RegulatorySummaryDto> => {
  const res = await api.get<{ success?: boolean; data: RegulatorySummaryDto }>(
    `/api/analytics/summary`,
  );
  return res.data.data;
};

export const fetchAdminAuditLogs = async (
  query: AdminAuditLogsQuery,
): Promise<ComplianceAuditEntryDto[]> => {
  const res = await api.get<{ success?: boolean; data: ComplianceAuditEntryDto[] }>(
    `/api/audit/logs`,
    { params: query },
  );
  return res.data.data;
};

export const fetchAdminUsers = async (params: {
  page: number;
  limit: number;
}): Promise<AdminUsersListPayload> => {
  const res = await api.get<AdminUsersListPayload>(`/api/auth/admin/users`, {
    params,
  });
  return res.data;
};

export const promoteAdminUser = async (
  userId: string,
  role: `REVIEWER` | `APPROVER`,
): Promise<AdminUserRowDto> => {
  const res = await api.patch<{ success?: boolean; user: AdminUserRowDto }>(
    `/api/auth/admin/promote/${userId}`,
    { role },
  );
  return res.data.user;
};

export const createReviewerAccount = async (body: {
  email: string;
  password: string;
  name: string;
}): Promise<AdminUserRowDto> => {
  const res = await api.post<{ success?: boolean; user: AdminUserRowDto }>(
    `/api/auth/admin/create-reviewer`,
    {
      email: body.email.trim().toLowerCase(),
      password: body.password,
      name: body.name.trim(),
    },
  );
  return res.data.user;
};
