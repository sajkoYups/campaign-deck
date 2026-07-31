import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/campaigns") ||
    pathname.startsWith("/links") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/no-workspace");

  if (isProtected && !sessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (
    (pathname.startsWith("/login") || pathname.startsWith("/register")) &&
    sessionCookie
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clients/:path*",
    "/campaigns/:path*",
    "/links/:path*",
    "/settings/:path*",
    "/onboarding",
    "/no-workspace",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/invite/:path*",
  ],
};
