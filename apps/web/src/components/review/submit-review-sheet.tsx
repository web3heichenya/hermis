"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useAccount,
  useChainId,
  useConfig,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { parseEventLogs } from "viem";

import { reviewGuardAbi } from "@/abi/review-guard";
import { submissionManagerAbi } from "@/abi/submission-manager";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ZERO_ADDRESS, getContractAddress } from "@/config/contracts";
import { getExplorerTransactionUrl, getRequiredChain } from "@/config/network";
import type { ReviewQueueItem } from "@/types/hermis";
import { useStrategyConfig } from "@/hooks/useStrategyConfig";
import { toast } from "sonner";

const REVIEW_OUTCOMES = [
  { value: 0, key: "approve" as const },
  { value: 1, key: "reject" as const },
];

type ReviewSheetProps = {
  queue: ReviewQueueItem;
  onSubmitted?: (reviewId: string) => void;
};

type ReviewTxState = {
  phase: "idle" | "submitting" | "success" | "error";
  hash?: `0x${string}`;
  reviewId?: string;
  message?: string;
};

export function SubmitReviewSheet({ queue, onSubmitted }: ReviewSheetProps) {
  const { t } = useTranslation();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const config = useConfig();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<number>(REVIEW_OUTCOMES[0].value);
  const [reason, setReason] = useState("");
  const [txState, setTxStateInternal] = useState<ReviewTxState>({ phase: "idle" });
  const reviewToastRef = useRef<string | number | null>(null);
  const guardToastRef = useRef<string | number | null>(null);
  const guardToastTypeRef = useRef<"success" | "error" | null>(null);

  const updateTxState = useCallback(
    (next: ReviewTxState) => {
      setTxStateInternal(next);

      if (next.phase === "idle") {
        if (reviewToastRef.current) {
          toast.dismiss(reviewToastRef.current);
          reviewToastRef.current = null;
        }
        return;
      }

      if (next.phase === "success") {
        toast.success(t("review.tx.success", { reviewId: next.reviewId ?? "-" }), {
          id: reviewToastRef.current ?? undefined,
          action: next.hash
            ? {
                label: t("submission.tx.hashLabel"),
                onClick: () => {
                  window.open(
                    getExplorerTransactionUrl(next.hash!),
                    "_blank",
                    "noopener,noreferrer"
                  );
                },
              }
            : undefined,
        });
        reviewToastRef.current = null;
        return;
      }

      if (next.phase === "error") {
        toast.error(t("review.tx.error", { message: next.message ?? "Unknown error" }), {
          id: reviewToastRef.current ?? undefined,
        });
        reviewToastRef.current = null;
        return;
      }

      reviewToastRef.current = toast.loading(t("review.tx.reviewing"), {
        id: reviewToastRef.current ?? undefined,
      });
    },
    [t]
  );

  const requiredChain = getRequiredChain();
  const activeChain = useMemo(
    () => config.chains.find((network) => network.id === chainId),
    [config.chains, chainId]
  );
  const disabled = !isConnected || activeChain?.id !== requiredChain.id;

  const guardAddress = useMemo(() => {
    const taskGuard = queue.guard?.toLowerCase();
    if (taskGuard && taskGuard !== ZERO_ADDRESS) {
      return taskGuard as `0x${string}`;
    }
    return getContractAddress("REVIEW_GUARD") as `0x${string}`;
  }, [queue.guard]);

  const hasGuard = guardAddress !== ZERO_ADDRESS;
  const walletAddress = (address ?? ZERO_ADDRESS) as `0x${string}`;
  const guardQueryEnabled =
    open && hasGuard && isConnected && activeChain?.id === requiredChain.id && !!address;

  const strategyAddress = getContractAddress("SIMPLE_ADOPTION_STRATEGY") as `0x${string}`;
  const strategyQuery = useStrategyConfig(strategyAddress);
  const strategyInsights = useMemo(() => {
    const config = strategyQuery.data;
    if (!config) return null;
    const approvalsNeeded = computeThresholdCount(config.minReviews, config.approvalThreshold);
    const rejectionsNeeded = computeThresholdCount(config.minReviews, config.rejectionThreshold);
    return {
      minReviews: config.minReviews,
      approvalThreshold: config.approvalThreshold,
      rejectionThreshold: config.rejectionThreshold,
      approvalsNeeded,
      rejectionsNeeded,
      expirationHours: config.expirationHours,
      autoHours: config.autoAdoptionHours ?? null,
    };
  }, [strategyQuery.data]);

  const {
    data: guardResult,
    error: guardError,
    isLoading: guardLoading,
    refetch: refetchGuard,
  } = useReadContract({
    address: guardAddress,
    abi: reviewGuardAbi,
    functionName: "validateUser",
    args: [walletAddress, "0x"],
    query: {
      enabled: guardQueryEnabled,
      retry: 0,
      staleTime: 30_000,
    },
  });

  useEffect(() => {
    if (guardQueryEnabled) {
      refetchGuard();
    }
  }, [guardQueryEnabled, refetchGuard]);

  useEffect(() => {
    if (!open) {
      updateTxState({ phase: "idle" });
      setReason("");
    }
  }, [open, updateTxState]);

  const guardStatus = useMemo(() => {
    if (!hasGuard) {
      return {
        variant: "info" as const,
        message: t("review.sheet.guardOpen"),
      };
    }
    if (!isConnected) {
      return {
        variant: "warning" as const,
        message: t("review.sheet.guardConnect"),
      };
    }
    if (activeChain?.id !== requiredChain.id) {
      return {
        variant: "warning" as const,
        message: t("review.sheet.guardNetwork", { network: requiredChain.name }),
      };
    }
    if (!open) {
      return {
        variant: "muted" as const,
        message: t("review.sheet.guardPrompt"),
      };
    }
    if (guardLoading) {
      return {
        variant: "info" as const,
        message: t("review.sheet.guardLoading"),
      };
    }
    if (guardError) {
      return {
        variant: "error" as const,
        message: t("review.sheet.guardError", { message: extractErrorMessage(guardError) }),
      };
    }
    if (guardResult) {
      const [allowed, guardReason] = guardResult;
      if (!allowed) {
        return {
          variant: "error" as const,
          message: guardReason?.length ? guardReason : t("review.sheet.guardDenied"),
        };
      }
      return {
        variant: "success" as const,
        message: guardReason?.length ? guardReason : t("review.sheet.guardReady"),
      };
    }
    return {
      variant: "info" as const,
      message: t("review.sheet.guardIdle"),
    };
  }, [
    activeChain?.id,
    guardError,
    guardLoading,
    guardResult,
    hasGuard,
    isConnected,
    open,
    requiredChain.id,
    requiredChain.name,
    t,
  ]);

  const guardAllowsReview = useMemo(() => {
    if (!hasGuard) return true;
    if (!guardResult) return false;
    return guardResult[0] === true;
  }, [guardResult, hasGuard]);

  useEffect(() => {
    if (!open || !hasGuard) {
      if (guardToastRef.current) {
        toast.dismiss(guardToastRef.current);
        guardToastRef.current = null;
        guardToastTypeRef.current = null;
      }
      return;
    }

    if (guardStatus.variant === "success" && guardAllowsReview) {
      if (guardToastTypeRef.current !== "success") {
        if (guardToastRef.current) {
          toast.dismiss(guardToastRef.current);
        }
        guardToastRef.current = toast.success(guardStatus.message);
        guardToastTypeRef.current = "success";
      }
    } else if (
      (guardStatus.variant === "error" || guardStatus.variant === "warning") &&
      guardStatus.message
    ) {
      if (guardToastTypeRef.current !== "error") {
        if (guardToastRef.current) {
          toast.dismiss(guardToastRef.current);
        }
        guardToastRef.current = toast.error(guardStatus.message);
        guardToastTypeRef.current = "error";
      }
    } else if (guardStatus.variant === "info" || guardStatus.variant === "muted") {
      if (guardToastRef.current) {
        toast.dismiss(guardToastRef.current);
        guardToastRef.current = null;
        guardToastTypeRef.current = null;
      }
    }
  }, [guardAllowsReview, guardStatus, hasGuard, open]);

  const submitDisabled =
    disabled || txState.phase === "submitting" || !reason.trim() || !guardAllowsReview;

  const numericSubmissionId = useMemo(
    () => parseNumericId(queue.submissionId),
    [queue.submissionId]
  );

  const handleSubmit = async () => {
    if (disabled) return;
    if (!reason.trim()) {
      updateTxState({
        phase: "error",
        message: t("submission.tx.error", { message: "Reason required" }),
      });
      return;
    }
    if (!publicClient) {
      updateTxState({ phase: "error", message: "Public client unavailable" });
      return;
    }
    if (hasGuard && (!guardResult || !guardResult[0])) {
      updateTxState({
        phase: "error",
        message: guardResult?.[1]?.length ? guardResult[1] : t("review.sheet.guardBlocked"),
      });
      return;
    }

    const submissionManager = getContractAddress("SUBMISSION_MANAGER") as `0x${string}`;

    try {
      updateTxState({ phase: "submitting" });
      const hash = await writeContractAsync({
        address: submissionManager,
        abi: submissionManagerAbi,
        functionName: "submitReview",
        args: [numericSubmissionId, outcome, reason.trim()],
      });
      updateTxState({ phase: "submitting", hash });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const logs = parseEventLogs({
        abi: submissionManagerAbi,
        logs: receipt.logs,
        eventName: "ReviewSubmitted",
      });

      const reviewId = logs[0]?.args?.reviewId?.toString() ?? "";
      updateTxState({ phase: "success", hash, reviewId });
      if (onSubmitted && reviewId) {
        onSubmitted(reviewId);
      }
    } catch (error) {
      updateTxState({ phase: "error", message: extractErrorMessage(error) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="mt-2 rounded-2xl">
          {t("review.cta.review")}
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border/30 bg-card/95 border p-6 sm:rounded-[32px] sm:p-8">
        <DialogHeader className="gap-1.5">
          <DialogTitle>{t("review.sheet.title")}</DialogTitle>
          <DialogDescription>{t("review.sheet.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="text-muted-foreground mt-6 space-y-5 text-sm">
          <div className="text-muted-foreground/60 flex flex-wrap gap-2 text-xs tracking-[0.2em] uppercase">
            <span>{queue.title}</span>
            <span>•</span>
            <span>{queue.author}</span>
            <span>•</span>
            <span>#{queue.submissionId}</span>
          </div>

          <div className="space-y-2">
            <span className="text-muted-foreground/70 text-xs tracking-[0.2em] uppercase">
              {t("review.sheet.outcome")}
            </span>
            <div className="flex gap-2">
              {REVIEW_OUTCOMES.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setOutcome(item.value)}
                  className={`rounded-3xl px-4 py-2 text-xs tracking-[0.18em] uppercase transition ${
                    outcome === item.value
                      ? "bg-primary text-primary-foreground"
                      : "border-border/40 bg-background/40 text-muted-foreground hover:border-primary/40 border"
                  }`}
                >
                  {t(`review.sheet.${item.key}`)}
                </button>
              ))}
            </div>
          </div>

          <label className="space-y-2 text-xs">
            <span className="text-muted-foreground/70 tracking-[0.2em] uppercase">
              {t("review.sheet.reason")}
            </span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={t("review.sheet.reasonPlaceholder")}
              className="border-border/40 bg-background/40 text-foreground placeholder:text-muted-foreground/50 focus:border-primary min-h-32 w-full rounded-3xl border px-4 py-3 text-sm focus:outline-none"
              disabled={txState.phase === "submitting"}
            />
          </label>

          <div className="border-border/40 bg-background/30 rounded-[24px] border px-4 py-3 text-xs">
            <p className="text-muted-foreground/70 text-[11px] tracking-[0.2em] uppercase">
              {t("review.sheet.strategyTitle")}
            </p>
            {strategyQuery.isLoading ? (
              <p className="text-muted-foreground mt-2">{t("review.sheet.strategyLoading")}</p>
            ) : strategyQuery.error ? (
              <p className="text-destructive mt-2">
                {t("review.sheet.strategyError", {
                  message: extractErrorMessage(strategyQuery.error),
                })}
              </p>
            ) : strategyInsights ? (
              <ul className="text-muted-foreground mt-2 space-y-1">
                <li>
                  {t("review.sheet.strategySummary.minReviews", {
                    value: strategyInsights.minReviews,
                  })}
                </li>
                <li>
                  {t("review.sheet.strategySummary.approval", {
                    value: strategyInsights.approvalsNeeded,
                    threshold: strategyInsights.approvalThreshold,
                  })}
                </li>
                <li>
                  {t("review.sheet.strategySummary.rejection", {
                    value: strategyInsights.rejectionsNeeded,
                    threshold: strategyInsights.rejectionThreshold,
                  })}
                </li>
                {strategyInsights.expirationHours > 0 && (
                  <li>
                    {t("review.sheet.strategySummary.expiration", {
                      hours: strategyInsights.expirationHours,
                    })}
                  </li>
                )}
                {strategyInsights.autoHours ? (
                  <li>
                    {t("review.sheet.strategySummary.auto", {
                      hours: strategyInsights.autoHours,
                    })}
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="text-muted-foreground mt-2">{t("review.sheet.strategyEmpty")}</p>
            )}
          </div>

          {(guardStatus.variant === "info" || guardStatus.variant === "muted") &&
          guardStatus.message ? (
            <div className="border-border/40 bg-background/40 text-muted-foreground rounded-[24px] border px-4 py-3 text-xs tracking-[0.18em] uppercase">
              {guardStatus.message}
            </div>
          ) : null}
        </div>

        <DialogFooter className="mt-6 gap-3">
          <Button
            size="sm"
            className="bg-primary text-primary-foreground rounded-3xl"
            onClick={handleSubmit}
            disabled={submitDisabled}
          >
            {t("review.sheet.submit")}
          </Button>
          <DialogClose asChild>
            <Button size="sm" variant="ghost" className="text-muted-foreground rounded-3xl">
              {t("common.actions.close")}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function computeThresholdCount(minReviews: number, threshold: number) {
  if (minReviews <= 0 || threshold <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil((threshold / 100) * minReviews));
}

function parseNumericId(value: string) {
  if (!value) return 0n;
  if (/^\d+$/.test(value)) {
    return BigInt(value);
  }
  const matches = value.match(/\d+/g);
  if (matches && matches.length) {
    return BigInt(matches[matches.length - 1]);
  }
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

function extractErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const maybe = error as { shortMessage?: string; message?: string };
    if (maybe.shortMessage) return maybe.shortMessage;
    if (maybe.message) return maybe.message;
  }
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "Unknown error";
}
