import api from "@/lib/api";
import type {
  ApiListResponse,
  ApplicationDetailDto,
  ApplicationDto,
  ComplianceAuditEntryDto,
  DocumentDto,
  TransitionBody,
} from "@/lib/api/applications-types";

export const createApplication = async (): Promise<ApplicationDto> => {
  const res = await api.post<ApiListResponse<ApplicationDto>>(`/api/applications`, {});
  return res.data.data;
};

export const fetchApplications = async (): Promise<ApplicationDto[]> => {
  const res = await api.get<ApiListResponse<ApplicationDto[]>>(`/api/applications`);
  return res.data.data;
};

export const fetchApplicationById = async (
  id: string,
): Promise<ApplicationDetailDto> => {
  const res = await api.get<ApiListResponse<ApplicationDetailDto>>(
    `/api/applications/${id}`,
  );
  return res.data.data;
};

export const fetchApplicationDocuments = async (
  id: string,
  includeHistory: boolean,
): Promise<DocumentDto[]> => {
  const res = await api.get<ApiListResponse<DocumentDto[]>>(
    `/api/applications/${id}/documents`,
    { params: { includeHistory: String(includeHistory) } },
  );
  return res.data.data;
};

export const fetchComplianceAuditLogs = async (
  id: string,
): Promise<ComplianceAuditEntryDto[]> => {
  const res = await api.get<ApiListResponse<ComplianceAuditEntryDto[]>>(
    `/api/applications/${id}/audit-logs`,
  );
  return res.data.data;
};

export const patchApplicationStatus = async (
  id: string,
  body: TransitionBody,
): Promise<ApplicationDto> => {
  const res = await api.patch<ApiListResponse<ApplicationDto>>(
    `/api/applications/${id}/status`,
    body,
  );
  return res.data.data;
};
