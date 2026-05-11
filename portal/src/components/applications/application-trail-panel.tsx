"use client";

import { humanReadableAuditDescription } from "@/lib/audit-display";
import type { AuditLogDto, ComplianceAuditEntryDto } from "@/lib/api/applications-types";

const formatTs = (iso: string): string => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: `medium`,
      timeStyle: `short`,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

export function ApplicationTrailPanel({
  mode,
  complianceEntries,
  basicLogs,
  isLoading,
  errorMessage,
}: {
  mode: `compliance` | `basic`;
  complianceEntries: ComplianceAuditEntryDto[] | undefined;
  basicLogs: AuditLogDto[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
}) {
  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading audit trail…</p>
    );
  }
  if (errorMessage) {
    return <p className="text-sm text-destructive">{errorMessage}</p>;
  }

  if (mode === `compliance`) {
    const chronological = [...(complianceEntries ?? [])].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    if (!chronological.length) {
      return (
        <p className="text-sm text-muted-foreground">
          No compliance audit entries for this application.
        </p>
      );
    }
    return (
      <ol className="relative border-l border-border">
        {chronological.map((entry) => (
          <li key={entry.id} className="mb-6 ml-4">
            <div className="absolute -left-1.5 mt-1.5 size-3 rounded-full border border-border bg-background" />
            <p className="text-xs text-muted-foreground">
              {formatTs(entry.timestamp)}
            </p>
            <p className="text-sm font-medium text-foreground">
              {entry.action_label}
            </p>
            <p className="text-xs text-muted-foreground">
              {entry.actor.name} · {entry.actor.role}
            </p>
          </li>
        ))}
      </ol>
    );
  }

  const chronological = [...(basicLogs ?? [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  if (!chronological.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No audit events recorded yet.
      </p>
    );
  }

  return (
    <ol className="relative border-l border-border">
      {chronological.map((entry) => (
        <li key={entry.id} className="mb-6 ml-4">
          <div className="absolute -left-1.5 mt-1.5 size-3 rounded-full border border-border bg-background" />
          <p className="text-xs text-muted-foreground">
            {formatTs(entry.timestamp)}
          </p>
          <p className="text-sm font-medium text-foreground">
            {humanReadableAuditDescription(entry)}
          </p>
          <p className="text-xs text-muted-foreground">Actor {entry.actor_id}</p>
        </li>
      ))}
    </ol>
  );
}
