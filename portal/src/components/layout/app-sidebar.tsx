"use client";

import {
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Shield,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import routes from "@/constants/routeNames";
import { actorHasAnyToken, NAV_PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match: readonly string[];
};

const navItems: NavItem[] = [
  {
    href: routes.dashboard.url,
    label: routes.dashboard.label,
    icon: LayoutDashboard,
    match: [],
  },
  {
    href: routes.applications.url,
    label: routes.applications.label,
    icon: FolderKanban,
    match: [],
  },
  {
    href: routes.newApplication.url,
    label: routes.newApplication.label,
    icon: UserPlus,
    match: NAV_PERMISSIONS.newApplication,
  },
  {
    href: routes.staffReview.url,
    label: routes.staffReview.label,
    icon: ClipboardList,
    match: NAV_PERMISSIONS.staffReviewQueue,
  },
  {
    href: routes.admin.url,
    label: routes.admin.label,
    icon: Shield,
    match: NAV_PERMISSIONS.adminDashboard,
  },
];

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { data } = useSession();
  const tokens = data?.user?.permissions;

  const visible = navItems.filter(
    (item) =>
      item.match.length === 0 || actorHasAnyToken(tokens, item.match),
  );

  return (
    <aside
      className={cn(
        `flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground`,
        className,
      )}
    >
      <div className="border-b border-sidebar-border px-5 py-6">
        <p className="sr-only">BNR Licensing Portal</p>
        <p className="text-xs font-semibold uppercase tracking-widest text-sidebar-foreground/55">
          BNR Licensing
        </p>
        <p className="mt-1 text-lg font-semibold text-sidebar-foreground">
          Portal
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {visible.map((item) => {
          const active =
            item.href === routes.dashboard.url
              ? pathname === routes.dashboard.url
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors`,
                active
                  ? `bg-sidebar-accent text-sidebar-accent-foreground`
                  : `text-sidebar-foreground/80 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground`,
              )}
            >
              <Icon className="size-4 shrink-0 opacity-90" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="mb-3 truncate rounded-lg bg-sidebar-accent px-3 py-2 text-xs text-sidebar-foreground/80">
          <p className="font-medium text-sidebar-foreground">
            {data?.user?.email}
          </p>
          {actorHasAnyToken(tokens, NAV_PERMISSIONS.adminDashboard) ? (
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-sidebar-foreground/50">
              Administrator
            </p>
          ) : null}
        </div>
        <Button
          variant="outline"
          className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent"
          type="button"
          onClick={() => void signOut({ callbackUrl: routes.login.url })}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
