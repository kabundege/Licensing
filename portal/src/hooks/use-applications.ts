"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createApplication,
  fetchApplicationById,
  fetchApplicationDocuments,
  fetchApplications,
  fetchComplianceAuditLogs,
  patchApplicationStatus,
} from "@/lib/api/applications-api";
import type {
  ApplicationDetailDto,
  ApplicationDto,
  TransitionBody,
} from "@/lib/api/applications-types";
import { uploadApplicationDocument } from "@/lib/api/documents-api";
import {
  ApplicationStatus,
  userMayReadComplianceAuditApi,
} from "@/lib/application-domain";
import { applicationKeys } from "@/lib/query-keys";
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

export type TransitionVariables = {
  applicationId: string;
  body: TransitionBody;
};

const mergeOptimisticTransition = ({
  prev,
  body,
  sessionUserId,
}: {
  prev: ApplicationDto;
  body: TransitionBody;
  sessionUserId: string | undefined;
}): ApplicationDto => {
  const { targetStatus, expectedVersion } = body;
  if (prev.version !== expectedVersion) {
    return prev;
  }

  let { reviewer_id, approver_id } = prev;

  if (
    prev.status === ApplicationStatus.SUBMITTED &&
    targetStatus === ApplicationStatus.UNDER_REVIEW &&
    sessionUserId
  ) {
    reviewer_id = sessionUserId;
  }

  if (
    (targetStatus === ApplicationStatus.APPROVED ||
      targetStatus === ApplicationStatus.REJECTED) &&
    sessionUserId
  ) {
    approver_id = sessionUserId;
  }

  return {
    ...prev,
    status: targetStatus,
    version: expectedVersion + 1,
    reviewer_id,
    approver_id,
  };
};

export const useApplicationTransitionMutation = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const sessionUserId =
    typeof session?.user?.id === `string` ? session.user.id : undefined;

  return useMutation({
    mutationFn: ({ applicationId, body }: TransitionVariables) =>
      patchApplicationStatus(applicationId, body),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: applicationKeys.list() });
      await queryClient.cancelQueries({
        queryKey: applicationKeys.detail(variables.applicationId),
      });

      const previousList = queryClient.getQueryData<ApplicationDto[]>(
        applicationKeys.list(),
      );
      const previousDetail = queryClient.getQueryData<ApplicationDetailDto>(
        applicationKeys.detail(variables.applicationId),
      );

      queryClient.setQueryData<ApplicationDto[] | undefined>(
        applicationKeys.list(),
        (list) =>
          list?.map((row) =>
            row.id === variables.applicationId
              ? mergeOptimisticTransition({
                  prev: row,
                  body: variables.body,
                  sessionUserId,
                })
              : row,
          ),
      );

      queryClient.setQueryData<ApplicationDetailDto | undefined>(
        applicationKeys.detail(variables.applicationId),
        (detail) =>
          detail
            ? ({
                ...mergeOptimisticTransition({
                  prev: detail,
                  body: variables.body,
                  sessionUserId,
                }),
                auditLogs: detail.auditLogs,
              } satisfies ApplicationDetailDto)
            : detail,
      );

      return { previousList, previousDetail };
    },
    onError: (_err, variables, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(applicationKeys.list(), context.previousList);
      }
      if (
        variables?.applicationId &&
        context?.previousDetail !== undefined
      ) {
        queryClient.setQueryData(
          applicationKeys.detail(variables.applicationId),
          context.previousDetail,
        );
      }
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: applicationKeys.list() });
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.detail(variables.applicationId),
      });
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.complianceAudit(variables.applicationId),
      });
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.documents(variables.applicationId, true),
      });
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.documents(variables.applicationId, false),
      });
    },
  });
};

export const useApplicationStatusMutation = (applicationId: string) => {
  const mutation = useApplicationTransitionMutation();
  return {
    ...mutation,
    mutate: (body: TransitionBody) =>
      mutation.mutate({ applicationId, body }),
    mutateAsync: (body: TransitionBody) =>
      mutation.mutateAsync({ applicationId, body }),
  };
};

export const useUploadApplicationDocumentMutation = (applicationId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      groupKey,
    }: {
      file: File;
      groupKey?: string | null;
    }) =>
      uploadApplicationDocument({
        applicationId,
        file,
        groupKey,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: applicationKeys.documents(applicationId, true),
        }),
        queryClient.invalidateQueries({
          queryKey: applicationKeys.documents(applicationId, false),
        }),
        queryClient.invalidateQueries({
          queryKey: applicationKeys.complianceAudit(applicationId),
        }),
        queryClient.invalidateQueries({
          queryKey: applicationKeys.detail(applicationId),
        }),
      ]);
    },
  });
};

export const useCreateApplicationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createApplication,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: applicationKeys.list() });
    },
  });
};
