import { CONTRACT_ADDRESSES } from "@/config/contracts";
import type { StrategyConfig } from "@/hooks/useStrategyConfig";

export const ADOPTION_STRATEGY_DEFAULTS: Record<string, StrategyConfig> = {
  [CONTRACT_ADDRESSES.SIMPLE_ADOPTION_STRATEGY]: {
    minReviews: 3,
    approvalThreshold: 60,
    rejectionThreshold: 40,
    expirationSeconds: 604_800,
    expirationHours: 168,
    allowTimeBasedAdoption: false,
    autoAdoptionSeconds: null,
    autoAdoptionHours: null,
  },
};

export function getAdoptionStrategyFallback(address?: string | null): StrategyConfig | null {
  if (!address) return null;
  return ADOPTION_STRATEGY_DEFAULTS[address.toLowerCase()] ?? null;
}
