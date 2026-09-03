"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { ApiError } from "@/lib/api-error";
import { authoritiesOf, hasAuthority } from "@/lib/jwt";
import { tenantService } from "@/services/tenant";
import type { LibraryResponse, OrganizationResponse } from "@/types/api";

/**
 * Session and tenant context.
 *
 * The backend has no /api/auth/me, so identity comes from the JWT claims that
 * the server exposes through /api/session, and the tenant list comes from the
 * organization and library endpoints - both of which already return only what
 * the signed-in user is an active member of.
 */
interface SessionValue {
  username: string;
  authorities: string[];
  can: (authority: string) => boolean;
  organizations: OrganizationResponse[];
  libraries: LibraryResponse[];
  activeLibrary: LibraryResponse | null;
  activeOrganization: OrganizationResponse | null;
  setActiveLibrary: (libraryId: number) => void;
  tenantLoading: boolean;
}

const SessionContext = React.createContext<SessionValue | null>(null);

export function SessionProvider({
  username,
  authorities,
  children,
}: {
  username: string;
  authorities: string[];
  children: React.ReactNode;
}) {
  const [selectedLibraryId, setSelectedLibraryId] = React.useState<number | null>(null);

  // Organization visibility is a privilege: a library-scoped role such as
  // LIBRARY_MANAGER legitimately gets 403 here. That is not an error the user
  // needs to see, so it is swallowed and the app runs library-scoped. Any other
  // failure still propagates.
  const organizationsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      try {
        return await tenantService.listOrganizations();
      } catch (error) {
        if (error instanceof ApiError && error.status === 403) return [];
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const librariesQuery = useQuery({
    queryKey: ["libraries"],
    queryFn: () => tenantService.listLibraries(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const libraries = React.useMemo(() => librariesQuery.data ?? [], [librariesQuery.data]);
  const organizations = React.useMemo(
    () => organizationsQuery.data ?? [],
    [organizationsQuery.data],
  );

  // Derived, not synced: with nothing selected the active library is simply the
  // first one the user can see. Never hard-coded to a particular library.
  const activeLibraryId = selectedLibraryId ?? libraries[0]?.libraryId ?? null;

  const setActiveLibrary = React.useCallback((libraryId: number) => {
    setSelectedLibraryId(libraryId);
    // Non-sensitive hint the proxy forwards as X-Library-Id. The backend still
    // resolves the tenant from the user's memberships, so this cannot widen access.
    document.cookie = `aklib_lib=${libraryId}; path=/; samesite=lax`;
  }, []);

  const activeLibrary = libraries.find((l) => l.libraryId === activeLibraryId) ?? null;
  const activeOrganization =
    organizations.find((o) => o.organizationId === activeLibrary?.organizationId) ??
    organizations[0] ??
    null;

  const value = React.useMemo<SessionValue>(
    () => ({
      username,
      authorities,
      can: (authority: string) => hasAuthority(authorities, authority),
      organizations,
      libraries,
      activeLibrary,
      activeOrganization,
      setActiveLibrary,
      tenantLoading: organizationsQuery.isLoading || librariesQuery.isLoading,
    }),
    [
      username,
      authorities,
      organizations,
      libraries,
      activeLibrary,
      activeOrganization,
      setActiveLibrary,
      organizationsQuery.isLoading,
      librariesQuery.isLoading,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const context = React.useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}

export { authoritiesOf };
