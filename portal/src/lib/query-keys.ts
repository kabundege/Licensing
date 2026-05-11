export const applicationKeys = {
  all: [`applications`] as const,
  list: () => [...applicationKeys.all, `list`] as const,
  detail: (id: string) => [...applicationKeys.all, `detail`, id] as const,
  documents: (id: string, includeHistory: boolean) =>
    [...applicationKeys.all, `documents`, id, includeHistory] as const,
  complianceAudit: (id: string) =>
    [...applicationKeys.all, `compliance-audit`, id] as const,
};

export const adminPortalKeys = {
  all: [`admin-portal`] as const,
  dashboardStats: () => [...adminPortalKeys.all, `dashboard-stats`] as const,
  regulatorySummary: () => [...adminPortalKeys.all, `regulatory-summary`] as const,
  auditLogs: (signature: string) =>
    [...adminPortalKeys.all, `audit-logs`, signature] as const,
  users: (page: number, limit: number) =>
    [...adminPortalKeys.all, `users`, page, limit] as const,
};
