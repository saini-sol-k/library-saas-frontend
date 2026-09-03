/**
 * Server-side configuration. The backend URL is never shipped to the browser:
 * all API traffic goes through this app's own /api/backend proxy.
 */
export const env = {
  /** Spring Boot base URL, e.g. http://localhost:8095 */
  backendUrl: (process.env.BACKEND_API_URL ?? "http://localhost:8095").replace(/\/+$/, ""),
  /** Cookies are only marked Secure in production, so http://localhost works in dev. */
  isProduction: process.env.NODE_ENV === "production",
} as const;

export const COOKIE = {
  access: "aklib_at",
  refresh: "aklib_rt",
  /** Non-sensitive: which library the user is currently working in. */
  library: "aklib_lib",
} as const;
