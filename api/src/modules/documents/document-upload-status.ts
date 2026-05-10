import { ApplicationStatus } from '../applications/entities';

export const ALLOWED_DOCUMENT_UPLOAD_STATUSES = new Set<ApplicationStatus>([
  ApplicationStatus.DRAFT,
  ApplicationStatus.PENDING_CLARIFICATION,
]);
