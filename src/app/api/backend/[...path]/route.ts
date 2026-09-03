import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE, env } from "@/lib/env";
import type { ApiResponse, LoginResponse } from "@/types/api";

/**
 * Authenticated proxy to the Spring Boot API.
 *
 * Every browser call goes to this app's own origin, which means:
 *  - the access token stays in an httpOnly cookie and never reaches page script
 *  - there is no cross-origin request, so the backend's CORS allow-list does not
 *    need to name this app at all
 *
 * On a 401 the refresh token is used once to mint a new access token, and the
 * original request is replayed. If that fails the cookies are cleared and the
 * 401 is returned so the client can send the user back to sign in.
 */

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

async function callBackend(
  request: Request,
  targetUrl: string,
  accessToken: string,
  libraryId: string | undefined,
  body: string | undefined,
) {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== "cookie") {
      headers.set(key, value);
    }
  });
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Accept", "application/json");

  // Tenant hint only. The backend resolves the tenant from the user's own
  // memberships first and treats this header purely as a fallback, so it can
  // never widen access.
  if (libraryId) headers.set("X-Library-Id", libraryId);

  return fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
    redirect: "manual",
  });
}

async function refreshAccessToken(refreshToken: string): Promise<LoginResponse | null> {
  try {
    const res = await fetch(`${env.backendUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as ApiResponse<LoginResponse>;
    return payload.success && payload.data?.accessToken ? payload.data : null;
  } catch {
    return null;
  }
}

async function handle(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const jar = await cookies();

  const accessToken = jar.get(COOKIE.access)?.value;
  const refreshToken = jar.get(COOKIE.refresh)?.value;
  const libraryId = jar.get(COOKIE.library)?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json(
      {
        success: false,
        message: "Your session has ended. Please sign in again.",
        data: null,
        errorCode: "UNAUTHORIZED",
      },
      { status: 401 },
    );
  }

  const search = new URL(request.url).search;
  const targetUrl = `${env.backendUrl}/api/${path.map(encodeURIComponent).join("/")}${search}`;

  // Read the body once so it can be replayed after a refresh.
  const body =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();

  let upstream: Response;
  try {
    upstream = await callBackend(request, targetUrl, accessToken ?? "", libraryId, body);
  } catch {
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

  let rotated: LoginResponse | null = null;

  if (upstream.status === 401 && refreshToken) {
    rotated = await refreshAccessToken(refreshToken);
    if (rotated) {
      try {
        upstream = await callBackend(request, targetUrl, rotated.accessToken, libraryId, body);
      } catch {
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
    }
  }

  const text = await upstream.text();
  const response = new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });

  const cookieBase = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.isProduction,
    path: "/",
  };

  if (rotated) {
    response.cookies.set(COOKIE.access, rotated.accessToken, {
      ...cookieBase,
      maxAge: rotated.expiresInSec ?? 3600,
    });
    if (rotated.refreshToken) {
      response.cookies.set(COOKIE.refresh, rotated.refreshToken, {
        ...cookieBase,
        maxAge: rotated.refreshExpiresInSec ?? 60 * 60 * 24 * 14,
      });
    }
  }

  // Still unauthorised after a refresh attempt: the session is genuinely over.
  if (upstream.status === 401) {
    for (const name of [COOKIE.access, COOKIE.refresh]) {
      response.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
  }

  return response;
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
