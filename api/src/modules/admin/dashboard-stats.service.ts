import { AppDataSource } from '../../database/data-source';
import { AUDIT_ACTION_APPROVAL_BLOCKED_REVIEWER_IDENTITY } from '../audit/audit-actions';
import { RoleName, User } from '../auth/entities';
import { Application, ApplicationStatus, AuditLog } from '../applications/entities';

export type DashboardGlobalStats = {
  statusDistribution: {
    labels: ApplicationStatus[];
    values: number[];
    byStatus: Record<ApplicationStatus, number>;
  };
  reviewerWorkload: {
    labels: string[];
    values: number[];
    reviewers: Array<{
      userId: string;
      name: string;
      email: string;
      assignedCount: number;
    }>;
  };
  submittedToFinalReview: {
    averageHours: number | null;
    averageDays: number | null;
    sampleCount: number;
  };
  securityIntegrity: {
    blockedApprovalIdentityConflictCount: number;
  };
};

const denseStatusCounts = (
  rows: { status: ApplicationStatus; cnt: string | number }[]
): Record<ApplicationStatus, number> => {
  const byStatus = {} as Record<ApplicationStatus, number>;
  for (const s of Object.values(ApplicationStatus)) {
    byStatus[s] = 0;
  }
  for (const row of rows) {
    byStatus[row.status] = Number(row.cnt);
  }
  return byStatus;
};

const roundHours = (h: number): number => Math.round(h * 1000) / 1000;

export const getGlobalStats = async (): Promise<DashboardGlobalStats> => {
  const appRepo = AppDataSource.getRepository(Application);
  const auditRepo = AppDataSource.getRepository(AuditLog);
  const userRepo = AppDataSource.getRepository(User);

  const submittedSubQ = auditRepo
    .createQueryBuilder(`al_s`)
    .select(`al_s.application_id`, `application_id`)
    .addSelect(`MIN(al_s.timestamp)`, `t_submitted`)
    .where(`al_s.to_state = :submittedSt`, {
      submittedSt: ApplicationStatus.SUBMITTED,
    })
    .groupBy(`al_s.application_id`);

  const finalSubQ = auditRepo
    .createQueryBuilder(`al_f`)
    .select(`al_f.application_id`, `application_id`)
    .addSelect(`MIN(al_f.timestamp)`, `t_final`)
    .where(`al_f.to_state = :finalSt`, {
      finalSt: ApplicationStatus.FINAL_REVIEW,
    })
    .groupBy(`al_f.application_id`);

  const efficiencyQb = AppDataSource.manager
    .createQueryBuilder()
    .select(
      `AVG(EXTRACT(EPOCH FROM (fin.t_final - sub.t_submitted)) / 3600.0)`,
      `avgHours`
    )
    .addSelect(`COUNT(*)::int`, `sampleSize`)
    .from(`(${submittedSubQ.getQuery()})`, `sub`)
    .innerJoin(
      `(${finalSubQ.getQuery()})`,
      `fin`,
      `fin.application_id = sub.application_id`
    )
    .where(`fin.t_final >= sub.t_submitted`)
    .setParameters({
      ...submittedSubQ.getParameters(),
      ...finalSubQ.getParameters(),
    });

  const [statusRows, workloadRows, blockedCount, efficiencyRaw] = await Promise.all([
    appRepo
      .createQueryBuilder(`app`)
      .select(`app.status`, `status`)
      .addSelect(`COUNT(*)::int`, `cnt`)
      .groupBy(`app.status`)
      .getRawMany<{ status: ApplicationStatus; cnt: string }>(),
    userRepo
      .createQueryBuilder(`u`)
      .innerJoin(`u.roles`, `role`, `role.name = :rn`, {
        rn: RoleName.REVIEWER,
      })
      .leftJoin(Application, `app`, `app.reviewer_id = u.id`)
      .select(`u.id`, `userId`)
      .addSelect(`u.name`, `userName`)
      .addSelect(`u.email`, `userEmail`)
      .addSelect(`COUNT(app.id)::int`, `assignedCount`)
      .groupBy(`u.id`)
      .addGroupBy(`u.name`)
      .addGroupBy(`u.email`)
      .orderBy(`userName`, `ASC`)
      .getRawMany<{
        userId: string;
        userName: string;
        userEmail: string;
        assignedCount: string;
      }>(),
    auditRepo
      .createQueryBuilder(`al`)
      .where(`al.event_action = :ea`, {
        ea: AUDIT_ACTION_APPROVAL_BLOCKED_REVIEWER_IDENTITY,
      })
      .getCount(),
    efficiencyQb.getRawOne<{ avgHours: string | null; sampleSize: string | null }>(),
  ]);

  const applicationsByStatus = denseStatusCounts(statusRows);
  const statusLabels = Object.values(ApplicationStatus);
  const statusValues = statusLabels.map((s) => applicationsByStatus[s]);

  const reviewers = workloadRows.map((row) => ({
    userId: row.userId,
    name: row.userName,
    email: row.userEmail,
    assignedCount: Number(row.assignedCount),
  }));

  const sampleCount = efficiencyRaw?.sampleSize
    ? Number(efficiencyRaw.sampleSize)
    : 0;
  const rawAvg = efficiencyRaw?.avgHours;
  const averageHours =
    sampleCount > 0 &&
    rawAvg !== null &&
    rawAvg !== undefined &&
    Number.isFinite(Number.parseFloat(String(rawAvg)))
      ? roundHours(Number.parseFloat(String(rawAvg)))
      : null;
  const averageDays =
    averageHours !== null ? roundHours(averageHours / 24) : null;

  return {
    statusDistribution: {
      labels: statusLabels,
      values: statusValues,
      byStatus: applicationsByStatus,
    },
    reviewerWorkload: {
      labels: reviewers.map((r) => r.name),
      values: reviewers.map((r) => r.assignedCount),
      reviewers,
    },
    submittedToFinalReview: {
      averageHours,
      averageDays,
      sampleCount,
    },
    securityIntegrity: {
      blockedApprovalIdentityConflictCount: blockedCount,
    },
  };
};
