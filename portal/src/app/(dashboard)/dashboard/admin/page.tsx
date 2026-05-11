import { PermissionGuard } from "@/components/auth/permission-guard";
import { NAV_PERMISSIONS } from "@/lib/permissions";

export default function AdminDashboardPage() {
  return (
    <PermissionGuard
      anyOf={NAV_PERMISSIONS.adminDashboard}
      fallback={
        <p className="text-muted-foreground">You do not have access to admin tools.</p>
      }
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">
          Admin dashboard
        </h1>
        <p className="text-muted-foreground">
          User management and system configuration will be integrated with{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-sm text-foreground">
            manage_users
          </code>
          .
        </p>
      </div>
    </PermissionGuard>
  );
}
