"use client";

import { actorHasAllTokens, actorHasAnyToken } from "@/lib/permissions";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";

type PermissionGuardClientProps = {
  children: ReactNode;
  anyOf?: readonly string[];
  allOf?: readonly string[];
  fallback?: ReactNode;
  loading?: ReactNode;
};

export function PermissionGuardClient({
  children,
  anyOf,
  allOf,
  fallback = null,
  loading = null,
}: PermissionGuardClientProps) {
  const { status, data } = useSession();
  const tokens = data?.user?.permissions;

  if (status === `loading`) {
    return loading;
  }

  const hasAny = anyOf !== undefined;
  const hasAll = allOf !== undefined;
  if (!hasAny && !hasAll) {
    return children;
  }

  const okAny = hasAny ? actorHasAnyToken(tokens, anyOf) : true;
  const okAll = hasAll ? actorHasAllTokens(tokens, allOf) : true;

  if (okAny && okAll) {
    return children;
  }

  return fallback;
}
