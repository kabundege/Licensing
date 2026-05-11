import { PermissionGuardClient } from "@/components/auth/permission-guard-client";
import { NAV_PERMISSIONS } from "@/lib/permissions";

export default function StaffReviewPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">
        Staff review queue
      </h1>
      <PermissionGuardClient
        anyOf={NAV_PERMISSIONS.staffReviewQueue}
        fallback={
          <p className="text-muted-foreground">
            This section requires staff review permissions.
          </p>
        }
      >
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-card-foreground">
            Queue and workflow tools will connect to the licensing API here.
          </p>
        </div>
      </PermissionGuardClient>
    </div>
  );
}
