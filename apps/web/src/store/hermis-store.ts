import { create } from "zustand";

import { loadState, saveState } from "@/lib/storage";
import { formatAddress } from "@/lib/wallet";

import type { ArbitrationCase, HermisUser, ReviewQueueItem, Task } from "@/types/hermis";

type FiltersState = {
  search: string;
  status: string | null;
  category: string | null;
  guard: string | null;
};

type HermisStoreState = {
  user: HermisUser;
  tasks: Task[];
  filters: FiltersState;
  reviewQueues: ReviewQueueItem[];
  arbitrations: ArbitrationCase[];
};

type HermisStoreActions = {
  setSearch: (value: string) => void;
  setFilter: (key: keyof FiltersState, value: string | null) => void;
  resetFilters: () => void;
  setWalletAddress: (address: string | null) => void;
  setTasks: (tasks: Task[]) => void;
  setUser: (user: Partial<HermisUser>) => void;
  setReviewQueues: (items: ReviewQueueItem[]) => void;
  setArbitrations: (items: ArbitrationCase[]) => void;
};

const defaultFilters: FiltersState = {
  search: "",
  status: null,
  category: null,
  guard: null,
};

const filtersKey = "filters";

const emptyUser: HermisUser = {
  address: "",
  username: "",
  reputation: 0,
  stake: 0,
  state: "UNINITIALIZED",
  sbtLevel: "Uninitialized",
  pendingRewards: 0,
  categoryScores: [],
  reputationHistory: [],
};

export const useHermisStore = create<HermisStoreState & HermisStoreActions>((set) => ({
  user: emptyUser,
  tasks: [],
  reviewQueues: [],
  arbitrations: [],
  filters: loadState(filtersKey, defaultFilters),
  setSearch: (value) =>
    set((state) => {
      const filters = { ...state.filters, search: value };
      saveState(filtersKey, filters);
      return { filters };
    }),
  setFilter: (key, value) =>
    set((state) => {
      const filters = { ...state.filters, [key]: value };
      saveState(filtersKey, filters);
      return { filters };
    }),
  resetFilters: () =>
    set(() => {
      saveState(filtersKey, defaultFilters);
      return { filters: defaultFilters };
    }),
  setWalletAddress: (address) =>
    set((state) => ({
      user: address
        ? {
            ...state.user,
            address,
            username: formatAddress(address) || address,
          }
        : emptyUser,
    })),
  setTasks: (tasks) => set(() => ({ tasks })),
  setUser: (user) =>
    set((state) => ({
      user: {
        ...state.user,
        ...user,
      },
    })),
  setReviewQueues: (items) => set(() => ({ reviewQueues: items })),
  setArbitrations: (items) => set(() => ({ arbitrations: items })),
}));
