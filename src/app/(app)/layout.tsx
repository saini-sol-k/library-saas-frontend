import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/layouts/app-shell";
import { COOKIE } from "@/lib/env";
import { authoritiesOf, decodeJwt } from "@/lib/jwt";
import { QueryProvider } from "@/providers/query-provider";
import { SessionProvider } from "@/providers/session-provider";

/**
 * Server layout for every authenticated screen. The JWT is read here, on the
 * server, so the token itself never crosses into the client bundle - only the
 * username and the authority list needed to decide what to render.
 */
export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const token = jar.get(COOKIE.access)?.value;
  const claims = token ? decodeJwt(token) : null;

  // A refresh-only session is still valid: the proxy will mint a new access
  // token on the first API call. Only a completely empty session redirects.
  if (!token && !jar.get(COOKIE.refresh)?.value) {
    redirect("/login");
  }

  return (
    <QueryProvider>
      <SessionProvider
        username={claims?.sub ?? "Signed in"}
        authorities={authoritiesOf(claims)}
      >
        <AppShell>{children}</AppShell>
      </SessionProvider>
    </QueryProvider>
  );
}
