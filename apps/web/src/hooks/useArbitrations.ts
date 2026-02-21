import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { loadArbitrations } from "@/services/subgraph";
import { useHermisStore } from "@/store/hermis-store";
import type { ArbitrationCase, ArbitrationStatus } from "@/types/hermis";

type UseArbitrationsOptions = {
  limit?: number;
  statuses?: ArbitrationStatus[];
};

const DEFAULT_QUERY_KEY = ["arbitrations"] as const;

export function useArbitrations(options: UseArbitrationsOptions = {}) {
  const arbitrations = useHermisStore((state) => state.arbitrations);
  const setArbitrations = useHermisStore((state) => state.setArbitrations);

  const { limit = 20, statuses } = options;
  const statusesKey =
    Array.isArray(statuses) && statuses.length ? [...statuses].sort().join(",") : "ALL";

  const query = useQuery<ArbitrationCase[]>({
    queryKey: [...DEFAULT_QUERY_KEY, limit, statusesKey],
    queryFn: () => loadArbitrations(limit, statuses ?? undefined),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (query.data) {
      setArbitrations(query.data);
    }
  }, [query.data, setArbitrations]);

  return {
    cases: arbitrations,
    ...query,
  };
}
