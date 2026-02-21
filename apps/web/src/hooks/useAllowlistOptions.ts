import { useQuery } from "@tanstack/react-query";

import {
  CONTRACT_ADDRESSES,
  TOKEN_METADATA,
  ZERO_ADDRESS,
  getTokenMetadata,
} from "@/config/contracts";
import { loadAllowedGuards, loadAllowedStrategies, loadAllowedTokens } from "@/services/subgraph";
import { formatAddress } from "@/lib/wallet";

type GuardOption = {
  address: string;
  label: string;
  description?: string;
  kind: "submission" | "review" | "global" | "unknown";
};

type StrategyOption = {
  address: string;
  label: string;
  description?: string;
  kind: "adoption" | "reward" | "unknown";
};

type TokenOption = {
  address: string;
  label: string;
  symbol: string;
  decimals: number;
  isNative: boolean;
};

type AllowlistOptions = {
  guards: GuardOption[];
  submissionGuards: GuardOption[];
  reviewGuards: GuardOption[];
  otherGuards: GuardOption[];
  strategies: StrategyOption[];
  tokens: TokenOption[];
};

function createGuardOption(address: string): GuardOption {
  const normalized = address.toLowerCase();
  let kind: GuardOption["kind"] = "unknown";
  if (normalized === CONTRACT_ADDRESSES.SUBMISSION_GUARD) {
    kind = "submission";
  } else if (normalized === CONTRACT_ADDRESSES.REVIEW_GUARD) {
    kind = "review";
  } else if (normalized === CONTRACT_ADDRESSES.GLOBAL_GUARD) {
    kind = "global";
  }

  return {
    address: normalized,
    label: formatAddress(normalized) || normalized,
    kind,
  };
}

function createStrategyOption(address: string): StrategyOption {
  const normalized = address.toLowerCase();
  let kind: StrategyOption["kind"] = "unknown";
  if (normalized === CONTRACT_ADDRESSES.SIMPLE_ADOPTION_STRATEGY) {
    kind = "adoption";
  } else if (normalized === CONTRACT_ADDRESSES.BASIC_REWARD_STRATEGY) {
    kind = "reward";
  }

  return {
    address: normalized,
    label: formatAddress(normalized) || normalized,
    kind,
  };
}

function createTokenOption(address: string): TokenOption {
  const normalized = address ? address.toLowerCase() : ZERO_ADDRESS;
  if (normalized === ZERO_ADDRESS) {
    return {
      address: ZERO_ADDRESS,
      label: "ETH",
      symbol: "ETH",
      decimals: 18,
      isNative: true,
    };
  }

  const metadata = TOKEN_METADATA[normalized] ?? getTokenMetadata(normalized);
  return {
    address: normalized,
    label: metadata.symbol,
    symbol: metadata.symbol,
    decimals: metadata.decimals,
    isNative: false,
  };
}

async function loadAllowlistSnapshot(): Promise<AllowlistOptions> {
  const [guards, strategies, tokens] = await Promise.all([
    loadAllowedGuards(),
    loadAllowedStrategies(),
    loadAllowedTokens(),
  ]);

  const guardOptions = guards.map(createGuardOption);
  const submissionGuards = guardOptions.filter((option) => option.kind === "submission");
  const reviewGuards = guardOptions.filter((option) => option.kind === "review");
  const otherGuards = guardOptions.filter(
    (option) => option.kind !== "submission" && option.kind !== "review"
  );

  const strategyOptions = strategies.map(createStrategyOption);
  const tokenOptions = tokens.map(createTokenOption);

  return {
    guards: guardOptions,
    submissionGuards,
    reviewGuards,
    otherGuards,
    strategies: strategyOptions,
    tokens: tokenOptions,
  };
}

export function useAllowlistOptions() {
  return useQuery({
    queryKey: ["allowlist-options"],
    queryFn: loadAllowlistSnapshot,
    staleTime: 60_000,
  });
}
