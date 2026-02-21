import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { loadTasks } from "@/services/subgraph";
import { useHermisStore } from "@/store/hermis-store";
import type { Task } from "@/types/hermis";

export function useTasksData(limit = 20) {
  const setTasks = useHermisStore((state) => state.setTasks);
  const tasks = useHermisStore((state) => state.tasks);

  const query = useQuery<Task[]>({
    queryKey: ["tasks", limit],
    queryFn: () => loadTasks(limit),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data) {
      setTasks(query.data);
    }
  }, [query.data, setTasks]);

  return {
    ...query,
    tasks,
  };
}
