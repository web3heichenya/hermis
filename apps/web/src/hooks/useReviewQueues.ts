import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { loadReviewQueues } from "@/services/subgraph";
import { useHermisStore } from "@/store/hermis-store";
import type { ReviewQueueItem, SubmissionStatus } from "@/types/hermis";

export function useReviewQueues(
  limit = 20,
  statuses: SubmissionStatus[] = ["SUBMITTED", "UNDER_REVIEW"]
) {
  const reviewQueues = useHermisStore((state) => state.reviewQueues);
  const setReviewQueues = useHermisStore((state) => state.setReviewQueues);

  const query = useQuery<ReviewQueueItem[]>({
    queryKey: ["reviewQueues", limit, statuses.join("-")],
    queryFn: () => loadReviewQueues(limit, statuses),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (query.data) {
      setReviewQueues(query.data);
    }
  }, [query.data, setReviewQueues]);

  return {
    ...query,
    reviewQueues,
  };
}
