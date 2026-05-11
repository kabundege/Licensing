import { PermissionGuard } from "@/components/auth/permission-guard";
import { NAV_PERMISSIONS } from "@/lib/permissions";

export default function NewApplicationPage() {
  return (
    <PermissionGuard
      anyOf={NAV_PERMISSIONS.newApplication}
      fallback={
        <p className="text-muted-foreground">You do not have access to this area.</p>
      }
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">
          New application
        </h1>
        <p className="text-muted-foreground">
          Application intake UI will live here. You have{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-sm text-foreground">
            application:submit
          </code>{" "}
          or{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-sm text-foreground">
            application:create
          </code>
          .
        </p>
      </div>
    </PermissionGuard>
  );
}
