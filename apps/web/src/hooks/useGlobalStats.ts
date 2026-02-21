import { useQuery } from "@tanstack/react-query";

import { loadDailyStatistics, loadGlobalStatistics } from "@/services/subgraph";

export function useGlobalStats() {
  const globalStatsQuery = useQuery({
    queryKey: ["globalStatistic"],
    queryFn: () => loadGlobalStatistics(),
    staleTime: 60_000,
  });

  const dailyStatsQuery = useQuery({
    queryKey: ["dailyStatistics"],
    queryFn: () => loadDailyStatistics(14, "asc"),
    staleTime: 60_000,
  });

  return {
    global: globalStatsQuery.data,
    daily: dailyStatsQuery.data ?? [],
    isLoading: globalStatsQuery.isLoading || dailyStatsQuery.isLoading,
    isError: globalStatsQuery.isError || dailyStatsQuery.isError,
  };
}
