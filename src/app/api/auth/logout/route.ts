import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE, env } from "@/lib/env";

/**
 * Revokes the refresh token server-side, then clears the cookies. The backend
 * cannot revoke an access token before it expires, so the cookie is dropped and
 * the short access-token lifetime does the rest.
 */
export async function POST() {
  const jar = await cookies();
  const refreshToken = jar.get(COOKIE.refresh)?.value;

  if (refreshToken) {
    try {
      await fetch(`${env.backendUrl}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      });
    } catch {
      // Signing out locally must succeed even if the backend is unreachable.
    }
  }

  const response = NextResponse.json({
    success: true,
    message: "Signed out",
    data: null,
    errorCode: null,
  });

  for (const name of [COOKIE.access, COOKIE.refresh, COOKIE.library]) {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }

  return response;
}
