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
import { useQueryClient } from "@tanstack/react-query";
import { formatUnits, parseEventLogs, parseUnits } from "viem";

import { arbitrationManagerAbi } from "@/abi/arbitration-manager";
import { erc20Abi } from "@/abi/erc20";
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
import { ZERO_ADDRESS, TOKEN_METADATA, getContractAddress } from "@/config/contracts";
import { getExplorerTransactionUrl, getRequiredChain } from "@/config/network";
import { extractViemErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

const SUBMISSION_ARBITRATION_TYPE = 1; // DataTypes.ArbitrationType.SUBMISSION_STATUS

const FALLBACK_NATIVE_METADATA = {
  symbol: "ETH",
  decimals: 18,
};

const FALLBACK_ERC20_METADATA = {
  symbol: "ETH",
  decimals: 18,
};

export type RequestArbitrationSheetProps = {
  submissionId: string;
  trigger?: React.ReactNode;
  onRequested?: (arbitrationId: string) => void;
};

type Phase = "idle" | "approving" | "requesting" | "success" | "error";

export function RequestArbitrationSheet({
  submissionId,
  trigger,
  onRequested,
}: RequestArbitrationSheetProps) {
  const { t } = useTranslation();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const config = useConfig();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const queryClient = useQueryClient();

  const requiredChain = getRequiredChain();
  const activeChain = useMemo(
    () => config.chains.find((network) => network.id === chainId),
    [config.chains, chainId]
  );

  const arbitrationManager = getContractAddress("ARBITRATION_MANAGER") as `0x${string}`;

  const [open, setOpen] = useState(false);
  const [evidence, setEvidence] = useState("");
  const [deposit, setDeposit] = useState("");
  const [phase, setPhaseInternal] = useState<Phase>("idle");
  const [arbitrationId, setArbitrationId] = useState<string | null>(null);

  const arbitrationToastRef = useRef<string | number | null>(null);
  const eligibilityToastRef = useRef<string | number | null>(null);

  const updatePhase = useCallback(
    (
      nextPhase: Phase,
      options?: { message?: string | null; hash?: string | null; arbitrationId?: string | null }
    ) => {
      setPhaseInternal(nextPhase);

      if (nextPhase === "idle") {
        if (arbitrationToastRef.current) {
          toast.dismiss(arbitrationToastRef.current);
          arbitrationToastRef.current = null;
        }
        return;
      }

      if (nextPhase === "success") {
        toast.success(
          t("arbitration.sheet.status.success", {
            id: options?.arbitrationId ?? arbitrationId ?? "-",
          }),
          {
            id: arbitrationToastRef.current ?? undefined,
            action: options?.hash
              ? {
                  label: t("submission.tx.hashLabel"),
                  onClick: () => {
                    window.open(
                      getExplorerTransactionUrl(options.hash!),
                      "_blank",
                      "noopener,noreferrer"
                    );
                  },
                }
              : undefined,
          }
        );
        arbitrationToastRef.current = null;
        return;
      }

      if (nextPhase === "error") {
        toast.error(
          t("arbitration.sheet.status.error", { message: options?.message ?? "Unknown error" }),
          {
            id: arbitrationToastRef.current ?? undefined,
          }
        );
        arbitrationToastRef.current = null;
        return;
      }

      const messageKey =
        nextPhase === "approving"
          ? "arbitration.sheet.status.approving"
          : "arbitration.sheet.status.requesting";

      arbitrationToastRef.current = toast.loading(t(messageKey), {
        id: arbitrationToastRef.current ?? undefined,
      });
    },
    [arbitrationId, t]
  );

  const submissionNumericId = useMemo(() => parseNumericId(submissionId), [submissionId]);

  const disabled = !isConnected || activeChain?.id !== requiredChain.id;

  const { data: feeToken } = useReadContract({
    address: arbitrationManager,
    abi: arbitrationManagerAbi,
    functionName: "feeToken",
    args: [],
    query: {
      enabled: open,
      staleTime: 60_000,
    },
  });

  const normalizedFeeToken =
    typeof feeToken === "string" ? (feeToken.toLowerCase() as `0x${string}`) : undefined;
  const isNativeToken = !normalizedFeeToken || normalizedFeeToken === ZERO_ADDRESS;
  const erc20TokenAddress = !isNativeToken ? (normalizedFeeToken as `0x${string}`) : undefined;
  const knownTokenMeta = erc20TokenAddress ? TOKEN_METADATA[erc20TokenAddress] : undefined;

  const { data: tokenDecimals } = useReadContract({
    address: (erc20TokenAddress ?? ZERO_ADDRESS) as `0x${string}`,
    abi: erc20Abi,
    functionName: "decimals",
    args: [],
    query: {
      enabled: open && !isNativeToken && !knownTokenMeta,
      staleTime: 300_000,
    },
  });

  const resolvedDecimals =
    knownTokenMeta?.decimals ?? Number(tokenDecimals ?? FALLBACK_ERC20_METADATA.decimals);
  const decimals = isNativeToken ? FALLBACK_NATIVE_METADATA.decimals : resolvedDecimals;

  const { data: tokenSymbol } = useReadContract({
    address: (erc20TokenAddress ?? ZERO_ADDRESS) as `0x${string}`,
    abi: erc20Abi,
    functionName: "symbol",
    args: [],
    query: {
      enabled: open && !isNativeToken && !knownTokenMeta,
      staleTime: 300_000,
    },
  });

  const tokenSymbolCandidates = [
    knownTokenMeta?.symbol,
    tokenSymbol as string | undefined,
    FALLBACK_ERC20_METADATA.symbol,
  ];

  const tokenSymbolMatch = tokenSymbolCandidates.find((symbol): symbol is string => {
    return Boolean(symbol);
  });
  const tokenSymbolFormatted = isNativeToken
    ? "ETH"
    : (tokenSymbolMatch ?? FALLBACK_ERC20_METADATA.symbol);

  const { data: rawFee } = useReadContract({
    address: arbitrationManager,
    abi: arbitrationManagerAbi,
    functionName: "getArbitrationFee",
    args: [],
    query: {
      enabled: open,
      staleTime: 60_000,
    },
  });

  const { data: canRequestResult, refetch: refetchEligibility } = useReadContract({
    address: arbitrationManager,
    abi: arbitrationManagerAbi,
    functionName: "canRequestArbitration",
    args: [SUBMISSION_ARBITRATION_TYPE, submissionNumericId],
    account: address,
    query: {
      enabled: open && isConnected && !disabled,
      staleTime: 15_000,
    },
  });

  const formattedFee = useMemo(() => {
    if (!rawFee) return "";
    try {
      return formatUnits(BigInt(rawFee), decimals);
    } catch {
      return "";
    }
  }, [rawFee, decimals]);

  useEffect(() => {
    if (open && formattedFee && !deposit) {
      setDeposit(formattedFee);
    }
  }, [open, formattedFee, deposit]);

  useEffect(() => {
    if (!open) {
      updatePhase("idle");
      setEvidence("");
      setDeposit("");
      setArbitrationId(null);
    }
  }, [open, updatePhase]);

  useEffect(() => {
    if (open && isConnected && !disabled) {
      refetchEligibility();
    }
  }, [open, isConnected, disabled, refetchEligibility]);

  const eligibility = useMemo(() => {
    if (!canRequestResult) return null;
    const [allowed, reason] = canRequestResult as [boolean, string];
    return { allowed, reason };
  }, [canRequestResult]);

  useEffect(() => {
    if (!open) {
      if (eligibilityToastRef.current) {
        toast.dismiss(eligibilityToastRef.current);
        eligibilityToastRef.current = null;
      }
      return;
    }

    if (eligibility && !eligibility.allowed && eligibility.reason) {
      if (eligibilityToastRef.current) {
        toast.dismiss(eligibilityToastRef.current);
      }
      eligibilityToastRef.current = toast.error(eligibility.reason);
    } else if (eligibilityToastRef.current) {
      toast.dismiss(eligibilityToastRef.current);
      eligibilityToastRef.current = null;
    }
  }, [eligibility, open]);

  const blockedByEligibility = Boolean(eligibility && !eligibility.allowed);

  const submitDisabled =
    disabled ||
    !evidence.trim() ||
    !deposit.trim() ||
    phase === "approving" ||
    phase === "requesting" ||
    blockedByEligibility;

  const handleSubmit = async () => {
    if (submitDisabled) return;
    if (!publicClient) {
      updatePhase("error", { message: "public client unavailable" });
      return;
    }
    try {
      const trimmedEvidence = evidence.trim();
      if (!trimmedEvidence) {
        updatePhase("error", { message: t("arbitration.sheet.error.evidence") });
        return;
      }

      const value = parseUnits(deposit.trim(), decimals);
      if (rawFee && value < BigInt(rawFee)) {
        updatePhase("error", {
          message: t("arbitration.sheet.error.insufficientDeposit", {
            amount: formattedFee || "-",
            token: tokenSymbolFormatted,
          }),
        });
        return;
      }

      let requestHash: `0x${string}`;

      if (isNativeToken) {
        updatePhase("requesting");
        requestHash = await writeContractAsync({
          address: arbitrationManager,
          abi: arbitrationManagerAbi,
          functionName: "requestSubmissionArbitration",
          args: [submissionNumericId, trimmedEvidence, value],
          value,
        });
      } else {
        updatePhase("approving");

        const approvalHash = await writeContractAsync({
          address: erc20TokenAddress!,
          abi: erc20Abi,
          functionName: "approve",
          args: [arbitrationManager, value],
        });
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });

        updatePhase("requesting");
        requestHash = await writeContractAsync({
          address: arbitrationManager,
          abi: arbitrationManagerAbi,
          functionName: "requestSubmissionArbitration",
          args: [submissionNumericId, trimmedEvidence, value],
        });
      }

      const receipt = await publicClient.waitForTransactionReceipt({ hash: requestHash });
      const logs = parseEventLogs({
        abi: arbitrationManagerAbi,
        logs: receipt.logs,
        eventName: "ArbitrationRequested",
      });
      const createdId = logs[0]?.args?.arbitrationId?.toString() ?? null;
      await queryClient.invalidateQueries({ queryKey: ["arbitrations"] });
      setArbitrationId(createdId);
      updatePhase("success", { hash: requestHash, arbitrationId: createdId });
      setEvidence("");
      setDeposit(formattedFee);
      await refetchEligibility();
      if (createdId && onRequested) {
        onRequested(createdId);
      }
    } catch (error) {
      const message = extractViemErrorMessage(error);
      updatePhase("error", { message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="rounded-2xl">
            {t("arbitration.sheet.trigger")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="border-border/30 bg-card/95 p-6 sm:p-8">
        <DialogHeader className="gap-1.5">
          <DialogTitle>{t("arbitration.sheet.title")}</DialogTitle>
          <DialogDescription>{t("arbitration.sheet.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="text-muted-foreground mt-6 space-y-5 text-sm">
          <div className="space-y-4">
            <label className="space-y-2 text-xs">
              <span className="text-muted-foreground/70 tracking-[0.2em] uppercase">
                {t("arbitration.sheet.evidenceLabel")}
              </span>
              <textarea
                value={evidence}
                onChange={(event) => setEvidence(event.target.value)}
                placeholder={t("arbitration.sheet.evidencePlaceholder")}
                className="border-border/40 bg-background/40 text-foreground placeholder:text-muted-foreground/50 focus:border-primary min-h-28 w-full rounded-3xl border px-4 py-3 text-sm focus:outline-none"
                disabled={phase === "approving" || phase === "requesting"}
              />
            </label>
            <label className="space-y-2 text-xs">
              <span className="text-muted-foreground/70 tracking-[0.2em] uppercase">
                {t("arbitration.sheet.depositLabel", { token: tokenSymbolFormatted })}
              </span>
              <input
                value={deposit}
                onChange={(event) => setDeposit(event.target.value)}
                placeholder={formattedFee || "0.0"}
                inputMode="decimal"
                className="border-border/40 bg-background/40 text-foreground placeholder:text-muted-foreground/50 focus:border-primary w-full rounded-3xl border px-4 py-3 text-sm focus:outline-none"
                disabled={phase === "approving" || phase === "requesting"}
              />
            </label>
          </div>

          <DialogFooter className="mt-6 gap-3">
            <Button
              size="sm"
              className="bg-primary text-primary-foreground rounded-3xl"
              onClick={handleSubmit}
              disabled={submitDisabled}
            >
              {t("arbitration.sheet.submit")}
            </Button>
            <DialogClose asChild>
              <Button size="sm" variant="ghost" className="text-muted-foreground rounded-3xl">
                {t("common.actions.close")}
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function parseNumericId(value: string): bigint {
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
