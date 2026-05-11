export const applicationKeys = {
  all: [`applications`] as const,
  list: () => [...applicationKeys.all, `list`] as const,
  detail: (id: string) => [...applicationKeys.all, `detail`, id] as const,
  documents: (id: string, includeHistory: boolean) =>
    [...applicationKeys.all, `documents`, id, includeHistory] as const,
  complianceAudit: (id: string) =>
    [...applicationKeys.all, `compliance-audit`, id] as const,
};
