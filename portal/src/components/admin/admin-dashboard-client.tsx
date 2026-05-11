"use client";

import { Formik, type FormikHelpers } from "formik";
import { isAxiosError } from "axios";
import Link from "next/link";
import { useMemo, useState } from "react";

import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { PermissionGuardClient } from "@/components/auth/permission-guard-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import routes from "@/constants/routeNames";
import {
  useAdminAuditLogsQuery,
  useAdminUsersQuery,
  useCreateReviewerMutation,
  useDashboardStatsQuery,
  usePromoteUserMutation,
  useRegulatorySummaryQuery,
} from "@/hooks/use-admin-portal";
import type { AdminAuditLogsQuery } from "@/lib/api/admin-portal-types";
import {
  ApplicationStatus,
  applicationStatusLabel,
} from "@/lib/application-domain";
import { humanReadableAuditDescription } from "@/lib/audit-display";
import { NAV_PERMISSIONS, actorHasAnyToken } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {
  registerValidationSchema,
  type RegisterBodyDto,
} from "@/validation/register.validation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const DEFAULT_USERS_LIMIT = 50;

const formatAge = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return `just now`;
  }
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const parseOptionalUuid = (raw: string): string | undefined | null => {
  const value = raw.trim();
  if (value.length === 0) {
    return undefined;
  }
  const ok =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  return ok ? value : null;
};

const coerceAuditLimit = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return 500;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return null;
  }
  const i = Math.trunc(n);
  if (i < 1 || i > 2000) {
    return null;
  }
  return i;
};

export function AdminDashboardClient() {
  const { data: session } = useSession();
  const tokens = session?.user?.permissions;
  const roles = session?.user?.roles ?? [];
  const isAdminRole = roles.includes(`ADMIN`);

  const mayManageUsers = actorHasAnyToken(tokens, NAV_PERMISSIONS.adminDashboard);
  const mayViewMetrics = actorHasAnyToken(tokens, NAV_PERMISSIONS.viewDashboardStats);

  const defaultTab = useMemo(() => {
    if (mayManageUsers) return `users`;
    if (mayViewMetrics) return `metrics`;
    if (isAdminRole) return `oversight`;
    return `metrics`;
  }, [isAdminRole, mayManageUsers, mayViewMetrics]);

  const [usersPage, setUsersPage] = useState(1);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">
          Administration & insights
        </h1>
        <p className="text-sm text-muted-foreground">
          Tabs appear based on your role.
        </p>
      </header>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="flex flex-wrap gap-1">
          <PermissionGuardClient anyOf={NAV_PERMISSIONS.adminDashboard} fallback={null}>
            <TabsTrigger value="users">Users</TabsTrigger>
          </PermissionGuardClient>
          <PermissionGuardClient anyOf={NAV_PERMISSIONS.viewDashboardStats} fallback={null}>
            <TabsTrigger value="metrics">Operational metrics</TabsTrigger>
          </PermissionGuardClient>
          {isAdminRole ? <TabsTrigger value="oversight">Regulatory oversight</TabsTrigger> : null}
        </TabsList>

        <PermissionGuardClient anyOf={NAV_PERMISSIONS.adminDashboard} fallback={null}>
          <TabsContent value="users" className="space-y-6 pt-4">
            <AdminUsersTab page={usersPage} onPageChange={setUsersPage} />
          </TabsContent>
        </PermissionGuardClient>

        <PermissionGuardClient anyOf={NAV_PERMISSIONS.viewDashboardStats} fallback={null}>
          <TabsContent value="metrics" className="space-y-6 pt-4">
            <AdminMetricsTab />
          </TabsContent>
        </PermissionGuardClient>

        {isAdminRole ? (
          <TabsContent value="oversight" className="space-y-6 pt-4">
            <AdminRegulatoryTab />
          </TabsContent>
        ) : null}
      </Tabs>

      {!mayManageUsers && !mayViewMetrics && !isAdminRole ? (
        <p className="text-sm text-muted-foreground">
          Your account does not have tools on this page.
        </p>
      ) : null}
    </div>
  );
}

function AdminMetricsTab() {
  const query = useDashboardStatsQuery();

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading dashboard metrics…</p>;
  }
  if (query.isError || !query.data) {
    return (
      <p className="text-sm text-destructive">
        {query.error instanceof Error ? query.error.message : `Could not load dashboard metrics.`}
      </p>
    );
  }

  const stats = query.data;
  const avgHours = stats.submittedToFinalReview.averageHours;
  const avgDays = stats.submittedToFinalReview.averageDays;

  return (
    <div className="space-y-6">
      <Card className="border-border p-5">
        <h2 className="text-sm font-semibold text-foreground">Pipeline velocity</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Average elapsed time from first submission milestone to final review among sampled cases.
        </p>
        <dl className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Average hours
            </dt>
            <dd className="mt-1 text-lg font-semibold text-foreground">
              {avgHours !== null ? `${avgHours} h` : `—`}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Average days
            </dt>
            <dd className="mt-1 text-lg font-semibold text-foreground">
              {avgDays !== null ? `${avgDays} d` : `—`}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sample size
            </dt>
            <dd className="mt-1 text-lg font-semibold text-foreground">
              {stats.submittedToFinalReview.sampleCount}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="border-border p-5">
        <h2 className="text-sm font-semibold text-foreground">Cases by status</h2>
        <div className="mt-4 overflow-x-auto border-t border-border pt-4">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-right text-muted-foreground">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.statusDistribution.labels.map((status, idx) => (
                <TableRow key={status} className="border-border">
                  <TableCell className="flex items-center gap-2">
                    <ApplicationStatusBadge status={status} />
                    <span className="text-xs text-muted-foreground">
                      {applicationStatusLabel(status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-foreground">
                    {stats.statusDistribution.values[idx]}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="border-border p-5">
        <h2 className="text-sm font-semibold text-foreground">Reviewer workload</h2>
        <div className="mt-4 overflow-x-auto border-t border-border pt-4">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-muted-foreground">Reviewer</TableHead>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-right text-muted-foreground">Assigned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.reviewerWorkload.reviewers.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={3} className="text-sm text-muted-foreground">
                    No reviewers found.
                  </TableCell>
                </TableRow>
              ) : (
                stats.reviewerWorkload.reviewers.map((row) => (
                  <TableRow key={row.userId} className="border-border">
                    <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.email}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-foreground">
                      {row.assignedCount}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="border-border p-5">
        <h2 className="text-sm font-semibold text-foreground">Security integrity signals</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Count of blocked approvals where reviewer identity would conflict with segregation-of-duty rules.
        </p>
        <p className="mt-4 border-t border-border pt-4 text-2xl font-semibold tabular-nums text-foreground">
          {stats.securityIntegrity.blockedApprovalIdentityConflictCount}
        </p>
      </Card>
    </div>
  );
}

function AdminUsersTab({
  page,
  onPageChange,
}: {
  page: number;
  onPageChange: (next: number) => void;
}) {
  const usersQuery = useAdminUsersQuery(page, DEFAULT_USERS_LIMIT);
  const promote = usePromoteUserMutation();
  const createReviewer = useCreateReviewerMutation();
  const [promotionTargets, setPromotionTargets] = useState<
    Record<string, `REVIEWER` | `APPROVER` | ``>
  >({});

  const totalPages =
    usersQuery.data !== undefined
      ? Math.max(1, Math.ceil(usersQuery.data.total / DEFAULT_USERS_LIMIT))
      : 1;

  const onSubmitReviewer = async (
    values: RegisterBodyDto,
    helpers: FormikHelpers<RegisterBodyDto>,
  ) => {
    helpers.setStatus(undefined);
    try {
      await createReviewer.mutateAsync({
        email: values.email,
        password: values.password,
        name: values.name,
      });
      helpers.resetForm();
    } catch (err) {
      if (isAxiosError(err)) {
        const msg =
          err.response?.data &&
          typeof err.response.data === `object` &&
          err.response.data !== null &&
          `message` in err.response.data &&
          typeof (err.response.data as { message: unknown }).message === `string`
            ? (err.response.data as { message: string }).message
            : err.message;
        helpers.setStatus(typeof msg === `string` ? msg : `Request failed`);
        return;
      }
      helpers.setStatus(`Could not create reviewer`);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border-border">
        {usersQuery.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading directory…</p>
        ) : usersQuery.isError ? (
          <p className="p-6 text-sm text-destructive">
            {usersQuery.error instanceof Error
              ? usersQuery.error.message
              : `Failed to load users.`}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="text-xs text-muted-foreground">
                Page{" "}
                <span className="font-mono text-foreground">{page}</span>
                {" · "}
                {usersQuery.data?.total ?? 0} accounts
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || usersQuery.isFetching}
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages || usersQuery.isFetching}
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Roles</TableHead>
                  <TableHead className="text-right text-muted-foreground">Elevate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(usersQuery.data?.users ?? []).map((user) => {
                  const selected = promotionTargets[user.id] ?? ``;
                  const disablePromote =
                    promote.isPending ||
                    (selected !== `REVIEWER` && selected !== `APPROVER`);
                  return (
                    <TableRow key={user.id} className="border-border">
                      <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{user.email}</TableCell>
                      <TableCell className="text-xs text-foreground">
                        <span className="font-mono">
                          {user.roles.length ? user.roles.join(`, `) : `—`}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <select
                            title="Promote to staff role"
                            className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs shadow-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                            value={selected}
                            onChange={(event) =>
                              setPromotionTargets((prev) => ({
                                ...prev,
                                [user.id]:
                                  event.target.value === ``
                                    ? ``
                                    : (event.target.value as `REVIEWER` | `APPROVER`),
                              }))
                            }
                          >
                            <option value="">Choose role…</option>
                            <option value="REVIEWER">Reviewer</option>
                            <option value="APPROVER">Approver</option>
                          </select>
                          <Button
                            type="button"
                            size="xs"
                            variant="secondary"
                            disabled={disablePromote}
                            onClick={() => {
                              if (selected !== `REVIEWER` && selected !== `APPROVER`) {
                                return;
                              }
                              promote.mutate(
                                { userId: user.id, role: selected },
                                {
                                  onSuccess: () => {
                                    setPromotionTargets((prev) => {
                                      const next = { ...prev };
                                      delete next[user.id];
                                      return next;
                                    });
                                  },
                                },
                              );
                            }}
                          >
                            Apply
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </Card>

      <Card className="border-border p-5">
        <h2 className="text-sm font-semibold text-foreground">Create reviewer account</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          New reviewers sign in with the credentials you set here and can rotate their
          password later.
        </p>
        <Formik<RegisterBodyDto>
          initialValues={{ name: ``, email: ``, password: `` }}
          validationSchema={registerValidationSchema}
          validateOnBlur
          validateOnChange={false}
          onSubmit={onSubmitReviewer}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            handleSubmit,
            status,
            isSubmitting,
          }) => (
            <form className="mt-4 space-y-4 border-t border-border pt-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reviewer-name">Full name</Label>
                  <Input
                    id="reviewer-name"
                    name="name"
                    autoComplete="name"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {touched.name && errors.name ? (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reviewer-email">Email</Label>
                  <Input
                    id="reviewer-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={values.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  {touched.email && errors.email ? (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewer-password">Temporary password</Label>
                <Input
                  id="reviewer-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={values.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                />
                {touched.password && errors.password ? (
                  <p className="text-xs text-destructive">{errors.password}</p>
                ) : null}
              </div>
              {typeof status === `string` ? (
                <p className="text-xs text-destructive">{status}</p>
              ) : null}
              <Button type="submit" disabled={isSubmitting || createReviewer.isPending}>
                {createReviewer.isPending || isSubmitting ? `Creating…` : `Create reviewer`}
              </Button>
            </form>
          )}
        </Formik>
      </Card>
    </div>
  );
}

function AdminRegulatoryTab() {
  const summaryQuery = useRegulatorySummaryQuery();

  const [draftFilters, setDraftFilters] = useState({
    applicant_id: ``,
    reviewer_id: ``,
    approver_id: ``,
    document_id: ``,
    limit: `500`,
  });
  const [appliedAuditQuery, setAppliedAuditQuery] = useState<AdminAuditLogsQuery | null>(
    null,
  );

  const auditQuery = useAdminAuditLogsQuery(
    appliedAuditQuery ?? { limit: 500 },
    appliedAuditQuery !== null,
  );

  const applyAuditFilters = () => {
    const applicant_id = parseOptionalUuid(draftFilters.applicant_id);
    const reviewer_id = parseOptionalUuid(draftFilters.reviewer_id);
    const approver_id = parseOptionalUuid(draftFilters.approver_id);
    const document_id = parseOptionalUuid(draftFilters.document_id);

    if (
      applicant_id === null ||
      reviewer_id === null ||
      approver_id === null ||
      document_id === null
    ) {
      toast.error(`Filters must be empty or valid UUID values.`);
      return;
    }

    const limit = coerceAuditLimit(draftFilters.limit);
    if (limit === null) {
      toast.error(`Limit must be an integer from 1 to 2000.`);
      return;
    }

    setAppliedAuditQuery({
      applicant_id,
      reviewer_id,
      approver_id,
      document_id,
      limit,
    });
  };

  return (
    <div className="space-y-8">
      <Card className="border-border p-5">
        <h2 className="text-sm font-semibold text-foreground">Regulatory snapshot</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Aggregated view of pipeline health for compliance reporting.
        </p>

        {summaryQuery.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading regulatory snapshot…</p>
        ) : summaryQuery.isError || !summaryQuery.data ? (
          <p className="mt-4 text-sm text-destructive">
            {summaryQuery.error instanceof Error
              ? summaryQuery.error.message
              : `Could not load regulatory snapshot.`}
          </p>
        ) : (
          <div className="mt-4 space-y-6 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              As of{" "}
              <span className="font-mono text-foreground">
                {new Date(summaryQuery.data.asOf).toLocaleString()}
              </span>
            </p>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Active pipeline dwell (UNDER_REVIEW spells)
              </h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Average duration</dt>
                  <dd className="text-sm font-semibold text-foreground">
                    {summaryQuery.data.underReview.averageDurationSeconds !== null
                      ? `${summaryQuery.data.underReview.averageDurationSeconds}s`
                      : `—`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Completed cycles</dt>
                  <dd className="text-sm font-semibold text-foreground">
                    {summaryQuery.data.underReview.completedCyclesCount}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Bottleneck candidates (oldest audit activity)
              </h3>
              <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-muted-foreground">Application</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Age</TableHead>
                      <TableHead className="text-right text-muted-foreground">Open</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summaryQuery.data.topPendingBottlenecks.length === 0 ? (
                      <TableRow className="border-border">
                        <TableCell colSpan={4} className="text-sm text-muted-foreground">
                          No pending pipeline cases detected.
                        </TableCell>
                      </TableRow>
                    ) : (
                      summaryQuery.data.topPendingBottlenecks.map((row) => (
                        <TableRow key={row.applicationId} className="border-border">
                          <TableCell className="font-mono text-xs text-foreground">
                            {row.applicationId.slice(0, 8)}…
                          </TableCell>
                          <TableCell>
                            <ApplicationStatusBadge status={row.status} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatAge(row.ageSeconds)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`${routes.applications.url}/${row.applicationId}`}
                              className={cn(
                                `text-xs font-medium text-primary underline-offset-4 hover:underline`,
                              )}
                            >
                              View case
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Inventory by status
              </h3>
              <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-right text-muted-foreground">Cases</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(Object.keys(summaryQuery.data.applicationsByStatus) as ApplicationStatus[]).map(
                      (status) => (
                        <TableRow key={status} className="border-border">
                          <TableCell className="flex items-center gap-2">
                            <ApplicationStatusBadge status={status} />
                            <span className="text-xs text-muted-foreground">
                              {applicationStatusLabel(status)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm text-foreground">
                            {summaryQuery.data.applicationsByStatus[status]}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card className="border-border p-5">
        <h2 className="text-sm font-semibold text-foreground">Cross-application audit search</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Leave filters blank to pull the most recent events up to the configured limit.
        </p>

        <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="audit-applicant">Applicant ID</Label>
            <Input
              id="audit-applicant"
              value={draftFilters.applicant_id}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, applicant_id: event.target.value }))
              }
              placeholder="UUID"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-reviewer">Reviewer ID</Label>
            <Input
              id="audit-reviewer"
              value={draftFilters.reviewer_id}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, reviewer_id: event.target.value }))
              }
              placeholder="UUID"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-approver">Approver ID</Label>
            <Input
              id="audit-approver"
              value={draftFilters.approver_id}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, approver_id: event.target.value }))
              }
              placeholder="UUID"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audit-document">Document ID</Label>
            <Input
              id="audit-document"
              value={draftFilters.document_id}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, document_id: event.target.value }))
              }
              placeholder="UUID"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="audit-limit">Limit (1–2000)</Label>
            <Input
              id="audit-limit"
              value={draftFilters.limit}
              onChange={(event) =>
                setDraftFilters((prev) => ({ ...prev, limit: event.target.value }))
              }
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" variant="secondary" onClick={applyAuditFilters}>
            Apply filters
          </Button>
          {appliedAuditQuery !== null && !auditQuery.isLoading && !auditQuery.isError ? (
            <p className="text-xs text-muted-foreground">
              {auditQuery.data?.length ?? 0} entries shown.
            </p>
          ) : null}
        </div>

        {appliedAuditQuery === null ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Run a search to load audit rows (defaults to the latest events when filters are empty).
          </p>
        ) : auditQuery.isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">Loading audit rows…</p>
        ) : auditQuery.isError ? (
          <p className="mt-6 text-sm text-destructive">
            {auditQuery.error instanceof Error
              ? auditQuery.error.message
              : `Audit search failed.`}
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-border">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-muted-foreground">When</TableHead>
                  <TableHead className="text-muted-foreground">Summary</TableHead>
                  <TableHead className="text-muted-foreground">Application</TableHead>
                  <TableHead className="text-muted-foreground">Actor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(auditQuery.data ?? []).length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">
                      No audit entries matched this query.
                    </TableCell>
                  </TableRow>
                ) : (
                  (auditQuery.data ?? []).map((entry) => (
                    <TableRow key={entry.id} className="border-border">
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-[320px] text-xs text-foreground">
                        {entry.action_label ||
                          humanReadableAuditDescription({
                            event_action: entry.event_action,
                            from_state: entry.from_state,
                            to_state: entry.to_state,
                          })}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-foreground">
                        {entry.application_id.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{entry.actor.name}</span>
                        <span className="block text-[11px]">{entry.actor.role}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
