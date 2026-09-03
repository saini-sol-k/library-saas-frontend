import { NextResponse } from "next/server";
import { COOKIE, env } from "@/lib/env";
import type { ApiResponse, LoginResponse } from "@/types/api";

/**
 * Exchanges credentials for tokens on the server and stores them in httpOnly
 * cookies. The access token is never returned to the browser, so no script on
 * the page - including a third-party one - can read it.
 */
export async function POST(request: Request) {
  let body: { identifier?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request body.", data: null, errorCode: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  if (!body.identifier || !body.password) {
    return NextResponse.json(
      {
        success: false,
        message: "Enter your username and password.",
        data: null,
        errorCode: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${env.backendUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: body.identifier, password: body.password }),
      cache: "no-store",
    });
  } catch {
    // The backend being unreachable is an operational problem, not a credential one.
    return NextResponse.json(
      {
        success: false,
        message: "Cannot reach the server. Check that the backend is running.",
        data: null,
        errorCode: "BACKEND_UNREACHABLE",
      },
      { status: 502 },
    );
  }

  const payload = (await upstream.json().catch(() => null)) as ApiResponse<LoginResponse> | null;

  if (!upstream.ok || !payload?.success || !payload.data?.accessToken) {
    return NextResponse.json(
      payload ?? {
        success: false,
        message: "Sign in failed.",
        data: null,
        errorCode: "UNAUTHORIZED",
      },
      { status: upstream.status || 401 },
    );
  }

  const { accessToken, refreshToken, expiresInSec, refreshExpiresInSec } = payload.data;

  // Deliberately no token in the response body.
  const response = NextResponse.json({
    success: true,
    message: payload.message,
    data: null,
    errorCode: null,
  });

  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.isProduction,
    path: "/",
  };

  response.cookies.set(COOKIE.access, accessToken, {
    ...base,
    maxAge: expiresInSec ?? 3600,
  });

  if (refreshToken) {
    response.cookies.set(COOKIE.refresh, refreshToken, {
      ...base,
      maxAge: refreshExpiresInSec ?? 60 * 60 * 24 * 14,
    });
  }

  return response;
}
