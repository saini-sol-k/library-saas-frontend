"use client";

import { Building2, Library as LibraryIcon } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { PageHeader } from "@/layouts/app-shell";
import { AVAILABLE_APIS } from "@/lib/api-gaps";
import { useSession } from "@/providers/session-provider";

/**
 * Settings shows the real tenant hierarchy the signed-in user belongs to.
 * Both lists come from the backend and are already scoped to the user's own
 * memberships, so nothing here is hard-coded to a single library.
 */
export default function SettingsPage() {
  const { organizations, libraries, activeLibrary, setActiveLibrary, tenantLoading, authorities } =
    useSession();

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
