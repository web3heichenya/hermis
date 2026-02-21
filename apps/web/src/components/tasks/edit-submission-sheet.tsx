"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { XIcon } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ZERO_ADDRESS, getContractAddress } from "@/config/contracts";
import { getExplorerTransactionUrl, getRequiredChain } from "@/config/network";
import { extractViemErrorMessage } from "@/lib/errors";
import type { Submission } from "@/types/hermis";
import { toast } from "sonner";

type EditSubmissionSheetProps = {
  submission: Submission;
  guardAddress?: string;
  onUpdated?: (nextVersion?: number) => void;
};

type EditTxState = {
  phase: "idle" | "submitting" | "success" | "error";
  hash?: `0x${string}`;
  version?: string;
  message?: string;
};

export function EditSubmissionSheet({
  submission,
  guardAddress,
  onUpdated,
}: EditSubmissionSheetProps) {
  const { t } = useTranslation();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const config = useConfig();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [open, setOpen] = useState(false);
  const [contentHash, setContentHash] = useState(
    () => submission.contentHash ?? submission.summary ?? ""
  );
  const [txState, setTxStateInternal] = useState<EditTxState>({ phase: "idle" });
  const editToastRef = useRef<string | number | null>(null);

  const updateTxState = useCallback(
    (next: EditTxState) => {
      setTxStateInternal(next);

      if (next.phase === "idle") {
        if (editToastRef.current) {
          toast.dismiss(editToastRef.current);
          editToastRef.current = null;
        }
        return;
      }

      if (next.phase === "success") {
        toast.success(t("submission.edit.tx.success", { version: next.version ?? "-" }), {
          id: editToastRef.current ?? undefined,
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
        editToastRef.current = null;
        return;
      }

      if (next.phase === "error") {
        toast.error(t("submission.edit.tx.error", { message: next.message ?? "Unknown error" }), {
          id: editToastRef.current ?? undefined,
        });
        editToastRef.current = null;
        return;
      }

      editToastRef.current = toast.loading(t("submission.edit.tx.submitting"), {
        id: editToastRef.current ?? undefined,
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
  const walletAddress = (address ?? ZERO_ADDRESS) as `0x${string}`;
  const numericSubmissionId = useMemo(
    () => parseNumericId(submission.contractId || submission.id),
    [submission.contractId, submission.id]
  );

  const normalizedGuard = useMemo(() => {
    const lower = guardAddress?.toLowerCase();
    if (lower && lower !== ZERO_ADDRESS) {
      return lower as `0x${string}`;
    }
    return getContractAddress("SUBMISSION_GUARD") as `0x${string}`;
  }, [guardAddress]);

  const hasGuard = normalizedGuard !== ZERO_ADDRESS;
  const correctNetwork = activeChain?.id === requiredChain.id;
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

  const guardStatus = useMemo(() => {
    if (!hasGuard) {
      return {
        variant: "info" as const,
        message: t("submission.edit.guardOpen"),
      };
    }
    if (!isConnected) {
      return {
        variant: "warning" as const,
        message: t("submission.edit.guardConnect"),
      };
    }
    if (!correctNetwork) {
      return {
        variant: "warning" as const,
        message: t("submission.edit.guardNetwork", { network: requiredChain.name }),
      };
    }
    if (!open) {
      return {
        variant: "muted" as const,
        message: t("submission.edit.guardPrompt"),
      };
    }
    if (guardLoading) {
      return {
        variant: "info" as const,
        message: t("submission.edit.guardLoading"),
      };
    }
    if (guardError) {
      return {
        variant: "error" as const,
        message: t("submission.edit.guardError", { message: extractViemErrorMessage(guardError) }),
      };
    }
    if (guardResult) {
      const [allowed, guardReason] = guardResult;
      if (!allowed) {
        return {
          variant: "error" as const,
          message: guardReason?.length ? guardReason : t("submission.edit.guardDenied"),
        };
      }
      return {
        variant: "success" as const,
        message: guardReason?.length ? guardReason : t("submission.edit.guardReady"),
      };
    }
    return {
      variant: "info" as const,
      message: t("submission.edit.guardIdle"),
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

  const guardAllowsUpdate = useMemo(() => {
    if (!hasGuard) return true;
    if (!guardResult) return false;
    return guardResult[0] === true;
  }, [guardResult, hasGuard]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setContentHash(submission.contentHash ?? submission.summary ?? "");
      updateTxState({ phase: "idle" });
    } else {
      updateTxState({ phase: "idle" });
    }
  };

  const handleSubmit = async () => {
    if (disabled) return;
    const trimmed = contentHash.trim();
    if (!trimmed) {
      updateTxState({
        phase: "error",
        message: t("submission.edit.tx.error", { message: "Missing content" }),
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
        message: guardResult?.[1]?.length ? guardResult[1] : t("submission.edit.guardBlocked"),
      });
      return;
    }

    const submissionManager = getContractAddress("SUBMISSION_MANAGER") as `0x${string}`;

    try {
      updateTxState({ phase: "submitting" });
      const hash = await writeContractAsync({
        address: submissionManager,
        abi: submissionManagerAbi,
        functionName: "updateSubmission",
        args: [numericSubmissionId, trimmed],
      });
      updateTxState({ phase: "submitting", hash });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      const logs = parseEventLogs({
        abi: submissionManagerAbi,
        logs: receipt.logs,
        eventName: "SubmissionUpdated",
      });

      const version = logs[0]?.args?.newVersion?.toString();
      updateTxState({ phase: "success", hash, version });
      setContentHash(trimmed);
      onUpdated?.(version ? Number(version) : undefined);
    } catch (error) {
      updateTxState({ phase: "error", message: extractViemErrorMessage(error) });
    }
  };

  const helperMessage = disabled
    ? t("submission.edit.disabled", { network: requiredChain.name })
    : t("submission.edit.hint");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="rounded-2xl">
          {t("submission.edit.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border/30 bg-card/95 rounded-[32px] border p-6 sm:p-8">
        <DialogClose className="text-muted-foreground hover:text-foreground focus:ring-ring absolute top-6 right-6 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none">
          <XIcon className="size-4" />
          <span className="sr-only">{t("common.actions.close")}</span>
        </DialogClose>
        <DialogHeader>
          <DialogTitle>{t("submission.edit.title")}</DialogTitle>
          <DialogDescription>{t("submission.edit.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="text-muted-foreground mt-6 space-y-5 text-sm">
          <label className="space-y-2 text-xs">
            <span className="text-muted-foreground/70 tracking-[0.2em] uppercase">
              {t("submission.edit.contentLabel")}
            </span>
            <textarea
              value={contentHash}
              onChange={(event) => setContentHash(event.target.value)}
              placeholder={t("submission.edit.contentPlaceholder")}
              className="border-border/40 bg-background/40 text-foreground placeholder:text-muted-foreground/50 focus:border-primary min-h-28 w-full rounded-3xl border px-4 py-3 text-sm focus:outline-none"
              disabled={txState.phase === "submitting"}
            />
          </label>

          {guardStatus.message && (
            <div
              className={`rounded-[24px] border px-4 py-3 text-xs tracking-[0.18em] uppercase ${
                guardStatus.variant === "error"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : guardStatus.variant === "success"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : guardStatus.variant === "warning"
                      ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                      : guardStatus.variant === "muted"
                        ? "border-border/40 bg-background/40 text-muted-foreground"
                        : "border-primary/40 bg-primary/10 text-primary"
              }`}
            >
              {guardStatus.message}
            </div>
          )}

          <p className="text-muted-foreground/60 text-[11px] tracking-[0.2em] uppercase">
            {helperMessage}
          </p>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              className="bg-primary text-primary-foreground rounded-3xl"
              onClick={handleSubmit}
              disabled={
                disabled ||
                txState.phase === "submitting" ||
                !contentHash.trim() ||
                !guardAllowsUpdate
              }
            >
              {t("submission.edit.submit")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground rounded-3xl"
              onClick={() => setOpen(false)}
            >
              {t("common.actions.close")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
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
