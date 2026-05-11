"use client";

import { humanReadableAuditDescription } from "@/lib/audit-display";
import type { AuditLogDto, ComplianceAuditEntryDto } from "@/lib/api/applications-types";
import { cn } from "@/lib/utils";

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

const timelineItemClass = cn(
  `relative pl-8 before:absolute before:left-[7px] before:top-9 before:h-[calc(100%-0.75rem)] before:w-px last:before:hidden before:bg-border`,
);

const timelineDotClass = cn(
  `absolute left-0 top-1.5 size-4 rounded-full border-2 border-primary/50 bg-primary/20 shadow-sm ring-2 ring-background`,
);

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
      <ol className="relative mt-1 list-none">
        {chronological.map((entry, index) => (
          <li
            key={entry.id}
            className={timelineItemClass}
          >
            <div className={timelineDotClass} aria-hidden />
            <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
              {formatTs(entry.timestamp)}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {entry.action_label}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {entry.actor.name} · {entry.actor.role}
            </p>
            {index === chronological.length - 1 ? (
              <span className="mt-2 inline-block text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                Latest
              </span>
            ) : null}
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
    <ol className="relative mt-1 list-none">
      {chronological.map((entry, index) => (
        <li key={entry.id} className={timelineItemClass}>
          <div className={timelineDotClass} aria-hidden />
          <p className="text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
            {formatTs(entry.timestamp)}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {humanReadableAuditDescription(entry)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Actor {entry.actor_id}
          </p>
          {index === chronological.length - 1 ? (
            <span className="mt-2 inline-block text-[0.65rem] uppercase tracking-wider text-muted-foreground">
              Latest
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
