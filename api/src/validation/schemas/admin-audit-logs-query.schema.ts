import * as yup from 'yup';

export type AdminAuditLogsQueryDto = {
  applicant_id?: string;
  reviewer_id?: string;
  approver_id?: string;
  document_id?: string;
  limit: number;
};

export const adminAuditLogsQuerySchema = yup
  .object({
    applicant_id: yup.string().optional(),
    reviewer_id: yup.string().optional(),
    approver_id: yup.string().optional(),
    document_id: yup.string().optional(),
    limit: yup.mixed<string | number>().optional(),
  })
  .transform((root) => {
    const clean = (v: unknown): string | undefined => {
      if (v === undefined || v === null || v === ``) {
        return undefined;
      }
      const s = String(v).trim();
      return s === `` ? undefined : s;
    };
    const coerceLimit = (
      raw: unknown,
      fallback: number,
      min: number,
      max: number
    ): number => {
      if (raw === undefined || raw === null || raw === ``) {
        return fallback;
      }
      const n =
        typeof raw === `number` && Number.isFinite(raw)
          ? raw
          : Number(String(raw).trim());
      if (!Number.isFinite(n)) {
        return NaN;
      }
      const i = Math.trunc(n);
      if (i < min || i > max) {
        return NaN;
      }
      return i;
    };
    return {
      applicant_id: clean(root.applicant_id),
      reviewer_id: clean(root.reviewer_id),
      approver_id: clean(root.approver_id),
      document_id: clean(root.document_id),
      limit: coerceLimit(root.limit, 500, 1, 2000),
    };
  })
  .test(
    `admin-audit-logs-query`,
    `applicant_id, reviewer_id, approver_id, and document_id must be UUIDs when provided; limit must be an integer from 1 to 2000`,
    (value): value is AdminAuditLogsQueryDto => {
      if (!value || typeof value.limit !== `number` || Number.isNaN(value.limit)) {
        return false;
      }
    const okUuid = (s: string | undefined): boolean => {
      if (s === undefined) {
        return true;
      }
      try {
        yup.string().uuid().validateSync(s);
        return true;
      } catch {
        return false;
      }
    };
      return (
        okUuid(value.applicant_id) &&
        okUuid(value.reviewer_id) &&
        okUuid(value.approver_id) &&
        okUuid(value.document_id)
      );
    }
  );
