import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";

import { loadReviewerMetrics } from "@/services/subgraph";

export function useReviewerMetrics() {
  const { address } = useAccount();
  const normalized = address?.toLowerCase() ?? undefined;

  return useQuery({
    queryKey: ["reviewerMetrics", normalized],
    queryFn: () => loadReviewerMetrics(normalized),
    enabled: !!normalized,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
