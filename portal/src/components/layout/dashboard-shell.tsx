import type { ReactNode } from "react";

import { AppSidebar } from "@/components/layout/app-sidebar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="flex min-h-0 flex-1 flex-col">
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
