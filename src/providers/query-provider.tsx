"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { ApiError, messageFor } from "@/lib/api-error";

/**
 * TanStack Query with one shared policy for auth failures:
 *  401 -> the session is over, send the user to sign in
 *  403 -> they are signed in but not permitted; say so rather than bouncing them
 * Neither is retried, because retrying an authorization failure never helps.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleAuthError = React.useCallback(
    (error: unknown) => {
      if (!(error instanceof ApiError)) return false;

      if (error.status === 401) {
        toast.error("Your session has ended. Please sign in again.");
        router.replace("/login");
        return true;
      }
      if (error.status === 403) {
        toast.error(messageFor(error));
        return true;
      }
      return false;
    },
    [router],
  );

  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
                return false;
              }
              return failureCount < 2;
            },
          },
          mutations: { retry: false },
        },
      }),
  );

  // Attach the shared handler once the router is available.
  React.useEffect(() => {
    const queryCache = client.getQueryCache();
    const mutationCache = client.getMutationCache();

    const unsubQuery = queryCache.subscribe((event) => {
      if (event.type === "updated" && event.query.state.status === "error") {
        handleAuthError(event.query.state.error);
      }
    });
    const unsubMutation = mutationCache.subscribe((event) => {
      if (event.type === "updated" && event.mutation?.state.status === "error") {
        handleAuthError(event.mutation.state.error);
      }
    });

    return () => {
      unsubQuery();
      unsubMutation();
    };
  }, [client, handleAuthError]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
