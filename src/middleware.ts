import { NextResponse, type NextRequest } from "next/server";
import { COOKIE } from "@/lib/env";

/**
 * Route guard. Presence of a session cookie is enough to render the shell;
 * the backend remains the authority on every individual request, so a stale or
 * forged cookie simply produces 401s that the proxy turns into a sign-in
 * redirect. Nothing security-critical is decided here.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const hasSession =
    Boolean(request.cookies.get(COOKIE.access)?.value) ||
    Boolean(request.cookies.get(COOKIE.refresh)?.value);

  const isLoginPage = pathname === "/login";

  if (!hasSession && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Preserve where the user was heading so sign-in can return them there.
    if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (hasSession && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, the API routes (which do their own auth)
  // and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
