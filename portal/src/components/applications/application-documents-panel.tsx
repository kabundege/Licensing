"use client";

import { isAxiosError } from "axios";
import type { ReactNode } from "react";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUploadApplicationDocumentMutation } from "@/hooks/use-applications";
import type { DocumentDto } from "@/lib/api/applications-types";
import { downloadApplicationDocument } from "@/lib/api/documents-api";
import { ApplicationStatus } from "@/lib/application-domain";
import { cn } from "@/lib/utils";

const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

export function ApplicationDocumentsPanel({
  applicationId,
  applicationStatus,
  applicantId,
  sessionUserId,
  mayUploadNextVersion,
  mayDownloadDocuments,
  documents,
  isLoading,
  errorMessage,
}: {
  applicationId: string;
  applicationStatus: ApplicationStatus;
  applicantId: string;
  sessionUserId: string | undefined;
  mayUploadNextVersion: boolean;
  mayDownloadDocuments: boolean;
  documents: DocumentDto[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
}) {
  const uploadMutation = useUploadApplicationDocumentMutation(applicationId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draftGroupKey, setDraftGroupKey] = useState(``);
  const [downloadBusyId, setDownloadBusyId] = useState<string | null>(null);

  const inputId = useId();
  const groupKeyInputId = useId();

  const grouped = useMemo(() => {
    if (!documents?.length) {
      return [];
    }
    const map = new Map<string | null, DocumentDto[]>();
    for (const doc of documents) {
      const key = doc.group_key;
      const cur = map.get(key) ?? [];
      cur.push(doc);
      map.set(key, cur);
    }
    return [...map.entries()].map(([groupKey, rows]) => ({
      groupKey,
      rows: [...rows].sort((a, b) => b.version - a.version),
    }));
  }, [documents]);

  const onPickFile = useCallback(() => fileInputRef.current?.click(), []);

  const onDownload = useCallback(
    async (doc: DocumentDto) => {
      if (!mayDownloadDocuments || downloadBusyId !== null) {
        return;
      }
      try {
        setDownloadBusyId(doc.id);
        await downloadApplicationDocument({
          documentId: doc.id,
          suggestedName: doc.original_name,
        });
      } catch (err) {
        const message =
          isAxiosError(err) &&
          err.response?.data &&
          typeof err.response.data === `object` &&
          err.response.data !== null &&
          `message` in err.response.data &&
          typeof (err.response.data as { message: unknown }).message === `string`
            ? (err.response.data as { message: string }).message
            : err instanceof Error
              ? err.message
              : `Download failed.`;
        toast.error(message);
      } finally {
        setDownloadBusyId(null);
      }
    },
    [downloadBusyId, mayDownloadDocuments],
  );

  const submitFile = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0];
      if (!file || uploadMutation.isPending) {
        return;
      }
      const groupTrimmed = draftGroupKey.trim();
      await uploadMutation.mutateAsync({
        file,
        groupKey:
          groupTrimmed.length > 0 ? groupTrimmed.slice(0, 256) : null,
      });
      setDraftGroupKey(``);
      if (fileInputRef.current) {
        fileInputRef.current.value = ``;
      }
    },
    [draftGroupKey, uploadMutation],
  );

  const uploadHints = useMemo(() => {
    const lines: ReactNode[] = [];
    lines.push(
      <p key="status">
        Applicants can upload while the case is in{' '}
        <span className="font-medium text-foreground">Draft</span> or{' '}
        <span className="font-medium text-foreground">Pending clarification</span>.
      </p>,
    );
    if (
      applicationStatus !== ApplicationStatus.DRAFT &&
      applicationStatus !== ApplicationStatus.PENDING_CLARIFICATION
    ) {
      lines.push(
        <p key="state" className="text-amber-900 dark:text-amber-200">
          Uploads are locked at this stage.
        </p>,
      );
    }
    return lines;
  }, [applicationStatus]);

  const renderUploadCard = (): ReactNode => {
    if (!mayUploadNextVersion) {
      const identityNote =
        typeof sessionUserId === `string` && sessionUserId === applicantId
          ? null
          : (
              <p className="mt-2">
                Only the applicant account can upload attachments to this case.
              </p>
            );

      return (
        <div className="mb-6 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground">
          {uploadHints}
          {identityNote}
        </div>
      );
    }

    return (
      <div className="mb-6 rounded-lg border border-dashed border-border bg-muted/10 p-4">
        <p className="text-xs font-medium text-foreground">New version upload</p>
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={groupKeyInputId} className="text-xs">
              Document group (optional)
            </Label>
            <Input
              id={groupKeyInputId}
              placeholder={`e.g. id_document — same group creates a numbered version`}
              value={draftGroupKey}
              onChange={(event) => setDraftGroupKey(event.target.value)}
            />
          </div>
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            className="sr-only"
            onChange={(event) => void submitFile(event.target.files)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploadMutation.isPending}
              onClick={onPickFile}
            >
              {uploadMutation.isPending ? `Uploading…` : `Choose file`}
            </Button>
            <p className="text-xs text-muted-foreground">
              Max 5 MB per file.
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <>
        <p className="text-sm text-muted-foreground">Loading documents…</p>
      </>
    );
  }

  if (errorMessage) {
    return (
      <>
        {renderUploadCard()}
        <p className="text-sm text-destructive">{errorMessage}</p>
      </>
    );
  }

  const showDocs = (): ReactNode => {
    if (!grouped.length) {
      return (
        <>
          <p className="text-sm text-muted-foreground">
            No documents uploaded for this application yet.
          </p>
        </>
      );
    }

    return (
      <div className="space-y-8">
        {grouped.map(({ groupKey, rows }) => {
          const title =
            groupKey === null || groupKey === ``
              ? `Ungrouped uploads`
              : groupKey;
          const currentOrdered = [...rows.filter((r) => r.is_current)].sort(
            (a, b) => b.version - a.version,
          );

          const historyOlder = [...rows.filter((r) => !r.is_current)].sort(
            (a, b) => b.version - a.version,
          );

          return (
            <section key={`${title}:${groupKey ?? `null`}`} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Current version
                  </p>
                  {currentOrdered.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No current version flagged in this group.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border rounded-lg border-2 border-emerald-500/40 bg-emerald-950/[0.04] shadow-sm dark:bg-emerald-500/10">
                      {currentOrdered.map((d) => (
                        <li
                          key={d.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                        >
                          <span className="font-medium text-foreground">
                            {d.original_name}
                          </span>
                          <span
                            className={cn(
                              `shrink-0 rounded-full border border-emerald-600/30 bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-50`,
                            )}
                          >
                            Current · v{d.version}
                          </span>
                          <span className="w-full shrink-0 text-xs text-muted-foreground sm:w-auto">
                            {formatBytes(d.size_bytes)} · {d.mime_type}
                          </span>
                          {mayDownloadDocuments ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              className="shrink-0"
                              disabled={downloadBusyId === d.id}
                              onClick={() => void onDownload(d)}
                            >
                              {downloadBusyId === d.id ? `Downloading…` : `Download`}
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  {historyOlder.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No superseded uploads in this group — only the{' '}
                      <span className="font-semibold text-foreground">Current</span>{' '}
                      row is listed above.
                    </p>
                  ) : (
                    <details className="group rounded-lg border border-border bg-muted/10">
                      <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                        <span className="inline-flex items-center gap-2">
                          <span
                            aria-hidden
                            className="inline-block size-0 border-y-[0.28rem] border-l-[0.45rem] border-y-transparent border-l-muted-foreground transition-transform group-open:rotate-90"
                          />
                          Superseded history ({historyOlder.length})
                        </span>
                      </summary>
                      <ul className="divide-y divide-border border-t border-border">
                        {historyOlder.map((d) => (
                          <li
                            key={d.id}
                            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm text-muted-foreground"
                          >
                            <span>{d.original_name}</span>
                            <span className="text-xs">
                              v{d.version} · {formatBytes(d.size_bytes)}
                            </span>
                            {mayDownloadDocuments ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                className="shrink-0 text-foreground"
                                disabled={downloadBusyId === d.id}
                                onClick={() => void onDownload(d)}
                              >
                                {downloadBusyId === d.id ? `…` : `Download`}
                              </Button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      {renderUploadCard()}
      {showDocs()}
    </div>
  );
}
