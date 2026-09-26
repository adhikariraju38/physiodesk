import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps signed out visitors off the app shell and signed in ones off the login
 * page. It reads a cookie that carries no authority of its own, only a flag the
 * api sets alongside the real httponly tokens, so this is a redirect for the
 * sake of the user rather than a security boundary. Every endpoint checks the
 * session itself.
 */
const SESSION_FLAG = "pd_session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = request.cookies.has(SESSION_FLAG);

  if (!signedIn && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (signedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
