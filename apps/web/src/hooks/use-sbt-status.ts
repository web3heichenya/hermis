import { useMemo } from "react";
import { useReadContract } from "wagmi";

import { hermisSbtAbi } from "@/abi/hermis-sbt";
import { ZERO_ADDRESS, getContractAddress } from "@/config/contracts";

const STATUS_MAP = {
  0: "UNINITIALIZED",
  1: "BLACKLISTED",
  2: "AT_RISK",
  3: "NORMAL",
} as const;

type StatusKey = keyof typeof STATUS_MAP;

type SbtStatusResult = {
  status: "UNINITIALIZED" | "BLACKLISTED" | "AT_RISK" | "NORMAL";
  hasSbt: boolean;
  reputation: bigint;
  stakeAmount: bigint;
  tokenId: bigint;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
};

export function useSbtStatus(userAddress?: string | null): SbtStatusResult {
  const address = useMemo(() => {
    const lower = userAddress?.toLowerCase();
    if (!lower || lower === ZERO_ADDRESS) {
      return null;
    }
    return lower as `0x${string}`;
  }, [userAddress]);

  const hermisSbtAddress = getContractAddress("HERMIS_SBT") as `0x${string}`;

  const { data, isLoading, error, refetch } = useReadContract({
    address: hermisSbtAddress,
    abi: hermisSbtAbi,
    functionName: "getUserData",
    args: [address ?? (ZERO_ADDRESS as `0x${string}`)],
    query: {
      enabled: !!address,
      staleTime: 15_000,
    },
  });

  const { status, hasSbt, reputation, stakeAmount, tokenId } = useMemo(() => {
    if (!address || !data) {
      return {
        status: "UNINITIALIZED" as const,
        hasSbt: false,
        reputation: 0n,
        stakeAmount: 0n,
        tokenId: 0n,
      };
    }

    const [tokenIdRaw, reputationRaw, statusRaw, stakeRaw, existsRaw] = data as readonly [
      bigint,
      bigint,
      number,
      bigint,
      boolean,
    ];

    const mappedStatus = STATUS_MAP[(statusRaw as StatusKey) ?? 0] ?? "UNINITIALIZED";

    return {
      status: mappedStatus,
      hasSbt: Boolean(existsRaw),
      reputation: reputationRaw,
      stakeAmount: stakeRaw,
      tokenId: tokenIdRaw,
    };
  }, [address, data]);

  return {
    status,
    hasSbt,
    reputation,
    stakeAmount,
    tokenId,
    isLoading: !!address && isLoading,
    error: error instanceof Error ? error.message : null,
    refetch: () => refetch(),
  };
}
