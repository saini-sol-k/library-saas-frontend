import type { JwtClaims } from "@/types/api";

/**
 * Reads the claims out of a JWT without verifying it.
 *
 * Verification is the backend's job and it happens on every request; this is
 * only used to render the username and to decide which nav items and buttons to
 * show. Authorization is never enforced here - a tampered token simply gets
 * rejected by Spring Security on the next call.
 */
export function decodeJwt(token: string): JwtClaims | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalised = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalised.padEnd(normalised.length + ((4 - (normalised.length % 4)) % 4), "=");
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

export function isExpired(claims: JwtClaims | null, skewSeconds = 30): boolean {
  if (!claims?.exp) return true;
  return claims.exp * 1000 <= Date.now() + skewSeconds * 1000;
}

/** The backend packs authorities into a single comma-separated "auth" claim. */
export function authoritiesOf(claims: JwtClaims | null): string[] {
  if (!claims?.auth) return [];
  return claims.auth
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
}

export function hasAuthority(authorities: string[], required: string): boolean {
  return authorities.includes("ROLE_SUPER_ADMIN") || authorities.includes(required);
}
