"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchApplicationById,
  fetchApplicationDocuments,
  fetchApplications,
  fetchComplianceAuditLogs,
  patchApplicationStatus,
} from "@/lib/api/applications-api";
import type { TransitionBody } from "@/lib/api/applications-types";
import { applicationKeys } from "@/lib/query-keys";
import { userMayReadComplianceAuditApi } from "@/lib/application-domain";
import { useSession } from "next-auth/react";

export const useApplicationsList = () => {
  const { status } = useSession();
  return useQuery({
    queryKey: applicationKeys.list(),
    queryFn: fetchApplications,
    enabled: status === `authenticated`,
  });
};

export const useApplicationDetail = (id: string | undefined) => {
  const { status } = useSession();
  return useQuery({
    queryKey: applicationKeys.detail(id ?? ``),
    queryFn: () => fetchApplicationById(id!),
    enabled: status === `authenticated` && Boolean(id),
  });
};

export const useApplicationDocuments = (
  id: string | undefined,
  includeHistory: boolean,
) => {
  const { status } = useSession();
  return useQuery({
    queryKey: applicationKeys.documents(id ?? ``, includeHistory),
    queryFn: () => fetchApplicationDocuments(id!, includeHistory),
    enabled: status === `authenticated` && Boolean(id),
  });
};

export const useComplianceAuditTrail = (id: string | undefined) => {
  const { data: session, status } = useSession();
  const staff = userMayReadComplianceAuditApi(session?.user?.roles);
  return useQuery({
    queryKey: applicationKeys.complianceAudit(id ?? ``),
    queryFn: () => fetchComplianceAuditLogs(id!),
    enabled: status === `authenticated` && Boolean(id) && staff,
  });
};

export const useApplicationStatusMutation = (applicationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: TransitionBody) =>
      patchApplicationStatus(applicationId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
};
