"use client";

import { useMemo } from "react";

import type { DocumentDto } from "@/lib/api/applications-types";

const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

export function ApplicationDocumentsPanel({
  documents,
  isLoading,
  errorMessage,
}: {
  documents: DocumentDto[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
}) {
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

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading documents…</p>
    );
  }
  if (errorMessage) {
    return <p className="text-sm text-destructive">{errorMessage}</p>;
  }
  if (!grouped.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No documents uploaded for this application yet.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {grouped.map(({ groupKey, rows }) => {
        const title =
          groupKey === null || groupKey === ``
            ? `Ungrouped uploads`
            : groupKey;
        const current = rows.filter((r) => r.is_current);
        const history = rows.filter((r) => !r.is_current);
        return (
          <section key={title} className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Current
                </p>
                {current.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No current version flagged.
                  </p>
                ) : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {current.map((d) => (
                      <li
                        key={d.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-foreground">
                          {d.original_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          v{d.version} · {formatBytes(d.size_bytes)} ·{" "}
                          {d.mime_type}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {history.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Version history
                  </p>
                  <ul className="divide-y divide-border rounded-lg border border-border bg-muted/20">
                    {history.map((d) => (
                      <li
                        key={d.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm text-muted-foreground"
                      >
                        <span>{d.original_name}</span>
                        <span className="text-xs">
                          v{d.version}
                          {d.is_current ? ` · current` : ``} ·{" "}
                          {formatBytes(d.size_bytes)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
