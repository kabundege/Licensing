import { AppDataSource } from '../../database/data-source';
import { Application, ApplicationStatus } from '../applications/entities';

/** In-flight licensing pipeline (excludes DRAFT and terminal states). */
export const PENDING_PIPELINE_STATUSES: readonly ApplicationStatus[] = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_REVIEW,
  ApplicationStatus.PENDING_CLARIFICATION,
  ApplicationStatus.FINAL_REVIEW,
] as const;

export type PendingBottleneckRow = {
  applicationId: string;
  applicantId: string;
  status: ApplicationStatus;
  firstAuditAt: string;
  ageSeconds: number;
};

export type RegulatorySummaryData = {
  asOf: string;
  applicationsByStatus: Record<ApplicationStatus, number>;
  underReview: {
    averageDurationSeconds: number | null;
    completedCyclesCount: number;
  };
  topPendingBottlenecks: PendingBottleneckRow[];
};

const statusCountTemplate = (): Record<ApplicationStatus, number> => {
  const base = {} as Record<ApplicationStatus, number>;
  for (const s of Object.values(ApplicationStatus)) {
    base[s] = 0;
  }
  return base;
};

const parseAvgRow = (
  rows: Array<{ avg_seconds: unknown; cnt: unknown } | undefined>
): { averageDurationSeconds: number | null; completedCyclesCount: number } => {
  const row = rows[0];
  if (!row) {
    return { averageDurationSeconds: null, completedCyclesCount: 0 };
  }
  const cnt = Number(row.cnt ?? 0);
  if (!Number.isFinite(cnt) || cnt === 0) {
    return { averageDurationSeconds: null, completedCyclesCount: 0 };
  }
  const raw = row.avg_seconds;
  const avg =
    raw === null || raw === undefined ? null : Number.parseFloat(String(raw));
  return {
    averageDurationSeconds:
      avg !== null && Number.isFinite(avg) ? Math.round(avg * 1000) / 1000 : null,
    completedCyclesCount: cnt,
  };
};

export const getRegulatorySummary = async (
  now: Date = new Date()
): Promise<RegulatorySummaryData> => {
  const appRepo = AppDataSource.getRepository(Application);

  const countRows = await appRepo
    .createQueryBuilder(`app`)
    .select(`app.status`, `status`)
    .addSelect(`COUNT(*)::int`, `count`)
    .groupBy(`app.status`)
    .getRawMany<{ status: ApplicationStatus; count: string | number }>();

  const applicationsByStatus = statusCountTemplate();
  for (const row of countRows) {
    applicationsByStatus[row.status] = Number(row.count);
  }

  const avgRows = await AppDataSource.query<
    { avg_seconds: unknown; cnt: unknown }[]
  >(
    `
    WITH ordered AS (
      SELECT
        application_id,
        "timestamp",
        to_state,
        LEAD("timestamp") OVER (
          PARTITION BY application_id
          ORDER BY "timestamp" ASC, id ASC
        ) AS next_ts
      FROM audit_logs
    ),
    spells AS (
      SELECT EXTRACT(EPOCH FROM (next_ts - "timestamp"))::double precision AS seconds
      FROM ordered
      WHERE to_state = $1 AND next_ts IS NOT NULL
    )
    SELECT AVG(seconds) AS avg_seconds, COUNT(*)::int AS cnt
    FROM spells
    `,
    [ApplicationStatus.UNDER_REVIEW]
  );

  const underReview = parseAvgRow(avgRows);

  const pendingPlaceholders = PENDING_PIPELINE_STATUSES.map(
    (_, i) => `$${i + 1}`
  ).join(`, `);

  const bottleneckRows = await AppDataSource.query<
    {
      applicationId: string;
      applicantId: string;
      status: ApplicationStatus;
      firstActivityAt: Date;
    }[]
  >(
    `
    SELECT
      a.id AS "applicationId",
      a.applicant_id AS "applicantId",
      a.status AS "status",
      fe.first_audit_at AS "firstActivityAt"
    FROM applications a
    INNER JOIN (
      SELECT application_id, MIN("timestamp") AS first_audit_at
      FROM audit_logs
      GROUP BY application_id
    ) fe ON fe.application_id = a.id
    WHERE a.status IN (${pendingPlaceholders})
    ORDER BY fe.first_audit_at ASC
    LIMIT 5
    `,
    [...PENDING_PIPELINE_STATUSES]
  );

  const asOfMs = now.getTime();
  const topPendingBottlenecks: PendingBottleneckRow[] = bottleneckRows.map(
    (row) => {
      const first = new Date(row.firstActivityAt);
      const ageSeconds = Math.max(
        0,
        Math.floor((asOfMs - first.getTime()) / 1000)
      );
      return {
        applicationId: row.applicationId,
        applicantId: row.applicantId,
        status: row.status,
        firstAuditAt: first.toISOString(),
        ageSeconds,
      };
    }
  );

  return {
    asOf: now.toISOString(),
    applicationsByStatus,
    underReview,
    topPendingBottlenecks,
  };
};
