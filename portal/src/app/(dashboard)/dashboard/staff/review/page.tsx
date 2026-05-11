import { ApplicationsPageClient } from "@/components/applications/applications-page-client";
import { PermissionGuardClient } from "@/components/auth/permission-guard-client";
import { ApplicationStatus } from "@/lib/application-domain";
import { NAV_PERMISSIONS } from "@/lib/permissions";

export default function StaffReviewQueuePage() {
  return (
    <PermissionGuardClient
      anyOf={[...NAV_PERMISSIONS.staffReviewQueue]}
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-muted-foreground">
            This section requires staff review permissions.
          </p>
        </div>
      }
    >
      <ApplicationsPageClient
        initialStatusFilter={ApplicationStatus.SUBMITTED}
        pageTitle="Staff review queue"
        pageDescription="Submitted applications awaiting pickup — claim a case to move it into review."
      />
    </PermissionGuardClient>
  );
}
