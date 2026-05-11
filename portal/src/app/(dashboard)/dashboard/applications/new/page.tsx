import { NewApplicationClient } from "@/components/applications/new-application-client";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { NAV_PERMISSIONS } from "@/lib/permissions";

export default function NewApplicationPage() {
  return (
    <PermissionGuard
      anyOf={NAV_PERMISSIONS.newApplication}
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-muted-foreground">You do not have access to this area.</p>
        </div>
      }
    >
      <NewApplicationClient />
    </PermissionGuard>
  );
}
