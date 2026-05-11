import { AdminDashboardClient } from "@/components/admin/admin-dashboard-client";
import { PermissionGuard } from "@/components/auth/permission-guard";
import { NAV_PERMISSIONS } from "@/lib/permissions";

export default function AdminDashboardPage() {
  return (
    <PermissionGuard
      anyOf={[...NAV_PERMISSIONS.adminPortalAccess]}
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-8">
          <p className="text-muted-foreground">You do not have access to administration tools.</p>
        </div>
      }
    >
      <AdminDashboardClient />
    </PermissionGuard>
  );
}
