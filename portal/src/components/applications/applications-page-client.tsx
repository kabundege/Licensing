"use client";

import Link from "next/link";

import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { Card } from "@/components/ui/card";
import routes from "@/constants/routeNames";
import { useApplicationsList } from "@/hooks/use-applications";
import { userSeesGlobalApplicationQueue } from "@/lib/application-domain";
import { useSession } from "next-auth/react";

export function ApplicationsPageClient() {
  const { data: session } = useSession();
  const { data, isLoading, isError, error } = useApplicationsList();
  const staffQueue = userSeesGlobalApplicationQueue(session?.user?.roles);

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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
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
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border transition-colors hover:bg-muted/25"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`${routes.applications.url}/${row.id}`}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {row.id.slice(0, 8)}…
                      </Link>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
