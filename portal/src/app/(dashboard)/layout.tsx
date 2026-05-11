import { DashboardShell } from "@/components/layout/dashboard-shell";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default async function DashboardRouteGroupLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login`);
  }

  return <DashboardShell>{children}</DashboardShell>;
}
