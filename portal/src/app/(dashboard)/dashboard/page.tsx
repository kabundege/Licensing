import { auth } from "@/auth";
import { PermissionGuard } from "@/components/auth/permission-guard";
import routes from "@/constants/routeNames";
import { NAV_PERMISSIONS } from "@/lib/permissions";
import Link from "next/link";

export default async function DashboardHomePage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="mt-2 text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">
            {session?.user?.email}
          </span>
          .
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-card-foreground">Quick links</h2>
        <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
          <PermissionGuard
            anyOf={NAV_PERMISSIONS.newApplication}
            fallback={null}
          >
            <li>
              <Link
                className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
                href={routes.newApplication.url}
              >
                Start a new application
              </Link>
            </li>
          </PermissionGuard>
          <PermissionGuard
            anyOf={NAV_PERMISSIONS.staffReviewQueue}
            fallback={null}
          >
            <li>
              <Link
                className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
                href={routes.staffReview.url}
              >
                Open staff review queue
              </Link>
            </li>
          </PermissionGuard>
          <PermissionGuard
            anyOf={NAV_PERMISSIONS.adminPortalAccess}
            fallback={null}
          >
            <li>
              <Link
                className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
                href={routes.admin.url}
              >
                Admin dashboard
              </Link>
            </li>
          </PermissionGuard>
        </ul>
      </div>
    </div>
  );
}
