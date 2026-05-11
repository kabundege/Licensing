"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ApplicationActionFooter } from "@/components/applications/application-action-footer";
import { ApplicationDocumentsPanel } from "@/components/applications/application-documents-panel";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { ApplicationTrailPanel } from "@/components/applications/application-trail-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import routes from "@/constants/routeNames";
import {
  useApplicationDetail,
  useApplicationDocuments,
  useComplianceAuditTrail,
} from "@/hooks/use-applications";
import {
  applicationStatusLabel,
  userMayReadComplianceAuditApi,
} from "@/lib/application-domain";
import { useSession } from "next-auth/react";

export function ApplicationDetailClient() {
  const params = useParams();
  const id = typeof params.id === `string` ? params.id : undefined;
  const { data: session } = useSession();
  const staffAudit = userMayReadComplianceAuditApi(session?.user?.roles);

  const detailQuery = useApplicationDetail(id);
  const documentsQuery = useApplicationDocuments(id, true);
  const complianceQuery = useComplianceAuditTrail(id);

  const app = detailQuery.data;

  if (detailQuery.isLoading || !id) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm text-muted-foreground">Loading application…</p>
      </div>
    );
  }

  if (detailQuery.isError || !app) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm text-destructive">
          {detailQuery.error instanceof Error
            ? detailQuery.error.message
            : `Application could not be loaded.`}
        </p>
        <Link
          href={routes.applications.url}
          className="mt-4 inline-block text-sm text-primary underline-offset-2 hover:underline"
        >
          Back to applications
        </Link>
      </div>
    );
  }

  const auditLoading = staffAudit && complianceQuery.isLoading;
  const auditError =
    staffAudit && complianceQuery.isError
      ? complianceQuery.error instanceof Error
        ? complianceQuery.error.message
        : `Failed to load audit trail.`
      : undefined;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href={routes.applications.url}
              className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              ← Applications
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">
              Case workspace
            </h1>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              id: {app.id}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ApplicationStatusBadge status={app.status} />
              <span className="text-xs text-muted-foreground">
                {applicationStatusLabel(app.status)}
              </span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="information" className="w-full flex-1">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="information">Information</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="audit">Audit trail</TabsTrigger>
          </TabsList>

          <TabsContent value="information" className="rounded-xl border border-border bg-card p-4">
            <p className="mb-4 text-sm text-muted-foreground">
              Application metadata from the licensing API. Structured intake
              fields will appear here once exposed on{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">Application</code>.
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Applicant ID
                </dt>
                <dd className="mt-0.5 font-mono text-sm text-foreground">
                  {app.applicant_id}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Version
                </dt>
                <dd className="mt-0.5 text-sm text-foreground">{app.version}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Reviewer
                </dt>
                <dd className="mt-0.5 font-mono text-sm text-foreground">
                  {app.reviewer_id ?? `—`}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Approver
                </dt>
                <dd className="mt-0.5 font-mono text-sm text-foreground">
                  {app.approver_id ?? `—`}
                </dd>
              </div>
            </dl>
          </TabsContent>

          <TabsContent value="documents" className="rounded-xl border border-border bg-card p-4">
            <ApplicationDocumentsPanel
              documents={documentsQuery.data}
              isLoading={documentsQuery.isLoading}
              errorMessage={
                documentsQuery.isError
                  ? documentsQuery.error instanceof Error
                    ? documentsQuery.error.message
                    : `Failed to load documents.`
                  : undefined
              }
            />
          </TabsContent>

          <TabsContent value="audit" className="rounded-xl border border-border bg-card p-4">
            <ApplicationTrailPanel
              mode={staffAudit ? `compliance` : `basic`}
              complianceEntries={complianceQuery.data}
              basicLogs={app.auditLogs}
              isLoading={Boolean(auditLoading)}
              errorMessage={auditError}
            />
          </TabsContent>
        </Tabs>
      </div>
      <ApplicationActionFooter application={app} />
    </div>
  );
}
