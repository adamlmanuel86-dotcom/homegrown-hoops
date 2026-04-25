import { useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { PlayerStats } from "./generated/api.schemas";

export interface PlayerSeasons {
  seasons: string[];
  activeSeason: string | null;
}

export const getPlayerStatsBySeason = async (
  id: number,
  season: string,
  options?: RequestInit
): Promise<PlayerStats> => {
  return customFetch<PlayerStats>(
    `/api/players/${id}/stats?season=${encodeURIComponent(season)}`,
    { method: "GET", ...options }
  );
};

export const getPlayerSeasons = async (
  id: number,
  options?: RequestInit
): Promise<PlayerSeasons> => {
  return customFetch<PlayerSeasons>(`/api/players/${id}/seasons`, {
    method: "GET",
    ...options,
  });
};

export function useGetPlayerStatsBySeason(
  id: number,
  season: string | null | undefined,
  options?: { query?: { enabled?: boolean } }
) {
  return useQuery({
    queryKey: ["playerStats", id, season],
    queryFn: ({ signal }) =>
      getPlayerStatsBySeason(id, season!, { signal }),
    enabled: (options?.query?.enabled ?? true) && !!season && id > 0,
  });
}

export function useGetPlayerSeasons(
  id: number,
  options?: { query?: { enabled?: boolean } }
) {
  return useQuery({
    queryKey: ["playerSeasons", id],
    queryFn: ({ signal }) => getPlayerSeasons(id, { signal }),
    enabled: (options?.query?.enabled ?? true) && id > 0,
  });
}
