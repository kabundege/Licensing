import { auth } from "@/auth";
import routes from "@/constants/routeNames";
import {
  actorHasAnyToken,
  MIDDLEWARE_RULES,
} from "@/lib/permissions";
import { NextResponse } from "next/server";

const loginPath = routes.login.url;
const registerPath = routes.register.url;

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const perms = session?.user?.permissions;

  const isLoginRoute =
    pathname === loginPath || pathname.startsWith(`${loginPath}/`);
  const isRegisterRoute =
    pathname === registerPath || pathname.startsWith(`${registerPath}/`);
  const isGuestAuthRoute = isLoginRoute || isRegisterRoute;
  const isAuthed = Boolean(session?.user);

  if (isGuestAuthRoute && isAuthed) {
    return NextResponse.redirect(new URL(routes.dashboard.url, req.url));
  }

  if (pathname.startsWith(`/dashboard`) && !isAuthed) {
    const loginUrl = new URL(loginPath, req.url);
    loginUrl.searchParams.set(`callbackUrl`, pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith(`/dashboard/staff`)) {
    if (!actorHasAnyToken(perms, MIDDLEWARE_RULES.staffArea)) {
      return NextResponse.redirect(new URL(`/dashboard`, req.url));
    }
  }

  if (pathname.startsWith(`/dashboard/admin`)) {
    if (!actorHasAnyToken(perms, MIDDLEWARE_RULES.adminArea)) {
      return NextResponse.redirect(new URL(`/dashboard`, req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [`/((?!api|_next/static|_next/image|favicon.ico).*)`],
};
