import { auth } from "@/auth";
import { actorHasAllTokens, actorHasAnyToken } from "@/lib/permissions";
import type { ReactNode } from "react";

type PermissionGuardProps = {
  children: ReactNode;
  anyOf?: readonly string[];
  allOf?: readonly string[];
  fallback?: ReactNode;
};

export async function PermissionGuard({
  children,
  anyOf,
  allOf,
  fallback = null,
}: PermissionGuardProps) {
  const hasAny = anyOf !== undefined;
  const hasAll = allOf !== undefined;
  if (!hasAny && !hasAll) {
    return children;
  }

  const session = await auth();
  const tokens = session?.user?.permissions;

  const okAny = hasAny ? actorHasAnyToken(tokens, anyOf) : true;
  const okAll = hasAll ? actorHasAllTokens(tokens, allOf) : true;

  if (okAny && okAll) {
    return children;
  }

  return fallback;
}
