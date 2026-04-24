import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LinkedAthleteData } from "./generated/api.schemas";
import { customFetch } from "./custom-fetch";

export const getLinkedAthleteQueryKey = () =>
  ["/api/profiles/me/linked-athlete"] as const;

export function useGetLinkedAthlete(options?: {
  query?: { enabled?: boolean };
}) {
  return useQuery({
    queryKey: getLinkedAthleteQueryKey(),
    queryFn: () =>
      customFetch<LinkedAthleteData | null>("/api/profiles/me/linked-athlete", {
        method: "GET",
      }),
    enabled: options?.query?.enabled,
  });
}

export function useLinkMyAthlete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ playerId }: { playerId: number | null }) =>
      customFetch<{ linkedPlayerId: number | null }>(
        "/api/profiles/me/linked-athlete",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId }),
        }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: getLinkedAthleteQueryKey() });
      qc.invalidateQueries({ queryKey: ["/api/profiles/me"] });
    },
  });
}
