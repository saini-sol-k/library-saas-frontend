"use client";

import { Building2, Library as LibraryIcon } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { AddressPanel } from "@/features/addresses/address-panel";
import { MemberPanel } from "@/features/memberships/member-panel";
import { SeatCountPanel } from "@/features/seats/seat-count-panel";
import { useMembers } from "@/hooks/use-memberships";
import { PageHeader } from "@/layouts/app-shell";
import { AVAILABLE_APIS } from "@/lib/api-gaps";
import { useSession } from "@/providers/session-provider";

/**
 * Settings shows the real tenant hierarchy the signed-in user belongs to.
 * Both lists come from the backend and are already scoped to the user's own
 * memberships, so nothing here is hard-coded to a single library.
 */
export default function SettingsPage() {
  const {
    organizations,
    libraries,
    activeLibrary,
    activeOrganization,
    setActiveLibrary,
    tenantLoading,
    authorities,
    can,
    username,
  } = useSession();

  // Library membership is constrained to members of the owning organization, so
  // the organization member list doubles as the candidate list for a library.
  // Only fetched when the user may actually read it.
  const canViewMembers = can("USER_VIEW");
  const orgMembers = useMembers(
    "organizations",
    canViewMembers ? (activeOrganization?.organizationId ?? null) : null,
  );

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your organizations, libraries and access, as returned by the backend."
      />

      {tenantLoading ? (
        <LoadingState label="Loading your tenants…" />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organizations</CardTitle>
            </CardHeader>
            {organizations.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No organizations"
                description="Your account is not an active member of any organization."
              />
            ) : (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <Th>Code</Th>
                      <Th>Name</Th>
                      <Th>Email</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map((org) => (
                      <Tr key={org.organizationId}>
                        <Td className="font-mono text-[13px] text-ink">{org.organizationCode}</Td>
                        <Td className="font-medium text-ink">{org.name}</Td>
                        <Td>{org.email || "—"}</Td>
                        <Td>
                          <StatusBadge status={org.status} />
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Libraries / Branches</CardTitle>
            </CardHeader>
            {libraries.length === 0 ? (
              <EmptyState
                icon={LibraryIcon}
                title="No libraries"
                description="Your account is not an active member of any library."
              />
            ) : (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <Th>Code</Th>
                      <Th>Name</Th>
                      <Th>Hours</Th>
                      <Th className="text-right">Seats</Th>
                      <Th>Currency</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Active</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {libraries.map((library) => (
                      <Tr key={library.libraryId}>
                        <Td className="font-mono text-[13px] text-ink">{library.libraryCode}</Td>
                        <Td className="font-medium text-ink">{library.name}</Td>
                        <Td>
                          {library.openingTime && library.closingTime
                            ? `${library.openingTime} – ${library.closingTime}`
                            : "—"}
                        </Td>
                        <Td className="text-right tabular-nums">{library.seatCount ?? 0}</Td>
                        <Td>{library.currency || "—"}</Td>
                        <Td>
                          <StatusBadge status={library.status} />
                        </Td>
                        <Td className="text-right">
                          {activeLibrary?.libraryId === library.libraryId ? (
                            <Badge tone="brand">Current</Badge>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveLibrary(library.libraryId)}
                              className="text-[13px] font-medium text-brand-600 hover:text-brand-700"
                            >
                              Switch
                            </button>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )}
          </Card>

          {/*
            Seat capacity for the library currently in context. LIBRARY_UPDATE is
            granted only to Super Admin and Organization Owner, so a receptionist,
            accountant, library manager or staff member sees nothing here rather
            than a control that would 403. The backend enforces the same rule and
            additionally requires membership of this library.
          */}
          {can("LIBRARY_UPDATE") && activeLibrary ? (
            <SeatCountPanel library={activeLibrary} />
          ) : null}

          {/*
            Staff membership of a tenant. USER_VIEW/USER_CREATE/USER_UPDATE are
            granted only to Super Admin and Organization Owner, so a
            library-scoped role sees no membership section at all rather than a
            row of controls that would 403.
          */}
          {canViewMembers && activeOrganization ? (
            <MemberPanel
              scope="organizations"
              tenantId={activeOrganization.organizationId}
              title={`${activeOrganization.name} — Members`}
              canManage={can("USER_CREATE") || can("USER_UPDATE")}
              currentUsername={username}
            />
          ) : null}

          {canViewMembers && activeLibrary ? (
            <MemberPanel
              scope="libraries"
              tenantId={activeLibrary.libraryId}
              title={`${activeLibrary.name} — Members`}
              canManage={can("USER_CREATE") || can("USER_UPDATE")}
              candidates={orgMembers.data}
              currentUsername={username}
            />
          ) : null}

          {/*
            Addresses are shown for the tenants the user can actually read.
            Organization visibility is a privilege, so a library-scoped role
            simply does not see that panel rather than being shown a 403.
          */}
          {activeOrganization && can("ORGANIZATION_VIEW") ? (
            <AddressPanel
              owner="organizations"
              ownerId={activeOrganization.organizationId}
              title={`${activeOrganization.name} — Addresses`}
              canEdit={can("ORGANIZATION_UPDATE")}
            />
          ) : null}

          {activeLibrary ? (
            <AddressPanel
              owner="libraries"
              ownerId={activeLibrary.libraryId}
              title={`${activeLibrary.name} — Addresses`}
              canEdit={can("LIBRARY_UPDATE")}
            />
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Permissions</CardTitle>
              </CardHeader>
              <div className="p-5">
                {authorities.length === 0 ? (
                  <p className="text-sm text-ink3">No authorities found on the token.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {authorities.map((authority) => (
                      <Badge
                        key={authority}
                        tone={authority.startsWith("ROLE_") ? "accent" : "neutral"}
                      >
                        {authority}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-[13px] text-ink3">
                  Read from the JWT to decide what to show. The backend re-checks every request, so
                  this only affects the interface.
                </p>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Connected APIs</CardTitle>
              </CardHeader>
              <div className="p-5">
                <ul className="space-y-1.5">
                  {AVAILABLE_APIS.map((api) => (
                    <li key={api} className="font-mono text-[12px] text-ink2">
                      {api}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
