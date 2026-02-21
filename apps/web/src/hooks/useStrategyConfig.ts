import { useQuery } from "@tanstack/react-query";
import { decodeAbiParameters } from "viem";
import { usePublicClient } from "wagmi";

import { adoptionStrategyMetadataAbi } from "@/abi/adoption-strategy";
import { ZERO_ADDRESS } from "@/config/contracts";
import { getRequiredChain } from "@/config/network";
import { extractViemErrorMessage } from "@/lib/errors";

const SIMPLE_ADOPTION_COMPONENTS = [
  { name: "minReviewsRequired", type: "uint256" },
  { name: "approvalThreshold", type: "uint256" },
  { name: "rejectionThreshold", type: "uint256" },
  { name: "expirationTime", type: "uint256" },
  { name: "allowTimeBasedAdoption", type: "bool" },
  { name: "autoAdoptionTime", type: "uint256" },
] as const;

type SimpleAdoptionConfig = {
  minReviewsRequired: bigint;
  approvalThreshold: bigint;
  rejectionThreshold: bigint;
  expirationTime: bigint;
  allowTimeBasedAdoption: boolean;
  autoAdoptionTime: bigint;
};

export type StrategyConfig = {
  minReviews: number;
  approvalThreshold: number;
  rejectionThreshold: number;
  expirationSeconds: number;
  expirationHours: number;
  allowTimeBasedAdoption: boolean;
  autoAdoptionSeconds: number | null;
  autoAdoptionHours: number | null;
};

export type StrategyConfigIssue =
  | "minReviews"
  | "approvalOutOfRange"
  | "rejectionOutOfRange"
  | "thresholdOverlap"
  | "expirationMissing"
  | "autoAdoptionMissing"
  | "autoAdoptionOrder";

function normalizeAddress(value?: string | null) {
  if (!value) return "";
  return value.toLowerCase();
}

function toNumber(value: bigint): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toHours(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 0;
  }
  return seconds / 3600;
}

function mapConfig(raw: SimpleAdoptionConfig): StrategyConfig {
  const minReviews = Math.max(0, toNumber(raw.minReviewsRequired));
  const approvalThreshold = Math.max(0, toNumber(raw.approvalThreshold));
  const rejectionThreshold = Math.max(0, toNumber(raw.rejectionThreshold));
  const expirationSeconds = Math.max(0, toNumber(raw.expirationTime));
  const allowTimeBasedAdoption = Boolean(raw.allowTimeBasedAdoption);
  const autoAdoptionSecondsRaw = allowTimeBasedAdoption
    ? Math.max(0, toNumber(raw.autoAdoptionTime))
    : 0;
  const autoAdoptionSeconds =
    allowTimeBasedAdoption && autoAdoptionSecondsRaw > 0 ? autoAdoptionSecondsRaw : null;

  return {
    minReviews,
    approvalThreshold,
    rejectionThreshold,
    expirationSeconds,
    expirationHours: toHours(expirationSeconds),
    allowTimeBasedAdoption,
    autoAdoptionSeconds,
    autoAdoptionHours: autoAdoptionSeconds ? toHours(autoAdoptionSeconds) : null,
  };
}

async function fetchStrategyConfig(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  address: `0x${string}`
): Promise<StrategyConfig | null> {
  let lastError: unknown = null;

  try {
    const response = (await publicClient.readContract({
      address,
      abi: adoptionStrategyMetadataAbi,
      functionName: "getSimpleAdoptionConfig",
    })) as SimpleAdoptionConfig;

    if (response) {
      return mapConfig(response);
    }
  } catch (error) {
    lastError = error;
  }

  try {
    const response = (await publicClient.readContract({
      address,
      abi: adoptionStrategyMetadataAbi,
      functionName: "getStrategyConfig",
    })) as `0x${string}` | undefined;

    if (response && response !== "0x") {
      const [decoded] = decodeAbiParameters(
        [{ type: "tuple", components: SIMPLE_ADOPTION_COMPONENTS }],
        response
      ) as [SimpleAdoptionConfig];

      if (decoded) {
        return mapConfig(decoded);
      }
    }

    return null;
  } catch (error) {
    lastError = error;
  }

  if (lastError) {
    throw new Error(extractViemErrorMessage(lastError));
  }

  return null;
}

export function evaluateStrategyConfig(config: StrategyConfig | null): StrategyConfigIssue[] {
  if (!config) {
    return [];
  }

  const issues: StrategyConfigIssue[] = [];

  if (config.minReviews < 1) {
    issues.push("minReviews");
  }

  if (config.approvalThreshold < 1 || config.approvalThreshold > 100) {
    issues.push("approvalOutOfRange");
  }

  if (config.rejectionThreshold < 0 || config.rejectionThreshold > 100) {
    issues.push("rejectionOutOfRange");
  }

  if (config.approvalThreshold + config.rejectionThreshold > 100) {
    issues.push("thresholdOverlap");
  }

  if (config.expirationSeconds <= 0) {
    issues.push("expirationMissing");
  }

  if (config.allowTimeBasedAdoption) {
    if (!config.autoAdoptionSeconds) {
      issues.push("autoAdoptionMissing");
    } else if (config.autoAdoptionSeconds >= config.expirationSeconds) {
      issues.push("autoAdoptionOrder");
    }
  }

  return issues;
}

export function useStrategyConfig(address?: string) {
  const requiredChain = getRequiredChain();
  const publicClient = usePublicClient({ chainId: requiredChain.id });
  const normalized = normalizeAddress(address);
  const enabled = Boolean(publicClient && normalized && normalized !== ZERO_ADDRESS);

  return useQuery<StrategyConfig | null, Error>({
    queryKey: ["strategy-config", requiredChain.id, normalized],
    enabled,
    staleTime: 60_000,
    retry: 1,
    queryFn: async () => {
      if (!publicClient || !enabled || !normalized) {
        return null;
      }
      return fetchStrategyConfig(
        publicClient as NonNullable<ReturnType<typeof usePublicClient>>,
        normalized as `0x${string}`
      );
    },
  });
}
