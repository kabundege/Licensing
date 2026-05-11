"use client";

import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useApplicationTransitionMutation } from "@/hooks/use-applications";
import type { ApplicationDto } from "@/lib/api/applications-types";
import { ApplicationStatus } from "@/lib/application-domain";
import {
  ACTION_LABEL_BY_TARGET,
  getRequiredPermissionForTransition,
  getResubmitLabel,
  VALID_TRANSITIONS,
} from "@/lib/application-transitions";
import { actorHasPermissionPair } from "@/lib/permissions";

const CONFLICT_OF_INTEREST_TOOLTIP = `Conflict of interest: you were the assigned reviewer on this case. Final approval must be issued by a separate approver.`;

export function ApplicationActionFooter({
  application,
}: {
  application: ApplicationDto;
}) {
  const { data: session } = useSession();
  const tokens = session?.user?.permissions;
  const userId = session?.user?.id;
  const mutation = useApplicationTransitionMutation();

  const targets = VALID_TRANSITIONS[application.status] ?? [];
  const actions = targets
    .map((target) => {
      const perm = getRequiredPermissionForTransition(
        application.status,
        target,
      );
      if (!perm) {
        return null;
      }
      if (!actorHasPermissionPair(tokens, perm.resource, perm.action)) {
        return null;
      }
      const label =
        application.status === ApplicationStatus.PENDING_CLARIFICATION &&
        target === ApplicationStatus.UNDER_REVIEW
          ? getResubmitLabel()
          : (ACTION_LABEL_BY_TARGET[target] ?? `Move to ${target}`);
      const isApprove = target === ApplicationStatus.APPROVED;
      const conflictOfInterestLocked =
        isApprove &&
        Boolean(userId) &&
        application.reviewer_id !== null &&
        application.reviewer_id === userId;
      return {
        target,
        label,
        isApprove,
        conflictOfInterestLocked,
      };
    })
    .filter(Boolean) as {
    target: ApplicationStatus;
    label: string;
    isApprove: boolean;
    conflictOfInterestLocked: boolean;
  }[];

  const blockedApprove = actions.find(
    (a) => a.conflictOfInterestLocked,
  );

  if (!actions.length) {
    return null;
  }

  return (
    <footer className="sticky bottom-0 z-10 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        {blockedApprove ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-50"
          >
            <p className="font-semibold">Conflict of interest guard</p>
            <p className="mt-1 text-amber-950/90 dark:text-amber-100">
              You match the assigned reviewer (
              <span className="font-mono">{application.reviewer_id}</span>).
              The Approve action is disabled — final sign-off must come from
              someone who was not the reviewing officer on this file.
            </p>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {actions.map((a) => {
            const busy = mutation.isPending;
            if (a.isApprove && a.conflictOfInterestLocked) {
              return (
                <Tooltip key={a.target}>
                  <TooltipTrigger
                    render={(triggerProps) => (
                      <span {...triggerProps} className="inline-flex">
                        <Button type="button" size="sm" disabled variant="default">
                          {a.label}
                        </Button>
                      </span>
                    )}
                  />
                  <TooltipContent>{CONFLICT_OF_INTEREST_TOOLTIP}</TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Button
                key={a.target}
                type="button"
                size="sm"
                variant={
                  a.target === ApplicationStatus.REJECTED
                    ? `destructive`
                    : `default`
                }
                disabled={busy}
                onClick={() =>
                  mutation.mutate({
                    applicationId: application.id,
                    body: {
                      targetStatus: a.target,
                      expectedVersion: application.version,
                    },
                  })
                }
              >
                {a.label}
              </Button>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
