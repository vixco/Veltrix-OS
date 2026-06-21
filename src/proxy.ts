import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "pb_auth";

// Veltrix OS defaults to a local guest session, so we never force a redirect
// to /login. The only server-side routing rule here is sending already-signed-in
// cloud users away from the login page.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE)?.value;

  if (token && pathname === "/login") {
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/projects/:path*", "/shared/:path*"],
};
