"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import routes from "@/constants/routeNames";
import {
  useApplicationTransitionMutation,
  useApplicationsList,
} from "@/hooks/use-applications";
import {
  ApplicationStatus,
  applicationStatusLabel,
  userSeesGlobalApplicationQueue,
} from "@/lib/application-domain";
import { userMayClaimSubmittedApplication } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

const STATUS_FILTER_OPTIONS: Array<ApplicationStatus | `ALL`> = [
  `ALL`,
  ApplicationStatus.DRAFT,
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_REVIEW,
  ApplicationStatus.PENDING_CLARIFICATION,
  ApplicationStatus.FINAL_REVIEW,
  ApplicationStatus.APPROVED,
  ApplicationStatus.REJECTED,
];

export function ApplicationsPageClient() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState(``);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | `ALL`>(
    `ALL`,
  );
  const { data, isLoading, isError, error } = useApplicationsList();
  const transition = useApplicationTransitionMutation();
  const staffQueue = userSeesGlobalApplicationQueue(session?.user?.roles);
  const tokens = session?.user?.permissions;
  const mayClaim = userMayClaimSubmittedApplication(tokens);

  const trimmedSearch = searchQuery.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    if (!data?.length) {
      return [];
    }
    return data.filter((row) => {
      if (statusFilter !== `ALL` && row.status !== statusFilter) {
        return false;
      }
      if (trimmedSearch.length === 0) {
        return true;
      }
      const idMatch = row.id.toLowerCase().includes(trimmedSearch);
      const applicantMatch = row.applicant_id.toLowerCase().includes(trimmedSearch);
      const statusMatch = row.status.toLowerCase().includes(trimmedSearch);
      return idMatch || applicantMatch || statusMatch;
    });
  }, [data, statusFilter, trimmedSearch]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Applications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {staffQueue
            ? `Review queue — all applications in the system.`
            : `Your submitted applications. The list is scoped to your account by the API.`}
        </p>
      </div>

      <Card className="gap-4 border-border p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="application-search">Search</Label>
            <Input
              id="application-search"
              placeholder="Reference ID, applicant, or status…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <div className="w-full shrink-0 space-y-2 sm:w-52">
            <Label htmlFor="application-status-filter">Status</Label>
            <select
              id="application-status-filter"
              title="Filter by status"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as ApplicationStatus | `ALL`,
                )
              }
            >
              <option value="ALL">All statuses</option>
              {STATUS_FILTER_OPTIONS.filter((option) => option !== `ALL`).map(
                (status) => (
                  <option key={status} value={status}>
                    {applicationStatusLabel(status)}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border-border">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : isError ? (
          <p className="p-6 text-sm text-destructive">
            {error instanceof Error ? error.message : `Failed to load applications.`}
          </p>
        ) : !data?.length ? (
          <p className="p-6 text-sm text-muted-foreground">
            No applications to display.
          </p>
        ) : filteredRows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            No applications match your filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Reference
                  </th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Status
                  </th>
                  {staffQueue ? (
                    <th className="px-4 py-3 font-medium text-muted-foreground">
                      Applicant
                    </th>
                  ) : null}
                  <th className="px-4 py-3 font-medium text-muted-foreground">
                    Version
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Quick actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const showClaim =
                    staffQueue &&
                    mayClaim &&
                    row.status === ApplicationStatus.SUBMITTED;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border transition-colors hover:bg-muted/25"
                    >
                      <td
                        className="px-4 py-3 font-mono text-xs text-foreground"
                        title={row.id}
                      >
                        {row.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3">
                        <ApplicationStatusBadge status={row.status} />
                      </td>
                      {staffQueue ? (
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {row.applicant_id.slice(0, 8)}…
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.version}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Link
                            href={`${routes.applications.url}/${row.id}`}
                            className={cn(buttonVariants({ variant: `outline`, size: `xs` }))}
                          >
                            View
                          </Link>
                          {showClaim ? (
                            <Button
                              type="button"
                              size="xs"
                              variant="secondary"
                              disabled={transition.isPending}
                              onClick={() =>
                                transition.mutate({
                                  applicationId: row.id,
                                  body: {
                                    targetStatus:
                                      ApplicationStatus.UNDER_REVIEW,
                                    expectedVersion: row.version,
                                  },
                                })
                              }
                            >
                              Claim
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
