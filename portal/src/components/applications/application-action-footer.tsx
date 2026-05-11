"use client";

import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ApplicationDto } from "@/lib/api/applications-types";
import { actorHasPermissionPair } from "@/lib/permissions";
import { ApplicationStatus } from "@/lib/application-domain";
import {
  ACTION_LABEL_BY_TARGET,
  getRequiredPermissionForTransition,
  getResubmitLabel,
  VALID_TRANSITIONS,
} from "@/lib/application-transitions";
import { useApplicationStatusMutation } from "@/hooks/use-applications";

const REVIEWER_APPROVAL_TOOLTIP = `Separation of duties: the assigned reviewer cannot grant final approval on the same application.`;

export function ApplicationActionFooter({
  application,
}: {
  application: ApplicationDto;
}) {
  const { data: session } = useSession();
  const tokens = session?.user?.permissions;
  const userId = session?.user?.id;
  const mutation = useApplicationStatusMutation(application.id);

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
      const disabledByReviewerRule =
        isApprove &&
        Boolean(userId) &&
        application.reviewer_id !== null &&
        application.reviewer_id === userId;
      return {
        target,
        label,
        isApprove,
        disabledByReviewerRule,
      };
    })
    .filter(Boolean) as {
    target: ApplicationStatus;
    label: string;
    isApprove: boolean;
    disabledByReviewerRule: boolean;
  }[];

  if (!actions.length) {
    return null;
  }

  return (
    <footer className="sticky bottom-0 z-10 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-2">
        {actions.map((a) => {
          const busy = mutation.isPending;
          if (a.isApprove && a.disabledByReviewerRule) {
            return (
              <Tooltip key={a.target}>
                <TooltipTrigger
                  render={(props) => (
                    <span {...props} className="inline-flex">
                      <Button type="button" size="sm" disabled variant="default">
                        {a.label}
                      </Button>
                    </span>
                  )}
                />
                <TooltipContent>{REVIEWER_APPROVAL_TOOLTIP}</TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Button
              key={a.target}
              type="button"
              size="sm"
              variant={a.target === ApplicationStatus.REJECTED ? `destructive` : `default`}
              disabled={busy}
              onClick={() =>
                mutation.mutate({
                  targetStatus: a.target,
                  expectedVersion: application.version,
                })
              }
            >
              {a.label}
            </Button>
          );
        })}
      </div>
    </footer>
  );
}
