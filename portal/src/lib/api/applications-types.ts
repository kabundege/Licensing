import type { ApplicationStatus } from "@/lib/application-domain";

export type ApiListResponse<T> = {
  success?: boolean;
  data: T;
};

export type ApplicationDto = {
  id: string;
  applicant_id: string;
  status: ApplicationStatus;
  reviewer_id: string | null;
  approver_id: string | null;
  version: number;
};

export type AuditLogDto = {
  id: string;
  application_id: string;
  actor_id: string;
  from_state: ApplicationStatus | null;
  to_state: ApplicationStatus | null;
  event_action: string | null;
  document_id: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
};

export type ApplicationDetailDto = ApplicationDto & {
  auditLogs: AuditLogDto[];
};

export type DocumentDto = {
  id: string;
  application_id: string;
  group_key: string | null;
  version: number;
  is_current: boolean;
  file_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploader_id: string;
};

export type ComplianceAuditEntryDto = {
  id: string;
  application_id: string;
  actor_id: string;
  actor: { name: string; role: string };
  action_label: string;
  event_action: string | null;
  from_state: ApplicationStatus | null;
  to_state: ApplicationStatus | null;
  document_id: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
};

export type TransitionBody = {
  targetStatus: ApplicationStatus;
  expectedVersion: number;
};
