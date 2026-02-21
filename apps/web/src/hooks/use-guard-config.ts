import { useMemo } from "react";
import { useReadContract } from "wagmi";

import { reviewGuardAbi } from "@/abi/review-guard";
import { submissionGuardAbi } from "@/abi/submission-guard";
import { ZERO_ADDRESS } from "@/config/contracts";
import { extractViemErrorMessage } from "@/lib/errors";
import type { GuardRequirement } from "@/types/hermis";

type GuardType = "submission" | "review";

type SubmissionConfigResponse = {
  minReputationScore: bigint;
  minCategoryScore: bigint;
  maxFailedSubmissions: bigint;
  minSuccessRate: bigint;
  requireCategoryExpertise: boolean;
  enforceSuccessRate: boolean;
  requiredCategory: string;
};

type ReviewConfigResponse = {
  minReputationScore: bigint;
  minCategoryScore: bigint;
  minReviewCount: bigint;
  minAccuracyRate: bigint;
  requireCategoryExpertise: boolean;
  enforceAccuracyRate: boolean;
  requiredCategory: string;
};

type UseGuardConfigArgs = {
  address?: string;
  type: GuardType;
};

type UseGuardConfigResult = {
  config: Partial<GuardRequirement> | null;
  isLoading: boolean;
  error: string | null;
};

const SCORE_PRECISION = 10n;

function toScore(value: bigint) {
  if (value === 0n) return undefined;
  const numeric = Number(value) / Number(SCORE_PRECISION);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function toWhole(value: bigint) {
  if (value === 0n) return undefined;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function parseSubmissionConfig(config: SubmissionConfigResponse): Partial<GuardRequirement> {
  const requirement: Partial<GuardRequirement> = {};
  const minReputation = toScore(config.minReputationScore);
  if (minReputation !== undefined) {
    requirement.minReputation = minReputation;
  }

  if (config.requireCategoryExpertise) {
    const minCategoryScore = toScore(config.minCategoryScore);
    if (minCategoryScore !== undefined) {
      requirement.minCategoryScore = minCategoryScore;
    }
    if (config.requiredCategory) {
      requirement.requiredCategory = config.requiredCategory;
    }
  }

  if (config.enforceSuccessRate) {
    const minSuccessRate = toWhole(config.minSuccessRate);
    if (minSuccessRate !== undefined) {
      requirement.minSuccessRate = minSuccessRate;
    }
  }

  const maxFailed = toWhole(config.maxFailedSubmissions);
  if (maxFailed !== undefined) {
    requirement.maxFailedSubmissions = maxFailed;
  }

  return requirement;
}

function parseReviewConfig(config: ReviewConfigResponse): Partial<GuardRequirement> {
  const requirement: Partial<GuardRequirement> = {};
  const minReputation = toScore(config.minReputationScore);
  if (minReputation !== undefined) {
    requirement.minReputation = minReputation;
  }

  if (config.requireCategoryExpertise) {
    const minCategoryScore = toScore(config.minCategoryScore);
    if (minCategoryScore !== undefined) {
      requirement.minCategoryScore = minCategoryScore;
    }
    if (config.requiredCategory) {
      requirement.requiredCategory = config.requiredCategory;
    }
  }

  const minReviewCount = toWhole(config.minReviewCount);
  if (minReviewCount !== undefined) {
    requirement.minReviewCount = minReviewCount;
  }

  if (config.enforceAccuracyRate) {
    const minAccuracyRate = toWhole(config.minAccuracyRate);
    if (minAccuracyRate !== undefined) {
      requirement.minAccuracyRate = minAccuracyRate;
    }
  }

  return requirement;
}

export function useGuardConfig({ address, type }: UseGuardConfigArgs): UseGuardConfigResult {
  const lowerCase = address?.toLowerCase();
  const normalizedAddress =
    lowerCase && lowerCase !== ZERO_ADDRESS ? (lowerCase as `0x${string}`) : ZERO_ADDRESS;
  const enabled = normalizedAddress !== ZERO_ADDRESS;

  const { data, error, isLoading } = useReadContract({
    address: normalizedAddress,
    abi: type === "submission" ? submissionGuardAbi : reviewGuardAbi,
    functionName: type === "submission" ? "getSubmissionConfig" : "getReviewConfig",
    args: [],
    query: {
      enabled,
      retry: 0,
      staleTime: 60_000,
    },
  });

  const config = useMemo(() => {
    if (!enabled || !data) {
      return null;
    }

    const record = Array.isArray(data)
      ? (data[0] as object | undefined)
      : (data as object | undefined);
    if (!record) {
      return null;
    }

    if (type === "submission") {
      return parseSubmissionConfig(record as SubmissionConfigResponse);
    }

    return parseReviewConfig(record as ReviewConfigResponse);
  }, [data, enabled, type]);

  return {
    config,
    isLoading: enabled && isLoading,
    error: error ? extractViemErrorMessage(error) : null,
  };
}
