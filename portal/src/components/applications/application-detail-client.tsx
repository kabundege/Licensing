"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ApplicationActionFooter } from "@/components/applications/application-action-footer";
import { ApplicationDocumentsPanel } from "@/components/applications/application-documents-panel";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { ApplicationTrailPanel } from "@/components/applications/application-trail-panel";
import routes from "@/constants/routeNames";
import {
  useApplicationDetail,
  useApplicationDocuments,
  useComplianceAuditTrail,
} from "@/hooks/use-applications";
import {
  ApplicationStatus,
  applicationStatusLabel,
  userMayReadComplianceAuditApi,
} from "@/lib/application-domain";
import { userMayDownloadCaseDocuments } from "@/lib/permissions";
import { useSession } from "next-auth/react";

export function ApplicationDetailClient() {
  const params = useParams();
  const id = typeof params.id === `string` ? params.id : undefined;
  const { data: session } = useSession();
  const sessionUserId = session?.user?.id;
  const staffAudit = userMayReadComplianceAuditApi(session?.user?.roles);

  const detailQuery = useApplicationDetail(id);
  const documentsQuery = useApplicationDocuments(id, true);
  const complianceQuery = useComplianceAuditTrail(id);

  const app = detailQuery.data;

  const mayUploadDocs =
    Boolean(sessionUserId) &&
    app !== undefined &&
    sessionUserId === app.applicant_id &&
    (app.status === ApplicationStatus.DRAFT ||
      app.status === ApplicationStatus.PENDING_CLARIFICATION);

  const mayDownloadDocs =
    app !== undefined &&
    userMayDownloadCaseDocuments({
      sessionUserId,
      applicantId: app.applicant_id,
      roles: session?.user?.roles,
    });

  if (detailQuery.isLoading || !id) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm text-muted-foreground">Loading application…</p>
      </div>
    );
  }

  if (detailQuery.isError || !app) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
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
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8">
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href={routes.applications.url}
              className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              ← Applications
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">
              Application case
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
        </header>

        <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(15rem,17.5rem)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(16rem,19rem)_minmax(0,1fr)]">
          <aside
            aria-labelledby="audit-heading"
            className="order-2 lg:order-1 lg:sticky lg:top-4 lg:max-h-[calc(100vh-4.5rem)] lg:overflow-y-auto lg:rounded-xl lg:border lg:border-border lg:bg-card lg:p-5 lg:shadow-none"
          >
            <h2
              id="audit-heading"
              className="text-sm font-semibold text-foreground"
            >
              Audit timeline
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {staffAudit
                ? `Compliance view of every action recorded against this case.`
                : `Events visible on this case.`}
            </p>
            <div className="mt-4 min-h-[12rem] border-t border-border pt-4 lg:border-border">
              <ApplicationTrailPanel
                mode={staffAudit ? `compliance` : `basic`}
                complianceEntries={complianceQuery.data}
                basicLogs={app.auditLogs}
                isLoading={Boolean(auditLoading)}
                errorMessage={auditError}
              />
            </div>
          </aside>

          <div className="order-1 flex min-w-0 flex-col gap-8 lg:order-2">
            <section
              aria-labelledby="form-data-heading"
              className="rounded-xl border border-border bg-card p-5 shadow-none"
            >
              <h2
                id="form-data-heading"
                className="text-sm font-semibold text-foreground"
              >
                Form data
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Submitted licensing fields will appear here once the intake form
                is wired up. For now, core record identifiers are shown below.
              </p>
              <dl className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
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
                    Record version
                  </dt>
                  <dd className="mt-0.5 text-sm text-foreground">
                    {app.version}
                  </dd>
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
            </section>

            <section
              aria-labelledby="documents-heading"
              className="flex min-h-0 flex-col rounded-xl border border-border bg-card p-5 shadow-none"
            >
              <h2
                id="documents-heading"
                className="text-sm font-semibold text-foreground"
              >
                Documents
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Current revisions are emphasized. Applicants may upload while
                the case is in Draft or Pending clarification.
              </p>
              <div className="mt-4 min-h-[12rem] flex-1 border-t border-border pt-4">
                <ApplicationDocumentsPanel
                  applicationId={app.id}
                  applicationStatus={app.status}
                  applicantId={app.applicant_id}
                  sessionUserId={sessionUserId}
                  mayUploadNextVersion={mayUploadDocs}
                  mayDownloadDocuments={mayDownloadDocs}
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
              </div>
            </section>
          </div>
        </div>
      </div>
      <ApplicationActionFooter application={app} />
    </div>
  );
}
