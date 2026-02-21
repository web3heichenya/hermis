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

import { submissionGuardAbi } from "@/abi/submission-guard";
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
import { extractViemErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

type SubmissionTxPhase = "idle" | "submitting" | "success" | "error";

type SubmissionTxState = {
  phase: SubmissionTxPhase;
  hash?: `0x${string}`;
  submissionId?: string;
  message?: string;
};

type SubmitWorkSheetProps = {
  taskId: string;
  guardSummary?: string[];
  guardAddress?: string;
  onSubmitted?: (submissionId: string) => void;
};

export function SubmitWorkSheet({
  taskId,
  guardSummary = [],
  guardAddress: providedGuard,
  onSubmitted,
}: SubmitWorkSheetProps) {
  const { t } = useTranslation();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const config = useConfig();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [open, setOpen] = useState(false);
  const [contentHash, setContentHash] = useState("");
  const [txState, setTxStateInternal] = useState<SubmissionTxState>({ phase: "idle" });
  const submissionToastRef = useRef<string | number | null>(null);
  const guardToastRef = useRef<string | number | null>(null);
  const guardToastTypeRef = useRef<"success" | "error" | null>(null);

  const updateTxState = useCallback(
    (next: SubmissionTxState) => {
      setTxStateInternal(next);

      if (next.phase === "idle") {
        if (submissionToastRef.current) {
          toast.dismiss(submissionToastRef.current);
          submissionToastRef.current = null;
        }
        return;
      }

      if (next.phase === "success") {
        toast.success(t("submission.tx.success", { submissionId: next.submissionId ?? "-" }), {
          id: submissionToastRef.current ?? undefined,
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
        submissionToastRef.current = null;
        return;
      }

      if (next.phase === "error") {
        toast.error(t("submission.tx.error", { message: next.message ?? "Unknown error" }), {
          id: submissionToastRef.current ?? undefined,
        });
        submissionToastRef.current = null;
        return;
      }

      submissionToastRef.current = toast.loading(t("submission.tx.submitting"), {
        id: submissionToastRef.current ?? undefined,
      });
    },
    [t]
  );

  const requiredChain = getRequiredChain();
  const activeChain = useMemo(
    () => config.chains.find((network) => network.id === chainId),
    [config.chains, chainId]
  );

  const correctNetwork = activeChain?.id === requiredChain.id;
  const disabled = !isConnected || !correctNetwork;

  const normalizedGuard = useMemo(() => {
    const lower = providedGuard?.toLowerCase();
    if (lower && lower !== ZERO_ADDRESS) {
      return lower as `0x${string}`;
    }
    return getContractAddress("SUBMISSION_GUARD") as `0x${string}`;
  }, [providedGuard]);

  const hasGuard = normalizedGuard !== ZERO_ADDRESS;
  const walletAddress = (address ?? ZERO_ADDRESS) as `0x${string}`;
  const guardQueryEnabled = open && hasGuard && isConnected && correctNetwork && !!address;

  const {
    data: guardResult,
    error: guardError,
    isLoading: guardLoading,
    refetch: refetchGuard,
  } = useReadContract({
    address: normalizedGuard,
    abi: submissionGuardAbi,
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
      if (guardToastRef.current) {
        toast.dismiss(guardToastRef.current);
        guardToastRef.current = null;
        guardToastTypeRef.current = null;
      }
    }
  }, [open, updateTxState]);

  const guardStatus = useMemo(() => {
    if (!hasGuard) {
      return {
        variant: "info" as const,
        message: t("submission.sheet.guardOpen"),
      };
    }
    if (!isConnected) {
      return {
        variant: "warning" as const,
        message: t("submission.sheet.guardConnect"),
      };
    }
    if (!correctNetwork) {
      return {
        variant: "warning" as const,
        message: t("submission.sheet.guardNetwork", { network: requiredChain.name }),
      };
    }
    if (!open) {
      return {
        variant: "muted" as const,
        message: t("submission.sheet.guardPrompt"),
      };
    }
    if (guardLoading) {
      return {
        variant: "info" as const,
        message: t("submission.sheet.guardLoading"),
      };
    }
    if (guardError) {
      return {
        variant: "error" as const,
        message: t("submission.sheet.guardError", { message: extractViemErrorMessage(guardError) }),
      };
    }
    if (guardResult) {
      const [allowed, guardReason] = guardResult;
      if (!allowed) {
        return {
          variant: "error" as const,
          message: guardReason?.length ? guardReason : t("submission.sheet.guardDenied"),
        };
      }
      return {
        variant: "success" as const,
        message: guardReason?.length ? guardReason : t("submission.sheet.guardReady"),
      };
    }
    return {
      variant: "info" as const,
      message: t("submission.sheet.guardIdle"),
    };
  }, [
    correctNetwork,
    guardError,
    guardLoading,
    guardResult,
    hasGuard,
    isConnected,
    open,
    requiredChain.name,
    t,
  ]);

  const guardAllowsSubmission = useMemo(() => {
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

    if (guardStatus.variant === "success" && guardAllowsSubmission) {
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
  }, [guardAllowsSubmission, guardStatus, hasGuard, open]);

  const numericTaskId = useMemo(() => parseTaskId(taskId), [taskId]);

  const handleSubmit = async () => {
    if (disabled) {
      return;
    }

    const trimmed = contentHash.trim();
    if (!trimmed) {
      updateTxState({
        phase: "error",
        message: t("submission.tx.error", { message: "Missing content" }),
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
        message: guardResult?.[1]?.length ? guardResult[1] : t("submission.sheet.guardBlocked"),
      });
      return;
    }

    const submissionManager = getContractAddress("SUBMISSION_MANAGER") as `0x${string}`;

    try {
      updateTxState({ phase: "submitting" });

      const hash = await writeContractAsync({
        address: submissionManager,
        abi: submissionManagerAbi,
        functionName: "submitWork",
        args: [numericTaskId, trimmed],
      });

      updateTxState({ phase: "submitting", hash });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      const logs = parseEventLogs({
        abi: submissionManagerAbi,
        eventName: "SubmissionCreated",
        logs: receipt.logs,
      });

      const submissionId = logs[0]?.args?.submissionId?.toString() ?? "";

      updateTxState({ phase: "success", hash, submissionId });
      setContentHash("");
      if (onSubmitted && submissionId) {
        onSubmitted(submissionId);
      }
    } catch (error) {
      updateTxState({ phase: "error", message: extractViemErrorMessage(error) });
    }
  };

  const helperMessage = disabled
    ? t("submission.sheet.disabled", { network: requiredChain.name })
    : t("submission.sheet.guardHint");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground shadow-primary/30 rounded-2xl shadow-lg"
        >
          {t("task.actions.submit")}
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border/30 bg-card/95 p-6 sm:p-8">
        <DialogHeader className="gap-1.5">
          <DialogTitle>{t("submission.sheet.title")}</DialogTitle>
          <DialogDescription>{t("submission.sheet.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="text-muted-foreground mt-6 space-y-5 text-sm">
          <label className="space-y-2 text-xs">
            <span className="text-muted-foreground/70 tracking-[0.2em] uppercase">
              {t("submission.sheet.contentLabel")}
            </span>
            <textarea
              value={contentHash}
              onChange={(event) => setContentHash(event.target.value)}
              placeholder={t("submission.sheet.contentPlaceholder")}
              className="border-border/40 bg-background/40 text-foreground placeholder:text-muted-foreground/50 focus:border-primary min-h-28 w-full rounded-3xl border px-4 py-3 text-sm focus:outline-none"
              disabled={txState.phase === "submitting"}
            />
          </label>

          {!!guardSummary.length && (
            <div className="border-border/30 bg-background/20 rounded-[24px] border px-4 py-3 text-xs">
              <p className="text-muted-foreground/60 tracking-[0.18em] uppercase">
                {t("submission.sheet.guardChecklist")}
              </p>
              <ul className="text-muted-foreground/80 mt-2 space-y-1">
                {guardSummary.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-muted-foreground/60 text-[11px] tracking-[0.2em] uppercase">
            {helperMessage}
          </p>
        </div>

        <DialogFooter className="mt-8 gap-3">
          <Button
            className="bg-primary text-primary-foreground rounded-3xl"
            size="sm"
            onClick={handleSubmit}
            disabled={
              disabled ||
              txState.phase === "submitting" ||
              !contentHash.trim() ||
              !guardAllowsSubmission
            }
          >
            {t("submission.sheet.submit")}
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

function parseTaskId(value: string): bigint {
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
